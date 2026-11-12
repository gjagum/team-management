import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DocumentStorage } from './storage.ts';

/** Local-disk storage, relative to the working directory (backend/). */
export const fsStorage: DocumentStorage = {
  async put(key, data) {
    await mkdir(dirname(key), { recursive: true });
    await writeFile(key, new Uint8Array(data));
  },
  async get(key) {
    try {
      return await readFile(key);
    } catch {
      return null;
    }
  },
  async delete(key) {
    await rm(key, { force: true });
  },
};
