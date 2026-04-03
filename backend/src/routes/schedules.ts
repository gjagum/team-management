import { Hono } from 'hono';
import { authMiddleware, requirePermission, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const schedulesRouter = new Hono();

schedulesRouter.use('/*', authMiddleware);

// Get all schedules (with optional date range filter)
schedulesRouter.get('/', requirePermission('schedules.read'), async (c) => {
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const employeeId = c.req.query('employeeId');

  const where: Record<string, any> = {};

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  } else if (startDate) {
    where.date = { gte: new Date(startDate) };
  }

  // If user is an employee, they can only see their own schedule
  if (c.user!.role === 'EMPLOYEE') {
    const employee = await prisma.employee.findUnique({
      where: { userId: c.user!.userId }
    });
    if (employee) {
      where.employeeId = employee.id;
    } else {
      // If no employee profile, return empty
      return c.json([]);
    }
  } else if (employeeId) {
    where.employeeId = parseInt(employeeId);
  }

  const schedules = await prisma.schedule.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  return c.json(schedules);
});

// Get my schedule
schedulesRouter.get('/my-schedule', async (c) => {
  const user = (c as any).user;
  const employee = await prisma.employee.findUnique({
    where: { userId: user.userId }
  });

  if (!employee) {
    return c.json({ error: 'No employee profile found' }, 404);
  }

  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const where: any = { employeeId: employee.id };

  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: { date: 'asc' },
  });

  return c.json(schedules);
});

// ===================== DEFAULT SCHEDULES =====================

// Get default schedule for an employee
schedulesRouter.get('/defaults/:employeeId', requirePermission('schedules.read'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));
  const defaults = await prisma.defaultSchedule.findMany({
    where: { employeeId },
    orderBy: { dayOfWeek: 'asc' },
  });
  return c.json(defaults);
});

// Get all employees' default schedules
schedulesRouter.get('/defaults', requirePermission('schedules.read'), async (c) => {
  const defaults = await prisma.defaultSchedule.findMany({
    include: {
      employee: {
        include: {
          user: { select: { id: true, fullName: true } },
        },
      },
    },
    orderBy: [{ employeeId: 'asc' }, { dayOfWeek: 'asc' }],
  });
  return c.json(defaults);
});

// Set default schedule for an employee (bulk upsert all 7 days)
schedulesRouter.put('/defaults/:employeeId', requirePermission('schedules.update'), async (c) => {
  const employeeId = parseInt(c.req.param('employeeId'));
  const { days } = await c.req.json();

  // days: [{ dayOfWeek: 0, shiftType: 'MORNING', startTime: '06:00', endTime: '14:00', breakMinutes: 60, isOff: false }, ...]
  const results = await prisma.$transaction(
    days.map((day: any) =>
      prisma.defaultSchedule.upsert({
        where: {
          employeeId_dayOfWeek: {
            employeeId,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          shiftType: day.shiftType || 'MORNING',
          startTime: day.startTime,
          endTime: day.endTime,
          breakMinutes: day.breakMinutes ?? 60,
          isOff: day.isOff ?? false,
        },
        create: {
          employeeId,
          dayOfWeek: day.dayOfWeek,
          shiftType: day.shiftType || 'MORNING',
          startTime: day.startTime,
          endTime: day.endTime,
          breakMinutes: day.breakMinutes ?? 60,
          isOff: day.isOff ?? false,
        },
      })
    )
  );

  await auditLog((c as any).user.userId, 'UPDATE', 'default_schedule', employeeId, null, results);
  return c.json(results);
});

// Auto-populate month from defaults
schedulesRouter.post('/auto-populate', requirePermission('schedules.create'), async (c) => {
  const { employeeId, year, month, overwrite } = await c.req.json();

  // Get defaults for this employee
  const defaults = await prisma.defaultSchedule.findMany({
    where: { employeeId },
  });

  if (defaults.length === 0) {
    return c.json({ error: 'No default schedule configured for this employee' }, 400);
  }

  // Build a map: dayOfWeek -> default
  const defaultMap = new Map(defaults.map((d) => [d.dayOfWeek, d]));

  // Get all dates in the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month
  const dates: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  const operations: any[] = [];

  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const def = defaultMap.get(dayOfWeek);

    if (!def || def.isOff) {
      // If overwrite mode and day is off, delete any existing schedule
      if (overwrite) {
        operations.push(
          prisma.schedule.deleteMany({
            where: { employeeId, date },
          })
        );
      }
      continue;
    }

    const scheduleData = {
      shiftType: def.shiftType,
      startTime: def.startTime,
      endTime: def.endTime,
      breakMinutes: def.breakMinutes,
    };

    operations.push(
      prisma.schedule.upsert({
        where: {
          employeeId_date: { employeeId, date },
        },
        update: overwrite ? scheduleData : {},
        create: { employeeId, date, ...scheduleData },
      })
    );
  }

  await prisma.$transaction(operations);

  await auditLog((c as any).user.userId, overwrite ? 'UPDATE' : 'CREATE', 'schedule_auto_populate', employeeId, null, { month, year, overwrite });
  return c.json({ populated: operations.length, overwrite: !!overwrite });
});

