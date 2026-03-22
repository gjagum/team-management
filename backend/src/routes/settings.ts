import { Hono } from 'hono';
import { authMiddleware, requireRole, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const settingsRouter = new Hono();

settingsRouter.use('/*', authMiddleware);

// Get all settings (any authenticated user can read)
settingsRouter.get('/', async (c) => {
  const settings = await (prisma as any).appSettings.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });
  return c.json(settings);
});

// Get settings by category
settingsRouter.get('/category/:category', async (c) => {
  const category = c.req.param('category');
  const settings = await (prisma as any).appSettings.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  });
  return c.json(settings);
});

// Get a single setting by key
settingsRouter.get('/key/:key', async (c) => {
  const key = c.req.param('key');
  const setting = await (prisma as any).appSettings.findUnique({
    where: { key },
  });
  if (!setting) return c.json({ error: 'Setting not found' }, 404);
  return c.json(setting);
});

// Bulk update settings (admin only)
settingsRouter.put('/', requireRole('ADMIN'), async (c) => {
  const { settings } = await c.req.json();
  // settings: [{ key: 'leave.annual_allowance', value: '15' }, ...]

  const results = await (prisma as any).$transaction(
    settings.map((s: { key: string; value: string }) =>
      (prisma as any).appSettings.update({
        where: { key: s.key },
        data: { value: s.value },
      })
    )
  );

  await auditLog(
    (c as any).user.userId,
    'UPDATE',
    'app_settings',
    null,
    null,
    { updated: settings.map((s: any) => s.key) }
  );

  return c.json(results);
});

// Update a single setting (admin only)
settingsRouter.put('/key/:key', requireRole('ADMIN'), async (c) => {
  const key = c.req.param('key');
  const { value } = await c.req.json();

  const old = await (prisma as any).appSettings.findUnique({ where: { key } });
  if (!old) return c.json({ error: 'Setting not found' }, 404);

  const setting = await (prisma as any).appSettings.update({
    where: { key },
    data: { value: String(value) },
  });

  await auditLog(
    (c as any).user.userId,
    'UPDATE',
    'app_settings',
    setting.id,
    { key, value: old.value },
    { key, value: setting.value }
  );

  return c.json(setting);
});

export default settingsRouter;
