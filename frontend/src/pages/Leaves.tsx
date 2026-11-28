import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api.ts';
import { LeaveRequest, LeaveBalance, LeaveOverviewRow } from '../types/index.ts';
import { formatDate, getStatusColor } from '../utils/helpers.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import Pagination from '../components/Pagination.tsx';

type LeaveView = 'apply' | 'monitor';

const LEAVE_TYPE_LABEL: Record<string, string> = {
  VACATION: 'Paid Vacation Leave',
  ANNUAL: 'Paid Vacation Leave',
  SICK: 'Paid Sick Leave',
  UNPAID: 'Unpaid Leave',
  PERSONAL: 'Personal Leave',
};

const labelFor = (type: string) => LEAVE_TYPE_LABEL[String(type).toUpperCase()] || type;

export default function Leaves() {
  const { showNotification } = useNotification();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [overview, setOverview] = useState<LeaveOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [personalPage, setPersonalPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [teamFilter, setTeamFilter] = useState('ALL');
  const PAGE_SIZE = 10;
  const [formData, setFormData] = useState({
    leaveType: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // The sidebar drives the view: /leaves = Apply, /leaves/monitor = Monitor.
  const view: LeaveView = location.pathname.replace(/\/+$/, '').endsWith('/leaves/monitor')
    ? 'monitor'
    : 'apply';

  const canMonitor = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'TEAM_LEADER';
  const canApprove = canMonitor;

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

  const fetchOverview = React.useCallback(async (signal?: AbortSignal) => {
    if (!canMonitor) return;
    try {
      const res = await api.get<LeaveOverviewRow[]>('/leaves/overview', { signal });
      setOverview(res.data);
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.name === 'AbortError') return;
      console.error('Failed to fetch leave overview:', error);
    }
  }, [canMonitor]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    fetchOverview(controller.signal);
    return () => controller.abort();
  }, [fetchData, fetchOverview]);

  useEffect(() => {
    if ((location.state as { openNew?: boolean } | null)?.openNew) {
      setShowModal(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const vacation = balance?.types?.VACATION;
  const sick = balance?.types?.SICK;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      setShowModal(false);
      setFormData({ leaveType: 'VACATION', startDate: '', endDate: '', reason: '' });
      showNotification('Leave request submitted successfully', 'success');
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create leave request', 'error');
    }
  };

  const handleApproveReject = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/leaves/${id}/approve`, { status });
      showNotification(`Leave request ${status} successfully`, 'success');
      fetchData();
      fetchOverview();
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

  const handleExport = () => {
    const header = [
      'Name',
      'Email',
      'Paid Vacation Leave - Total Allocation',
      'Paid Vacation Leave - Used Days',
      'Paid Sick Leave - Total Allocation',
      'Paid Sick Leave - Used Days',
    ];
    const rows = overview.map((row) => [
      row.name,
      row.email,
      String(row.vacation.totalLeaves),
      String(row.vacation.usedLeaves),
      String(row.sick.totalLeaves),
      String(row.sick.usedLeaves),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => (/[",\r\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-allocations-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const myLeaves = useMemo(
    () =>
      canMonitor
        ? leaves
        : leaves.filter((l) => l.employeeId === user?.employee?.id),
    [leaves, canMonitor, user?.employee?.id],
  );

  const pagedLeaves = myLeaves.slice((personalPage - 1) * PAGE_SIZE, personalPage * PAGE_SIZE);

  const handleExportPersonal = () => {
    const header = ['Type', 'Start Date', 'End Date', 'Duration', 'Reason', 'Status'];
    const rows = myLeaves.map((l) => [
      labelFor(l.leaveType),
      l.startDate.slice(0, 10),
      l.endDate.slice(0, 10),
      Number(l.days).toFixed(2),
      l.reason ?? '',
      l.status,
    ]);
    const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personal-leave-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isAdmin = user?.role === 'ADMIN';
  const monitorTitle = isAdmin ? 'Company Leave' : 'Team Leave';
  const monitorCaption = isAdmin ? 'Leave balances of all employees.' : 'Leave balances of your team.';

  const teamNames = useMemo(
    () => Array.from(new Set(overview.map((r) => r.team).filter((t): t is string => Boolean(t)))).sort(),
    [overview],
  );
  const visibleOverview = useMemo(
    () => (teamFilter === 'ALL' ? overview : overview.filter((r) => r.team === teamFilter)),
    [overview, teamFilter],
  );
  const pagedOverview = visibleOverview.slice((companyPage - 1) * PAGE_SIZE, companyPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  // Employees can't open the allocation matrix.
  if (view === 'monitor' && !canMonitor) {
    return <Navigate to="/leaves" replace />;
  }

  const th = 'px-6 py-5 text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] whitespace-nowrap';
  const td = 'px-6 py-4 text-xs text-zinc-600 align-middle';
  // Company Leave table is denser than the request list.
  const mth = 'px-4 py-2 text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] whitespace-nowrap';
  const mtd = 'px-4 py-2 text-xs text-zinc-600';
  // Same footprint for the toolbar buttons; only the purple shade differs.
  const actionButton = 'btn-toolbar active:scale-95';

  const summaryCard = (label: string, value: string, accent: string) => (
    <div className={`bg-surface-container-low px-3 py-3 rounded-lg flex flex-col justify-between h-24 border-b-4 ${accent}`}>
      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] leading-tight">{label}</span>
      <h3 className="text-2xl font-black text-on-surface tracking-tighter">{value}</h3>
    </div>
  );

  const allocationSection = (
    title: string,
    data: { totalLeaves: number; usedLeaves: number; availableLeaves: number } | undefined,
  ) => (
    <div className="border border-zinc-200 rounded-xl p-5 bg-surface-container-lowest">
      <h2 className="text-base font-black text-on-surface tracking-tight mb-3">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {summaryCard('Total Allocation', Number(data?.totalLeaves ?? 0).toFixed(2), 'border-primary/20')}
        {summaryCard('Used Days', Number(data?.usedLeaves ?? 0).toFixed(2), 'border-amber-200')}
        {summaryCard('Available Days', Number(data?.availableLeaves ?? 0).toFixed(2), 'border-emerald-200')}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            {view === 'monitor' ? monitorTitle : 'Personal Leave'}
          </h1>
          <p className="text-zinc-500 mt-1 max-w-md">
            {view === 'monitor'
              ? monitorCaption
              : 'Leave application, balances and records.'}
          </p>
        </div>
        {view === 'apply' && (
          <button
            onClick={() => setShowModal(true)}
            className={`${actionButton} primary-gradient text-white shadow-lg shadow-primary/20`}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Apply Leave</span>
          </button>
        )}
      </div>

      {/* Sub-menu lives in the sidebar under Leave */}

      {view === 'apply' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allocationSection('Paid Vacation Leave', vacation)}
            {allocationSection('Paid Sick Leave', sick)}
          </div>

          {/* Applied leaves */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleExportPersonal}
              className={`${actionButton} bg-violet-800 hover:bg-violet-900 text-white shadow-lg shadow-violet-900/20`}
            >
              Export CSV
            </button>
          </div>

          <div className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
              <div className="max-h-[28rem] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-50">
                      <th className={th}>Type</th>
                      <th className={th}>Start Date</th>
                      <th className={th}>End Date</th>
                      <th className={th}>Duration</th>
                      <th className={th}>Reason</th>
                      <th className={th}>Status</th>
                      {canApprove && <th className={`${th} text-right`}>Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {pagedLeaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-zinc-50 transition-colors duration-200">
                        <td className={`${td} whitespace-nowrap font-medium text-on-surface`}>
                          {labelFor(leave.leaveType)}
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(leave.startDate)}</td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(leave.endDate)}</td>
                        <td className={`${td} whitespace-nowrap`}>
                          {Number(leave.days).toFixed(2)} day{Number(leave.days) !== 1 ? 's' : ''}
                        </td>
                        <td className={`${td} max-w-[16rem] truncate`} title={leave.reason || ''}>
                          {leave.reason || '—'}
                        </td>
                        <td className={td}>
                          <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded whitespace-nowrap ${getStatusColor(leave.status)}`}>
                            {leave.status}
                          </span>
                        </td>
                        {canApprove && (
                          <td className={`${td} text-center whitespace-nowrap`}>
                            <div className="flex items-center justify-center gap-2">
                              {leave.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleApproveReject(leave.id, 'approved')}
                                    className="btn-action bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleApproveReject(leave.id, 'rejected')}
                                    className="btn-action bg-red-50 text-red-600 hover:bg-red-100"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {leave.status === 'PENDING' && leave.employeeId === user?.employee?.id && (
                                <button
                                  onClick={() => handleCancel(leave.id)}
                                  className="btn-action bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {myLeaves.length === 0 && (
                      <tr>
                        <td colSpan={canApprove ? 7 : 6} className="px-6 py-12 text-center text-zinc-400 font-medium">
                          No leave requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={personalPage} pageSize={PAGE_SIZE} total={myLeaves.length} onPageChange={setPersonalPage} />
            </div>
          </div>

          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
            Displaying {myLeaves.length} Request{myLeaves.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {view === 'monitor' && canMonitor && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 pl-5">
              {isAdmin && (
                <label className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Team</span>
                  <select
                    value={teamFilter}
                    onChange={(e) => {
                      setTeamFilter(e.target.value);
                      setCompanyPage(1);
                    }}
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
              <p className="text-[11px] font-bold text-zinc-700 uppercase tracking-[0.15em]">
                {isAdmin ? 'No. of Employees' : 'No. of Members'}: {visibleOverview.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className={`${actionButton} bg-violet-800 hover:bg-violet-900 text-white shadow-lg shadow-violet-900/20`}
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50">
                    {isAdmin && <th className={mth} rowSpan={2}>Team</th>}
                    <th className={mth} rowSpan={2}>Name</th>
                    <th className={`${mth} text-center`} colSpan={2}>Paid Vacation Leave</th>
                    <th className={`${mth} text-center`} colSpan={2}>Paid Sick Leave</th>
                  </tr>
                  <tr className="bg-zinc-50">
                    <th className={`${mth} text-center`}>Total Allocation</th>
                    <th className={`${mth} text-center`}>Used Days</th>
                    <th className={`${mth} text-center`}>Total Allocation</th>
                    <th className={`${mth} text-center`}>Used Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {pagedOverview.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-zinc-50 transition-colors duration-200">
                      {isAdmin && <td className={`${mtd} whitespace-nowrap`}>{row.team || '—'}</td>}
                      <td className={`${mtd} font-bold text-on-surface whitespace-nowrap`}>{row.name}</td>
                      <td className={`${mtd} text-center`}>{Number(row.vacation.totalLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.vacation.usedLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.sick.totalLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.sick.usedLeaves).toFixed(2)}</td>
                    </tr>
                  ))}
                  {overview.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-8 text-center text-zinc-400 font-medium">
                        {isAdmin ? 'No employees yet.' : 'No employees are assigned to your team yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={companyPage} pageSize={PAGE_SIZE} total={visibleOverview.length} onPageChange={setCompanyPage} />
          </div>
        </div>
      )}

      {/* Apply Leave modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                Apply Leave
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
                  Type
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="VACATION">Paid Vacation Leave</option>
                  <option value="SICK">Paid Sick Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
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
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
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
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] block mb-2">
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
