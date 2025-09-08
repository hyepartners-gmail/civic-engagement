/**
 * Codec for encoding and decoding city sets in URL parameters
 */

const DEFAULT_CITIES = ['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york'];

/**
 * Encode an array of city IDs into a URL parameter string
 * @param cities Array of city IDs
 * @returns Comma-separated string of city IDs
 */
export function encodeCitySet(cities: string[]): string {
  return cities.join(',');
}

/**
 * Decode a URL parameter string into an array of city IDs
 * @param encoded String of comma-separated city IDs
 * @returns Array of city IDs
 */
export function decodeCitySet(encoded: string | null): string[] {
  if (!encoded) return DEFAULT_CITIES;
  
  try {
    const cities = encoded.split(',').filter(Boolean);
    return cities.length > 0 ? cities : DEFAULT_CITIES;
  } catch (error) {
    console.warn('Failed to decode city set, using defaults:', error);
    return DEFAULT_CITIES;
  }
}