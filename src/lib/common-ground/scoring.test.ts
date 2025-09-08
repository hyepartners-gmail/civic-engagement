import { classifyTopic, isSafe, isHot, scoreDispersion } from './scoring';
import { SAFE_TOLERANCE, HOT_THRESHOLD } from './constants';

describe('Common Ground Scoring Utilities', () => {
  describe('scoreDispersion', () => {
    it('calculates the range between the min and max values', () => {
      expect(scoreDispersion([-10, 0, 10])).toBe(20);
      expect(scoreDispersion([-100, 100])).toBe(200);
      expect(scoreDispersion([5, 5, 5])).toBe(0);
    });

    it('returns 0 for a single value or empty array', () => {
      expect(scoreDispersion([10])).toBe(0);
      expect(scoreDispersion([])).toBe(0);
    });
  });

  describe('isSafe', () => {
    it('returns true when dispersion is within the safe tolerance', () => {
      expect(isSafe([-10, 0, 15])).toBe(true); // range is 25, which is <= SAFE_TOLERANCE
    });

    it('returns false when dispersion exceeds the safe tolerance', () => {
      expect(isSafe([-10, 0, 16])).toBe(false); // range is 26
    });
  });

  describe('isHot', () => {
    it('returns true when dispersion meets or exceeds the hot threshold', () => {
      expect(isHot([-50, 50])).toBe(true); // range is 100, which is >= HOT_THRESHOLD
      expect(isHot([-100, 100])).toBe(true); // range is 200
    });

    it('returns false when dispersion is below the hot threshold', () => {
      expect(isHot([-49, 50])).toBe(false); // range is 99
    });
  });

  describe('classifyTopic', () => {
    it('classifies as "safe" when dispersion is within tolerance', () => {
      expect(classifyTopic([-10, 0, 15])).toBe('safe');
    });

    it('classifies as "hot" when dispersion is outside safe tolerance (binary classification)', () => {
      expect(classifyTopic([-10, 0, 16])).toBe('hot'); // range 26, not safe, therefore hot
    });

    // Specific user-provided edge cases
    it('classifies [-100, -100, -100] as Safe', () => {
      expect(classifyTopic([-100, -100, -100])).toBe('safe');
    });

    it('classifies [-100, +100] as Hot', () => {
      expect(classifyTopic([-100, 100])).toBe('hot');
    });

    it('classifies [-60, +40] as Hot', () => {
      expect(classifyTopic([-60, 40])).toBe('hot');
    });

    it('classifies [-10, +5, +8] as Safe', () => {
      expect(classifyTopic([-10, 5, 8])).toBe('safe');
    });
  });
});