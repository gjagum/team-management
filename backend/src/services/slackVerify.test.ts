import { expect, test } from 'bun:test';
import { createHmac } from 'node:crypto';
import { verifySlackSignature } from './slackVerify.ts';

const secret = 'test-secret';
const body = 'command=%2Fcheckin&user_id=U123';
const ts = '1700000000';
const sig = 'v0=' + createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex');

test('accepts a valid signature', async () => {
  expect(await verifySlackSignature(secret, body, ts, sig, 1700000010)).toBe(true);
});
test('rejects a tampered body', async () => {
  expect(await verifySlackSignature(secret, body + 'x', ts, sig, 1700000010)).toBe(false);
});
test('rejects stale timestamps', async () => {
  expect(await verifySlackSignature(secret, body, ts, sig, 1700001000)).toBe(false);
});
test('rejects missing headers', async () => {
  expect(await verifySlackSignature(secret, body, undefined, sig)).toBe(false);
});
