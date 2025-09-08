"use client";

import { useState, useEffect, useMemo } from "react";
import { useClimateData } from "@/hooks/useClimateData";
import { useClimateState } from "@/hooks/useClimateState";
import { selectCityPrecip, selectStatePrecip } from "@/lib/selectors/rawClimateSelectors";
import { selectDisasterCounts } from "@/lib/selectors/rawClimateSelectors";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import StoryCallouts from "@/components/climate/StoryCallouts";
import { mergeYearSeries } from "@/utils/array";
import { scaleSafeDualAxes } from "@/utils/scale";
import YearReadout from "../climate/YearReadout";
import DisasterTypeLegend from "../controls/DisasterTypeLegend";
import StatePicker from "../controls/StatePicker";
import dynamic from 'next/dynamic';

const DualAxisLine = dynamic(() => import("@/components/charts/DualAxisLine"), { ssr: false });

const SOURCES = [
  { name: "FEMA", url: "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2" },
  { name: "NOAA nClimDiv", url: "https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/statewide/time-series" },
];

export default function StoryRainIsntTheSame() {
  const { data, isLoading, isError, error } = useClimateData();
  const { city, state, basePeriod, cadence, disasterTypes } = useClimateState();
  const [activeYear, setActiveYear] = useState<number | null>(null);
  
  // Handle year selection from callouts
  const handleYearSelect = (year: number) => {
    setActiveYear(year);
  };

  // Use state-level precipitation data with error handling
  const precipSeries = useMemo(() => {
    if (!data) return [];
    try {
      return selectStatePrecip(data.cityPrecip, { stateId: state });
    } catch (err) {
      console.error("Error selecting state precipitation data:", err);
      return [];
    }
  }, [data, state]);

  // Use national disaster data with error handling
  const disasterSeries = useMemo(() => {
    if (!data) return [];
    try {
      return selectDisasterCounts(data.disasters);
    } catch (err) {
      console.error("Error selecting disaster data:", err);
      return [];
    }
  }, [data]);

  // Safely merge the series data
  const merged = useMemo(() => {
    try {
      return mergeYearSeries(precipSeries, disasterSeries);
    } catch (err) {
      console.error("Error merging year series:", err);
      return [];
    }
  }, [precipSeries, disasterSeries]);

  // Create chart data with null filtering
  const chartData = useMemo(() => {
    return {
      left: {
        id: 'Precipitation',
        data: merged.map(([year, precip]) => ({ 
          x: year, 
          y: precip !== null && precip !== undefined ? precip : null 
        })),
      },
      right: {
        id: 'Disasters',
        data: merged.map(([year, _, disasters]) => ({ 
          x: year, 
          y: disasters !== null && disasters !== undefined ? disasters : null 
        })),
      },
    };
  }, [merged]);

  // Check if we have data with proper error handling
  const hasPrecipData = useMemo(() => {
    return precipSeries.length > 0 && precipSeries.some(([, value]) => value !== null && value !== undefined);
  }, [precipSeries]);
  
  const hasDisasterData = useMemo(() => {
    return disasterSeries.length > 0 && disasterSeries.some(([, value]) => value !== null && value !== undefined);
  }, [disasterSeries]);

  // Early return for loading or no data
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error}><div /></ChartContainer>;
  }

  // Early return for no valid data
  if (!hasPrecipData && !hasDisasterData) {
    return (
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <div className="flex items-center justify-center h-full">
          <p className="text-platform-text/70 text-center">
            No data available for the selected parameters.<br />
            Try selecting different disaster types or adjusting the time range.
          </p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <div>
      <StoryHeader
        title="Rain Isn't the Same"
        description="Precipitation versus disaster declarations."
        sources={SOURCES}
      />
      
      {/* Controls */}
      <div className="bg-platform-contrast/50 backdrop-blur-sm p-4 rounded-lg border border-platform-contrast flex flex-wrap items-center gap-4 mb-6 relative z-[10]">
        <StatePicker />
        <DisasterTypeLegend />
      </div>
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <DualAxisLine
          data={chartData}
          leftAxisLegend="Precipitation (mm)"
          rightAxisLegend="Disaster Count"
          onYearHover={setActiveYear}
        />
        <YearReadout />
      </ChartContainer>
      
      {/* Callouts */}
      <StoryCallouts activeYear={activeYear} onYearSelect={handleYearSelect} />
    </div>
  );
}