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

export interface SlashReply {
  text: string;
  /** true = post in the channel; false = only the invoking user sees it */
  inChannel: boolean;
}

/** Slack date token: renders in each viewer's own timezone. */
function slackTime(d: Date): string {
  return `<!date^${Math.floor(d.getTime() / 1000)}^{time}|${d.toISOString().slice(11, 16)} UTC>`;
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Handle Slack slash commands (/checkin, /checkout), over HTTP or Socket Mode.
 * Successful check-ins/outs are posted in the channel; errors are private.
 */
export async function handleSlackSlashCommand(payload: any): Promise<SlashReply> {
  const slackId = payload?.user_id;
  const command = String(payload?.command || '').toLowerCase().trim();
  const privately = (text: string): SlashReply => ({ text, inChannel: false });

  const employee = await prisma.employee.findUnique({
    where: { slackId },
    include: { user: true },
  });

  if (!employee) {
    return privately(
      ":warning: Your Slack account isn't linked to an employee profile yet. Ask an admin to add your Slack ID in Team Management.",
    );
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const key = { employeeId_date: { employeeId: employee.id, date: today } };

  if (command === '/checkin') {
    const existingLog = await prisma.timeLog.findUnique({ where: key });
    if (existingLog?.clockIn) {
      return privately(`You already checked in today at ${slackTime(existingLog.clockIn)}.`);
    }

    await prisma.timeLog.upsert({
      where: key,
      update: { clockIn: now },
      create: { employeeId: employee.id, date: today, clockIn: now, source: 'SLACK' },
    });
    console.log(`[SLACK] ${employee.user.fullName} checked in at ${now.toISOString()}`);
    return { text: `Hi <@${slackId}>, have a great day!`, inChannel: true };
  }

  if (command === '/checkout') {
    const log = await prisma.timeLog.upsert({
      where: key,
      update: { clockOut: now },
      create: { employeeId: employee.id, date: today, clockOut: now, source: 'SLACK' },
    });
    console.log(`[SLACK] ${employee.user.fullName} checked out at ${now.toISOString()}`);
    const worked = log.clockIn ? ` · worked ${formatDuration(now.getTime() - log.clockIn.getTime())}` : '';
    return { text: `:house: <@${slackId}> checked out at ${slackTime(now)}${worked}`, inChannel: true };
  }

  return privately(`Unknown command: ${command}`);
}
