import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

interface Employee {
  id: number;
  employeeCode: string;
  position: string | null;
  salary: number | null;
  user: {
    fullName: string;
    email: string;
  };
}

interface TimesheetLog {
  date: string;
  regular: number;
  overtime: number;
  notes: string;
}

interface TimesheetSummary {
  totalRegularHours: number;
  totalOvertimeHours: number;
  hourlyRate: number;
  otMultiplier: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  currency: string;
}

interface TimesheetPreview {
  employee: Employee;
  logs: TimesheetLog[];
  summary: TimesheetSummary;
}

export default function Timesheets() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [preview, setPreview] = useState<TimesheetPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isEmployee = user?.role === 'EMPLOYEE';

  useEffect(() => {
    if (isEmployee && user?.employee) {
      setSelectedEmployeeId(user.employee.id.toString());
    } else {
      fetchEmployees();
    }
  }, [isEmployee, user]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get<Employee[]>('/employees');
      setEmployees(res.data);
      if (res.data.length > 0) setSelectedEmployeeId(res.data[0].id.toString());
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchPreview = useCallback(async () => {
    // For employees, we can proceed even if selectedEmployeeId isn't set yet if we use their token
    // but the backend will override it anyway. However, for UI state, it's better to wait.
    if (!selectedEmployeeId || !startDate || !endDate) return;
    setLoading(true);
    try {
      const res = await api.get<TimesheetPreview>(`/timesheets/preview?employeeId=${selectedEmployeeId}&startDate=${startDate}&endDate=${endDate}`);
      setPreview(res.data);
    } catch (err: any) {
      showNotification(err.response?.data?.error || 'Failed to load preview', 'error');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, startDate, endDate, showNotification]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleDownload = async () => {
    if (!preview) return;
    setGenerating(true);
    try {
      const res = await api.post('/timesheets/generate', preview, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Timesheet_${preview.employee.employeeCode}_${startDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('Timesheet generated successfully', 'success');
    } catch (err) {
      showNotification('Failed to generate PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (val: number, currency: string = 'PHP') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);
  };

  return (
    <div className="space-y-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Payroll & Billing
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Timesheet Generator
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Generate professional reference timesheets for contractors based on verified time logs.
          </p>
        </div>
      </div>

      {/* Configuration Bar */}
      <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!isEmployee && (
            <div className="space-y-2">
              <label className="text-label block">Select Contractor</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-stone-50 border-none rounded-lg text-sm font-bold py-3 px-4 focus:ring-1 focus:ring-primary cursor-pointer"
              >
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.user.fullName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>
          )}
          {isEmployee && (
            <div className="space-y-2">
              <label className="text-label block">Contractor</label>
              <div className="w-full bg-stone-100 border-none rounded-lg text-sm font-bold py-3 px-4 text-stone-600">
                {user?.fullName} ({user?.employee?.employeeCode})
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-label block">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-stone-50 border-none rounded-lg text-sm font-bold py-3 px-4 focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label className="text-label block">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-stone-50 border-none rounded-lg text-sm font-bold py-3 px-4 focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : preview ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-surface-container-low p-6 rounded-xl border-b-4 border-stone-200">
              <span className="text-label">Regular Time</span>
              <h3 className="text-3xl font-black text-on-surface tracking-tighter mt-2">{preview.summary.totalRegularHours.toFixed(2)} <span className="text-sm font-bold text-stone-400">HRS</span></h3>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-b-4 border-stone-200">
              <span className="text-label">Overtime</span>
              <h3 className="text-3xl font-black text-on-surface tracking-tighter mt-2">{preview.summary.totalOvertimeHours.toFixed(2)} <span className="text-sm font-bold text-stone-400">HRS</span></h3>
            </div>
            <div className="bg-surface-container-low p-6 rounded-xl border-b-4 border-primary/20">
              <span className="text-label">Hourly Rate</span>
              <h3 className="text-3xl font-black text-on-surface tracking-tighter mt-2">{formatCurrency(preview.summary.hourlyRate, preview.summary.currency)}</h3>
            </div>
            <div className="bg-primary p-6 rounded-xl editorial-shadow-lg flex flex-col justify-between">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Gross Total</span>
              <div className="flex items-end justify-between">
                <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(preview.summary.grossPay, preview.summary.currency)}</h3>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={generating}
                  className="bg-white text-primary p-2 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md disabled:opacity-50"
                  title="Download PDF Timesheet"
                >
                  <span className="material-symbols-outlined">{generating ? 'progress_activity' : 'file_download'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Logs Table */}
          <div className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-8 py-5 text-label">Date</th>
                    <th className="px-8 py-5 text-label text-center">Regular (hrs)</th>
                    <th className="px-8 py-5 text-label text-center">Overtime (hrs)</th>
                    <th className="px-8 py-5 text-label">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {preview.logs.map((log) => (
                    <tr key={log.date} className="hover:bg-stone-50/50 transition-colors duration-200">
                      <td className="px-8 py-4">
                        <span className="font-bold text-on-surface">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-sm font-medium text-stone-600">{log.regular.toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`text-sm font-bold ${log.overtime > 0 ? 'text-primary' : 'text-stone-400'}`}>{log.overtime.toFixed(2)}</span>
                      </td>
                      <td className="px-8 py-4">
                        <p className="text-xs text-stone-400 truncate max-w-xs">{log.notes || '—'}</p>
                      </td>
                    </tr>
                  ))}
                  {preview.logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-stone-400 text-sm font-medium italic">
                        No time records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
              Draft Reference Preview Only
            </p>
            <button
               type="button"
               onClick={handleDownload}
               disabled={generating}
               className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:underline disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              {generating ? 'Processing...' : 'Export Formal Timesheet PDF'}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-stone-100/50 rounded-xl border-2 border-dashed border-stone-200 h-64 flex items-center justify-center">
          <p className="text-stone-400 font-medium italic">
            {isEmployee ? 'Select a date range to preview your timesheet data.' : 'Select a contractor and date range to preview timesheet data.'}
          </p>
        </div>
      )}
    </div>
  );
}
