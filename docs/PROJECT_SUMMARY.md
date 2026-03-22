# Team Management Application - Project Summary

## Project Overview

A comprehensive team management application built with modern technologies, featuring overtime and leave tracking with role-based access control (RBAC).

## Key Features Implemented

### ✅ Core Functionality
- **User Management**: Create, read, update, delete users
- **Employee Management**: Track employee information (code, department, position, hire date, salary)
- **Leave Management**: 
  - 2 leaves per year accrual system
  - Create, approve, reject, cancel leave requests
  - Real-time leave balance tracking
- **Overtime Tracking**:
  - Log overtime hours with start/end times
  - Submit for approval workflow
  - Track approved/rejected records

### ✅ Security & Access Control
- **RBAC System**: Three-tier permission model
  - Admin: Full system access
  - Manager: Can approve requests, view reports
  - Employee: Can create requests, view own data
- **JWT Authentication**: Secure token-based auth
- **Permission Middleware**: Granular access control on API endpoints
- **Audit Logging**: Track all system actions

### ✅ User Interface
- **Professional Design**: Clean, modern UI with Tailwind CSS
- **Responsive Layout**: Mobile-friendly sidebar navigation
- **Dashboard**: Overview of leave balance, pending requests, overtime stats
- **Modal Forms**: Create/edit users, leave requests, overtime records
- **Status Badges**: Visual indicators for request status

## Technology Stack

### Backend
- **Runtime**: Bun 1.3.6 (Fast JavaScript runtime)
- **Framework**: Hono 4.0.0 (Lightweight web framework)
- **ORM**: Prisma 7.5.0 (Type-safe database access)
- **Database**: PostgreSQL 16 (Relational database)
- **Authentication**: JWT tokens
- **Password Hashing**: bcryptjs

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.21 (Fast dev server & bundler)
- **Styling**: Tailwind CSS 3.4.19 (Utility-first CSS)
- **Icons**: Lucide React 0.303.0
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Routing**: React Router DOM 6.30.3

### Deployment
- **Containerization**: Docker & Docker Compose
- **Single Container**: All services in one compose file

## Project Structure

```
team-management/
├── backend/                    # Backend application
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema with RBAC
│   │   └── seed.ts            # Database seeding script
│   ├── src/
│   │   ├── index.ts           # Main server entry
│   │   ├── middleware/
│   │   │   └── auth.ts        # Auth & RBAC middleware
│   │   └── routes/
│   │       ├── users.ts       # User management API
│   │       ├── employees.ts   # Employee management API
│   │       ├── leaves.ts      # Leave requests API
│   │       └── overtime.ts    # Overtime records API
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Frontend application
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.tsx     # Main layout with sidebar
│   │   ├── pages/
│   │   │   ├── Login.tsx      # Login page
│   │   │   ├── Dashboard.tsx  # Dashboard overview
│   │   │   ├── Leaves.tsx     # Leave management
│   │   │   ├── Overtime.tsx   # Overtime tracking
│   │   │   ├── Users.tsx      # User management
│   │   │   └── Employees.tsx  # Employee view
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx # Authentication context
│   │   ├── services/
│   │   │   └── api.ts         # API service with axios
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript types
│   │   └── utils/
│   │       └── helpers.tsx    # Utility functions
│   ├── index.html
│   ├── vite.config.ts         # Vite config with API proxy
│   ├── tailwind.config.js
│   └── package.json
│
├── docs/                       # Documentation
│   ├── API.md                 # API documentation
│   ├── RBAC.md                # RBAC documentation
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── QUICKSTART.md          # Quick start guide
│
├── Dockerfile                 # Backend Docker config
├── docker-compose.yml         # All services compose file
└── README.md                 # Main documentation

```

## Database Schema

### Core Tables
- **users**: User accounts with roles
- **employees**: Employee information linked to users
- **leave_balances**: Annual leave tracking (2 leaves/year)
- **leave_requests**: Leave request records with approval workflow
- **overtime_records**: Overtime logging with approval workflow
- **sessions**: JWT session management
- **audit_log**: System action tracking
- **permissions**: Granular permissions
- **role_permissions**: Role-permission mapping

### Relationships
- Users → Employees (1:1)
- Employees → Leave Balances (1:N)
- Employees → Leave Requests (1:N)
- Employees → Overtime Records (1:N)
- Users → Sessions (1:N)
- Users → Audit Logs (1:N)
- Roles → Permissions (N:M)

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users (RBAC Protected)
- `GET /api/users` - List users (Admin)
- `POST /api/users` - Create user (Admin)
- `PUT /api/users/:id` - Update user (Admin)
- `DELETE /api/users/:id` - Delete user (Admin)

### Employees (RBAC Protected)
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee (Admin)
- `PUT /api/employees/:id` - Update employee (Admin)

### Leaves (RBAC Protected)
- `GET /api/leaves` - List all requests
- `GET /api/leaves/my-requests` - My requests
- `GET /api/leaves/balance` - Get balance
- `POST /api/leaves` - Create request
- `PATCH /api/leaves/:id/approve` - Approve/reject (Manager/Admin)
- `DELETE /api/leaves/:id` - Cancel request

### Overtime (RBAC Protected)
- `GET /api/overtime` - List all records
- `GET /api/overtime/my-records` - My records
- `POST /api/overtime` - Create record
- `PATCH /api/overtime/:id/approve` - Approve/reject (Manager/Admin)
- `DELETE /api/overtime/:id` - Cancel record

## Default Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@team.com | admin123 |
| Manager | manager@team.com | manager123 |
| Employee | employee@team.com | employee123 |

## Getting Started

### Using Docker Compose
```bash
docker-compose up -d
```

### Manual Setup
```bash
# Backend
cd backend
bun install
cp .env.example .env
bun run prisma migrate deploy
bun run seed
bun run dev

# Frontend
cd frontend
bun install
bun run dev
```

## Documentation

- **README.md**: Main project documentation
- **docs/QUICKSTART.md**: Quick start guide
- **docs/API.md**: Complete API documentation
- **docs/RBAC.md**: RBAC and permissions details
- **docs/DEPLOYMENT.md**: Production deployment guide

## Development Notes

- Backend runs on port 3001
- Frontend dev server on port 3000 with API proxy
- Vite proxy configured to forward `/api` requests to backend
- Hot reload enabled for both frontend and backend
- TypeScript strict mode enabled
- Prisma migrations included

## Production Considerations

- Change default passwords
- Use strong JWT_SECRET
- Enable HTTPS
- Use managed PostgreSQL
- Set up backups
- Configure monitoring
- Use load balancer for scaling

## Future Enhancements

- Email notifications for approvals
- Calendar view for leaves/overtime
- Export reports (PDF, Excel)
- Multi-language support
- Mobile app
- Advanced analytics
- Integration with payroll system
- Calendar sync (Google, Outlook)

## License

MIT
