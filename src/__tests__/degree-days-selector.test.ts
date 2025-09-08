import { selectDegreeDays } from '@/lib/selectors/degreeDays';

// Mock climate artifact for testing
const mockArtifact: any = {
  cities: {
    seattle: {
      series: {
        annual: {
          tempAnomaly: [[2020, 55], [2021, 60]]
        }
      }
    }
  },
  states: {
    wa: {
      series: {
        annual: {
          degreeDays: {
            hdd: [[2020, 5000], [2021, 4800]],
            cdd: [[2020, 1200], [2021, 1300]]
          }
        }
      }
    }
  }
};

describe('Degree Days Selector', () => {
  it('should select state-level degree days data correctly', () => {
    const result = selectDegreeDays(mockArtifact, {
      scope: 'state',
      id: 'wa',
      cadence: 'annual'
    });

    expect(result).toBeDefined();
    expect(result.hdd).toEqual([[2020, 5000], [2021, 4800]]);
    expect(result.cdd).toEqual([[2020, 1200], [2021, 1300]]);
  });

  it('should handle missing state data gracefully', () => {
    const result = selectDegreeDays(mockArtifact, {
      scope: 'state',
      id: 'ca', // California data doesn't exist in our mock
      cadence: 'annual'
    });

    expect(result).toBeDefined();
    expect(result.hdd).toEqual([]);
    expect(result.cdd).toEqual([]);
  });

  it('should select city-level degree days data correctly', () => {
    const result = selectDegreeDays(mockArtifact, {
      scope: 'city',
      id: 'seattle',
      cadence: 'annual'
    });

    expect(result).toBeDefined();
    // City-level data uses calculated values based on temperature
    expect(result.hdd.length).toBe(2);
    expect(result.cdd.length).toBe(2);
  });
});