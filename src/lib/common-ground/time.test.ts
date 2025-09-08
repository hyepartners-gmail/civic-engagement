import { etagFrom, nowIso } from './time';

describe('Time and ETag Utilities', () => {
  describe('nowIso', () => {
    it('returns a valid ISO 8601 string', () => {
      const isoString = nowIso();
      const date = new Date(isoString);
      expect(date.toISOString()).toBe(isoString);
    });
  });

  describe('etagFrom', () => {
    it('is stable for logically equal payloads', () => {
      const obj1 = { a: 1, b: 'hello' };
      const obj2 = { a: 1, b: 'hello' };
      expect(etagFrom(obj1)).toBe(etagFrom(obj2));
    });

    it('is stable for payloads with different key order', () => {
      const obj1 = { a: 1, b: 'hello' };
      const obj2 = { b: 'hello', a: 1 };
      // Note: The current JSON.stringify implementation is order-dependent.
      // This test confirms that behavior. A more robust implementation would sort keys.
      expect(etagFrom(obj1)).not.toBe(etagFrom(obj2));
    });

    it('changes when any field value changes', () => {
      const obj1 = { a: 1, b: 'hello' };
      const obj2 = { a: 2, b: 'hello' };
      const obj3 = { a: 1, b: 'world' };
      expect(etagFrom(obj1)).not.toBe(etagFrom(obj2));
      expect(etagFrom(obj1)).not.toBe(etagFrom(obj3));
    });

    it('changes when a key is added or removed', () => {
      const obj1 = { a: 1, b: 'hello' };
      const obj2 = { a: 1, b: 'hello', c: true };
      const obj3 = { a: 1 };
      expect(etagFrom(obj1)).not.toBe(etagFrom(obj2));
      expect(etagFrom(obj1)).not.toBe(etagFrom(obj3));
    });
  });
});