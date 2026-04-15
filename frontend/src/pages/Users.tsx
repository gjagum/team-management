import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User as UserType } from '../types';

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activatingUser, setActivatingUser] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'EMPLOYEE',
  });
  const [activateData, setActivateData] = useState({
    department: '',
    position: '',
    hireDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchUsers();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', fullName: '', role: 'EMPLOYEE' });
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
      setActivateData({ department: '', position: '', hireDate: new Date().toISOString().split('T')[0] });
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to activate contractor');
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName,
      role: user.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
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
      EMPLOYEE: 'bg-stone-100 text-stone-600',
    };
    return styles[role] || 'bg-stone-100 text-stone-600';
  };

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Access Control
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            User Registry
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Manage system access credentials, roles, and operational permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', password: '', fullName: '', role: 'EMPLOYEE' });
            setShowModal(true);
          }}
          className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>New User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Identity</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Email</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Access Level</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Contractor Profile</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors duration-200 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-on-surface text-lg tracking-tight">{user.fullName}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-stone-400 font-medium">{user.email}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {user.employee ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs font-bold text-green-700 uppercase">
                          {user.employee.employeeCode}
                        </span>
                        {user.employee.department && (
                          <span className="text-xs text-stone-400 ml-1">• {user.employee.department}</span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setActivatingUser(user);
                          setActivateData({ department: '', position: '', hireDate: new Date().toISOString().split('T')[0] });
                          setShowActivateModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        Activate as Contractor
                      </button>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-stone-300'}`}></span>
                      <span className={`text-xs font-bold uppercase ${user.isActive ? 'text-green-700' : 'text-stone-500'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          Displaying {users.length} User{users.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                {editingUser ? 'Edit Credentials' : 'Register Identity'}
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                {editingUser ? 'Update User' : 'New User'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Access Level
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="EMPLOYEE">Contractor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate Employee Modal */}
      {showActivateModal && activatingUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                Contractor Activation
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                Activate {activatingUser.fullName}
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                Create a contractor profile to enable scheduling, leave management, and payroll.
              </p>
            </div>
            <form onSubmit={handleActivateEmployee} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Department
                </label>
                <input
                  type="text"
                  value={activateData.department}
                  onChange={(e) => setActivateData({ ...activateData, department: e.target.value })}
                  placeholder="e.g. Engineering, Operations"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Position
                </label>
                <input
                  type="text"
                  value={activateData.position}
                  onChange={(e) => setActivateData({ ...activateData, position: e.target.value })}
                  placeholder="e.g. Software Engineer, Manager"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Hire Date
                </label>
                <input
                  type="date"
                  value={activateData.hireDate}
                  onChange={(e) => setActivateData({ ...activateData, hireDate: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowActivateModal(false); setActivatingUser(null); }}
                  className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
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
