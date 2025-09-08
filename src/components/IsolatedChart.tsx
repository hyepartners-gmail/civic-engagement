"use client";
import React, { useEffect, useState, useRef } from 'react';

interface IsolatedChartProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  dependencies?: any[];
}

export default function IsolatedChart({ 
  children, 
  fallback = <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />,
  className = "",
  dependencies = []
}: IsolatedChartProps) {
  const [canRender, setCanRender] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset states
    setCanRender(false);
    setHasError(false);

    // Only proceed if we're on the client
    if (typeof window === 'undefined') {
      return;
    }

    // Check if all dependencies are ready
    const dependenciesReady = dependencies.every(dep => 
      dep !== null && dep !== undefined && 
      (Array.isArray(dep) ? dep.length > 0 : true)
    );

    if (!dependenciesReady) {
      return;
    }

    // Wait for multiple conditions to be met
    const checkReadiness = () => {
      try {
        // Check document state
        if (document.readyState !== 'complete') {
          timeoutRef.current = setTimeout(checkReadiness, 100);
          return;
        }

        // Check if container is mounted
        if (!containerRef.current?.isConnected) {
          timeoutRef.current = setTimeout(checkReadiness, 100);
          return;
        }

        // Check if React is fully loaded
        if (typeof React === 'undefined') {
          timeoutRef.current = setTimeout(checkReadiness, 100);
          return;
        }

        // Additional delay to ensure React context is stable
        timeoutRef.current = setTimeout(() => {
          setCanRender(true);
        }, 500); // Longer delay for safety

      } catch (error) {
        console.warn('Chart readiness check failed:', error);
        setHasError(true);
      }
    };

    // Start checking after initial delay
    timeoutRef.current = setTimeout(checkReadiness, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  // Error boundary effect
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes("Cannot read properties of null (reading 'useRef')")) {
        setHasError(true);
        setCanRender(false);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div ref={containerRef} className={className}>
        <div className="w-full h-full bg-red-100 border border-red-300 rounded flex items-center justify-center">
          <span className="text-red-600 text-sm">Chart temporarily unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {canRender ? children : fallback}
    </div>
  );
}