# Team Management System

A comprehensive team management platform for managing employees, leaves, overtime, schedules, timesheets, documents, onboarding, and teams — with role-based access control (RBAC).

## 🚀 Quick Start

**Docker is recommended for this project due to Bun/TypeScript compatibility issues.**

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**⚠️ If you encounter any local development issues, please read `START_HERE.md` first.**

### Option 2: Manual Setup

See `docs/DEV_GUIDE.md` for detailed manual setup instructions.

## Default Login Credentials

| Role     | Email             | Password    |
| -------- | ----------------- | ----------- |
| Admin    | admin@team.com    | admin123    |
| Manager  | manager@team.com  | manager123  |
| Employee | employee@team.com | employee123 |

> **Note:** No `TEAM_LEADER` seed user is created by the current seed script. Promote an employee to the `TEAM_LEADER` role via the Users page or RBAC management to test team-based approvals.

## Features

### Core HR
- **User Management** — Create and manage users with four roles (Admin, Manager, Team Leader, Employee); activate/deactivate accounts, promote users to employees.
- **Employee Management** — Employee profiles (code, department, position, hire date, salary) linked 1:1 to a user account.
- **Employee Documents** — Upload and track contracts, government IDs, tax forms, and certificates with status (Active/Archived/Expired) and expiry tracking.
- **Onboarding** — Configurable per-employee task checklists with required/optional flags, categories, and progress tracking.

### Time & Attendance
- **Leave Management**
  - Annual leave accrual with balance tracking
  - Create, view, approve, reject, and cancel requests
  - Paid / unpaid day split per request
- **Overtime Tracking**
  - Log overtime hours with start/end times
  - Submit for approval, approve/reject workflow
- **Schedules** — Per-day shift scheduling plus default weekly schedules (per day-of-week); shift types (Morning, Afternoon, Night, Custom); auto-populate schedules from defaults.
- **Timesheets** — Clock-in/clock-out time logging with Slack integration; PDF timesheet generation with overtime multipliers.

### Organization & Access Control
- **Teams** — Group employees into teams, each with a team leader and an alternate approver for leave/overtime approval.
- **Role-Based Access Control (RBAC)**
  - Four roles: Admin, Manager, Team Leader, Employee
  - Granular permission system (`Permission` + `RolePermission` tables) — every API action is guarded by a named permission
  - Admin-only management UI to inspect and edit the permission matrix
- **Settings** — Global key/value configuration store (company name, currency, overtime rate multiplier, etc.) typed as string/number/boolean/json.
- **Webhooks** — Slack webhook endpoint for clock-in/clock-out via chat messages.
- **Audit Logging** — Every system mutation is recorded with old/new values for full traceability.

### UI
- **Professional Interface** — Clean, modern Tailwind CSS UI with responsive sidebar navigation, modals, and status badges.
- **Dashboard** — At-a-glance overview: leave balance, pending requests, overtime stats.

## Roles & Permissions

| Role        | Capabilities                                                                |
| ----------- | --------------------------------------------------------------------------- |
| Admin       | Full access to all features, RBAC configuration, settings, user management. |
| Manager     | Approve/reject leave and overtime requests, view reports and timesheets.    |
| Team Leader | Approve/reject requests for their team, manage team schedules.              |
| Employee    | Create their own leave/overtime requests, view their own data and schedules. |

Permissions are defined per resource + action (e.g. `leaves.create`, `schedules.update`, `reports.export`) and assigned to roles via the RBAC management page (`/rbac`).

## Tech Stack

- **Backend**: Bun 1.3.x, Hono 4.x, Prisma ORM 7.x, PostgreSQL 16
- **Frontend**: React 18, Vite 5.x, TypeScript, Tailwind CSS 3.x, Lucide Icons, Axios, date-fns, React Router DOM 6.x
- **Database**: PostgreSQL 16
- **Authentication**: JWT tokens (24h expiry) + bcryptjs, backed by a session table
- **Deployment**: Docker & Docker Compose

## Project Structure

