// Optional: configure or set up a testing framework before each test.
// For example, if you want to add clean up functions for React Testing Library:
require('@testing-library/jest-dom');

// Polyfill TextEncoder and TextDecoder for JSDOM environment
// These are typically available in Node.js v11+ or in a browser environment.
// For older Node.js or specific JSDOM setups, they might need explicit polyfill.
// Using Node.js's built-in 'util' module for polyfill if not present.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}