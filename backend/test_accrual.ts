import pkg from "npm:@prisma/client";
const { PrismaClient } = pkg;
import bcrypt from "npm:bcryptjs";

const prisma = new PrismaClient();

async function createTestEmployees() {
  console.log("Creating employees with different start dates for accrual testing...");

  const testCases = [
    { name: "Old Employee", email: "old@test.com", hireDate: new Date("2024-01-15"), expected: "Full Year Accrual" },
    { name: "Jan Start", email: "jan@test.com", hireDate: new Date("2026-01-01"), expected: "Full Year Accrual" },
    { name: "July Start", email: "july@test.com", hireDate: new Date("2026-07-01"), expected: "Incremental since July" },
    { name: "Dec Start", email: "dec@test.com", hireDate: new Date("2026-12-01"), expected: "0 (Future)" },
    { name: "Today Hire", email: "today@test.com", hireDate: new Date(), expected: "0" },
    { name: "Last Week", email: "lastweek@test.com", hireDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), expected: "~0.38" },
  ];

  for (const tc of testCases) {
    const passwordHash = await bcrypt.hash("password123", 10);
    
    // Cleanup if exists
    const existing = await prisma.user.findUnique({ where: { email: tc.email } });
    if (existing) {
      const employee = await prisma.employee.findUnique({ where: { userId: existing.id } });
      if (employee) {
        await prisma.leaveBalance.deleteMany({ where: { employeeId: employee.id } });
        await prisma.leaveRequest.deleteMany({ where: { employeeId: employee.id } });
        await prisma.employee.delete({ where: { id: employee.id } });
      }
      await prisma.session.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const user = await prisma.user.create({
      data: {
        email: tc.email,
        passwordHash,
        fullName: tc.name,
        role: "EMPLOYEE",
        employee: {
          create: {
            employeeCode: `TEST-${tc.name.replace(" ", "").toUpperCase()}`,
            department: "Testing",
            position: "Accrual Test",
            hireDate: tc.hireDate,
          }
        }
      },
      include: { employee: true }
    });

    console.log(`Created ${tc.name} (Hired: ${tc.hireDate.toISOString().split("T")[0]})`);
  }

  await prisma.$disconnect();
}

async function verifyBalances() {
  console.log("\nVerifying calculated balances via API simulation...");
  
  // Note: Since we are in the same environment, we can just run the logic 
  // or use fetch if the server is running. Server is on 3001.
  
  const testEmails = ["old@test.com", "jan@test.com", "july@test.com", "dec@test.com", "today@test.com", "lastweek@test.com"];
  
  for (const email of testEmails) {
    const res = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" })
    });
    
    const { token } = await res.json();
    
    const balanceRes = await fetch("http://localhost:3001/api/leaves/balance?year=2026", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const balance = await balanceRes.json();
    console.log(`Employee: ${email} | Hire Date: ${balance.employeeId} | Total Allocation: ${balance.totalLeaves}`);
  }
}

async function run() {
  try {
    await createTestEmployees();
    // Wait a bit for server to be ready if needed, though it's already running
    await verifyBalances();
  } catch (err) {
    console.error(err);
  }
}

run();
