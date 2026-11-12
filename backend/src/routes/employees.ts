import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const employeesRouter = new Hono();

employeesRouter.use('/*', authMiddleware);

// Get current employee profile
employeesRouter.get('/me', async (c) => {
  const user = (c as any).user;
  const employee = await prisma.employee.findUnique({
    where: { userId: user.userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
        },
      },
    },
  });

  if (!employee) {
    return c.json({ error: 'Employee profile not found' }, 404);
  }

  return c.json(employee);
});

employeesRouter.get('/', requirePermission('employees.read'), async (c) => {
  const employees = await prisma.employee.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(employees);
});

employeesRouter.get('/:id', requirePermission('employees.read'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!employee) return c.json({ error: 'Employee not found' }, 404);
  return c.json(employee);
});

employeesRouter.post('/', requirePermission('employees.create'), async (c) => {
  const data = await c.req.json();

  const employee = await prisma.employee.create({
    data: {
      userId: data.userId,
      employeeCode: data.employeeCode,
      department: data.department,
      position: data.position,
      hireDate: new Date(data.hireDate),
      salary: data.salary,
      slackId: data.slackId || null,
      teamId: data.teamId || null,
    },
  });

  await auditLog(c.user!.userId, 'CREATE', 'employee', employee.id, null, employee);

  return c.json(employee, 201);
});

employeesRouter.put('/:id', requirePermission('employees.update'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const oldEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!oldEmployee) return c.json({ error: 'Employee not found' }, 404);

  const updateData: any = {};
  if (data.department) updateData.department = data.department;
  if (data.position) updateData.position = data.position;
  if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
  if (data.salary) updateData.salary = data.salary;
  if (data.slackId !== undefined) updateData.slackId = data.slackId;
  if (data.teamId !== undefined) updateData.teamId = data.teamId || null;

  const employee = await prisma.employee.update({
    where: { id },
    data: updateData,
  });

  await auditLog(c.user!.userId, 'UPDATE', 'employee', id, oldEmployee, employee);

  return c.json(employee);
});

employeesRouter.delete('/:id', requirePermission('employees.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const oldEmployee = await prisma.employee.findUnique({ where: { id } });
  if (!oldEmployee) return c.json({ error: 'Employee not found' }, 404);

  await prisma.employee.delete({ where: { id } });

  await auditLog(c.user!.userId, 'DELETE', 'employee', id, oldEmployee, null);

  return c.json({ message: 'Employee deleted' });
});

export default employeesRouter;
