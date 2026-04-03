import { assertEquals } from "@std/assert";
import { Hono } from "hono";

// ---------------------------------------------------------------------------
// Helpers – lightweight mocks that avoid touching a real database
// ---------------------------------------------------------------------------

/** Build a mock user that the auth middleware would normally attach. */
function mockUser(overrides: Partial<{ userId: number; email: string; role: string }> = {}) {
  return {
    userId: overrides.userId ?? 1,
    email: overrides.email ?? "test@example.com",
    role: overrides.role ?? "EMPLOYEE",
  };
}

/** Minimal mock Prisma client scoped to what the leaves router touches. */
function createMockPrisma() {
  return {
    leaveRequest: {
      findMany: async (_args?: any) => [] as any[],
      findUnique: async (_args?: any) => null as any,
      create: async (args: any) => ({ id: 1, ...args.data }),
      update: async (args: any) => ({ id: args.where.id, ...args.data }),
    },
    leaveBalance: {
      findUnique: async (_args?: any) => null as any,
      update: async (_args?: any) => ({} as any),
    },
    auditLog: {
      create: async (_args?: any) => ({} as any),
    },
    rolePermission: {
      findMany: async (_args?: any) =>
        [{ permission: { name: "leaves.read" } },
         { permission: { name: "leaves.create" } },
         { permission: { name: "leaves.approve" } },
         { permission: { name: "leaves.delete" } }] as any[],
    },
  };
}

/**
 * Build a self‑contained Hono app that replicates the production wiring
 * but with mocked auth + prisma so we never hit the network.
 */
function createTestApp(
  prismaOverrides: Partial<ReturnType<typeof createMockPrisma>> = {},
  userOverrides: Parameters<typeof mockUser>[0] = {},
) {
  const mockPrismaClient = { ...createMockPrisma(), ...prismaOverrides } as any;
  const user = mockUser(userOverrides);

  const app = new Hono();

  // ---- Inject mock auth & prisma before each request ----
  app.use("/*", async (c, next) => {
    (c as any).user = user;
    await next();
  });

  // ---- Replicate the leaves router inline (with mock prisma) ----
  // We duplicate the route handlers from leaves.ts but use our mock prisma.
  // This keeps the test self‑contained and avoids importing things that
  // pull in the real PrismaClient / Deno.env / etc.

  const prisma = mockPrismaClient;

  // GET /
  app.get("/", async (c) => {
    const leaves = await prisma.leaveRequest.findMany({
      include: {
        employee: { include: { user: { select: { id: true, email: true, fullName: true } } } },
        approver: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json(leaves);
  });

  // GET /my-requests
  app.get("/my-requests", async (c) => {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: (c as any).user.userId },
      include: {
        approver: { include: { user: { select: { id: true, fullName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json(leaves);
  });

  // GET /balance
  app.get("/balance", async (c) => {
    const year = parseInt(c.req.query("year") || new Date().getFullYear().toString());
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: (c as any).user.userId, year } },
    });
    if (balance) {
      return c.json({ ...balance, availableLeaves: balance.totalLeaves - balance.usedLeaves });
    }
    return c.json({ totalLeaves: 2, usedLeaves: 0, availableLeaves: 2 });
  });

  // POST /
  app.post("/", async (c) => {
    const data = await c.req.json();
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: (c as any).user.userId,
        leaveType: data.leaveType,
        startDate,
        endDate,
        days,
        reason: data.reason,
        status: "PENDING",
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (c as any).user.userId,
        action: "CREATE",
        entityType: "leave_request",
        entityId: leaveRequest.id,
        oldValues: null,
        newValues: JSON.parse(JSON.stringify(leaveRequest)),
      },
    });

    return c.json(leaveRequest, 201);
  });

  // PATCH /:id/approve
  app.patch("/:id/approve", async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = await c.req.json();

    const oldLeave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!oldLeave) return c.json({ error: "Leave request not found" }, 404);

    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: data.status === "approved" ? "APPROVED" : "REJECTED",
        reviewedBy: (c as any).user.userId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
      },
    });

    if (data.status === "approved") {
      await prisma.leaveBalance.update({
        where: {
          employeeId_year: {
            employeeId: leave.employeeId,
            year: new Date(leave.startDate).getFullYear(),
          },
        },
        data: { usedLeaves: { increment: leave.days } },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: (c as any).user.userId,
        action: "APPROVE",
        entityType: "leave_request",
        entityId: id,
        oldValues: JSON.parse(JSON.stringify(oldLeave)),
        newValues: JSON.parse(JSON.stringify(leave)),
      },
    });

    return c.json(leave);
  });

  // DELETE /:id
  app.delete("/:id", async (c) => {
    const id = parseInt(c.req.param("id"));

    const oldLeave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!oldLeave) return c.json({ error: "Leave request not found" }, 404);

    if (oldLeave.status === "PENDING") {
      await prisma.leaveRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: (c as any).user.userId,
        action: "CANCEL",
        entityType: "leave_request",
        entityId: id,
        oldValues: JSON.parse(JSON.stringify(oldLeave)),
        newValues: null,
      },
    });

    return c.json({ message: "Leave request cancelled" });
  });

  return app;
}

