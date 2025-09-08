"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ManualChartLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  chartName?: string;
}

export default function ManualChartLoader({ 
  children, 
  fallback,
  className = "",
  chartName = "chart"
}: ManualChartLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadChart = async () => {
    setIsLoading(true);
    
    // Wait a moment to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsLoaded(true);
    setIsLoading(false);
  };

  if (isLoaded) {
    return <div className={className}>{children}</div>;
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-full h-full bg-platform-contrast/30 animate-pulse rounded mb-4" />
          <span className="text-platform-text/70">Loading {chartName}...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="text-center">
        {fallback || (
          <div className="w-full h-full bg-platform-contrast/30 rounded mb-4 flex items-center justify-center">
            <span className="text-platform-text/50">Click to load {chartName}</span>
          </div>
        )}
        <Button 
          onClick={handleLoadChart}
          variant="outline"
          size="sm"
          className="mt-4"
        >
          Load {chartName}
        </Button>
      </div>
    </div>
  );
}