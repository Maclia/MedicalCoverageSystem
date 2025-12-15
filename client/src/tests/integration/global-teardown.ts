// Global teardown for integration tests

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');

  // Calculate total test execution time
  const testDuration = Date.now() - (global as any).testStartTime;
  console.log(`⏱️ Total test execution time: ${testDuration}ms`);

  // Clean up any global resources
  delete global.testStartTime;

  console.log('✅ Integration test environment cleanup complete');
}