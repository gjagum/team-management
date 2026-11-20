import { prisma } from '../db.ts';

/**
 * Shared handler for a Slack `message` event (used by both the HTTP Events API
 * webhook and the Socket Mode client). Keeps clock-in/clock-out logic in one place.
 */
export async function handleSlackEvent(event: any): Promise<void> {
  if (!event || event.type !== 'message' || event.bot_id || !event.text) return;

  const text = String(event.text).toLowerCase().trim();
  const slackId = event.user;

  const employee = await prisma.employee.findUnique({
    where: { slackId },
    include: { user: true },
  });

  if (!employee) {
    // Silence failure if user not found
    return;
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isMorning = text.includes('good morning');
  const isEvening = text.includes('good evening');

  if (isMorning) {
    const existingLog = await prisma.timeLog.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });

    if (!existingLog || !existingLog.clockIn) {
      await prisma.timeLog.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: today } },
        update: { clockIn: now },
        create: {
          employeeId: employee.id,
          date: today,
          clockIn: now,
          source: 'SLACK',
        },
      });
      console.log(`[SLACK] ${employee.user.fullName} clocked in at ${now.toISOString()}`);
    }
  } else if (isEvening) {
    await prisma.timeLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
      update: { clockOut: now },
      create: {
        employeeId: employee.id,
        date: today,
        clockOut: now,
        source: 'SLACK',
      },
    });
    console.log(`[SLACK] ${employee.user.fullName} clocked out at ${now.toISOString()}`);
  }
}

/**
 * Handle Slack slash commands (/checkin, /checkout) delivered over Socket Mode.
 * Returns a human-readable reply sent back to the user.
 */
export async function handleSlackSlashCommand(payload: any): Promise<string> {
  const slackId = payload?.user_id;
  const command = String(payload?.command || '').toLowerCase().trim();

  const employee = await prisma.employee.findUnique({
    where: { slackId },
    include: { user: true },
  });

  if (!employee) {
    return 'You are not registered in the team management system.';
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (command === '/checkin') {
    const existingLog = await prisma.timeLog.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
    });

    if (existingLog?.clockIn) {
      return `You already checked in at ${existingLog.clockIn.toLocaleTimeString()}.`;
    }

    await prisma.timeLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
      update: { clockIn: now },
      create: {
        employeeId: employee.id,
        date: today,
        clockIn: now,
        source: 'SLACK',
      },
    });
    console.log(`[SLACK] ${employee.user.fullName} checked in at ${now.toISOString()}`);
    return `Checked in at ${now.toLocaleTimeString()}. Have a great day!`;
  }

  if (command === '/checkout') {
    await prisma.timeLog.upsert({
      where: { employeeId_date: { employeeId: employee.id, date: today } },
      update: { clockOut: now },
      create: {
        employeeId: employee.id,
        date: today,
        clockOut: now,
        source: 'SLACK',
      },
    });
    console.log(`[SLACK] ${employee.user.fullName} checked out at ${now.toISOString()}`);
    return `Checked out at ${now.toLocaleTimeString()}. See you tomorrow!`;
  }

  return `Unknown command: ${command}`;
}