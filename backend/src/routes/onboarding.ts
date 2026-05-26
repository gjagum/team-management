import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const onboardingRouter = new Hono();

onboardingRouter.use('/*', authMiddleware);

const DEFAULT_TASKS = [
  { taskName: 'Contract Signed', category: 'documents', isRequired: true, sortOrder: 1 },
  { taskName: 'Government ID Submitted', category: 'documents', isRequired: true, sortOrder: 2 },
  { taskName: 'Tax Form Submitted', category: 'documents', isRequired: true, sortOrder: 3 },
  { taskName: 'Certificate / Diploma Submitted', category: 'documents', isRequired: false, sortOrder: 4 },
  { taskName: 'System Access Granted', category: 'access', isRequired: true, sortOrder: 5 },
  { taskName: 'Orientation Completed', category: 'orientation', isRequired: false, sortOrder: 6 },
];

onboardingRouter.get('/employees/:employeeId/onboarding', requirePermission('onboarding.read'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));

  const tasks = await prisma.onboardingTask.findMany({
    where: { employeeId },
    orderBy: { sortOrder: 'asc' },
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.isCompleted).length;
  const required = tasks.filter(t => t.isRequired).length;
  const requiredCompleted = tasks.filter(t => t.isRequired && t.isCompleted).length;

  return c.json({
    tasks,
    progress: { total, completed, required, requiredCompleted },
  });
});

onboardingRouter.post('/employees/:employeeId/onboarding/init', requirePermission('onboarding.manage'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return c.json({ error: 'Employee not found' }, 404);

  const existing = await prisma.onboardingTask.count({ where: { employeeId } });
  if (existing > 0) {
    return c.json({ error: 'Onboarding tasks already exist for this employee. Delete existing tasks first or use PUT to update them.' }, 400);
  }

  const tasks = await Promise.all(
    DEFAULT_TASKS.map(task =>
      prisma.onboardingTask.create({
        data: { employeeId, ...task },
      })
    )
  );

  return c.json(tasks, 201);
});

onboardingRouter.put('/employees/:employeeId/onboarding/:taskId', requirePermission('onboarding.manage'), async (c) => {
  const taskId = parseInt(c.req.param('taskId'));
  const body = await c.req.json();

  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task) return c.json({ error: 'Task not found' }, 404);

  const updateData: any = {};
  if (body.isCompleted !== undefined) {
    updateData.isCompleted = body.isCompleted;
    updateData.completedAt = body.isCompleted ? new Date() : null;
    updateData.completedBy = body.isCompleted ? c.user!.userId : null;
  }
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.taskName !== undefined) updateData.taskName = body.taskName;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const updated = await prisma.onboardingTask.update({
    where: { id: taskId },
    data: updateData,
  });

  return c.json(updated);
});

onboardingRouter.delete('/employees/:employeeId/onboarding/:taskId', requirePermission('onboarding.manage'), async (c) => {
  const taskId = parseInt(c.req.param('taskId'));
  const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
  if (!task) return c.json({ error: 'Task not found' }, 404);

  await prisma.onboardingTask.delete({ where: { id: taskId } });

  return c.json({ message: 'Task deleted' });
});

export default onboardingRouter;
