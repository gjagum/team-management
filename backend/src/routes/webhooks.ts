import { Hono } from 'hono';
import { handleSlackEvent, handleSlackSlashCommand } from '../services/slackEvents.ts';
import { verifySlackSignature } from '../services/slackVerify.ts';

const webhooksRouter = new Hono();

/** Returns the raw body if the Slack signature is valid, or a Response to send back otherwise. */
async function readVerifiedBody(c: any, required: boolean): Promise<string | Response> {
  const raw = await c.req.text();
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    if (required) {
      console.error('[SLACK] SLACK_SIGNING_SECRET is not set; rejecting request');
      return c.json({ error: 'Slack signing secret not configured' }, 500);
    }
    console.warn('[SLACK] SLACK_SIGNING_SECRET is not set; skipping signature check');
    return raw;
  }
  const ok = await verifySlackSignature(
    secret,
    raw,
    c.req.header('x-slack-request-timestamp'),
    c.req.header('x-slack-signature'),
  );
  if (!ok) {
    console.warn('[SLACK] invalid request signature');
    return c.json({ error: 'invalid signature' }, 401);
  }
  return raw;
}

// Events API (HTTP mode)
webhooksRouter.post('/slack', async (c) => {
  const raw = await readVerifiedBody(c, false);
  if (raw instanceof Response) return raw;
  const body = JSON.parse(raw || '{}');

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

// Slash commands (/checkin, /checkout) over HTTP. Set this URL as the Request URL
// for each command in the Slack app config (Socket Mode must be OFF for HTTP delivery).
webhooksRouter.post('/slack/commands', async (c) => {
  const raw = await readVerifiedBody(c, true);
  if (raw instanceof Response) return raw;

  const payload = Object.fromEntries(new URLSearchParams(raw));
  console.log('[SLACK] slash command received:', payload.command, 'from', payload.user_id);

  let text = 'Something went wrong. Please try again.';
  try {
    text = await handleSlackSlashCommand(payload);
  } catch (err) {
    console.error('[SLACK] slash command handling error:', err);
  }
  // Slack requires a reply within 3s; replying inline avoids needing response_url.
  return c.json({ response_type: 'ephemeral', text });
});

export default webhooksRouter;
