import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '@prisma/client';

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
  return requestClient.getStore() ?? (defaultClient ??= new PrismaClient());
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = currentClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
