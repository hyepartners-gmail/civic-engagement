"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectDegreeDays } from "@/lib/selectors/degreeDays";
import { selectStateCO2 } from "@/lib/selectors/emissions";
import { mergeByYear, safeCoverage } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import DownloadPanel from "../controls/DownloadPanel";
import StatePicker from "../controls/StatePicker";
import LegendChips from "../controls/LegendChips";
import PerCapitaToggle from "../controls/PerCapitaToggle";
import CombinedDegreeCo2Chart from "../charts/CombinedDegreeCo2Chart";
import { useMemo } from "react";

const SOURCES = [
  { name: "NOAA GHCN", url: "https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily" },
  { name: "EIA", url: "https://www.eia.gov/environment/emissions/state/" },
];

export default function StoryHeatEnergyShift() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const climateState = useClimateState();
  const { city, state, setState } = climateState;
  
  // URL state parameters
  const [ddParam, setDdParam] = useUrlState<string>('dd', 'both');
  const [perCapitaParam, setPerCapitaParam] = useUrlState<boolean>('perCapita', false);
  const [normalizeParam, setNormalizeParam] = useUrlState<boolean>('normalize', false);
  const [smoothingParam, setSmoothingParam] = useUrlState<boolean>('smoothing', false);

  // Get visibility settings from URL or defaults
  const showHdd = ddParam === 'hdd' || ddParam === 'both';
  const showCdd = ddParam === 'cdd' || ddParam === 'both';
  const perCapita = perCapitaParam || false;
  const normalize = normalizeParam || false;
  const smoothing = smoothingParam || false;

  if (!data) {
    console.log('No climate data available');
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  // Get degree days data for the selected state (using actual data now)
  const { hdd, cdd } = selectDegreeDays(data, { scope: 'state', id: state || 'tx', cadence: 'annual' });
  console.log('Degree days data for', state || 'tx', { hdd, cdd });
  
  // Get CO2 data for the selected state
  const co2Series = selectStateCO2(data, { 
    stateId: state || 'tx', 
    perCapita, 
    smoothing,
    rollingWindow: 10
  });
  console.log('CO2 data for', state || 'tx', co2Series);

  // Merge the data by year
  const mergedHddCo2 = mergeByYear(hdd, co2Series);
  const mergedCddCo2 = mergeByYear(cdd, co2Series);
  console.log('Merged HDD+CO2 data:', mergedHddCo2);
  console.log('Merged CDD+CO2 data:', mergedCddCo2);
  
  // Create combined data structure
  const chartData = mergedHddCo2.map(([year, hddVal, co2Val], index) => {
    const cddVal = mergedCddCo2[index]?.[1] ?? null;
    const dataPoint = {
      year,
      hdd: hddVal,
      cdd: cddVal,
      co2: co2Val,
    };
    console.log('Data point:', dataPoint);
    return dataPoint;
  });
  console.log('Final chart data:', chartData);

  // Check CO2 coverage
  const co2Coverage = safeCoverage(co2Series, 0.5);

  // Handle toggle changes
  const handlePerCapitaToggle = (checked: boolean) => {
    setState({ perCapita: checked });
    setPerCapitaParam(checked);
  };

  const handleNormalizeToggle = (checked: boolean) => {
    setNormalizeParam(checked);
  };

  const handleSmoothingToggle = (checked: boolean) => {
    setSmoothingParam(checked);
  };

  return (
    <div>
      <StoryHeader
        title="Heat Rising, Energy Shifting"
        description="As cooling degree days (CDD) increase and heating degree days (HDD) decrease, how does that correlate with CO₂ emissions from electricity generation?"
        sources={SOURCES}
      />
      
      <div className="bg-platform-contrast/30 p-4 rounded-lg mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-6">
          <StatePicker />
          <LegendChips />
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          <PerCapitaToggle 
            perCapita={perCapita} 
            onToggle={handlePerCapitaToggle} 
          />
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="normalize-view">Normalize View</Label>
            <Switch
              id="normalize-view"
              checked={normalize}
              onCheckedChange={handleNormalizeToggle}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="smoothing">Rolling 10y Smoothing</Label>
            <Switch
              id="smoothing"
              checked={smoothing}
              onCheckedChange={handleSmoothingToggle}
            />
          </div>
        </div>
      </div>
      
      {!co2Coverage && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p>
            <strong>Warning:</strong> CO₂ emissions data coverage is below 50% for the selected state and years. 
            Results may be incomplete or misleading.
          </p>
        </div>
      )}
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <CombinedDegreeCo2Chart 
          data={chartData}
          showHdd={showHdd}
          showCdd={showCdd}
          perCapita={perCapita}
          normalize={normalize}
        />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}