// Bun entry point: local development and the Docker image.
import { serveStatic } from 'hono/bun';
import { app } from './app.ts';
import { setDocumentStorage } from './storage.ts';
import { fsStorage } from './storage-fs.ts';
import { startSlackSocket } from './services/slackSocket.ts';

setDocumentStorage(fsStorage);

// Start Slack Socket Mode (no-op if SLACK_APP_TOKEN is not set)
startSlackSocket().catch((err) => console.error('[SLACK] failed to start socket mode:', err));

// Serve the built frontend (backend/static, produced by `bun run build`)
app.use('/assets/*', serveStatic({ root: './static' }));
app.get('*', serveStatic({ root: './static', path: 'index.html' }));

const port = parseInt(process.env.PORT || '3001');
console.log(`🚀 Server running on http://localhost:${port}`);
Bun.serve({ port, fetch: app.fetch });
