import { cn } from '@/lib/utils';

interface PillProps {
  children: React.ReactNode;
  className?: string;
  color?: 'default' | 'accent' | 'green' | 'red';
}

export default function Pill({ children, className, color = 'default' }: PillProps) {
  const colorClasses = {
    default: 'bg-platform-contrast text-platform-text',
    accent: 'bg-platform-accent text-platform-background',
    green: 'bg-green-500 text-white',
    red: 'bg-red-500 text-white',
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  );
}