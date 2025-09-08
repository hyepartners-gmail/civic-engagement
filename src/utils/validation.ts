// This file would contain client-side validation functions.

export const isValidEmail = (email: string): boolean => {
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // Password must be at least 8 characters long, contain a number and a special character
  return password.length >= 8 && /[0-9]/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password);
};

export const isValidZipCode = (zipCode: string): boolean => {
  // Zip code must be exactly 5 digits
  const zipCodeRegex = /^\d{5}$/;
  return zipCodeRegex.test(zipCode);
};