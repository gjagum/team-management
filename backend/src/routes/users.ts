import { Hono } from 'hono';
import { authMiddleware, requirePermission, requireRole, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';
import bcrypt from 'bcryptjs';

const usersRouter = new Hono();

usersRouter.use('/*', authMiddleware);

usersRouter.get('/', requirePermission('users.read'), async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isActive: true,
      createdAt: true,
      employee: {
        select: {
          employeeCode: true,
          department: true,
          position: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(users);
});

usersRouter.get('/:id', requirePermission('users.read'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const user = await prisma.user.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

usersRouter.post('/', requirePermission('users.create'), async (c) => {
  const data = await c.req.json();
  const passwordHash = await bcrypt.hash(data.password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        role: data.role || 'EMPLOYEE',
      },
    });

    // Auto-generate employee code: EMP-<zero-padded user id>
    const employeeCode = data.employeeCode || `EMP-${String(user.id).padStart(5, '0')}`;

    const employee = await tx.employee.create({
      data: {
        userId: user.id,
        employeeCode,
        department: data.department || null,
        position: data.position || null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
        salary: data.salary || null,
      },
    });

    return { ...user, employee };
  });

  await auditLog(c.user!.userId, 'CREATE', 'user', result.id, null, result);

  return c.json(result, 201);
});

usersRouter.put('/:id', requirePermission('users.update'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const oldUser = await prisma.user.findUnique({ where: { id } });
  if (!oldUser) return c.json({ error: 'User not found' }, 404);

  const updateData: any = {};
  if (data.fullName) updateData.fullName = data.fullName;
  if (data.role) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.password) updateData.passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  await auditLog(c.user!.userId, 'UPDATE', 'user', id, oldUser, user);

  return c.json(user);
});

usersRouter.delete('/:id', requirePermission('users.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const oldUser = await prisma.user.findUnique({ where: { id } });
  if (!oldUser) return c.json({ error: 'User not found' }, 404);

  await prisma.user.delete({ where: { id } });

  await auditLog(c.user!.userId, 'DELETE', 'user', id, oldUser, null);

  return c.json({ message: 'User deleted' });
});

// Create employee profile for an existing user who doesn't have one
usersRouter.post('/:id/activate-employee', requirePermission('employees.create'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const user = await prisma.user.findUnique({
    where: { id },
    include: { employee: true },
  });

  if (!user) return c.json({ error: 'User not found' }, 404);
  if (user.employee) return c.json({ error: 'User already has an employee profile' }, 400);

  const employeeCode = data.employeeCode || `EMP-${String(user.id).padStart(5, '0')}`;

  const employee = await prisma.employee.create({
    data: {
      userId: user.id,
      employeeCode,
      department: data.department || null,
      position: data.position || null,
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      salary: data.salary || null,
    },
  });

  await auditLog(c.user!.userId, 'CREATE', 'employee', employee.id, null, employee);

  return c.json(employee, 201);
});

export default usersRouter;

