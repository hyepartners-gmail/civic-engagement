"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { 
  selectWarmNights, 
  selectWildfireAcres, 
  selectFemaHeatCounts, 
  alignYears,
  isHighPercentile
} from "@/lib/selectors/extremes";
import { mergeYearSeries, safeCoverage } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import RegionSwitch from "../controls/RegionSwitch";
import ThresholdEditor from "../controls/ThresholdEditor";
import HotNightsWildfireChart from "../charts/HotNightsWildfireChart";
import { useMemo, useEffect } from "react";
import { Card } from "@/components/shared/Card";
import { logger } from "@/lib/logger";
import { perf } from "@/lib/perf";

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
  { name: "NIFC", url: "https://www.nifc.gov/fire-information/statistics" },
  { name: "NOAA GHCN", url: "https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily" },
  { name: "FEMA", url: "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2" },
];

export default function StoryHotNightsHarderDays() {
  // Start measuring component render time
  perf.mark('hot-nights-story-render-start');
  
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { city, warmNightThreshold: stateThreshold } = useClimateState();
  
  // URL state parameters
  const [urlThreshold, setUrlThreshold] = useUrlState<string>('wn', '70');
  const [wildfireScope, setWildfireScope] = useUrlState<'national' | 'state'>('wf', 'national');
  
  // Wrap URL state setters with analytics tracking
  const handleThresholdChange = (newThreshold: string) => {
    setUrlThreshold(newThreshold);
    logger.event('control_change', { 
      control: 'warm_night_threshold', 
      value: newThreshold,
      storyId: 'hot-nights-harder-days'
    });
  };
  
  const handleWildfireScopeChange = (newScope: 'national' | 'state') => {
    setWildfireScope(newScope);
    logger.event('control_change', { 
      control: 'wildfire_scope', 
      value: newScope,
      storyId: 'hot-nights-harder-days'
    });
  };
  
  // Use URL threshold if available, otherwise use state threshold
  const threshold = urlThreshold ? parseInt(urlThreshold) : stateThreshold;
  
  // Use empty arrays as default values when data isn't available
  const warmNightsSeries = useMemo(() => {
    if (!data) return [];
    // Get state ID for the current city
    const stateId = CITY_TO_STATE[city] || 'ga'; // Default to Georgia if not found
    return selectWarmNights(data, { cityId: city, threshold });
  }, [data, city, threshold]);
  
  const { series: wildfireSeries, hasData: hasStateWildfireData } = useMemo(() => {
    if (!data) return { series: [], hasData: false };
    const stateId = CITY_TO_STATE[city] || 'ga';
    return selectWildfireAcres(data, { 
      scope: wildfireScope === 'state' ? 'state' : 'national', 
      id: wildfireScope === 'state' ? stateId : undefined 
    });
  }, [data, city, wildfireScope]);
  
  const femaSeries = useMemo(() => {
    if (!data) return [];
    const stateId = CITY_TO_STATE[city] || 'ga';
    return selectFemaHeatCounts(data, { stateId });
  }, [data, city]);
  
  // Check data coverage
  const warmNightsCoverage = useMemo(() => safeCoverage(warmNightsSeries, 0.8), [warmNightsSeries]);
  const wildfireCoverage = useMemo(() => safeCoverage(wildfireSeries, 0.8), [wildfireSeries]);
  const femaCoverage = useMemo(() => safeCoverage(femaSeries, 0.1), [femaSeries]); // FEMA data is often sparse

  // Prepare data for chart
  const warmNightsData = useMemo(() => 
    warmNightsSeries.map(([year, nights]) => ({ year, nights })),
  [warmNightsSeries]);
  
  const wildfireData = useMemo(() => 
    wildfireSeries.map(([year, acres]) => ({ year, acres })),
  [wildfireSeries]);
  
  // Add proper analytics tracking and debugging information
  useEffect(() => {
    // Log story view event for analytics
    if (data) {
      logger.event('story_view', { 
        storyId: 'hot-nights-harder-days',
        city,
        threshold,
        wildfireScope
      });
    }
    
    // Log warning if wildfire data is missing or insufficient
    if (!wildfireCoverage || wildfireSeries.length === 0) {
      logger.error('missing_wildfire_data', {
        wildfireSeriesLength: wildfireSeries.length,
        wildfireCoverage,
        hasStateWildfireData,
        wildfireScope,
        city,
        stateId: CITY_TO_STATE[city] || 'ga'
      });
    }
  }, [data, wildfireSeries, wildfireCoverage, hasStateWildfireData, wildfireScope, city, threshold]);
  
  const femaData = useMemo(() => 
    femaSeries.map(([year, events]) => ({ year, events })),
  [femaSeries]);

  // Check if any warm night value is in high percentile
  const hasHighPercentile = useMemo(() => {
    return warmNightsSeries.some(([_, nights]) => 
      nights !== null && isHighPercentile(
        warmNightsSeries.filter(([_, val]) => val !== null) as [number, number][], 
        nights
      )
    );
  }, [warmNightsSeries]);

  // Add performance measurement for component unmount/cleanup
  useEffect(() => {
    return () => {
      perf.mark('hot-nights-story-unmount');
      perf.measure('hot-nights-story-lifetime', 'hot-nights-story-render-start', 'hot-nights-story-unmount');
    };
  }, []);
  
  // Add performance measurement for render completion
  useEffect(() => {
    perf.mark('hot-nights-story-render-end');
    perf.measure('hot-nights-story-render', 'hot-nights-story-render-start', 'hot-nights-story-render-end');
  }, []);

  return (
    <div>
      <StoryHeader
        title="Hot Nights, Harder Days"
        description="Rising nighttime temperatures correlate with an increase in acres burned by wildfires."
        sources={SOURCES}
      />
      
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <RegionSwitch 
            hasStateData={hasStateWildfireData} 
            onScopeChange={handleWildfireScopeChange}
          />
          <ThresholdEditor 
            onThresholdChange={handleThresholdChange} 
          />
          
          {!warmNightsCoverage && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Insufficient warm nights data
            </span>
          )}
          
          {!wildfireCoverage && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Insufficient wildfire data
            </span>
          )}
          
          {femaSeries.length === 0 && (
            <span className="text-xs text-platform-text/70">
              FEMA heat event data not available for this state
            </span>
          )}
        </div>
      </Card>
      
      <ChartContainer 
        isLoading={isLoading} 
        isError={isError} 
        error={error instanceof Error ? error : null}
      >
        <HotNightsWildfireChart
          warmNightsData={warmNightsData}
          wildfireData={wildfireData}
          femaData={femaData}
          threshold={threshold}
          wildfireScope={wildfireScope || 'national'}
        />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}