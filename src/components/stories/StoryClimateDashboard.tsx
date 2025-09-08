"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectTempAnomaly } from "@/lib/selectors/temps";
import { selectNationalCO2 } from "@/lib/selectors/emissions";
import { selectFemaCounts } from "@/lib/selectors/disasters";
import { selectWildfireAcres } from "@/lib/selectors/extremes";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";
import dynamic from 'next/dynamic';

const ClimateDashboardChart = dynamic(() => import("@/components/charts/ClimateDashboardChart"), { ssr: false });

const SOURCES = [
  { name: "NASA GISTEMP", url: "https://data.giss.nasa.gov/gistemp/" },
  { name: "EPA GHGI", url: "https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" },
  { name: "NIFC", url: "https://www.nifc.gov/fire-information/statistics/wildfires" },
];

export default function StoryClimateDashboard() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { anomalySource, disasterTypes, co2Mode, setState } = useClimateState();

  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  // Get temperature anomaly data
  const anomalySeries = selectTempAnomaly(data, {
    scope: anomalySource,
    basePeriod: '1951-1980',
    cadence: 'annual',
  });

  // Get CO2 data
  const co2Series = selectNationalCO2(data, { perCapita: co2Mode === 'per-capita', smoothing: false });

  // Get disaster count data
  const disasterCounts = selectFemaCounts(data, { 
    scope: 'national',
    types: disasterTypes, 
    cadence: 'annual' 
  });

  // Get wildfire acres data
  const acresSeries = selectWildfireAcres(data, { scope: 'national' });

  // Merge all data series
  const mergedData = mergeYearSeries(anomalySeries, co2Series, disasterCounts.series, acresSeries.series);

  const chartData = mergedData.map(([year, anomaly, co2, disasters, acres]) => ({
    year,
    anomaly: anomaly ?? null,
    co2: co2 ?? null,
    disasters: disasters ?? null,
    acres: acres ?? null,
  }));

  return (
    <div>
      <StoryHeader
        title="Climate Dashboard"
        description="A comprehensive view of key climate indicators: temperature anomalies, CO₂ emissions, disaster frequency, and wildfire activity."
        sources={SOURCES}
      />
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <ClimateDashboardChart data={chartData} />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}