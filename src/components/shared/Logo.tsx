import React from 'react';
import { Map } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => (
  <div className="flex items-center gap-2">
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white',
        size === 'sm' && 'w-6 h-6',
        size === 'md' && 'w-8 h-8',
        size === 'lg' && 'w-10 h-10',
      )}
    >
      <Map className={cn(size === 'sm' && 'w-3.5 h-3.5', size === 'md' && 'w-4 h-4', size === 'lg' && 'w-5 h-5')} />
    </div>
    {showText && (
      <span className={cn('font-bold tracking-tight text-surface-900 dark:text-white', size === 'sm' && 'text-sm', size === 'md' && 'text-base', size === 'lg' && 'text-lg')}>
        Spatial<span className="text-gradient">Map</span>
      </span>
    )}
  </div>
);