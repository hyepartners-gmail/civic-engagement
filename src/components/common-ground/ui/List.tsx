import React from 'react';
import { cn } from '@/lib/utils';

interface ListProps {
  children: React.ReactNode;
  className?: string;
}

export function List({ children, className }: ListProps) {
  return (
    <ul role="list" className={cn('divide-y divide-platform-contrast', className)}>
      {children}
    </ul>
  );
}

interface ListItemProps {
  children: React.ReactNode;
  className?: string;
}

export function ListItem({ children, className }: ListItemProps) {
  return (
    <li className={cn('flex items-center justify-between gap-x-6 py-4', className)}>
      {children}
    </li>
  );
}