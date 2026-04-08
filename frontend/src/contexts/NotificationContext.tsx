import React, { createContext, useContext, useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [alertState, setAlertState] = useState<{
    title: string;
    message: string;
    resolve: () => void;
  } | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const alert = useCallback((title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setAlertState({ title, message, resolve });
    });
  }, []);

  const handleConfirmClose = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value);
      setConfirmState(null);
    }
  };

  const handleAlertClose = () => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, confirm, alert }}>
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
              type="button"
              onClick={() => setNotifications((prev) => prev.filter((notif) => notif.id !== n.id))}
              className="p-1 hover:bg-stone-100 rounded transition-colors text-stone-300 hover:text-stone-500"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm/Alert Global Dialog Overlay */}
      {(confirmState || alertState) && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in shadow-2xl">
          <div className="bg-surface-container-lowest rounded-2xl editorial-shadow-lg w-full max-w-sm overflow-hidden animate-modal-in border border-stone-100">
            <div className="p-10">
              <h3 className="text-2xl font-black text-on-surface tracking-tighter mb-3">
                {confirmState?.options.title || alertState?.title || 'Notification'}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-10 font-medium">
                {confirmState?.options.message || alertState?.message}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {confirmState ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => handleConfirmClose(false)}
                      className="flex-1 px-6 py-3.5 rounded-xl bg-stone-100 text-stone-600 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-stone-200 transition-all border border-stone-200"
                    >
                      {confirmState.options.cancelLabel || 'No, Cancel'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleConfirmClose(true)}
                      className={`flex-1 px-6 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] text-white transition-all transform active:scale-95 shadow-lg
                        ${confirmState.options.isDestructive 
                          ? 'bg-red-700 hover:bg-red-800 shadow-red-200' 
                          : 'primary-gradient shadow-primary/20'}
                      `}
                    >
                      {confirmState.options.confirmLabel || (confirmState.options.isDestructive ? 'Delete' : 'Confirm')}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={handleAlertClose}
                    className="w-full px-6 py-3.5 rounded-xl primary-gradient text-white font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all transform active:scale-95"
                  >
                    Alright
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
