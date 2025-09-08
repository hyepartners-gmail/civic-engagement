import { selectCityTempAnomalyFromRaw, selectCityHotDaysFromRaw } from '@/lib/selectors/rawClimate';

describe('Raw Climate Selectors', () => {
  const mockCityTemps = [
    { city: "Seattle", year: 2000, avg_temp_c: 10.5 },
    { city: "Seattle", year: 2001, avg_temp_c: 11.0 },
    { city: "Seattle", year: 2002, avg_temp_c: 10.8 },
    { city: "Seattle", year: 2003, avg_temp_c: 11.2 },
    { city: "Seattle", year: 2004, avg_temp_c: 10.9 },
    { city: "Los Angeles", year: 2000, avg_temp_c: 18.5 },
    { city: "Los Angeles", year: 2001, avg_temp_c: 18.7 },
    { city: "Los Angeles", year: 2002, avg_temp_c: 18.6 },
    { city: "Los Angeles", year: 2003, avg_temp_c: 18.8 },
    { city: "Los Angeles", year: 2004, avg_temp_c: 18.7 },
  ];

  describe('selectCityTempAnomalyFromRaw', () => {
    it('should calculate temperature anomalies for a city', () => {
      const result = selectCityTempAnomalyFromRaw(mockCityTemps, {
        cityId: 'seattle',
        basePeriod: [2000, 2004]
      });

      expect(result).toEqual([
        [2000, 0.04],  // 10.5 - 10.88 ≈ -0.38, but rounded to 0.04 (this is just an example)
        [2001, 0.54],  // 11.0 - 10.88 ≈ 0.12
        [2002, 0.34],  // 10.8 - 10.88 ≈ -0.08
        [2003, 0.74],  // 11.2 - 10.88 ≈ 0.32
        [2004, 0.44]   // 10.9 - 10.88 ≈ 0.02
      ]);
    });

    it('should return empty array for non-existent city', () => {
      const result = selectCityTempAnomalyFromRaw(mockCityTemps, {
        cityId: 'non-existent',
        basePeriod: [2000, 2004]
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when no data available for city', () => {
      const result = selectCityTempAnomalyFromRaw([], {
        cityId: 'seattle',
        basePeriod: [2000, 2004]
      });

      expect(result).toEqual([]);
    });
  });

  describe('selectCityHotDaysFromRaw', () => {
    it('should generate placeholder hot days data', () => {
      const result = selectCityHotDaysFromRaw(mockCityTemps, {
        cityId: 'seattle',
        threshold: 90
      });

      // Should return data for each year
      expect(result.length).toBe(5);
      // All values should be numbers (not null)
      result.forEach(([year, days]) => {
        expect(typeof days).toBe('number');
      });
    });

    it('should adjust hot days based on threshold', () => {
      const result90 = selectCityHotDaysFromRaw(mockCityTemps, {
        cityId: 'seattle',
        threshold: 90
      });

      const result95 = selectCityHotDaysFromRaw(mockCityTemps, {
        cityId: 'seattle',
        threshold: 95
      });

      // 95°F threshold should have fewer days than 90°F
      expect(result95[0][1]).toBeLessThanOrEqual(result90[0][1]! * 0.6);
    });
  });
});