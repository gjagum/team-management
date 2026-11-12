# RBAC (Role-Based Access Control) Documentation

## Overview

This system implements a comprehensive RBAC system to control access to different features based on user roles.

## Roles

### 1. ADMIN
Full system access with all permissions.

### 2. MANAGER
Limited administrative access, can approve/reject requests and view reports.

### 3. TEAM_LEADER
Team-level approval access. Can approve/reject leave and overtime requests from their own team members. Can read employee and team information.

### 4. EMPLOYEE
Basic access, can create requests and view own data.

## Permissions

### User Management
- `users.create` - Create new users
- `users.read` - View user information
- `users.update` - Update user information
- `users.delete` - Delete users

### Employee Management
- `employees.create` - Create employee records
- `employees.read` - View employee information
- `employees.update` - Update employee information
- `employees.delete` - Delete employee records

### Leave Management
- `leaves.create` - Create leave requests
- `leaves.read` - View leave requests
- `leaves.update` - Update leave requests
- `leaves.delete` - Delete leave requests
- `leaves.approve` - Approve or reject leave requests
- `leaves.manage_balances` - Manage leave balances

### Overtime Management
- `overtime.create` - Create overtime records
- `overtime.read` - View overtime records
- `overtime.update` - Update overtime records
- `overtime.delete` - Delete overtime records
- `overtime.approve` - Approve or reject overtime records

### Reports
- `reports.view` - View reports and analytics
- `reports.export` - Export reports

### Team Management
- `teams.create` - Create teams
- `teams.read` - View team information
- `teams.update` - Update team information
- `teams.delete` - Delete teams

### Audit Logs
- `audit.read` - View audit logs

## Permission Matrix

| Permission | ADMIN | MANAGER | TEAM_LEADER | EMPLOYEE |
|------------|-------|---------|-------------|----------|
| users.create | ✓ | ✗ | ✗ | ✗ |
| users.read | ✓ | ✓ | ✗ | ✗ |
| users.update | ✓ | ✗ | ✗ | ✗ |
| users.delete | ✓ | ✗ | ✗ | ✗ |
| employees.create | ✓ | ✗ | ✗ | ✗ |
| employees.read | ✓ | ✓ | ✓ | ✗ |
| employees.update | ✓ | ✗ | ✗ | ✗ |
| employees.delete | ✓ | ✗ | ✗ | ✗ |
| leaves.create | ✓ | ✓ | ✓ | ✓ |
| leaves.read | ✓ | ✓ | ✓ | ✓ |
| leaves.update | ✓ | ✗ | ✗ | ✗ |
| leaves.delete | ✓ | ✗ | ✗ | ✗ |
| leaves.approve* | ✓ | ✓ | ✓ | ✗ |
| leaves.manage_balances | ✓ | ✗ | ✗ | ✗ |
| overtime.create | ✓ | ✓ | ✓ | ✓ |
| overtime.read | ✓ | ✓ | ✓ | ✓ |
| overtime.update | ✓ | ✗ | ✗ | ✗ |
| overtime.delete | ✓ | ✗ | ✗ | ✗ |
| overtime.approve* | ✓ | ✓ | ✓ | ✗ |
| reports.view | ✓ | ✓ | ✓ | ✗ |
| reports.export | ✓ | ✓ | ✓ | ✗ |
| schedules.read | ✓ | ✓ | ✓ | ✗ |
| documents.read | ✓ | ✓ | ✓ | ✗ |
| onboarding.read | ✓ | ✓ | ✓ | ✗ |
| teams.create | ✓ | ✗ | ✗ | ✗ |
| teams.read | ✓ | ✓ | ✓ | ✗ |
| teams.update | ✓ | ✗ | ✗ | ✗ |
| teams.delete | ✓ | ✗ | ✗ | ✗ |
| audit.read | ✓ | ✗ | ✗ | ✗ |

> *TEAM_LEADER approval permissions are scoped to their own team members only.*

## Implementation

### Backend Middleware

The RBAC system is implemented using middleware in `backend/src/middleware/auth.ts`:

```typescript
export async function requirePermission(requiredPermission: string) {
  return async (c: AuthContext, next: Next) => {
    // Check if user has the required permission
    // ...
  };
}

export async function requireRole(...roles: Role[]) {
  return async (c: AuthContext, next: Next) => {
    // Check if user has one of the required roles
    // ...
  };
}
```

### Usage Example

```typescript
// Require specific permission
usersRouter.get('/', requirePermission('users.read'), async (c) => {
  // Handler code
});

// Require specific role
usersRouter.delete('/:id', requireRole('ADMIN'), async (c) => {
  // Handler code
});
```

## Database Schema

Permissions are stored in the database:

```prisma
model Permission {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String?
  resource    String
  action      String
}

model RolePermission {
  role         Role
  permissionId Int
}
```

## Adding New Permissions

1. Add the permission to the seed file in `backend/prisma/seed.ts`
2. Assign it to appropriate roles
3. Use `requirePermission('permission.name')` middleware in routes
4. Update frontend to hide/show features based on user role/permissions
