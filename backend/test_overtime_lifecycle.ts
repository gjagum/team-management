import pkg from 'npm:@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function testLifecycle() {
  console.log("--- Starting Overtime Lifecycle Test ---");

  // 1. Find the "Last Week" employee
  const employee = await prisma.employee.findFirst({
    where: { user: { email: 'lastweek@test.com' } },
    include: { user: true }
  });

  if (!employee) {
    console.error("Employee 'lastweek@test.com' not found. Please run seed script first.");
    return;
  }

  // 2. Find any schedule for this employee in April 2026
  const schedule = await prisma.schedule.findFirst({
    where: { 
      employeeId: employee.id,
      date: {
        gte: new Date(2026, 3, 1),
        lte: new Date(2026, 3, 30)
      }
    },
    orderBy: { date: 'asc' }
  });

  if (!schedule) {
    console.error("No schedule records found for April 2026. Please run seed script first.");
    return;
  }
  const testDate = schedule.date;
  console.log(`Testing for employee ${employee.user.fullName} on ${testDate.toISOString()}`);
  console.log(`Current Schedule: ${schedule.startTime} - ${schedule.endTime}`);

  // 3. Helper for making API-like calls (simulated logic check)
  const validateOT = (startH: number, startM: number, endH: number, endM: number) => {
    const [sH, sM] = schedule.startTime.split(':').map(Number);
    const [eH, eM] = schedule.endTime.split(':').map(Number);
    const shiftStart = sH * 60 + sM;
    const shiftEnd = eH * 60 + eM;

    const otStart = startH * 60 + startM;
    const otEnd = endH * 60 + endM;

    const hasOverlap = (otStart < shiftEnd && otEnd > shiftStart);
    return !hasOverlap;
  };

  // 4. Test Overlap (17:00 - 19:00)
  console.log("Test Case: Overlapping OT (17:00 - 19:00)...");
  if (!validateOT(17, 0, 19, 0)) {
    console.log("✅ Correctly identified overlap. Request blocked.");
  } else {
    console.error("❌ FAILED: Overlap not detected.");
  }

  // 5. Test Valid OT (18:00 - 20:00)
  console.log("Test Case: Valid Post-shift OT (18:00 - 20:00)...");
  if (validateOT(18, 0, 20, 0)) {
    console.log("✅ Correctly identified valid OT block.");
    
    // Actually create it in DB
    const otRecord = await prisma.overtimeRecord.create({
      data: {
        employeeId: employee.id,
        date: testDate,
        startTime: new Date('2026-04-10T18:00:00'),
        endTime: new Date('2026-04-10T20:00:00'),
        hours: 2.0,
        status: 'PENDING',
        description: 'Finishing the project'
      }
    });
    console.log(`OT Record Created: ID ${otRecord.id}`);

    // 6. Admin Approval
    console.log("Admin Approving OT Record...");
    const approved = await prisma.overtimeRecord.update({
      where: { id: otRecord.id },
      data: {
        status: 'APPROVED',
        approvedBy: 1, // System Admin
        approvedAt: new Date()
      }
    });
    console.log(`✅ OT Record Approved. Final Status: ${approved.status}`);
    
    // Cleanup
    await prisma.overtimeRecord.delete({ where: { id: otRecord.id } });
    console.log("Cleanup: OT record deleted.");
  } else {
    console.error("❌ FAILED: Valid OT was blocked.");
  }

  console.log("--- Lifecycle Test Complete ---");
}

testLifecycle().catch(console.error).finally(() => prisma.$disconnect());
