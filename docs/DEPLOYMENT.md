# Deployment Guide

## Deployment Options

| Method | Best For | Guide |
|---|---|---|
| **Deno Deploy** | Production (serverless, zero-config) | [DENO_DEPLOY.md](./DENO_DEPLOY.md) |
| **Docker** | Self-hosted / on-premise | [DOCKER.md](./DOCKER.md) |

## Local Development

```bash
# Backend (hot reload on port 3001)
cd backend && deno task dev

# Frontend (hot reload on port 5173)
cd frontend && deno task dev
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
