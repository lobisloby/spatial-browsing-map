import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

// Map sizes to icon files and display dimensions
const sizeConfig = {
  sm: { icon: '/icons/icon32.png', iconSize: 24 },
  md: { icon: '/icons/icon48.png', iconSize: 32 },
  lg: { icon: '/icons/icon128.png', iconSize: 48 },
};

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const config = sizeConfig[size];

  return (
    <div className="flex items-center gap-2">
      <img
        src={config.icon}
        alt="Spatial Map"
        width={config.iconSize}
        height={config.iconSize}
        className="object-contain"
      />
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight text-surface-900 dark:text-white',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-lg',
          )}
        >
          Spatial<span className="text-gradient">Map</span>
        </span>
      )}
    </div>
  );
};