import pkg from 'npm:@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.permission.findFirst({
    where: { name: 'schedules.read' }
  });
  if (!p) {
    console.error("Permission 'schedules.read' not found");
    return;
  }
  await prisma.rolePermission.upsert({
    where: {
      role_permissionId: {
        role: 'EMPLOYEE',
        permissionId: p.id,
      },
    },
    update: {},
    create: {
      role: 'EMPLOYEE',
      permissionId: p.id,
    },
  });
  console.log('Permission schedules.read granted to EMPLOYEE role');
}

main().finally(() => prisma.$disconnect());