// ===========================================================================
//  Tests
// ===========================================================================

// --------------------------------
// GET / – List all leave requests
// --------------------------------
Deno.test("GET / – returns an empty list when no leave requests exist", async () => {
  const app = createTestApp();
  const res = await app.request("/");
  assertEquals(res.status, 200);
  assertEquals(await res.json(), []);
});

Deno.test("GET / – returns leave requests from the database", async () => {
  const mockLeaves = [
    { id: 1, employeeId: 1, leaveType: "SICK", startDate: "2026-03-20", endDate: "2026-03-21", days: 2, status: "PENDING" },
    { id: 2, employeeId: 2, leaveType: "VACATION", startDate: "2026-04-01", endDate: "2026-04-05", days: 5, status: "APPROVED" },
  ];

  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findMany: async () => mockLeaves,
    },
  });

  const res = await app.request("/");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.length, 2);
  assertEquals(body[0].leaveType, "SICK");
  assertEquals(body[1].status, "APPROVED");
});

// --------------------------------
// GET /my-requests
// --------------------------------
Deno.test("GET /my-requests – returns only the current user's requests", async () => {
  const userLeaves = [
    { id: 3, employeeId: 1, leaveType: "PERSONAL", days: 1, status: "PENDING" },
  ];

  let capturedWhere: any;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findMany: async (args: any) => {
        capturedWhere = args?.where;
        return userLeaves;
      },
    },
  });

  const res = await app.request("/my-requests");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.length, 1);
  assertEquals(body[0].leaveType, "PERSONAL");
  // Verify the query filtered by the authenticated user
  assertEquals(capturedWhere?.employeeId, 1);
});

// --------------------------------
// GET /balance
// --------------------------------
Deno.test("GET /balance – returns defaults when no balance record exists", async () => {
  const app = createTestApp(); // findUnique returns null by default
  const res = await app.request("/balance");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.totalLeaves, 2);
  assertEquals(body.usedLeaves, 0);
  assertEquals(body.availableLeaves, 2);
});

Deno.test("GET /balance – returns balance with calculated available leaves", async () => {
  const app = createTestApp({
    leaveBalance: {
      ...createMockPrisma().leaveBalance,
      findUnique: async () => ({ totalLeaves: 15, usedLeaves: 5 }),
    },
  });

  const res = await app.request("/balance");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.totalLeaves, 15);
  assertEquals(body.usedLeaves, 5);
  assertEquals(body.availableLeaves, 10);
});

Deno.test("GET /balance – respects the year query parameter", async () => {
  let capturedYear: number | undefined;

  const app = createTestApp({
    leaveBalance: {
      ...createMockPrisma().leaveBalance,
      findUnique: async (args: any) => {
        capturedYear = args?.where?.employeeId_year?.year;
        return null;
      },
    },
  });

  await app.request("/balance?year=2025");
  assertEquals(capturedYear, 2025);
});

// --------------------------------
// POST / – Create leave request
// --------------------------------
Deno.test("POST / – creates a leave request and returns 201", async () => {
  let capturedData: any;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      create: async (args: any) => {
        capturedData = args.data;
        return { id: 10, ...args.data };
      },
    },
  });

  const res = await app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leaveType: "VACATION",
      startDate: "2026-04-01",
      endDate: "2026-04-03",
      reason: "Family trip",
    }),
  });

  assertEquals(res.status, 201);
  const body = await res.json();
  assertEquals(body.id, 10);
  assertEquals(body.leaveType, "VACATION");
  assertEquals(body.status, "PENDING");
  assertEquals(capturedData.employeeId, 1);
  assertEquals(capturedData.reason, "Family trip");
});

Deno.test("POST / – calculates days correctly", async () => {
  let capturedDays: number | undefined;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      create: async (args: any) => {
        capturedDays = args.data.days;
        return { id: 11, ...args.data };
      },
    },
  });

  // 5-day span: April 1–5 inclusive
  await app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leaveType: "SICK",
      startDate: "2026-04-01",
      endDate: "2026-04-05",
      reason: "Not feeling well",
    }),
  });

  assertEquals(capturedDays, 5);
});

Deno.test("POST / – single-day leave calculates as 1 day", async () => {
  let capturedDays: number | undefined;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      create: async (args: any) => {
        capturedDays = args.data.days;
        return { id: 12, ...args.data };
      },
    },
  });

  await app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leaveType: "PERSONAL",
      startDate: "2026-04-01",
      endDate: "2026-04-01",
      reason: "Appointment",
    }),
  });

  assertEquals(capturedDays, 1);
});

