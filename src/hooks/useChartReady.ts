import { useEffect, useState, useRef } from 'react';
import { useGlobalChartHydration } from './useGlobalChartHydration';
import { chartLogger, logChartReady } from '@/utils/chartLogger';

/**
 * Hook to ensure charts are only rendered after proper hydration
 * and data is available. This prevents the "Cannot read properties of null (reading 'useRef')" error
 * that occurs when @nivo charts try to access DOM elements before they're ready.
 */
export function useChartReady(dependencies: any[] = []) {
  const [isDataReady, setIsDataReady] = useState(false);
  const isGloballyHydrated = useGlobalChartHydration();
  const prevDependenciesRef = useRef<any[]>([]);

  useEffect(() => {
    // Check if all dependencies are truthy (data is loaded)
    const allDependenciesLoaded = dependencies.every(dep => 
      dep !== null && dep !== undefined && 
      (Array.isArray(dep) ? dep.length > 0 : true)
    );

    const dependenciesChanged = !Object.is(prevDependenciesRef.current, dependencies);
    
    if (dependenciesChanged) {
      prevDependenciesRef.current = dependencies;
      setIsDataReady(allDependenciesLoaded);
      logChartReady('useChartReady', {
        status: 'data_dependencies_checked',
        allDependenciesLoaded,
        dependenciesChanged,
        dependencies: dependencies.map(dep => ({
          type: typeof dep,
          isArray: Array.isArray(dep),
          length: Array.isArray(dep) ? dep.length : undefined,
          isTruthy: !!dep
        }))
      });
    }
  }, [dependencies]);

  // Log global hydration status
  useEffect(() => {
    chartLogger.log('useChartReady', 'GLOBAL_HYDRATION_STATUS', { isGloballyHydrated });
  }, [isGloballyHydrated]);

  // Chart is ready when both data is ready AND global hydration is complete
  const chartIsReady = isDataReady && isGloballyHydrated;

  useEffect(() => {
    chartLogger.log('useChartReady', 'FINAL_CHART_READY_STATUS', {
      isDataReady,
      isGloballyHydrated,
      chartIsReady
    });
  }, [isDataReady, isGloballyHydrated, chartIsReady]);

  return chartIsReady;
}