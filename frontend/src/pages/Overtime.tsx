import { useEffect, useState } from 'react';
import api from '../services/api';
import { OvertimeRecord } from '../types';
import { formatDate, formatDateTime, getStatusColor } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';

export default function Overtime() {
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    description: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get<OvertimeRecord[]>('/overtime');
      setOvertimeRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch overtime records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/overtime', formData);
      setShowModal(false);
      setFormData({ date: '', startTime: '', endTime: '', description: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create overtime record');
    }
  };

  const handleApproveReject = async (id: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await api.patch(`/overtime/${id}/approve`, { status, approvalNotes: notes });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update overtime record');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this overtime record?')) return;
    try {
      await api.delete(`/overtime/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to cancel overtime record');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const totalApprovedHours = overtimeRecords
    .filter(r => r.status === 'APPROVED')
    .reduce((acc, curr) => acc + curr.hours, 0);

  const pendingCount = overtimeRecords.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Workforce Analytics
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Overtime Ledger
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Track, authorize, and analyze extended work hours across all personnel.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          <span>New Record</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-primary/20">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Approved Hours</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">{totalApprovedHours.toFixed(1)}</h3>
            <span className="text-green-600 text-xs font-bold mb-2">Validated</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-amber-200">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Pending Review</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">{pendingCount}</h3>
            <span className="text-amber-600 text-xs font-bold mb-2">Awaiting</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-40 border-b-4 border-stone-300">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Total Records</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-primary tracking-tighter">{overtimeRecords.length}</h3>
            <span className="text-stone-500 text-xs font-bold mb-2">Logged</span>
          </div>
        </div>
      </div>

      {/* Overtime Table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Personnel</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Time Block</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Hours</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Description</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {overtimeRecords.map((record) => (
                <tr key={record.id} className="hover:bg-stone-50 transition-colors duration-200 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-sm group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {record.employee?.user.fullName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <p className="font-bold text-on-surface tracking-tight">
                        {record.employee?.user.fullName}
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-700 font-medium text-sm">{formatDate(record.date)}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-500 text-sm font-medium">
                      {formatDateTime(record.startTime).split(' ')[1]} - {formatDateTime(record.endTime).split(' ')[1]}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-on-surface text-lg tracking-tight">{record.hours}h</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-500 text-sm font-medium italic max-w-xs truncate">
                      {record.description || '—'}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {record.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleApproveReject(record.id, 'approved')}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600 hover:text-green-800 transition-colors"
                            title="Approve"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                          </button>
                          <button
                            onClick={() => handleApproveReject(record.id, 'rejected')}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 hover:text-red-800 transition-colors"
                            title="Reject"
                          >
                            <span className="material-symbols-outlined text-lg">cancel</span>
                          </button>
                        </>
                      )}
                      {record.status === 'PENDING' && record.employeeId === user?.id && (
                        <button
                          onClick={() => handleCancel(record.id)}
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
          Displaying {overtimeRecords.length} Record{overtimeRecords.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">
                Time Registry
              </span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                New Overtime Record
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
