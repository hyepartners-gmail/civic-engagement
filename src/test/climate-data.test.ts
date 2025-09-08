import { createClimateArtifact } from "../hooks/useRawClimateArtifact";

// Mock data for testing
const mockCityTemps = [
  { city: "Seattle", year: 2000, avg_temp_c: 10.5 },
  { city: "Seattle", year: 2001, avg_temp_c: 11.2 },
  { city: "Chicago", year: 2000, avg_temp_c: 9.8 },
  { city: "Chicago", year: 2001, avg_temp_c: 10.1 },
];

const mockCityPrecip = [
  { city: "Seattle", year: 2000, precip_mm: 900.5 },
  { city: "Seattle", year: 2001, precip_mm: 850.2 },
  { city: "Chicago", year: 2000, precip_mm: 750.3 },
  { city: "Chicago", year: 2001, precip_mm: 780.1 },
];

const mockDisasters = [
  { year: 2000, disasters: 15 },
  { year: 2001, disasters: 18 },
];

const mockWildfires = [
  { year: 2000, acres_burned: 500000, fires: 12000 },
  { year: 2001, acres_burned: 750000, fires: 15000 },
];

describe("createClimateArtifact", () => {
  it("should create a valid climate artifact from raw data", () => {
    const artifact = createClimateArtifact(mockCityTemps, mockCityPrecip, mockDisasters, mockWildfires, [], []);
    
    // Check that the artifact has the correct structure
    expect(artifact).toHaveProperty("meta");
    expect(artifact).toHaveProperty("cities");
    expect(artifact).toHaveProperty("national");
    expect(artifact).toHaveProperty("states");
    expect(artifact).toHaveProperty("global");
    
    // Check meta data
    expect(artifact.meta.version).toBe(1);
    expect(artifact.meta.basePeriod).toBe("1991-2020");
    expect(artifact.meta.units.temp).toBe("°F");
    
    // Check that cities are correctly processed
    expect(Object.keys(artifact.cities)).toContain("seattle");
    expect(Object.keys(artifact.cities)).toContain("chicago");
    
    // Check that temperature data is converted to Fahrenheit
    const seattleData = artifact.cities.seattle.series.annual.tempAnomaly;
    expect(seattleData[0][1]).toBeCloseTo(50.9, 1); // 10.5°C should be about 50.9°F
    
    // Check that precipitation data is converted to inches
    const seattlePrecip = artifact.cities.seattle.series.annual.precipTotal;
    expect(seattlePrecip[0][1]).toBeCloseTo(35.45, 1); // 900.5mm should be about 35.45 inches
    
    // Check national data
    expect(artifact.national.series.annual.tempAnomaly.length).toBeGreaterThan(0);
    expect(artifact.national.series.annual.disasters.total.length).toBe(2);
    expect(artifact.national.series.annual.wildfire.acresBurned.length).toBe(2);
    expect(artifact.national.series.annual.wildfire.fires.length).toBe(2);
  });
});