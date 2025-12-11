
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Icons } from './Icon';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md animate-slide-up transition-all ${
              toast.type === 'success' ? 'bg-green-900/90 border-green-700 text-green-100' :
              toast.type === 'error' ? 'bg-red-900/90 border-red-700 text-red-100' :
              'bg-slate-800/90 border-slate-600 text-slate-100'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && <Icons.Activity className="w-5 h-5 text-green-400" />}
              {toast.type === 'error' && <Icons.X className="w-5 h-5 text-red-400" />}
              {toast.type === 'info' && <Icons.MessageSquare className="w-5 h-5 text-blue-400" />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 p-1">
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
