# Team Management Platform — Pitch Deck

> *A modern, role-based workforce management system for small to mid-sized organizations.*

---

## Slide 1: The Problem

### Most teams still manage leave and overtime like it's 1999.

| Pain Point | Impact |
|---|---|
| **Spreadsheet chaos** | Version conflicts, lost data, no audit trail |
| **Email- and paper-based approvals** | Delays, miscommunication, no visibility |
| **No role clarity** | Employees unclear who can approve what |
| **Zero real-time visibility** | Managers flying blind on team availability |
| **No audit trail** | Compliance risk, disputes over approvals |

> **72% of HR leaders say manual leave tracking is a top source of payroll errors.**  
> — *American Payroll Association*

---

## Slide 2: The Solution

### Team Management Platform — centralised, role-based, real-time.

A **turnkey web application** that replaces spreadsheets and email chains with a clean, secure, and intuitive dashboard for managing:

| Feature | What It Solves |
|---|---|
| **Leave Management** | Annual leave accrual, requests, approvals, balance tracking |
| **Overtime Tracking** | Log hours, submit for approval, track history |
| **Employee Management** | Central employee directory with department, role, salary data |
| **Role-Based Access Control** | Admin / Manager / Employee tiers with granular permissions |
| **Audit Logging** | Every action recorded for full compliance |
| **JWT Authentication** | Secure token-based login, no passwords stored in plaintext |

---

## Slide 3: How It Works

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Employee   │────▶│  Manager     │────▶│   Admin    │
│  (requests) │     │  (approves)  │     │  (manages) │
└─────────────┘     └──────────────┘     └────────────┘
       │                    │                    │
       └────────────┬───────┴────────┬───────────┘
                    │                │
            ┌───────▼──────┐  ┌──────▼──────┐
            │  PostgreSQL  │  │  JWT Auth   │
            │  (all data)  │  │  (security) │
            └──────────────┘  └─────────────┘
