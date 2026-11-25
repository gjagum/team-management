# Project Memory — Team Management

> **For the AI**: After implementing any feature, fix, or significant change, append an entry to the `## Feature Log` section below. Keep entries one line each. Use the existing format.

## Architecture & Conventions

- **Backend**: Bun + Hono + Prisma + PostgreSQL (port 3001)
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS (port 3000)
- **Auth**: JWT tokens + bcryptjs
- **RBAC**: Admin / Manager / Employee
- **Deployment**: Docker Compose

## Feature Log

| Date | Summary | Category | Status |
|------|---------|----------|--------|
| — | User management with RBAC (Admin/Manager/Employee roles) | Core | ✅ |
| — | Employee management (code, department, position, hire date, salary) | Core | ✅ |
| — | Leave tracking — 2 leaves/year, create/approve/reject/cancel workflow | Core | ✅ |
| — | Overtime tracking — log hours with start/end, submit/approve/reject | Core | ✅ |
| — | JWT authentication with login/logout/session management | Auth | ✅ |
| — | Audit logging for all system actions | Security | ✅ |
| — | Permission middleware for granular API access control | Security | ✅ |
| — | Dashboard with leave balance, pending requests, overtime stats | UI | ✅ |
| — | Professional UI with responsive sidebar navigation, modals, status badges | UI | ✅ |
| — | Database seeding with default users (admin/manager/employee) | Data | ✅ |
| — | Docker Compose single-container deployment | DevOps | ✅ |
| 2026-07-04 | Custom opencode commands for task governance (task-start, task-end, task-progress, task-update-documents) | Governance | ✅ |
| 2026-07-11 | Rewrote 5 session-* opencode commands from Cursor (md-file) format to opencode-native frontmatter + $ARGUMENTS wired to aitivity-ledger MCP | Governance | ✅ |
| 2026-07-11 | Refreshed README — features (all 12 modules), 4-role RBAC, full project structure tree, complete API endpoint tables (13 route groups) | Docs | ✅ |
| 2026-11-12 | Migrated runtime Deno → Bun (workspaces, bun:test, hono/bun static, node:fs uploads); fixed Dockerfile + uploads volume; added wrangler.jsonc for Cloudflare Workers | DevOps | ✅ |
| 2026-11-12 | Added docs/ARCHITECTURE.md — Mermaid diagrams for topology, request pipeline, auth, ERD, leave/overtime/Slack/timesheet flows | Docs | ✅ |
| 2026-11-14 | Added docs/explainer-canvas.html — self-contained visual explainer (stack, request pipeline, data model, role tabs, leave/overtime/Slack flows, known edge cases); previewed via browser.preview | Docs | ✅ |
| 2026-11-12 | Rebranded UI to the OMNITASK violet palette — primary #7c3aed, cool zinc neutrals replacing warm stone, violet gradients/shadows/focus rings; red reserved for destructive + error states | UI | ✅ |
| 2026-11-17 | Bun server now uses the `pg` driver adapter (`@prisma/adapter-pg`, same as worker.ts) instead of Prisma's native engine — fixes "Can't reach database server" on networks where IPv6 to the DB is broken | Backend | ✅ |
| 2026-11-19 | Added root `bun run dev` script (`bun run --filter '*' dev`) that starts backend + frontend concurrently with prefixed logs; browser-checked | DevOps | ✅ |
| 2026-11-20 | Added `db:studio` scripts (root + backend) invoking `node node_modules/prisma/build/index.js studio --port 5555` directly — bypasses bun-on-PATH check in the prisma wrapper and PowerShell script-block policy | DevOps | ✅ |
| 2026-11-20 | Login page: company name replaced with the OmniTask logo image (`public/omnitask-logo.png`), heading now "Welcome Back!", removed the "sign in to access your corporate intelligence dashboard" subtitle; dropped the now-unused settings lookup | UI | ✅ |
| 2026-11-20 | App header (all post-login pages) now shows the OmniTask logo instead of the company-name setting; removed unused `useSettings` from Layout | UI | ✅ |
| 2026-11-20 | Fixed Slack ID editing: `PUT /api/users/:id` now saves `slackId` onto the employee profile (409 on duplicates, 400 without an employee record) and `GET /api/users` returns `slackId` so the Users table/modal reflect it | Backend | ✅ |
| 2026-11-20 | Slack clock keywords changed from "good morning"/"good evening" to `checkin`/`checkout`; webhook now logs every inbound event (type/user/channel/text) and unlinked slackIds; ARCHITECTURE + explainer docs updated | Backend | ✅ |
| 2026-11-20 | Added `bun run dev:stack` (`scripts/dev-stack.ts`): runs backend + frontend + cloudflared quick tunnel in one terminal, prints the Slack webhook Request URL, task-kills the whole tree on Ctrl+C | DevOps | ✅ |
| 2026-11-20 | Implemented Slack Socket Mode base integration (apps.connections.open + WebSocket envelopes, ack, reconnect) reusing shared event handler; validated bot token via auth.test | Integration | ✅ |
| 2026-11-20 | Added Slack slash commands /checkin and /checkout over Socket Mode with ephemeral replies | Integration | ✅ |
| 2026-11-20 | Improved Slack slash command error handling/logging (response_url status, fallback replies) | Integration | ✅ |
| 2026-11-20 | Fixed /checkin on Cloudflare: Workers cannot run Socket Mode, added signed HTTP slash-command endpoint /api/webhooks/slack/commands (SLACK_SIGNING_SECRET) | Integration | ✅ |
| 2026-11-23 | Merged origin/main (Slack Socket Mode + slash commands, signed webhook verification) into docs/omnitask-guide; moved message keywords to `checkin`/`checkout` in the shared slackEvents handler | Integration | ✅ |
| 2026-11-23 | Slack Socket Mode confirmed working end-to-end: bot `attendance_helper` connects over WebSocket with `SLACK_APP_TOKEN`, `checkin` message posts a `time_logs` row visible in Timesheets; no public URL/tunnel required locally | Integration | ✅ |
| 2026-11-24 | UI pass: "Contractor" → "Employee" everywhere incl. timesheet PDF; login EMPLOYEE/MANAGER/ADMIN access-level tabs (prefill demo logins); sidebar "Workday Hub / Time, Leave & Teams"; dashboard "Welcome Back" + reminder banner, header nav hidden on home; "Quick Actions" for all roles opening the Leave/Overtime modals | UI | ✅ |
| 2026-11-24 | Header nav links removed on all pages; reminder quote moved into the Layout shell (shown on every page) and top-aligned with the sidebar title; sidebar subtitle justified to the title width | UI | ✅ |
| 2026-11-24 | Merged Users + Employees into "People & Access" (/users; /employees redirects): columns Employee ID, Name, Date Hired, Team, Job Title, Supervisor, Email, Slack ID, Access Level, Status, Edit/Del; Team filter beside New User; `GET /api/users` now returns hireDate/team/leader, `PUT` accepts position/hireDate/teamId | UI | ✅ |
| 2026-11-24 | Published the branch as PR #12 (gjagum/team-management ← noviesawangan:docs/omnitask-guide) via fork, since the local GitHub login has no write access to the upstream repo; `fork` remote added | DevOps | ✅ |
| 2026-11-25 | Dashboard heading "Welcome Back" → "Your Dashboard"; "People & Access" renamed to "Employees" (sidebar + page title) | UI | ✅ |
| 2026-11-25 | Role-based dashboard header: Employee/Manager/Admin (and Team Leader → Manager) title + subtitle copy, no eyebrow line | UI | ✅ |
| 2026-11-23 | Prisma Studio now loads data: pinned the Neon pooler hostname to its IPv4 (`13.228.46.236`) in the Windows hosts file, since the engine's IPv6-first resolution caused P1001 (`13.228.46.236 ep-purple-river-a1xah0gz-pooler.ap-southeast-1.aws.neon.tech`) | DevOps | ✅ |

## Active Task

<!--
  Managed by the `task-start` skill.
  `/task-start <plan> | <module>` overwrites this section.
  `/task-done` moves it to the Task Log below.
  Also available as custom opencode commands:
  - `/task-start <plan> | <module>`
  - `/task-end [note]`
  - `/task-progress <update>`
  - `/task-update-documents [summary]`
-->

## Task Log

| Started | Done | Targeted module | Activity plan | Note |
| ------- | ---- | --------------- | ------------- | ---- |
