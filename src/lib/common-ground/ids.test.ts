import { generateGroupCode, generateInviteCode } from './ids';

describe('ID Generation Utilities', () => {
  describe('generateGroupCode', () => {
    it('creates an 8-character, uppercase, URL-safe string', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateGroupCode();
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
        expect(code).toBe(code.toUpperCase());
      }
    });
  });

  describe('generateInviteCode', () => {
    it('creates a full UUIDv4 string', () => {
      const code = generateInviteCode();
      // A simple regex to check for UUID v4 format
      expect(code).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
});