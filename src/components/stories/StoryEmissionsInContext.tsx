"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectNationalCO2, selectTempAnomaly, selectMilestones } from "@/lib/selectors/emissions";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import BarsModeTabs from "../controls/BarsModeTabs";
import AnomalySourceToggle from "../controls/AnomalySourceToggle";
import EmissionsTempChart from "../charts/EmissionsTempChart";
import { useMemo } from "react";
import { Card } from "@/components/shared/Card";

const SOURCES = [
  { name: "EPA GHGI", url: "https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" },
  { name: "NASA GISTEMP", url: "https://data.giss.nasa.gov/gistemp/" },
];

export default function StoryEmissionsInContext() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const climateState = useClimateState();
  const { anomalySmoothing, setState } = climateState;
  
  // URL state parameters
  const [mode, setMode] = useUrlState<'percap' | 'total'>('mode', 'percap');
  const [anomalySource, setAnomalySource] = useUrlState<'global' | 'us'>('anom', 'global');
  
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error instanceof Error ? error : null}><div /></ChartContainer>;
  }

  // Get CO2 data based on mode
  const co2Series = selectNationalCO2(data, { 
    perCapita: mode === 'percap', 
    smoothing: false 
  });
  
  // Get temperature anomaly data based on source
  const anomalySeries = selectTempAnomaly(data, {
    source: anomalySource as 'global' | 'us',
    smoothing: anomalySmoothing,
  });

  // Prepare data for chart
  const co2Data = co2Series.map(([year, co2]) => ({ year, co2 }));
  const anomalyData = anomalySeries.map(([year, anomaly]) => ({ year, anomaly }));

  // Prepare data for export
  const exportData = mergeYearSeries(co2Series, anomalySeries);
  const exportHeaders = [
    'year', 
    mode === 'percap' ? 'co2_per_capita' : 'co2_total',
    anomalySource === 'global' ? 'anomaly_global' : 'anomaly_us'
  ];

  // Check if we have sufficient data to display
  const hasCO2Data = co2Series.length > 0;
  const hasAnomalyData = anomalySeries.length > 0;

  // Handle mode change
  const handleModeChange = (newMode: 'percap' | 'total') => {
    setMode(newMode);
  };

  // Handle anomaly source change
  const handleAnomalySourceChange = (newSource: 'global' | 'us') => {
    setAnomalySource(newSource);
  };

  return (
    <div>
      <StoryHeader
        title="Emissions in Context"
        description="National CO₂ emissions alongside global temperature anomalies."
        sources={SOURCES}
      />
      
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <BarsModeTabs mode={mode as 'percap' | 'total'} onModeChange={handleModeChange} />
          
          <AnomalySourceToggle 
            source={anomalySource as 'global' | 'us'} 
            onSourceChange={handleAnomalySourceChange} 
          />
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="anomaly-smoothing">Smooth Anomaly (10yr)</Label>
            <Switch
              id="anomaly-smoothing"
              checked={anomalySmoothing}
              onCheckedChange={(checked) => setState({ anomalySmoothing: checked })}
            />
          </div>
        </div>
      </Card>
      
      {!hasCO2Data && !hasAnomalyData && (
        <div className="p-4 mb-4 text-center bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800">
            Insufficient data available for this visualization. Please check back when emissions data is available.
          </p>
        </div>
      )}
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <EmissionsTempChart
          co2Data={co2Data}
          anomalyData={anomalyData}
          mode={mode as 'percap' | 'total'}
          anomalySource={anomalySource as 'global' | 'us'}
          showMilestones={false}
        />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}
