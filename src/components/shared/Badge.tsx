import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary';
}

export default function Badge({ children, className, variant = 'default' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors';
  
  const variantClasses = {
    default: 'bg-platform-accent text-platform-background',
    secondary: 'bg-platform-contrast text-platform-text',
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
}