import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const overtimeRouter = new Hono();

overtimeRouter.use('/*', authMiddleware);

overtimeRouter.get('/', requirePermission('overtime.read'), async (c) => {
  const records = await prisma.overtimeRecord.findMany({
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      approver: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(records);
});

overtimeRouter.get('/my-records', requirePermission('overtime.read'), async (c) => {
  const records = await prisma.overtimeRecord.findMany({
    where: { employeeId: c.user!.userId },
    include: {
      approver: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  return c.json(records);
});

overtimeRouter.post('/', requirePermission('overtime.create'), async (c) => {
  const data = await c.req.json();
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  const hours = parseFloat(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

  const record = await prisma.overtimeRecord.create({
    data: {
      employeeId: c.user!.userId,
      date: new Date(data.date),
      startTime,
      endTime,
      hours,
      description: data.description,
      status: 'PENDING',
    },
  });

  await auditLog(c.user!.userId, 'CREATE', 'overtime_record', record.id, null, record);

  return c.json(record, 201);
});

overtimeRouter.patch('/:id/approve', requirePermission('overtime.approve'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const oldRecord = await prisma.overtimeRecord.findUnique({ where: { id } });
  if (!oldRecord) return c.json({ error: 'Overtime record not found' }, 404);

  const record = await prisma.overtimeRecord.update({
    where: { id },
    data: {
      status: data.status === 'approved' ? 'APPROVED' : 'REJECTED',
      approvedBy: c.user!.userId,
      approvedAt: new Date(),
      approvalNotes: data.approvalNotes,
    },
  });

  await auditLog(c.user!.userId, 'APPROVE', 'overtime_record', id, oldRecord, record);

  return c.json(record);
});

overtimeRouter.delete('/:id', requirePermission('overtime.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const oldRecord = await prisma.overtimeRecord.findUnique({ where: { id } });
  if (!oldRecord) return c.json({ error: 'Overtime record not found' }, 404);

  if (oldRecord.status === 'PENDING') {
    await prisma.overtimeRecord.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  await auditLog(c.user!.userId, 'CANCEL', 'overtime_record', id, oldRecord, null);

  return c.json({ message: 'Overtime record cancelled' });
});

export default overtimeRouter;
