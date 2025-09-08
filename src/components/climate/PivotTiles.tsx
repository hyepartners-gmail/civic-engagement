"use client";
import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import { computePivot, selectMetricSeries, reducers } from "@/lib/selectors/pivot";
import { safeCoverage } from "@/utils/array";
import { Card } from "@/components/shared/Card";
import DiffBar from "@/components/charts/DiffBar";
import { fmtShort } from "@/utils/number";
import { useState, useEffect, useRef } from "react";

// Define all metrics with their properties
const ALL_METRICS = [
  { key: 'tempAnomaly', name: 'Avg Temp Anomaly', reducer: reducers.mean, unit: '°F', isGood: false, description: 'Average temperature anomaly from baseline period' },
  { key: 'precipTotal', name: 'Total Precipitation', reducer: reducers.sum, unit: 'in', isGood: true, description: 'Total annual precipitation' },
  { key: 'hotDays90F', name: 'Days Above 90°F', reducer: reducers.mean, unit: ' days', isGood: false, description: 'Average number of days above 90°F' },
  { key: 'warmNights70F', name: 'Nights Above 70°F', reducer: reducers.mean, unit: ' nights', isGood: false, description: 'Average number of nights above 70°F' },
  { key: 'coldDays32F', name: 'Days Below 32°F', reducer: reducers.mean, unit: ' days', isGood: true, description: 'Average number of days below 32°F' },
  { key: 'disasters.total', name: 'Total Disasters', reducer: reducers.sum, unit: ' events', isGood: false, description: 'Total number of climate disasters' },
  { key: 'emissions.co2', name: 'CO₂ Emissions', reducer: reducers.mean, unit: ' Mt', isGood: false, description: 'Annual CO₂ emissions' },
  { key: 'wildfire.acresBurned', name: 'Acres Burned', reducer: reducers.sum, unit: ' acres', isGood: false, description: 'Total acres burned by wildfires' },
  { key: 'wildfire.fires', name: 'Wildfire Count', reducer: reducers.sum, unit: ' fires', isGood: false, description: 'Total number of wildfires' },
];

// Filter metrics based on metric set
const getFilteredMetrics = (metricSet: string) => {
  switch (metricSet) {
    case 'temperature':
      return ALL_METRICS.filter(m => m.key.includes('temp') || m.key.includes('Days') || m.key.includes('Nights') || m.key.includes('cold'));
    case 'precipitation':
      return ALL_METRICS.filter(m => m.key.includes('precip'));
    case 'extremes':
      return ALL_METRICS.filter(m => m.key.includes('Days') || m.key.includes('Nights') || m.key.includes('cold'));
    case 'disasters':
      return ALL_METRICS.filter(m => m.key.includes('disasters'));
    case 'emissions':
      return ALL_METRICS.filter(m => m.key.includes('emissions'));
    case 'wildfire':
      return ALL_METRICS.filter(m => m.key.includes('wildfire'));
    default:
      // For 'all' metric set, filter out metrics that we know have limited data
      return ALL_METRICS.filter(m => 
        !m.key.includes('max') // Remove max precipitation metrics which may have limited data
      );
  }
};

