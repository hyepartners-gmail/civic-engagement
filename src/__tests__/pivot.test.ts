import { computePivot, reducers } from '@/lib/selectors/pivot';

describe('computePivot', () => {
  const mockSeries: [number, number | null][] = [
    [1900, 1.0],
    [1910, 1.5],
    [1920, 2.0],
    [1930, 2.5],
    [1940, 3.0],
    [1950, 3.5],
    [1960, 4.0],
    [1970, 4.5],
    [1980, 5.0],
    [1990, 5.5],
    [2000, 6.0],
    [2010, 6.5],
    [2020, 7.0],
  ];

  it('computes correct pivot values with mean reducer', () => {
    const result = computePivot(mockSeries, [1900, 1970], [1971, 2020], reducers.mean);
    
    // Before period (1900-1970): [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5] = mean of 2.75
    // After period (1971-2020): [5.0, 5.5, 6.0, 6.5, 7.0] = mean of 6.0
    expect(result.before).toBeCloseTo(2.75);
    expect(result.after).toBeCloseTo(6.0);
    expect(result.delta).toBeCloseTo(3.25);
    expect(result.pctChange).toBeCloseTo(1.1818, 4); // 3.25 / 2.75
  });

  it('computes correct pivot values with sum reducer', () => {
    const result = computePivot(mockSeries, [1900, 1970], [1971, 2020], reducers.sum);
    
    // Before period sum: 1.0+1.5+2.0+2.5+3.0+3.5+4.0+4.5 = 22.0
    // After period sum: 5.0+5.5+6.0+6.5+7.0 = 30.0
    expect(result.before).toBeCloseTo(22.0);
    expect(result.after).toBeCloseTo(30.0);
    expect(result.delta).toBeCloseTo(8.0);
    expect(result.pctChange).toBeCloseTo(0.3636, 4); // 8.0 / 22.0
  });

  it('computes correct pivot values with max reducer', () => {
    const result = computePivot(mockSeries, [1900, 1970], [1971, 2020], reducers.max);
    
    // Before period max: 4.5
    // After period max: 7.0
    expect(result.before).toBeCloseTo(4.5);
    expect(result.after).toBeCloseTo(7.0);
    expect(result.delta).toBeCloseTo(2.5);
    expect(result.pctChange).toBeCloseTo(0.5556, 4); // 2.5 / 4.5
  });

  it('computes correct pivot values with count_gte reducer', () => {
    const countReducer = reducers.count_gte(3.0);
    const result = computePivot(mockSeries, [1900, 1970], [1971, 2020], countReducer);
    
    // Before period values >= 3.0: [3.0, 3.5, 4.0, 4.5] = 4
    // After period values >= 3.0: [5.0, 5.5, 6.0, 6.5, 7.0] = 5
    expect(result.before).toBe(4);
    expect(result.after).toBe(5);
    expect(result.delta).toBe(1);
    expect(result.pctChange).toBeCloseTo(0.25, 4); // 1 / 4
  });

  it('handles null values correctly', () => {
    const seriesWithNulls: [number, number | null][] = [
      [1900, 1.0],
      [1910, null],
      [1920, 2.0],
      [1930, null],
      [1940, 3.0],
      [1980, null],
      [1990, 5.0],
      [2000, null],
      [2010, 6.0],
      [2020, 7.0],
    ];
    
    const result = computePivot(seriesWithNulls, [1900, 1970], [1971, 2020], reducers.mean);
    
    // Before period (non-null): [1.0, 2.0, 3.0] = mean of 2.0
    // After period (non-null): [5.0, 6.0, 7.0] = mean of 6.0
    expect(result.before).toBeCloseTo(2.0);
    expect(result.after).toBeCloseTo(6.0);
  });

  it('handles edge case with no data in before period', () => {
    const result = computePivot(mockSeries, [1800, 1850], [1971, 2020], reducers.mean);
    
    expect(result.before).toBeNull();
    expect(result.after).toBeCloseTo(6.0);
    expect(result.delta).toBeNull();
    expect(result.pctChange).toBeNull();
  });

  it('handles edge case with no data in after period', () => {
    const result = computePivot(mockSeries, [1900, 1970], [2100, 2200], reducers.mean);
    
    expect(result.before).toBeCloseTo(2.75);
    expect(result.after).toBeNull();
    expect(result.delta).toBeNull();
    expect(result.pctChange).toBeNull();
  });

  it('handles edge case with no data in both periods', () => {
    const result = computePivot(mockSeries, [1800, 1850], [2100, 2200], reducers.mean);
    
    expect(result.before).toBeNull();
    expect(result.after).toBeNull();
    expect(result.delta).toBeNull();
    expect(result.pctChange).toBeNull();
  });

  it('handles edge case with zero before value', () => {
    const seriesWithZero: [number, number | null][] = [
      [1900, 0],
      [1910, 0],
      [1980, 5.0],
      [1990, 5.0],
    ];
    
    const result = computePivot(seriesWithZero, [1900, 1970], [1971, 2020], reducers.mean);
    
    expect(result.before).toBeCloseTo(0);
    expect(result.after).toBeCloseTo(5.0);
    expect(result.delta).toBeCloseTo(5.0);
    expect(result.pctChange).toBeNull(); // Division by zero should return null
  });
});