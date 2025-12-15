// Global setup for integration tests

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';

  // Mock any global configurations needed for testing
  global.testStartTime = Date.now();

  console.log('✅ Integration test environment setup complete');
}