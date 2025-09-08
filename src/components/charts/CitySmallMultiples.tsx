"use client";

import { useMemo } from 'react';
import TileTempAnomaly from './TileTempAnomaly';
import TileHotDays from './TileHotDays';
import { Card } from '@/components/shared/Card';

interface CitySmallMultiplesProps {
  cityData: Record<string, {
    tempAnomaly: [number, number | null][];
    hotDays: [number, number | null][];
  }>;
  cityNames: Record<string, string>;
  syncY: boolean;
  yearRange: [number, number] | null;
  threshold: number;
}

// Add interface for synced domains
interface SyncedDomains {
  tempAnomaly: [number, number] | null;
  hotDays: [number, number] | null;
}

export default function CitySmallMultiples({ 
  cityData, 
  cityNames,
  syncY,
  yearRange,
  threshold
}: CitySmallMultiplesProps) {
  // Compute synced domains if syncY is enabled
  const syncedDomains = useMemo<SyncedDomains | null>(() => {
    if (!syncY) return null;
    
    const tempAnomalySeries: Record<string, [number, number | null][]> = {};
    const hotDaysSeries: Record<string, [number, number | null][]> = {};
    
    Object.entries(cityData).forEach(([cityId, data]) => {
      tempAnomalySeries[cityId] = data.tempAnomaly;
      hotDaysSeries[cityId] = data.hotDays;
    });
    
    return {
      tempAnomaly: computeSyncedDomain(tempAnomalySeries),
      hotDays: computeSyncedDomain(hotDaysSeries)
    };
  }, [cityData, syncY]);
  
  // Helper function to compute domain for a set of series
  const computeSyncedDomain = (seriesByCity: Record<string, [number, number | null][]>) => {
    let globalMin = Infinity;
    let globalMax = -Infinity;
    let hasValidData = false;
    
    Object.values(seriesByCity).forEach(series => {
      series.forEach(([_, value]) => {
        if (value !== null) {
          hasValidData = true;
          globalMin = Math.min(globalMin, value);
          globalMax = Math.max(globalMax, value);
        }
      });
    });
    
    // If no valid data, return a default domain
    if (!hasValidData) {
      return [-1, 1] as [number, number];
    }
    
    // Add some padding
    const range = globalMax - globalMin;
    const padding = range > 0 ? range * 0.1 : 1;
    
    // Handle edge case where all values are the same
    if (range === 0) {
      return [globalMin - 1, globalMax + 1] as [number, number];
    }
    
    return [globalMin - padding, globalMax + padding] as [number, number];
  };
  
  // Trim data based on year range
  const trimmedCityData = useMemo(() => {
    if (!yearRange) return cityData;
    
    const [startYear, endYear] = yearRange;
    const result: Record<string, {
      tempAnomaly: [number, number | null][];
      hotDays: [number, number | null][];
    }> = {};
    
    Object.entries(cityData).forEach(([cityId, data]) => {
      result[cityId] = {
        tempAnomaly: data.tempAnomaly.filter(([year]) => year >= startYear && year <= endYear),
        hotDays: data.hotDays.filter(([year]) => year >= startYear && year <= endYear)
      };
    });
    
    return result;
  }, [cityData, yearRange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(trimmedCityData).map(([cityId, data]) => (
        <Card key={cityId} className="p-4">
          <h3 className="text-lg font-semibold mb-3 text-center">{cityNames[cityId] || cityId}</h3>
          <div className="space-y-4">
            <TileTempAnomaly 
              series={data.tempAnomaly} 
              syncedDomain={syncY ? syncedDomains?.tempAnomaly : undefined}
            />
            <TileHotDays 
              series={data.hotDays} 
              syncedDomain={syncY ? syncedDomains?.hotDays : undefined}
              threshold={threshold}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}