const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    // Map jose and openid-client to their CommonJS builds if available
    '^jose/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
    '^jose$': '<rootDir>/node_modules/jose/dist/node/cjs/index.js',
    '^openid-client/(.*)$': '<rootDir>/node_modules/openid-client/lib/$1',
    '^openid-client$': '<rootDir>/node_modules/openid-client/lib/index.js',
    // Explicitly redirect browser builds to node CJS builds if they are being picked up
    '^jose/dist/browser/(.*)$': '<rootDir>/node_modules/jose/dist/node/cjs/$1',
    // Redirect @panva/hkdf browser build to node CJS build
    '^@panva/hkdf/(.*)$': '<rootDir>/node_modules/@panva/hkdf/dist/node/cjs/$1',
    '^@panva/hkdf$': '<rootDir>/node_modules/@panva/hkdf/dist/node/cjs/index.js',
    // No need for uuid mapping here, as it will be mocked via __mocks__
  },
  transform: {
    // Use ts-jest for .ts, .tsx, .js, .jsx, .mjs files
    '^.+\\.(ts|tsx|js|jsx|mjs)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  transformIgnorePatterns: [
    // Do NOT ignore these modules, so they ARE transformed by the above 'transform' rule.
    // This pattern means: ignore everything in node_modules EXCEPT these listed packages.
    // This should help with ESM modules like 'next-auth', 'jose', 'openid-client', 'uuid', 'preact', 'preact-render-to-string'.
    '/node_modules/(?!next-auth|@testing-library/react|@testing-library/dom|jose|openid-client|@panva/hkdf|uuid|preact|preact-render-to-string)/',
  ],
  globals: {
    // 'ts-jest' configuration is now directly within the 'transform' array
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!src/pages/api/**',
    '!src/lib/dummy-data.ts',
    '!src/lib/dummy-users.ts',
    '!src/lib/datastoreServer.ts',
    '!src/components/ui/**',
  ],
};

// createJestConfig is an async function that returns a Promise
module.exports = createJestConfig(customJestConfig);