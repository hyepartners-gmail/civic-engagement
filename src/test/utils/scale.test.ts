import { scaleSafeDualAxes, normalizeToScale } from '@/utils/scale';

describe('Scale Utilities', () => {
  describe('scaleSafeDualAxes', () => {
    it('should calculate scaling parameters for dual axes', () => {
      const leftSeries = [[2020, 10], [2021, 20], [2022, 30]] as [number, number | null][];
      const rightSeries = [[2020, 100], [2021, 200], [2022, 300]] as [number, number | null][];

      const result = scaleSafeDualAxes(leftSeries, rightSeries);

      expect(result.left.min).toBe(10);
      expect(result.left.max).toBe(30);
      expect(result.right.min).toBe(100);
      expect(result.right.max).toBe(300);
      
      // Check that padding was added
      expect(result.left.domain[0]).toBeLessThan(10);
      expect(result.left.domain[1]).toBeGreaterThan(30);
      expect(result.right.domain[0]).toBeLessThan(100);
      expect(result.right.domain[1]).toBeGreaterThan(300);
    });

    it('should handle empty series', () => {
      const leftSeries: [number, number | null][] = [];
      const rightSeries: [number, number | null][] = [];

      const result = scaleSafeDualAxes(leftSeries, rightSeries);

      expect(result.left.min).toBe(0);
      expect(result.left.max).toBe(1);
      expect(result.right.min).toBe(0);
      expect(result.right.max).toBe(1);
    });

    it('should handle series with null values', () => {
      const leftSeries = [[2020, 10], [2021, null], [2022, 30]] as [number, number | null][];
      const rightSeries = [[2020, null], [2021, 200], [2022, 300]] as [number, number | null][];

      const result = scaleSafeDualAxes(leftSeries, rightSeries);

      expect(result.left.min).toBe(10);
      expect(result.left.max).toBe(30);
      expect(result.right.min).toBe(200);
      expect(result.right.max).toBe(300);
    });
  });

  describe('normalizeToScale', () => {
    it('should normalize a value to a 0-100 scale', () => {
      const domain: [number, number] = [0, 100];
      const value = 50;
      
      const result = normalizeToScale(value, domain);
      
      expect(result).toBe(50);
    });

    it('should handle edge cases', () => {
      // Min value
      expect(normalizeToScale(0, [0, 100])).toBe(0);
      
      // Max value
      expect(normalizeToScale(100, [0, 100])).toBe(100);
      
      // Value outside domain (should clamp)
      expect(normalizeToScale(150, [0, 100])).toBe(150);
      
      // Equal min and max
      expect(normalizeToScale(50, [50, 50])).toBe(50);
    });
  });
});