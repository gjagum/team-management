/**
 * Single source of truth for RBAC permissions and role grants.
 * Used by prisma/seed.ts and scripts/sync-permissions.ts.
 * ADMIN always receives every permission.
 */
export const permissions: { name: string; description: string; resource: string; action: string }[] = [
  // User management
  {
    name: "users.create",
    description: "Create new users",
    resource: "users",
    action: "create",
  },
  {
    name: "users.read",
    description: "View user information",
    resource: "users",
    action: "read",
  },
  {
    name: "users.update",
    description: "Update user information",
    resource: "users",
    action: "update",
  },
  {
    name: "users.delete",
    description: "Delete users",
    resource: "users",
    action: "delete",
  },

  // Employee management
  {
    name: "employees.create",
    description: "Create employee records",
    resource: "employees",
    action: "create",
  },
  {
    name: "employees.read",
    description: "View employee information",
    resource: "employees",
    action: "read",
  },
  {
    name: "employees.update",
    description: "Update employee information",
    resource: "employees",
    action: "update",
  },
  {
    name: "employees.delete",
    description: "Delete employee records",
    resource: "employees",
    action: "delete",
  },

  // Leave management
  {
    name: "leaves.create",
    description: "Create leave requests",
    resource: "leaves",
    action: "create",
  },
  {
    name: "leaves.read",
    description: "View leave requests",
    resource: "leaves",
    action: "read",
  },
  {
    name: "leaves.update",
    description: "Update leave requests",
    resource: "leaves",
    action: "update",
  },
  {
    name: "leaves.delete",
    description: "Delete leave requests",
    resource: "leaves",
    action: "delete",
  },
  {
    name: "leaves.approve",
    description: "Approve or reject leave requests",
    resource: "leaves",
    action: "approve",
  },
  {
    name: "leaves.manage_balances",
    description: "Manage leave balances",
    resource: "leaves",
    action: "manage_balances",
  },

  // Overtime management
  {
    name: "overtime.create",
    description: "Create overtime records",
    resource: "overtime",
    action: "create",
  },
  {
    name: "overtime.read",
    description: "View overtime records",
    resource: "overtime",
    action: "read",
  },
  {
    name: "overtime.update",
    description: "Update overtime records",
    resource: "overtime",
    action: "update",
  },
  {
    name: "overtime.delete",
    description: "Delete overtime records",
    resource: "overtime",
    action: "delete",
  },
  {
    name: "overtime.approve",
    description: "Approve or reject overtime records",
    resource: "overtime",
    action: "approve",
  },

  // Schedule management
  {
    name: "schedules.create",
    description: "Create employee schedules",
    resource: "schedules",
    action: "create",
  },
  {
    name: "schedules.read",
    description: "View employee schedules",
    resource: "schedules",
    action: "read",
  },
  {
    name: "schedules.update",
    description: "Update employee schedules",
    resource: "schedules",
    action: "update",
  },
  {
    name: "schedules.delete",
    description: "Delete employee schedules",
    resource: "schedules",
    action: "delete",
  },

  // Reports
  {
    name: "reports.view",
    description: "View reports and analytics",
    resource: "reports",
    action: "view",
  },
  {
    name: "reports.export",
    description: "Export reports",
    resource: "reports",
    action: "export",
  },

  // Audit logs
  {
    name: "audit.read",
    description: "View audit logs",
    resource: "audit",
    action: "read",
  },

  // Document management
  {
    name: "documents.read",
    description: "View employee documents",
    resource: "documents",
    action: "read",
  },
  {
    name: "documents.upload",
    description: "Upload employee documents",
    resource: "documents",
    action: "upload",
  },
  {
    name: "documents.delete",
    description: "Delete employee documents",
    resource: "documents",
    action: "delete",
  },

  // Onboarding management
  {
    name: "onboarding.read",
    description: "View onboarding status",
    resource: "onboarding",
    action: "read",
  },
  {
    name: "onboarding.manage",
    description: "Manage onboarding tasks",
    resource: "onboarding",
    action: "manage",
  },

  // Team management
  {
    name: "teams.create",
    description: "Create teams",
    resource: "teams",
    action: "create",
  },
  {
    name: "teams.read",
    description: "View teams",
    resource: "teams",
    action: "read",
  },
  {
    name: "teams.update",
    description: "Update teams",
    resource: "teams",
    action: "update",
  },
  {
    name: "teams.delete",
    description: "Delete teams",
    resource: "teams",
    action: "delete",
  },
];

export const rolePermissions: Record<'MANAGER' | 'EMPLOYEE' | 'TEAM_LEADER', string[]> = {
  MANAGER: [
    "users.read",
    "employees.read",
    "leaves.create",
    "leaves.read",
    "leaves.approve",
    "overtime.create",
    "overtime.read",
    "overtime.approve",
    "schedules.read",
    "reports.view",
    "reports.export",
    "documents.read",
    "documents.upload",
    "onboarding.read",
    "onboarding.manage",
    "teams.read",
  ],
  EMPLOYEE: [
    "leaves.create",
    "leaves.read",
    "overtime.create",
    "overtime.read",
    "schedules.read",
    "reports.view",
    "reports.export",
    "documents.read",
    "onboarding.read",
  ],
  TEAM_LEADER: [
    "employees.read",
    "leaves.create",
    "leaves.read",
    "leaves.approve",
    "overtime.create",
    "overtime.read",
    "overtime.approve",
    "schedules.read",
    "reports.view",
    "reports.export",
    "documents.read",
    "onboarding.read",
    "teams.read",
  ],
};
