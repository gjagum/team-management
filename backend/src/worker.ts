// Cloudflare Worker entry point (see wrangler.jsonc).
// Static frontend files are served by Workers Static Assets before this code runs;
// only /api/* and /health reach the Worker.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import type { ExecutionContext } from 'hono';
import { app } from './app.ts';
import { runWithPrisma } from './db.ts';
import { r2Storage, setDocumentStorage } from './storage.ts';

interface Env {
  /** Postgres connection string, set with `wrangler secret put DATABASE_URL`. */
  DATABASE_URL?: string;
  /** Optional: when a Hyperdrive binding is configured, it takes precedence. */
  HYPERDRIVE?: { connectionString: string };
  DOCUMENTS: Parameters<typeof r2Storage>[0];
  JWT_SECRET: string;
}

let storageReady = false;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!storageReady) {
      setDocumentStorage(r2Storage(env.DOCUMENTS));
      storageReady = true;
    }

    const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL;
    if (!connectionString) {
      return Response.json({ error: 'Database is not configured (set DATABASE_URL or a HYPERDRIVE binding)' }, { status: 500 });
    }

    // Workers can't share sockets between requests, so each request gets its own pool + client.
    const pool = new Pool({ connectionString, max: 1 });
    const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

    try {
      return await runWithPrisma(prisma, () => app.fetch(request, env, ctx));
    } finally {
      ctx.waitUntil(pool.end());
    }
  },
};
