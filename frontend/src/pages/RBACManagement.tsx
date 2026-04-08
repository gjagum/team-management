import React, { useEffect, useState } from 'react';
import api from '../services/api.ts';
import { Permission, RolePermission, RoleSummary, RBACSummary } from '../types/index.ts';

const ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const;
type Role = typeof ROLES[number];

export default function RBACManagement() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RBACSummary | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permForm, setPermForm] = useState({ name: '', description: '', resource: '', action: '' });
  const [activeTab, setActiveTab] = useState<'matrix' | 'permissions'>('matrix');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, permRes] = await Promise.all([
        api.get('/rbac/roles/summary'),
        api.get('/rbac/permissions'),
      ]);
      setSummary(summaryRes.data);
      setPermissions(permRes.data);
    } catch (error) {
      console.error('Failed to fetch RBAC data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rbac/permissions', permForm);
      setShowPermModal(false);
      setPermForm({ name: '', description: '', resource: '', action: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create permission');
    }
  };

  const handleDeletePermission = async (id: number) => {
    if (!confirm('Delete this permission? It will be removed from all roles.')) return;
    try {
      await api.delete(`/rbac/permissions/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete permission');
    }
  };

  const handleAssignPermission = async (role: Role, permissionId: number) => {
    try {
      await api.post('/rbac/role-permissions', { role, permissionId });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to assign permission');
    }
  };

  const handleRemovePermission = async (rolePermissionId: number) => {
    try {
      await api.delete(`/rbac/role-permissions/${rolePermissionId}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove permission');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const getRolePermissions = (role: Role) => {
    if (!summary) return [];
    return summary.roles.find((r: RoleSummary) => r.role === role)?.permissions || [];
  };

  const hasPermission = (role: Role, permId: number) => {
    return getRolePermissions(role).some((p: { permissionId: number }) => p.permissionId === permId);
  };

  const getRolePermissionEntry = (role: Role, permId: number) => {
    return getRolePermissions(role).find((p: { permissionId: number }) => p.permissionId === permId);
  };

  const groupedPermissions: Record<string, Permission[]> = {};
  permissions.forEach(p => {
    if (!groupedPermissions[p.resource]) groupedPermissions[p.resource] = [];
    groupedPermissions[p.resource].push(p);
  });

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Access Control
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Roles & Permissions
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Configure role-based access control, manage permissions, and define resource-level authorization rules.
          </p>
        </div>
        <button
          onClick={() => {
            setPermForm({ name: '', description: '', resource: '', action: '' });
            setShowPermModal(true);
          }}
          className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>New Permission</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'matrix'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Matrix View
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === 'permissions'
              ? 'bg-white text-red-700 shadow-sm'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          All Permissions
        </button>
      </div>

      {/* Matrix View */}
      {activeTab === 'matrix' && summary && (
        <div className="space-y-8">
          {summary.roles.map(({ role, permissions: rolePerms }: { role: Role; permissions: { id: number; permissionId: number; name: string; resource: string; action: string }[] }) => (
            <div key={role} className="bg-surface-container-lowest editorial-shadow rounded-xl overflow-hidden">
              <div className="px-8 py-5 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${
                    role === 'ADMIN' ? 'bg-primary/10 text-primary' :
                    role === 'MANAGER' ? 'bg-amber-50 text-amber-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    {role}
                  </span>
                  <span className="text-xs text-stone-400 font-medium">
                    {rolePerms.length} permission{rolePerms.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="p-8">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div key={resource} className="mb-6 last:mb-0">
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-3">
                      {resource}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {perms.map(perm => {
                        const entry = getRolePermissionEntry(role, perm.id);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              entry
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : 'bg-stone-50 text-stone-400 border border-stone-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {entry ? 'check_circle' : 'cancel'}
                            </span>
                            <span>{perm.name}</span>
                            {entry && (
                              <button
                                onClick={() => handleRemovePermission(entry.id)}
                                className="ml-1 p-0.5 hover:bg-green-100 rounded transition-colors"
                                title="Remove"
                              >
                                <span className="material-symbols-outlined text-xs">close</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {/* Assign new permission to role */}
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <select
                    className="px-3 py-2 bg-stone-50 rounded-lg text-xs font-medium text-stone-600 border border-stone-200 focus:ring-1 focus:ring-primary focus:outline-none"
                    defaultValue=""
                    onChange={(e) => {
                      const permId = parseInt(e.target.value);
                      if (permId) handleAssignPermission(role, permId);
                    }}
                  >
                    <option value="" disabled>+ Assign permission to {role}</option>
                    {permissions
                      .filter(p => !hasPermission(role, p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Permissions List */}
      {activeTab === 'permissions' && (
        <div className="bg-surface-container-low p-1 rounded-xl">
          <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50">
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Name</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Resource</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Action</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Description</th>
                  <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Roles</th>
                  <th className="px-8 py-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {permissions.map((perm) => {
                  const assignedRoles = ROLES.filter(role => hasPermission(role, perm.id));
                  return (
                    <tr key={perm.id} className="hover:bg-stone-50 transition-colors duration-200 group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-on-surface text-sm tracking-tight">{perm.name}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-block px-2 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded">
                          {perm.resource}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="inline-block px-2 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded">
                          {perm.action}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-stone-400">{perm.description || '—'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex gap-1">
                          {assignedRoles.map(role => (
                            <span key={role} className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                              role === 'ADMIN' ? 'bg-primary/10 text-primary' :
                              role === 'MANAGER' ? 'bg-amber-50 text-amber-700' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                              {role}
                            </span>
                          ))}
                          {assignedRoles.length === 0 && (
                            <span className="text-xs text-stone-300">Unassigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => handleDeletePermission(perm.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          {permissions.length} permission{permissions.length !== 1 ? 's' : ''} defined
        </p>
      </div>

      {/* Create Permission Modal */}
      {showPermModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                Define Permission
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                New Permission
              </h2>
            </div>
            <form onSubmit={handleCreatePermission} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={permForm.name}
                  onChange={(e) => setPermForm({ ...permForm, name: e.target.value })}
                  placeholder="e.g. users.read, leaves.approve"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    Resource
                  </label>
                  <input
                    type="text"
                    value={permForm.resource}
                    onChange={(e) => setPermForm({ ...permForm, resource: e.target.value })}
                    placeholder="e.g. users, leaves"
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    Action
                  </label>
                  <select
                    value={permForm.action}
                    onChange={(e) => setPermForm({ ...permForm, action: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="">Select action</option>
                    <option value="read">Read</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="approve">Approve</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={permForm.description}
                  onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPermModal(false)}
                  className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
