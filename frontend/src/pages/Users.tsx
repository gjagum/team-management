import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { User as UserType } from '../types';
import { formatDate } from '../utils/helpers';
import Pagination from '../components/Pagination';

interface TeamOption {
  id: number;
  name: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activatingUser, setActivatingUser] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'EMPLOYEE',
    slackId: '',
    slackChannel: '',
    employeeCode: '',
    position: '',
    department: '',
    hireDate: '',
    salary: '',
    teamId: '',
    isActive: true,
  });
  const [activateData, setActivateData] = useState({
    department: '',
    position: '',
    hireDate: new Date().toISOString().split('T')[0],
    slackId: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get<UserType[]>('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await api.get<TeamOption[]>('/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const emptyForm = {
    email: '',
    password: '',
    fullName: '',
    role: 'EMPLOYEE',
    slackId: '',
    slackChannel: '',
    employeeCode: '',
    position: '',
    department: '',
    hireDate: '',
    salary: '',
    teamId: '',
    isActive: true,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          fullName: formData.fullName,
          role: formData.role,
          isActive: formData.isActive,
          slackId: formData.slackId,
          slackChannel: formData.slackChannel,
          employeeCode: formData.employeeCode || undefined,
          position: formData.position,
          department: formData.department,
          hireDate: formData.hireDate || undefined,
          salary: formData.salary === '' ? null : Number(formData.salary),
          teamId: formData.teamId ? Number(formData.teamId) : null,
        };
        if (formData.password) payload.password = formData.password;
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        const created = await api.post<UserType>('/users', {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          slackId: formData.slackId,
          slackChannel: formData.slackChannel,
          employeeCode: formData.employeeCode || undefined,
          position: formData.position,
          department: formData.department,
          hireDate: formData.hireDate || undefined,
          salary: formData.salary === '' ? null : Number(formData.salary),
        });
        // Team membership and status are set on the record created above.
        if (created.data?.id) {
          const patch: Record<string, unknown> = {};
          if (formData.teamId) patch.teamId = Number(formData.teamId);
          if (formData.isActive === false) patch.isActive = false;
          if (Object.keys(patch).length > 0) await api.put(`/users/${created.data.id}`, patch);
        }
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData(emptyForm);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  const handleActivateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingUser) return;
    try {
      await api.post(`/users/${activatingUser.id}/activate-employee`, activateData);
      setShowActivateModal(false);
      setActivatingUser(null);
      setActivateData({ department: '', position: '', hireDate: new Date().toISOString().split('T')[0], slackId: '' });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to activate employee');
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName,
      role: user.role,
      slackId: user.employee?.slackId || '',
      slackChannel: user.employee?.slackChannel || '',
      employeeCode: user.employee?.employeeCode || '',
      position: user.employee?.position || '',
      department: user.employee?.department || '',
      hireDate: user.employee?.hireDate ? user.employee.hireDate.split('T')[0] : '',
      salary: user.employee?.salary !== null && user.employee?.salary !== undefined ? String(user.employee.salary) : '',
      teamId: user.employee?.team?.id ? String(user.employee.team.id) : '',
      isActive: user.isActive !== false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this person? This removes their login and profile.')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const teamNames = useMemo(() => {
    const names = users.map((u) => u.employee?.team?.name).filter((n): n is string => Boolean(n));
    return Array.from(new Set(names)).sort();
  }, [users]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (teamFilter !== 'ALL' && u.employee?.team?.name !== teamFilter) return false;
      if (!term) return true;
      return (
        (u.employee?.employeeCode ?? '').toLowerCase().includes(term) ||
        u.fullName.toLowerCase().includes(term)
      );
    });
  }, [users, teamFilter, search]);

  const PAGE_SIZE = 10;
  const pagedUsers = visibleUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [teamFilter, search]);

  const csvCell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

  const handleExport = () => {
    const header = [
      'ID No.',
      'Name',
      'Date Hired',
      'Job Title',
      'Team',
      'Approver',
      'Email',
      'Role',
      'Slack Channel',
      'Slack ID',
      'Status',
      'Department',
      'Salary',
    ];
    const rows = visibleUsers.map((u) => [
      u.employee?.employeeCode ?? '',
      u.fullName,
      u.employee?.hireDate ? u.employee.hireDate.slice(0, 10) : '',
      u.employee?.position ?? '',
      u.employee?.team?.name ?? '',
      u.employee?.team?.teamLeader?.user?.fullName ?? '',
      u.email,
      u.role,
      u.employee?.slackChannel ?? '',
      u.employee?.slackId ?? '',
      u.isActive === false ? 'INACTIVE' : 'ACTIVE',
      u.employee?.department ?? '',
      u.employee?.salary !== null && u.employee?.salary !== undefined ? String(u.employee.salary) : '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => csvCell(String(c))).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): string[][] => {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    const src = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (quoted) {
        if (ch === '"' && src[i + 1] === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          quoted = false;
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        quoted = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && src[i + 1] === '\n') i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const table = parseCsv(await file.text());
      if (table.length < 2) {
        alert('That CSV has no data rows.');
        return;
      }
      const header = table[0].map((h) => h.trim().toLowerCase());
      const col = (...names: string[]) => {
        for (const n of names) {
          const i = header.indexOf(n);
          if (i >= 0) return i;
        }
        return -1;
      };
      const get = (row: string[], ...names: string[]) => {
        const i = col(...names);
        return i >= 0 ? (row[i] ?? '').trim() : '';
      };
      const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t.id]));
      const validRoles = ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'EMPLOYEE'];

      let created = 0;
      let updated = 0;
      const failures: string[] = [];

      for (const row of table.slice(1)) {
        const email = get(row, 'email', 'email address');
        if (!email) continue;
        const rawRole = (get(row, 'access level', 'role') || 'EMPLOYEE').toUpperCase().replace(/\s+/g, '_');
        const teamName = get(row, 'team');
        const status = (get(row, 'status') || 'ACTIVE').toUpperCase();
        const salary = get(row, 'salary');
        const payload: Record<string, unknown> = {
          fullName: get(row, 'name', 'full name') || email.split('@')[0],
          role: validRoles.includes(rawRole) ? rawRole : 'EMPLOYEE',
          employeeCode: get(row, 'employee id', 'id no.', 'employeecode') || undefined,
          position: get(row, 'job title', 'position'),
          department: get(row, 'department'),
          hireDate: get(row, 'date hired', 'hire date') || undefined,
          salary: salary ? Number(salary) : null,
          slackId: get(row, 'slack id', 'slackid'),
          slackChannel: get(row, 'slack channel', 'slackchannel'),
          teamId: teamName ? teamByName.get(teamName.toLowerCase()) ?? null : null,
          isActive: status !== 'INACTIVE',
        };

        const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        try {
          if (existing) {
            await api.put(`/users/${existing.id}`, payload);
            updated++;
          } else {
            const res = await api.post<UserType>('/users', {
              ...payload,
              email,
              password: get(row, 'password') || 'employee123',
            });
            if (res.data?.id) {
              await api.put(`/users/${res.data.id}`, {
                teamId: payload.teamId,
                isActive: payload.isActive,
              });
            }
            created++;
          }
        } catch (err: any) {
          failures.push(`${email}: ${err.response?.data?.error || err.message}`);
        }
      }

      await fetchUsers();
      alert(
        `Import finished.\nCreated: ${created}\nUpdated: ${updated}\nFailed: ${failures.length}` +
          (failures.length ? `\n\n${failures.slice(0, 5).join('\n')}` : ''),
      );
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-primary/10 text-primary',
      MANAGER: 'bg-amber-50 text-amber-700',
      TEAM_LEADER: 'bg-emerald-50 text-emerald-700',
      EMPLOYEE: 'bg-zinc-100 text-zinc-600',
    };
    return styles[role] || 'bg-zinc-100 text-zinc-600';
  };

  const th = 'px-4 py-2.5 text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] whitespace-nowrap';
  const td = 'px-4 py-3 text-xs text-zinc-600 align-middle';
  const toolbarButton =
    'w-36 h-10 rounded-lg inline-flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all active:scale-95';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
                <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
          Employees
        </h1>
        <p className="text-zinc-500 mt-1 max-w-xl">
          Manage employee profiles, roles and system access in one place.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-3 pl-5">
          <label className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Team</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-4 py-2 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">All teams</option>
              {teamNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-lg w-full sm:w-72">
            <span className="material-symbols-outlined text-zinc-400 text-lg">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID No. or name"
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
            }}
          />
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData(emptyForm);
              setShowModal(true);
            }}
            className={`${toolbarButton} primary-gradient text-white shadow-lg shadow-primary/20`}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>New User</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className={`${toolbarButton} bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50`}
          >
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={handleExport}
            className={`${toolbarButton} bg-violet-800 hover:bg-violet-900 text-white shadow-lg shadow-violet-900/20`}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* People table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className={th}>ID No.</th>
                <th className={th}>Name</th>
                <th className={th}>Date Hired</th>
                <th className={th}>Job Title</th>
                <th className={th}>Team</th>
                <th className={th}>Approver</th>
                <th className={th}>Email</th>
                <th className={th}>Role</th>
                <th className={th}>Slack Channel</th>
                <th className={th}>Slack ID</th>
                <th className={th}>Status</th>
                <th className={`${th} text-center`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pagedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 transition-colors duration-200 group">
                  <td className={`${td} font-bold text-primary whitespace-nowrap font-mono`}>
                    {user.employee?.employeeCode || '—'}
                  </td>
                  <td className={td}>
                    <span className="font-bold text-on-surface tracking-tight whitespace-nowrap">
                      {user.fullName}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {user.employee?.hireDate ? formatDate(user.employee.hireDate) : '—'}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{user.employee?.position || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>{user.employee?.team?.name || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {user.employee?.team?.teamLeader?.user?.fullName || '—'}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{user.email}</td>
                  <td className={td}>
                    <span
                      className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${getRoleBadge(
                        user.role,
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{user.employee?.slackChannel || '—'}</td>
                  <td className={`${td} font-mono whitespace-nowrap`}>{user.employee?.slackId || '—'}</td>
                  <td className={td}>
                    <span
                      className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${
                        user.isActive === false ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {user.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className={`${td} text-center whitespace-nowrap`}>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn-action bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn-action bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center text-zinc-400 font-medium">
                    No people in this team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={visibleUsers.length} onPageChange={setPage} />
      </div>

      {/* Create / edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                {editingUser ? 'Update Profile' : 'New Person'}
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                {editingUser ? 'Edit Person' : 'Add Person'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    placeholder="e.g. EMP-00007"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Access Level
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Date Hired
                  </label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Team
                  </label>
                  <select
                    value={formData.teamId}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">No team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Salary
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g. 45000"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Slack User ID
                </label>
                <input
                  type="text"
                  value={formData.slackId}
                  onChange={(e) => setFormData({ ...formData, slackId: e.target.value })}
                  placeholder="e.g. U12345678"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Slack Channel
                </label>
                <input
                  type="text"
                  value={formData.slackChannel}
                  onChange={(e) => setFormData({ ...formData, slackChannel: e.target.value })}
                  placeholder="e.g. #otp_timekeeping_test"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  {editingUser ? 'New Password (optional)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
                  Account active
                </span>
              </label>

              {editingUser && !editingUser.employee && (
                <button
                  type="button"
                  onClick={() => {
                    setActivatingUser(editingUser);
                    setActivateData({ department: '', position: '', hireDate: new Date().toISOString().split('T')[0], slackId: '' });
                    setShowModal(false);
                    setShowActivateModal(true);
                  }}
                  className="w-full px-4 py-3 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Activate employee profile
                </button>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-zinc-500 font-bold text-sm uppercase tracking-wider hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate employee modal */}
      {showActivateModal && activatingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                Employee Activation
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                Activate {activatingUser.fullName}
              </h2>
              <p className="text-zinc-500 text-sm mt-2">
                Create an employee profile to enable scheduling, leave management and payroll.
              </p>
            </div>
            <form onSubmit={handleActivateEmployee} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={activateData.department}
                  onChange={(e) => setActivateData({ ...activateData, department: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={activateData.position}
                  onChange={(e) => setActivateData({ ...activateData, position: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Date Hired
                </label>
                <input
                  type="date"
                  value={activateData.hireDate}
                  onChange={(e) => setActivateData({ ...activateData, hireDate: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Slack User ID
                </label>
                <input
                  type="text"
                  value={activateData.slackId}
                  onChange={(e) => setActivateData({ ...activateData, slackId: e.target.value })}
                  placeholder="e.g. U12345678"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowActivateModal(false);
                    setActivatingUser(null);
                  }}
                  className="px-5 py-2.5 rounded-lg text-zinc-500 font-bold text-sm uppercase tracking-wider hover:bg-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
