'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  title: string;
  message?: string;
}

// A simple global event system for toasts
export function showToast(type: 'success' | 'error', title: string, message?: string) {
  const event = new CustomEvent('show-toast', { detail: { type, title, message } });
  window.dispatchEvent(event);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleShow = (e: Event) => {
      const { type, title, message } = (e as CustomEvent).detail;
      const id = Date.now().toString();

      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };

    window.addEventListener('show-toast', handleShow);
    return () => window.removeEventListener('show-toast', handleShow);
  }, []);

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-start gap-3 p-4 rounded-lg border shadow-lg w-80 animate-in slide-in-from-right-full',
            toast.type === 'success'
              ? 'bg-bg-secondary border-status-positive text-status-positive'
              : 'bg-bg-secondary border-status-negative text-status-negative',
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle size={20} className="shrink-0" />
          ) : (
            <AlertCircle size={20} className="shrink-0" />
          )}

          <div className="flex-1">
            <h4 className="text-sm font-semibold">{toast.title}</h4>
            {toast.message && <p className="text-xs text-fg-secondary mt-1">{toast.message}</p>}
          </div>

          <button
            onClick={() => remove(toast.id)}
            className="text-fg-tertiary hover:text-fg-primary"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
