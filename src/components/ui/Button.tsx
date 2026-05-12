import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          {
            'bg-blue-600 text-white shadow-sm hover:bg-blue-700 hover:shadow focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500': variant === 'primary',
            'bg-zinc-100 dark:bg-dark-surface text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-dark-surface-hover shadow-sm border border-transparent dark:border-dark-border focus-visible:ring-zinc-600': variant === 'secondary',
            'border border-zinc-200 dark:border-dark-border bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-dark-surface text-zinc-900 dark:text-zinc-100 shadow-sm focus-visible:ring-zinc-600': variant === 'outline',
            'hover:bg-zinc-100 dark:hover:bg-dark-surface text-zinc-700 dark:text-zinc-300 focus-visible:ring-zinc-600': variant === 'ghost',
            'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600': variant === 'danger',
            'h-9 px-3.5 text-xs': size === 'sm',
            'h-10 py-2 px-4 text-sm': size === 'md',
            'h-11 px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
