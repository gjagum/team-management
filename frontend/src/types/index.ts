export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  isActive?: boolean;
  employee?: {
    id: number;
    employeeCode: string;
    department: string;
    position: string;
    hireDate: string;
    salary: number;
  };
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  paidDays?: number;
  unpaidDays?: number;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewedBy: number | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    user: User;
  };
  approver?: {
    user: User;
  };
}

export interface OvertimeRecord {
  id: number;
  employeeId: number;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  description: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approvedBy: number | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    user: User;
  };
  approver?: {
    user: User;
  };
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  year: number;
  totalLeaves: number;
  usedLeaves: number;
  availableLeaves: number;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  createdAt: string;
}

export interface RolePermission {
  id: number;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  permissionId: number;
  createdAt: string;
  permission: Permission;
}

export interface RoleSummary {
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  permissions: {
    id: number;
    permissionId: number;
    name: string;
    resource: string;
    action: string;
  }[];
}

export interface RBACSummary {
  roles: RoleSummary[];
  allPermissions: Permission[];
}
