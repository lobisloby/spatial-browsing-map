import React from 'react';
import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, description }) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer">
    {(label || description) && (
      <div className="flex-1 min-w-0">
        {label && <div className="text-sm font-medium text-surface-700 dark:text-surface-300">{label}</div>}
        {description && <div className="text-xs text-surface-500 mt-0.5">{description}</div>}
      </div>
    )}
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors',
        checked ? 'bg-brand-600' : 'bg-surface-300 dark:bg-surface-600',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5',
          checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5',
        )}
      />
    </button>
  </label>
);