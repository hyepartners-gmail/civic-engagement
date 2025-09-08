import { ClimateArtifact } from "@/types/climate";
import { DisasterType, Cadence } from "@/hooks/useClimateState";

type Series = [number, number | null][];

interface DisasterSelectorOptions {
  scope: 'national';
  types: DisasterType[];
  cadence: Cadence;
}

export function selectFemaCounts(
  artifact: ClimateArtifact,
  options: DisasterSelectorOptions
): { series: Series; byType: Record<DisasterType, Series> } {
  const { scope, types, cadence } = options;

  // Only supporting national scope for now with the available data
  const seriesSource = artifact.national?.series?.[cadence];

  if (!seriesSource) {
    return { series: [], byType: {} as any };
  }

  const byType: Record<DisasterType, Series> = {} as any;
  const combinedCounts: { [year: number]: number } = {};

  types.forEach(type => {
    // Map disaster types to the available data keys
    let dataKey: string;
    switch (type) {
      case 'wildfire':
        dataKey = 'wildfire';
        break;
      case 'hurricane':
        dataKey = 'hurricane';
        break;
      case 'flood':
        dataKey = 'flood';
        break;
      case 'severe-storm':
        dataKey = 'severe-storm';
        break;
      default:
        dataKey = 'total';
    }

    // Convert the disaster series data to ensure year is always a number
    const rawSeries: [string | number, number | null][] = seriesSource.disasters?.[dataKey] ?? [];
    const disasterSeries: Series = rawSeries.map(([year, count]) => [Number(year), count]);
    byType[type] = disasterSeries;
    
    disasterSeries.forEach(([year, count]) => {
      if (count !== null) {
        combinedCounts[year] = (combinedCounts[year] || 0) + count;
      }
    });
  });

  const series = Object.entries(combinedCounts)
    .map(([year, count]) => [Number(year), count] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  return { series, byType };
}

export function selectFemaCosts(
  artifact: ClimateArtifact,
  options: { types: DisasterType[]; perCapita: boolean; inflationAdjust: boolean }
): { series: Series; byType: Record<DisasterType, Series> } {
  // Fema costs data is not available in the current dataset
  // This is a placeholder implementation
  console.warn("FEMA costs data not available in current dataset");
  return { series: [], byType: {} as any };
}

// Deprecated function - keeping for backward compatibility
export function selectDisasterCounts(
  artifact: ClimateArtifact,
  options: DisasterSelectorOptions
): Series {
  const { series } = selectFemaCounts(artifact, options);
  return series;
}