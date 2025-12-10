/** @type {import('jest').Config} */
const config = {
  // Use jsdom environment for testing React components
  testEnvironment: 'jsdom',

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    'superjson': '<rootDir>/tests/__mocks__/superjson.js',
    '@workos-inc/authkit-nextjs': '<rootDir>/tests/__mocks__/authkit-nextjs.js',
  },

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.(ts|tsx|js)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/generated/**',
    '!src/**/*.stories.{ts,tsx}',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/__mocks__/',
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/(?!(dayjs|react-leaflet|react-big-calendar|superjson)/)',
  ],
};

module.exports = config;
