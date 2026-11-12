// Bun entry point: local development and the Docker image.
import { serveStatic } from 'hono/bun';
import { app } from './app.ts';
import { setDocumentStorage } from './storage.ts';
import { fsStorage } from './storage-fs.ts';

setDocumentStorage(fsStorage);

// Serve the built frontend (backend/static, produced by `bun run build`)
app.use('/assets/*', serveStatic({ root: './static' }));
app.get('*', serveStatic({ root: './static', path: 'index.html' }));

const port = parseInt(process.env.PORT || '3001');
console.log(`🚀 Server running on http://localhost:${port}`);
Bun.serve({ port, fetch: app.fetch });
