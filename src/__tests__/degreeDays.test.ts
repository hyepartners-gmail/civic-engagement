import { selectDegreeDays } from '@/lib/selectors/degreeDays';
import { selectStateCO2 } from '@/lib/selectors/emissions';
import { mergeByYear } from '@/utils/array';
import { calculateRollingAverage } from '@/lib/time/rolling';

// Mock climate artifact data
const mockArtifact: any = {
  cities: {
    'houston': {
      series: {
        annual: {
          tempAnomaly: [[2000, 65], [2001, 66], [2002, 67]] // Temperature data for city-level calculations
        }
      }
    }
  },
  states: {
    'tx': {
      series: {
        annual: {
          degreeDays: {
            hdd: [[2000, 5000], [2001, 4800], [2002, 4600]],
            cdd: [[2000, 1200], [2001, 1300], [2002, 1400]]
          },
          emissions: {
            co2: [[2000, 500], [2001, 520], [2002, 540]]
          },
          population: [[2000, 20000000], [2001, 20500000], [2002, 21000000]]
        }
      }
    }
  }
};

describe('Degree Days and CO2 Functions', () => {
  describe('selectDegreeDays', () => {
    it('selects degree days for city scope', () => {
      const result = selectDegreeDays(mockArtifact, { scope: 'city', id: 'houston', cadence: 'annual' });
      // For city scope, we calculate HDD and CDD from temperature data
      // HDD = max(0, 65 - temp), CDD = max(0, temp - 65)
      // For 65°F: HDD = 0, CDD = 0
      // For 66°F: HDD = 0, CDD = 1
      // For 67°F: HDD = 0, CDD = 2
      expect(result.hdd).toEqual([[2000, 0], [2001, 0], [2002, 0]]);
      expect(result.cdd).toEqual([[2000, 0], [2001, 1], [2002, 2]]);
    });

    it('selects degree days for state scope', () => {
      const result = selectDegreeDays(mockArtifact, { scope: 'state', id: 'tx', cadence: 'annual' });
      expect(result.hdd).toEqual([[2000, 5000], [2001, 4800], [2002, 4600]]);
      expect(result.cdd).toEqual([[2000, 1200], [2001, 1300], [2002, 1400]]);
    });

    it('returns empty arrays for unknown city', () => {
      const result = selectDegreeDays(mockArtifact, { scope: 'city', id: 'unknown', cadence: 'annual' });
      expect(result.hdd).toEqual([]);
      expect(result.cdd).toEqual([]);
    });

    it('returns empty arrays for unknown state', () => {
      const result = selectDegreeDays(mockArtifact, { scope: 'state', id: 'unknown', cadence: 'annual' });
      expect(result.hdd).toEqual([]);
      expect(result.cdd).toEqual([]);
    });
  });

  describe('selectStateCO2', () => {
    it('selects CO2 data for state', () => {
      const result = selectStateCO2(mockArtifact, { stateId: 'tx', perCapita: false, smoothing: false });
      expect(result).toEqual([[2000, 500], [2001, 520], [2002, 540]]);
    });

    it('calculates per-capita CO2 when requested', () => {
      const result = selectStateCO2(mockArtifact, { stateId: 'tx', perCapita: true, smoothing: false });
      // (500 * 1e6) / 20000000 = 25 tons per capita
      // (520 * 1e6) / 20500000 ≈ 25.37 tons per capita
      // (540 * 1e6) / 21000000 ≈ 25.71 tons per capita
      expect(result[0][1]).toBeCloseTo(25, 1);
      expect(result[1][1]).toBeCloseTo(25.37, 1);
      expect(result[2][1]).toBeCloseTo(25.71, 1);
    });

    it('applies rolling average when smoothing is enabled', () => {
      const result = selectStateCO2(mockArtifact, { stateId: 'tx', perCapita: false, smoothing: true, rollingWindow: 3 });
      // With a window of 3:
      // First value: average of [500] = 500
      // Second value: average of [500, 520] = 510
      // Third value: average of [500, 520, 540] = 520
      expect(result[0][1]).toBeCloseTo(500, 1);
      expect(result[1][1]).toBeCloseTo(510, 1);
      expect(result[2][1]).toBeCloseTo(520, 1);
    });
  });

  describe('mergeByYear', () => {
    it('merges two series by year with null-safe joining', () => {
      const series1: [number, number | null][] = [[2000, 100], [2001, 110], [2003, 130]];
      const series2: [number, number | null][] = [[2000, 200], [2002, 220], [2003, 230]];
      
      const result = mergeByYear(series1, series2);
      expect(result).toEqual([
        [2000, 100, 200],
        [2001, 110, null],
        [2002, null, 220],
        [2003, 130, 230]
      ]);
    });

    it('handles empty series', () => {
      const series1: [number, number | null][] = [];
      const series2: [number, number | null][] = [[2000, 200]];
      
      const result = mergeByYear(series1, series2);
      expect(result).toEqual([[2000, null, 200]]);
    });
  });

  describe('calculateRollingAverage', () => {
    it('calculates correct rolling average', () => {
      const series: [number, number | null][] = [
        [2000, 100], 
        [2001, 200], 
        [2002, 300], 
        [2003, 400], 
        [2004, 500]
      ];
      
      const result = calculateRollingAverage(series, 3);
      // Window size 3:
      // 2000: avg of [100] = 100
      // 2001: avg of [100, 200] = 150
      // 2002: avg of [100, 200, 300] = 200
      // 2003: avg of [200, 300, 400] = 300
      // 2004: avg of [300, 400, 500] = 400
      expect(result).toEqual([
        [2000, 100],
        [2001, 150],
        [2002, 200],
        [2003, 300],
        [2004, 400]
      ]);
    });

    it('handles null values in series', () => {
      const series: [number, number | null][] = [
        [2000, 100], 
        [2001, null], 
        [2002, 300]
      ];
      
      const result = calculateRollingAverage(series, 3);
      // Window size 3:
      // 2000: avg of [100] = 100
      // 2001: avg of [100, null] = 100 (nulls filtered out)
      // 2002: avg of [100, 300] = 200 (nulls filtered out)
      expect(result).toEqual([
        [2000, 100],
        [2001, 100],
        [2002, 200]
      ]);
    });
  });
});