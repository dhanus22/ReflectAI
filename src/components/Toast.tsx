import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, Info, X, RefreshCw } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success';

        return (
          <div
            key={t.id}
            id={`toast-${t.id}`}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-xl flex items-start gap-3 transition-all transform translate-y-0 ${
              isError
                ? 'bg-[#1D1113] border-rose-800/70 text-rose-200'
                : isSuccess
                ? 'bg-[#0F1D16] border-emerald-800/70 text-emerald-200'
                : 'bg-[#181818] border-[#2E2E2E] text-neutral-200'
            }`}
          >
            {isError && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {!isError && !isSuccess && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}

            <div className="flex-1 text-xs">
              <h5 className="font-semibold mb-0.5 text-[#F5F5F5]">{t.title}</h5>
              {t.description && <p className="text-neutral-400 leading-relaxed font-light">{t.description}</p>}

              {t.retryAction && (
                <button
                  onClick={() => {
                    t.retryAction?.();
                    onDismiss(t.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Action
                </button>
              )}
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              className="text-neutral-400 hover:text-white cursor-pointer p-0.5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
