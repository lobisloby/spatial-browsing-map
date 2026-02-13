import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, suffix, ...props }, ref) => (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none">{icon}</div>}
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all',
          icon && 'pl-9',
          suffix && 'pr-9',
          className,
        )}
        {...props}
      />
      {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">{suffix}</div>}
    </div>
  ),
);

Input.displayName = 'Input';