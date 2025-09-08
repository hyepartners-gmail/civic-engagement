/**
 * Utility functions for scaling data for visualization.
 */

type Series = [number, number | null][];

/**
 * Calculates safe scaling parameters for dual-axis charts.
 * @param leftSeries The data series for the left axis.
 * @param rightSeries The data series for the right axis.
 * @returns An object containing scaling parameters for both axes.
 */
export function scaleSafeDualAxes(leftSeries: Series, rightSeries: Series) {
  // Filter out null values
  const leftData = leftSeries.filter(([, value]) => value !== null).map(([, value]) => value as number);
  const rightData = rightSeries.filter(([, value]) => value !== null).map(([, value]) => value as number);

  // Return early if no data
  if (leftData.length === 0 && rightData.length === 0) {
    return {
      left: { min: 0, max: 1, domain: [0, 1] },
      right: { min: 0, max: 1, domain: [0, 1] }
    };
  }

  // Calculate min/max for each axis
  const leftMin = leftData.length > 0 ? Math.min(...leftData) : 0;
  const leftMax = leftData.length > 0 ? Math.max(...leftData) : 1;
  const rightMin = rightData.length > 0 ? Math.min(...rightData) : 0;
  const rightMax = rightData.length > 0 ? Math.max(...rightData) : 1;

  // Add padding to avoid clipping
  const leftPadding = (leftMax - leftMin) * 0.1;
  const rightPadding = (rightMax - rightMin) * 0.1;

  // Calculate domains with padding
  const leftDomain = [
    leftMin - leftPadding,
    leftMax + leftPadding
  ];
  
  const rightDomain = [
    rightMin - rightPadding,
    rightMax + rightPadding
  ];

  return {
    left: {
      min: leftMin,
      max: leftMax,
      domain: leftDomain
    },
    right: {
      min: rightMin,
      max: rightMax,
      domain: rightDomain
    }
  };
}

/**
 * Normalizes a value to a 0-100 scale based on a given domain.
 * @param value The value to normalize.
 * @param domain The domain [min, max] to normalize against.
 * @returns The normalized value between 0 and 100.
 */
export function normalizeToScale(value: number, domain: [number, number]): number {
  const [min, max] = domain;
  if (min === max) return 50; // Return middle value if no range
  return ((value - min) / (max - min)) * 100;
}