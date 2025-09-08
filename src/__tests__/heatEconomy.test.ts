import { 
  selectSummerAnomaly, 
  selectSectorProxy, 
  alignYears, 
  calculateLinearRegression 
} from '@/lib/selectors/heatEconomy';
import { ClimateArtifact } from '@/types/climate';

describe('Heat Economy Selectors', () => {
  const mockArtifact: ClimateArtifact = {
    meta: {
      version: 1,
      updated: '2023-01-01',
      basePeriod: '1991 to 2020',
      units: {
        temp: '°C',
        precip: 'mm'
      }
    },
    cities: {
      'seattle': {
        series: {
          annual: {
            tempAnomalyJJA: [
              ['2000', 0.5],
              ['2001', 0.6],
              ['2002', 0.7]
            ],
            economy: {
              construction: [
                ['2000', 85],
                ['2001', 87],
                ['2002', 86]
              ]
            }
          }
        },
        metadata: {
          sources: ['Berkeley Earth']
        }
      }
    },
    states: {
      'wa': {
        series: {
          annual: {
            tempAnomalyJJA: [
              ['2000', 0.4],
              ['2001', 0.5],
              ['2002', 0.6]
            ],
            economy: {
              construction: [
                ['2000', 84],
                ['2001', 86],
                ['2002', 85]
              ]
            }
          }
        },
        metadata: {
          sources: ['Berkeley Earth']
        }
      }
    },
    national: {
      series: {
        annual: {}
      },
      metadata: {}
    }
  };

  describe('selectSummerAnomaly', () => {
    it('should return summer anomaly data for a city', () => {
      const result = selectSummerAnomaly(mockArtifact, { scope: 'city', id: 'seattle' });
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });

    it('should return summer anomaly data for a state', () => {
      const result = selectSummerAnomaly(mockArtifact, { scope: 'state', id: 'wa' });
      expect(result).toEqual([
        [2000, 0.4],
        [2001, 0.5],
        [2002, 0.6]
      ]);
    });

    it('should return empty array for invalid scope', () => {
      // @ts-ignore
      const result = selectSummerAnomaly(mockArtifact, { scope: 'invalid', id: 'seattle' });
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent city', () => {
      const result = selectSummerAnomaly(mockArtifact, { scope: 'city', id: 'nonexistent' });
      expect(result).toEqual([]);
    });
  });

  describe('selectSectorProxy', () => {
    it('should return sector proxy data for a city', () => {
      const result = selectSectorProxy(mockArtifact, { 
        metricKey: 'construction', 
        scope: 'city', 
        id: 'seattle' 
      });
      expect(result).toEqual([
        [2000, 85],
        [2001, 87],
        [2002, 86]
      ]);
    });

    it('should return sector proxy data for a state', () => {
      const result = selectSectorProxy(mockArtifact, { 
        metricKey: 'construction', 
        scope: 'state', 
        id: 'wa' 
      });
      expect(result).toEqual([
        [2000, 84],
        [2001, 86],
        [2002, 85]
      ]);
    });

    it('should return empty array for invalid metric key', () => {
      // @ts-ignore
      const result = selectSectorProxy(mockArtifact, { 
        metricKey: 'invalid', 
        scope: 'city', 
        id: 'seattle' 
      });
      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent state', () => {
      const result = selectSectorProxy(mockArtifact, { 
        metricKey: 'construction', 
        scope: 'state', 
        id: 'nonexistent' 
      });
      expect(result).toEqual([]);
    });
  });

  describe('alignYears', () => {
    it('should align two series by year', () => {
      const series1: [number, number | null][] = [
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ];
      
      const series2: [number, number | null][] = [
        [2000, 85],
        [2001, 87],
        [2002, 86]
      ];
      
      const result = alignYears(series1, series2);
      expect(result).toEqual([
        [2000, 0.5, 85],
        [2001, 0.6, 87],
        [2002, 0.7, 86]
      ]);
    });

    it('should filter out pairs with null values', () => {
      const series1: [number, number | null][] = [
        [2000, 0.5],
        [2001, null],
        [2002, 0.7]
      ];
      
      const series2: [number, number | null][] = [
        [2000, 85],
        [2001, 87],
        [2002, null]
      ];
      
      const result = alignYears(series1, series2);
      expect(result).toEqual([
        [2000, 0.5, 85]
      ]);
    });

    it('should handle mismatched years', () => {
      const series1: [number, number | null][] = [
        [2000, 0.5],
        [2001, 0.6],
        [2003, 0.8]
      ];
      
      const series2: [number, number | null][] = [
        [2000, 85],
        [2002, 87],
        [2003, 88]
      ];
      
      const result = alignYears(series1, series2);
      expect(result).toEqual([
        [2000, 0.5, 85],
        [2003, 0.8, 88]
      ]);
    });
  });

  describe('calculateLinearRegression', () => {
    it('should calculate slope and R² for a perfect positive correlation', () => {
      const points: [number, number][] = [
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 5]
      ];
      
      const result = calculateLinearRegression(points);
      expect(result.slope).toBeCloseTo(1, 2);
      expect(result.r2).toBeCloseTo(1, 2);
    });

    it('should calculate slope and R² for a perfect negative correlation', () => {
      const points: [number, number][] = [
        [1, 5],
        [2, 4],
        [3, 3],
        [4, 2],
        [5, 1]
      ];
      
      const result = calculateLinearRegression(points);
      expect(result.slope).toBeCloseTo(-1, 2);
      expect(result.r2).toBeCloseTo(1, 2);
    });

    it('should return zero slope and R² for insufficient data', () => {
      const points: [number, number][] = [[1, 1]];
      const result = calculateLinearRegression(points);
      expect(result.slope).toBe(0);
      expect(result.r2).toBe(0);
    });

    it('should handle no correlation case', () => {
      const points: [number, number][] = [
        [1, 1],
        [2, 3],
        [3, 1],
        [4, 3],
        [5, 1]
      ];
      
      const result = calculateLinearRegression(points);
      expect(result.r2).toBeCloseTo(0, 1);
    });
  });
});