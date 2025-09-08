"use client";

import { ReactNode } from 'react';
import { Card } from '@/components/shared/Card';
import LoadingSpinner from '@/components/LoadingSpinner'; // Import the new LoadingSpinner

interface ChartContainerProps {
  children: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
}

export default function ChartContainer({ 
  children, 
  isLoading = false, 
  isError = false, 
  error = null 
}: ChartContainerProps) {
  if (isLoading) {
    return (
      <Card className="p-6 min-h-[300px] flex items-center justify-center">
        <LoadingSpinner spinnerSize="md" message="loading chart" /> {/* Use the new spinner */}
      </Card>
    );
  }
  
  if (isError) {
    return (
      <Card className="p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center text-red-500">
          <p className="font-medium">Error loading data</p>
          {error && (
            <p className="mt-1 text-sm">{error.message}</p>
          )}
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 relative z-[1]">
      {children}
    </Card>
  );
}