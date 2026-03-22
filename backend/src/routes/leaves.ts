import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const leavesRouter = new Hono();

leavesRouter.use('/*', authMiddleware);

leavesRouter.get('/', requirePermission('leaves.read'), async (c) => {
  const leaves = await prisma.leaveRequest.findMany({
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
  return c.json(leaves);
});

leavesRouter.get('/my-requests', requirePermission('leaves.read'), async (c) => {
  const leaves = await prisma.leaveRequest.findMany({
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
  return c.json(leaves);
});

leavesRouter.get('/balance', requirePermission('leaves.read'), async (c) => {
  const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_year: {
        employeeId: c.user!.userId,
        year,
      },
    },
  });
  if (balance) {
    return c.json({
      ...balance,
      availableLeaves: balance.totalLeaves - balance.usedLeaves,
    });
  }
  return c.json({ totalLeaves: 2, usedLeaves: 0, availableLeaves: 2 });
});

leavesRouter.post('/', requirePermission('leaves.create'), async (c) => {
  const data = await c.req.json();
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      employeeId: c.user!.userId,
      leaveType: data.leaveType,
      startDate,
      endDate,
      days,
      reason: data.reason,
      status: 'PENDING',
    },
  });

  await auditLog(c.user!.userId, 'CREATE', 'leave_request', leaveRequest.id, null, leaveRequest);

  return c.json(leaveRequest, 201);
});

leavesRouter.patch('/:id/approve', requirePermission('leaves.approve'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const oldLeave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!oldLeave) return c.json({ error: 'Leave request not found' }, 404);

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: data.status === 'approved' ? 'APPROVED' : 'REJECTED',
      reviewedBy: c.user!.userId,
      reviewedAt: new Date(),
      reviewNotes: data.reviewNotes,
    },
  });

  if (data.status === 'approved') {
    await prisma.leaveBalance.update({
      where: {
        employeeId_year: {
          employeeId: leave.employeeId,
          year: new Date(leave.startDate).getFullYear(),
        },
      },
      data: {
        usedLeaves: { increment: leave.days },
      },
    });
  }

  await auditLog(c.user!.userId, 'APPROVE', 'leave_request', id, oldLeave, leave);

  return c.json(leave);
});

leavesRouter.delete('/:id', requirePermission('leaves.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const oldLeave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!oldLeave) return c.json({ error: 'Leave request not found' }, 404);

  if (oldLeave.status === 'PENDING') {
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  await auditLog(c.user!.userId, 'CANCEL', 'leave_request', id, oldLeave, null);

  return c.json({ message: 'Leave request cancelled' });
});

export default leavesRouter;
