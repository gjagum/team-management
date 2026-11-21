/**
 * Add any RBAC permissions and role grants from prisma/permissions.ts that are
 * missing in the database. Additive only: never removes or changes existing rows,
 * and never touches users. Safe to run repeatedly, including against production:
 *
 *   bun run permissions:sync                       # uses DATABASE_URL from .env
 *   DATABASE_URL="postgres://..." bun run permissions:sync
 */
import { PrismaClient } from '@prisma/client';
import { permissions, rolePermissions } from '../prisma/permissions.ts';

const prisma = new PrismaClient();

async function main() {
  const existing = new Set((await prisma.permission.findMany({ select: { name: true } })).map((p) => p.name));
  const created = permissions.filter((p) => !existing.has(p.name));
  for (const p of created) await prisma.permission.create({ data: p });

  const all = await prisma.permission.findMany();
  const byName = new Map(all.map((p) => [p.name, p.id]));
  const grants: Record<string, string[]> = { ADMIN: all.map((p) => p.name), ...rolePermissions };

  const granted: string[] = [];
  for (const [role, names] of Object.entries(grants)) {
    const have = new Set(
      (await prisma.rolePermission.findMany({ where: { role: role as any }, select: { permissionId: true } })).map(
        (r) => r.permissionId,
      ),
    );
    for (const name of names) {
      const id = byName.get(name);
      if (!id || have.has(id)) continue;
      await prisma.rolePermission.create({ data: { role: role as any, permissionId: id } });
      granted.push(`${role} <- ${name}`);
    }
  }

  console.log(`Created ${created.length} permission(s)${created.length ? ': ' + created.map((p) => p.name).join(', ') : ''}`);
  console.log(`Granted ${granted.length} role permission(s)${granted.length ? ':\n  ' + granted.join('\n  ') : ''}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
