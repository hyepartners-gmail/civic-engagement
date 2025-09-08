import { encodeCitySet, decodeCitySet } from '@/lib/codecs/CitySetCodec';

describe('CitySetCodec', () => {
  describe('encodeCitySet', () => {
    it('should encode an array of city IDs into a comma-separated string', () => {
      const cities = ['seattle', 'los-angeles', 'chicago'];
      const result = encodeCitySet(cities);
      expect(result).toBe('seattle,los-angeles,chicago');
    });

    it('should handle empty array', () => {
      const cities: string[] = [];
      const result = encodeCitySet(cities);
      expect(result).toBe('');
    });
  });

  describe('decodeCitySet', () => {
    it('should decode a comma-separated string into an array of city IDs', () => {
      const encoded = 'seattle,los-angeles,chicago';
      const result = decodeCitySet(encoded);
      expect(result).toEqual(['seattle', 'los-angeles', 'chicago']);
    });

    it('should return default cities when input is null', () => {
      const result = decodeCitySet(null);
      expect(result).toEqual(['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york']);
    });

    it('should return default cities when input is empty string', () => {
      const result = decodeCitySet('');
      expect(result).toEqual(['seattle', 'los-angeles', 'chicago', 'houston', 'atlanta', 'new-york']);
    });

    it('should handle malformed input gracefully', () => {
      const result = decodeCitySet('invalid,input,');
      expect(result).toEqual(['invalid', 'input']);
    });
  });
});