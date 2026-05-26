import { Hono } from 'hono';
import { prisma } from '../index.ts';

const webhooksRouter = new Hono();

webhooksRouter.post('/slack', async (c) => {
  const body = await c.req.json();

  // 1. Slack URL verification challenge
  if (body.type === 'url_verification') {
    return c.json({ challenge: body.challenge });
  }

  // 2. Handle events
  if (body.type === 'event_callback' && body.event) {
    const event = body.event;
    
    // Check if it's a message event and not from a bot
    if (event.type === 'message' && !event.bot_id && event.text) {
      const text = event.text.toLowerCase().trim();
      const slackId = event.user;

      // Find employee by slackId
      const employee = await prisma.employee.findUnique({
        where: { slackId },
        include: { user: true }
      });

      if (!employee) {
        // Silence failure if user not found (don't want to leak info or cause errors for non-registered users)
        return c.json({ ok: true });
      }

      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Simple keyword matching
      const isMorning = text.includes('good morning');
      const isEvening = text.includes('good evening');

      if (isMorning) {
        // Clock In: Only set if not already set for today, or if we want the earliest
        const existingLog = await prisma.timeLog.findUnique({
          where: { employeeId_date: { employeeId: employee.id, date: today } }
        });

        if (!existingLog || !existingLog.clockIn) {
          await prisma.timeLog.upsert({
            where: { employeeId_date: { employeeId: employee.id, date: today } },
            update: { clockIn: now },
            create: {
              employeeId: employee.id,
              date: today,
              clockIn: now,
              source: 'SLACK'
            }
          });
          console.log(`[SLACK] ${employee.user.fullName} clocked in at ${now.toISOString()}`);
        }
      } else if (isEvening) {
        // Clock Out: Always update to the latest "good evening"
        await prisma.timeLog.upsert({
          where: { employeeId_date: { employeeId: employee.id, date: today } },
          update: { clockOut: now },
          create: {
            employeeId: employee.id,
            date: today,
            clockOut: now,
            source: 'SLACK'
          }
        });
        console.log(`[SLACK] ${employee.user.fullName} clocked out at ${now.toISOString()}`);
      }
    }
  }

  return c.json({ ok: true });
});

export default webhooksRouter;
