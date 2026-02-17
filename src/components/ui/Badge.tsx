import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', size = 'sm', children, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      variant === 'default' && 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400',
      variant === 'primary' && 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
      variant === 'success' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      variant === 'warning' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      variant === 'danger' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      size === 'sm' && 'px-1.5 py-0.5 text-2xs',
      size === 'md' && 'px-2.5 py-1 text-xs',
      className,
    )}
  >
    {children}
  </span>
);