// Selectors for climate economic data

import { ClimateEconArtifact, ClimateEconStateData } from '@/hooks/useClimateEconData';

// Get all available states
export const getAllStates = (data: ClimateEconArtifact): string[] => {
  return Object.keys(data.states);
};

// Get data for a specific state
export const getStateData = (data: ClimateEconArtifact, stateId: string): ClimateEconStateData | undefined => {
  return data.states[stateId];
};

// Get summer temperature anomalies for a state
export const getStateSummerAnomalies = (data: ClimateEconArtifact, stateId: string) => {
  const stateData = getStateData(data, stateId);
  return stateData ? stateData.temps.summerAnomaly : [];
};

// Get construction hours index for a state
export const getStateConstructionHours = (data: ClimateEconArtifact, stateId: string) => {
  const stateData = getStateData(data, stateId);
  return stateData ? stateData.econProxies.construction_hours_index : [];
};

// Get agricultural yield proxy for a state
export const getStateAgYieldProxy = (data: ClimateEconArtifact, stateId: string) => {
  const stateData = getStateData(data, stateId);
  return stateData ? stateData.econProxies.ag_yield_proxy : [];
};

// Get electric load proxy for a state
export const getStateElectricLoadProxy = (data: ClimateEconArtifact, stateId: string) => {
  const stateData = getStateData(data, stateId);
  return stateData ? stateData.econProxies.electric_load_proxy : [];
};

// Get metadata for proxies
export const getProxyMetadata = (data: ClimateEconArtifact) => {
  return data.meta.proxies;
};

// Create correlation data between summer anomalies and economic proxies
export const createCorrelationData = (data: ClimateEconArtifact, stateId: string) => {
  const stateData = getStateData(data, stateId);
  if (!stateData) return [];

  // Combine the data series by year
  const correlationData: {
    year: number;
    summerAnomaly: number | null;
    constructionIndex: number | null;
    agYieldProxy: number | null;
    electricLoadProxy: number | null;
  }[] = [];

  // Get all years from the summer anomalies (our primary series)
  const years = stateData.temps.summerAnomaly.map(item => item.year);

  // For each year, collect all available data points
  years.forEach(year => {
    const summerAnomaly = stateData.temps.summerAnomaly.find(item => item.year === year)?.anomaly_c || null;
    const constructionIndex = stateData.econProxies.construction_hours_index.find(item => item.year === year)?.idx || null;
    const agYieldProxy = stateData.econProxies.ag_yield_proxy.find(item => item.year === year)?.idx || null;
    const electricLoadProxy = stateData.econProxies.electric_load_proxy.find(item => item.year === year)?.idx || null;

    correlationData.push({
      year,
      summerAnomaly,
      constructionIndex,
      agYieldProxy,
      electricLoadProxy
    });
  });

  return correlationData;
};