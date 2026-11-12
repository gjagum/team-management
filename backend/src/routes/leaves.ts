import { Hono } from "hono";
import {
  authMiddleware,
  requirePermission,
  auditLog,
} from "../middleware/auth.ts";
import { prisma } from "../index.ts";

const leavesRouter = new Hono();

leavesRouter.use("/*", authMiddleware);

// Helper: get employee record from the authenticated user's ID
async function getEmployeeByUserId(userId: number) {
  return prisma.employee.findUnique({ where: { userId } });
}

// Helper: compute accrued leave balance using incremental approach (Earn as you work)
function computeAccruedLeaves(hireDate: Date, annualAllowance: number): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);

  // Effective start date for calculation (cannot be before Jan 1st of current year)
  const effectiveStartDate = hireDate > startOfYear ? hireDate : startOfYear;

  // If hired in the future, no accrual yet
  if (effectiveStartDate > now) return 0;

  // Calculate total days in current year
  const endOfYear = new Date(currentYear, 11, 31);
  const totalDaysInYear =
    Math.ceil(
      (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  // Calculate days worked from effective start until today
  // We use Math.floor to ensure today's hire shows 0
  const msWorked = now.getTime() - effectiveStartDate.getTime();
  const daysWorked = Math.floor(msWorked / (1000 * 60 * 60 * 24));

  if (daysWorked <= 0) return 0;

  const accrued = (daysWorked / totalDaysInYear) * annualAllowance;

  // Return result with 2 decimal places precision
  return Math.round(accrued * 100) / 100;
}

leavesRouter.get("/", requirePermission("leaves.read"), async (c) => {
  const employee = await getEmployeeByUserId(c.user!.userId);

  // Admins and managers see all; employees only see their own
  const where =
    c.user!.role === "ADMIN" || c.user!.role === "MANAGER"
      ? {}
      : { employeeId: employee?.id };

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      },
      approver: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json(leaves);
});

leavesRouter.get(
  "/my-requests",
  requirePermission("leaves.read"),
  async (c) => {
    const employee = await getEmployeeByUserId(c.user!.userId);
    if (!employee) return c.json({ error: "No employee profile found" }, 400);

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: {
        approver: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json(leaves);
  },
);

leavesRouter.get("/balance", requirePermission("leaves.read"), async (c) => {
  const employee = await getEmployeeByUserId(c.user!.userId);
  if (!employee) return c.json({ error: "No employee profile found" }, 400);

  const year = parseInt(
    c.req.query("year") || new Date().getFullYear().toString(),
  );

  // Get annual allowance from settings, default to 15
  const setting = await (prisma as any).appSettings.findUnique({
    where: { key: "leave.annual_allowance" },
  });
  const annualAllowance = setting ? parseInt(setting.value) : 15;

  // Compute accrued leaves based on hire date
  const accrued = computeAccruedLeaves(employee.hireDate, annualAllowance);

  // Find or create the leave balance record
  let balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_year: {
        employeeId: employee.id,
        year,
      },
    },
  });

  if (!balance) {
    balance = await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year,
        totalLeaves: accrued,
        usedLeaves: 0,
      },
    });
  }

  return c.json({
    ...balance,
    totalLeaves: balance.totalLeaves,
    availableLeaves: balance.totalLeaves - balance.usedLeaves,
  });
});

