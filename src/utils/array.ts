// Utility functions for array manipulation.

type Series = [number, number | null][];
type MergedSeries = [number, ...(number | null)[]][];

/**
 * Merges multiple time series arrays based on the year (the first element of each tuple).
 * @param seriesArray An array of series to merge.
 * @returns A new array where each entry is [year, value1, value2, ...].
 */
export function mergeYearSeries(...seriesArray: Series[]): MergedSeries {
  const map = new Map<number, (number | null)[]>();

  seriesArray.forEach((series, seriesIndex) => {
    series.forEach(([year, value]) => {
      if (!map.has(year)) {
        map.set(year, Array(seriesArray.length).fill(null));
      }
      map.get(year)![seriesIndex] = value;
    });
  });

  return Array.from(map.entries())
    .map(([year, values]): [number, ...(number | null)[]] => [year, ...values])
    .sort((a, b) => a[0] - b[0]);
}

/**
 * Merges two time series arrays based on the year with null-safe joining.
 * @param leftSeries The left series to merge.
 * @param rightSeries The right series to merge.
 * @returns A new array where each entry is [year, leftValue, rightValue].
 */
export function mergeByYear(...series: Series[]): MergedSeries {
  console.log('Merging series:', series);
  
  // Get all unique years across all series
  const allYears = Array.from(
    new Set(series.flat().map(([year]) => year))
  ).sort((a, b) => Number(a) - Number(b));
  
  console.log('All years:', allYears);
  
  // For each year, get the corresponding value from each series
  return allYears.map(year => {
    const values = series.map(s => {
      const entry = s.find(([y]) => Number(y) === Number(year));
      return entry ? entry[1] : null;
    });
    
    return [Number(year), ...values];
  });
}

/**
 * Checks if a series has a minimum percentage of non-null data points.
 * @param series The series to check.
 * @param requiredCoverage The required coverage percentage (0 to 1).
 * @returns True if the series meets the coverage requirement.
 */
export function safeCoverage(series: Series, requiredCoverage: number = 0.8): boolean {
  if (!series || series.length === 0) return false;
  
  // Filter out any entries with NaN, null, or undefined values
  const validEntries = series.filter(([year, value]) => 
    year !== null && 
    year !== undefined && 
    !isNaN(year) && 
    value !== null && 
    value !== undefined && 
    !isNaN(value as any)
  );
  
  // If there are no valid entries at all, return false
  if (validEntries.length === 0) return false;
  
  // Calculate coverage based on valid entries vs. expected entries
  const coverage = validEntries.length / series.length;
  
  return coverage >= requiredCoverage;
}