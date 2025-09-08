import React, { useEffect, useState, useRef } from 'react';
import { useGlobalChartHydration } from '@/hooks/useGlobalChartHydration';

interface SafeChartRendererProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

// Error boundary specifically for chart components
class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if this is the specific @nivo useRef error
    if (error.message.includes("Cannot read properties of null (reading 'useRef')")) {
      return { hasError: true };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('Chart rendering error caught:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export default function SafeChartRenderer({ 
  children, 
  fallback = <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />,
  className = ""
}: SafeChartRendererProps) {
  const [isSafeToRender, setIsSafeToRender] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isGloballyHydrated = useGlobalChartHydration();
  const [hasAttemptedRender, setHasAttemptedRender] = useState(false);

  useEffect(() => {
    // Only proceed if globally hydrated and container exists
    if (!isGloballyHydrated || !containerRef.current) {
      return;
    }

    // Additional safety checks
    const performSafetyChecks = () => {
      try {
        // Check if React context is available
        if (typeof React === 'undefined') {
          throw new Error('React not available');
        }

        // Check if we can safely create React elements
        const testElement = React.createElement('div');
        if (!testElement) {
          throw new Error('React.createElement failed');
        }

        // Check if the container is properly mounted in DOM
        if (!containerRef.current?.isConnected) {
          throw new Error('Container not connected to DOM');
        }

        // All checks passed
        setIsSafeToRender(true);
        setHasAttemptedRender(true);
      } catch (error) {
        console.warn('Chart safety check failed:', error);
        // Retry after a delay
        if (!hasAttemptedRender) {
          setTimeout(performSafetyChecks, 200);
          setHasAttemptedRender(true);
        }
      }
    };

    // Perform safety checks with a delay
    const timer = setTimeout(performSafetyChecks, 100);
    return () => clearTimeout(timer);
  }, [isGloballyHydrated, hasAttemptedRender]);

  return (
    <div ref={containerRef} className={className}>
      {isSafeToRender ? (
        <ChartErrorBoundary fallback={fallback}>
          {children}
        </ChartErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}