import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Schedule {
  id: number;
  employeeId: number;
  date: string;
  shiftType: 'MORNING' | 'AFTERNOON' | 'NIGHT' | 'CUSTOM';
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  employee?: {
    id: number;
    user: { id: number; fullName: string; email?: string };
  };
}

interface DefaultScheduleDay {
  dayOfWeek: number;
  shiftType: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isOff: boolean;
}

interface Employee {
  id: number;
  userId: number;
  employeeCode: string;
  department?: string;
  user: { id: number; fullName: string };
}

const SHIFT_PRESETS: Record<string, { start: string; end: string; label: string; color: string; badge: string }> = {
  MORNING: { start: '06:00', end: '14:00', label: 'Morning', color: 'bg-amber-100 text-amber-800 border-amber-200', badge: 'bg-amber-500' },
  AFTERNOON: { start: '14:00', end: '22:00', label: 'Afternoon', color: 'bg-blue-100 text-blue-800 border-blue-200', badge: 'bg-blue-500' },
  NIGHT: { start: '22:00', end: '06:00', label: 'Night', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', badge: 'bg-indigo-500' },
  CUSTOM: { start: '09:00', end: '17:00', label: 'Custom', color: 'bg-gray-100 text-gray-800 border-gray-200', badge: 'bg-gray-500' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getMonthDates(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function Schedules() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDefaultsModal, setShowDefaultsModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; date: string } | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    shiftType: 'MORNING' as string,
    startTime: '06:00',
    endTime: '14:00',
    breakMinutes: 60,
    notes: '',
  });

  // Default schedule form
  const [defaultDays, setDefaultDays] = useState<DefaultScheduleDay[]>(
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      shiftType: 'MORNING',
      startTime: '06:00',
      endTime: '14:00',
      breakMinutes: 60,
      isOff: i === 0 || i === 6, // Weekends off by default
    }))
  );

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthDates = getMonthDates(currentYear, currentMonth);
  const weekDates = getWeekDates(currentDate);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let startDate: string, endDate: string;
      if (viewMode === 'month') {
        startDate = formatDateKey(new Date(currentYear, currentMonth, 1));
        endDate = formatDateKey(new Date(currentYear, currentMonth + 1, 0));
      } else {
        startDate = formatDateKey(weekDates[0]);
        endDate = formatDateKey(weekDates[6]);
      }

      const [scheduleRes, empRes] = await Promise.all([
        api.get<Schedule[]>(`/schedules?startDate=${startDate}&endDate=${endDate}`),
        isAdmin 
          ? api.get<Employee[]>('/employees') 
          : api.get<Employee>(`/employees/me`).then(res => ({ data: [res.data] as Employee[] })).catch(() => ({ data: [] as Employee[] })),
      ]);

      setSchedules(scheduleRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error('Failed to fetch schedule data:', error);
      showNotification('Failed to load schedule data', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode, isAdmin, currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Navigation
  const navigate = (direction: number) => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setDate(next.getDate() + direction * 7);
    }
    setCurrentDate(next);
  };

  // Add shift
  const openAddModal = (employeeId: number, date: string) => {
    setSelectedCell({ employeeId, date });
    setFormData({ shiftType: 'MORNING', startTime: '06:00', endTime: '14:00', breakMinutes: 60, notes: '' });
    setShowAddModal(true);
  };

  const handleShiftTypeChange = (type: string) => {
    const preset = SHIFT_PRESETS[type];
    setFormData({ ...formData, shiftType: type, startTime: preset.start, endTime: preset.end });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCell) return;
    try {
      await api.post('/schedules', { employeeId: selectedCell.employeeId, date: selectedCell.date, ...formData });
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to create schedule', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule entry?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to delete schedule', 'error');
    }
  };

  // Default schedule
  const openDefaultsModal = async (employeeId: number) => {
    setSelectedEmployeeId(employeeId);
    try {
      const res = await api.get(`/schedules/defaults/${employeeId}`);
      if (res.data.length > 0) {
        const existing = res.data;
        const merged = Array.from({ length: 7 }, (_, i) => {
          const found = existing.find((d: DefaultScheduleDay) => d.dayOfWeek === i);
          return found || { dayOfWeek: i, shiftType: 'MORNING', startTime: '06:00', endTime: '14:00', breakMinutes: 60, isOff: i === 0 || i === 6 };
        });
        setDefaultDays(merged);
      } else {
        setDefaultDays(Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i, shiftType: 'MORNING', startTime: '06:00', endTime: '14:00', breakMinutes: 60, isOff: i === 0 || i === 6,
        })));
      }
    } catch {
      console.error('Failed to load defaults');
    }
    setShowDefaultsModal(true);
  };

  const updateDefaultDay = (dayOfWeek: number, field: string, value: any) => {
    setDefaultDays(prev => prev.map(d => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      if (field === 'shiftType') {
        const preset = SHIFT_PRESETS[value];
        return { ...d, shiftType: value, startTime: preset.start, endTime: preset.end };
      }
      return { ...d, [field]: value };
    }));
  };

  const handleSaveDefaults = async (applyToMonth = false) => {
    if (!selectedEmployeeId) return;
    try {
      await api.put(`/schedules/defaults/${selectedEmployeeId}`, { days: defaultDays });

      if (applyToMonth) {
        const monthName = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const empName = employees.find(e => e.id === selectedEmployeeId)?.user.fullName || 'this employee';
        if (confirm(`Update all ${monthName} schedules for ${empName} to match these new defaults?\n\nThis will overwrite existing entries and remove schedules for days marked as Off.`)) {
          await api.post('/schedules/auto-populate', {
            employeeId: selectedEmployeeId,
            year: currentYear,
            month: currentMonth + 1,
            overwrite: true,
          });
        }
      }

      setShowDefaultsModal(false);
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to save defaults', 'error');
    }
  };

  // Auto-populate
  const handleAutoPopulate = async (employeeId?: number, overwrite = false) => {
    const monthName = new Date(currentYear, currentMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const target = employeeId
      ? employees.find(e => e.id === employeeId)?.user.fullName || 'this employee'
      : 'all employees';

    const message = overwrite
      ? `Update ${monthName} schedules for ${target}?\n\nThis will overwrite ALL existing entries with defaults.`
      : `Auto-fill ${monthName} schedules for ${target}?\n\nThis will fill empty days only. Existing entries won't be overwritten.`;

    if (!confirm(message)) return;

    try {
      if (employeeId) {
        const res = await api.post('/schedules/auto-populate', { employeeId, year: currentYear, month: currentMonth + 1, overwrite });
        alert(`${overwrite ? 'Updated' : 'Created'} ${res.data.populated} schedule entries!`);
      } else {
        const res = await api.post('/schedules/auto-populate-all', { year: currentYear, month: currentMonth + 1, overwrite });
        alert(`${overwrite ? 'Updated' : 'Created'} ${res.data.populated} schedule entries for all contractors!`);
      }
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.error || 'Failed to auto-populate', 'error');
    }
  };

  const getScheduleForCell = (employeeId: number, date: string): Schedule | undefined => {
    return schedules.find(s => s.employeeId === employeeId && s.date.startsWith(date));
  };

  // Header labels
  const headerLabel = viewMode === 'month'
    ? currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
    </div>
  );

  const displayEmployees = employees;

  // Month view: build calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarCells: (Date | null)[] = Array(firstDayOfMonth).fill(null).concat(monthDates);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const displayDates = viewMode === 'month' ? monthDates : weekDates;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Operations Grid
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">Schedules</h1>
          <p className="text-stone-500 mt-2 max-w-md">Manage shifts and workforce allocation across the organization.</p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => handleAutoPopulate()}
            className="primary-gradient text-white px-6 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">auto_fix_high</span>
            <span>Auto-fill Month</span>
          </button>
        )}
      </div>

      {/* Nav bar */}
      <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-stone-600">chevron_left</span>
          </button>
          <div className="text-center flex items-center gap-4">
            <h2 className="text-lg font-black text-on-surface tracking-tight">{headerLabel}</h2>
            <button type="button" onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-primary uppercase tracking-wider hover:underline">
              Today
            </button>
            <div className="flex bg-stone-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow-sm text-on-surface' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors ${viewMode === 'month' ? 'bg-white shadow-sm text-on-surface' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Month
              </button>
            </div>
          </div>
          <button type="button" onClick={() => navigate(1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
            <span className="material-symbols-outlined text-stone-600">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-surface-container-low p-1 rounded-xl">
       <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50">
              <th className="px-4 py-3 text-left text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] sticky left-0 bg-stone-50 min-w-[160px] z-10">
                Contractor
              </th>
              {displayDates.map(d => {
                const isToday = formatDateKey(d) === formatDateKey(new Date());
                return (
                  <th key={formatDateKey(d)} className={`px-1 py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] ${viewMode === 'month' ? 'min-w-[80px]' : 'min-w-[130px]'} ${isToday ? 'text-primary bg-primary/5' : 'text-stone-400'}`}>
                    <div>{DAY_NAMES[d.getDay()]}</div>
                    <div className="text-sm">{d.getDate()}</div>
                  </th>
                );
              })}
              {isAdmin && (
                <th className="px-2 py-3 text-center text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] sticky right-0 bg-stone-50 min-w-[80px] z-10">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {displayEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-stone-50/50">
                <td className="px-4 py-2 whitespace-nowrap sticky left-0 bg-white border-r border-stone-100 z-10">
                  <div className="text-sm font-bold text-on-surface tracking-tight">{emp.user?.fullName}</div>
                  {emp.department && <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{emp.department}</div>}
                </td>
                {displayDates.map(d => {
                  const dateKey = formatDateKey(d);
                  const schedule = getScheduleForCell(emp.id, dateKey);
                  const isToday = dateKey === formatDateKey(new Date());
                  const isCompact = viewMode === 'month';

                  return (
                    <td key={dateKey} className={`px-0.5 py-1 text-center ${isToday ? 'bg-primary/5' : ''}`}>
                      {schedule ? (
                        <div className={`rounded-md px-1 py-1 text-xs border ${SHIFT_PRESETS[schedule.shiftType]?.color || SHIFT_PRESETS.CUSTOM.color} ${isCompact ? '' : 'px-2 py-1.5'}`}>
                          {isCompact ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${SHIFT_PRESETS[schedule.shiftType]?.badge || 'bg-gray-500'}`} />
                              <span className="font-semibold text-[10px]">{SHIFT_PRESETS[schedule.shiftType]?.label?.charAt(0) || 'C'}</span>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold">{SHIFT_PRESETS[schedule.shiftType]?.label || schedule.shiftType}</div>
                              <div className="opacity-75">{schedule.startTime} – {schedule.endTime}</div>
                            </>
                          )}
                          {isAdmin && !isCompact && (
                            <button type="button" onClick={() => handleDelete(schedule.id)} className="mt-1 text-red-500 hover:text-red-700">
                              <span className="material-symbols-outlined text-xs">close</span>
                            </button>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <button
                          type="button"
                          onClick={() => openAddModal(emp.id, dateKey)}
                          className={`w-full rounded-md border-2 border-dashed border-stone-200 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center ${isCompact ? 'h-[28px]' : 'min-h-[48px]'}`}
                        >
                          <span className={`material-symbols-outlined text-stone-400 ${isCompact ? 'text-xs' : 'text-sm'}`}>add</span>
                        </button>
                      ) : (
                        <div className={`flex items-center justify-center text-stone-300 text-xs ${isCompact ? 'h-[28px]' : 'min-h-[48px]'}`}>—</div>
                      )}
                    </td>
                  );
                })}
                {isAdmin && (
                  <td className="px-2 py-2 text-center sticky right-0 bg-white border-l border-stone-100 z-10">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openDefaultsModal(emp.id)}
                        title="Set default schedule"
                        className="p-1.5 hover:bg-stone-100 rounded-md transition-colors mx-auto"
                      >
                        <span className="material-symbols-outlined text-stone-500 text-lg">settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAutoPopulate(emp.id)}
                        title="Auto-fill this employee"
                        className="p-1.5 hover:bg-primary/10 rounded-md transition-colors mx-auto"
                      >
                        <span className="material-symbols-outlined text-primary text-lg">auto_fix_high</span>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {displayEmployees.length === 0 && (
              <tr>
                <td colSpan={displayDates.length + 2} className="px-6 py-12 text-center text-stone-400">
                  <span className="material-symbols-outlined text-stone-300 text-4xl block mb-2">event_busy</span>
                  No contractors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
       </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(SHIFT_PRESETS).map(([key, preset]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${preset.badge}`} />
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{preset.label}</span>
          </div>
        ))}
      </div>

      {/* ===== ADD SHIFT MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-md">
            <div className="mb-6">
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">Schedule Entry</span>
              <h2 className="text-2xl font-black text-on-surface tracking-tighter">Add Shift</h2>
            </div>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Shift Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(SHIFT_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleShiftTypeChange(key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${formData.shiftType === key ? preset.color + ' ring-2 ring-offset-1 ring-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Start Time</label>
                  <input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} required className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">End Time</label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} required className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Break (minutes)</label>
                <input type="number" value={formData.breakMinutes} onChange={e => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all">Cancel</button>
                <button type="submit" className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20">Add Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DEFAULT SCHEDULE MODAL ===== */}
      {showDefaultsModal && selectedEmployeeId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest editorial-shadow-lg rounded-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] block mb-1">Weekly Pattern</span>
                <h2 className="text-2xl font-black text-on-surface tracking-tighter">
                  Default Schedule — {employees.find(e => e.id === selectedEmployeeId)?.user.fullName}
                </h2>
              </div>
              <button type="button" onClick={() => setShowDefaultsModal(false)} className="p-2 hover:bg-stone-100 rounded-lg">
                <span className="material-symbols-outlined text-stone-500">close</span>
              </button>
            </div>
            <p className="text-sm text-stone-500 mb-6">
              Set the default weekly pattern. Use "Auto-fill Month" to populate schedules from these defaults.
            </p>

            <div className="space-y-3">
              {defaultDays.map(day => (
                <div key={day.dayOfWeek} className={`flex items-center gap-3 p-3 rounded-lg border ${day.isOff ? 'bg-stone-50 border-stone-200 opacity-60' : 'border-stone-200'}`}>
                  <div className="w-20 text-sm font-bold text-on-surface tracking-tight">{DAY_NAMES_FULL[day.dayOfWeek]}</div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={day.isOff}
                      onChange={e => updateDefaultDay(day.dayOfWeek, 'isOff', e.target.checked)}
                      className="rounded border-stone-300"
                    />
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Off</span>
                  </label>
                  {!day.isOff && (
                    <>
                      <select
                        value={day.shiftType}
                        onChange={e => updateDefaultDay(day.dayOfWeek, 'shiftType', e.target.value)}
                        className="px-2 py-1.5 text-sm bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary outline-none"
                      >
                        {Object.entries(SHIFT_PRESETS).map(([key, preset]) => (
                          <option key={key} value={key}>{preset.label}</option>
                        ))}
                      </select>
                      <input type="time" value={day.startTime} onChange={e => updateDefaultDay(day.dayOfWeek, 'startTime', e.target.value)} className="px-2 py-1.5 text-sm bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                      <span className="text-stone-400">–</span>
                      <input type="time" value={day.endTime} onChange={e => updateDefaultDay(day.dayOfWeek, 'endTime', e.target.value)} className="px-2 py-1.5 text-sm bg-surface-container-low border-none rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between gap-3 mt-6">
              <button type="button" onClick={() => setShowDefaultsModal(false)} className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all">
                Cancel
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => handleSaveDefaults(false)} className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all">
                  Save Defaults
                </button>
                <button type="button" onClick={() => handleSaveDefaults(true)} className="primary-gradient text-white px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                  Save & Update Month
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
