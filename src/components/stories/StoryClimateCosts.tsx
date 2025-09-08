"use client";

import { useState, useMemo } from 'react';
import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useUrlState } from "@/hooks/useUrlState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import DisasterCostBars from "@/components/charts/DisasterCostBars";
import EmissionsOverlayLine from "@/components/charts/EmissionsOverlayLine";
import TypeFilterChips from "@/components/controls/TypeFilterChips";
import ModeTabs from "@/components/controls/ModeTabs";
import InflationToggle from "@/components/controls/InflationToggle";
import { selectFemaCosts, selectEmissionsNational, adjustForInflation, selectInflationIndex } from "@/lib/selectors/costs";
import { Card } from "@/components/shared/Card";
import YearReadout from "../climate/YearReadout";
import DownloadPanel from "../controls/DownloadPanel";

const SOURCES = [
  { name: "FEMA", url: "https://www.fema.gov/openfema-data-page/disaster-declarations-summaries-v2" },
  { name: "EPA GHGI", url: "https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" },
];

const DISASTER_TYPES = ['hurricane', 'flood', 'wildfire', 'drought', 'severeStorm'];

export default function StoryClimateCosts() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  
  // URL state parameters
  const [encodedTypes, setEncodedTypes] = useUrlState<string | null>('types', null);
  const [mode, setMode] = useUrlState<'total' | 'percap'>('costMode', 'total');
  const [real, setReal] = useUrlState<boolean>('real', true);
  const [stacked, setStacked] = useUrlState<boolean>('stack', true);
  
  // Decode types from URL
  const types = useMemo(() => {
    if (!encodedTypes) return DISASTER_TYPES;
    
    try {
      return encodedTypes.split('|').filter(Boolean);
    } catch (error) {
      console.warn('Failed to decode types, using defaults:', error);
      return DISASTER_TYPES;
    }
  }, [encodedTypes]);
  
  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }
  
  // Get FEMA costs data
  const femaCosts = selectFemaCosts(data, { scope: 'national', types });
  
  // Get emissions data
  const emissions = selectEmissionsNational(data, { perCapita: mode === 'percap' });
  
  // Get inflation data
  const cpi = selectInflationIndex();
  
  // Adjust costs for inflation if enabled
  const adjustedFemaCosts = useMemo(() => {
    if (!real || cpi.length === 0) return femaCosts;
    
    // For this example, we'll use 2020 as the base year
    const baseYear = 2020;
    
    const result: Record<string, [number, number | null][]> = {};
    Object.entries(femaCosts).forEach(([type, series]) => {
      result[type] = adjustForInflation(series, cpi, baseYear);
    });
    
    return result;
  }, [femaCosts, cpi, real]);
  
  // Prepare data for export
  const exportData = useMemo(() => {
    // This would combine all the data series for export
    // Implementation would depend on the exact export format needed
    return [];
  }, [adjustedFemaCosts, emissions, real, mode]);
  
  const exportHeaders = [
    'year',
    ...types,
    mode === 'percap' ? 'emissions_per_capita' : 'emissions_total',
    'real_dollars'
  ];

  return (
    <div>
      <StoryHeader
        title="The Cost of a Changing Climate"
        description="Inflation-adjusted FEMA disaster costs with national emissions overlay."
        sources={SOURCES}
      />
      
      <Card className="p-4 mb-6">
        <div className="space-y-6">
          <TypeFilterChips types={types} allTypes={DISASTER_TYPES} />
          
          <div className="flex flex-wrap items-center gap-6">
            <ModeTabs mode={mode} onModeChange={setMode} />
            
            <InflationToggle enabled={real} onToggle={setReal} />
            
            <div className="flex items-center space-x-2">
              <label htmlFor="stack-toggle" className="text-sm font-medium">
                Stacked View
              </label>
              <input
                id="stack-toggle"
                type="checkbox"
                checked={stacked}
                onChange={(e) => setStacked(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>
      
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <div className="relative">
          <DisasterCostBars 
            series={adjustedFemaCosts} 
            stacked={stacked}
            yAxisLabel={real ? "Cost (Real 2020 USD)" : "Cost (Nominal USD)"}
          />
          <EmissionsOverlayLine 
            series={emissions} 
            yAxisLabel={mode === 'percap' ? "CO₂ per Capita (tons)" : "CO₂ Emissions (million tons)"}
          />
        </div>
        
        <YearReadout />
      </ChartContainer>
    </div>
  );
}