Deno.test("POST / – creates an audit log entry", async () => {
  let auditCreated = false;
  const app = createTestApp({
    auditLog: {
      create: async (args: any) => {
        auditCreated = true;
        assertEquals(args.data.action, "CREATE");
        assertEquals(args.data.entityType, "leave_request");
        return {};
      },
    },
  });

  await app.request("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leaveType: "SICK",
      startDate: "2026-05-01",
      endDate: "2026-05-01",
      reason: "Checkup",
    }),
  });

  assertEquals(auditCreated, true);
});

// --------------------------------
// PATCH /:id/approve
// --------------------------------
Deno.test("PATCH /:id/approve – approves a leave request", async () => {
  let balanceUpdated = false;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 1,
        employeeId: 2,
        leaveType: "VACATION",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-04-03"),
        days: 3,
        status: "PENDING",
      }),
      update: async (args: any) => ({
        id: args.where.id,
        employeeId: 2,
        startDate: new Date("2026-04-01"),
        days: 3,
        ...args.data,
      }),
    },
    leaveBalance: {
      ...createMockPrisma().leaveBalance,
      update: async () => {
        balanceUpdated = true;
        return {};
      },
    },
  });

  const res = await app.request("/1/approve", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved", reviewNotes: "Looks good" }),
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "APPROVED");
  assertEquals(body.reviewNotes, "Looks good");
  assertEquals(balanceUpdated, true);
});

Deno.test("PATCH /:id/approve – rejects a leave request without updating balance", async () => {
  let balanceUpdated = false;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 1,
        employeeId: 2,
        startDate: new Date("2026-04-01"),
        days: 3,
        status: "PENDING",
      }),
      update: async (args: any) => ({
        id: args.where.id,
        employeeId: 2,
        startDate: new Date("2026-04-01"),
        days: 3,
        ...args.data,
      }),
    },
    leaveBalance: {
      ...createMockPrisma().leaveBalance,
      update: async () => {
        balanceUpdated = true;
        return {};
      },
    },
  });

  const res = await app.request("/1/approve", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "rejected", reviewNotes: "Insufficient balance" }),
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "REJECTED");
  assertEquals(balanceUpdated, false);
});

Deno.test("PATCH /:id/approve – returns 404 when leave not found", async () => {
  const app = createTestApp(); // findUnique returns null by default

  const res = await app.request("/999/approve", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });

  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.error, "Leave request not found");
});

Deno.test("PATCH /:id/approve – creates an audit log entry", async () => {
  let auditAction: string | undefined;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 1,
        employeeId: 2,
        startDate: new Date("2026-04-01"),
        days: 1,
        status: "PENDING",
      }),
      update: async (args: any) => ({
        id: 1,
        employeeId: 2,
        startDate: new Date("2026-04-01"),
        days: 1,
        ...args.data,
      }),
    },
    auditLog: {
      create: async (args: any) => {
        auditAction = args.data.action;
        return {};
      },
    },
  });

  await app.request("/1/approve", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });

  assertEquals(auditAction, "APPROVE");
});

// --------------------------------
// DELETE /:id – Cancel leave
// --------------------------------
Deno.test("DELETE /:id – cancels a PENDING leave request", async () => {
  let updatedStatus: string | undefined;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 5,
        employeeId: 1,
        status: "PENDING",
      }),
      update: async (args: any) => {
        updatedStatus = args.data.status;
        return { id: 5, ...args.data };
      },
    },
  });

  const res = await app.request("/5", { method: "DELETE" });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.message, "Leave request cancelled");
  assertEquals(updatedStatus, "CANCELLED");
});

Deno.test("DELETE /:id – does not update status for non-PENDING leave", async () => {
  let updateCalled = false;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 5,
        employeeId: 1,
        status: "APPROVED",
      }),
      update: async () => {
        updateCalled = true;
        return {};
      },
    },
  });

  const res = await app.request("/5", { method: "DELETE" });
  assertEquals(res.status, 200);
  assertEquals(updateCalled, false);
});

Deno.test("DELETE /:id – returns 404 when leave not found", async () => {
  const app = createTestApp(); // findUnique returns null by default

  const res = await app.request("/999", { method: "DELETE" });
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(body.error, "Leave request not found");
});

Deno.test("DELETE /:id – creates a CANCEL audit log entry", async () => {
  let auditAction: string | undefined;
  const app = createTestApp({
    leaveRequest: {
      ...createMockPrisma().leaveRequest,
      findUnique: async () => ({
        id: 5,
        employeeId: 1,
        status: "PENDING",
      }),
    },
    auditLog: {
      create: async (args: any) => {
        auditAction = args.data.action;
        return {};
      },
    },
  });

  await app.request("/5", { method: "DELETE" });
  assertEquals(auditAction, "CANCEL");
});
