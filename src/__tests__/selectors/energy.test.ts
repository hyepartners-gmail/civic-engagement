import { 
  filterPlants, 
  groupByFuelType, 
  selectPlantById, 
  selectRegionalSummary,
  selectTopEmitters,
  selectCleanestPlants,
  selectRenewableBuildOverTime,
  selectPlantHistory,
  selectRegionalSummaryWithRenewables,
  selectPlantsByRegion,
  selectRegionComparison
} from '@/lib/selectors/energy';

// Mock plant data
const mockPlants = [
  {
    plant_id: 1,
    plant_name: "Coal Plant 1",
    state: "TX",
    latitude: 32.0,
    longitude: -97.0,
    fuel_type: "Coal",
    capacity_mw: 1000,
    annual_net_gen_mwh: 7000000,
    co2_tons: 5000000,
    co2_intensity_kg_mwh: 714,
    operator: "Energy Corp",
    online_year: 1980
  },
  {
    plant_id: 2,
    plant_name: "Gas Plant 1",
    state: "CA",
    latitude: 34.0,
    longitude: -118.0,
    fuel_type: "Natural Gas",
    capacity_mw: 500,
    annual_net_gen_mwh: 3000000,
    co2_tons: 1500000,
    co2_intensity_kg_mwh: 500,
    operator: "Power Co",
    online_year: 2000
  },
  {
    plant_id: 3,
    plant_name: "Wind Farm 1",
    state: "TX",
    latitude: 35.0,
    longitude: -102.0,
    fuel_type: "Wind",
    capacity_mw: 200,
    annual_net_gen_mwh: 600000,
    co2_tons: 0,
    co2_intensity_kg_mwh: 0,
    operator: "Renewable Energy",
    online_year: 2010
  },
  {
    plant_id: 4,
    plant_name: "Solar Plant 1",
    state: "CA",
    latitude: 33.0,
    longitude: -117.0,
    fuel_type: "Solar",
    capacity_mw: 150,
    annual_net_gen_mwh: 300000,
    co2_tons: 0,
    co2_intensity_kg_mwh: 0,
    operator: "Clean Power",
    online_year: 2015
  }
];

