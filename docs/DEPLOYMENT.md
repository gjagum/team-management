# Deployment Guide

## Deployment Options

| Method | Best For | Guide |
|---|---|---|
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
