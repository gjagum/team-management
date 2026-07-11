# Deployment Platform Comparison: Vercel vs DigitalOcean

> **Purpose:** Reference document comparing **Vercel** and **DigitalOcean** as hosting platforms for **this project's current stack** — a single Deno/Hono server serving the API + built Vite frontend, backed by PostgreSQL.
> **Session:** #3 — `deployment-advisory` · **Date:** 2026-07-11 · **Status:** Draft
> **Review cadence:** Re-verify pricing and product limits quarterly — both platforms ship frequently.

---

## Current Stack (what we're deploying)

| Layer | Technology |
|-------|-----------|
| Runtime | **Deno** (entry uses `Deno.serve`, `hono/deno`, `Deno.env`) |
| Server | **Hono** single server — API routes **and** static frontend from `backend/static/` |
| ORM | Prisma 5.x (`@map` snake_case schema, `driverAdapters`) |
| Database | **PostgreSQL 16** (containerized in Docker; **Neon** for the Deno Deploy path) |
| Frontend | React 18 + Vite (built to `backend/static/`, served by the same Hono server) |
| Auth | JWT + bcryptjs (pure JS) |
| Existing paths | `docker-compose.yml` (self-host) · `docs/DENO_DEPLOY.md` (Deno Deploy) |

**Critical fact:** the backend is a **long-running Deno server** (`Deno.serve`), not a collection of serverless functions. This shapes everything below.

---

## TL;DR Recommendation

| Use case | Pick |
|----------|------|
| Run this app as-is, least effort, persistent | **DigitalOcean** — Deno + Docker work natively, no code changes |
| Serverless / managed edge with zero ops | **Deno Deploy** (not Vercel) — it's the Deno-native serverless option, already documented |
| You specifically want Vercel | Expect **runtime rework** (Deno → Node) — Vercel's strengths are for Next.js, not Deno/Hono |

**Bottom line:** For the *current* Deno/Hono/Postgres stack, **DigitalOcean is the natural fit** — the existing Dockerfile/docker-compose runs unchanged, Deno.serve works as a persistent process, and Postgres can be managed or self-hosted. **Vercel is a poor native fit** because it doesn't run the Deno runtime serverlessly; using it means porting the entry to Node (`hono/node-server`) and accepting serverless limits (time caps, cold starts, connection-pooling requirements). If "managed serverless" is the goal, **Deno Deploy is the right equivalent** for this stack and is already wired up.

---

## 1. Platform Fit for THIS Stack

### Vercel
- **Designed for Next.js / frontend frameworks.** Static Vite frontend hosts trivially; the Hono API does not.
- **No Deno runtime** for serverless functions (Node.js or Edge only). The current `Deno.serve` / `hono/deno` entry **will not run** as-is.
- To use Vercel you must **port the entry** to Node (`hono/node-server`) or Edge, then deploy the Hono app as a serverless function via `hono/vercel`. That is real migration work.
- **Serverless constraints apply:** request time limits, memory caps, cold starts, no persistent in-process state.
- **Prisma + Postgres** requires a pooled connection (Neon pooler / PgBouncer) on every invocation.
- Global edge network + automatic PR previews are the upside — but you pay for them with the runtime rework.

### DigitalOcean
- **Run the Deno server as-is** on a Droplet or App Platform — `Deno.serve` works natively, zero code changes.
- The **existing `Dockerfile` / `docker-compose.yml`** deploys unchanged to a Droplet (or App Platform builds from the Dockerfile).
- **Persistent process:** no time limits, no cold starts, in-process state survives.
- **Postgres:** DO Managed PostgreSQL, or run the existing Postgres container.
- Trade-off: you own uptime, scaling, SSL, and monitoring (App Platform reduces this; raw Droplets maximize it).

### Deno Deploy (the existing serverless path — included for context)
- **Deno-native serverless edge** — `src/index.ts` deploys with no entry changes.
- Already documented in `docs/DENO_DEPLOY.md`; `deno.jsonc` targets org `gjagum` / app `team-management`.
- Uses **Neon Postgres** (pooled). Global edge, zero ops.
- This is the true "Vercel-equivalent" for a Deno/Hono stack.

---

## 2. Feature Comparison (for this stack)

| Capability | Vercel | DigitalOcean | Deno Deploy |
|------------|:------:|:------------:|:-----------:|
| Runs `Deno.serve` as-is | ❌ | ✅ | ✅ |
| Runs existing Dockerfile/Compose | ❌ | ✅ | ❌ (own build) |
| Code changes to deploy | **High** (Deno→Node port) | **None** | None |
| Single server (API + static) | ⚠️ Must restructure | ✅ As-is | ✅ As-is |
| Persistent process / no cold starts | ❌ | ✅ | ⚠️ Edge isolates (some cold) |
| Function/request time limits | ✅ Capped | ❌ Unlimited | ✅ Capped |
| Prisma connection pooling needed | ✅ Yes | Optional | ✅ Yes |
| Global edge network | ✅ Built-in | ⚠️ Via Cloudflare front | ✅ Built-in |
| Managed Postgres | Via Neon/Supabase | ✅ DO Managed Postgres | Via Neon |
| Auto PR preview environments | ✅ | ⚠️ App Platform only | ⚠️ Branch previews |
| Full root / install system deps | ❌ | ✅ | ❌ |
| Long-running background workers | ❌ | ✅ | ⚠️ Cron/Queues |
| Predictable flat pricing | ❌ Usage-based | ✅ Per-resource | ⚠️ Usage-based |
| Ops burden | Lowest | Highest (Droplets) / Mid (App Platform) | Lowest |

