import { 
  selectNationalCO2, 
  selectTempAnomaly, 
  selectMilestones 
} from '@/lib/selectors/emissions';
import { ClimateArtifact } from '@/types/climate';

describe('Emissions Selectors', () => {
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
          emissions: {
            co2: [
              [2000, 5500],
              [2001, 5400],
              [2002, 5300]
            ]
          },
          population: [
            [2000, 282166282],
            [2001, 284968955],
            [2002, 287625193]
          ],
          tempAnomaly: [
            [2000, 0.5],
            [2001, 0.6],
            [2002, 0.7]
          ]
        }
      },
      metadata: {
        sources: ['EPA', 'NASA']
      }
    }
  };

  describe('selectNationalCO2', () => {
    it('should return total CO2 emissions when perCapita is false', () => {
      const result = selectNationalCO2(mockArtifact, { perCapita: false, smoothing: false });
      expect(result).toEqual([
        [2000, 5500],
        [2001, 5400],
        [2002, 5300]
      ]);
    });

    it('should return per-capita CO2 emissions when perCapita is true', () => {
      const result = selectNationalCO2(mockArtifact, { perCapita: true, smoothing: false });
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
      const result = selectNationalCO2(artifactWithoutNational, { perCapita: false, smoothing: false });
      expect(result).toEqual([]);
    });
  });

  describe('selectTempAnomaly', () => {
    it('should return temperature anomaly data for global source', () => {
      const result = selectTempAnomaly(mockArtifact, { source: 'global', smoothing: false });
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });

    it('should return temperature anomaly data for US national source', () => {
      const result = selectTempAnomaly(mockArtifact, { source: 'us', smoothing: false });
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });
  });

  describe('selectMilestones', () => {
    it('should return the correct milestone data', () => {
      const result = selectMilestones();
      expect(result).toEqual([
        { year: 1970, event: "Clean Air Act", category: "policy" },
        { year: 2008, event: "Great Recession", category: "economic" },
        { year: 2020, event: "COVID-19 Pandemic", category: "health" }
      ]);
    });
  });
});