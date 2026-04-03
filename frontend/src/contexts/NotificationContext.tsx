import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Notification Portal / Overlay */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`
              pointer-events-auto
              min-w-[320px] max-w-md
              bg-surface-container-lowest editorial-shadow-lg
              rounded-xl p-5
              flex items-start gap-4
              animate-toast-in
              border-l-4
              ${n.type === 'success' ? 'border-green-500' : ''}
              ${n.type === 'error' ? 'border-red-500' : ''}
              ${n.type === 'warning' ? 'border-amber-500' : ''}
              ${n.type === 'info' ? 'border-primary' : ''}
            `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
              ${n.type === 'success' ? 'bg-green-50 text-green-600' : ''}
              ${n.type === 'error' ? 'bg-red-50 text-red-600' : ''}
              ${n.type === 'warning' ? 'bg-amber-50 text-amber-600' : ''}
              ${n.type === 'info' ? 'bg-primary/5 text-primary' : ''}
            `}>
              <span className="material-symbols-outlined text-xl">
                {n.type === 'success' && 'check_circle'}
                {n.type === 'error' && 'error'}
                {n.type === 'warning' && 'warning'}
                {n.type === 'info' && 'info'}
              </span>
            </div>
            
            <div className="flex-1 pt-0.5">
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-1">
                {n.type === 'success' && 'Operation Successful'}
                {n.type === 'error' && 'System Error'}
                {n.type === 'warning' && 'Warning'}
                {n.type === 'info' && 'Notification'}
              </h4>
              <p className="text-sm font-bold text-on-surface leading-tight tracking-tight">
                {n.message}
              </p>
            </div>
            
            <button
              onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
              className="p-1 hover:bg-stone-100 rounded transition-colors text-stone-300 hover:text-stone-500"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
