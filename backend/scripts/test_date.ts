import pkg from 'npm:@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  const employee = await prisma.employee.findFirst({
    where: { user: { email: 'lastweek@test.com' } }
  });
  if (!employee) return console.log("No employee");

  const results = await prisma.schedule.findMany({
    where: { employeeId: employee.id },
    take: 5,
    orderBy: { date: 'asc' }
  });

  console.log(JSON.stringify(results, null, 2));
}

main().finally(() => prisma.$disconnect());
