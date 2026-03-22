# Team Management System - Quick Start

## Docker Deployment (Recommended)

The easiest way to run this project is using Docker Compose:

```bash
# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001

# View logs
docker-compose logs -f
```

## Default Login Credentials

- **Admin**: admin@team.com / admin123
- **Manager**: manager@team.com / manager123
- **Employee**: employee@team.com / employee123

## Features

✅ User Management with RBAC (Admin/Manager/Employee roles)
✅ Employee Management (department, position, salary)
✅ Leave Tracking (2 leaves/year with approval workflow)
✅ Overtime Tracking (log hours with approval)
✅ Professional UI with sidebar navigation
✅ JWT Authentication
✅ Audit Logging

## Project Structure

- `backend/` - Bun + Hono + Prisma API server
- `frontend/` - React + Vite + TypeScript app
- `docs/` - Complete documentation
- `Dockerfile` - Backend container
- `docker-compose.yml` - All services orchestration

## Documentation

- `README.md` - Full documentation
- `docs/QUICKSTART.md` - Quick start guide
- `docs/API.md` - API endpoints
- `docs/RBAC.md` - Permission system
- `docs/DEPLOYMENT.md` - Production deployment
- `docs/DEV_GUIDE.md` - Development guide with Docker

## Common Commands

```bash
# Stop services
docker-compose down

# Restart services
docker-compose restart

# Rebuild services
docker-compose up -d --build

# View logs
docker-compose logs backend
docker-compose logs frontend

# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d
```

## Tech Stack

- **Backend**: Bun + Hono + Prisma + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Deployment**: Docker (single compose file)
