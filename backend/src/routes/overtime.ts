import { Hono } from "hono";
import {
  authMiddleware,
  requirePermission,
  auditLog,
} from "../middleware/auth.ts";
import { prisma } from "../db.ts";

const overtimeRouter = new Hono();

overtimeRouter.use("/*", authMiddleware);

// Helper: get employee record from the authenticated user's ID
async function getEmployeeByUserId(userId: number) {
  return prisma.employee.findUnique({ where: { userId } });
}

overtimeRouter.get("/", requirePermission("overtime.read"), async (c) => {
  const employee = await getEmployeeByUserId(c.user!.userId);
  const role = c.user!.role;

  // Admins see everything; managers/team leaders see their teams; employees their own.
  let where: any = {};
  if (role === "ADMIN") {
    where = {};
  } else if (role === "MANAGER" || role === "TEAM_LEADER") {
    if (!employee) return c.json([]);
    const teams = await prisma.team.findMany({
      where: { OR: [{ teamLeaderId: employee.id }, { alternateApproverId: employee.id }] },
      select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);
    if (teamIds.length === 0) return c.json([]);
    where = { employee: { teamId: { in: teamIds } } };
  } else {
    where = { employeeId: employee?.id };
  }

  const records = await prisma.overtimeRecord.findMany({
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
          team: { select: { id: true, name: true } },
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
  return c.json(records);
});

overtimeRouter.get(
  "/my-records",
  requirePermission("overtime.read"),
  async (c) => {
    const employee = await getEmployeeByUserId(c.user!.userId);
    if (!employee) return c.json({ error: "No employee profile found" }, 400);

    const records = await prisma.overtimeRecord.findMany({
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
    return c.json(records);
  },
);

overtimeRouter.post("/", requirePermission("overtime.create"), async (c) => {
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

  if (!data.date || !data.startTime || !data.endTime) {
    return c.json(
      { error: "Date, start time, and end time are required" },
      400,
    );
  }

  const date = new Date(data.date);
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  if (
    isNaN(date.getTime()) ||
    isNaN(startTime.getTime()) ||
    isNaN(endTime.getTime())
  ) {
    return c.json({ error: "Invalid date or time format" }, 400);
  }

  if (endTime <= startTime) {
    return c.json({ error: "End time must be after start time" }, 400);
  }

  const hours = parseFloat(
    ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(2),
  );

  // --- OVERLAP CHECK WITH SCHEDULE ---
  const schedule = await prisma.schedule.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: new Date(date.toISOString().split("T")[0]),
      },
    },
  });

  if (schedule) {
    // Convert schedule string times (HH:mm) to minutes for comparison
    const [shiftStartH, shiftStartM] = schedule.startTime
      .split(":")
      .map(Number);
    const [shiftEndH, shiftEndM] = schedule.endTime.split(":").map(Number);
    const shiftStartTotal = shiftStartH * 60 + shiftStartM;
    const shiftEndTotal = shiftEndH * 60 + shiftEndM;

    // OT times to minutes (using the same local date)
    const otStartTotal = startTime.getHours() * 60 + startTime.getMinutes();
    const otEndTotal = endTime.getHours() * 60 + endTime.getMinutes();

    // Check for overlap [otStart, otEnd] vs [shiftStart, shiftEnd]
    const hasOverlap =
      otStartTotal < shiftEndTotal && otEndTotal > shiftStartTotal;

    if (hasOverlap) {
      return c.json(
        {
          error: `Overtime overlaps with your regular shift (${schedule.startTime} - ${schedule.endTime}).`,
        },
        400,
      );
    }
  }
  // ------------------------------------

  const record = await prisma.overtimeRecord.create({
    data: {
      employeeId: employee.id,
      date,
      startTime,
      endTime,
      hours,
      description: data.description,
      status: "PENDING",
    },
  });

  await auditLog(
    c.user!.userId,
    "CREATE",
    "overtime_record",
    record.id,
    null,
    record,
  );

  return c.json(record, 201);
});

// Bulk import for admins (Company Overtime -> Import CSV).
overtimeRouter.post("/import", requirePermission("overtime.create"), async (c) => {
  if (c.user!.role !== "ADMIN") {
    return c.json({ error: "Only admins can import overtime records" }, 403);
  }

  const rows = await c.req.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: "Expected a non-empty array of rows" }, 400);
  }

  let created = 0;
  const failures: string[] = [];

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    try {
      if (!email) throw new Error("missing email");
      const employee = await prisma.employee.findFirst({
        where: { user: { email: { equals: email, mode: "insensitive" } } },
      });
      if (!employee) throw new Error("employee not found");

      const date = new Date(row.date);
      if (isNaN(date.getTime())) throw new Error("invalid date");

      const start = row.startTime
        ? new Date(row.startTime)
        : row.start
          ? new Date(`${row.date}T${row.start}`)
          : null;
      const end = row.endTime
        ? new Date(row.endTime)
        : row.end
          ? new Date(`${row.date}T${row.end}`)
          : null;

      let hours = Number(row.hours);
      if (!Number.isFinite(hours) || hours <= 0) {
        if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
          hours = Math.round(((end.getTime() - start.getTime()) / 3_600_000) * 100) / 100;
        }
      }
      if (!Number.isFinite(hours) || hours <= 0) throw new Error("hours missing");

      await prisma.overtimeRecord.create({
        data: {
          employeeId: employee.id,
          date,
          startTime: start && !isNaN(start.getTime()) ? start : date,
          endTime: end && !isNaN(end.getTime()) ? end : date,
          hours,
          description: row.reason || row.description || null,
          status: "PENDING",
        },
      });
      created++;
    } catch (error: any) {
      failures.push(`${email || "(no email)"}: ${error?.message || "failed"}`);
    }
  }

  await auditLog(c.user!.userId, "CREATE", "overtime_record", null, null, {
    imported: created,
    failed: failures.length,
  });

  return c.json({ created, failed: failures.length, failures: failures.slice(0, 10) });
});

