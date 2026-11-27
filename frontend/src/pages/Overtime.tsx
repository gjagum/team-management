import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api';
import { OvertimeRecord } from '../types';
import { formatDate, getStatusColor } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

const timeOf = (value: string) =>
  new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

export default function Overtime() {
  const { showNotification } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', description: '' });

  const isCompanyView = location.pathname.replace(/\/+$/, '').endsWith('/overtime/company');

  const fetchData = async () => {
    try {
      const url = isCompanyView ? '/overtime' : '/overtime/my-records';
      const response = await api.get<OvertimeRecord[]>(url);
      setRecords(response.data);
    } catch (error) {
      console.error('Failed to fetch overtime records:', error);
      showNotification('Failed to load overtime records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isCompanyView]);

  // Opened from a deep link with ?new=1 (kept for compatibility).
  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      await api.post('/overtime', {
        ...formData,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });
      setShowModal(false);
      setFormData({ date: '', startTime: '', endTime: '', description: '' });
      showNotification('Overtime application submitted', 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create overtime record', 'error');
    }
  };

  const handleApproveReject = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/overtime/${id}/approve`, { status });
      showNotification(`Overtime record ${status} successfully`, 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to update overtime record', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this overtime record?')) return;
    try {
      await api.delete(`/overtime/${id}`);
      showNotification('Overtime record cancelled', 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to cancel overtime record', 'error');
    }
  };

  const teamNames = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.employee?.team?.name).filter((n): n is string => Boolean(n))),
      ).sort(),
    [records],
  );

  const visibleRecords = useMemo(() => {
    return records.filter((r) => {
      if (isCompanyView && teamFilter !== 'ALL' && r.employee?.team?.name !== teamFilter) return false;
      const day = r.date.slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      return true;
    });
  }, [records, isCompanyView, teamFilter, fromDate, toDate]);

  useEffect(() => {
    setPage(1);
  }, [teamFilter, fromDate, toDate, isCompanyView]);

  const paged = visibleRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approvedHours = visibleRecords
    .filter((r) => r.status === 'APPROVED')
    .reduce((acc, curr) => acc + Number(curr.hours), 0);
  const pendingCount = visibleRecords.filter((r) => r.status === 'PENDING').length;

  const handleExport = () => {
    const header = isCompanyView
      ? ['Team', 'Name', 'Email', 'Date', 'Start Time', 'End Time', 'Hours', 'Reason', 'Status']
      : ['Date', 'Reason', 'Hours', 'Status'];
    const rows = visibleRecords.map((r) =>
      isCompanyView
        ? [
            r.employee?.team?.name ?? '',
            r.employee?.user.fullName ?? '',
            r.employee?.user.email ?? '',
            r.date.slice(0, 10),
            timeOf(r.startTime),
            timeOf(r.endTime),
            String(r.hours),
            r.description ?? '',
            r.status,
          ]
        : [r.date.slice(0, 10), r.description ?? '', String(r.hours), r.status],
    );
    const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overtime-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  const canViewCompany = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TEAM_LEADER';
  if (isCompanyView && !canViewCompany) {
    return <Navigate to="/overtime" replace />;
  }

  const companyTitle = user?.role === 'ADMIN' ? 'Company Overtime' : 'Team Overtime';
  const companyCaption =
    user?.role === 'ADMIN' ? 'Overtime records of all employees.' : 'Overtime records of your team.';

  const th = 'px-4 py-2.5 text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] whitespace-nowrap';
  const td = 'px-4 py-3 text-xs text-zinc-600 align-middle';

  const statCard = (label: string, value: string, accent: string, hint: string) => (
    <div className={`bg-surface-container-low p-6 rounded-xl flex flex-col justify-between h-32 border-b-4 ${accent}`}>
      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em]">{label}</span>
      <div className="flex items-end justify-between">
        <h3 className="text-4xl font-black text-on-surface tracking-tighter">{value}</h3>
        <span className="text-zinc-500 text-[10px] font-bold mb-1 uppercase tracking-wider">{hint}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            {isCompanyView ? companyTitle : 'Personal Overtime'}
          </h1>
          <p className="text-zinc-500 mt-1 max-w-md">
            {isCompanyView ? companyCaption : 'Overtime applications and records.'}
          </p>
        </div>
        {!isCompanyView && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-toolbar primary-gradient text-white shadow-lg shadow-primary/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Apply Overtime</span>
          </button>
        )}
      </div>


      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCard('Approved Hours', approvedHours.toFixed(1), 'border-primary/20', 'Validated')}
        {isCompanyView
          ? statCard('Pending Overtime Requests', String(pendingCount), 'border-amber-200', 'Awaiting')
          : statCard('Pending Review', String(pendingCount), 'border-amber-200', 'Awaiting')}
        {statCard('Total Records', String(visibleRecords.length), 'border-zinc-200', 'Logged')}
      </div>

      {/* Filters + export, directly above the list */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isCompanyView && (
            <label className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Team</span>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-1.5 bg-surface-container-low border-none rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="ALL">All teams</option>
                {teamNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 bg-surface-container-low border-none rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-surface-container-low border-none rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </label>
        </div>
        <button
          onClick={handleExport}
          className="btn-toolbar bg-violet-800 hover:bg-violet-900 text-white shadow-lg shadow-violet-900/20 active:scale-95"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50">
                {isCompanyView ? (
                  <>
                    <th className={th}>Team</th>
                    <th className={th}>Name</th>
                    <th className={th}>Date</th>
                    <th className={th}>Start Time</th>
                    <th className={th}>End Time</th>
                    <th className={th}>Hours</th>
                    <th className={th}>Reason</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-center`}>Action</th>
                  </>
                ) : (
                  <>
                    <th className={th}>Date</th>
                    <th className={th}>Reason</th>
                    <th className={th}>Hours</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-center`}>Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paged.map((record) => (
                <tr key={record.id} className="hover:bg-zinc-50 transition-colors duration-200">
                  {isCompanyView ? (
                    <>
                      <td className={`${td} whitespace-nowrap`}>{record.employee?.team?.name || '—'}</td>
                      <td className={`${td} font-bold text-on-surface whitespace-nowrap`}>
                        {record.employee?.user.fullName || '—'}
                      </td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(record.date)}</td>
                      <td className={`${td} whitespace-nowrap`}>{timeOf(record.startTime)}</td>
                      <td className={`${td} whitespace-nowrap`}>{timeOf(record.endTime)}</td>
                      <td className={`${td} font-bold text-on-surface whitespace-nowrap`}>{Number(record.hours)}h</td>
                      <td className={`${td} max-w-[14rem] truncate`} title={record.description || ''}>
                        {record.description || '—'}
                      </td>
                      <td className={td}>
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className={`${td} text-center whitespace-nowrap`}>
                        <div className="flex items-center justify-center gap-2">
                          {record.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApproveReject(record.id, 'approved')}
                                className="btn-action bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(record.id, 'rejected')}
                                className="btn-action bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(record.date)}</td>
                      <td className={`${td} max-w-[18rem] truncate`} title={record.description || ''}>
                        {record.description || '—'}
                      </td>
                      <td className={`${td} font-bold text-on-surface whitespace-nowrap`}>{Number(record.hours)}h</td>
                      <td className={td}>
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className={`${td} text-center whitespace-nowrap`}>
                        {record.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(record.id)}
                            className="btn-action bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {visibleRecords.length === 0 && (
                <tr>
                  <td colSpan={isCompanyView ? 9 : 5} className="px-6 py-10 text-center text-zinc-400 font-medium">
                    No overtime records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={visibleRecords.length} onPageChange={setPage} />
      </div>

      {/* Apply Overtime modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">Apply Overtime</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Reason
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
                  className="px-6 py-2.5 bg-surface-container-low text-zinc-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all"
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
