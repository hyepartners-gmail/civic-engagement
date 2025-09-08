"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectCityTempAnomaly } from "@/lib/selectors/temps";
import { selectCityPrecip } from "@/lib/selectors/precip";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";
import CitiesToggleGroup from "../controls/CitiesToggleGroup";
import dynamic from 'next/dynamic';
import { useMemo, useEffect } from "react";
import { logger } from "@/lib/logger";
import { perf } from "@/lib/perf";

const TempPrecipScatterChart = dynamic(() => import("@/components/charts/TempPrecipScatterChart"), { ssr: false });

const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle, WA',
  'los-angeles': 'Los Angeles, CA',
  'chicago': 'Chicago, IL',
  'houston': 'Houston, TX',
  'atlanta': 'Atlanta, GA',
  'new-york': 'New York, NY'
};

const SOURCES = [
  { name: "Berkeley Earth", url: "https://berkeleyearth.org/data/" },
];

export default function StoryTempPrecipRelationship() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { basePeriod } = useClimateState();
  // Get cities from URL but don't update it - CitiesToggleGroup will handle updates
  const [selectedCitiesParam] = useUrlState<string | string[]>('cities', ['seattle']);

  // Ensure selectedCities is always an array for consistent use throughout the component
  const citiesArray = useMemo(() => {
    if (Array.isArray(selectedCitiesParam)) {
      return selectedCitiesParam;
    }
    return selectedCitiesParam ? [selectedCitiesParam] : ['seattle'];
  }, [selectedCitiesParam]);

  // Process data for all selected cities - must be called even if data is null
  const allCitiesData = useMemo(() => {
    if (!data) return [];
    
    return citiesArray.flatMap(cityId => {
      // Get temperature anomaly data for this city
      const tempSeries = selectCityTempAnomaly(data, { 
        cityId, 
        cadence: 'annual' 
      });
      
      // Get precipitation data for this city
      const precipSeries = selectCityPrecip(data, { cityId });

      // Merge the data series for this city
      const mergedData = mergeYearSeries(tempSeries, precipSeries);

      return mergedData
        .filter(([_, temp, precip]) => temp !== null && precip !== null)
        .map(([year, temp, precip]) => ({
          year,
          temp: temp as number,
          precip: precip as number,
          city: cityId,
          cityName: CITY_NAMES[cityId] || cityId
        }));
    });
  }, [data, citiesArray]);
  
  // Download data preparation - always call this hook regardless of conditions
  const downloadData = useMemo(() => {
    if (!data) return [];
    
    // Create a dataset suitable for download with proper headers for each city
    const allCityData = citiesArray.map(cityId => [
      selectCityTempAnomaly(data, { cityId, cadence: 'annual' }),
      selectCityPrecip(data, { cityId })
    ]).flat();
    
    return mergeYearSeries(...allCityData);
  }, [data, citiesArray]);
  
  // Add analytics tracking
  useEffect(() => {
    if (data) {
      // Log story view event
      perf.mark('temp-precip-chart-render-start');
      logger.event('story_view', {
        storyId: 'temp-precip-relationship',
        cities: citiesArray,
        cityCount: citiesArray.length
      });
      
      // Log data points information
      logger.event('temp_precip_data_points', {
        dataPoints: allCitiesData.length,
        cities: citiesArray.join(',')
      });
      
      // End performance mark
      perf.mark('temp-precip-chart-render-end');
      perf.measure('temp-precip-chart-render', 'temp-precip-chart-render-start', 'temp-precip-chart-render-end');
    }
  }, [data, allCitiesData.length, citiesArray]);
  
  // Track city selection changes - only log when citiesArray changes, not on every render
  useEffect(() => {
    if (citiesArray.length > 0) {
      logger.event('control_change', {
        storyId: 'temp-precip-relationship',
        control: 'cities',
        value: citiesArray.join(',')
      });
    }
  }, [citiesArray]); // This will only run when citiesArray actually changes
  
  // Track download events
  const handleDownload = useMemo(() => {
    return () => {
      logger.event('download_export', {
        storyId: 'temp-precip-relationship',
        dataType: 'csv',
        cities: citiesArray.join(',')
      });
    };
  }, [citiesArray]);
  
  // Early return for loading state
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={isError ? new Error('Failed to load data') : null}><div /></ChartContainer>;
  }

  return (
    <div>
      <StoryHeader
        title="Temperature and Precipitation Relationship"
        description="How do temperature anomalies and precipitation patterns relate in major U.S. cities?"
        sources={SOURCES}
      />
      <div className="bg-platform-contrast/30 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-6">
        <CitiesToggleGroup />
      </div>
      <ChartContainer isLoading={isLoading} isError={isError} error={isError ? new Error('Failed to load data') : null}>
        <TempPrecipScatterChart data={allCitiesData} cities={citiesArray} />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}