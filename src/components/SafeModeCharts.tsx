"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SafeModeChartsProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  chartName?: string;
}

export default function SafeModeCharts({ 
  children, 
  fallback,
  className = "",
  chartName = "charts"
}: SafeModeChartsProps) {
  const [chartsEnabled, setChartsEnabled] = useState(false);
  const [autoEnableAttempted, setAutoEnableAttempted] = useState(false);

  // Try to auto-enable charts after a long delay
  useEffect(() => {
    if (autoEnableAttempted) return;

    const timer = setTimeout(() => {
      setAutoEnableAttempted(true);
      
      // Only auto-enable if we're confident React is stable
      try {
        const ReactInternals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        const dispatcher = ReactInternals?.ReactCurrentDispatcher?.current;
        
        if (dispatcher && dispatcher.useRef && dispatcher.useState) {
          setChartsEnabled(true);
        }
      } catch (error) {
        console.warn('Auto-enable failed, manual enable required');
      }
    }, 3000); // Wait 3 seconds

    return () => clearTimeout(timer);
  }, [autoEnableAttempted]);

  if (chartsEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center p-8">
        {fallback || (
          <div className="w-full h-32 bg-platform-contrast/30 rounded mb-4 flex items-center justify-center">
            <span className="text-platform-text/50">Charts disabled for stability</span>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm text-platform-text/70">
            {autoEnableAttempted 
              ? `${chartName} are disabled to prevent crashes` 
              : `Loading ${chartName}...`
            }
          </p>
          {autoEnableAttempted && (
            <Button 
              onClick={() => setChartsEnabled(true)}
              variant="outline"
              size="sm"
            >
              Enable {chartName}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}