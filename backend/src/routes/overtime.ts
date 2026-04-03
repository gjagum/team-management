import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const overtimeRouter = new Hono();

overtimeRouter.use('/*', authMiddleware);

// Helper: get employee record from the authenticated user's ID
async function getEmployeeByUserId(userId: number) {
  return prisma.employee.findUnique({ where: { userId } });
}

overtimeRouter.get('/', requirePermission('overtime.read'), async (c) => {
  const employee = await getEmployeeByUserId(c.user!.userId);

  // Admins and managers see all; employees only see their own
  const where = (c.user!.role === 'ADMIN' || c.user!.role === 'MANAGER')
    ? {}
    : { employeeId: employee?.id };

  const records = await prisma.overtimeRecord.findMany({
    where,
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
  const employee = await getEmployeeByUserId(c.user!.userId);
  if (!employee) return c.json({ error: 'No employee profile found' }, 400);

  const records = await prisma.overtimeRecord.findMany({
    where: { employeeId: employee.id },
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
  const employee = await getEmployeeByUserId(c.user!.userId);
  if (!employee) return c.json({ error: 'No employee profile found. Please ask an admin to activate your employee profile.' }, 400);

  const data = await c.req.json();
  
  if (!data.date || !data.startTime || !data.endTime) {
    return c.json({ error: 'Date, start time, and end time are required' }, 400);
  }

  const date = new Date(data.date);
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (isNaN(date.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    return c.json({ error: 'Invalid date or time format' }, 400);
  }

  if (endTime <= startTime) {
    return c.json({ error: 'End time must be after start time' }, 400);
  }

  const hours = parseFloat(((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

  // --- OVERLAP CHECK WITH SCHEDULE ---
  const schedule = await prisma.schedule.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: new Date(date.toISOString().split('T')[0]),
      },
    },
  });

  if (schedule) {
    // Convert schedule string times (HH:mm) to minutes for comparison
    const [shiftStartH, shiftStartM] = schedule.startTime.split(':').map(Number);
    const [shiftEndH, shiftEndM] = schedule.endTime.split(':').map(Number);
    const shiftStartTotal = shiftStartH * 60 + shiftStartM;
    const shiftEndTotal = shiftEndH * 60 + shiftEndM;

    // OT times to minutes (using the same local date)
    const otStartTotal = startTime.getHours() * 60 + startTime.getMinutes();
    const otEndTotal = endTime.getHours() * 60 + endTime.getMinutes();

    // Check for overlap [otStart, otEnd] vs [shiftStart, shiftEnd]
    const hasOverlap = (otStartTotal < shiftEndTotal && otEndTotal > shiftStartTotal);

    if (hasOverlap) {
      return c.json({ 
        error: `Overtime overlaps with your regular shift (${schedule.startTime} - ${schedule.endTime}).` 
      }, 400);
    }
  }
  // ------------------------------------

  const record = await prisma.overtimeRecord.create({
    data: {
      employeeId: employee.id,
      date,
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

  const employee = await getEmployeeByUserId(c.user!.userId);
  if (!employee) return c.json({ error: 'No employee profile found' }, 400);

  const oldRecord = await prisma.overtimeRecord.findUnique({ where: { id } });
  if (!oldRecord) return c.json({ error: 'Overtime record not found' }, 404);

  const record = await prisma.overtimeRecord.update({
    where: { id },
    data: {
      status: data.status === 'approved' ? 'APPROVED' : 'REJECTED',
      approvedBy: employee.id,
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
