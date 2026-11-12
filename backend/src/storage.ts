/**
 * Where employee documents are stored. Keys look like
 * `uploads/documents/<employeeId>/<timestamp>_<fileName>` (the value kept in
 * EmployeeDocument.filePath), so existing records stay valid.
 *
 * The entry point picks the backend: local disk for Bun (index.ts),
 * an R2 bucket for Cloudflare Workers (worker.ts).
 */
export interface DocumentStorage {
  put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
  /** Returns the file body, or null when the key doesn't exist. */
  get(key: string): Promise<ReadableStream | Uint8Array | null>;
  delete(key: string): Promise<void>;
}

let storage: DocumentStorage | undefined;

export function setDocumentStorage(impl: DocumentStorage) {
  storage = impl;
}

export function documentStorage(): DocumentStorage {
  if (!storage) throw new Error('Document storage not configured');
  return storage;
}

/** Minimal shape of the R2 binding we use (avoids depending on workers-types). */
interface R2BucketLike {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream } | null>;
  delete(key: string): Promise<void>;
}

export function r2Storage(bucket: R2BucketLike): DocumentStorage {
  return {
    async put(key, data, contentType) {
      await bucket.put(key, data, { httpMetadata: { contentType } });
    },
    async get(key) {
      const object = await bucket.get(key);
      return object ? object.body : null;
    },
    delete: (key) => bucket.delete(key),
  };
}
