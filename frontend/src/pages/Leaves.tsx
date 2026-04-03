import React, { useEffect, useState } from 'react';
import api from '../services/api.ts';
import { LeaveRequest, LeaveBalance } from '../types/index.ts';
import { formatDate, getStatusColor } from '../utils/helpers.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';

export default function Leaves() {
  const { showNotification } = useNotification();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const { user } = useAuth();

  const fetchData = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const currentYear = new Date().getFullYear();
      const [leavesRes, balanceRes] = await Promise.all([
        api.get<LeaveRequest[]>('/leaves', { signal }),
        api.get<LeaveBalance>(`/leaves/balance?year=${currentYear}`, { signal }).catch(() => ({ data: null })),
      ]);
      setLeaves(leavesRes.data);
      setBalance(balanceRes.data);
    } catch (error: any) {
      if (error.name === 'CanceledError' || error.name === 'AbortError') return;
      console.error('Failed to fetch leaves:', error);
      showNotification('Failed to load leave records', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      setShowModal(false);
      setFormData({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      showNotification('Leave request submitted successfully', 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create leave request', 'error');
    }
  };

  const handleApproveReject = async (id: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await api.patch(`/leaves/${id}/approve`, { status, reviewNotes: notes });
      showNotification(`Leave request ${status} successfully`, 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update leave request', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await api.delete(`/leaves/${id}`);
      showNotification('Leave request cancelled', 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to cancel leave request', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Authorization Matrix
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Leave Requests
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Review and manage personnel time-off allocations across the organization.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>New Request</span>
        </button>
      </div>

      {/* Balance Card */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-primary/20">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Available Days</span>
            <div className="flex items-end justify-between">
              <h3 className="text-5xl font-black text-on-surface tracking-tighter">{Number(balance.availableLeaves).toFixed(2)}</h3>
              <span className="text-green-600 text-xs font-bold mb-2">Remaining</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-stone-300">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Used Days</span>
            <div className="flex items-end justify-between">
              <h3 className="text-5xl font-black text-on-surface tracking-tighter">{Number(balance.usedLeaves).toFixed(2)}</h3>
              <span className="text-stone-500 text-xs font-bold mb-2">Consumed</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-primary/20">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Total Allocation</span>
            <div className="flex items-end justify-between">
              <h3 className="text-5xl font-black text-primary tracking-tighter">{Number(balance.totalLeaves).toFixed(2)}</h3>
              <span className="text-primary text-xs font-bold mb-2">Annual</span>
            </div>
          </div>
        </div>
      )}

      {/* Leave Table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Employee</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Category</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Period</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Duration</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {leaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-stone-50 transition-colors duration-200 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {leave.employee?.user.fullName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <p className="font-bold text-on-surface tracking-tight">
                        {leave.employee?.user.fullName}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded">
                      {leave.leaveType}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-700 font-medium text-sm">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-on-surface">{Number(leave.days).toFixed(2)} day{Number(leave.days) !== 1 ? 's' : ''}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {leave.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                        <>
                          <button
                            onClick={() => handleApproveReject(leave.id, 'approved')}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 hover:text-green-800 transition-colors"
                            title="Approve"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </button>
                          <button
                            onClick={() => handleApproveReject(leave.id, 'rejected')}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-800 transition-colors"
                            title="Reject"
                          >
                            <span className="material-symbols-outlined text-lg">cancel</span>
                          </button>
                        </>
                      )}
                      {leave.status === 'PENDING' && leave.employeeId === user?.employee?.id && (
                        <button
                          onClick={() => handleCancel(leave.id)}
                          className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-red-700 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      )}
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
          Displaying {leaves.length} Request{leaves.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                New Authorization
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                Leave Request
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Leave Category
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="PERSONAL">Personal Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>
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
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
