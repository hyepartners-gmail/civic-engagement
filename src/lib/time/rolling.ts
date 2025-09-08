// Utilities for calculating rolling averages and sums.
type Series = [number, number | null][];

export function calculateRollingAverage(series: Series, windowSize: number): Series {
  if (windowSize <= 1) {
    return series;
  }

  const result: Series = [];
  for (let i = 0; i < series.length; i++) {
    const window = series.slice(Math.max(0, i - windowSize + 1), i + 1);
    const values = window.map(([, val]) => val).filter((v): v is number => v !== null);
    
    if (values.length > 0) {
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      result.push([series[i][0], avg]);
    } else {
      result.push([series[i][0], null]);
    }
  }
  return result;
}