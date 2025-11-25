const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Use SWC for faster compilation
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },

  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/client/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/client/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/client/src/hooks/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test file patterns
  testMatch: [
    '<rootDir>/client/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/client/src/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/server/**/__tests__/**/*.{ts}',
    '<rootDir>/server/**/*.{test,spec}.{ts}',
  ],

  // Ignore transformation for these files
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
    'node_modules/(?!(lucide-react)/)',
  ],

  // CSS and asset handling
  moduleNameMapping: {
    '^.+\\.module\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^.+\\.(jpg|jpeg|png|gif|webp|avif|svg)$': '<rootDir>/src/test/__mocks__/fileMock.js',
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Higher thresholds for critical components
    './client/src/components/(onboarding|admin|benefits|wellness|actions|settings)/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Paths to ignore for coverage
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/src/test/',
    '.*\\.d\\.ts$',
    '.*\\.stories\\.(ts|tsx)$',
  ],

  // Mock files
  setupFiles: ['<rootDir>/src/test/__mocks__/setupJest.js'],

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // Performance optimization
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // Verbose output for CI
  verbose: process.env.CI === 'true',

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,
};