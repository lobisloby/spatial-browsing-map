import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
          variant === 'primary' && 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm',
          variant === 'secondary' && 'bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300',
          variant === 'ghost' && 'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400',
          variant === 'danger' && 'bg-red-600 hover:bg-red-700 text-white',
          variant === 'icon' && 'w-8 h-8 p-0 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 dark:text-surface-400',
          size === 'sm' && variant !== 'icon' && 'px-2.5 py-1.5 text-xs',
          size === 'md' && variant !== 'icon' && 'px-4 py-2 text-sm',
          size === 'lg' && variant !== 'icon' && 'px-6 py-2.5 text-base',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';