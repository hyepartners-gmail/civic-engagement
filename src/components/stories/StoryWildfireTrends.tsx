"use client";

import { useClimateData } from "@/hooks/useClimateData";
import { useClimateState } from "@/hooks/useClimateState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectWildfireData } from "@/lib/selectors/rawClimateSelectors";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";
import dynamic from 'next/dynamic';

const WildfireTrendsChart = dynamic(() => import("@/components/charts/WildfireTrendsChart"), { ssr: false });

const SOURCES = [
  { name: "NIFC", url: "https://www.nifc.gov/fire-information/statistics/wildfires" },
];

export default function StoryWildfireTrends() {
  const { data, isLoading, isError, error } = useClimateData();
  const { setState } = useClimateState();

  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error}><div /></ChartContainer>;
  }

  // Get wildfire acres data
  const acresSeries = selectWildfireData(data.wildfires, 'acres');
  
  // Get wildfire count data (using fires count as a proxy for FEMA wildfire counts)
  const countSeries = selectWildfireData(data.wildfires, 'fires');

  // Merge the data series
  const mergedData = mergeYearSeries(acresSeries, countSeries);

  const chartData = {
    acres: mergedData.map(([year, acres]) => ({ x: year, y: acres })),
    counts: mergedData.map(([year, _, counts]) => ({ x: year, y: counts })),
  };

  return (
    <div>
      <StoryHeader
        title="Wildfire Trends"
        description="Analyzing the relationship between wildfire frequency and acres burned over time."
        sources={SOURCES}
      />
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <WildfireTrendsChart data={chartData} />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}