overtimeRouter.patch(
  "/:id/approve",
  requirePermission("overtime.approve"),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = await c.req.json();

    const employee = await getEmployeeByUserId(c.user!.userId);
    if (!employee) return c.json({ error: "No employee profile found" }, 400);

    const oldRecord = await prisma.overtimeRecord.findUnique({
      where: { id },
      include: { employee: { select: { teamId: true } } },
    });
    if (!oldRecord) return c.json({ error: "Overtime record not found" }, 404);

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
            error:
              "You can only approve overtime requests from your team members",
          },
          403,
        );
      }
      const requestor = oldRecord.employee;
      if (!requestor.teamId || requestor.teamId !== ledTeam.id) {
        return c.json(
          {
            error:
              "You can only approve overtime requests from your team members",
          },
          403,
        );
      }
    }

    const record = await prisma.overtimeRecord.update({
      where: { id },
      data: {
        status: data.status === "approved" ? "APPROVED" : "REJECTED",
        approvedBy: employee.id,
        approvedAt: new Date(),
        approvalNotes: data.approvalNotes,
      },
    });

    await auditLog(
      c.user!.userId,
      "APPROVE",
      "overtime_record",
      id,
      oldRecord,
      record,
    );

    return c.json(record);
  },
);

overtimeRouter.delete(
  "/:id",
  requirePermission("overtime.delete"),
  async (c) => {
    const id = parseInt(c.req.param("id"));

    const oldRecord = await prisma.overtimeRecord.findUnique({ where: { id } });
    if (!oldRecord) return c.json({ error: "Overtime record not found" }, 404);

    if (oldRecord.status === "PENDING") {
      await prisma.overtimeRecord.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    }

    await auditLog(
      c.user!.userId,
      "CANCEL",
      "overtime_record",
      id,
      oldRecord,
      null,
    );

    return c.json({ message: "Overtime record cancelled" });
  },
);

export default overtimeRouter;
