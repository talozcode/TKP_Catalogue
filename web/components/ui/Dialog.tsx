'use client';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
};

export function Dialog({ open, title, onClose, children, footer, width = 'max-w-lg' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${width} rounded-2xl bg-white shadow-cardHover`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-serif text-lg font-semibold text-brand">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-brandSoft hover:text-brand"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="scrollbar-thin max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer ? (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
