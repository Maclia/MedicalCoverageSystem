// Jest Setup File
// This file runs before the tests and configures Jest globals and environment

// Ensure jest types are available globally
declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => Promise<void> | void): void;
  function beforeEach(fn: () => void): void;
  function beforeAll(fn: () => void): void;
  function afterEach(fn: () => void): void;
  function afterAll(fn: () => void): void;
  function expect<T>(value: T): any;
  var global: typeof globalThis;
  var jest: any;
}

// Mock fetch if not available
if (typeof global !== 'undefined' && !global.fetch) {
  global.fetch = jest.fn();
}

export {};
