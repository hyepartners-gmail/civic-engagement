import { 
  selectWarmNights, 
  selectWildfireAcres, 
  selectFemaHeatCounts, 
  alignYears,
  calculatePercentile,
  isHighPercentile
} from '@/lib/selectors/extremes';

// Mock climate artifact data
const mockArtifact: any = {
  cities: {
    'atlanta': {
      series: {
        annual: {
          extremes: {
            warmNights70F: [[2000, 45], [2001, 48], [2002, 52], [2003, 55], [2004, 60]]
          }
        }
      }
    }
  },
  states: {
    'ga': {
      series: {
        annual: {
          wildfire: {
            acresBurned: [[2000, 15000], [2001, 22000], [2002, 18500], [2003, 30000], [2004, 25000]]
          },
          disasters: {
            heat: [[2000, 2], [2001, 1], [2003, 3]]
          }
        }
      }
    }
  },
  national: {
    series: {
      annual: {
        wildfire: {
          acresBurned: [[2000, 1500000], [2001, 2200000], [2002, 1850000], [2003, 3000000], [2004, 2500000]]
        }
      }
    }
  }
};

describe('Extremes Selectors', () => {
  describe('selectWarmNights', () => {
    it('selects warm nights data for a city at 70°F threshold', () => {
      const result = selectWarmNights(mockArtifact, { cityId: 'atlanta', threshold: 70 });
      expect(result).toEqual([[2000, 45], [2001, 48], [2002, 52], [2003, 55], [2004, 60]]);
    });

    it('returns empty array for unknown city', () => {
      const result = selectWarmNights(mockArtifact, { cityId: 'unknown', threshold: 70 });
      expect(result).toEqual([]);
    });
  });

  describe('selectWildfireAcres', () => {
    it('selects national wildfire acres data', () => {
      const result = selectWildfireAcres(mockArtifact, { scope: 'national' });
      expect(result.series).toEqual([[2000, 1500000], [2001, 2200000], [2002, 1850000], [2003, 3000000], [2004, 2500000]]);
      expect(result.hasData).toBe(true);
    });

    it('selects state wildfire acres data', () => {
      const result = selectWildfireAcres(mockArtifact, { scope: 'state', id: 'ga' });
      expect(result.series).toEqual([[2000, 15000], [2001, 22000], [2002, 18500], [2003, 30000], [2004, 25000]]);
      expect(result.hasData).toBe(true);
    });

    it('returns empty array for unknown state', () => {
      const result = selectWildfireAcres(mockArtifact, { scope: 'state', id: 'unknown' });
      expect(result.series).toEqual([]);
      expect(result.hasData).toBe(false);
    });
  });

  describe('selectFemaHeatCounts', () => {
    it('selects FEMA heat event data for a state', () => {
      const result = selectFemaHeatCounts(mockArtifact, { stateId: 'ga' });
      expect(result).toEqual([[2000, 2], [2001, 1], [2003, 3]]);
    });

    it('returns empty array for unknown state', () => {
      const result = selectFemaHeatCounts(mockArtifact, { stateId: 'unknown' });
      expect(result).toEqual([]);
    });
  });

  describe('alignYears', () => {
    it('aligns multiple series by year with gaps retained', () => {
      const series1: [number, number | null][] = [[2000, 100], [2001, 110], [2003, 130]];
      const series2: [number, number | null][] = [[2000, 200], [2002, 220], [2003, 230]];
      const series3: [number, number | null][] = [[2001, 300], [2002, 320], [2004, 340]];
      
      const result = alignYears([series1, series2, series3]);
      expect(result).toEqual([
        [2000, 100, 200, null],
        [2001, 110, null, 300],
        [2002, null, 220, 320],
        [2003, 130, 230, null],
        [2004, null, null, 340]
      ]);
    });
  });

  describe('calculatePercentile', () => {
    it('calculates correct percentile for a value in a series', () => {
      const series: [number, number | null][] = [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50]];
      
      // 30 is at the 40th percentile (2 out of 5 values are less than 30)
      expect(calculatePercentile(series, 30)).toBe(40);
      
      // 10 is at the 0th percentile (0 out of 5 values are less than 10)
      expect(calculatePercentile(series, 10)).toBe(0);
      
      // 50 is at the 80th percentile (4 out of 5 values are less than 50)
      expect(calculatePercentile(series, 50)).toBe(80);
    });

    it('handles empty series', () => {
      const series: [number, number | null][] = [];
      expect(calculatePercentile(series, 30)).toBe(0);
    });
  });

  describe('isHighPercentile', () => {
    it('correctly identifies values in the 90th percentile or higher', () => {
      const series: [number, number | null][] = [[0, 10], [1, 20], [2, 30], [3, 40], [4, 50], [5, 60], [6, 70], [7, 80], [8, 90], [9, 100]];
      
      // 90 is at the 90th percentile
      expect(isHighPercentile(series, 90)).toBe(true);
      
      // 100 is at the 100th percentile
      expect(isHighPercentile(series, 100)).toBe(true);
      
      // 80 is at the 80th percentile
      expect(isHighPercentile(series, 80)).toBe(false);
    });

    it('handles null values', () => {
      const series: [number, number | null][] = [[0, 10], [1, 20], [2, 30]];
      expect(isHighPercentile(series, null)).toBe(false);
    });
  });
});