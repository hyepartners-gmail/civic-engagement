"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectDegreeDays } from "@/lib/selectors/degreeDays";
import { mergeByYear } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import StatePicker from "../controls/StatePicker";
import LegendChips from "../controls/LegendChips";
import DegreeDaysChart from "../charts/DegreeDaysChart";

// Import the STATE_NAMES mapping
const STATE_NAMES: Record<string, string> = {
  'national': 'National Average',
  'wa': 'Washington',
  'ca': 'California',
  'il': 'Illinois',
  'tx': 'Texas',
  'ga': 'Georgia',
  'ny': 'New York'
};

const SOURCES = [
  { name: "EIA SEDS", url: "https://www.eia.gov/state/seds/" },
  { name: "NOAA NCEI", url: "https://www.ncei.noaa.gov/access/monitoring/climate-at-a-glance/" },
];

export default function StoryDegreeDays() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const climateState = useClimateState();
  const { state } = climateState;
  
  // URL state parameters
  const [ddParam, setDdParam] = useUrlState<string>('dd', 'both');
  const [smoothingParam, setSmoothingParam] = useUrlState<boolean>('smoothing', false);

  // Get visibility settings from URL or defaults
  const showHdd = ddParam === 'hdd' || ddParam === 'both';
  const showCdd = ddParam === 'cdd' || ddParam === 'both';
  const smoothing = smoothingParam || false;

  if (!data) {
    console.log('No climate data available');
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  // Get degree days data for the selected state or national average
  const { hdd, cdd } = selectDegreeDays(data, { 
    scope: state === 'national' ? 'national' : 'state', 
    id: state || 'tx', 
    cadence: 'annual' 
  });
  
  // Create combined data structure
  const chartData = mergeByYear(hdd, cdd).map(([year, hddVal, cddVal]) => ({
    year,
    hdd: hddVal,
    cdd: cddVal,
  }));

  // Handle empty data case
  const hasData = chartData.length > 0;
  if (!hasData) {
    console.log('No degree days data available for', state === 'national' ? 'national average' : state || 'tx');
  } else {
    console.log(`Loaded ${chartData.length} degree days records for ${state === 'national' ? 'national average' : state || 'tx'}`);
  }

  // Handle toggle changes
  const handleSmoothingToggle = (checked: boolean) => {
    setSmoothingParam(checked);
  };

  return (
    <div>
      <StoryHeader
        title="Heat On Cold Days and Cooling on Hot Days"
        description="Population-weighted degree days show how energy demand for temperature control has changed over time."
        sources={SOURCES}
      />
      
      <div className="bg-platform-contrast/30 p-4 rounded-lg mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-6">
          <StatePicker />
          <LegendChips />
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
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        {hasData ? (
          <DegreeDaysChart 
            data={chartData}
            showHdd={showHdd}
            showCdd={showCdd}
            smoothing={smoothing}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-[500px] text-platform-text">
            <p>No degree days data available for {state === 'national' ? 'National Average' : STATE_NAMES[state || 'tx']}.</p>
          </div>
        )}
        <YearReadout />
      </ChartContainer>
    </div>
  );
}