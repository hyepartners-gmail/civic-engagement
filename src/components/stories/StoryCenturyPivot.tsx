"use client";
import StoryHeader from "@/components/climate/StoryHeader";
import PivotTiles from "@/components/climate/PivotTiles";
import ChartContainer from "@/components/shared/ChartContainer";
import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useViewportObserver } from "@/hooks/useViewportObserver";
import { logger } from "@/utils/logger";
import { useEffect, useRef } from "react";
import PivotSelector from "@/components/controls/PivotSelector";
import PerCapitaToggle from "@/components/controls/PerCapitaToggle";
import DownloadPanel from "@/components/controls/DownloadPanel";
import StoryFootnotes from "@/components/climate/StoryFootnotes";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

const SOURCES = [
  { name: "NOAA GHCN", url: "https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily" },
  { name: "FEMA", url: "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2" },
  { name: "EPA", url: "https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" },
];

export default function StoryCenturyPivot() {
  const { isLoading, isError, error } = useClimateArtifact();
  const [setRef, isVisible] = useViewportObserver({ threshold: 0.5 });
  const climateState = useClimateState();
  const { city, state, perCapita, setState } = climateState;
  
  // URL state management
  const [scope, setScope] = useUrlState<'city' | 'state' | 'national'>('scope', 'city');
  const [metricSet, setMetricSet] = useUrlState<string>('metricSet', 'all');
  const [compareCities, setCompareCities] = useUrlState<string | null>('compareCities', null);
  const [beforeRangeStart, setBeforeRangeStart] = useUrlState<number>('beforeStart', 1900);
  const [beforeRangeEnd, setBeforeRangeEnd] = useUrlState<number>('beforeEnd', 1970);
  const [afterRangeStart, setAfterRangeStart] = useUrlState<number>('afterStart', 1971);
  const [afterRangeEnd, setAfterRangeEnd] = useUrlState<number>('afterEnd', 2023);
  const [flipBaseline, setFlipBaseline] = useUrlState<boolean>('flipBaseline', false);
  
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      logger.info('risk_story_view', { storyId: 'century-pivot' });
    }
  }, [isVisible]);

  const handleScopeChange = (newScope: 'city' | 'state' | 'national') => {
    setScope(newScope);
    logger.info('control_change', { control: 'scope', value: newScope });
  };

  const handleMetricSetChange = (newMetricSet: string) => {
    setMetricSet(newMetricSet);
    logger.info('control_change', { control: 'metricSet', value: newMetricSet });
  };

  const handleCityChange = (newCity: string) => {
    setState({ city: newCity });
    logger.info('control_change', { control: 'city', value: newCity });
  };

  const handleStateChange = (newState: string) => {
    setState({ state: newState });
    logger.info('control_change', { control: 'state', value: newState });
  };

  const handlePerCapitaToggle = (newPerCapita: boolean) => {
    setState({ perCapita: newPerCapita });
    logger.info('control_change', { control: 'perCapita', value: newPerCapita });
  };

  const handleFlipBaseline = () => {
    setFlipBaseline(!flipBaseline);
    logger.info('control_change', { control: 'flipBaseline', value: !flipBaseline });
  };

  const handleAddToComparison = (cityToAdd: string) => {
    const currentCities = compareCities ? compareCities.split(',') : [city];
    if (!currentCities.includes(cityToAdd)) {
      const newCities = [...currentCities, cityToAdd].join(',');
      setCompareCities(newCities);
      logger.info('control_change', { control: 'compareCities', value: newCities });
    }
  };

  const handleRemoveFromComparison = (cityToRemove: string) => {
    const currentCities = compareCities ? compareCities.split(',') : [city];
    if (currentCities.includes(cityToRemove) && currentCities.length > 1) {
      const newCities = currentCities.filter(c => c !== cityToRemove).join(',');
      setCompareCities(newCities);
      logger.info('control_change', { control: 'compareCities', value: newCities });
    }
  };

  const beforeRange: [number, number] = flipBaseline 
    ? [afterRangeStart || 1971, afterRangeEnd || 2023] 
    : [beforeRangeStart || 1900, beforeRangeEnd || 1970];
    
  const afterRange: [number, number] = flipBaseline 
    ? [beforeRangeStart || 1900, beforeRangeEnd || 1970] 
    : [afterRangeStart || 1971, afterRangeEnd || 2023];

  return (
    <div ref={setRef}>
      <StoryHeader
        title="The Century Pivot"
        description="Comparing the climate of 1900-1970 to 1971-present reveals significant shifts. Some metrics may show limited data availability depending on the selected geography and time period. Metrics with available data will show 'No data available' when data is not present."
        sources={SOURCES}
      />
      
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <PivotSelector
            scope={scope || 'city'}
            metricSet={metricSet || 'all'}
            city={city}
            stateId={state}
            onScopeChange={handleScopeChange}
            onMetricSetChange={handleMetricSetChange}
            onCityChange={handleCityChange}
            onStateChange={handleStateChange}
          />
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="platform-primary" 
              size="sm" 
              onClick={handleFlipBaseline}
              className="flex items-center gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Flip Baseline
            </Button>
          </div>
        </div>
        
        {(scope === 'state' || scope === 'national') && (
          <PerCapitaToggle 
            perCapita={perCapita} 
            onToggle={handlePerCapitaToggle}
          />
        )}
        
        <ChartContainer isLoading={isLoading} isError={isError} error={error instanceof Error ? error : null}>
          <div ref={chartRef}>
            <PivotTiles />
          </div>
        </ChartContainer>
        
        <StoryFootnotes 
          beforeRange={beforeRange} 
          afterRange={afterRange} 
        />
      </div>
    </div>
  );
}