"use client";

import { useState, useMemo } from 'react';
import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import HeatEconomyScatter from "@/components/charts/HeatEconomyScatter";
import QuadrantLegend from "@/components/charts/QuadrantLegend";
import MetricPicker from "@/components/controls/MetricPicker";
import FitToggle from "@/components/controls/FitToggle";
import { 
  selectSummerAnomaly, 
  selectSectorProxy, 
  alignYears, 
  calculateLinearRegression 
} from "@/lib/selectors/heatEconomy";
import { Card } from "@/components/shared/Card";
import YearReadout from "../climate/YearReadout";

// Map cities to states
const CITY_TO_STATE: Record<string, string> = {
  'seattle': 'wa',
  'los-angeles': 'ca',
  'chicago': 'il',
  'houston': 'tx',
  'atlanta': 'ga',
  'new-york': 'ny'
};

const SOURCES = [
  { name: "Berkeley Earth", url: "https://berkeleyearth.org/data/" },
  { name: "BLS", url: "https://www.bls.gov/" },
  { name: "BEA", url: "https://www.bea.gov/" },
  { name: "USDA", url: "https://www.usda.gov/" }
];

export default function StoryHeatEconomy() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { city } = useClimateState();
  
  // URL state parameters
  const [metric, setMetric] = useUrlState<string>('metric', 'construction');
  const [fit, setFit] = useUrlState<string>('fit', 'none');
  const [scope, setScope] = useUrlState<'city' | 'state'>('scope', 'state');
  
  // Get state ID for the current city
  const stateId = CITY_TO_STATE[city] || 'wa'; // Default to Washington if not found
  
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }
  
  // Get summer anomaly data
  const anomalySeries = selectSummerAnomaly(data, { 
    scope, 
    id: scope === 'city' ? city : stateId 
  });
  
  // Get sector proxy data
  const proxySeries = selectSectorProxy(data, { 
    metricKey: metric, 
    scope, 
    id: scope === 'city' ? city : stateId 
  });
  
  // Align the series by year
  const alignedData = alignYears(anomalySeries, proxySeries);
  
  // Calculate median proxy value for quadrant threshold
  const yThreshold = useMemo(() => {
    if (alignedData.length === 0) return 0;
    
    const proxyValues = alignedData.map(([_, __, proxy]) => proxy).sort((a, b) => a - b);
    const mid = Math.floor(proxyValues.length / 2);
    
    if (proxyValues.length % 2 === 0) {
      return (proxyValues[mid - 1] + proxyValues[mid]) / 2;
    } else {
      return proxyValues[mid];
    }
  }, [alignedData]);
  
  // Calculate fit line points if enabled
  const fitLinePoints: [number, number][] = useMemo(() => {
    if (fit !== 'linear' || alignedData.length < 10) return [];
    
    // Convert to [anomaly, proxy] pairs for regression
    const points: [number, number][] = alignedData.map(([_, anomaly, proxy]) => [anomaly, proxy]);
    
    // Calculate regression
    const { slope } = calculateLinearRegression(points);
    
    // Create fit line points
    if (points.length === 0) return [];
    
    const xMin = Math.min(...points.map(p => p[0]));
    const xMax = Math.max(...points.map(p => p[0]));
    
    // Calculate y values for the fit line
    const yMin = slope * xMin;
    const yMax = slope * xMax;
    
    return [
      [xMin, yMin],
      [xMax, yMax]
    ];
  }, [alignedData, fit]);
  
  // Calculate R² if enabled
  const r2 = useMemo(() => {
    if (fit !== 'linear' || alignedData.length < 10) return undefined;
    
    const points: [number, number][] = alignedData.map(([_, anomaly, proxy]) => [anomaly, proxy]);
    return calculateLinearRegression(points).r2;
  }, [alignedData, fit]);
  
  // Check if we have sufficient data
  const hasSufficientData = alignedData.length > 0;
  const hasFitData = fit === 'linear' && alignedData.length >= 10;
  
  // Get metric label for display
  const metricLabels: Record<string, string> = {
    'construction': 'Construction Hours',
    'agriculture': 'Agriculture Yield Proxy',
    'energy': 'Electric Load Proxy'
  };
  
  const metricLabel = metricLabels[metric] || metric;

  return (
    <div>
      <StoryHeader
        title="When Heat Meets the Economy"
        description="Correlation between summer temperature anomalies and sector productivity proxies."
        sources={SOURCES}
      />
      
      <Card className="p-4 mb-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <MetricPicker metric={metric} onMetricChange={setMetric} />
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Scope</label>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    scope === 'state' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setScope('state')}
                >
                  State
                </button>
                <button
                  className={`px-3 py-1 rounded text-sm ${
                    scope === 'city' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => setScope('city')}
                >
                  City
                </button>
              </div>
            </div>
            
            <FitToggle 
              enabled={fit === 'linear'} 
              onToggle={(enabled) => setFit(enabled ? 'linear' : 'none')} 
              r2={r2}
            />
          </div>
        </div>
      </Card>
      
      {!hasSufficientData && (
        <div className="p-4 mb-4 text-center bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            Insufficient data available for this visualization. Sector productivity proxy data coming soon.
          </p>
        </div>
      )}
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        {hasSufficientData ? (
          <>
            <HeatEconomyScatter
              points={alignedData}
              colorByYear={true}
              showFitLine={hasFitData}
              fitLinePoints={fitLinePoints}
              yAxisLabel={metricLabel}
            />
            
            <QuadrantLegend
              xThreshold={0} // Always 0°C for temperature anomaly
              yThreshold={yThreshold}
              yAxisLabel={metricLabel}
            />
          </>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <p>No data available for visualization</p>
          </div>
        )}
        
        <YearReadout />
      </ChartContainer>
    </div>
  );
}