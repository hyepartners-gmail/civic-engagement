"use client";

import { useClimateData } from "@/hooks/useClimateData";
import { useClimateState } from "@/hooks/useClimateState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectCityPrecip, selectDisasterCounts } from "@/lib/selectors/rawClimateSelectors";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";
import dynamic from 'next/dynamic';

const PrecipitationDisastersChart = dynamic(() => import("@/components/charts/PrecipitationDisastersChart"), { ssr: false });

const SOURCES = [
  { name: "Berkeley Earth", url: "https://berkeleyearth.org/data/" },
  { name: "NIFC", url: "https://www.nifc.gov/fire-information/statistics/wildfires" },
];

export default function StoryPrecipitationDisasters() {
  const { data, isLoading, isError, error } = useClimateData();
  const { city, disasterTypes, setState } = useClimateState();

  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error}><div /></ChartContainer>;
  }

  // Get precipitation data for the selected city
  const precipSeries = selectCityPrecip(data.cityPrecip, { cityId: city });
  
  // Get disaster count data
  const disasterCounts = selectDisasterCounts(data.disasters);

  // Merge the data series
  const mergedData = mergeYearSeries(precipSeries, disasterCounts);

  const chartData = {
    precipitation: mergedData.map(([year, precip]) => ({ x: year, y: precip })),
    disasters: mergedData.map(([year, _, disasters]) => ({ x: year, y: disasters })),
  };

  return (
    <div>
      <StoryHeader
        title="Precipitation and Disaster Patterns"
        description="How do precipitation patterns in major cities correlate with national disaster frequency?"
        sources={SOURCES}
      />
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <PrecipitationDisastersChart data={chartData} />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}