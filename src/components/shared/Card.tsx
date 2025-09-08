"use client";

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-platform-contrast rounded-lg border border-platform-accent/50 shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}