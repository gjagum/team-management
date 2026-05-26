import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Employee, EmployeeDocument, OnboardingTask, OnboardingResponse } from '../types';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Contract',
  GOVERNMENT_ID: 'Government ID',
  TAX_FORM: 'Tax Form',
  CERTIFICATE: 'Certificate',
  OTHER: 'Other',
};

const DOCUMENT_TYPE_BADGES: Record<string, string> = {
  CONTRACT: 'bg-blue-50 text-blue-700',
  GOVERNMENT_ID: 'bg-purple-50 text-purple-700',
  TAX_FORM: 'bg-amber-50 text-amber-700',
  CERTIFICATE: 'bg-green-50 text-green-700',
  OTHER: 'bg-stone-100 text-stone-600',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const employeeId = parseInt(id || '0');

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'onboarding'>('profile');

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('OTHER');
  const [uploadNotes, setUploadNotes] = useState('');

  const [onboarding, setOnboarding] = useState<OnboardingResponse | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data } = await api.get<Employee>(`/employees/${employeeId}`);
      setEmployee(data);
    } catch {
      alert('Employee not found');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents') fetchDocuments();
    if (activeTab === 'onboarding') fetchOnboarding();
  }, [activeTab]);

  const fetchDocuments = async () => {
    setDocsLoading(true);
    try {
      const { data } = await api.get<EmployeeDocument[]>(`/employees/${employeeId}/documents`);
      setDocuments(data);
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  const fetchOnboarding = async () => {
    setOnboardingLoading(true);
    try {
      const { data } = await api.get<OnboardingResponse>(`/employees/${employeeId}/onboarding`);
      setOnboarding(data);
    } catch (err: any) {
      console.error('Failed to fetch onboarding:', err);
    } finally {
      setOnboardingLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);
      if (uploadNotes) formData.append('notes', uploadNotes);

      await api.post(`/employees/${employeeId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fileInput.value = '';
      setUploadNotes('');
      setUploadType('OTHER');
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    try {
      const response = await api.get(`/employees/${employeeId}/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/employees/${employeeId}/documents/${docId}`);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleInitOnboarding = async () => {
    try {
      await api.post(`/employees/${employeeId}/onboarding/init`);
      fetchOnboarding();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initialize onboarding');
    }
  };

  const handleToggleTask = async (task: OnboardingTask) => {
    try {
      await api.put(`/employees/${employeeId}/onboarding/${task.id}`, {
        isCompleted: !task.isCompleted,
      });
      fetchOnboarding();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/employees/${employeeId}/onboarding/${taskId}`);
      fetchOnboarding();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!employee) return null;

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: 'person' },
    { key: 'documents' as const, label: 'Documents', icon: 'description' },
    { key: 'onboarding' as const, label: 'Onboarding', icon: 'checklist' },
  ];

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Contractor Profile
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            {employee.user?.fullName || employee.id}
          </h1>
          <p className="text-stone-500 mt-2 max-w-md flex items-center gap-3">
            <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider rounded">
              {employee.employeeCode}
            </span>
            <span className={`w-2 h-2 rounded-full ${employee.user?.isActive ? 'bg-green-500' : 'bg-stone-300'}`}></span>
            <span className="text-xs font-bold uppercase text-stone-500">
              {employee.user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
        </div>
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 text-stone-500 hover:text-primary transition-colors font-bold text-sm uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          Back to Directory
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
              activeTab === tab.key
                ? 'bg-white text-primary editorial-shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-8">
            <h3 className="text-lg font-black text-on-surface tracking-tight mb-6">Personal Details</h3>
            <dl className="space-y-5">
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Email</dt>
                <dd className="text-sm font-medium text-stone-600">{employee.user?.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Department</dt>
                <dd className="text-sm font-medium text-stone-600">{employee.department || 'Unassigned'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Position</dt>
                <dd className="text-sm font-medium text-stone-600">{employee.position || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Access Level</dt>
                <dd className="text-sm font-medium text-stone-600">{employee.user?.role || 'N/A'}</dd>
              </div>
            </dl>
          </div>
          <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-8">
            <h3 className="text-lg font-black text-on-surface tracking-tight mb-6">Employment Details</h3>
            <dl className="space-y-5">
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Employee Code</dt>
                <dd className="text-sm font-medium text-stone-600 font-mono">{employee.employeeCode}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Hire Date</dt>
                <dd className="text-sm font-medium text-stone-600">
                  {new Date(employee.hireDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Salary</dt>
                <dd className="text-sm font-medium text-stone-600">
                  {employee.salary ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(employee.salary) : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">Slack ID</dt>
                <dd className="text-sm font-medium text-stone-600 font-mono">{employee.slackId || '—'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-8">
          {/* Upload Form */}
          <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-8">
            <h3 className="text-lg font-black text-on-surface tracking-tight mb-6">Upload Document</h3>
            <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">File</label>
                <input
                  type="file"
                  required
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-primary file:text-white file:uppercase file:tracking-wider file:cursor-pointer"
                />
              </div>
              <div className="w-44">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Type</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] block mb-2">Notes</label>
                <input
                  type="text"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="primary-gradient text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">{uploading ? 'progress_activity' : 'upload'}</span>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </div>

          {/* Document List */}
          <div className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">File</th>
                    <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Type</th>
                    <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Size</th>
                    <th className="px-8 py-5 text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Uploaded</th>
                    <th className="px-8 py-5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {docsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center">
                        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-stone-400 font-medium text-sm uppercase tracking-wider">
                        No documents uploaded yet
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-stone-50 transition-colors duration-200">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-stone-400">description</span>
                            <span className="font-bold text-on-surface text-sm tracking-tight">{doc.fileName}</span>
                            {doc.notes && <span className="text-xs text-stone-400 ml-2 italic">— {doc.notes}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={`inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded ${DOCUMENT_TYPE_BADGES[doc.type] || 'bg-stone-100 text-stone-600'}`}>
                            {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs text-stone-500 font-medium">{formatBytes(doc.fileSize)}</span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="text-xs text-stone-500 font-medium">
                            {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-primary transition-colors"
                              title="Download"
                            >
                              <span className="material-symbols-outlined text-lg">download</span>
                            </button>
                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-8">
          {/* Progress Card */}
          {onboarding && onboarding.tasks.length > 0 && (
            <div className="bg-surface-container-lowest editorial-shadow rounded-xl p-8">
              <div className="flex items-end justify-between mb-4">
                <h3 className="text-lg font-black text-on-surface tracking-tight">Onboarding Progress</h3>
                <span className="text-3xl font-black text-primary tracking-tighter">
                  {Math.round((onboarding.progress.completed / onboarding.progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(onboarding.progress.completed / onboarding.progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-stone-400 font-medium mt-3 uppercase tracking-wider">
                {onboarding.progress.completed} of {onboarding.progress.total} tasks complete
                {onboarding.progress.required > 0 && (
                  <span className="ml-2">({onboarding.progress.requiredCompleted}/{onboarding.progress.required} required)</span>
                )}
              </p>
            </div>
          )}

          {/* Task List */}
          <div className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
              <div className="p-6 flex items-center justify-between border-b border-stone-100">
                <h3 className="text-lg font-black text-on-surface tracking-tight">Checklist</h3>
                {(!onboarding || onboarding.tasks.length === 0) && (
                  <button
                    onClick={handleInitOnboarding}
                    className="primary-gradient text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-base">playlist_add</span>
                    Init Default Tasks
                  </button>
                )}
              </div>
              <div className="divide-y divide-stone-100">
                {onboardingLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                  </div>
                ) : !onboarding || onboarding.tasks.length === 0 ? (
                  <div className="px-8 py-12 text-center text-stone-400 font-medium text-sm uppercase tracking-wider">
                    No onboarding tasks. Click "Init Default Tasks" to create the standard checklist.
                  </div>
                ) : (
                  onboarding.tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-8 py-5 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            task.isCompleted
                              ? 'bg-primary border-primary text-white'
                              : 'border-stone-300 hover:border-primary text-transparent'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </button>
                        <div>
                          <span className={`font-bold text-on-surface tracking-tight ${task.isCompleted ? 'line-through text-stone-400' : ''}`}>
                            {task.taskName}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            {task.category && (
                              <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-500 text-[9px] font-bold uppercase tracking-wider rounded">
                                {task.category}
                              </span>
                            )}
                            {task.isRequired && (
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider">Required</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {task.completedAt && (
                          <span className="text-[10px] text-stone-400 font-medium">
                            {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition-colors"
                          title="Delete task"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
