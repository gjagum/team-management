import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { User as UserType } from '../types';
import { formatDate } from '../utils/helpers';

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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'EMPLOYEE',
    slackId: '',
    position: '',
    hireDate: '',
    teamId: '',
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
    position: '',
    hireDate: '',
    teamId: '',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          fullName: formData.fullName,
          role: formData.role,
          slackId: formData.slackId,
          position: formData.position,
          hireDate: formData.hireDate || undefined,
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
          position: formData.position,
          hireDate: formData.hireDate || undefined,
        });
        // Team membership is set on the employee record created above.
        if (formData.teamId && created.data?.id) {
          await api.put(`/users/${created.data.id}`, { teamId: Number(formData.teamId) });
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
      position: user.employee?.position || '',
      hireDate: user.employee?.hireDate ? user.employee.hireDate.split('T')[0] : '',
      teamId: user.employee?.team?.id ? String(user.employee.team.id) : '',
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
    if (teamFilter === 'ALL') return users;
    return users.filter((u) => u.employee?.team?.name === teamFilter);
  }, [users, teamFilter]);

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

  const th = 'px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap';
  const td = 'px-6 py-5 text-xs text-zinc-600 align-middle';

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div>
        <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
          Workforce
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
          People &amp; Access
        </h1>
        <p className="text-zinc-500 mt-2 max-w-xl">
          Manage employee profiles, roles and system access in one place.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <label className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Team</span>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="ALL">All teams</option>
            {teamNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => {
            setEditingUser(null);
            setFormData(emptyForm);
            setShowModal(true);
          }}
          className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>New User</span>
        </button>
      </div>

      {/* People table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                <th className={th}>Employee ID</th>
                <th className={th}>Name</th>
                <th className={th}>Date Hired</th>
                <th className={th}>Team</th>
                <th className={th}>Job Title</th>
                <th className={th}>Supervisor</th>
                <th className={th}>Email</th>
                <th className={th}>Slack ID</th>
                <th className={th}>Access Level</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visibleUsers.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50 transition-colors duration-200 group">
                  <td className={`${td} font-bold text-primary whitespace-nowrap font-mono`}>
                    {user.employee?.employeeCode || '—'}
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 font-bold group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-on-surface tracking-tight whitespace-nowrap">
                        {user.fullName}
                      </span>
                    </div>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    {user.employee?.hireDate ? formatDate(user.employee.hireDate) : '—'}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{user.employee?.team?.name || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>{user.employee?.position || '—'}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {user.employee?.team?.teamLeader?.user?.fullName || '—'}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{user.email}</td>
                  <td className={`${td} font-mono whitespace-nowrap`}>{user.employee?.slackId || '—'}</td>
                  <td className={td}>
                    <span
                      className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${getRoleBadge(
                        user.role,
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={td}>
                    <span
                      className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${
                        user.isActive === false ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {user.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                  <td className={`${td} text-right whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
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
