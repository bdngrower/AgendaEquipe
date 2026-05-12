import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div 
        className={cn(
          "relative flex flex-col w-full max-w-lg rounded-2xl bg-white dark:bg-dark-surface border border-zinc-200/80 dark:border-dark-border shadow-2xl transition-all scale-100 max-h-[90vh]",
          className
        )}
      >
        <div className="p-6 pb-0 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-dark-surface-hover">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pt-5">
          {children}
        </div>
        {footer && (
          <div className="p-6 pt-0 border-t border-zinc-100 dark:border-dark-border mt-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
