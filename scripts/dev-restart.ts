/**
 * Restarts the local dev stack in one command.
 *
 *   bun run dev:restart
 *
 * Frees the dev ports (killing orphaned Vite/Bun processes left behind by a
 * crashed or closed terminal), waits for the sockets to be released, then runs
 * `bun run dev` in the foreground. Ctrl+C stops the stack.
 */
const PORTS = [3000, 3001, 3002];
const isWindows = process.platform === 'win32';

function findPids(port: number): number[] {
  try {
    if (isWindows) {
      const out = Bun.spawnSync(['netstat', '-ano', '-p', 'tcp'], { stdout: 'pipe' }).stdout.toString();
      const pids = new Set<number>();
      for (const line of out.split(/\r?\n/)) {
        const cols = line.trim().split(/\s+/);
        if (cols.length < 5) continue;
        const [, local, , state, pidRaw] = cols;
        const pid = Number(pidRaw);
        if (state === 'LISTENING' && local.endsWith(`:${port}`) && pid > 0) pids.add(pid);
      }
      return [...pids];
    }

    const out = Bun.spawnSync(['lsof', '-ti', `tcp:${port}`], { stdout: 'pipe' }).stdout.toString();
    return out
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter((pid) => pid > 0);
  } catch {
    return [];
  }
}

function killPid(pid: number): void {
  try {
    if (isWindows) {
      Bun.spawnSync(['taskkill', '/PID', String(pid), '/T', '/F'], { stdout: 'ignore', stderr: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
  } catch {
    /* already gone */
  }
}

const killed = new Set<number>();
for (const port of PORTS) {
  for (const pid of findPids(port)) {
    if (killed.has(pid)) continue;
    killed.add(pid);
    console.log(`[dev:restart] freeing port ${port} (pid ${pid})`);
    killPid(pid);
  }
}

// Wait for the sockets to be released so Vite/Bun don't hit EADDRINUSE.
for (let attempt = 0; attempt < 25; attempt++) {
  if (!PORTS.some((port) => findPids(port).length > 0)) break;
  await Bun.sleep(150);
}

console.log('[dev:restart] starting bun run dev');
const dev = Bun.spawn(['bun', 'run', 'dev'], { stdio: ['inherit', 'inherit', 'inherit'] });

const stop = () => {
  try {
    dev.kill();
  } catch {
    /* already stopped */
  }
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

const code = await dev.exited;
process.exit(code ?? 0);
