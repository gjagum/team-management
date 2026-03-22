# Docker Deployment Guide

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

---

## Quick Start

### 1. Create environment file

```bash
cp backend/.env.example backend/.env
```

### 2. Update `backend/.env`

```env
DATABASE_URL=postgres://teamuser:teampass@postgres:5432/teammanagement
JWT_SECRET=your-secure-random-secret-key-here
```

### 3. Start all services

```bash
docker-compose up -d
```

### 4. Check status

```bash
docker-compose ps
docker-compose logs -f
```

### 5. Access the application

- Application: http://localhost:3001

---

## Manual Setup (Without Docker Compose)

### Database

```bash
docker run -d \
  --name team-db \
  -e POSTGRES_USER=teamuser \
  -e POSTGRES_PASSWORD=teampass \
  -e POSTGRES_DB=teammanagement \
  -p 5432:5432 \
  postgres:16-alpine
```

### Push schema and seed

```bash
cd backend
deno task prisma:push
deno task seed
```

### Start the server

```bash
cd backend
deno task start
```

---

## Database Management

### Backup

```bash
docker-compose exec postgres pg_dump -U teamuser teammanagement > backup.sql
```

### Restore

```bash
docker-compose exec -T postgres psql -U teamuser teammanagement < backup.sql
```

---

## Troubleshooting

### Database connection issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres
```

### Backend issues

```bash
# Check logs
docker-compose logs backend

# Restart
docker-compose restart backend

# Rebuild
docker-compose up -d --build backend
```

---

## Production Considerations

### Security

- Change all default passwords
- Use a strong `JWT_SECRET` (32+ characters)
- Enable HTTPS with SSL certificates
- Configure firewall rules

### Database

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL) for production
- Enable automated backups
- Configure read replicas for scaling

### Scaling

- Use a load balancer for multiple backend instances
- Configure CDN for frontend static assets
- Use container orchestration (Kubernetes, Docker Swarm)

### Monitoring

- Set up monitoring (Prometheus, Grafana)
- Configure log aggregation (ELK stack, Loki)
- Set up alerting for critical errors
