import { Hono } from 'hono';
import { authMiddleware, requireRole, auditLog } from '../middleware/auth.ts';
import { prisma } from '../index.ts';

const rbacRouter = new Hono();

rbacRouter.use('/*', authMiddleware);
rbacRouter.use('/*', requireRole('ADMIN'));

// ===================== PERMISSIONS =====================

rbacRouter.get('/permissions', async (c) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });
  return c.json(permissions);
});

rbacRouter.post('/permissions', async (c) => {
  const data = await c.req.json();

  if (!data.name || !data.resource || !data.action) {
    return c.json({ error: 'name, resource, and action are required' }, 400);
  }

  const permission = await prisma.permission.create({
    data: {
      name: data.name,
      description: data.description || null,
      resource: data.resource,
      action: data.action,
    },
  });

  await auditLog((c as any).user.userId, 'CREATE', 'permission', permission.id, null, permission);
  return c.json(permission, 201);
});

rbacRouter.delete('/permissions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const old = await prisma.permission.findUnique({ where: { id } });
  if (!old) return c.json({ error: 'Permission not found' }, 404);

  await prisma.permission.delete({ where: { id } });
  await auditLog((c as any).user.userId, 'DELETE', 'permission', id, old, null);
  return c.json({ message: 'Permission deleted' });
});

// ===================== ROLE PERMISSIONS =====================

rbacRouter.get('/role-permissions', async (c) => {
  const rolePermissions = await prisma.rolePermission.findMany({
    include: { permission: true },
    orderBy: [{ role: 'asc' }, { permission: { resource: 'asc' } }],
  });
  return c.json(rolePermissions);
});

rbacRouter.post('/role-permissions', async (c) => {
  const data = await c.req.json();

  if (!data.role || !data.permissionId) {
    return c.json({ error: 'role and permissionId are required' }, 400);
  }

  try {
    const rolePermission = await prisma.rolePermission.create({
      data: {
        role: data.role,
        permissionId: data.permissionId,
      },
      include: { permission: true },
    });

    await auditLog((c as any).user.userId, 'CREATE', 'role_permission', rolePermission.id, null, rolePermission);
    return c.json(rolePermission, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return c.json({ error: 'This permission is already assigned to this role' }, 400);
    }
    return c.json({ error: 'Failed to assign permission' }, 500);
  }
});

rbacRouter.delete('/role-permissions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  const old = await prisma.rolePermission.findUnique({
    where: { id },
    include: { permission: true },
  });
  if (!old) return c.json({ error: 'Role permission not found' }, 404);

  await prisma.rolePermission.delete({ where: { id } });
  await auditLog((c as any).user.userId, 'DELETE', 'role_permission', id, old, null);
  return c.json({ message: 'Permission removed from role' });
});

// ===================== ROLE SUMMARY =====================

rbacRouter.get('/roles/summary', async (c) => {
  const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
  const permissions = await prisma.permission.findMany({ orderBy: { resource: 'asc' } });
  const rolePermissions = await prisma.rolePermission.findMany({
    include: { permission: true },
  });

  const summary = roles.map((role) => {
    const rolePerms = rolePermissions.filter((rp) => rp.role === role);
    return {
      role,
      permissions: rolePerms.map((rp) => ({
        id: rp.id,
        permissionId: rp.permissionId,
        name: rp.permission.name,
        resource: rp.permission.resource,
        action: rp.permission.action,
      })),
    };
  });

  return c.json({ roles: summary, allPermissions: permissions });
});

export default rbacRouter;
