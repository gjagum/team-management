import { useEffect, useState, useCallback } from 'react';
import api from '../services/api.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSettings } from '../contexts/SettingsContext.tsx';

interface AppSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  label: string;
  description: string | null;
  dataType: string;
}

const CATEGORY_META: Record<string, { label: string; icon: string; description: string }> = {
  company: {
    label: 'Company',
    icon: 'domain',
    description: 'General organization settings',
  },
  leave: {
    label: 'Leave Management',
    icon: 'event_busy',
    description: 'Leave policies, allowances, and approval rules',
  },
  schedule: {
    label: 'Schedule & Shifts',
    icon: 'calendar_month',
    description: 'Default shift configurations and work week settings',
  },
  overtime: {
    label: 'Overtime',
    icon: 'schedule',
    description: 'Overtime limits, rates, and approval rules',
  },
};

const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'CUSTOM', label: 'Custom' },
];

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const TIMEZONE_OPTIONS = [
  'Asia/Manila', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata', 'Asia/Dubai',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Australia/Sydney', 'Pacific/Auckland',
];

const CURRENCY_OPTIONS = [
  'PHP', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD', 'CAD', 'INR', 'AED',
];

const inputBaseClass = 'w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary focus:outline-none transition-all';
const inputChangedClass = 'ring-1 ring-primary/30 bg-primary/5';

