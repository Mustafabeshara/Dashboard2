/**
 * Toast Notification Component
 * Provides user feedback with animated notifications
 */
'use client';

import * as React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, toast: Partial<Omit<Toast, 'id'>>) => void;
  clearToasts: () => void;
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Generate unique ID
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default durations by type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
  loading: 0, // Never auto-dismiss
};

// Icons by type
const ToastIcons: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

// Colors by type
const toastColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  loading: 'bg-gray-50 border-gray-200 text-gray-800',
};

const toastIconColors: Record<ToastType, string> = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
  loading: 'text-gray-500',
};

// Single toast item component
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ToastIcons[toast.type];
  const dismissible = toast.dismissible !== false;

  const handleRemove = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [toast.id, onRemove]);

  // Auto dismiss
  useEffect(() => {
    const duration = toast.duration ?? DEFAULT_DURATIONS[toast.type];
    if (duration > 0) {
      const timer = setTimeout(handleRemove, duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.type, handleRemove]);

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'transform transition-all duration-200 ease-in-out',
        isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100',
        toastColors[toast.type]
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon
        className={cn(
          'h-5 w-5 flex-shrink-0 mt-0.5',
          toastIconColors[toast.type],
          toast.type === 'loading' && 'animate-spin'
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{toast.title}</p>
        {toast.message && (
          <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-sm font-medium underline hover:no-underline mt-2"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast container component
function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Provider component
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Omit<Toast, 'id'>>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'success', title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'error', title, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'warning', title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'info', title, message }),
    [addToast]
  );

  const loading = useCallback(
    (title: string, message?: string) =>
      addToast({ type: 'loading', title, message, dismissible: false }),
    [addToast]
  );

  const promise = useCallback(
    async <T,>(
      promiseInstance: Promise<T>,
      options: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: Error) => string);
      }
    ): Promise<T> => {
      const toastId = addToast({
        type: 'loading',
        title: options.loading,
        dismissible: false,
      });

      try {
        const result = await promiseInstance;
        const successMessage =
          typeof options.success === 'function'
            ? options.success(result)
            : options.success;
        updateToast(toastId, {
          type: 'success',
          title: successMessage,
          dismissible: true,
        });
        return result;
      } catch (err) {
        const errorMessage =
          typeof options.error === 'function'
            ? options.error(err as Error)
            : options.error;
        updateToast(toastId, {
          type: 'error',
          title: errorMessage,
          dismissible: true,
        });
        throw err;
      }
    },
    [addToast, updateToast]
  );

  const contextValue: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    clearToasts,
    success,
    error,
    warning,
    info,
    loading,
    promise,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

// Export individual components for customization
export { ToastItem, ToastContainer };
