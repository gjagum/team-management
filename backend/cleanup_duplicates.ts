import { PrismaClient } from "npm:@prisma/client";
const prisma = new PrismaClient();

async function cleanup() {
  const employeeId = 3; // employee@team.com
  const dateStr = "2026-04-03";
  
  const leaves = await prisma.leaveRequest.findMany({
    where: { 
      employeeId, 
      startDate: new Date(dateStr) 
    },
    orderBy: { createdAt: 'desc' }
  });

  if (leaves.length > 1) {
    console.log(`Found ${leaves.length} requests for ${dateStr}. Removing duplicates...`);
    // Keep the first one and delete others
    const toDelete = leaves.slice(1);
    for (const l of toDelete) {
      if (l.status === 'APPROVED') {
        // Correct the balance
        const year = new Date(l.startDate).getFullYear();
        await prisma.leaveBalance.update({
          where: { employeeId_year: { employeeId, year } },
          data: { usedLeaves: { decrement: l.days } }
        });
      }
      await prisma.leaveRequest.delete({ where: { id: l.id } });
      console.log(`Deleted leaf request ID ${l.id} and corrected balance.`);
    }
  } else {
    console.log("No duplicates found for that date.");
  }
  
  await prisma.$disconnect();
}

cleanup();
