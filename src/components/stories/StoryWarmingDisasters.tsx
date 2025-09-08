"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectTempAnomaly } from "@/lib/selectors/temps";
import { selectFemaCounts } from "@/lib/selectors/disasters";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";
import dynamic from 'next/dynamic';

const WarmingDisastersChart = dynamic(() => import("@/components/charts/WarmingDisastersChart"), { ssr: false });

const SOURCES = [
  { name: "NASA GISTEMP", url: "https://data.giss.nasa.gov/gistemp/" },
  { name: "NIFC", url: "https://www.nifc.gov/fire-information/statistics/wildfires" },
];

export default function StoryWarmingDisasters() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { anomalySource, disasterTypes, setState } = useClimateState();

  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  const anomalySeries = selectTempAnomaly(data, {
    scope: anomalySource,
    basePeriod: '1951-1980',
    cadence: 'annual',
  });

  const { series: disasterCounts } = selectFemaCounts(data, { 
    scope: 'national',
    types: disasterTypes, 
    cadence: 'annual' 
  });

  // Merge the data series
  const mergedData = mergeYearSeries(anomalySeries, disasterCounts);

  const chartData = {
    anomalies: mergedData.map(([year, anomaly]) => ({ x: year, y: anomaly })),
    disasters: mergedData.map(([year, _, disasters]) => ({ x: year, y: disasters })),
  };

  return (
    <div>
      <StoryHeader
        title="Warming and Disaster Frequency"
        description="How does global temperature anomaly correlate with climate-related disaster frequency?"
        sources={SOURCES}
      />
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <WarmingDisastersChart data={chartData} />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}
