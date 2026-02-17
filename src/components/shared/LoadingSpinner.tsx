import React from 'react';
import { cn } from '@/lib/utils';

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => (
  <div
    className={cn(
      'animate-spin rounded-full border-2 border-surface-200 dark:border-surface-700 border-t-brand-500',
      size === 'sm' && 'w-4 h-4',
      size === 'md' && 'w-6 h-6',
      size === 'lg' && 'w-8 h-8',
    )}
  />
);