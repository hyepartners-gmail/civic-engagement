import { 
  selectFemaCosts, 
  selectInflationIndex, 
  selectEmissionsNational, 
  adjustForInflation 
} from '@/lib/selectors/costs';
import { ClimateArtifact } from '@/types/climate';

describe('Costs Selectors', () => {
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
    cities: {},
    national: {
      series: {
        annual: {
          femaCosts: {
            hurricane: [
              ['2000', 1000000],
              ['2001', 1200000],
              ['2002', 1100000]
            ],
            flood: [
              ['2000', 800000],
              ['2001', 900000],
              ['2002', 850000]
            ]
          },
          population: [
            ['2000', 282166282],
            ['2001', 284968955],
            ['2002', 287625193]
          ],
          emissions: {
            co2: [
              ['2000', 5500],
              ['2001', 5400],
              ['2002', 5300]
            ]
          }
        }
      },
      metadata: {
        sources: ['FEMA', 'EPA']
      }
    }
  };

  describe('selectFemaCosts', () => {
    it('should return FEMA costs data for specified types', () => {
      const result = selectFemaCosts(mockArtifact, { 
        scope: 'national', 
        types: ['hurricane', 'flood'] 
      });
      
      expect(result).toEqual({
        hurricane: [
          [2000, 1000000],
          [2001, 1200000],
          [2002, 1100000]
        ],
        flood: [
          [2000, 800000],
          [2001, 900000],
          [2002, 850000]
        ]
      });
    });

    it('should return empty object for non-national scope', () => {
      // @ts-ignore
      const result = selectFemaCosts(mockArtifact, { scope: 'state', types: ['hurricane'] });
      expect(result).toEqual({});
    });

    it('should return empty object when no national data is available', () => {
      const artifactWithoutNational = { ...mockArtifact, national: undefined };
      const result = selectFemaCosts(artifactWithoutNational, { 
        scope: 'national', 
        types: ['hurricane'] 
      });
      expect(result).toEqual({});
    });
  });

  describe('selectInflationIndex', () => {
    it('should return empty array as placeholder', () => {
      const result = selectInflationIndex();
      expect(result).toEqual([]);
    });
  });

  describe('selectEmissionsNational', () => {
    it('should return national emissions data', () => {
      const result = selectEmissionsNational(mockArtifact);
      expect(result).toEqual([
        [2000, 5500],
        [2001, 5400],
        [2002, 5300]
      ]);
    });

    it('should return per-capita emissions when perCapita is true', () => {
      const result = selectEmissionsNational(mockArtifact, { perCapita: true });
      // Calculations:
      // 2000: (5500 * 1e6) / 282166282 ≈ 19.49
      // 2001: (5400 * 1e6) / 284968955 ≈ 18.95
      // 2002: (5300 * 1e6) / 287625193 ≈ 18.43
      expect(result).toEqual([
        [2000, expect.closeTo(19.49, 0.01)],
        [2001, expect.closeTo(18.95, 0.01)],
        [2002, expect.closeTo(18.43, 0.01)]
      ]);
    });

    it('should return empty array when no national data is available', () => {
      const artifactWithoutNational = { ...mockArtifact, national: undefined };
      const result = selectEmissionsNational(artifactWithoutNational);
      expect(result).toEqual([]);
    });
  });

  describe('adjustForInflation', () => {
    it('should adjust series for inflation', () => {
      const series: [number, number | null][] = [
        [2000, 1000000],
        [2001, 1100000],
        [2002, 1200000]
      ];
      
      const cpi: [number, number | null][] = [
        [2000, 172.2],
        [2001, 177.1],
        [2002, 179.9],
        [2020, 250.0] // Base year
      ];
      
      const result = adjustForInflation(series, cpi, 2020);
      
      // Calculations:
      // 2000: 1000000 * (250.0 / 172.2) ≈ 1451846
      // 2001: 1100000 * (250.0 / 177.1) ≈ 1553360
      // 2002: 1200000 * (250.0 / 179.9) ≈ 1667593
      expect(result).toEqual([
        [2000, expect.closeTo(1451846, 1)],
        [2001, expect.closeTo(1553360, 1)],
        [2002, expect.closeTo(1667593, 1)]
      ]);
    });

    it('should handle missing CPI data gracefully', () => {
      const series: [number, number | null][] = [
        [2000, 1000000],
        [2001, 1100000]
      ];
      
      const cpi: [number, number | null][] = [
        [2000, 172.2],
        // Missing 2001 data
        [2020, 250.0]
      ];
      
      const result = adjustForInflation(series, cpi, 2020);
      expect(result).toEqual([
        [2000, expect.closeTo(1451846, 1)],
        [2001, null] // Should be null due to missing CPI data
      ]);
    });
  });
});