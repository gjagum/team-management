import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth.ts';
import { prisma } from '../db.ts';

const dashboardRouter = new Hono();
dashboardRouter.use('/*', authMiddleware);

const LEAVE_ENTITIES = ['leave_request', 'leave_balance'];
const OVERTIME_ENTITIES = ['overtime_record'];
const PEOPLE_ENTITIES = ['user', 'employee'];

function categoryOf(entityType: string): 'leave' | 'overtime' | 'employees' | 'system' {
  if (LEAVE_ENTITIES.includes(entityType)) return 'leave';
  if (OVERTIME_ENTITIES.includes(entityType)) return 'overtime';
  if (PEOPLE_ENTITIES.includes(entityType)) return 'employees';
  return 'system';
}

function summaryOf(action: string, entityType: string): string {
  const verb: Record<string, string> = {
    CREATE: 'created',
    UPDATE: 'updated',
    DELETE: 'deleted',
    APPROVE: 'approved',
    REJECT: 'declined',
    CANCEL: 'cancelled',
    GENERATE: 'generated',
    LOGIN: 'signed in',
  };
  const noun: Record<string, string> = {
    leave_request: 'a leave request',
    leave_balance: 'leave balances',
    overtime_record: 'an overtime record',
    user: 'a user account',
    employee: 'an employee profile',
    timesheet: 'a timesheet',
  };
  const v = verb[action] || action.toLowerCase();
  const n = noun[entityType] || entityType.replace(/_/g, ' ');
  return `${v.charAt(0).toUpperCase() + v.slice(1)} ${n}`;
}

/** Headline numbers for the admin dashboard. */
dashboardRouter.get('/stats', requireRole('ADMIN', 'MANAGER'), async (c) => {
  const now = new Date();
  const year = now.getFullYear();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfMonth = new Date(year, now.getMonth(), 1);
  const startOfNextMonth = new Date(year, now.getMonth() + 1, 1);

  const [activeEmployees, onLeaveRows, pendingLeaves, pendingOvertime, balances, monthOvertime] =
    await Promise.all([
      prisma.employee.count({ where: { user: { isActive: true } } }),
      prisma.leaveRequest.findMany({
        where: { status: 'APPROVED', startDate: { lte: endOfDay }, endDate: { gte: startOfDay } },
        select: { employeeId: true },
      }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.overtimeRecord.count({ where: { status: 'PENDING' } }),
      prisma.leaveBalance.findMany({ where: { year }, select: { totalLeaves: true, usedLeaves: true } }),
      prisma.overtimeRecord.findMany({
        where: { status: 'APPROVED', date: { gte: startOfMonth, lt: startOfNextMonth } },
        select: { hours: true },
      }),
    ]);

  const onLeaveToday = new Set(onLeaveRows.map((r) => r.employeeId)).size;

  const used = balances.reduce((sum, b) => sum + Number(b.usedLeaves), 0);
  const total = balances.reduce((sum, b) => sum + Number(b.totalLeaves), 0);
  const overtimeHours = monthOvertime.reduce((sum, r) => sum + Number(r.hours), 0);

  return c.json({
    activeEmployees,
    onLeaveToday,
    pendingLeaves,
    leaveUtilization: {
      used,
      total,
      percent: total > 0 ? Math.round((used / total) * 100) : 0,
    },
    pendingOvertime,
    overtimeThisMonth: {
      hours: Math.round(overtimeHours * 100) / 100,
      average: activeEmployees > 0 ? Math.round((overtimeHours / activeEmployees) * 100) / 100 : 0,
    },
  });
});

/** Recent activity feed built from the audit log. */
dashboardRouter.get('/activity', requireRole('ADMIN', 'MANAGER'), async (c) => {
  const category = (c.req.query('category') || 'all').toLowerCase();
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('pageSize') || '10', 10) || 10));

  const where =
    category === 'leave'
      ? { entityType: { in: LEAVE_ENTITIES } }
      : category === 'overtime'
        ? { entityType: { in: OVERTIME_ENTITIES } }
        : category === 'employees'
          ? { entityType: { in: PEOPLE_ENTITIES } }
          : category === 'system'
            ? { entityType: { notIn: [...LEAVE_ENTITIES, ...OVERTIME_ENTITIES, ...PEOPLE_ENTITIES] } }
            : {};

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return c.json({
    total,
    page,
    pageSize,
    items: rows.map((row) => ({
      id: row.id,
      at: row.createdAt,
      actor: row.user.fullName,
      actorEmail: row.user.email,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      category: categoryOf(row.entityType),
      summary: summaryOf(row.action, row.entityType),
    })),
  });
});

export default dashboardRouter;
