import { selectMetricSeries } from '@/lib/selectors/pivot';

// Mock climate artifact data
const mockArtifact: any = {
  cities: {
    'seattle': {
      series: {
        annual: {
          tempAnomaly: [[2000, 1.5], [2001, 1.8], [2002, 2.1]],
          precipTotal: [[2000, 30.5], [2001, 32.1], [2002, 28.7]],
          extremes: {
            hotDays90F: [[2000, 15], [2001, 18], [2002, 22]],
            warmNights70F: [[2000, 8], [2001, 10], [2002, 12]],
            max5DayPrecip: [[2000, 5.2], [2001, 6.1], [2002, 4.8]],
            coldDays32F: [[2000, 45], [2001, 42], [2002, 38]],
            max1DayPrecip: [[2000, 2.1], [2001, 2.5], [2002, 1.9]],
          }
        }
      }
    }
  },
  states: {
    'wa': {
      series: {
        annual: {
          tempAnomaly: [[2000, 1.8], [2001, 2.1], [2002, 2.4]],
          precipTotal: [[2000, 32.1], [2001, 34.2], [2002, 30.8]],
          extremes: {
            hotDays90F: [[2000, 20], [2001, 25], [2002, 30]],
            warmNights70F: [[2000, 12], [2001, 15], [2002, 18]],
            max5DayPrecip: [[2000, 6.1], [2001, 7.2], [2002, 5.9]],
            coldDays32F: [[2000, 40], [2001, 38], [2002, 35]],
            max1DayPrecip: [[2000, 2.5], [2001, 2.9], [2002, 2.3]],
          },
          emissions: {
            co2: [[2000, 100], [2001, 98], [2002, 95]],
          },
          wildfire: {
            acresBurned: [[2000, 50000], [2001, 75000], [2002, 100000]],
          }
        }
      }
    }
  },
  national: {
    series: {
      annual: {
        tempAnomaly: [[2000, 1.2], [2001, 1.5], [2002, 1.8]],
        precipTotal: [[2000, 28.5], [2001, 30.1], [2002, 27.8]],
        extremes: {
          hotDays90F: [[2000, 30], [2001, 35], [2002, 40]],
          warmNights70F: [[2000, 15], [2001, 18], [2002, 21]],
          max5DayPrecip: [[2000, 7.2], [2001, 8.1], [2002, 6.8]],
          coldDays32F: [[2000, 35], [2001, 32], [2002, 30]],
          max1DayPrecip: [[2000, 3.1], [2001, 3.5], [2002, 2.9]],
        },
        disasters: {
          total: [[2000, 100], [2001, 120], [2002, 140]],
          hurricane: [[2000, 10], [2001, 15], [2002, 20]],
          wildfire: [[2000, 20], [2001, 25], [2002, 30]],
        },
        emissions: {
          co2: [[2000, 5000], [2001, 4900], [2002, 4800]],
        },
        wildfire: {
          acresBurned: [[2000, 1000000], [2001, 1500000], [2002, 2000000]],
        }
      }
    }
  }
};

describe('selectMetricSeries', () => {
  it('selects temperature anomaly for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'tempAnomaly', 'city', 'seattle');
    expect(result).toEqual([[2000, 1.5], [2001, 1.8], [2002, 2.1]]);
  });

  it('selects precipitation total for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'precipTotal', 'city', 'seattle');
    expect(result).toEqual([[2000, 30.5], [2001, 32.1], [2002, 28.7]]);
  });

  it('selects hot days for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'hotDays90F', 'city', 'seattle');
    expect(result).toEqual([[2000, 15], [2001, 18], [2002, 22]]);
  });

  it('selects warm nights for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'warmNights70F', 'city', 'seattle');
    expect(result).toEqual([[2000, 8], [2001, 10], [2002, 12]]);
  });

  it('selects max 5-day precipitation for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'max5DayPrecip', 'city', 'seattle');
    expect(result).toEqual([[2000, 5.2], [2001, 6.1], [2002, 4.8]]);
  });

  it('selects cold days for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'coldDays32F', 'city', 'seattle');
    expect(result).toEqual([[2000, 45], [2001, 42], [2002, 38]]);
  });

  it('selects max 1-day precipitation for city scope', () => {
    const result = selectMetricSeries(mockArtifact, 'max1DayPrecip', 'city', 'seattle');
    expect(result).toEqual([[2000, 2.1], [2001, 2.5], [2002, 1.9]]);
  });

  it('selects temperature anomaly for state scope', () => {
    const result = selectMetricSeries(mockArtifact, 'tempAnomaly', 'state', 'wa');
    expect(result).toEqual([[2000, 1.8], [2001, 2.1], [2002, 2.4]]);
  });

  it('selects CO2 emissions for state scope', () => {
    const result = selectMetricSeries(mockArtifact, 'emissions.co2e', 'state', 'wa');
    expect(result).toEqual([[2000, 100], [2001, 98], [2002, 95]]);
  });

  it('selects wildfire acres for state scope', () => {
    const result = selectMetricSeries(mockArtifact, 'wildfire.acresBurned', 'state', 'wa');
    expect(result).toEqual([[2000, 50000], [2001, 75000], [2002, 100000]]);
  });

  it('selects temperature anomaly for national scope', () => {
    const result = selectMetricSeries(mockArtifact, 'tempAnomaly', 'national', 'us');
    expect(result).toEqual([[2000, 1.2], [2001, 1.5], [2002, 1.8]]);
  });

  it('selects total disasters for national scope', () => {
    const result = selectMetricSeries(mockArtifact, 'disasters.total', 'national', 'us');
    expect(result).toEqual([[2000, 100], [2001, 120], [2002, 140]]);
  });

  it('selects CO2 emissions for national scope', () => {
    const result = selectMetricSeries(mockArtifact, 'emissions.co2e', 'national', 'us');
    expect(result).toEqual([[2000, 5000], [2001, 4900], [2002, 4800]]);
  });

  it('selects wildfire acres for national scope', () => {
    const result = selectMetricSeries(mockArtifact, 'wildfire.acresBurned', 'national', 'us');
    expect(result).toEqual([[2000, 1000000], [2001, 1500000], [2002, 2000000]]);
  });

  it('returns empty array for unknown metric', () => {
    const result = selectMetricSeries(mockArtifact, 'unknownMetric', 'city', 'seattle');
    expect(result).toEqual([]);
  });

  it('returns empty array for unknown city', () => {
    const result = selectMetricSeries(mockArtifact, 'tempAnomaly', 'city', 'unknown');
    expect(result).toEqual([]);
  });

  it('returns empty array for unknown state', () => {
    const result = selectMetricSeries(mockArtifact, 'tempAnomaly', 'state', 'unknown');
    expect(result).toEqual([]);
  });
});