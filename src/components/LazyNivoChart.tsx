"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useGlobalChartHydration } from '@/hooks/useGlobalChartHydration';
import { chartLogger, logChartStart, logChartError, logChartSuccess, logChartRender } from '@/utils/chartLogger';
import dynamic from 'next/dynamic';

// Dynamically import Nivo chart components
const ResponsiveSunburst = dynamic(() => import('@nivo/sunburst').then(mod => mod.ResponsiveSunburst), { ssr: false });
const ResponsiveLine = dynamic(() => import('@nivo/line').then(mod => mod.ResponsiveLine), { ssr: false });
const ResponsiveBar = dynamic(() => import('@nivo/bar').then(mod => mod.ResponsiveBar), { ssr: false });
const ResponsiveTreeMap = dynamic(() => import('@nivo/treemap').then(mod => mod.ResponsiveTreeMap), { ssr: false });
const ResponsiveStream = dynamic(() => import('@nivo/stream').then(mod => mod.ResponsiveStream), { ssr: false });

// Export the interface so it can be used for typing dynamic imports
export interface LazyNivoChartProps { 
  chartType: 'sunburst' | 'line' | 'bar' | 'treemap' | 'stream';
  chartProps: any;
  fallback?: React.ReactNode;
  className?: string;
  isParentReady: boolean; // New prop to signal parent's readiness
}

export default function LazyNivoChart({ 
  chartType, 
  chartProps, 
  fallback = <div className="w-full h-full bg-platform-contrast/30 animate-pulse" />,
  className = "",
  isParentReady // Destructure new prop
}: LazyNivoChartProps) {
  const [ChartComponent, setChartComponent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComponentLoaded, setIsComponentLoaded] = useState(false);
  const mountedRef = useRef(true);
  const isGloballyHydrated = useGlobalChartHydration(); // Use global hydration signal

  // Log initialization
  useEffect(() => {
    logChartStart(`LazyNivoChart-${chartType}`, { 
      chartType, 
      hasProps: !!chartProps,
      className 
    });
    chartLogger.logEnvironment(`LazyNivoChart-${chartType}`);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    chartLogger.log(`LazyNivoChart-${chartType}`, 'PARENT_READY_CHECK', { isParentReady, isGloballyHydrated });
    
    // Only proceed if parent is ready AND global hydration is complete
    if (!isParentReady || !isGloballyHydrated) {
      chartLogger.log(`LazyNivoChart-${chartType}`, 'WAITING_FOR_READY');
      return;
    }

    const loadChart = async () => {
      try {
        chartLogger.log(`LazyNivoChart-${chartType}`, 'LOAD_CHART_START');
        
        // Dynamically import the Nivo chart component
        chartLogger.log(`LazyNivoChart-${chartType}`, 'DYNAMIC_IMPORT_START', { chartType });
        let ComponentToSet: React.ComponentType<any> | null = null;
        switch (chartType) {
          case 'sunburst':
            ComponentToSet = ResponsiveSunburst;
            break;
          case 'line':
            ComponentToSet = ResponsiveLine;
            break;
          case 'bar':
            ComponentToSet = ResponsiveBar;
            break;
          case 'treemap':
            ComponentToSet = ResponsiveTreeMap;
            break;
          case 'stream':
            ComponentToSet = ResponsiveStream;
            break;
          default:
            throw new Error(`Unknown chart type: ${chartType}`);
        }
        
        if (mountedRef.current) {
          setChartComponent(() => ComponentToSet);
          setIsComponentLoaded(true);
          chartLogger.log(`LazyNivoChart-${chartType}`, 'CHART_COMPONENT_SET_SUCCESS');
        }
      } catch (err) {
        logChartError(`LazyNivoChart-${chartType}`, err, { mounted: mountedRef.current, chartType });
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load chart');
        }
      }
    };

    loadChart();

    return () => {
      mountedRef.current = false;
    };
  }, [chartType, isParentReady, isGloballyHydrated]); // Depend on parent's readiness AND global hydration

  if (error) {
    chartLogger.log(`LazyNivoChart-${chartType}`, 'RENDER_ERROR_STATE', { error });
    return (
      <div className="w-full h-full bg-red-50 border border-red-200 rounded flex items-center justify-center">
        <span className="text-red-600 text-sm">Chart failed to load: {error}</span>
      </div>
    );
  }

  if (!isComponentLoaded || !ChartComponent) {
    chartLogger.log(`LazyNivoChart-${chartType}`, 'RENDER_LOADING_STATE');
    return fallback;
  }

  const nivoChartProps = chartProps; 

  try {
    chartLogger.log(`LazyNivoChart-${chartType}`, 'RENDER_ATTEMPT', { 
      hasChartComponent: !!ChartComponent,
      propsKeys: Object.keys(nivoChartProps)
    });
    logChartRender(`LazyNivoChart-${chartType}`, { chartType });
    
    const result = <ChartComponent {...nivoChartProps} />;
    
    logChartSuccess(`LazyNivoChart-${chartType}`, { chartType });
    return result;
  } catch (err) {
    logChartError(`LazyNivoChart-${chartType}`, err, { chartType, hasProps: !!nivoChartProps });
    return (
      <div className="w-full h-full bg-red-50 border border-red-200 rounded flex items-center justify-center">
        <span className="text-red-600 text-sm">Chart render failed</span>
      </div>
    );
  }
}