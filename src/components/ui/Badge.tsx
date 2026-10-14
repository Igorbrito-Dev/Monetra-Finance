import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'indigo' | 'amber' | 'rose' | 'slate';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'slate',
  ...props
}) => {
  const variants = {
    emerald:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    indigo:
      'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    amber:
      'bg-amber-50 text-amber-700 border-amber-200/80',
    rose:
      'bg-rose-50 text-rose-700 border-rose-200/80',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200/80',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
