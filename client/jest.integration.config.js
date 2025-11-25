module.exports = {
  displayName: 'Integration Tests',
  testMatch: [
    '<rootDir>/src/tests/integration/**/*.test.{js,jsx,ts,tsx}'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/integration/test-setup.ts'
  ],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  testTimeout: 10000,
  verbose: true,
  maxWorkers: 1,
  globalSetup: '<rootDir>/src/tests/integration/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/integration/global-teardown.ts'
};