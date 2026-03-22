# Quick Start Guide

## Setup Instructions

### Option 1: Docker Compose (Recommended)

1. Clone and navigate to the project:
```bash
cd team-management
```

2. Copy environment file:
```bash
cp backend/.env.example backend/.env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

5. Default login credentials:
- Admin: admin@team.com / admin123
- Manager: manager@team.com / manager123
- Employee: employee@team.com / employee123

### Option 2: Manual Setup

#### Backend
```bash
cd backend
bun install
cp .env.example .env
# Edit .env with your database credentials
bun run prisma migrate deploy
bun run seed
bun run dev
```

#### Frontend
```bash
cd frontend
bun install
bun run dev
```

## Project Overview

- **Backend**: Bun + Hono + Prisma + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Features**: User management, Leave tracking (2 leaves/year), Overtime tracking, RBAC
- **Deployment**: Docker Compose (single container)

## Next Steps

- Read [README.md](../README.md) for detailed documentation
- Check [docs/API.md](API.md) for API endpoints
- Review [docs/RBAC.md](RBAC.md) for permission details
- See [docs/DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