export default function PivotTiles() {
  const { data: artifact } = useClimateArtifact();
  const climateState = useClimateState();
  const { city, state } = climateState;
  
  // URL state for additional parameters
  const [scope] = useUrlState<'city' | 'state' | 'national'>('scope', 'city');
  const [metricSet] = useUrlState<string>('metricSet', 'all');
  const [compareCities] = useUrlState<string | null>('compareCities', null);
  const [beforeRangeStart] = useUrlState<number>('beforeStart', 1900);
  const [beforeRangeEnd] = useUrlState<number>('beforeEnd', 1970);
  const [afterRangeStart] = useUrlState<number>('afterStart', 1971);
  const [afterRangeEnd] = useUrlState<number>('afterEnd', 2023);
  const [flipBaseline] = useUrlState<boolean>('flipBaseline', false);

  const [focusedTile, setFocusedTile] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (!artifact) return null;

  const metrics = getFilteredMetrics(metricSet || 'all');
  
  // Determine the ranges based on flipBaseline
  const beforeRange: [number, number] = flipBaseline 
    ? [afterRangeStart || 1971, afterRangeEnd || 2023] 
    : [beforeRangeStart || 1900, beforeRangeEnd || 1970];
    
  const afterRange: [number, number] = flipBaseline 
    ? [beforeRangeStart || 1900, beforeRangeEnd || 1970] 
    : [afterRangeStart || 1971, afterRangeEnd || 2023];

  // Get cities to compare
  const citiesToCompare = compareCities 
    ? compareCities.split(',').filter(Boolean) 
    : [city];

  const handleKeyDown = (e: React.KeyboardEvent, index: number, cityIndex: number, metricKey: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFocusedTile(index);
    } else if (e.key === 'Escape') {
      setFocusedTile(null);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % metrics.length;
      tileRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + metrics.length) % metrics.length;
      tileRefs.current[prevIndex]?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextRow = index + 3;
      if (nextRow < metrics.length) {
        tileRefs.current[nextRow]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = index - 3;
      if (prevRow >= 0) {
        tileRefs.current[prevRow]?.focus();
      }
    }
  };

  return (
    <div className="space-y-6">
      {citiesToCompare.map((compareCity, cityIndex) => (
        <div key={`${compareCity}-${cityIndex}`} className={citiesToCompare.length > 1 ? "border-b pb-6 mb-6" : ""}>
          {citiesToCompare.length > 1 && (
            <h3 className="text-lg font-semibold mb-4 capitalize">
              {compareCity.replace('-', ' ')}
            </h3>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => {
              const series = selectMetricSeries(artifact, metric.key, scope || 'city', compareCity);
              const hasSufficientCoverage = safeCoverage(series, 0.8);
              const pivot = computePivot(series, beforeRange, afterRange, metric.reducer);
              
              // Check if we have any data at all
              const hasData = series && series.length > 0 && 
                series.some(([year, value]) => value !== null && value !== undefined);

              return (
                <div
                  key={`${compareCity}-${metric.key}`}
                  ref={el => {
                    if (tileRefs.current) {
                      tileRefs.current[cityIndex * metrics.length + index] = el;
                    }
                  }}
                  tabIndex={0}
                  className={`focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg ${
                    focusedTile === cityIndex * metrics.length + index ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onKeyDown={(e) => handleKeyDown(e, index, cityIndex, metric.key)}
                  aria-label={`${metric.name}: ${pivot.before?.toFixed(1) ?? 'N/A'}${metric.unit} before, ${pivot.after?.toFixed(1) ?? 'N/A'}${metric.unit} after`}
                >
                  <Card className="p-4 h-full">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm">{metric.name}</h4>
                      {!hasSufficientCoverage && hasData && (
                        <span className="text-xs text-yellow-500" title="Low data coverage">
                          ⚠️
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-platform-text/70 mb-2">{metric.description}</p>
                    
                    {!hasData ? (
                      <div className="text-center py-4">
                        <p className="text-platform-text/50 italic">No data available</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-baseline my-2">
                          <div className="text-center">
                            <p className="text-xs text-platform-text/70">
                              {beforeRange[0]}-{beforeRange[1]}
                            </p>
                            <p className="text-lg font-bold">
                              {pivot.before?.toFixed(1) ?? 'N/A'}{metric.unit}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-platform-text/70">
                              {afterRange[0]}-{afterRange[1]}
                            </p>
                            <p className="text-lg font-bold">
                              {pivot.after?.toFixed(1) ?? 'N/A'}{metric.unit}
                            </p>
                          </div>
                        </div>
                        <DiffBar pctChange={pivot.pctChange} isGood={metric.isGood} />
                        {pivot.delta !== null && (
                          <p className="text-xs text-platform-text/70 mt-2 text-center">
                            Change: {pivot.delta > 0 ? '+' : ''}{pivot.delta.toFixed(1)}{metric.unit}
                          </p>
                        )}
                      </>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}