```
team-management/
├── backend/                       # Bun + Hono + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (16 models, 6 enums)
│   │   └── seed.ts                # Database seeding
│   └── src/
│       ├── index.ts               # Server entry, auth routes, route mounting
│       ├── middleware/
│       │   └── auth.ts            # Auth, requireRole, requirePermission, auditLog
│       └── routes/
│           ├── users.ts           # User management
│           ├── employees.ts       # Employee profiles
│           ├── teams.ts           # Teams + members
│           ├── leaves.ts          # Leave requests + balances
│           ├── overtime.ts        # Overtime records
│           ├── schedules.ts       # Daily + default weekly schedules
│           ├── timesheets.ts      # Time logs, PDF generation
│           ├── documents.ts       # Employee documents
│           ├── onboarding.ts      # Onboarding task checklists
│           ├── rbac.ts            # Permissions + role-permissions
│           ├── settings.ts        # App settings store
│           └── webhooks.ts        # Slack webhook endpoint
├── frontend/                      # React + Vite app
│   └── src/
│       ├── App.tsx                # Routes + providers
│       ├── main.tsx
│       ├── components/
│       │   └── Layout.tsx         # Sidebar nav + shell
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Users.tsx
│       │   ├── Employees.tsx
│       │   ├── EmployeeDetail.tsx
│       │   ├── Teams.tsx
│       │   ├── Leaves.tsx
│       │   ├── Overtime.tsx
│       │   ├── Schedules.tsx
│       │   ├── Timesheets.tsx
│       │   ├── RBACManagement.tsx
│       │   └── Settings.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx
│       │   ├── UIContext.tsx
│       │   ├── SettingsContext.tsx
│       │   └── NotificationContext.tsx
│       ├── services/
│       │   └── api.ts             # Axios client + API calls
│       ├── types/
│       │   └── index.ts           # Shared TypeScript types
│       └── utils/
│           └── helpers.tsx
├── docs/                          # Documentation
├── Dockerfile                     # Backend container
├── docker-compose.yml             # All services
├── START_HERE.md                  # Start here!
└── README.md                      # This file
```

## API Endpoints

All endpoints (except auth and the public settings endpoint) require a `Bearer` JWT token. Mutating endpoints are additionally guarded by a named permission.

### Authentication
| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| POST   | `/api/auth/login`   | User login           |
| POST   | `/api/auth/logout`  | User logout          |
| GET    | `/api/auth/me`      | Get current user     |

### Users — `/api/users`
| Method | Endpoint                     | Permission        |
| ------ | ---------------------------- | ----------------- |
| GET    | `/`                          | `users.read`      |
| GET    | `/:id`                       | `users.read`      |
| POST   | `/`                          | `users.create`    |
| PUT    | `/:id`                       | `users.update`    |
| DELETE | `/:id`                       | `users.delete`    |
| POST   | `/:id/activate-employee`     | `employees.create`|

### Employees — `/api/employees`
| Method | Endpoint | Permission        |
| ------ | -------- | ----------------- |
| GET    | `/me`    | (self)            |
| GET    | `/`      | `employees.read`  |
| GET    | `/:id`   | `employees.read`  |
| POST   | `/`      | `employees.create`|
| PUT    | `/:id`   | `employees.update`|
| DELETE | `/:id`   | `employees.delete`|

### Teams — `/api/teams`
| Method | Endpoint            | Permission      |
| ------ | ------------------- | --------------- |
| GET    | `/`                 | `teams.read`    |
| GET    | `/:id`              | `teams.read`    |
| POST   | `/`                 | `teams.create`  |
| PUT    | `/:id`              | `teams.update`  |
| DELETE | `/:id`              | `teams.delete`  |
| POST   | `/:id/members`      | `teams.update`  |

### Leaves — `/api/leaves`
| Method | Endpoint            | Permission       |
| ------ | ------------------- | ---------------- |
| GET    | `/`                 | `leaves.read`    |
| GET    | `/my-requests`      | (self)           |
| GET    | `/balance`          | `leaves.read`    |
| POST   | `/`                 | `leaves.create`  |
| PATCH  | `/:id/approve`      | `leaves.approve` |
| DELETE | `/:id`              | `leaves.delete`  |

