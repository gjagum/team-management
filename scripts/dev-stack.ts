/**
 * Local dev stack in one terminal: backend + frontend + a Cloudflare quick tunnel.
 *
 *   bun run dev:stack
 *
 * Keep this window open — closing it (or Ctrl+C) stops all three. The tunnel URL
 * is printed when it comes up; paste it into the Slack app's Event Subscriptions
 * Request URL as `https://<tunnel-host>/api/webhooks/slack`. A quick tunnel gets a
 * new hostname on every start, so that URL must be updated after each restart.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const origin = process.env.TUNNEL_ORIGIN ?? 'http://127.0.0.1:3001';
const isWindows = process.platform === 'win32';

function resolveCloudflared(): string | null {
  const onPath = Bun.which('cloudflared');
  if (onPath) return onPath;
  const candidates = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    '/usr/local/bin/cloudflared',
    '/opt/homebrew/bin/cloudflared',
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const cloudflared = resolveCloudflared();
if (!cloudflared) {
  console.error('cloudflared not found. Install it first:  winget install Cloudflare.cloudflared');
  process.exit(1);
}

console.log(`[stack] starting backend + frontend (bun run dev)`);
console.log(`[stack] starting tunnel -> ${origin}\n`);

const dev = Bun.spawn(['bun', 'run', 'dev'], { cwd: root, stdio: ['inherit', 'inherit', 'inherit'] });
const tunnel = Bun.spawn([cloudflared, 'tunnel', '--url', origin, '--no-autoupdate'], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'pipe'],
});

let announced = false;

async function relay(stream: ReadableStream<Uint8Array> | null) {
  if (!stream) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, '');
      buffer = buffer.slice(newline + 1);
      if (!line.trim()) continue;
      // cloudflared is noisy: only surface the lines that matter.
      if (!/trycloudflare|Registered tunnel|ERR|error/i.test(line)) continue;
      console.log(`[tunnel] ${line}`);
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !announced) {
        announced = true;
        console.log('\n' + '='.repeat(72));
        console.log('[stack] Slack app -> Event Subscriptions -> Request URL:');
        console.log(`        ${match[0]}/api/webhooks/slack`);
        console.log('[stack] users post "checkin" / "checkout" in the channel to clock in/out.');
        console.log('='.repeat(72) + '\n');
      }
    }
  }
}

void relay(tunnel.stdout as ReadableStream<Uint8Array> | null);
void relay(tunnel.stderr as ReadableStream<Uint8Array> | null);

function killTree(proc: Bun.Subprocess) {
  if (proc.exitCode !== null) return;
  try {
    if (isWindows) {
      // Bun's kill() leaves grandchildren (vite/bun --watch) orphaned on Windows.
      Bun.spawnSync(['taskkill', '/PID', String(proc.pid), '/T', '/F'], { stdout: 'ignore', stderr: 'ignore' });
    } else {
      proc.kill();
    }
  } catch {
    /* already gone */
  }
}

let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('\n[stack] shutting down...');
  killTree(dev);
  killTree(tunnel);
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const exitCode = await dev.exited;
console.log(`[stack] backend/frontend exited with code ${exitCode}`);
shutdown(exitCode ?? 0);
