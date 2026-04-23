'use client';
import { create } from 'zustand';

type Toast = { id: number; message: string; tone: 'info' | 'error' | 'success' };

const useToasts = create<{
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set({ toasts: [...get().toasts, { id, ...t }] });
    setTimeout(() => get().dismiss(id), 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) })
}));

export const toast = {
  info:    (m: string) => useToasts.getState().push({ message: m, tone: 'info' }),
  error:   (m: string) => useToasts.getState().push({ message: m, tone: 'error' }),
  success: (m: string) => useToasts.getState().push({ message: m, tone: 'success' })
};

export function ToastViewport() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={
            'pointer-events-auto cursor-pointer rounded-md px-4 py-2 text-sm shadow-card ' +
            (t.tone === 'error'   ? 'bg-red-600 text-white' :
             t.tone === 'success' ? 'bg-emerald-600 text-white' :
                                    'bg-ink text-white')
          }
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