// Auto-populate month for ALL employees
schedulesRouter.post('/auto-populate-all', requirePermission('schedules.create'), async (c) => {
  const { year, month, overwrite } = await c.req.json();

  // Get all employees with default schedules
  const employees = await prisma.employee.findMany({
    where: { defaultSchedules: { some: {} } },
    include: { defaultSchedules: true },
  });

  let totalOps = 0;

  for (const emp of employees) {
    const defaultMap = new Map(emp.defaultSchedules.map((d) => [d.dayOfWeek, d]));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const dates: Date[] = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    const operations: any[] = [];
    for (const date of dates) {
      const def = defaultMap.get(date.getDay());
      if (!def || def.isOff) {
        if (overwrite) {
          operations.push(prisma.schedule.deleteMany({ where: { employeeId: emp.id, date } }));
        }
        continue;
      }
      const scheduleData = {
        shiftType: def.shiftType,
        startTime: def.startTime,
        endTime: def.endTime,
        breakMinutes: def.breakMinutes,
      };
      operations.push(
        prisma.schedule.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: overwrite ? scheduleData : {},
          create: { employeeId: emp.id, date, ...scheduleData },
        })
      );
    }

    await prisma.$transaction(operations);
    totalOps += operations.length;
  }

  await auditLog((c as any).user.userId, overwrite ? 'UPDATE' : 'CREATE', 'schedule_auto_populate_all', null, null, { month, year, count: totalOps, overwrite });
  return c.json({ populated: totalOps, overwrite: !!overwrite });
});

// ===================== CRUD =====================

// Create schedule
schedulesRouter.post('/', requirePermission('schedules.create'), async (c) => {
  const data = await c.req.json();

  const schedule = await prisma.schedule.create({
    data: {
      employeeId: data.employeeId,
      date: new Date(data.date),
      shiftType: data.shiftType || 'MORNING',
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes ?? 60,
      notes: data.notes,
    },
    include: {
      employee: {
        include: {
          user: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  await auditLog((c as any).user.userId, 'CREATE', 'schedule', schedule.id, null, schedule);
  return c.json(schedule, 201);
});

// Update schedule
schedulesRouter.put('/:id', requirePermission('schedules.update'), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();

  const old = await prisma.schedule.findUnique({ where: { id } });
  if (!old) return c.json({ error: 'Schedule not found' }, 404);

  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      shiftType: data.shiftType,
      startTime: data.startTime,
      endTime: data.endTime,
      breakMinutes: data.breakMinutes,
      notes: data.notes,
    },
    include: {
      employee: {
        include: {
          user: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  await auditLog((c as any).user.userId, 'UPDATE', 'schedule', id, old, schedule);
  return c.json(schedule);
});

// Delete schedule
schedulesRouter.delete('/:id', requirePermission('schedules.delete'), async (c) => {
  const id = parseInt(c.req.param('id'));

  const old = await prisma.schedule.findUnique({ where: { id } });
  if (!old) return c.json({ error: 'Schedule not found' }, 404);

  await prisma.schedule.delete({ where: { id } });
  await auditLog((c as any).user.userId, 'DELETE', 'schedule', id, old, null);

  return c.json({ message: 'Schedule deleted' });
});

export default schedulesRouter;
