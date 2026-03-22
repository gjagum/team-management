# Development Guide

## Quick Start with Docker (Recommended)

Since there are compatibility issues between Bun, TypeScript, and Prisma on this system, use Docker for development:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432

## Database Connection

Connect to PostgreSQL:
```bash
docker-compose exec postgres psql -U teamuser -d teammanagement
```

## Re-running Migrations

```bash
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed
```

## Troubleshooting

### Backend won't start
```bash
docker-compose logs backend
docker-compose restart backend
```

### Frontend won't start
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### Database connection issues
```bash
docker-compose down -v
docker-compose up -d
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
```

## Default Users

- Admin: admin@team.com / admin123
- Manager: manager@team.com / manager123
- Employee: employee@team.com / employee123

## Local Development (Alternative)

If you prefer local development (requires fixing compatibility issues):

### Backend
```bash
cd backend
npm install
npx ts-node-dev src/index.ts
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Use Node.js instead of Bun
```

Note: Due to Bun compatibility issues with Prisma and Vite on this system, using Node.js is recommended for local development.