describe('Energy Selectors', () => {
  describe('filterPlants', () => {
    it('should filter plants by fuel type', () => {
      const filters = {
        fuelTypes: ['Coal'],
        co2Max: 1200,
        capacityMin: 100,
        regionalMetric: 'none',
        showRpsOverlay: false
      } as any;
      
      const result = filterPlants(mockPlants, filters);
      expect(result).toHaveLength(1);
      expect(result[0].fuel_type).toBe('Coal');
    });

    it('should filter plants by CO2 intensity', () => {
      const filters = {
        fuelTypes: ['Coal', 'Natural Gas', 'Wind', 'Solar'],
        co2Max: 600,
        capacityMin: 100,
        regionalMetric: 'none',
        showRpsOverlay: false
      } as any;
      
      const result = filterPlants(mockPlants, filters);
      expect(result).toHaveLength(3);
      expect(result.some(p => p.fuel_type === 'Coal')).toBe(false);
    });

    it('should filter plants by capacity', () => {
      const filters = {
        fuelTypes: ['Coal', 'Natural Gas', 'Wind', 'Solar'],
        co2Max: 1200,
        capacityMin: 300,
        regionalMetric: 'none',
        showRpsOverlay: false
      } as any;
      
      const result = filterPlants(mockPlants, filters);
      expect(result).toHaveLength(2);
      expect(result.every(p => p.capacity_mw >= 300)).toBe(true);
    });
  });

  describe('groupByFuelType', () => {
    it('should group plants by fuel type and calculate counts and capacity', () => {
      const result = groupByFuelType(mockPlants);
      
      expect(result['Coal']).toEqual({ count: 1, capacity: 1000 });
      expect(result['Natural Gas']).toEqual({ count: 1, capacity: 500 });
      expect(result['Wind']).toEqual({ count: 1, capacity: 200 });
      expect(result['Solar']).toEqual({ count: 1, capacity: 150 });
    });
  });

  describe('selectPlantById', () => {
    it('should return the correct plant by ID', () => {
      const result = selectPlantById(mockPlants, 2);
      expect(result).toEqual(mockPlants[1]);
    });

    it('should return undefined for non-existent plant ID', () => {
      const result = selectPlantById(mockPlants, 999);
      expect(result).toBeUndefined();
    });
  });

  describe('selectPlantHistory', () => {
    it('should return an empty array as a placeholder', () => {
      const result = selectPlantHistory(mockPlants, 1);
      expect(result).toEqual([]);
    });
  });

  describe('selectRegionalSummary', () => {
    it('should calculate regional summaries by state', () => {
      const result = selectRegionalSummary(mockPlants);
      
      expect(result['TX']).toEqual({
        capacity: 1200,
        generation: 7600000,
        emissions: 5000000
      });
      
      expect(result['CA']).toEqual({
        capacity: 650,
        generation: 3300000,
        emissions: 1500000
      });
    });
  });

  describe('selectRegionalSummaryWithRenewables', () => {
    it('should calculate regional summaries with renewable generation', () => {
      const result = selectRegionalSummaryWithRenewables(mockPlants);
      
      expect(result['TX']).toEqual({
        capacity: 1200,
        generation: 7600000,
        emissions: 5000000,
        renewable_generation: 600000,
        renewable_share: 0 // Not calculated in this function
      });
      
      expect(result['CA']).toEqual({
        capacity: 650,
        generation: 3300000,
        emissions: 1500000,
        renewable_generation: 300000,
        renewable_share: 0 // Not calculated in this function
      });
    });
  });

  describe('selectPlantsByRegion', () => {
    it('should filter plants by region', () => {
      const result = selectPlantsByRegion(mockPlants, 'TX');
      expect(result).toHaveLength(2);
      expect(result.every(p => p.state === 'TX')).toBe(true);
      
      const caResult = selectPlantsByRegion(mockPlants, 'CA');
      expect(caResult).toHaveLength(2);
      expect(caResult.every(p => p.state === 'CA')).toBe(true);
    });
    
    it('should return empty array for non-existent region', () => {
      const result = selectPlantsByRegion(mockPlants, 'NY');
      expect(result).toHaveLength(0);
    });
  });

  describe('selectRegionComparison', () => {
    it('should compare two regions', () => {
      const result = selectRegionComparison(mockPlants, 'TX', 'CA');
      
      // Calculate expected renewable shares
      const txRenewableShare = (600000 / 7600000) * 100;
      const caRenewableShare = (300000 / 3300000) * 100;
      
      expect(result.region1).toEqual({
        capacity: 1200,
        generation: 7600000,
        emissions: 5000000,
        renewable_share: txRenewableShare
      });
      
      expect(result.region2).toEqual({
        capacity: 650,
        generation: 3300000,
        emissions: 1500000,
        renewable_share: caRenewableShare
      });
    });
    
    it('should handle comparison with non-existent regions', () => {
      const result = selectRegionComparison(mockPlants, 'NY', 'FL');
      
      expect(result.region1).toEqual({
        capacity: 0,
        generation: 0,
        emissions: 0,
        renewable_share: 0
      });
      
      expect(result.region2).toEqual({
        capacity: 0,
        generation: 0,
        emissions: 0,
        renewable_share: 0
      });
    });
  });

  describe('selectTopEmitters', () => {
    it('should return the top emitters sorted by CO2 emissions', () => {
      const result = selectTopEmitters(mockPlants, 2);
      
      expect(result).toHaveLength(2);
      expect(result[0].plant_name).toBe('Coal Plant 1');
      expect(result[1].plant_name).toBe('Gas Plant 1');
    });
    
    it('should filter out plants with null CO2 emissions', () => {
      const plantsWithNullCO2 = [
        ...mockPlants,
        {
          plant_id: 5,
          plant_name: "Unknown Plant",
          state: "NY",
          latitude: 40.0,
          longitude: -75.0,
          fuel_type: "Other",
          capacity_mw: 300,
          annual_net_gen_mwh: 1000000,
          co2_tons: null,
          co2_intensity_kg_mwh: null,
          operator: "Unknown Co",
          online_year: 2005
        }
      ];
      
      const result = selectTopEmitters(plantsWithNullCO2, 10);
      // Should not include the plant with null CO2
      expect(result).toHaveLength(4); // 4 plants from mockPlants, excluding the one with null CO2
      expect(result.some(p => p.plant_name === 'Unknown Plant')).toBe(false);
    });
  });

  describe('selectCleanestPlants', () => {
    it('should return the cleanest plants sorted by CO2 intensity', () => {
      const result = selectCleanestPlants(mockPlants, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0].fuel_type).toBe('Wind');
      expect(result[1].fuel_type).toBe('Solar');
      expect(result[2].fuel_type).toBe('Natural Gas');
    });
    
    it('should filter out plants with capacity <= 50MW', () => {
      const plantsWithSmallPlant = [
        ...mockPlants,
        {
          plant_id: 5,
          plant_name: "Small Plant",
          state: "NY",
          latitude: 40.0,
          longitude: -75.0,
          fuel_type: "Solar",
          capacity_mw: 30, // Below 50MW threshold
          annual_net_gen_mwh: 50000,
          co2_tons: 0,
          co2_intensity_kg_mwh: 0,
          operator: "Small Co",
          online_year: 2005
        }
      ];
      
      const result = selectCleanestPlants(plantsWithSmallPlant, 10);
      // Should not include the small plant
      expect(result.some(p => p.plant_name === 'Small Plant')).toBe(false);
    });
    
    it('should handle plants with null CO2 intensity', () => {
      const plantsWithNullCO2 = [
        ...mockPlants,
        {
          plant_id: 5,
          plant_name: "Unknown Plant",
          state: "NY",
          latitude: 40.0,
          longitude: -75.0,
          fuel_type: "Other",
          capacity_mw: 300,
          annual_net_gen_mwh: 1000000,
          co2_tons: 500000,
          co2_intensity_kg_mwh: null,
          operator: "Unknown Co",
          online_year: 2005
        }
      ];
      
      const result = selectCleanestPlants(plantsWithNullCO2, 10);
      // Should not include the plant with null CO2 intensity
      expect(result.some(p => p.plant_name === 'Unknown Plant')).toBe(false);
    });
  });

  describe('selectRenewableBuildOverTime', () => {
    it('should calculate renewable build over time', () => {
      const result = selectRenewableBuildOverTime(mockPlants);
      
      expect(result).toHaveLength(3); // Wind, Solar, Hydro
      
      const windSeries = result.find(r => r.id === 'Wind');
      expect(windSeries).toBeDefined();
      expect(windSeries?.data.length).toBeGreaterThan(0);
      
      const solarSeries = result.find(r => r.id === 'Solar');
      expect(solarSeries).toBeDefined();
      expect(solarSeries?.data.length).toBeGreaterThan(0);
    });
    
    it('should handle empty plant data', () => {
      const result = selectRenewableBuildOverTime([]);
      expect(result).toEqual([]);
    });
    
    it('should handle plants without online year', () => {
      const plantsWithoutYear = mockPlants.map(plant => ({
        ...plant,
        online_year: null
      }));
      
      const result = selectRenewableBuildOverTime(plantsWithoutYear);
      expect(result).toEqual([]);
    });
  });
});