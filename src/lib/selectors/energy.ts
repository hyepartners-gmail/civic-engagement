import { Plant } from '@/lib/energySchema';
import { EnergyState as EnergyFilters, FuelType } from '@/hooks/useEnergyState'; // Ensure FuelType is imported

export function filterPlants(plants: Plant[], filters: EnergyFilters): Plant[] {
  return plants.filter(plant => {
    const fuelMatch = filters.fuelTypes.includes(plant.fuel_type as any);
    const co2Match = (plant.co2_intensity_kg_mwh ?? 0) <= filters.co2Max;
    const capacityMatch = plant.capacity_mw >= filters.capacityMin;
    return fuelMatch && co2Match && capacityMatch;
  });
}

export function groupByFuelType(plants: Plant[]): Record<string, { count: number; capacity: number }> {
  return plants.reduce((acc, plant) => {
    const fuel = plant.fuel_type;
    if (!acc[fuel]) {
      acc[fuel] = { count: 0, capacity: 0 };
    }
    acc[fuel].count++;
    acc[fuel].capacity += plant.capacity_mw;
    return acc;
  }, {} as Record<string, { count: number; capacity: number }>);
}

export function selectPlantById(plants: Plant[], id: number): Plant | undefined {
  return plants.find(p => p.plant_id === id);
}

// New selector for Phase 2 - Plant History (stub implementation)
export function selectPlantHistory(plants: Plant[], id: number): any[] {
  // This would require joining with time series data from EIA-923
  // For now, returning empty array as a placeholder
  return [];
}

// New selector for Phase 2 - Regional Summary
export function selectRegionalSummary(plants: Plant[]): Record<string, { capacity: number; generation: number; emissions: number }> {
  return plants.reduce((acc, plant) => {
    const state = plant.state;
    if (!acc[state]) {
      acc[state] = { capacity: 0, generation: 0, emissions: 0 };
    }
    acc[state].capacity += plant.capacity_mw;
    acc[state].generation += plant.annual_net_gen_mwh ?? 0;
    acc[state].emissions += plant.co2_tons ?? 0;
    return acc;
  }, {} as Record<string, { capacity: number; generation: number; emissions: number }>);
}

export function selectTopEmitters(plants: Plant[], limit: number = 10): Plant[] {
  return plants
    .filter(p => p.co2_tons !== null)
    .sort((a, b) => (b.co2_tons ?? 0) - (a.co2_tons ?? 0))
    .slice(0, limit);
}

export function selectCleanestPlants(plants: Plant[], limit: number = 10): Plant[] {
  return plants
    .filter(p => p.capacity_mw > 50 && p.co2_intensity_kg_mwh !== null)
    .sort((a, b) => (a.co2_intensity_kg_mwh ?? Infinity) - (b.co2_intensity_kg_mwh ?? Infinity))
    .slice(0, limit);
}

export function selectRenewableBuildOverTime(plants: Plant[]): { id: string; data: { x: number; y: number }[] }[] {
  const renewableTypes: FuelType[] = ['Wind', 'Solar', 'Hydro']; // Now FuelType is correctly recognized
  const renewablePlants = plants.filter(p => renewableTypes.includes(p.fuel_type as any) && p.online_year);

  if (renewablePlants.length === 0) return [];

  const years = Array.from(new Set(renewablePlants.map(p => p.online_year!))).sort();
  const minYear = years[0];
  const maxYear = new Date().getFullYear();

  const yearlyData: Record<string, Record<number, number>> = {};
  renewableTypes.forEach(type => yearlyData[type] = {});

  for (let year = minYear; year <= maxYear; year++) {
    renewableTypes.forEach(type => {
      const cumulativeCapacity = renewablePlants
        .filter(p => p.fuel_type === type && p.online_year! <= year)
        .reduce((sum, p) => sum + p.capacity_mw, 0);
      yearlyData[type][year] = cumulativeCapacity;
    });
  }

  return renewableTypes.map(type => ({
    id: type,
    data: Object.entries(yearlyData[type]).map(([year, capacity]) => ({
      x: Number(year),
      y: capacity,
    })),
  }));
}

// New selector for Phase 2 - Plants by Region
export function selectPlantsByRegion(plants: Plant[], region: string): Plant[] {
  return plants.filter(plant => plant.state === region);
}