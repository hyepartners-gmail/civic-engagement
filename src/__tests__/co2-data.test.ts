import { createClimateArtifact } from '@/hooks/useRawClimateArtifact';

// Mock data for testing
const mockCityTemps = [
  { city: "Seattle", year: 2020, avg_temp_c: 15.5 },
  { city: "Seattle", year: 2021, avg_temp_c: 16.2 }
];

const mockCityPrecip = [
  { city: "Seattle", year: 2020, precip_mm: 900 },
  { city: "Seattle", year: 2021, precip_mm: 850 }
];

const mockDisasters = [
  { year: 2020, disasters: 100 },
  { year: 2021, disasters: 120 }
];

const mockWildfires = [
  { year: 2020, acres: 1000000, fires: 50000 },
  { year: 2021, acres: 1200000, fires: 60000 }
];

const mockCO2Data = [
  { state: "WA", year: 2020, co2_mmmt: 100.5 },
  { state: "WA", year: 2021, co2_mmmt: 98.3 },
  { state: "CA", year: 2020, co2_mmmt: 350.2 },
  { state: "CA", year: 2021, co2_mmmt: 345.1 }
];

describe('createClimateArtifact with CO2 data', () => {
  it('should correctly process CO2 data and include it in the artifact', () => {
    const artifact = createClimateArtifact(
      mockCityTemps,
      mockCityPrecip,
      mockDisasters,
      mockWildfires,
      mockCO2Data,
      []
    );

    // Check that the artifact was created
    expect(artifact).toBeDefined();
    
    // Check that national CO2 data exists
    expect(artifact.national?.series.annual.emissions?.co2).toBeDefined();
    
    // Check that national CO2 data is aggregated correctly (sum of state data)
    const nationalCO2 = artifact.national?.series.annual.emissions?.co2;
    expect(nationalCO2?.[0]).toEqual([2020, 450.7]); // 100.5 + 350.2
    expect(nationalCO2?.[1][0]).toBe(2021);
    expect(nationalCO2?.[1][1]).toBeCloseTo(443.4, 1); // 98.3 + 345.1
    
    // Check that state CO2 data exists for all states in the dataset (converted to lowercase)
    expect(artifact.states?.['wa']?.series.annual.emissions?.co2).toBeDefined();
    expect(artifact.states?.['wa']?.series.annual.emissions?.co2).toEqual([
      [2020, 100.5],
      [2021, 98.3]
    ]);
    
    expect(artifact.states?.['ca']?.series.annual.emissions?.co2).toBeDefined();
    expect(artifact.states?.['ca']?.series.annual.emissions?.co2).toEqual([
      [2020, 350.2],
      [2021, 345.1]
    ]);
    
    // Check that units include CO2
    expect(artifact.meta.units.co2).toBe('MMT');
  });
});