export default function Settings() {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AppSetting[]>('/settings');
      setSettings(res.data);
      const vals: Record<string, string> = {};
      res.data.forEach((s) => { vals[s.key] = s.value; });
      setEditedValues(vals);
      setOriginalValues(vals);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
    setSaveSuccess(false);
  };

  const hasChanges = Object.keys(editedValues).some(
    (key) => editedValues[key] !== originalValues[key]
  );

  const changedKeys = Object.keys(editedValues).filter(
    (key) => editedValues[key] !== originalValues[key]
  );

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const updates = changedKeys.map((key) => ({ key, value: editedValues[key] }));
      await api.put('/settings', { settings: updates });
      await refreshSettings();
      setOriginalValues({ ...editedValues });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedValues({ ...originalValues });
    setSaveSuccess(false);
  };

  // Group settings by category
  const grouped: Record<string, AppSetting[]> = {};
  settings.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  const renderInput = (setting: AppSetting) => {
    const value = editedValues[setting.key] ?? setting.value;
    const isChanged = value !== originalValues[setting.key];
    const cls = `${inputBaseClass} ${isChanged ? inputChangedClass : ''} ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`;

    if (setting.key === 'schedule.default_shift') {
      return (
        <select value={value} onChange={(e) => handleChange(setting.key, e.target.value)} disabled={!isAdmin} className={cls}>
          {SHIFT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      );
    }

    if (setting.key === 'schedule.work_week_start') {
      return (
        <select value={value} onChange={(e) => handleChange(setting.key, e.target.value)} disabled={!isAdmin} className={cls}>
          {DAY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      );
    }

    if (setting.key === 'company.timezone') {
      return (
        <select value={value} onChange={(e) => handleChange(setting.key, e.target.value)} disabled={!isAdmin} className={cls}>
          {TIMEZONE_OPTIONS.map((tz) => (<option key={tz} value={tz}>{tz}</option>))}
        </select>
      );
    }

    if (setting.key === 'company.currency') {
      return (
        <select value={value} onChange={(e) => handleChange(setting.key, e.target.value)} disabled={!isAdmin} className={cls}>
          {CURRENCY_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      );
    }

    if (setting.dataType === 'boolean') {
      return (
        <label className={`relative inline-flex items-center ${!isAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => handleChange(setting.key, e.target.checked ? 'true' : 'false')}
            disabled={!isAdmin}
            className="sr-only peer"
          />
          <div className={`w-12 h-6 rounded-full peer-focus:ring-4 peer-focus:ring-primary/20 transition-colors ${value === 'true' ? 'bg-primary' : 'bg-stone-300'}`}>
            <div className={`h-5 w-5 bg-white rounded-full shadow-md transform transition-transform mt-0.5 ${value === 'true' ? 'translate-x-6.5 ml-0.5' : 'translate-x-0.5'}`} />
          </div>
          <span className={`ml-3 text-xs font-bold uppercase tracking-wider ${value === 'true' ? 'text-primary' : 'text-stone-500'}`}>
            {value === 'true' ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      );
    }

    if (setting.dataType === 'number') {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(setting.key, e.target.value)}
          disabled={!isAdmin}
          step={setting.key.includes('multiplier') || setting.key.includes('rate') ? '0.1' : '1'}
          min="0"
          className={cls}
        />
      );
    }

    if (setting.key === 'leave.types') {
      return (
        <div>
          <textarea
            value={value}
            onChange={(e) => handleChange(setting.key, e.target.value)}
            disabled={!isAdmin}
            rows={2}
            placeholder="Vacation,Sick,Personal..."
            className={`${cls} resize-none`}
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {value.split(',').filter(Boolean).map((type) => (
              <span key={type.trim()} className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded">
                {type.trim()}
              </span>
            ))}
          </div>
        </div>
      );
    }

    return (
      <input type="text" value={value} onChange={(e) => handleChange(setting.key, e.target.value)} disabled={!isAdmin} className={cls} />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase mb-2 block">
            Configuration
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">
            Settings
          </h1>
          <p className="text-stone-500 mt-2 max-w-md">
            Configure application-wide settings for employee management.
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            {hasChanges && (
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2.5 bg-surface-container-low text-stone-600 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-surface-container-high transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm uppercase tracking-wider transition-all ${
                hasChanges
                  ? 'primary-gradient text-white shadow-lg shadow-primary/20 active:scale-95'
                  : saveSuccess
                    ? 'bg-green-600 text-white'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : saveSuccess ? (
                <span className="material-symbols-outlined text-lg">check_circle</span>
              ) : (
                <span className="material-symbols-outlined text-lg">save</span>
              )}
              {saving ? 'Saving...' : saveSuccess ? 'Saved!' : `Save${hasChanges ? ` (${changedKeys.length})` : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="bg-amber-50 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
          <p className="text-sm text-amber-800 font-medium">
            You have <span className="font-bold">{changedKeys.length}</span> unsaved change{changedKeys.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Settings categories */}
      {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
        const catSettings = grouped[catKey];
        if (!catSettings || catSettings.length === 0) return null;

        return (
          <div key={catKey} className="bg-surface-container-low p-1 rounded-xl">
            <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
              {/* Category header */}
              <div className="px-8 py-6 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">{meta.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-on-surface tracking-tight">{meta.label}</h2>
                    <p className="text-xs text-stone-400 font-medium">{meta.description}</p>
                  </div>
                </div>
              </div>

              {/* Settings rows */}
              <div className="divide-y divide-stone-100">
                {catSettings.map((setting) => {
                  const isChanged = (editedValues[setting.key] ?? setting.value) !== originalValues[setting.key];
                  return (
                    <div
                      key={setting.key}
                      className={`px-8 py-6 flex items-start gap-6 transition-colors ${isChanged ? 'bg-primary/[0.02]' : 'hover:bg-stone-50/50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-bold text-on-surface tracking-tight">{setting.label}</label>
                          {isChanged && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded uppercase tracking-wider">
                              Modified
                            </span>
                          )}
                        </div>
                        {setting.description && (
                          <p className="text-xs text-stone-400 mt-1 leading-relaxed">{setting.description}</p>
                        )}
                      </div>
                      <div className="w-72 shrink-0">
                        {renderInput(setting)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {!isAdmin && (
        <div className="bg-surface-container-low rounded-xl px-6 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-stone-400">lock</span>
          <p className="text-sm text-stone-500 font-medium">
            <strong className="text-on-surface">Read-only access.</strong> Only administrators can modify application settings.
          </p>
        </div>
      )}
    </div>
  );
}
