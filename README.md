# Team Management System

A comprehensive team management application for handling overtime and leave requests with role-based access control (RBAC).

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

| Role       | Email                | Password    |
|------------|----------------------|-------------|
| Admin      | admin@team.com       | admin123    |
| Manager    | manager@team.com     | manager123  |
| Employee   | employee@team.com    | employee123 |

## Features

- **User Management**: Create and manage users with different roles (Admin, Manager, Employee)
- **Leave Management**:
  - 2 leaves per year accrual system
  - Create, view, approve, and reject leave requests
  - Leave balance tracking
- **Overtime Tracking**:
  - Log overtime hours
  - Submit for approval
  - Track approved/rejected overtime
- **Role-Based Access Control (RBAC)**:
  - Admin: Full access to all features
  - Manager: Can approve/reject requests, view reports
  - Employee: Can create requests, view own data
- **Audit Logging**: Track all system actions
- **Professional UI**: Clean, modern interface with Tailwind CSS

## Tech Stack

- **Backend**: Bun, Hono, Prisma ORM, PostgreSQL
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Database**: PostgreSQL 16
- **Authentication**: JWT tokens
- **Deployment**: Docker & Docker Compose

## Documentation

- `START_HERE.md` - **Start here for quick setup**
- `docs/QUICKSTART.md` - Quick start guide
- `docs/DEV_GUIDE.md` - Development guide with Docker
- `docs/API.md` - API endpoints documentation
- `docs/RBAC.md` - RBAC and permissions
- `docs/DEPLOYMENT.md` - Production deployment
- `docs/PROJECT_SUMMARY.md` - Complete project overview

## Project Structure

```
team-management/
├── backend/                    # Bun + Hono + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Database seeding
│   ├── src/
│   │   ├── index.ts           # Main server entry
│   │   ├── middleware/
│   │   │   └── auth.ts        # Auth & RBAC middleware
│   │   └── routes/
│   │       ├── users.ts       # User management
│   │       ├── employees.ts   # Employee management
│   │       ├── leaves.ts      # Leave requests
│   │       └── overtime.ts    # Overtime records
│   └── package.json
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/Layout.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Leaves.tsx
│   │   │   ├── Overtime.tsx
│   │   │   ├── Users.tsx
│   │   │   └── Employees.tsx
│   │   ├── contexts/AuthContext.tsx
│   │   ├── services/api.ts
│   │   ├── types/index.ts
│   │   └── utils/helpers.tsx
│   └── package.json
├── docs/                       # Documentation
├── Dockerfile                  # Backend container
├── docker-compose.yml          # All services
├── START_HERE.md              # Start here!
└── README.md                  # This file
```

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (Admin)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee

### Leaves
- `GET /api/leaves` - List all requests
- `GET /api/leaves/my-requests` - My requests
- `GET /api/leaves/balance` - Get balance
- `POST /api/leaves` - Create request
- `PATCH /api/leaves/:id/approve` - Approve/reject
- `DELETE /api/leaves/:id` - Cancel request

### Overtime
- `GET /api/overtime` - List all records
- `GET /api/overtime/my-records` - My records
- `POST /api/overtime` - Create record
- `PATCH /api/overtime/:id/approve` - Approve/reject
- `DELETE /api/overtime/:id` - Cancel record

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
