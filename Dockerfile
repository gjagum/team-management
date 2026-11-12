# syntax=docker/dockerfile:1

# ---- Stage 1: install + build (frontend bundle, Prisma client) ----
FROM oven/bun:1.4.2 AS builder
WORKDIR /app

# Prisma's engines need OpenSSL to detect the right binary target
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first so this layer is cached across source changes
COPY package.json bun.lock ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY backend/prisma backend/prisma
RUN bun install --frozen-lockfile

COPY frontend frontend
COPY backend backend
RUN bun run build

# ---- Stage 2: runtime ----
FROM oven/bun:1.4.2-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001

# Workspace layout is preserved: backend/node_modules symlinks into /app/node_modules/.bun
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/backend/static ./backend/static

WORKDIR /app/backend
RUN mkdir -p uploads && chown -R bun:bun uploads

# `bun` user ships with the oven/bun image
USER bun

EXPOSE 3001
VOLUME ["/app/backend/uploads"]

CMD ["bun", "src/index.ts"]
