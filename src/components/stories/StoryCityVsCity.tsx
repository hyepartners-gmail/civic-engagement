"use client";

import { useMemo, useEffect, useState } from "react";
import { useClimateData } from "@/hooks/useClimateData";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectCityTempAnomalyFromRaw, selectCityHotDaysFromRaw } from "@/lib/selectors/rawClimate";
import { Card } from "@/components/shared/Card";
import LineSmall from "@/charts/LineSmall";
import dynamic from 'next/dynamic';
import { colors } from "@/lib/theme";
import CompareControls from "../controls/CompareControls";
import { safeCoverage } from "@/utils/array";
import { useViewportObserver } from "@/hooks/useViewportObserver";
import { logger } from "@/utils/logger";

const CITIES = [
  { id: 'seattle', name: 'Seattle, WA' },
  { id: 'los-angeles', name: 'Los Angeles, CA' },
  { id: 'chicago', name: 'Chicago, IL' },
  { id: 'houston', name: 'Houston, TX' },
  { id: 'atlanta', name: 'Atlanta, GA' },
  { id: 'new-york', name: 'New York, NY' },
];

const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle, WA',
  'los-angeles': 'Los Angeles, CA',
  'chicago': 'Chicago, IL',
  'houston': 'Houston, TX',
  'atlanta': 'Atlanta, GA',
  'new-york': 'New York, NY'
};

const SOURCES = [
  { name: "NOAA GHCN", url: "https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily" },
];

export default function StoryCityVsCity() {
  const { data, isLoading, isError, error } = useClimateData();
  const { basePeriod, cadence } = useClimateState();
  const [selectedCities, setSelectedCities] = useUrlState<string[]>('cities', ['seattle', 'los-angeles']);
  const [hotDayThreshold, setHotDayThreshold] = useUrlState<number>('ht', 90);
  const [syncY, setSyncY] = useState(true);
  
  const [setRef, isVisible] = useViewportObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isVisible) {
      logger.info('risk_story_view', { storyId: 'city-vs-city' });
    }
  }, [isVisible]);

  const cityData = useMemo(() => {
    if (!data) return [];
    
    // Parse base period string to get start and end years
    const basePeriodYears: [number, number] = basePeriod === '1901-2000' ? [1901, 2000] : [1991, 2020];
    
    // Only pass 'annual' or 'fiscal' to the selector function
    const validCadence = cadence === 'monthly' ? 'annual' : cadence;
    
    return CITIES.filter(c => selectedCities.includes(c.id)).map(city => {
      const anomalySeries = selectCityTempAnomalyFromRaw(data.cityTemps, { 
        cityId: city.id, 
        basePeriod: basePeriodYears,
        cadence: validCadence
      });
      
      const hotDaysSeries = selectCityHotDaysFromRaw(data.cityTemps, { 
        cityId: city.id, 
        threshold: hotDayThreshold 
      });
      
      // Ensure we're creating a stable data structure
      const stableAnomalySeries = anomalySeries.map(([x, y]) => ({ x, y }));
      // Filter out null values for hot days series to match the expected data format
      const stableHotDaysSeries = hotDaysSeries.filter(([x, y]) => y !== null).map(([x, y]) => ({ x, y: y as number }));
      
      return {
        ...city,
        anomalySeries: stableAnomalySeries,
        hotDaysSeries: stableHotDaysSeries,
        anomalyCoverage: safeCoverage(anomalySeries),
        hotDaysCoverage: safeCoverage(hotDaysSeries),
      };
    });
  }, [data, selectedCities, basePeriod, cadence, hotDayThreshold]);

  return (
    <div ref={setRef}>
      <StoryHeader
        title="City vs. City: Diverging Climate Futures"
        description="Compare temperature trends and extreme heat days across major US cities."
        sources={SOURCES}
      />
      <Card className="p-4 mb-6">
        <CompareControls
          cities={selectedCities}
          onCitiesChange={setSelectedCities}
          syncY={syncY}
          onSyncYChange={setSyncY}
          threshold={hotDayThreshold}
          onThresholdChange={setHotDayThreshold}
          allCities={CITY_NAMES}
        />
      </Card>
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cityData.map(city => (
            <Card key={city.id} className="flex flex-col h-[300px] overflow-hidden">
              <h4 className="font-semibold text-center text-platform-text py-2 border-b border-platform-accent/20">{city.name}</h4>
              <div className="flex-1 flex flex-col p-4">
                <div className="flex-1 flex flex-col">
                  <p className="text-xs text-center text-platform-text mb-1">Temp Anomaly (°F)</p>
                  {!city.anomalyCoverage && <p className="text-xs text-center text-amber-400">Low data coverage</p>}
                  <div className="flex-1 relative">
                    <div className="absolute inset-0">
                      <LineSmall data={city.anomalySeries} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col mt-3">
                  <p className="text-xs text-center text-platform-text mb-1">Days ≥ {hotDayThreshold}°F</p>
                  {!city.hotDaysCoverage && <p className="text-xs text-center text-amber-400">Low data coverage</p>}
                  <div className="flex-1 relative">
                    <div className="absolute inset-0">
                      <ResponsiveBar
                        data={city.hotDaysSeries}
                        keys={['y']}
                        indexBy="x"
                        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                        padding={0.3}
                        colors={colors.semantic.error}
                        enableGridY={false}
                        axisTop={null}
                        axisRight={null}
                        axisBottom={null}
                        axisLeft={null}
                        enableLabel={false}
                        isInteractive={false}
                        animate={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
}

// Dynamically import ResponsiveBar with error handling
const ResponsiveBar = dynamic(
  () => import('@nivo/bar').then(mod => {
    if (!mod || !mod.ResponsiveBar) {
      throw new Error('Failed to load ResponsiveBar component');
    }
    return mod.ResponsiveBar;
  }).catch(error => {
    console.error('Error loading ResponsiveBar:', error);
    return () => <div className="h-full w-full bg-platform-contrast/30 rounded-lg flex items-center justify-center">
      <div className="text-center p-4">
        <p className="text-platform-text/70">Chart unavailable</p>
      </div>
    </div>;
  }),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-platform-contrast/30 animate-pulse" />
  }
);
