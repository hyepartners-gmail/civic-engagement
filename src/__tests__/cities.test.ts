import { 
  selectCityAnomaly, 
  selectCityHotDays, 
  computeSyncedDomains 
} from '@/lib/selectors/cities';
import { ClimateArtifact } from '@/types/climate';

describe('City Selectors', () => {
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
            tempAnomaly: [
              ['2000', 0.5],
              ['2001', 0.6],
              ['2002', 0.7]
            ],
            extremes: {
              hotDays90F: [
                ['2000', 5],
                ['2001', 7],
                ['2002', 6]
              ],
              hotDays95F: [
                ['2000', 2],
                ['2001', 3],
                ['2002', 2]
              ],
              hotDays100F: [
                ['2000', 0],
                ['2001', 1],
                ['2002', 0]
              ]
            }
          }
        },
        metadata: {
          sources: ['Berkeley Earth']
        }
      },
      'los-angeles': {
        series: {
          annual: {
            tempAnomaly: [
              ['2000', 1.2],
              ['2001', 1.3],
              ['2002', 1.4]
            ],
            extremes: {
              hotDays90F: [
                ['2000', 25],
                ['2001', 30],
                ['2002', 28]
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

  describe('selectCityAnomaly', () => {
    it('should return temperature anomaly data for a valid city', () => {
      const result = selectCityAnomaly(mockArtifact, { cityId: 'seattle' });
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });

    it('should return empty array for a city that does not exist', () => {
      const result = selectCityAnomaly(mockArtifact, { cityId: 'nonexistent' });
      expect(result).toEqual([]);
    });

    it('should return empty array when no temperature anomaly data is available', () => {
      const artifactWithoutData = { ...mockArtifact };
      // @ts-ignore
      artifactWithoutData.cities.seattle.series.annual.tempAnomaly = [];
      const result = selectCityAnomaly(artifactWithoutData, { cityId: 'seattle' });
      expect(result).toEqual([]);
    });
  });

  describe('selectCityHotDays', () => {
    it('should return hot days data for 90°F threshold', () => {
      const result = selectCityHotDays(mockArtifact, { cityId: 'seattle', threshold: 90 });
      expect(result).toEqual([
        [2000, 5],
        [2001, 7],
        [2002, 6]
      ]);
    });

    it('should return hot days data for 95°F threshold', () => {
      const result = selectCityHotDays(mockArtifact, { cityId: 'seattle', threshold: 95 });
      expect(result).toEqual([
        [2000, 2],
        [2001, 3],
        [2002, 2]
      ]);
    });

    it('should return hot days data for 100°F threshold', () => {
      const result = selectCityHotDays(mockArtifact, { cityId: 'seattle', threshold: 100 });
      expect(result).toEqual([
        [2000, 0],
        [2001, 1],
        [2002, 0]
      ]);
    });

    it('should return empty array for unsupported threshold', () => {
      // @ts-ignore
      const result = selectCityHotDays(mockArtifact, { cityId: 'seattle', threshold: 85 });
      expect(result).toEqual([]);
    });

    it('should return empty array for a city that does not exist', () => {
      const result = selectCityHotDays(mockArtifact, { cityId: 'nonexistent', threshold: 90 });
      expect(result).toEqual([]);
    });
  });

  describe('computeSyncedDomains', () => {
    it('should compute synced domains for multiple series', () => {
      const seriesByCity = {
        seattle: [
          [2000, 0.5],
          [2001, 0.6],
          [2002, 0.7]
        ],
        'los-angeles': [
          [2000, 1.2],
          [2001, 1.3],
          [2002, 1.4]
        ]
      };
      
      const result = computeSyncedDomains(seriesByCity);
      // Min: 0.5, Max: 1.4, Range: 0.9, Padding: 0.09
      // Expected: [0.41, 1.49]
      expect(result[0]).toBeCloseTo(0.41, 2);
      expect(result[1]).toBeCloseTo(1.49, 2);
    });

    it('should handle edge case where all values are the same', () => {
      const seriesByCity = {
        seattle: [
          [2000, 1.0],
          [2001, 1.0],
          [2002, 1.0]
        ]
      };
      
      const result = computeSyncedDomains(seriesByCity);
      expect(result).toEqual([0, 2]);
    });
  });
});