```

### Simple Three-Tier Model

1. **Employee** — Submits leave and overtime requests, views balance and history
2. **Manager** — Approves/rejects requests, views team-wide reports
3. **Admin** — Full system control: user management, employee records, permissions, audit logs

---

## Slide 4: Key Features — Deep Dive

### 📅 Leave Management
- **Annual accrual system** — 2 leaves/year per employee, automatically tracked
- **Full request lifecycle** — Create → Pending → Approved / Rejected
- **Real-time balance** — Always know how many days an employee has left
- **Cancel & modify** — Employees can cancel their own requests

### ⏰ Overtime Tracking
- **Log with start/end times** — Track exact hours worked
- **Approval workflow** — Manager reviews and approves or rejects
- **History & reporting** — Complete record of every overtime entry

### 👥 Employee & User Management
- **Employee profiles** — Code, department, position, hire date, salary
- **User accounts** — Linked to employee records with role assignment
- **CRUD operations** — Admins create, read, update, and delete at will

### 🔐 Role-Based Access Control
- **Three roles**: Admin, Manager, Employee
- **22 granular permissions** across 6 resource categories
- **Middleware-enforced** — Every API call is verified against permissions

| Permission | Admin | Manager | Employee |
|---|---|---|---|
| Create users | ✅ | ❌ | ❌ |
| Approve leave | ✅ | ✅ | ❌ |
| Create leave | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

### 📊 Dashboard & Analytics
- **At-a-glance metrics**: leave balance, pending requests, overtime hours
- **Recent activity feed** — see the latest team actions
- **Action center** — quick links to common tasks
- **Status badges** — visual indicators for PENDING / APPROVED / REJECTED

---

## Slide 5: Technology Stack

### Modern, proven, and fast.

| Layer | Technology | Why |
|---|---|---|
| **Backend Runtime** | [Deno](https://deno.com/) | Secure by default, fast, TypeScript-native |
| **Web Framework** | [Hono](https://hono.dev/) | Ultralight (~12KB), high-performance, great DX |
| **Database ORM** | [Prisma](https://www.prisma.io/) | Type-safe queries, auto-generated client, migrations |
| **Database** | **PostgreSQL 16** | Rock-solid relational DB, industry standard |
| **Frontend** | **React 18 + TypeScript** | Component-based, type-safe, massive ecosystem |
| **Build Tool** | [Vite](https://vitejs.dev/) | Lightning-fast HMR, optimized builds |
| **Styling** | **Tailwind CSS 3.4** | Utility-first, rapid UI development |
| **Icons** | **Lucide React** | Clean, consistent icon set |
| **Auth** | **JWT + bcryptjs** | Industry-standard secure authentication |
| **Containerisation** | **Docker** | Zero-config deployment, consistent environments |

### Architecture Highlights

```
┌─────────────────────────────────────────────────┐
│                   Docker Compose                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Frontend │  │ Backend  │  │  PostgreSQL   │  │
│  │ (Vite)   │─▶│ (Hono)   │─▶│  (Database)   │  │
│  │ :3000    │  │ :3001    │  │  :5432        │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
│       │              │                           │
│       └──── JWT ─────┘                           │
│              Auth Middleware                      │
│         + RBAC Permission Check                   │
└─────────────────────────────────────────────────┘
```

---

## Slide 6: UI Preview

### Corporate Intelligence Dashboard

The dashboard gives every user a personalised command centre:

- **Leave balance card** — Shows remaining days at a glance
- **Pending leaves** — Quick count of requests awaiting action
- **Overtime summary** — Total logged hours for pending records
- **Recent activity feed** — Chronological list of team requests
- **Action center** — One-click shortcuts to create leave, log overtime, view schedules

> *"The UI feels like a premium SaaS product — not an internal tool."*

### Professional Design Language
- Clean typography with bold editorial style
- Subtle shadows and border accents for depth
- Status badges with semantic colours (green = approved, amber = pending, red = rejected)
- Smooth transitions and hover states
- Mobile-friendly responsive layout

---

## Slide 7: Deployment

### One command to launch.

```bash
docker-compose up -d
```

That's it. Three services — frontend, backend, database — orchestrated in a single `docker-compose.yml`.

| Method | Use Case | Effort |
|---|---|---|
| **Docker Compose** | Self-hosted / on-premise | 1 command |
| **Deno Deploy** | Cloud serverless (production) | Push-to-deploy |
| **Manual** | Development & custom setups | ~5 minutes |

### Environment Setup

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for token signing |
| `PORT` | Backend listen port (default: 3001) |

### Pre-Seeded Demo Users

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@team.com | admin123 |
| **Manager** | manager@team.com | manager123 |
| **Employee** | employee@team.com | employee123 |

Populated with realistic test data — ready for evaluation in seconds.

---

## Slide 8: Security & Compliance

### Built secure from the ground up.

| Feature | Implementation |
|---|---|
| **Authentication** | JWT tokens with bcryptjs password hashing |
| **Authorization** | RBAC middleware on every API route |
| **Session management** | Server-side session tracking |
| **Audit trail** | Every create/update/delete logged to `audit_log` table |
| **Granular permissions** | 22 permissions across 6 resource types |
| **Defence in depth** | Role checks + permission checks at middleware level |

### Audit Log Captures:
- Who performed the action
- What action was taken
- Which resource was affected
- Timestamp (automatic)

---

## Slide 9: Competitive Landscape

### How we stack up.

| Feature | **Team Management** | Spreadsheets | BambooHR | BambooHR<br>(est. cost) |
|---|---|---|---|---|
| Leave management | ✅ Built-in | ❌ Manual | ✅ | $$$$ |
| Overtime tracking | ✅ Built-in | ❌ Manual | ✅ | $$$$ |
| RBAC | ✅ 3 tiers + 22 permissions | ❌ None | ✅ | $$$$ |
| Audit logging | ✅ Full trail | ❌ None | ✅ | $$$$ |
| Employee directory | ✅ Centralised | ❌ Fragmented | ✅ | $$$$ |
| Docker deployment | ✅ 1 command | N/A | ❌ Cloud-only | $$$$ |
| Open source | ✅ Full control | ✅ Free | ❌ Proprietary | $$$$ |
| **Pricing** | **Self-hosted (free)** | Free | $8-15/employee/mo | $$$$ |

### Why Choose Team Management?

1. **Zero recurring cost** — self-hosted, no per-employee fees
2. **Full data ownership** — your database, your servers, your data
3. **Easy to extend** — open-source codebase, add features as needed
4. **Instant deployment** — Docker up in seconds, no onboarding calls
5. **Privacy-first** — no data leaves your infrastructure

---

## Slide 10: Roadmap

### Where we're going next.

| Quarter | Feature |
|---|---|
| **Q3 2026** | — Calendar view (team availability overview) |
| | — Email notifications for approvals |
| | — Export reports to CSV/PDF |
| **Q4 2026** | — Shift scheduling module |
| | — Mobile-responsive PWA |
| | — Multi-language support |
| **Q1 2027** | — SSO / OAuth integration |
| | — Timesheet approvals with clock-in/out |
| | — Advanced analytics dashboard |
| **Future** | — Slack/Teams integration |
| | — Payroll export (Xero, QuickBooks) |
| | — API webhooks for extensibility |

---

## Slide 11: Get Started

### Deploy in one minute, evaluate in five.

```bash
git clone <repo-url>
cd team-management
docker-compose up -d
# → Open http://localhost:3000
# → Login with admin@team.com / admin123
# → Done.
```

### What you can do in the first 5 minutes:

1. ✅ **Log in** as Admin, Manager, and Employee — see different views
2. ✅ **Create a leave request** as Employee, approve it as Manager
3. ✅ **Log overtime hours** and walk through the approval workflow
4. ✅ **Add a new user** and assign them a role
5. ✅ **Check the audit log** — every action is recorded
6. ✅ **Review the API docs** in `docs/API.md`

### Links

| Resource | Location |
|---|---|
| Full documentation | `docs/` directory |
| API reference | `docs/API.md` |
| RBAC matrix | `docs/RBAC.md` |
| Deployment guide | `docs/DEPLOYMENT.md` |
| Quick start | `START_HERE.md` |
| Source code | Backend: `backend/`, Frontend: `frontend/` |

---

## Slide 12: The Ask

### We're looking for:

- **🔹 Early adopters** — Teams to pilot the platform and provide feedback
- **🔹 Contributors** — Developers to help build the roadmap features
- **🔹 Design partners** — Organisations to shape the product roadmap
- **🔹 Investors** — If you believe in the mission of accessible workforce management

> *"Every team deserves modern workforce management — without the enterprise price tag."*

### Contact

For a live demo, deployment support, or partnership inquiries:

📧 **team@example.com**  
🌐 **https://github.com/your-org/team-management**

---

## Appendix: Architecture & Code Quality

### Testing
- **Backend test suite** — Deno tests covering API endpoints
- **Lifecycle tests** — Leave and overtime full workflow tests
- **Accrual tests** — Leave balance calculation validation

### Code Organisation
- Clean separation of concerns: `routes/`, `middleware/`, `contexts/`, `services/`
- TypeScript throughout — end-to-end type safety
- Prisma schema with migrations — schema versioning built in
- Modern React patterns — hooks, contexts, functional components

### Database Schema (9 core tables)

```
users ──▶ employees ──▶ leave_balances
                ├──▶ leave_requests
                ├──▶ overtime_records
users ──▶ sessions
users ──▶ audit_log
roles ──▶ role_permissions ──▶ permissions
```

---

*Team Management Platform — Built with Deno, Hono, React, and PostgreSQL.*
