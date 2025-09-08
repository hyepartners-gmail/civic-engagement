import { 
  selectTempAnomaly, 
  selectCityTempAnomaly, 
  selectNationalTempAnomaly, 
  selectGlobalTempAnomaly,
  selectAllCitiesTempAnomaly
} from '@/lib/selectors/temps';
import { ClimateArtifact } from '@/types/climate';

describe('Temperature Anomaly Selectors', () => {
  // Mock climate artifact data
  const mockArtifact: ClimateArtifact = {
    meta: {
      version: 1,
      updated: '2023-01-01',
      basePeriod: '1991-2020',
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
            precipTotal: []
          },
          fiscal: {
            tempAnomaly: [
              ['2000', 0.4],
              ['2001', 0.5],
              ['2002', 0.6]
            ]
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
              ['2000', 1.0],
              ['2001', 1.1],
              ['2002', 1.2]
            ]
          }
        },
        metadata: {
          sources: ['Berkeley Earth']
        }
      }
    },
    national: {
      series: {
        annual: {
          tempAnomaly: [
            ['2000', 0.8],
            ['2001', 0.9],
            ['2002', 1.0]
          ]
        },
        fiscal: {
          tempAnomaly: [
            ['2000', 0.7],
            ['2001', 0.8],
            ['2002', 0.9]
          ]
        }
      },
      metadata: {
        sources: ['NOAA']
      }
    }
  };

  describe('selectTempAnomaly', () => {
    it('should return city temperature anomaly data for annual cadence', () => {
      const result = selectTempAnomaly(mockArtifact, {
        scope: 'city',
        cityId: 'seattle',
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });
    
    it('should return city temperature anomaly data for fiscal cadence', () => {
      const result = selectTempAnomaly(mockArtifact, {
        scope: 'city',
        cityId: 'seattle',
        cadence: 'fiscal'
      });
      
      expect(result).toEqual([
        [2000, 0.4],
        [2001, 0.5],
        [2002, 0.6]
      ]);
    });
    
    it('should return national temperature anomaly data', () => {
      const result = selectTempAnomaly(mockArtifact, {
        scope: 'national',
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.8],
        [2001, 0.9],
        [2002, 1.0]
      ]);
    });
    
    it('should return global temperature anomaly data (same as national for now)', () => {
      const result = selectTempAnomaly(mockArtifact, {
        scope: 'global',
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.8],
        [2001, 0.9],
        [2002, 1.0]
      ]);
    });
    
    it('should return empty array when data is not available', () => {
      const result = selectTempAnomaly(mockArtifact, {
        scope: 'city',
        cityId: 'nonexistent',
        cadence: 'annual'
      });
      
      expect(result).toEqual([]);
    });
  });

  describe('selectCityTempAnomaly', () => {
    it('should return city temperature anomaly data', () => {
      const result = selectCityTempAnomaly(mockArtifact, {
        cityId: 'seattle',
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.5],
        [2001, 0.6],
        [2002, 0.7]
      ]);
    });
  });

  describe('selectNationalTempAnomaly', () => {
    it('should return national temperature anomaly data', () => {
      const result = selectNationalTempAnomaly(mockArtifact, {
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.8],
        [2001, 0.9],
        [2002, 1.0]
      ]);
    });
  });

  describe('selectGlobalTempAnomaly', () => {
    it('should return global temperature anomaly data', () => {
      const result = selectGlobalTempAnomaly(mockArtifact, {
        cadence: 'annual'
      });
      
      expect(result).toEqual([
        [2000, 0.8],
        [2001, 0.9],
        [2002, 1.0]
      ]);
    });
  });

  describe('selectAllCitiesTempAnomaly', () => {
    it('should return temperature anomaly data for all cities', () => {
      const result = selectAllCitiesTempAnomaly(mockArtifact, {
        cadence: 'annual'
      });
      
      expect(result).toEqual({
        'seattle': [
          [2000, 0.5],
          [2001, 0.6],
          [2002, 0.7]
        ],
        'los-angeles': [
          [2000, 1.0],
          [2001, 1.1],
          [2002, 1.2]
        ]
      });
    });
  });
});