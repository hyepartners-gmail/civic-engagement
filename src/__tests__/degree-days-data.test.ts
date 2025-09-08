import { createClimateArtifact } from '@/hooks/useRawClimateArtifact';

// Mock data for testing
const mockCityTemps = [
  { city: "Seattle", year: 2020, avg_temp_c: 15.5 },
  { city: "Seattle", year: 2021, avg_temp_c: 16.2 },
];

const mockCityPrecip = [
  { city: "Seattle", year: 2020, precip_mm: 1200 },
  { city: "Seattle", year: 2021, precip_mm: 1100 },
];

const mockDisasters = [
  { year: 2020, disasters: 15 },
  { year: 2021, disasters: 18 },
];

const mockWildfires = [
  { year: 2020, acres_burned: 1000000, fires: 5000 },
  { year: 2021, acres_burned: 1200000, fires: 6000 },
];

const mockCO2Data = [
  { state: "WA", year: 2020, co2_mmmt: 100.5 },
  { state: "WA", year: 2021, co2_mmmt: 95.2 },
];

const mockDegreeDaysData = [
  { state: "WA", year: 2020, hdd: 5000.0, cdd: 1200.0 },
  { state: "WA", year: 2021, hdd: 4800.0, cdd: 1300.0 },
];

describe('Degree Days Data Integration', () => {
  it('should process degree days data correctly in climate artifact', () => {
    const artifact = createClimateArtifact(
      mockCityTemps,
      mockCityPrecip,
      mockDisasters,
      mockWildfires,
      mockCO2Data,
      mockDegreeDaysData
    );

    // Check that the artifact was created
    expect(artifact).toBeDefined();
    
    // Check that state data exists
    expect(artifact.states).toBeDefined();
    
    // Check that WA state data exists (lowercase)
    const waStateData = (artifact.states as any)['wa'];
    expect(waStateData).toBeDefined();
    
    // Check that degree days data exists for WA
    expect(waStateData.series.annual.degreeDays).toBeDefined();
    expect(waStateData.series.annual.degreeDays.hdd).toBeDefined();
    expect(waStateData.series.annual.degreeDays.cdd).toBeDefined();
    
    // Check specific values
    const hddData = waStateData.series.annual.degreeDays.hdd;
    const cddData = waStateData.series.annual.degreeDays.cdd;
    
    // Find data for 2020
    const hdd2020 = hddData.find(([year, _]) => year === 2020);
    const cdd2020 = cddData.find(([year, _]) => year === 2020);
    
    expect(hdd2020).toEqual([2020, 5000.0]);
    expect(cdd2020).toEqual([2020, 1200.0]);
    
    // Find data for 2021
    const hdd2021 = hddData.find(([year, _]) => year === 2021);
    const cdd2021 = cddData.find(([year, _]) => year === 2021);
    
    expect(hdd2021).toEqual([2021, 4800.0]);
    expect(cdd2021).toEqual([2021, 1300.0]);
  });

  it('should handle missing degree days data gracefully', () => {
    // Test with empty degree days data
    const artifact = createClimateArtifact(
      mockCityTemps,
      mockCityPrecip,
      mockDisasters,
      mockWildfires,
      mockCO2Data,
      [] // Empty degree days data
    );
    
    // Check that the artifact was still created
    expect(artifact).toBeDefined();
    
    // Check that state data exists
    expect(artifact.states).toBeDefined();
    
    // Check that WA state data exists
    const waStateData = (artifact.states as any)['wa'];
    expect(waStateData).toBeDefined();
    
    // Check that degree days data exists but is empty
    expect(waStateData.series.annual.degreeDays).toBeDefined();
    expect(waStateData.series.annual.degreeDays.hdd).toEqual([]);
    expect(waStateData.series.annual.degreeDays.cdd).toEqual([]);
  });
});