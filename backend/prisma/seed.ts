import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const permissions: Omit<any, 'id' | 'createdAt'>[] = [
  // User management
  { name: 'users.create', description: 'Create new users', resource: 'users', action: 'create' },
  { name: 'users.read', description: 'View user information', resource: 'users', action: 'read' },
  { name: 'users.update', description: 'Update user information', resource: 'users', action: 'update' },
  { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' },
  
  // Employee management
  { name: 'employees.create', description: 'Create employee records', resource: 'employees', action: 'create' },
  { name: 'employees.read', description: 'View employee information', resource: 'employees', action: 'read' },
  { name: 'employees.update', description: 'Update employee information', resource: 'employees', action: 'update' },
  { name: 'employees.delete', description: 'Delete employee records', resource: 'employees', action: 'delete' },
  
  // Leave management
  { name: 'leaves.create', description: 'Create leave requests', resource: 'leaves', action: 'create' },
  { name: 'leaves.read', description: 'View leave requests', resource: 'leaves', action: 'read' },
  { name: 'leaves.update', description: 'Update leave requests', resource: 'leaves', action: 'update' },
  { name: 'leaves.delete', description: 'Delete leave requests', resource: 'leaves', action: 'delete' },
  { name: 'leaves.approve', description: 'Approve or reject leave requests', resource: 'leaves', action: 'approve' },
  { name: 'leaves.manage_balances', description: 'Manage leave balances', resource: 'leaves', action: 'manage_balances' },
  
  // Overtime management
  { name: 'overtime.create', description: 'Create overtime records', resource: 'overtime', action: 'create' },
  { name: 'overtime.read', description: 'View overtime records', resource: 'overtime', action: 'read' },
  { name: 'overtime.update', description: 'Update overtime records', resource: 'overtime', action: 'update' },
  { name: 'overtime.delete', description: 'Delete overtime records', resource: 'overtime', action: 'delete' },
  { name: 'overtime.approve', description: 'Approve or reject overtime records', resource: 'overtime', action: 'approve' },
  
  // Schedule management
  { name: 'schedules.create', description: 'Create employee schedules', resource: 'schedules', action: 'create' },
  { name: 'schedules.read', description: 'View employee schedules', resource: 'schedules', action: 'read' },
  { name: 'schedules.update', description: 'Update employee schedules', resource: 'schedules', action: 'update' },
  { name: 'schedules.delete', description: 'Delete employee schedules', resource: 'schedules', action: 'delete' },
  
  // Reports
  { name: 'reports.view', description: 'View reports and analytics', resource: 'reports', action: 'view' },
  { name: 'reports.export', description: 'Export reports', resource: 'reports', action: 'export' },
  
  // Audit logs
  { name: 'audit.read', description: 'View audit logs', resource: 'audit', action: 'read' },
];

async function seed() {
  console.log('Starting database seeding...');

  // Create permissions
  console.log('Creating permissions...');
  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  // Assign permissions to roles
  const allPermissions = await prisma.permission.findMany();

  // Admin gets all permissions
  console.log('Assigning permissions to ADMIN role...');
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: 'ADMIN',
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        role: 'ADMIN',
        permissionId: permission.id,
      },
    });
  }

  // Manager gets subset of permissions
  console.log('Assigning permissions to MANAGER role...');
  const managerPermissions = [
    'users.read',
    'employees.read',
    'leaves.create',
    'leaves.read',
    'leaves.approve',
    'overtime.create',
    'overtime.read',
    'overtime.approve',
    'reports.view',
    'reports.export',
  ];

  for (const permName of managerPermissions) {
    const permission = allPermissions.find(p => p.name === permName);
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: 'MANAGER',
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          role: 'MANAGER',
          permissionId: permission.id,
        },
      });
    }
  }

  // Employee gets basic permissions
  console.log('Assigning permissions to EMPLOYEE role...');
  const employeePermissions = [
    'leaves.create',
    'leaves.read',
    'overtime.create',
    'overtime.read',
    'schedules.read',
    'reports.view',
    'reports.export',
  ];

  for (const permName of employeePermissions) {
    const permission = allPermissions.find(p => p.name === permName);
    if (permission) {
      await prisma.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: 'EMPLOYEE',
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          role: 'EMPLOYEE',
          permissionId: permission.id,
        },
      });
    }
  }

  // Create admin user
  console.log('Creating admin user...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@team.com' },
    update: {},
    create: {
      email: 'admin@team.com',
      passwordHash: adminPasswordHash,
      fullName: 'Admin User',
      role: 'ADMIN',
    },
  });

  // Create employee record for admin
  await prisma.employee.upsert({
    where: { employeeCode: 'EMP001' },
    update: {},
    create: {
      userId: adminUser.id,
      employeeCode: 'EMP001',
      department: 'Management',
      position: 'Administrator',
      hireDate: new Date(),
      salary: 100000.00,
    },
  });

  // Create leave balance for admin for current year
  const currentYear = new Date().getFullYear();
  await prisma.leaveBalance.upsert({
    where: {
      employeeId_year: {
        employeeId: adminUser.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      employeeId: adminUser.id,
      year: currentYear,
      totalLeaves: 2,
      usedLeaves: 0,
    },
  });

  // Create a manager user for testing
  console.log('Creating manager user...');
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@team.com' },
    update: {},
    create: {
      email: 'manager@team.com',
      passwordHash: managerPasswordHash,
      fullName: 'Manager User',
      role: 'MANAGER',
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'EMP002' },
    update: {},
    create: {
      userId: managerUser.id,
      employeeCode: 'EMP002',
      department: 'Operations',
      position: 'Manager',
      hireDate: new Date('2023-01-01'),
      salary: 80000.00,
    },
  });

  await prisma.leaveBalance.upsert({
    where: {
      employeeId_year: {
        employeeId: managerUser.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      employeeId: managerUser.id,
      year: currentYear,
      totalLeaves: 2,
      usedLeaves: 0,
    },
  });

  // Create an employee user for testing
  console.log('Creating employee user...');
  const employeePasswordHash = await bcrypt.hash('employee123', 10);
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@team.com' },
    update: {},
    create: {
      email: 'employee@team.com',
      passwordHash: employeePasswordHash,
      fullName: 'Employee User',
      role: 'EMPLOYEE',
    },
  });

  await prisma.employee.upsert({
    where: { employeeCode: 'EMP003' },
    update: {},
    create: {
      userId: employeeUser.id,
      employeeCode: 'EMP003',
      department: 'Engineering',
      position: 'Developer',
      hireDate: new Date('2023-06-01'),
      salary: 60000.00,
    },
  });

  await prisma.leaveBalance.upsert({
    where: {
      employeeId_year: {
        employeeId: employeeUser.id,
        year: currentYear,
      },
    },
    update: {},
    create: {
      employeeId: employeeUser.id,
      year: currentYear,
      totalLeaves: 2,
      usedLeaves: 0,
    },
  });

  // Seed default app settings
  console.log('Seeding application settings...');
  const defaultSettings = [
    // Company
    { key: 'company.name', value: 'My Company', category: 'company', label: 'Company Name', description: 'Your organization name displayed across the application', dataType: 'string' },
    { key: 'company.timezone', value: 'Asia/Manila', category: 'company', label: 'Timezone', description: 'Default timezone for scheduling and reporting', dataType: 'string' },
    { key: 'company.currency', value: 'PHP', category: 'company', label: 'Currency', description: 'Currency used for salary and overtime calculations', dataType: 'string' },
    { key: 'company.work_hours_per_day', value: '8', category: 'company', label: 'Work Hours per Day', description: 'Standard number of working hours per day', dataType: 'number' },

    // Leave
    { key: 'leave.annual_allowance', value: '15', category: 'leave', label: 'Annual Leave Allowance', description: 'Default number of paid leave days per year for new employees', dataType: 'number' },
    { key: 'leave.types', value: 'Vacation,Sick,Personal,Emergency,Maternity,Paternity,Bereavement', category: 'leave', label: 'Leave Types', description: 'Comma-separated list of available leave types', dataType: 'string' },
    { key: 'leave.carry_over_enabled', value: 'false', category: 'leave', label: 'Carry-Over Enabled', description: 'Allow unused leave days to carry over to the next year', dataType: 'boolean' },
    { key: 'leave.max_carry_over_days', value: '5', category: 'leave', label: 'Max Carry-Over Days', description: 'Maximum number of unused leave days that can carry over', dataType: 'number' },
    { key: 'leave.require_approval', value: 'true', category: 'leave', label: 'Require Approval', description: 'Require manager/admin approval for leave requests', dataType: 'boolean' },
    { key: 'leave.min_advance_days', value: '3', category: 'leave', label: 'Minimum Advance Notice (days)', description: 'Minimum number of days in advance a leave request must be submitted', dataType: 'number' },

    // Schedule
    { key: 'schedule.default_shift', value: 'MORNING', category: 'schedule', label: 'Default Shift Type', description: 'Default shift assigned to new employees', dataType: 'string' },
    { key: 'schedule.work_week_start', value: '1', category: 'schedule', label: 'Work Week Starts On', description: 'Day the work week starts (0=Sunday, 1=Monday ... 6=Saturday)', dataType: 'number' },
    { key: 'schedule.default_break_minutes', value: '60', category: 'schedule', label: 'Default Break (minutes)', description: 'Default break duration in minutes per shift', dataType: 'number' },
    { key: 'schedule.auto_populate_on_hire', value: 'true', category: 'schedule', label: 'Auto-Populate on Hire', description: 'Automatically create default schedule when a new employee is hired', dataType: 'boolean' },

    // Overtime
    { key: 'overtime.max_monthly_hours', value: '40', category: 'overtime', label: 'Max Monthly OT Hours', description: 'Maximum allowed overtime hours per employee per month', dataType: 'number' },
    { key: 'overtime.rate_multiplier', value: '1.5', category: 'overtime', label: 'OT Rate Multiplier', description: 'Overtime pay multiplier (e.5 = time-and-a-half)', dataType: 'number' },
    { key: 'overtime.holiday_rate_multiplier', value: '2.0', category: 'overtime', label: 'Holiday OT Rate', description: 'Overtime pay multiplier for work on holidays', dataType: 'number' },
    { key: 'overtime.require_approval', value: 'true', category: 'overtime', label: 'Require Approval', description: 'Require manager/admin approval for overtime entries', dataType: 'boolean' },
  ];

  for (const setting of defaultSettings) {
    await (prisma as any).appSettings.upsert({
      where: { key: setting.key },
      update: {},  // Don't overwrite existing values
      create: setting,
    });
  }

  console.log('Database seeding completed successfully!');
  console.log('\nDefault users created:');
  console.log('  Admin: admin@team.com / admin123');
  console.log('  Manager: manager@team.com / manager123');
  console.log('  Employee: employee@team.com / employee123');
}

seed()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
