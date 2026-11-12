# Deployment Guide

## Deployment Options

| Method | Best For | Guide |
|---|---|---|
| **Cloudflare Workers** | Production (edge, serverless) | [below](#cloudflare-workers) |
| **Docker** | Self-hosted / on-premise | [DOCKER.md](./DOCKER.md) |

## Local Development

```bash
# Install all workspace dependencies (run once, from repo root)
bun install

# Backend (hot reload on port 3001)
bun run dev:backend

# Frontend (hot reload on port 3000, proxies /api to 3001)
bun run dev:frontend

# Production build: frontend bundle -> backend/static, Prisma client
bun run build && bun run start

# Tests
bun run test
```

## Cloudflare Workers

One Worker serves the API (`backend/src/worker.ts`) and the built frontend (Workers Static Assets).
Config lives in `wrangler.jsonc`. Documents are stored in R2 instead of the local disk.

One-time setup:

```bash
bunx wrangler r2 bucket create team-management-documents
bunx wrangler secret put DATABASE_URL   # Postgres / Neon connection string
bunx wrangler secret put JWT_SECRET
```

Deploy (builds the frontend and Prisma client first):

```bash
bunx wrangler deploy
```

Local Worker run: create `.dev.vars` (gitignored) with `DATABASE_URL` and `JWT_SECRET`, then `bunx wrangler dev`.

Optional: add a Hyperdrive binding (see `wrangler.jsonc`) to pool database connections; without it each request opens a new connection.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing |
| `PORT` | ❌ | Server port (default: 3001) |

## Project Structure

```
team-management/
├── frontend/           ← React + Vite (dev only)
├── backend/
│   ├── src/index.ts    ← Server (API + static serving)
│   ├── src/routes/     ← API routes
│   ├── prisma/         ← Database schema
│   └── static/         ← Built frontend (generated)
└── docs/               ← Documentation
```
