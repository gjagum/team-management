import { handleSlackEvent, handleSlackSlashCommand } from './slackEvents.ts';

const APP_TOKEN = process.env.SLACK_APP_TOKEN;
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const RECONNECT_DELAY_MS = 5000;

let socket: any = null;
let reconnectTimer: any = null;
let stopped = false;

async function openConnectionUrl(): Promise<string | null> {
  if (!APP_TOKEN) return null;
  try {
    const res = await fetch('https://slack.com/api/apps.connections.open', {
      method: 'POST',
      headers: { Authorization: `Bearer ${APP_TOKEN}` },
    });
    const data: any = await res.json();
    if (!data?.ok || !data.url) {
      console.error('[SLACK] apps.connections.open failed:', data?.error || data);
      return null;
    }
    return data.url as string;
  } catch (err) {
    console.error('[SLACK] apps.connections.open error:', err);
    return null;
  }
}

async function connect(): Promise<void> {
  if (stopped) return;
  const url = await openConnectionUrl();
  if (!url) {
    scheduleReconnect();
    return;
  }

  try {
    socket = new WebSocket(url);
  } catch (err) {
    console.error('[SLACK] WebSocket constructor error:', err);
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    console.log('[SLACK] Socket Mode connected');
  };

  socket.onmessage = async (ev: any) => {
    let envelope: any;
    try {
      envelope = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    } catch {
      return;
    }

    if (envelope?.type === 'hello') return;
    if (envelope?.type === 'disconnect') {
      try {
        socket?.close();
      } catch {}
      return;
    }

    // Acknowledge the envelope so Slack doesn't retry.
    if (envelope?.envelope_id) {
      try {
        socket?.send(JSON.stringify({ envelope_id: envelope.envelope_id }));
      } catch {}
    }

    const payload = envelope?.payload;
    if (payload?.event) {
      try {
        await handleSlackEvent(payload.event);
      } catch (err) {
        console.error('[SLACK] event handling error:', err);
      }
    } else if (envelope?.type === 'slash_commands' && payload) {
      try {
        const reply = await handleSlackSlashCommand(payload);
        if (payload.response_url) {
          await fetch(payload.response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: reply, response_type: 'ephemeral' }),
          });
        }
      } catch (err) {
        console.error('[SLACK] slash command handling error:', err);
      }
    }
  };

  socket.onclose = () => {
    socket = null;
    if (!stopped) scheduleReconnect();
  };

  socket.onerror = (err: any) => {
    console.error('[SLACK] socket error:', err?.message || err);
  };
}

function scheduleReconnect(): void {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

export async function startSlackSocket(): Promise<void> {
  if (!APP_TOKEN) {
    console.log('[SLACK] SLACK_APP_TOKEN not set; Socket Mode disabled');
    return;
  }

  const botToken = BOT_TOKEN;
  if (botToken) {
    try {
      const res = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${botToken}` },
      });
      const data: any = await res.json();
      if (data?.ok) {
        console.log(`[SLACK] Bot authenticated as ${data.user} (${data.team})`);
      } else {
        console.warn('[SLACK] SLACK_BOT_TOKEN auth.test failed:', data?.error);
      }
    } catch (err) {
      console.warn('[SLACK] SLACK_BOT_TOKEN validation error:', err);
    }
  } else {
    console.warn('[SLACK] SLACK_BOT_TOKEN not set; outbound Slack API calls disabled');
  }

  stopped = false;
  connect();
}

export function stopSlackSocket(): void {
  stopped = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  try {
    socket?.close();
  } catch {}
  socket = null;
}