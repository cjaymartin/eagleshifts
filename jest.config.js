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
        '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports to the corresponding .ts files
    },
    extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ESM

    // Transform files with ts-jest
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    jsx: 'react-jsx',
                },
            },
        ],
    },

    // Test file patterns
    testMatch: ['<rootDir>/tests/**/*.(ts|tsx|js)'],

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
        '\\.skip\\.ts$', // Ignore files ending with .skip.ts
    ],

    // Transform ignore patterns
    transformIgnorePatterns: [
        '/node_modules/(?!(dayjs|react-leaflet|react-big-calendar)/)',
    ],
};

module.exports = config;
