"use client";

import { useClimateState } from '@/hooks/useClimateState';
import { useEffect, useState } from 'react';

interface YearReadoutProps {
  label?: string;
}

// Add window type declaration for hoveredTemp
declare global {
  interface Window {
    hoveredTemp: number | null;
  }
}

export default function YearReadout({ label = 'Year' }: YearReadoutProps) {
  const { year } = useClimateState();
  const [temp, setTemp] = useState<number | null>(null);
  
  // Listen for temperature updates from WarmingStripes
  useEffect(() => {
    const checkTemp = () => {
      setTemp(window.hoveredTemp);
    };
    
    // Check initially
    checkTemp();
    
    // Set up an interval to check for temp changes
    const interval = setInterval(checkTemp, 100);
    
    return () => clearInterval(interval);
  }, []);
  
  // Format temperature with sign
  const formatTemp = (temp: number | null | undefined): string => {
    if (temp == null) return ''; // This checks for both null and undefined
    return `${temp >= 0 ? '+' : ''}${temp.toFixed(1)}°C`;
  };
  
  return (
    <div className="mt-2 text-center">
      <div className="text-sm text-gray-500">
        {label}: <span className="font-medium">{year || '—'}</span>
        {year && (
          <span className="ml-2 font-medium">{formatTemp(temp)}</span>
        )}
      </div>
    </div>
  );
}
