import React from 'react';
import { cn } from '@/lib/utils';

export const Separator: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('h-px w-full bg-surface-200 dark:bg-surface-800', className)} />
);