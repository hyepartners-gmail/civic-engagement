import { SAFE_TOLERANCE, HOT_THRESHOLD } from './constants';

// Calculates the range of scores.
export function scoreDispersion(values: number[]): number {
  if (values.length < 2) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return max - min;
}

// Checks if the dispersion is within the "safe" tolerance.
export function isSafe(values: number[]): boolean {
  return scoreDispersion(values) <= SAFE_TOLERANCE;
}

// Checks if the dispersion is above the "hot" threshold.
export function isHot(values: number[]): boolean {
  return scoreDispersion(values) >= HOT_THRESHOLD;
}

// Classifies a topic as 'safe' or 'hot'.
export function classifyTopic(values: number[]): 'safe' | 'hot' {
  return isSafe(values) ? 'safe' : 'hot';
}