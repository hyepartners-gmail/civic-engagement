import { ClimateArtifact } from "@/types/climate";
import { HeatEconMetric, HeatEconScope } from "@/hooks/useClimateState";

type Series = [number, number | null][];

interface EconSelectorOptions {
  metric: HeatEconMetric;
  scope: HeatEconScope;
  id: string; // cityId or stateId
}

export function selectSectorProxy(
  artifact: ClimateArtifact,
  options: EconSelectorOptions
): Series {
  const { metric, scope, id } = options;
  
  let seriesSource;
  if (scope === 'city') {
    seriesSource = (artifact.cities as any)[id]?.series?.annual?.economy;
  } else if (scope === 'state') {
    seriesSource = (artifact.states as any)?.[id]?.series?.annual?.economy;
  }

  // TODO: Replace with real data from BLS/BEA/USDA when available.
  // This is a placeholder implementation.
  switch (metric) {
    case 'construction':
      return seriesSource?.construction ?? [];
    case 'agriculture':
      return seriesSource?.agriculture ?? [];
    case 'energy':
      return seriesSource?.energy ?? [];
    default:
      return [];
  }
}