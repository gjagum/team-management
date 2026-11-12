export interface User {
  id: number;
  email: string;
  fullName: string;
  role: "ADMIN" | "MANAGER" | "TEAM_LEADER" | "EMPLOYEE";
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

export interface Employee {
  id: number;
  userId: number;
  employeeCode: string;
  department: string | null;
  position: string | null;
  hireDate: string;
  salary: number | null;
  slackId: string | null;
  team?: { id: number; name: string } | null;
  user: User;
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  type: "CONTRACT" | "GOVERNMENT_ID" | "TAX_FORM" | "CERTIFICATE" | "OTHER";
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: "ACTIVE" | "ARCHIVED" | "EXPIRED";
  notes: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTask {
  id: number;
  employeeId: number;
  taskName: string;
  category: string | null;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: number | null;
  sortOrder: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingProgress {
  total: number;
  completed: number;
  required: number;
  requiredCompleted: number;
}

export interface OnboardingResponse {
  tasks: OnboardingTask[];
  progress: OnboardingProgress;
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
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
  role: "ADMIN" | "MANAGER" | "TEAM_LEADER" | "EMPLOYEE";
  permissionId: number;
  createdAt: string;
  permission: Permission;
}

export interface RoleSummary {
  role: "ADMIN" | "MANAGER" | "TEAM_LEADER" | "EMPLOYEE";
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

export interface TeamMember {
  id: number;
  userId: number;
  employeeCode: string;
  department: string | null;
  position: string | null;
  hireDate: string;
  salary: number | null;
  slackId: string | null;
  teamId: number | null;
  user: {
    id: number;
    fullName: string;
    email: string;
    role: string;
  };
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  teamLeaderId: number | null;
  alternateApproverId: number | null;
  createdAt: string;
  updatedAt: string;
  teamLeader: TeamMember | null;
  alternateApprover: TeamMember | null;
  members: TeamMember[];
}