### Overtime — `/api/overtime`
| Method | Endpoint            | Permission         |
| ------ | ------------------- | ------------------ |
| GET    | `/`                 | `overtime.read`    |
| GET    | `/my-records`       | (self)             |
| POST   | `/`                 | `overtime.create`  |
| PATCH  | `/:id/approve`      | `overtime.approve` |
| DELETE | `/:id`              | `overtime.delete`  |

### Schedules — `/api/schedules`
| Method | Endpoint                   | Permission          |
| ------ | -------------------------- | ------------------- |
| GET    | `/`                        | `schedules.read`    |
| GET    | `/my-schedule`             | (self)              |
| GET    | `/defaults`                | `schedules.read`    |
| GET    | `/defaults/:employeeId`    | `schedules.read`    |
| PUT    | `/defaults/:employeeId`    | `schedules.update`  |
| POST   | `/auto-populate`           | `schedules.create`  |
| POST   | `/auto-populate-all`       | `schedules.create`  |
| POST   | `/`                        | `schedules.create`  |
| PUT    | `/:id`                     | `schedules.update`  |
| DELETE | `/:id`                     | `schedules.delete`  |

### Timesheets — `/api/timesheets`
| Method | Endpoint     | Permission        |
| ------ | ------------ | ----------------- |
| GET    | `/preview`   | `reports.view`    |
| POST   | `/generate`  | `reports.export`  |

### Documents — `/api/employees/:employeeId/documents`
| Method | Endpoint                              | Permission         |
| ------ | ------------------------------------- | ------------------ |
| GET    | `/documents`                          | `documents.read`   |
| GET    | `/documents/:docId/download`          | `documents.read`   |
| POST   | `/documents`                          | `documents.upload` |
| DELETE | `/documents/:docId`                   | `documents.delete` |

### Onboarding — `/api/employees/:employeeId/onboarding`
| Method | Endpoint              | Permission          |
| ------ | --------------------- | ------------------- |
| GET    | `/onboarding`         | `onboarding.read`   |
| POST   | `/onboarding/init`    | `onboarding.manage` |
| PUT    | `/onboarding/:taskId` | `onboarding.manage` |
| DELETE | `/onboarding/:taskId` | `onboarding.manage` |

### RBAC — `/api/rbac` (Admin only)
| Method | Endpoint               | Description                  |
| ------ | ---------------------- | ---------------------------- |
| GET    | `/permissions`         | List all permissions         |
| POST   | `/permissions`         | Create a permission          |
| DELETE | `/permissions/:id`     | Delete a permission          |
| GET    | `/role-permissions`    | List role↔permission grants  |
| POST   | `/role-permissions`    | Grant a permission to a role |
| DELETE | `/role-permissions/:id`| Revoke a grant               |
| GET    | `/roles/summary`       | Permission matrix per role   |

### Settings — `/api/settings`
| Method | Endpoint                  | Auth          |
| ------ | ------------------------- | ------------- |
| GET    | `/public/company-name`    | Public        |
| GET    | `/`                       | Authenticated |
| GET    | `/category/:category`     | Authenticated |
| GET    | `/key/:key`               | Authenticated |
| PUT    | `/`                       | Admin         |
| PUT    | `/key/:key`               | Admin         |

### Webhooks — `/api/webhooks`
| Method | Endpoint | Description                          |
| ------ | -------- | ------------------------------------ |
| POST   | `/slack` | Slack clock-in/clock-out integration |

## Documentation

- `START_HERE.md` — **Start here for quick setup**
- `docs/QUICKSTART.md` — Quick start guide
- `docs/DEV_GUIDE.md` — Development guide with Docker
- `docs/API.md` — API endpoints documentation
- `docs/RBAC.md` — RBAC and permissions
- `docs/DEPLOYMENT.md` — Production deployment
- `docs/DENO_DEPLOY.md` — Deno Deploy notes
- `docs/DOCKER.md` — Docker details
- `docs/PROJECT_SUMMARY.md` — Complete project overview

## Troubleshooting

### Backend/Database Issues
```bash
# Reset everything (⚠️ deletes data)
docker-compose down -v
docker-compose up -d --build

# Check logs
docker-compose logs backend
docker-compose logs postgres
```

### Frontend Issues
```bash
docker-compose restart frontend
docker-compose logs frontend
```

## License

MIT
