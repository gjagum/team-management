import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

interface UIContextType {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (title: string, message: string) => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);
  const [alertState, setAlertState] = useState<{
    title: string;
    message: string;
    resolve: () => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
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

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <UIContext.Provider value={{ showToast, confirm, alert }}>
      {children}
      
      {/* Nice UI Overlay Components */}
      <UIHost 
        toasts={toasts} 
        onRemoveToast={removeToast}
        confirm={confirmState}
        onConfirm={handleConfirmClose}
        alert={alertState}
        onAlertClose={handleAlertClose}
      />
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

// UI Components for the Host
function UIHost({ 
  toasts, 
  onRemoveToast, 
  confirm, 
  onConfirm,
  alert,
  onAlertClose 
}: { 
  toasts: Toast[]; 
  onRemoveToast: (id: string) => void;
  confirm: { options: ConfirmOptions; resolve: (v: boolean) => void } | null;
  onConfirm: (v: boolean) => void;
  alert: { title: string; message: string; resolve: () => void } | null;
  onAlertClose: () => void;
}) {
  return (
    <>
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              animate-toast-in p-4 rounded-xl editorial-shadow-lg flex items-center justify-between gap-3 border
              ${toast.type === 'success' ? 'bg-white border-green-100 text-green-900' : ''}
              ${toast.type === 'error' ? 'bg-white border-red-100 text-red-900' : ''}
              ${toast.type === 'warning' ? 'bg-white border-yellow-100 text-yellow-900' : ''}
              ${toast.type === 'info' ? 'bg-white border-blue-100 text-blue-900' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined 
                ${toast.type === 'success' ? 'text-green-500' : ''}
                ${toast.type === 'error' ? 'text-red-500' : ''}
                ${toast.type === 'warning' ? 'text-yellow-600' : ''}
                ${toast.type === 'info' ? 'text-blue-500' : ''}
              `}>
                {toast.type === 'success' ? 'check_circle' : 
                 toast.type === 'error' ? 'error' : 
                 toast.type === 'warning' ? 'warning' : 'info'}
              </span>
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button 
              type="button"
              onClick={() => onRemoveToast(toast.id)}
              className="text-stone-300 hover:text-stone-500 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm/Alert Overlay */}
      {(confirm || alert) && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl editorial-shadow-lg w-full max-w-sm overflow-hidden animate-modal-in">
            <div className="p-8">
              <h3 className="text-2xl font-black text-on-surface tracking-tighter mb-3">
                {confirm?.options.title || alert?.title || 'Notification'}
              </h3>
              <p className="text-stone-500 text-sm leading-relaxed mb-8">
                {confirm?.options.message || alert?.message}
              </p>
              
              <div className="flex gap-3">
                {confirm ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => onConfirm(false)}
                      className="flex-1 px-6 py-3 rounded-xl bg-stone-100 text-stone-600 font-bold text-xs uppercase tracking-widest hover:bg-stone-200 transition-all border border-stone-200"
                    >
                      {confirm.options.cancelLabel || 'No, Cancel'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => onConfirm(true)}
                      className={`flex-1 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white transition-all transform active:scale-95 shadow-md
                        ${confirm.options.isDestructive 
                          ? 'bg-red-700 hover:bg-red-800 shadow-red-200' 
                          : 'primary-gradient shadow-primary/20'}
                      `}
                    >
                      {confirm.options.confirmLabel || (confirm.options.isDestructive ? 'Delete' : 'Confirm')}
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={onAlertClose}
                    className="w-full px-6 py-3 rounded-xl primary-gradient text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all transform active:scale-95"
                  >
                    Alright
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
