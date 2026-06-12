import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/deno';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import usersRouter from './routes/users.ts';
import employeesRouter from './routes/employees.ts';
import leavesRouter from './routes/leaves.ts';
import overtimeRouter from './routes/overtime.ts';
import schedulesRouter from './routes/schedules.ts';
import settingsRouter from './routes/settings.ts';
import rbacRouter from './routes/rbac.ts';
import timesheetsRouter from './routes/timesheets.ts';
import webhooksRouter from './routes/webhooks.ts';
import documentsRouter from './routes/documents.ts';
import onboardingRouter from './routes/onboarding.ts';
import teamsRouter from './routes/teams.ts';


export const prisma = new PrismaClient();

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export const app = new Hono();

// CORS for local development (frontend on different port)
app.use('/api/*', cors());

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/auth/me', async (c) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token provided' }, 401);

  try {
    const decoded = jwt.verify(token, Deno.env.get('JWT_SECRET') || 'your-secret-key') as JWTPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { employee: true },
    });

    if (!user) return c.json({ error: 'User not found' }, 404);

    return c.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employee: user.employee,
    });
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    Deno.env.get('JWT_SECRET') || 'your-secret-key',
    { expiresIn: '24h' }
  );

  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      employee: user.employee,
    },
  });
});

app.post('/api/auth/logout', async (c) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '');
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  return c.json({ message: 'Logged out successfully' });
});

app.route('/api/users', usersRouter);
app.route('/api/employees', employeesRouter);
app.route('/api/leaves', leavesRouter);
app.route('/api/overtime', overtimeRouter);
app.route('/api/schedules', schedulesRouter);
app.route('/api/settings', settingsRouter);
app.route('/api/rbac', rbacRouter);
app.route('/api/timesheets', timesheetsRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api', documentsRouter);
app.route('/api', onboardingRouter);
app.route('/api/teams', teamsRouter);


// --- Serve Built Frontend (for production / Deno Deploy) ---
app.use('/assets/*', serveStatic({ root: './static' }));
app.get('*', serveStatic({ root: './static', path: 'index.html' }));

const port = parseInt(Deno.env.get('PORT') || '3001');
console.log(`🚀 Server running on http://localhost:${port}`);
Deno.serve({ port }, app.fetch);

