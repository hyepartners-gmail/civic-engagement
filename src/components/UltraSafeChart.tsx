"use client";
import React, { useEffect, useState, useRef } from 'react';

interface UltraSafeChartProps {
  chartFactory: () => Promise<React.ComponentType<any>>;
  chartProps: any;
  fallback?: React.ReactNode;
  className?: string;
}

export default function UltraSafeChart({ 
  chartFactory, 
  chartProps, 
  fallback = <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />,
  className = ""
}: UltraSafeChartProps) {
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const loadChart = async () => {
      try {
        // Wait for environment to be completely ready
        if (typeof window === 'undefined') return;
        
        // Wait for document to be fully loaded
        await new Promise<void>((resolve) => {
          if (document.readyState === 'complete') {
            resolve();
          } else {
            const handler = () => {
              if (document.readyState === 'complete') {
                document.removeEventListener('readystatechange', handler);
                resolve();
              }
            };
            document.addEventListener('readystatechange', handler);
          }
        });

        // Wait for container to be mounted
        let attempts = 0;
        while (attempts < 50 && (!containerRef.current || !containerRef.current.isConnected)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!containerRef.current?.isConnected) {
          throw new Error('Container not properly mounted');
        }

        // Validate React context multiple times
        for (let i = 0; i < 5; i++) {
          const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
          const dispatcher = ReactInternals?.ReactCurrentDispatcher?.current;
          
          if (!dispatcher || !dispatcher.useRef || !dispatcher.useState) {
            if (i === 4) throw new Error('React context not stable');
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
          break;
        }

        if (!mountedRef.current) return;

        // Load the chart component
        const Component = await chartFactory();
        
        if (mountedRef.current) {
          setChartComponent(() => Component);
          // Additional delay before marking as ready
          setTimeout(() => {
            if (mountedRef.current) {
              setIsReady(true);
            }
          }, 300);
        }
      } catch (err) {
        console.error('Ultra safe chart loading failed:', err);
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Chart loading failed');
        }
      }
    };

    // Start loading after a significant delay
    const timer = setTimeout(loadChart, 2000);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, [chartFactory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (error) {
    return (
      <div ref={containerRef} className={className}>
        <div className="w-full h-full bg-yellow-50 border border-yellow-200 rounded flex items-center justify-center">
          <div className="text-center">
            <span className="text-yellow-700 text-sm block">Chart temporarily unavailable</span>
            <span className="text-yellow-600 text-xs">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!ChartComponent || !isReady) {
    return (
      <div ref={containerRef} className={className}>
        {fallback}
      </div>
    );
  }

  // Final safety wrapper
  try {
    return (
      <div ref={containerRef} className={className}>
        <ChartComponent {...chartProps} />
      </div>
    );
  } catch (renderError) {
    console.error('Chart render error:', renderError);
    return (
      <div ref={containerRef} className={className}>
        <div className="w-full h-full bg-yellow-50 border border-yellow-200 rounded flex items-center justify-center">
          <span className="text-yellow-700 text-sm">Chart render failed</span>
        </div>
      </div>
    );
  }
}