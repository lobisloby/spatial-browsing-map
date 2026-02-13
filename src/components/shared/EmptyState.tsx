import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, className }) => (
  <div className={cn('flex flex-col items-center justify-center text-center p-8', className)}>
    <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-surface-400 mb-4">
      {icon}
    </div>
    <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1">{title}</h3>
    <p className="text-xs text-surface-500 max-w-[240px] mb-4">{description}</p>
    {action}
  </div>
);