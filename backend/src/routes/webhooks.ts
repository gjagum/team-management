import { Hono } from 'hono';
import { handleSlackEvent, handleSlackSlashCommand, type SlashReply } from '../services/slackEvents.ts';
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

  // Slack times out after 3s, and a cold DB connection can exceed that. Ack now
  // (empty 200 = no visible message) and post the result to response_url.
  const work = (async () => {
    let reply: SlashReply = { text: 'Something went wrong. Please try again.', inChannel: false };
    try {
      reply = await handleSlackSlashCommand(payload);
    } catch (err) {
      console.error('[SLACK] slash command handling error:', err);
    }
    if (!payload.response_url) {
      console.warn('[SLACK] no response_url in slash command payload');
      return;
    }
    try {
      const resp = await fetch(payload.response_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_type: reply.inChannel ? 'in_channel' : 'ephemeral', text: reply.text }),
      });
      console.log('[SLACK] reply sent:', resp.status, reply.inChannel ? '(in_channel)' : '(ephemeral)', '-', reply.text);
    } catch (err) {
      console.error('[SLACK] response_url post error:', err);
    }
  })();

  try {
    c.executionCtx.waitUntil(work); // Cloudflare Workers
  } catch {
    // Bun has no ExecutionContext; the promise keeps running on its own.
  }
  return c.body(null, 200);
});

export default webhooksRouter;
