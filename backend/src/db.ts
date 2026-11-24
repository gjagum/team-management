import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma access shared by Bun (long-lived server) and Cloudflare Workers.
 *
 * Workers cannot reuse a database connection across requests, so worker.ts
 * creates a client per request and binds it with `runWithPrisma`. Everywhere
 * else (Bun server, scripts) falls back to a single lazily-created client.
 * Route code just imports `prisma` and doesn't need to know which it got.
 */
const requestClient = new AsyncLocalStorage<PrismaClient>();
let defaultClient: PrismaClient | undefined;

export function runWithPrisma<T>(client: PrismaClient, fn: () => T): T {
  return requestClient.run(client, fn);
}

function currentClient(): PrismaClient {
  const scoped = requestClient.getStore();
  if (scoped) return scoped;

  if (!defaultClient) {
    // Use the pg driver adapter (the same stack as worker.ts) instead of Prisma's
    // native engine. `pg` does Happy-Eyeballs address selection, so it still
    // connects over IPv4 on hosts whose IPv6 route to the database is broken.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    defaultClient = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return defaultClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
