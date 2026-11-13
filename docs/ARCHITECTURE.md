# Architecture & How It Works

Diagrams derived from the actual code (`backend/src`, `frontend/src`, `prisma/schema.prisma`).

## 1. High-level topology

```mermaid
flowchart LR
  subgraph Browser
    SPA["React SPA<br/>React 19 · Vite · Tailwind · React Router"]
  end

  subgraph Dev["Development"]
    Vite["Vite dev server :3000<br/>proxy /api → localhost:3001"]
  end

  subgraph Prod["Production container :3001"]
    Hono["Deno + Hono<br/>API + static hosting"]
    Static["backend/static/<br/>built SPA"]
  end

  DB[("PostgreSQL 16<br/>:5432")]
  Slack["Slack Events API"]

  SPA --> Vite
  Vite -->|"fetch /api/*"| Hono
  Hono --> Static
  Hono -->|"Prisma Client"| DB
  Slack -->|"POST /api/webhooks/slack"| Hono
```

- One Deno process serves both the JSON API and the built SPA (`backend/src/index.ts:121-127`).
- In dev, Vite proxies `/api` so the frontend and backend stay same-origin (`frontend/vite.config.ts`).

## 2. Request pipeline

Every `/api/*` router mounts `authMiddleware`, then per-endpoint permission checks.

```mermaid
flowchart TD
  Req["HTTP request<br/>Authorization: Bearer token"] --> Cors["cors() on /api/*"]
  Cors --> Jwt{"authMiddleware<br/>jwt.verify OK?"}
  Jwt -- "no / bad token" --> R401["401 Invalid token"]
  Jwt -- yes --> Sess{"Session row in DB<br/>with same token<br/>and expiresAt > now?"}
  Sess -- no --> R401b["401 Invalid or expired session"]
  Sess -- yes --> Perm{"requirePermission<br/>role has resource.action<br/>in role_permissions?"}
  Perm -- no --> R403["403 Insufficient permissions"]
  Perm -- yes --> Handler["Route handler<br/>Prisma query / mutation"]
  Handler --> Audit["auditLog()<br/>for mutations"]
  Audit --> Json["JSON response"]
  Json --> Axios["Axios response interceptor"]
  R401 --> Axios
  R401b --> Axios
  Axios -- "status 401" --> Clear["clear localStorage.token<br/>redirect /login"]
  Axios -- ok --> UI["React state update"]
```

Sessions are stored server-side (`sessions` table), so deleting the row invalidates the JWT immediately. Logout deletes the row (`backend/src/index.ts:100-106`).

## 3. Login / authentication

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant SPA as React SPA
  participant API as Deno + Hono
  participant DB as PostgreSQL

  U->>SPA: email + password
  SPA->>API: POST /api/auth/login
  API->>DB: findUnique(users) by email, include employee
  DB-->>API: user + passwordHash
  API->>API: bcrypt.compare(password, hash)
  alt invalid credentials
    API-->>SPA: 401 Invalid credentials
  else valid
    API->>API: jwt.sign({userId, email, role}, 24h)
    API->>DB: insert session(token, expiresAt)
    API-->>SPA: { token, user }
    SPA->>SPA: localStorage.token = token<br/>AuthContext.setUser(user)
    SPA-->>U: redirect to /dashboard
  end

  Note over SPA,API: Later requests: Axios interceptor injects<br/>Authorization: Bearer token
