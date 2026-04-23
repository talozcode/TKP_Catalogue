'use client';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

type Props = {
  open: boolean;
  title?: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: string;
};

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = 'max-w-md'
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      aria-hidden={!open}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full flex-col bg-bg/95 shadow-2xl backdrop-blur transition-transform duration-200 ease-out',
          width,
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="min-w-0">
            {title ? (
              <div className="truncate font-serif text-lg font-semibold text-brand">
                {title}
              </div>
            ) : null}
            {subtitle ? (
              <div className="mt-0.5 truncate text-[11px] uppercase tracking-[0.16em] text-gold">
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="-mr-1 rounded p-1.5 text-muted hover:bg-brandSoft hover:text-brand"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}
