import { Hono } from "hono";
import {
  authMiddleware,
  requirePermission,
  auditLog,
} from "../middleware/auth.ts";
import { prisma } from "../db.ts";

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

// Leave categories the platform tracks with a paid allocation.
const PAID_LEAVE_TYPES = ["VACATION", "SICK"] as const;
type PaidLeaveType = (typeof PAID_LEAVE_TYPES)[number];

const LEAVE_TYPE_LABELS: Record<string, string> = {
  VACATION: "Paid Vacation Leave",
  SICK: "Paid Sick Leave",
  UNPAID: "Unpaid Leave",
};

// Both paid categories default to 5 days per year.
function defaultAllowance(_type: PaidLeaveType): number {
  return 5;
}

function normalizeLeaveType(value: unknown): string {
  const raw = String(value ?? "").toUpperCase().replace(/\s+/g, "_");
  if (["VACATION", "ANNUAL", "PAID_VACATION_LEAVE", "PAID_VACATION"].includes(raw)) return "VACATION";
  if (["SICK", "PAID_SICK_LEAVE", "PAID_SICK"].includes(raw)) return "SICK";
  if (["UNPAID", "UNPAID_LEAVE", "WITHOUT_PAY"].includes(raw)) return "UNPAID";
  return raw || "VACATION";
}

async function ensureBalance(employeeId: number, year: number, leaveType: PaidLeaveType) {
  const existing = await prisma.leaveBalance.findUnique({
    where: { employeeId_year_leaveType: { employeeId, year, leaveType } },
  });
  if (existing) return existing;
  return prisma.leaveBalance.create({
    data: {
      employeeId,
      year,
      leaveType,
      totalLeaves: defaultAllowance(leaveType),
      usedLeaves: 0,
    },
  });
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

  const vacation = await ensureBalance(employee.id, year, "VACATION");
  const sick = await ensureBalance(employee.id, year, "SICK");

  const toSummary = (row: any) => ({
    id: row.id,
    leaveType: row.leaveType,
    year: row.year,
    totalLeaves: Number(row.totalLeaves),
    usedLeaves: Number(row.usedLeaves),
    availableLeaves: Number(row.totalLeaves) - Number(row.usedLeaves),
  });

  return c.json({
    // Legacy shape (used by the dashboard cards) reflects the vacation allocation.
    ...toSummary(vacation),
    types: {
      VACATION: toSummary(vacation),
      SICK: toSummary(sick),
    },
  });
});

// Per-employee allocations for the Monitor Leaves matrix.
// Admins see everyone; managers/team leaders see only the teams they lead.
leavesRouter.get("/overview", requirePermission("leaves.read"), async (c) => {
  const year = parseInt(c.req.query("year") || new Date().getFullYear().toString());
  const role = c.user!.role;

  let where: any = {};
  if (role !== "ADMIN") {
    const me = await getEmployeeByUserId(c.user!.userId);
    if (!me) return c.json([]);
    const teams = await prisma.team.findMany({
      where: { OR: [{ teamLeaderId: me.id }, { alternateApproverId: me.id }] },
      select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) return c.json([]);
    where = { teamId: { in: teamIds } };
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      user: { select: { fullName: true, email: true, role: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { employeeCode: "asc" },
  });

  const rows = await Promise.all(
    employees.map(async (employee) => {
      const vacation = await ensureBalance(employee.id, year, "VACATION");
      const sick = await ensureBalance(employee.id, year, "SICK");
      const summary = (row: any) => ({
        totalLeaves: Number(row.totalLeaves),
        usedLeaves: Number(row.usedLeaves),
        availableLeaves: Number(row.totalLeaves) - Number(row.usedLeaves),
      });
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.user.fullName,
        email: employee.user.email,
        team: employee.team?.name ?? null,
        year,
        vacation: summary(vacation),
        sick: summary(sick),
      };
    }),
  );

  return c.json(rows);
});

// Set an employee's allocation for one paid leave type (used by CSV import).
leavesRouter.put("/allocations/:employeeId", requirePermission("leaves.manage_balances"), async (c) => {
  const employeeId = parseInt(c.req.param("employeeId"));
  const data = await c.req.json();
  const leaveType = normalizeLeaveType(data.leaveType) as PaidLeaveType;
  if (!PAID_LEAVE_TYPES.includes(leaveType)) {
    return c.json({ error: "leaveType must be VACATION or SICK" }, 400);
  }
  const year = Number(data.year) || new Date().getFullYear();
  const totalLeaves = Number(data.totalLeaves);
  if (!Number.isFinite(totalLeaves) || totalLeaves < 0) {
    return c.json({ error: "totalLeaves must be a non-negative number" }, 400);
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return c.json({ error: "Employee not found" }, 404);

  const balance = await prisma.leaveBalance.upsert({
    where: { employeeId_year_leaveType: { employeeId, year, leaveType } },
    update: { totalLeaves },
    create: { employeeId, year, leaveType, totalLeaves, usedLeaves: 0 },
  });

  await auditLog(c.user!.userId, "UPDATE", "leave_balance", balance.id, null, balance);
  return c.json(balance);
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

  // Paid vs unpaid depends on the requested leave type and its own allocation.
  const currentYear = new Date().getFullYear();
  const leaveType = normalizeLeaveType(data.leaveType);
  const isPaidType = PAID_LEAVE_TYPES.includes(leaveType as PaidLeaveType);

  let paidDays = 0;
  let unpaidDays = days;
  if (isPaidType) {
    const balance = await ensureBalance(employee.id, currentYear, leaveType as PaidLeaveType);
    const available = Number(balance.totalLeaves) - Number(balance.usedLeaves);
    paidDays = Math.max(0, Math.min(days, available));
    unpaidDays = days - paidDays;
  }

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
        leaveType,
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
      const type = normalizeLeaveType(leave.leaveType) as PaidLeaveType;
      // Only paid categories consume an allocation.
      if (PAID_LEAVE_TYPES.includes(type)) {
        const balance = await ensureBalance(leave.employeeId, year, type);
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { usedLeaves: { increment: leave.paidDays } },
        });
      }
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
