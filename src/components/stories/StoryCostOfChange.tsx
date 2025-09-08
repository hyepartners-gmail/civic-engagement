"use client";

import { useClimateArtifact } from "@/hooks/useClimateArtifact";
import { useClimateState } from "@/hooks/useClimateState";
import ChartContainer from "@/components/shared/ChartContainer";
import StoryHeader from "@/components/climate/StoryHeader";
import { selectFemaCosts } from "@/lib/selectors/disasters";
import { selectNationalCO2 } from "@/lib/selectors/emissions";
import { mergeYearSeries } from "@/utils/array";
import YearReadout from "../climate/YearReadout";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DownloadPanel from "../controls/DownloadPanel";
import dynamic from 'next/dynamic';

const DisasterCostOverlay = dynamic(() => import("@/components/charts/DisasterCostOverlay"), { ssr: false });

const SOURCES = [
  { name: "FEMA", url: "https://www.fema.gov/openfema-data-page/public-assistance-funded-projects-details-v1" },
  { name: "EPA GHGI", url: "https://www.epa.gov/ghgemissions/inventory-us-greenhouse-gas-emissions-and-sinks" },
];

export default function StoryCostOfChange() {
  const { data, isLoading, isError, error } = useClimateArtifact();
  const { costMode, inflationAdjust, disasterTypes, setState } = useClimateState();

  if (!data) {
    return <ChartContainer isLoading={isLoading} isError={isError} error={error as Error | null}><div /></ChartContainer>;
  }

  const { series: costSeries } = selectFemaCosts(data, {
    types: disasterTypes,
    perCapita: costMode === 'per-capita',
    inflationAdjust,
  });

  const co2Series = selectNationalCO2(data, {
    perCapita: costMode === 'per-capita',
    smoothing: false,
  });

  const merged = mergeYearSeries(costSeries, co2Series);

  const chartData = {
    costs: {
      id: 'FEMA Costs',
      data: merged.map(([year, cost]) => ({ x: year, y: cost })),
    },
    emissions: {
      id: 'CO2 Emissions',
      data: merged.map(([year, _, co2]) => ({ x: year, y: co2 })),
    },
  };

  const costUnit = `${inflationAdjust ? 'Real' : 'Nominal'} USD ${costMode === 'per-capita' ? 'per capita' : ''}`;
  const emissionsUnit = `CO₂ ${costMode === 'per-capita' ? 'tons per capita' : '(MMT)'}`;

  return (
    <div>
      <StoryHeader
        title="The Cost of a Changing Climate"
        description="Comparing inflation-adjusted FEMA disaster costs with national CO₂ emissions."
        sources={SOURCES}
      />
      <div className="bg-platform-contrast/30 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-6">
        <Tabs value={costMode} onValueChange={(v) => setState({ costMode: v as any })}>
          <TabsList>
            <TabsTrigger value="total">Total</TabsTrigger>
            <TabsTrigger value="per-capita">Per-Capita</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center space-x-2">
          <Label htmlFor="inflation-adjust">Inflation Adjusted</Label>
          <Switch
            id="inflation-adjust"
            checked={inflationAdjust}
            onCheckedChange={(checked) => setState({ inflationAdjust: checked })}
          />
        </div>
      </div>
      <ChartContainer isLoading={isLoading} isError={isError} error={error}>
        <DisasterCostOverlay
          data={chartData}
          costUnit={costUnit}
          emissionsUnit={emissionsUnit}
        />
        <YearReadout />
      </ChartContainer>
    </div>
  );
}