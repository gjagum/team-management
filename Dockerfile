# ---- Stage 1: Build Frontend ----
FROM denoland/deno:2.2.3 AS frontend-builder

WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json frontend/deno.json ./
COPY frontend/postcss.config.cjs frontend/tailwind.config.cjs frontend/tsconfig.json frontend/tsconfig.node.json frontend/vite.config.ts frontend/index.html ./
RUN deno install

COPY frontend/src ./src
COPY frontend/public ./public

RUN deno task build

# ---- Stage 2: Setup Backend ----
FROM denoland/deno:2.2.3 AS backend-builder

WORKDIR /app/backend

# Copy backend dependency files
COPY backend/package.json backend/deno.json ./
RUN deno install

# Approve prisma build scripts and generate client
COPY backend/prisma ./prisma
RUN echo '{ "packages": { "npm:@prisma/client@5.22.0": true, "npm:@prisma/engines@5.22.0": true, "npm:prisma@5.22.0": true, "npm:esbuild@0.27.4": true } }' > /app/backend/deno.permissions.json && \
    deno install && \
    deno run -A npm:prisma generate

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./

# ---- Stage 3: Production Runner ----
FROM denoland/deno:2.2.3 AS runner

WORKDIR /app

ENV DENO_DIR=/deno-dir
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 deno && \
    adduser --system --uid 1001 --gid 1001 deno

# Copy backend source and dependencies
COPY --from=backend-builder /app/backend/src ./src
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/package.json /app/backend/deno.json ./
COPY --from=backend-builder /app/backend/node_modules ./node_modules

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./static

# Cache deno dependencies
RUN deno install

RUN chown -R deno:deno /app /deno-dir

USER deno

EXPOSE 3001

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "--allow-ffi", "src/index.ts"]
