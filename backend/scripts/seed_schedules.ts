import pkg from 'npm:@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  console.log(`Found ${employees.length} employees`);

  for (const emp of employees) {
    console.log(`Setting defaults for ${emp.id}...`);
    // MON-FRI (1-5) 09:00 - 18:00
    for (let day = 1; day <= 5; day++) {
      await prisma.defaultSchedule.upsert({
        where: { employeeId_dayOfWeek: { employeeId: emp.id, dayOfWeek: day } },
        update: { startTime: '09:00', endTime: '18:00', isOff: false, shiftType: 'MORNING' },
        create: { employeeId: emp.id, dayOfWeek: day, startTime: '09:00', endTime: '18:00', isOff: false, shiftType: 'MORNING' },
      });
    }
  }

  // Now trigger auto-populate for April (4) 2026
  console.log("Auto-populating April 2026...");
  // I could call the API, but I'll replicate logic here
  for (const emp of employees) {
    const startDate = new Date(2026, 3, 1);
    const endDate = new Date(2026, 4, 0);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const date = new Date(d);
      const dayOfWeek = date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        await prisma.schedule.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: { startTime: '09:00', endTime: '18:00', shiftType: 'MORNING' },
          create: { employeeId: emp.id, date, startTime: '09:00', endTime: '18:00', shiftType: 'MORNING' },
        });
      }
    }
  }

  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
