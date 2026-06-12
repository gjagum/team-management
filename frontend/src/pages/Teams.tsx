import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Team, Employee } from '../types';

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [memberTeam, setMemberTeam] = useState<Team | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamLeaderId: '' as string,
    alternateApproverId: '' as string,
  });

  useEffect(() => {
    fetchTeams();
    fetchEmployees();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await api.get<Team[]>('/teams');
      setTeams(response.data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get<Employee[]>('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        teamLeaderId: formData.teamLeaderId ? parseInt(formData.teamLeaderId) : null,
        alternateApproverId: formData.alternateApproverId ? parseInt(formData.alternateApproverId) : null,
      };
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, payload);
      } else {
        await api.post('/teams', payload);
      }
      setShowModal(false);
      setEditingTeam(null);
      setFormData({ name: '', description: '', teamLeaderId: '', alternateApproverId: '' });
      fetchTeams();
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save team');
    }
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      teamLeaderId: team.teamLeaderId?.toString() || '',
      alternateApproverId: team.alternateApproverId?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team? Members will be unassigned.')) return;
    try {
      await api.delete(`/teams/${id}`);
      fetchTeams();
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const handleManageMembers = (team: Team) => {
    setMemberTeam(team);
    setSelectedMemberIds(team.members.map((m) => m.id));
    setShowMembersModal(true);
  };

  const handleSaveMembers = async () => {
    if (!memberTeam) return;
    try {
      await api.post(`/teams/${memberTeam.id}/members`, { employeeIds: selectedMemberIds });
      setShowMembersModal(false);
      setMemberTeam(null);
      fetchTeams();
      fetchEmployees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update team members');
    }
  };

  const toggleMember = (employeeId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Teams</h1>
          <p className="text-stone-500 text-sm">Manage teams, assign leaders and members</p>
        </div>
        <button
          onClick={() => {
            setEditingTeam(null);
            setFormData({ name: '', description: '', teamLeaderId: '', alternateApproverId: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors text-sm font-medium"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Create Team
        </button>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-300 mb-4 block">group_work</span>
          <h3 className="text-lg font-semibold text-stone-700 mb-2">No teams yet</h3>
          <p className="text-stone-500">Create your first team to organize employees and manage approvals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900">{team.name}</h3>
                    {team.description && <p className="text-stone-500 text-sm mt-1">{team.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleManageMembers(team)}
                      className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Manage members"
                    >
                      <span className="material-symbols-outlined text-stone-500 text-lg">group</span>
                    </button>
                    <button
                      onClick={() => handleEdit(team)}
                      className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Edit team"
                    >
                      <span className="material-symbols-outlined text-stone-500 text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(team.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete team"
                    >
                      <span className="material-symbols-outlined text-red-500 text-lg">delete</span>
                    </button>
                  </div>
                </div>

                {/* Team Leader & Alternate */}
                <div className="space-y-3 mb-4">
                  {team.teamLeader && (
                    <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-3">
                      <span className="material-symbols-outlined text-red-700">badge</span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Team Leader</span>
                        <p className="text-sm font-medium text-stone-800">{team.teamLeader.user.fullName}</p>
                        <p className="text-xs text-stone-500">{team.teamLeader.user.email}</p>
                      </div>
                    </div>
                  )}
                  {team.alternateApprover && (
                    <div className="flex items-center gap-3 bg-blue-50 rounded-lg p-3">
                      <span className="material-symbols-outlined text-blue-600">person_alt</span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Alternate Approver</span>
                        <p className="text-sm font-medium text-stone-800">{team.alternateApprover.user.fullName}</p>
                        <p className="text-xs text-stone-500">{team.alternateApprover.user.email}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Members */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-stone-500 text-sm">people</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-stone-500">
                      Members ({team.members.length})
                    </span>
                  </div>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-stone-400 italic">No members assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {team.members.slice(0, 5).map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-2.5 py-1 rounded-full"
                        >
                          {member.user.fullName}
                        </span>
                      ))}
                      {team.members.length > 5 && (
                        <span className="text-xs text-stone-400 py-1">+{team.members.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Team Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none"
                  placeholder="e.g., Engineering, Marketing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none resize-none"
                  placeholder="Optional team description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Team Leader</label>
                <select
                  value={formData.teamLeaderId}
                  onChange={(e) => setFormData({ ...formData, teamLeaderId: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none"
                >
                  <option value="">None</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Alternate Approver</label>
                <select
                  value={formData.alternateApproverId}
                  onChange={(e) => setFormData({ ...formData, alternateApproverId: e.target.value })}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none"
                >
                  <option value="">None</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTeam(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                >
                  {editingTeam ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && memberTeam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-stone-200">
              <h2 className="text-lg font-bold text-stone-900">Manage Members - {memberTeam.name}</h2>
              <p className="text-sm text-stone-500">Select employees to assign to this team</p>
            </div>
            <div className="p-6 max-h-80 overflow-y-auto space-y-2">
              {employees.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-4">No employees available</p>
              ) : (
                employees.map((emp) => (
                  <label
                    key={emp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedMemberIds.includes(emp.id) ? 'bg-red-50 border border-red-200' : 'hover:bg-stone-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(emp.id)}
                      onChange={() => toggleMember(emp.id)}
                      className="rounded border-stone-300 text-red-700 focus:ring-red-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-stone-800">{emp.user.fullName}</p>
                      <p className="text-xs text-stone-500">
                        {emp.employeeCode} · {emp.department || 'No dept'} · {emp.position || 'No position'}
                      </p>
                    </div>
                    {memberTeam.teamLeaderId === emp.id && (
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        Leader
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            <div className="p-6 border-t border-stone-200 flex justify-between items-center">
              <span className="text-sm text-stone-500">{selectedMemberIds.length} member(s) selected</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowMembersModal(false);
                    setMemberTeam(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMembers}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors"
                >
                  Save Members
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
