import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../services/api.ts';
import { LeaveRequest, LeaveBalance, LeaveOverviewRow } from '../types/index.ts';
import { formatDate, getStatusColor } from '../utils/helpers.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';

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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
      const byEmail = new Map(overview.map((r) => [r.email.toLowerCase(), r]));

      let updated = 0;
      const failures: string[] = [];
      for (const row of table.slice(1)) {
        const email = get(row, 'email', 'email address');
        const target = email ? byEmail.get(email.toLowerCase()) : undefined;
        if (!target) {
          if (email) failures.push(`${email}: not found`);
          continue;
        }
        const vacationTotal = get(row, 'paid vacation leave - total allocation', 'vacation total', 'vacation');
        const sickTotal = get(row, 'paid sick leave - total allocation', 'sick total', 'sick');
        try {
          if (vacationTotal !== '') {
            await api.put(`/leaves/allocations/${target.employeeId}`, {
              leaveType: 'VACATION',
              totalLeaves: Number(vacationTotal),
            });
          }
          if (sickTotal !== '') {
            await api.put(`/leaves/allocations/${target.employeeId}`, {
              leaveType: 'SICK',
              totalLeaves: Number(sickTotal),
            });
          }
          updated++;
        } catch (err: any) {
          failures.push(`${email}: ${err.response?.data?.error || err.message}`);
        }
      }

      await fetchOverview();
      alert(
        `Import finished.\nUpdated: ${updated}\nFailed: ${failures.length}` +
          (failures.length ? `\n\n${failures.slice(0, 5).join('\n')}` : ''),
      );
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const myLeaves = useMemo(
    () =>
      canMonitor
        ? leaves
        : leaves.filter((l) => l.employeeId === user?.employee?.id),
    [leaves, canMonitor, user?.employee?.id],
  );

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

  const th = 'px-6 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap';
  const td = 'px-6 py-4 text-xs text-zinc-600 align-middle';
  // Company Leave table is denser than the request list.
  const mth = 'px-4 py-2 text-[10px] font-black text-zinc-700 uppercase tracking-[0.12em] whitespace-nowrap';
  const mtd = 'px-4 py-2 text-xs text-zinc-600';
  // Same footprint for the three action buttons; only the purple shade differs.
  const actionButton =
    'w-44 h-11 rounded-lg inline-flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95';

  const summaryCard = (label: string, value: string, accent: string) => (
    <div className={`bg-surface-container-low px-3 py-3 rounded-lg flex flex-col justify-between h-24 border-b-4 ${accent}`}>
      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.1em] leading-tight">{label}</span>
      <h3 className="text-2xl font-black text-on-surface tracking-tighter">{value}</h3>
    </div>
  );

  const allocationSection = (
    title: string,
    data: { totalLeaves: number; usedLeaves: number; availableLeaves: number } | undefined,
  ) => (
    <div className="border border-zinc-200 rounded-xl p-5 bg-surface-container-lowest">
      <h2 className="text-base font-black text-on-surface tracking-tight mb-4">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {summaryCard('Total Allocation', Number(data?.totalLeaves ?? 0).toFixed(2), 'border-primary/20')}
        {summaryCard('Used Days', Number(data?.usedLeaves ?? 0).toFixed(2), 'border-amber-200')}
        {summaryCard('Available Days', Number(data?.availableLeaves ?? 0).toFixed(2), 'border-emerald-200')}
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            {view === 'monitor' ? 'Company Leave' : 'My Leave'}
          </h1>
          <p className="text-zinc-500 mt-2 max-w-md">
            {view === 'monitor'
              ? 'Leave balances of all employees.'
              : 'Leave balances, application, and records.'}
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
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allocationSection('Paid Vacation Leave', vacation)}
            {allocationSection('Paid Sick Leave', sick)}
          </div>

          {/* Applied leaves */}
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
                    {myLeaves.map((leave) => (
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
                          <td className={`${td} text-right whitespace-nowrap`}>
                            <div className="flex items-center justify-end gap-2">
                              {leave.status === 'PENDING' && (
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
                                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-red-700 hover:bg-zinc-100 rounded-lg transition-colors"
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
            <p className="pl-5 text-[11px] font-bold text-zinc-700 uppercase tracking-[0.15em]">
              No. of Employees: {overview.length}
            </p>
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
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className={`${actionButton} bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50`}
              >
                {importing ? 'Importing…' : 'Import CSV'}
              </button>
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
                  {overview.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-zinc-50 transition-colors duration-200">
                      <td className={`${mtd} font-bold text-on-surface whitespace-nowrap`}>{row.name}</td>
                      <td className={`${mtd} text-center`}>{Number(row.vacation.totalLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.vacation.usedLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.sick.totalLeaves).toFixed(2)}</td>
                      <td className={`${mtd} text-center`}>{Number(row.sick.usedLeaves).toFixed(2)}</td>
                    </tr>
                  ))}
                  {overview.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-400 font-medium">
                        No employees yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
