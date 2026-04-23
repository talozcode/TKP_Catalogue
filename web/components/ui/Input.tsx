'use client';
import clsx from 'clsx';
import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          'h-9 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
          className
        )}
        {...props}
      />
    );
  }
);
