// src/components/ui/Dialog.tsx
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './Button';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={cn(
          'relative w-full max-w-md mx-4 bg-white dark:bg-surface-900 rounded-2xl shadow-xl animate-scale-in',
          className,
        )}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-surface-500 mt-1">{description}</p>
            )}
          </div>
          <Button variant="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
};