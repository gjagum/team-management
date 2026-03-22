import { useEffect, useState } from 'react';
import api from '../services/api';
import { User as UserType } from '../types';

interface Employee {
  id: number;
  userId: number;
  employeeCode: string;
  department: string | null;
  position: string | null;
  hireDate: string;
  salary: number | null;
  user: UserType;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get<Employee[]>('/employees');
      setEmployees(response.data);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Enterprise Assets
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Global Directory
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Access and manage the centralized repository of talent across all departments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Filter:</span>
            <select className="bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary py-2 px-4 cursor-pointer">
              <option>All Departments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50">
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Employee Identity</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Division</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Designation</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Hire Date</th>
                <th className="px-8 py-6 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-stone-50 transition-colors duration-200 group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {employee.user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-lg tracking-tight">{employee.user.fullName}</p>
                        <p className="text-xs text-stone-400 font-medium">{employee.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded">
                      {employee.department || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-700 font-medium italic">{employee.position || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-stone-500 text-sm font-medium">
                      {new Date(employee.hireDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${employee.user.isActive ? 'bg-green-500' : 'bg-stone-300'}`}></span>
                      <span className={`text-xs font-bold uppercase ${employee.user.isActive ? 'text-green-700' : 'text-stone-500'}`}>
                        {employee.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          Displaying {employees.length} Professional{employees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-primary/20">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Total Workforce</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">{employees.length}</h3>
            <span className="text-green-600 text-xs font-bold mb-2">Active</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-stone-300">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Departments</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-on-surface tracking-tighter">
              {new Set(employees.map(e => e.department).filter(Boolean)).size}
            </h3>
            <span className="text-stone-500 text-xs font-bold mb-2">Divisions</span>
          </div>
        </div>
        <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between h-48 border-b-4 border-primary/20">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Retention Rate</span>
          <div className="flex items-end justify-between">
            <h3 className="text-5xl font-black text-primary tracking-tighter">
              {employees.length > 0 ? Math.round((employees.filter(e => e.user.isActive).length / employees.length) * 100) : 0}%
            </h3>
            <span className="text-primary text-xs font-bold mb-2">Active Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
}
