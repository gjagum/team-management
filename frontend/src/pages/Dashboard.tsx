import { useEffect, useState } from 'react';
import api from '../services/api';
import { LeaveRequest, OvertimeRecord, LeaveBalance } from '../types';
import { formatDate, getStatusColor } from '../utils/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export default function Dashboard() {
  const { showNotification } = useNotification();
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [pendingOvertime, setPendingOvertime] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const [balanceRes, leavesRes, overtimeRes] = await Promise.all([
        api.get<LeaveBalance>(`/leaves/balance?year=${currentYear}`).catch(() => ({ data: null })),
        api.get<LeaveRequest[]>('/leaves/my-requests'),
        api.get<OvertimeRecord[]>('/overtime/my-records'),
      ]);

      setLeaveBalance(balanceRes.data);
      setPendingLeaves(leavesRes.data.filter(l => l.status === 'PENDING'));
      setPendingOvertime(overtimeRes.data.filter(o => o.status === 'PENDING'));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
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
      <div>
        <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
          Perspective & Control
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
          Corporate Intelligence
        </h1>
        <p className="text-stone-500 mt-2 max-w-md">
          High-level synthesis of organizational dynamics and real-time personnel transitions.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Leave Balance</span>
            <span className="material-symbols-outlined text-stone-300">calendar_today</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">
              {leaveBalance?.availableLeaves || 0}
            </h3>
            <span className="text-stone-500 text-xs font-bold mb-2">
              of {leaveBalance?.totalLeaves || 0} days
            </span>
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Pending Leaves</span>
            <span className="material-symbols-outlined text-stone-300">pending_actions</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">
              {pendingLeaves.length}
            </h3>
            <span className="text-amber-600 text-xs font-bold mb-2">Awaiting Review</span>
          </div>
        </div>

        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Overtime Hours</span>
            <span className="material-symbols-outlined text-stone-300">schedule</span>
          </div>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-primary tracking-tighter">
              {pendingOvertime.reduce((acc, curr) => acc + Number(curr.hours), 0).toFixed(1)}
            </h3>
            <span className="text-primary text-xs font-bold mb-2">
              {pendingOvertime.length} Records
            </span>
          </div>
        </div>
      </div>

      {/* Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-black text-on-surface tracking-tighter mb-6">
            Recent Activity
          </h2>
          <div className="bg-surface-container-lowest editorial-shadow rounded-xl overflow-hidden">
            {pendingLeaves.length === 0 && pendingOvertime.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-stone-300 text-5xl mb-4 block">inbox</span>
                <p className="text-stone-400 font-medium">No pending activity</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingLeaves.slice(0, 4).map((leave) => (
                  <div key={`leave-${leave.id}`} className="flex items-center gap-4 px-8 py-5 hover:bg-stone-50 transition-colors duration-200">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary text-lg">event_busy</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface tracking-tight">
                        <span className="italic text-stone-500">requested </span>
                        {leave.leaveType}
                      </p>
                      <p className="text-xs text-stone-400 font-medium mt-0.5">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
                {pendingOvertime.slice(0, 3).map((overtime) => (
                  <div key={`ot-${overtime.id}`} className="flex items-center gap-4 px-8 py-5 hover:bg-stone-50 transition-colors duration-200">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-purple-600 text-lg">schedule</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface tracking-tight">
                        <span className="italic text-stone-500">logged </span>
                        {overtime.hours}h overtime
                      </p>
                      <p className="text-xs text-stone-400 font-medium mt-0.5">
                        {formatDate(overtime.date)} · {overtime.description || 'No description'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${getStatusColor(overtime.status)}`}>
                      {overtime.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Center */}
        <div>
          <h2 className="text-2xl font-black text-on-surface tracking-tighter mb-6">
            Action Center
          </h2>
          <div className="space-y-4">
            <a
              href="/leaves"
              className="block bg-primary primary-gradient rounded-xl p-6 text-white hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 group"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Request</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-black">New Leave</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
            </a>

            <a
              href="/overtime"
              className="block bg-surface-container-lowest editorial-shadow rounded-xl p-6 hover:shadow-editorial-lg transition-all duration-300 group"
            >
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Record</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-black text-on-surface">Log Overtime</span>
                <span className="material-symbols-outlined text-stone-400 group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
              </div>
            </a>

            <a
              href="/schedules"
              className="block bg-surface-container-lowest editorial-shadow rounded-xl p-6 hover:shadow-editorial-lg transition-all duration-300 group"
            >
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">View</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xl font-black text-on-surface">Schedules</span>
                <span className="material-symbols-outlined text-stone-400 group-hover:text-primary group-hover:translate-x-1 transition-all">arrow_forward</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
