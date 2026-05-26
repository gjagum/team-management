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
