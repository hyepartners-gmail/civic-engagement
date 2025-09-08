import { useEffect, useState, useRef } from 'react';
import { useGlobalChartHydration } from '@/hooks/useGlobalChartHydration';
import { cn } from '@/lib/utils';

interface ChartWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export default function ChartWrapper({ 
  children, 
  fallback = <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />,
  className = ""
}: ChartWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isGloballyHydrated = useGlobalChartHydration();

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check if global hydration is complete
    if (isGloballyHydrated) {
      // Add a small delay to ensure DOM is fully ready
      const timer = setTimeout(() => setIsReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isGloballyHydrated]);

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      {isReady ? children : fallback}
    </div>
  );
}
