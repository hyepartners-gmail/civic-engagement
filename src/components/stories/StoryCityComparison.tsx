"use client";

import { useState, useMemo } from 'react';
import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import CitySmallMultiples from "@/components/charts/CitySmallMultiples";
import CompareControls from "@/components/controls/CompareControls";
import { selectCityAnomaly, selectCityHotDays } from "@/lib/selectors/cities";
import { decodeCitySet, encodeCitySet } from "@/lib/codecs/CitySetCodec";
import { Card } from "@/components/shared/Card";
import YearReadout from "../climate/YearReadout";

const SOURCES = [
  { name: "Berkeley Earth", url: "https://berkeleyearth.org/data/" },
];

const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle',
  'los-angeles': 'Los Angeles',
  'chicago': 'Chicago',
  'houston': 'Houston',
  'atlanta': 'Atlanta',
  'new-york': 'New York City'
};

export default function StoryCityComparison() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  
  // URL state parameters
  const [encodedCities, setEncodedCities] = useUrlState<string | null>('cities', null);
  const [syncY, setSyncY] = useUrlState<boolean>('syncY', true);
  const [threshold, setThreshold] = useUrlState<number>('ht', 90);
  const [yearRange, setYearRange] = useUrlState<string | null>('yr', null);
  
  // Decode cities from URL
  const cities = useMemo(() => decodeCitySet(encodedCities), [encodedCities]);
  
  // Update cities in URL
  const updateCities = (newCities: string[]) => {
    setEncodedCities(newCities.length > 0 ? encodeCitySet(newCities) : null);
  };
  
  // Parse year range from URL
  const parsedYearRange = useMemo((): [number, number] | null => {
    if (!yearRange) return null;
    
    const [start, end] = yearRange.split(':').map(Number);
    if (isNaN(start) || isNaN(end)) return null;
    
    return [start, end];
  }, [yearRange]);
  
  // Update year range in URL
  const updateYearRange = (range: [number, number] | null) => {
    setYearRange(range ? `${range[0]}:${range[1]}` : null);
  };
  
  // Get data for all selected cities
  const cityData = useMemo(() => {
    if (!data) return {};
    
    const result: Record<string, {
      tempAnomaly: [number, number | null][];
      hotDays: [number, number | null][];
    }> = {};
    
    cities.forEach(cityId => {
      result[cityId] = {
        tempAnomaly: selectCityAnomaly(data, { cityId }),
        hotDays: selectCityHotDays(data, { cityId, threshold })
      };
    });
    
    return result;
  }, [data, cities, threshold]);
  
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  return (
    <div>
      <StoryHeader
        title="City vs City: Diverging Climate Futures"
        description="Compare temperature anomalies and hot days across major U.S. cities."
        sources={SOURCES}
      />
      
      <Card className="p-4 mb-6">
        <CompareControls
          cities={cities}
          onCitiesChange={updateCities}
          syncY={syncY}
          onSyncYChange={setSyncY}
          threshold={threshold}
          onThresholdChange={setThreshold}
          allCities={CITY_NAMES}
        />
      </Card>
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <CitySmallMultiples
          cityData={cityData}
          cityNames={CITY_NAMES}
          syncY={syncY}
          yearRange={parsedYearRange}
          threshold={threshold}
        />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}