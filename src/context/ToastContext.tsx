import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
  confirmAction: (options: string | ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, message, type, title, duration };

    setToasts(prev => [...prev.slice(-4), newToast]); // keep max 5 toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, title?: string) => {
    showToast(message, 'success', title || 'Sucesso');
  }, [showToast]);

  const showError = useCallback((message: string, title?: string) => {
    showToast(message, 'error', title || 'Atenção');
  }, [showToast]);

  const showWarning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', title || 'Aviso');
  }, [showToast]);

  const showInfo = useCallback((message: string, title?: string) => {
    showToast(message, 'info', title || 'Informação');
  }, [showToast]);

  const confirmAction = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    if (confirmResolverRef.current) {
      confirmResolverRef.current(false);
    }
    const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    setConfirmState({
      open: true,
      title: opts.title || 'Confirmação Necessária',
      message: opts.message,
      confirmText: opts.confirmText || 'Confirmar',
      cancelText: opts.cancelText || 'Cancelar',
      variant: opts.variant || 'warning'
    });
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve;
    });
  }, []);

  const handleConfirmChoice = (choice: boolean) => {
    setConfirmState(null);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(choice);
      confirmResolverRef.current = null;
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, showSuccess, showError, showWarning, showInfo, removeToast, confirmAction }}>
      {children}
      {/* Modal de Confirmação Global compatível com Iframes */}
      <AnimatePresence>
        {confirmState?.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => handleConfirmChoice(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmState.variant === 'info'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-amber-100 text-amber-600'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {confirmState.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {confirmState.message}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {confirmState.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(true)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer ${
                    confirmState.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : confirmState.variant === 'info'
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {confirmState.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container de Toasts Flutuantes na parte superior/direita */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map(toast => {
            const isSuccess = toast.type === 'success';
            const isError = toast.type === 'error';
            const isWarning = toast.type === 'warning';

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
                  isSuccess
                    ? 'bg-slate-900/95 border-emerald-500/50 text-white shadow-emerald-900/20'
                    : isError
                    ? 'bg-slate-900/95 border-rose-500/50 text-white shadow-rose-900/20'
                    : isWarning
                    ? 'bg-slate-900/95 border-amber-500/50 text-white shadow-amber-900/20'
                    : 'bg-slate-900/95 border-blue-500/50 text-white shadow-blue-900/20'
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />}
                  {isError && <XCircle className="w-5 h-5 text-rose-400" />}
                  {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0 pr-1">
                  {toast.title && (
                    <h5 className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
                      isSuccess ? 'text-emerald-400' : isError ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {toast.title}
                    </h5>
                  )}
                  <p className="text-xs font-medium text-slate-200 leading-snug break-words">
                    {toast.message}
                  </p>
                </div>

                <button
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Fechar notificação"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
  }
  return context;
};

export const useConfirm = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useConfirm deve ser utilizado dentro de um ToastProvider');
  }
  return context.confirmAction;
};
