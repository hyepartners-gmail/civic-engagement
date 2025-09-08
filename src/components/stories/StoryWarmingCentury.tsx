"use client";

import { useState, useEffect } from 'react';
import { useClimateData } from '@/hooks/useClimateData';
import { selectCityTempAnomaly, selectNationalTempAnomaly } from '@/lib/selectors/rawClimateSelectors';
import { Card } from '@/components/shared/Card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUrlState } from '@/hooks/useUrlState';
import { Switch } from '@/components/ui/switch';
import WarmingStripes from '@/components/charts/WarmingStripes';
import YearReadout from '@/components/climate/YearReadout';
import StoryHeader from '@/components/climate/StoryHeader';
import ChartContainer from '@/components/shared/ChartContainer';

// City display names mapping
const CITY_NAMES: Record<string, string> = {
  'seattle': 'Seattle',
  'los-angeles': 'Los Angeles',
  'chicago': 'Chicago',
  'houston': 'Houston',
  'atlanta': 'Atlanta',
  'new-york': 'New York City'
};

// Sources for the data
const SOURCES = [
  { name: "Berkeley Earth", url: "https://berkeleyearth.org/data/" },
  { name: "NASA GISTEMP", url: "https://data.giss.nasa.gov/gistemp/" },
  { name: "NOAA nClimDiv", url: "https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00005" },
];

export default function StoryWarmingCentury() {
  // Get climate data
  const { data, isLoading, isError, error } = useClimateData();
  
  // URL state parameters
  const [scope, setScope] = useUrlState<'city' | 'national'>('scope', 'city');
  const [cityId, setCityId] = useUrlState<string>('city', 'seattle');
  const [cadence, setCadence] = useUrlState<'annual' | 'fiscal'>('cadence', 'annual');
  const [showCrosshair, setShowCrosshair] = useUrlState<boolean>('crosshair', true);
  
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error}><div /></ChartContainer>;
  }
  
  // Get temperature anomaly data based on scope
  let anomalyData: [number, number | null][] = [];
  
  if (scope === 'city') {
    anomalyData = selectCityTempAnomaly(data.cityTemps, { cityId, basePeriod: [1991, 2020], cadence });
  } else if (scope === 'national') {
    anomalyData = selectNationalTempAnomaly(data.cityTemps, { cadence });
  }
  
  // Get location name for display
  const locationName = scope === 'city' ? CITY_NAMES[cityId] || cityId : 'United States';
  
  return (
    <div>
      <StoryHeader
        title="The Century of Warming"
        description={`Temperature anomalies relative to 1991-2020 base period.`}
        sources={SOURCES}
      />
      
      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-6">
          {/* Scope selector */}
          <div>
            <Label htmlFor="scope-select" className="block text-sm font-medium mb-1">Scope</Label>
            <Tabs value={scope} onValueChange={(value) => setScope(value as 'city' | 'national')}>
              <TabsList>
                <TabsTrigger value="city">City</TabsTrigger>
                <TabsTrigger value="national">National</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* City selector (only shown when scope is 'city') */}
          {scope === 'city' && (
            <div>
              <Label htmlFor="city-select" className="block text-sm font-medium mb-1">City</Label>
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger className="w-[180px] bg-platform-contrast border-platform-accent/50 text-platform-text">
                  <SelectValue placeholder="Select a city" />
                </SelectTrigger>
                <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
                  {Object.entries(CITY_NAMES).map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Cadence selector */}
          <div>
            <Label htmlFor="cadence-select" className="block text-sm font-medium mb-1">Cadence</Label>
            <Select value={cadence} onValueChange={(value) => setCadence(value as 'annual' | 'fiscal')}>
              <SelectTrigger className="w-[180px] bg-platform-contrast border-platform-accent/50 text-platform-text">
                <SelectValue placeholder="Select cadence" />
              </SelectTrigger>
              <SelectContent className="bg-platform-contrast text-platform-text border-platform-accent">
                <SelectItem value="annual">Calendar Year</SelectItem>
                <SelectItem value="fiscal">Fiscal Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Crosshair toggle */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="crosshair-toggle">Show Crosshair</Label>
            <Switch
              id="crosshair-toggle"
              checked={showCrosshair}
              onCheckedChange={setShowCrosshair}
            />
          </div>
        </div>
      </Card>
      
      {/* Main visualization */}
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <div className="mb-2 text-sm text-gray-500">
          <span>Temperature Anomaly (°C) • {locationName} • Base Period: 1991-2020</span>
        </div>
        
        {anomalyData.length > 0 ? (
          <WarmingStripes
            data={anomalyData}
            showCrosshair={showCrosshair}
          />
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            <p>No temperature anomaly data available for {locationName}</p>
          </div>
        )}
        
        <YearReadout />
      </ChartContainer>
    </div>
  );
}