export default {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.{ts,tsx,js}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          diagnostics: false,
          tsconfig: '<rootDir>/tests/tsconfig.test.json'
        }],
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/client/src/$1'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      testTimeout: 10000,
      collectCoverageFrom: [
        'services/**/src/**/*.{ts,tsx}',
        'client/src/**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**'
      ]
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.{ts,tsx,js}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          diagnostics: false,
          tsconfig: '<rootDir>/tests/tsconfig.test.json'
        }],
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/client/src/$1'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      testTimeout: 30000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.{ts,tsx,js}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          diagnostics: false,
          tsconfig: '<rootDir>/tests/tsconfig.test.json'
        }],
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/client/src/$1'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      testTimeout: 60000
    }
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  collectCoverageFrom: [
    'services/**/src/**/*.{ts,tsx}',
    'client/src/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
