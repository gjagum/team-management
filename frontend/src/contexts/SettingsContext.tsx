import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.ts';
import { useAuth } from './AuthContext.tsx';

interface AppSetting {
  id: number;
  key: string;
  value: string;
  category: string;
  label: string;
  description: string;
  dataType: string;
}

interface SettingsContextType {
  settings: AppSetting[];
  loading: boolean;
  getSetting: (key: string) => string | undefined;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [publicName, setPublicName] = useState<string>('TEAM MANAGEMENT');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchPublicName = async () => {
    try {
      const response = await api.get('/settings/public/company-name');
      setPublicName(response.data.value);
    } catch (error) {
      console.error('Failed to fetch public company name:', error);
    }
  };

  useEffect(() => {
    fetchPublicName();
  }, []);

  const fetchSettings = async () => {
    if (!user) {
      setSettings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const getSetting = (key: string) => {
    if (key === 'company.name' && !user) return publicName;
    return settings.find((s: AppSetting) => s.key === key)?.value || (key === 'company.name' ? publicName : undefined);
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, getSetting, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
