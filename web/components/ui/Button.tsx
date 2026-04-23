'use client';
import clsx from 'clsx';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type Size = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-sm hover:bg-brandDeep',
  secondary: 'bg-white text-ink border border-line hover:border-brand/40 hover:text-brand',
  ghost: 'bg-transparent text-ink hover:bg-brandSoft hover:text-brand',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
  gold: 'bg-gold text-white hover:bg-goldDeep'
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm'
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'secondary', size = 'md', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