leavesRouter.post("/", requirePermission("leaves.create"), async (c) => {
  const employee = await getEmployeeByUserId(c.user!.userId);
  if (!employee)
    return c.json(
      {
        error:
          "No employee profile found. Please ask an admin to activate your employee profile.",
      },
      400,
    );

  const data = await c.req.json();

  if (!data.startDate || !data.endDate) {
    return c.json({ error: "Start date and end date are required" }, 400);
  }

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return c.json(
      { error: "Invalid date format. Please provide valid dates." },
      400,
    );
  }

  if (endDate < startDate) {
    return c.json({ error: "End date must be on or after start date" }, 400);
  }

  const days =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;

  // Calculate Paid vs Unpaid based on current balance
  const currentYear = new Date().getFullYear();
  let balance = await prisma.leaveBalance.findFirst({
    where: { employeeId: employee.id, year: currentYear },
  });

  // If no balance found, they might need one initialized (safety check)
  if (!balance) {
    const hiredDate = new Date(employee.hiredDate);
    const accrued = computeAccruedLeaves(hiredDate, 20); // Default to 20 for initialization if missing
    balance = await prisma.leaveBalance.create({
      data: {
        employeeId: employee.id,
        year: currentYear,
        totalLeaves: accrued,
        usedLeaves: 0,
      },
    });
  }

  const available = Number(balance.totalLeaves) - Number(balance.usedLeaves);
  const paidDays = Math.max(0, Math.min(days, available));
  const unpaidDays = days - paidDays;

  // Check for overlapping requests (PENDING or APPROVED)
  const overlappingRequest = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: employee.id,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        {
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      ],
    },
  });

  if (overlappingRequest) {
    return c.json(
      {
        error:
          "You already have a pending or approved leave request for these dates",
      },
      400,
    );
  }

  try {
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType: data.leaveType || "ANNUAL",
        startDate,
        endDate,
        days,
        paidDays,
        unpaidDays,
        reason: data.reason,
        status: "PENDING",
      },
    });

    return c.json(leaveRequest);
  } catch (error) {
    console.error("Failed to create leave request:", error);
    return c.json({ error: "Failed to create leave request" }, 500);
  }
});

leavesRouter.patch(
  "/:id/approve",
  requirePermission("leaves.approve"),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = await c.req.json();

    const employee = await getEmployeeByUserId(c.user!.userId);
    if (!employee) return c.json({ error: "No employee profile found" }, 400);

    const oldLeave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { teamId: true } } },
    });
    if (!oldLeave) return c.json({ error: "Leave request not found" }, 404);

    // Team-based approval check: TEAM_LEADER can only approve their team members
    if (c.user!.role === "TEAM_LEADER") {
      const ledTeam = await prisma.team.findFirst({
        where: {
          OR: [
            { teamLeaderId: employee.id },
            { alternateApproverId: employee.id },
          ],
        },
        select: { id: true, teamLeaderId: true, alternateApproverId: true },
      });
      if (!ledTeam) {
        return c.json(
          {
            error: "You can only approve leave requests from your team members",
          },
          403,
        );
      }
      const requestor = oldLeave.employee;
      if (!requestor.teamId || requestor.teamId !== ledTeam.id) {
        return c.json(
          {
            error: "You can only approve leave requests from your team members",
          },
          403,
        );
      }
    }

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: data.status === "approved" ? "APPROVED" : "REJECTED",
        reviewedBy: employee.id,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
      },
    });

    if (data.status === "approved") {
      const year = new Date(leave.startDate).getFullYear();
      // Upsert: create the balance if it doesn't exist, then increment usedLeaves
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_year: {
            employeeId: leave.employeeId,
            year,
          },
        },
        create: {
          employeeId: leave.employeeId,
          year,
          totalLeaves: 15,
          usedLeaves: leave.paidDays,
        },
        update: {
          usedLeaves: { increment: leave.paidDays },
        },
      });
    }

    await auditLog(
      c.user!.userId,
      "APPROVE",
      "leave_request",
      id,
      oldLeave,
      leave,
    );

    return c.json(leave);
  },
);

leavesRouter.delete("/:id", requirePermission("leaves.delete"), async (c) => {
  const id = parseInt(c.req.param("id"));

  const oldLeave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!oldLeave) return c.json({ error: "Leave request not found" }, 404);

  if (oldLeave.status === "PENDING") {
    await prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }

  await auditLog(c.user!.userId, "CANCEL", "leave_request", id, oldLeave, null);

  return c.json({ message: "Leave request cancelled" });
});

export default leavesRouter;
