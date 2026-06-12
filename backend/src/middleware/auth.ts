import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { prisma } from '../index.ts';

export interface AuthContext extends Context {
  user?: {
    userId: number;
    email: string;
    role: 'ADMIN' | 'MANAGER' | 'TEAM_LEADER' | 'EMPLOYEE';
  };
}

export async function authMiddleware(c: AuthContext, next: Next) {
  const token = c.req.header('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.json({ error: 'No token provided' }, 401);
  }

  try {
    const decoded = jwt.verify(token, Deno.env.get('JWT_SECRET') || 'your-secret-key') as any;
    
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    c.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    await next();
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

export function requirePermission(requiredPermission: string) {
  return async (c: AuthContext, next: Next) => {
    if (!c.user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: c.user.role },
      include: { permission: true },
    });

    const hasPermission = rolePermissions.some(
      (rp) => rp.permission.name === requiredPermission
    );

    if (!hasPermission) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    await next();
  };
}

export function requireRole(...roles: ('ADMIN' | 'MANAGER' | 'TEAM_LEADER' | 'EMPLOYEE')[]) {
  return async (c: AuthContext, next: Next) => {
    if (!c.user || !roles.includes(c.user.role)) {
      return c.json({ error: 'Unauthorized - insufficient role' }, 403);
    }
    await next();
  };
}

export async function auditLog(
  userId: number,
  action: string,
  entityType: string,
  entityId: number | null,
  oldValues: any = null,
  newValues: any = null
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? JSON.parse(JSON.stringify(oldValues)) : null,
      newValues: newValues ? JSON.parse(JSON.stringify(newValues)) : null,
    },
  });
}

