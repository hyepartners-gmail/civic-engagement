import { isValidEmail, isValidPassword, isValidZipCode } from './validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should return true for a valid email address', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('another@sub.domain.net')).toBe(true);
    });

    it('should return false for an invalid email address', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
      expect(isValidEmail('test@domain')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(' ')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should return true for a valid password', () => {
      // At least 8 chars, number, special char
      expect(isValidPassword('Password123!')).toBe(true);
      expect(isValidPassword('MyP@ssw0rd')).toBe(true);
      expect(isValidPassword('aB1!cDeF')).toBe(true);
    });

    it('should return false for an invalid password', () => {
      // Too short
      expect(isValidPassword('Pass1!')).toBe(false);
      // No number
      expect(isValidPassword('Password!@#')).toBe(false);
      // No special character
      expect(isValidPassword('Password123')).toBe(false);
      // No number or special character
      expect(isValidPassword('Passwordabc')).toBe(false);
      expect(isValidPassword('')).toBe(false);
      expect(isValidPassword('        ')).toBe(false);
    });
  });

  describe('isValidZipCode', () => {
    it('should return true for a valid 5-digit zip code', () => {
      expect(isValidZipCode('12345')).toBe(true);
      expect(isValidZipCode('99999')).toBe(true);
      expect(isValidZipCode('00000')).toBe(true);
    });

    it('should return false for an invalid zip code', () => {
      // Incorrect length
      expect(isValidZipCode('1234')).toBe(false);
      expect(isValidZipCode('123456')).toBe(false);
      // Contains non-digits
      expect(isValidZipCode('abcde')).toBe(false);
      expect(isValidZipCode('1234a')).toBe(false);
      expect(isValidZipCode('123-45')).toBe(false);
      // Empty or spaces
      expect(isValidZipCode('')).toBe(false);
      expect(isValidZipCode('     ')).toBe(false);
      expect(isValidZipCode(null as any)).toBe(false); // Test null/undefined input
      expect(isValidZipCode(undefined as any)).toBe(false);
    });
  });
});