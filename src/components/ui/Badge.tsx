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
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    indigo:
      'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    amber:
      'bg-amber-500/10 text-amber-400 border-amber-500/30',
    rose:
      'bg-rose-500/10 text-rose-400 border-rose-500/30',
    slate:
      'bg-slate-800 text-slate-300 border-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