---

## 3. Migration Effort

| Path | Effort | What changes |
|------|--------|--------------|
| **DO Droplet** (Docker) | 🟢 Trivial | Run `docker-compose up` on a Droplet; point DNS at it. Done. |
| **DO App Platform** | 🟢 Low | Point App Platform at the Dockerfile; add a managed Postgres. |
| **Deno Deploy** | 🟢 Low | Already documented; `deno deploy --prod`. |
| **Vercel** | 🔴 High | Port `src/index.ts` from Deno→Node (`hono/node-server`); restructure static serving; ensure Prisma uses a pooled Neon URL; accept serverless limits. |

---

## 4. Agentic AI Workloads (future-looking)

This HR app has no heavy AI workload today, but if AI-agent features (long-running inference, tool orchestration, local models) are added:

| Agent need | Vercel | DigitalOcean | Deno Deploy |
|------------|:------:|:------------:|:-----------:|
| Long reasoning loops (multi-minute) | ❌ Timeout | ✅ Unlimited | ⚠️ Capped |
| Persistent workers / queues | ❌ External only | ✅ Native | ⚠️ External |
| WebSocket streaming to UI | ⚠️ Limited | ✅ Full | ✅ Full |
| Local GPU / on-device inference | ❌ | ✅ GPU Droplets | ❌ |
| Install Ollama/vLLM/Python | ❌ | ✅ Root | ❌ |
| Cold-start on first agent call | ⚠️ Yes | ✅ None | ⚠️ Some |

**Takeaway:** if agents become central, **DigitalOcean** is the only option of these three that supports local GPU and unlimited-duration workers without re-architecture.

---

## 5. Pricing (indicative — verify on vendor pages)

| Dimension | Vercel | DigitalOcean | Deno Deploy |
|-----------|--------|--------------|-------------|
| Entry | Free Hobby; Pro ~$20/mo | Droplets ~$4–6/mo; GPU ~$300+/mo | Free tier; paid from ~$20/mo |
| Model | Usage-based (invocations, bandwidth, build min) | Flat per-resource | Usage-based (requests, duration) |
| Cost behavior at scale | Can spike | Predictable | Can spike |
| Hidden risk | Function duration × invocations | Snapshots/transfer add-ons | Request volume |

> For a persistent Hono server, DO's flat pricing is the most predictable. Vercel/Deno Deploy usage-based pricing favours spiky, low-volume traffic.

---

## 6. Pros & Cons Summary

### Vercel
**Pros:** Global edge; auto PR previews; best DX *if* you're on Next.js.
**Cons:** ❌ No Deno runtime (must port to Node); serverless time/memory caps; cold starts; needs pooled Postgres; usage-based cost; rework doesn't buy you Next.js benefits.

### DigitalOcean
**Pros:** ✅ Runs current Deno/Docker stack unchanged; persistent process; managed Postgres; GPU for AI; flat pricing; full control.
**Cons:** More ops (unless App Platform); no built-in global edge; manual scaling/SSL on raw Droplets.

### Deno Deploy (reference)
**Pros:** ✅ Deno-native serverless; global edge; zero entry changes; lowest ops.
**Cons:** Usage-based; edge isolate limits; Neon dependency; no long-running/GPU.

---

## 7. Recommendation

1. **For this project, choose DigitalOcean** (Droplet + Docker, or App Platform). It runs the existing stack with no code changes and gives a persistent Postgres-backed Hono server.
2. **If managed serverless is preferred**, use the **existing Deno Deploy** path (`docs/DENO_DEPLOY.md`) — it's the Deno-native equivalent of "Vercel for this stack."
3. **Avoid Vercel** unless there's a strategic reason to standardize there — it requires porting Deno→Node and imposes serverless limits, with no Next.js upside to offset the cost.

---

## 8. Action Items / Open Questions
- [ ] Decide: persistent (DO) vs serverless (Deno Deploy) as the primary target.
- [ ] If DO: choose Droplet+Docker (simplest) vs App Platform (managed) and provision managed Postgres.
- [ ] If serverless: confirm Neon pooler URL (`&pgbounce=true`) per `DENO_DEPLOY.md`.
- [ ] Get current pricing quotes for expected traffic/scale before committing.
- [ ] If AI features are planned: validate GPU Droplet availability and pricing at decision time.

---

*Reference doc — not a final decision. Validate specifics against vendor documentation before committing.*
