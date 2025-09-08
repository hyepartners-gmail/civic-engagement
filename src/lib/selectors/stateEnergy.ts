import { StateEnergyData } from '@/lib/energySchema';
import { EnergyState as EnergyFilters } from '@/hooks/useEnergyState';

export function filterStateEnergyData(data: StateEnergyData[], filters: EnergyFilters): StateEnergyData[] {
  // For now, we'll return all data as we don't have fuel type filtering at the state level
  // In a more advanced implementation, we could filter based on dominant fuel types
  return data;
}

export function selectStateById(data: StateEnergyData[], stateCode: string): StateEnergyData | undefined {
  return data.find(d => d.state === stateCode);
}

export function selectRegionalSummary(data: StateEnergyData[]): Record<string, { 
  capacity: number; 
  generation: number; 
  emissions: number 
}> {
  const summary: Record<string, { capacity: number; generation: number; emissions: number }> = {};
  
  data.forEach(stateData => {
    summary[stateData.state] = {
      capacity: stateData.capacity_mw,
      generation: stateData.annual_net_gen_mwh,
      emissions: stateData.annual_co2_tons,
    };
  });
  
  return summary;
}

export function selectRegionalSummaryWithRenewables(data: StateEnergyData[]): Record<string, { 
  capacity: number; 
  generation: number; 
  emissions: number;
  renewable_generation: number;
  renewable_share: number;
}> {
  const summary: Record<string, { 
    capacity: number; 
    generation: number; 
    emissions: number;
    renewable_generation: number;
    renewable_share: number;
  }> = {};
  
  data.forEach(stateData => {
    // Calculate renewable generation from renewable fuel types
    const renewableFuels = ['wind', 'solar', 'dam', 'geothermal', 'biomass'];
    let renewableGeneration = 0;
    
    // Make sure we handle cases where netgen_by_fuel_mwh is not available
    if (stateData.netgen_by_fuel_mwh) {
      renewableFuels.forEach(fuel => {
        if (stateData.netgen_by_fuel_mwh[fuel] !== undefined) {
          renewableGeneration += stateData.netgen_by_fuel_mwh[fuel];
        }
      });
    }
    
    const totalGeneration = stateData.annual_net_gen_mwh;
    const renewableShare = totalGeneration > 0 ? (renewableGeneration / totalGeneration) * 100 : 0;
    
    summary[stateData.state] = {
      capacity: stateData.capacity_mw,
      generation: totalGeneration,
      emissions: stateData.annual_co2_tons,
      renewable_generation: renewableGeneration,
      renewable_share: renewableShare,
    };
  });
  
  return summary;
}

export function selectTopEmitters(data: StateEnergyData[], limit: number = 10): StateEnergyData[] {
  return data
    .sort((a, b) => b.annual_co2_tons - a.annual_co2_tons)
    .slice(0, limit);
}

export function selectCleanestStates(data: StateEnergyData[], limit: number = 10): StateEnergyData[] {
  return data
    .filter(state => state.capacity_mw > 1000) // Only consider states with significant capacity
    .sort((a, b) => {
      const aIntensity = a.annual_net_gen_mwh > 0 ? (a.annual_co2_tons / a.annual_net_gen_mwh) * 1000 : Infinity;
      const bIntensity = b.annual_net_gen_mwh > 0 ? (b.annual_co2_tons / b.annual_net_gen_mwh) * 1000 : Infinity;
      return aIntensity - bIntensity;
    })
    .slice(0, limit);
}

export function selectRegionComparison(data: StateEnergyData[], state1: string, state2: string): {
  region1: { capacity: number; generation: number; emissions: number; renewable_share: number };
  region2: { capacity: number; generation: number; emissions: number; renewable_share: number };
} {
  const stateSummaries = selectRegionalSummaryWithRenewables(data);
  
  const region1Data = stateSummaries[state1] || { 
    capacity: 0, 
    generation: 0, 
    emissions: 0,
    renewable_generation: 0,
    renewable_share: 0
  };
  
  const region2Data = stateSummaries[state2] || { 
    capacity: 0, 
    generation: 0, 
    emissions: 0,
    renewable_generation: 0,
    renewable_share: 0
  };
  
  // Calculate renewable shares if generation is not zero
  const region1RenewableShare = region1Data.generation > 0 
    ? (region1Data.renewable_generation / region1Data.generation) * 100 
    : 0;
    
  const region2RenewableShare = region2Data.generation > 0 
    ? (region2Data.renewable_generation / region2Data.generation) * 100 
    : 0;
  
  return {
    region1: {
      capacity: region1Data.capacity,
      generation: region1Data.generation,
      emissions: region1Data.emissions,
      renewable_share: region1RenewableShare
    },
    region2: {
      capacity: region2Data.capacity,
      generation: region2Data.generation,
      emissions: region2Data.emissions,
      renewable_share: region2RenewableShare
    }
  };
}

// Function to get fuel mix data for a state
export function getStateFuelMix(stateData: StateEnergyData): { id: string; label: string; value: number; color: string }[] {
  const fuelMix: { id: string; label: string; value: number; color: string }[] = [];
  
  Object.entries(stateData.capacity_by_fuel_mw).forEach(([fuel, capacity]) => {
    if (capacity > 0) {
      // Simple color mapping - in a real app, this would be more sophisticated
      const colors: Record<string, string> = {
        'coal': '#2f4f4f',
        'lng': '#8b0000',
        'oil': '#ff8c00',
        'nuclear': '#9370db',
        'dam': '#4169e1',
        'wind': '#00ff7f',
        'solar': '#ffff00',
        'biomass': '#8b4513',
        'geothermal': '#ff6347',
        'other': '#a9a9a9'
      };
      
      fuelMix.push({
        id: fuel,
        label: fuel.charAt(0).toUpperCase() + fuel.slice(1),
        value: capacity,
        color: colors[fuel] || '#778899'
      });
    }
  });
  
  return fuelMix;
}