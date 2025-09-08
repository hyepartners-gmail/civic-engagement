import { useQuery } from '@tanstack/react-query';

// Define TypeScript interfaces for our climate economic data
export interface ClimateEconProxyData {
  year: number;
  idx: number;
}

export interface ClimateTempAnomalyData {
  year: number;
  anomaly_c: number;
}

export interface ClimateEconStateData {
  name: string;
  temps: {
    summerAnomaly: ClimateTempAnomalyData[];
  };
  econProxies: {
    construction_hours_index: ClimateEconProxyData[];
    ag_yield_proxy: ClimateEconProxyData[];
    electric_load_proxy: ClimateEconProxyData[];
  };
}

export interface ClimateEconMetadataProxy {
  description: string;
  unit: string;
  source: string;
  transform: string;
}

export interface ClimateEconMetadata {
  title: string;
  description: string;
  version: string;
  lastUpdated: string;
  sources: {
    temperature: string;
    construction: string;
    agriculture: string;
    electricity: string;
  };
  proxies: {
    construction_hours_index: ClimateEconMetadataProxy;
    ag_yield_proxy: ClimateEconMetadataProxy;
    electric_load_proxy: ClimateEconMetadataProxy;
  };
}

export interface ClimateEconArtifact {
  meta: ClimateEconMetadata;
  states: {
    [stateId: string]: ClimateEconStateData;
  };
}

const fetcher = async (): Promise<ClimateEconArtifact> => {
  const res = await fetch("/climate/climate_econ_artifact.json");
  if (!res.ok) {
    throw new Error("Failed to fetch climate economic data");
  }
  const data = await res.json();
  return data;
};

export function useClimateEconData() {
  return useQuery<ClimateEconArtifact>({
    queryKey: ['climateEconData'],
    queryFn: fetcher,
    staleTime: Infinity,
  });
}