```

## 4. Domain model

```mermaid
erDiagram
  User ||--o| Employee : "1:1 profile"
  User ||--o{ Session : "sessions"
  User ||--o{ AuditLog : "actions"

  Employee ||--o{ LeaveBalance : "per year"
  Employee ||--o{ LeaveRequest : "requests"
  Employee ||--o{ OvertimeRecord : "records"
  Employee ||--o{ Schedule : "daily shifts"
  Employee ||--o{ DefaultSchedule : "weekly template"
  Employee ||--o{ TimeLog : "clock in/out"
  Employee ||--o{ EmployeeDocument : "files"
  Employee ||--o{ OnboardingTask : "checklist"

  Employee ||--o{ LeaveRequest : "approves (reviewedBy)"
  Employee ||--o{ OvertimeRecord : "approves (approvedBy)"

  Permission ||--o{ RolePermission : "granted to role"
```

Key tables and why they exist:

| Table | Role |
|---|---|
| `users` | Login identity: email, bcrypt hash, `role` enum, `isActive` |
| `employees` | HR record linked 1:1 to a user: code, department, position, hire date, salary, `slackId` |
| `leave_balances` | Per employee per year: `totalLeaves`, `usedLeaves` (unique on employee+year) |
| `leave_requests` | `PENDING → APPROVED/REJECTED/CANCELLED`, paid vs unpaid day split |
| `overtime_records` | Start/end + derived `hours`, approval trail |
| `schedules` | Concrete shift per employee per date (unique employee+date) |
| `default_schedules` | Weekly template (dayOfWeek 0-6) that generates `schedules` |
| `time_logs` | Slack-driven clockIn/clockOut, unique employee+date |
| `employee_documents` | Uploaded files + expiry/status |
| `onboarding_tasks` | Checklist per employee with progress counts |
| `sessions` | JWT allow-list / revocation |
| `audit_log` | Old/new JSON snapshots for mutations |
| `permissions` / `role_permissions` | Runtime RBAC, editable via `/api/rbac` |
| `app_settings` | Company name, currency, overtime multiplier, leave allowance |

## 5. Leave lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING : employee POST /api/leaves
  PENDING --> APPROVED : manager/admin PATCH /:id/approve
  PENDING --> REJECTED : manager/admin PATCH /:id/approve
  PENDING --> CANCELLED : owner DELETE /:id
  APPROVED --> [*]
  REJECTED --> [*]
  CANCELLED --> [*]

  note right of APPROVED
    LeaveBalance.usedLeaves += paidDays
    (upsert on employeeId+year)
    auditLog(APPROVE)
  end note
```

```mermaid
sequenceDiagram
  autonumber
  participant E as Employee
  participant M as Manager / Admin
  participant API as Leaves router
  participant DB as PostgreSQL

  E->>API: POST /api/leaves {startDate, endDate, leaveType, reason}
  API->>API: validate dates, end >= start
  API->>API: days = ceil(diff) + 1 (inclusive)
  API->>DB: read current-year LeaveBalance
  API->>API: paidDays = min(days, available)<br/>unpaidDays = days - paidDays
  API->>DB: overlap check PENDING/APPROVED ranges
  alt overlap found
    API-->>E: 400 already have a request for these dates
  else clear
    API->>DB: insert LeaveRequest(status=PENDING)
    API-->>E: 200 leave request
  end

  M->>API: PATCH /api/leaves/:id/approve {status, reviewNotes}
  API->>DB: update status, reviewedBy, reviewedAt
  opt approved
    API->>DB: upsert LeaveBalance, usedLeaves += paidDays
  end
  API->>DB: auditLog(APPROVE, old, new)
  API-->>M: updated request
```

Balance accrual: `computeAccruedLeaves()` prorates the annual allowance (setting `leave.annual_allowance`) by days worked this year (`backend/src/routes/leaves.ts:15-41`).

## 6. Overtime lifecycle

```mermaid
sequenceDiagram
  autonumber
  participant E as Employee
  participant O as Overtime router
  participant S as Schedules
  participant DB as PostgreSQL

  E->>O: POST /api/overtime {date, startTime, endTime, description}
  O->>O: validate ordering, hours = (end - start)
  O->>S: find Schedule for employee+date
  alt shift exists
    O->>O: compare minute ranges
    O-->>E: 400 overlap with regular shift
  end
  O->>DB: insert OvertimeRecord(PENDING)
  O->>DB: auditLog(CREATE)

  Note over E,DB: Manager/admin PATCH /:id/approve → APPROVED or REJECTED.<br/>DELETE /:id only cancels while PENDING.
```

## 7. Slack clock-in / clock-out

```mermaid
sequenceDiagram
  autonumber
  participant Slack as Slack Events API
  participant W as POST /api/webhooks/slack
  participant DB as PostgreSQL
  participant TS as Timesheets

  Slack->>W: url_verification challenge
  W-->>Slack: { challenge }

  Slack->>W: event_callback (message, not bot)
  W->>W: normalize text
  W->>DB: findUnique(employee) by slackId
  alt employee not linked
    W-->>Slack: { ok: true } (silent)
  else "good morning"
    W->>DB: upsert TimeLog(today).clockIn = now if empty
  else "good evening"
    W->>DB: upsert TimeLog(today).clockOut = now (latest wins)
  end
  W-->>Slack: { ok: true }

  Note over DB,TS: TimeLogs feed the timesheet preview alongside<br/>schedules and approved overtime.
```

## 8. Timesheet generation

```mermaid
flowchart LR
  subgraph Inputs
    Sch["schedules<br/>(regular hours = end - start - break)"]
    OT["overtime_records<br/>status = APPROVED"]
    TL["time_logs<br/>(clockIn / clockOut)"]
    Set["app_settings<br/>currency, ot_multiplier"]
    Emp["employees.salary<br/>(used as hourly rate)"]
  end

  Agg["Aggregate per date<br/>dailyLogs: regular, overtime, clockIn, clockOut"]
  Sum["summary:<br/>totalRegularHours,<br/>totalOvertimeHours,<br/>regularPay, overtimePay, grossPay"]
  Prev["GET /api/timesheets/preview"]
  Pdf["POST /api/timesheets/generate<br/>pdf-lib → PDF bytes"]

  Sch --> Agg
  OT --> Agg
  TL --> Agg
  Set --> Sum
  Emp --> Sum
  Agg --> Sum
  Sum --> Prev
  Prev --> Pdf
```

- Employees are forced to their own `employeeId` on preview, and `generate` rejects PDFs for other employees (`backend/src/routes/timesheets.ts:48-55,175-181`).
- `reports.view` gates preview; `reports.export` gates PDF generation.

## 9. Frontend routing & navigation

```mermaid
flowchart TD
  Root["/"] --> Login["/login<br/>Login.tsx"]
  Root --> Guard{"PrivateRoute<br/>user in AuthContext?"}
  Guard -- no --> Login
  Guard -- yes --> Layout["Layout.tsx<br/>top bar + sidebar"]

  Layout --> Dash["/dashboard · Dashboard.tsx"]
  Layout --> Sch["/schedules · Schedules.tsx"]
  Layout --> Leave["/leaves · Leaves.tsx"]
  Layout --> OT["/overtime · Overtime.tsx"]
  Layout --> Users["/users · Users.tsx (ADMIN)"]
  Layout --> TS["/timesheets · Timesheets.tsx"]
  Layout --> Emp["/employees · Employees.tsx (ADMIN)"]
  Layout --> EmpD["/employees/:id · EmployeeDetail.tsx"]
  Layout --> RBAC["/rbac · RBACManagement.tsx (ADMIN)"]
  Layout --> Settings["/settings · Settings.tsx (ADMIN)"]
```

Providers wrapping the app (`frontend/src/App.tsx:34-66`): `NotificationProvider → AuthProvider → SettingsProvider`. `UIContext` exists but is not mounted.

Sidebar visibility is role-filtered in `Layout.tsx:18-33`; note this is cosmetic — the API enforces permissions independently.

## 10. Roles and permissions

Seed defines ~30 `resource.action` permissions (`backend/prisma/seed.ts`). Effective access is whatever rows exist in `role_permissions`, edited live via `/api/rbac` (admin-only).

| Capability | ADMIN | MANAGER | EMPLOYEE |
|---|---|---|---|
| Manage users / contractors | ✅ | — | — |
| Manage RBAC & settings | ✅ | — | — |
| View all leave / overtime | ✅ | ✅ | own only |
| Approve leave / overtime | ✅ | ✅ | — |
| Create leave / overtime | ✅ | ✅ | ✅ |
| Manage schedules & defaults | ✅ | ✅ | read own |
| Preview / export timesheets | ✅ | ✅ | own only |
| Documents / onboarding | ✅ | read | read own |
| View audit log | ✅ | — | — |

## 11. Things to know when reading the code

- `authMiddleware` runs a DB query per request (`sessions` lookup), and `requirePermission` runs another (`role_permissions`) — two extra round-trips per API call.
- `getEmployeeByUserId()` is duplicated in leaves, overtime, timesheets, and other routers rather than shared.
- `app_settings` is read unfiltered in a few handlers (`(prisma as any).appSettings`) because `AppSettings` has no generated type access pattern in those spots.
- Notification and UI contexts exist in the frontend but notifications are not yet wired to backend events.
