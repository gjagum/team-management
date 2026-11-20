import { Hono } from 'hono';
import { handleSlackEvent } from '../services/slackEvents.ts';

const webhooksRouter = new Hono();

webhooksRouter.post('/slack', async (c) => {
  const body = await c.req.json();

  // 1. Slack URL verification challenge
  if (body.type === 'url_verification') {
    return c.json({ challenge: body.challenge });
  }

  // 2. Handle events
  if (body.type === 'event_callback' && body.event) {
    await handleSlackEvent(body.event);
  }

  return c.json({ ok: true });
});

export default webhooksRouter;