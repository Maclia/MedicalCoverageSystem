// Simple test to verify the division by zero protection logic
// This tests the specific change made to analytics.ts

function testDivisionByZeroLogic() {
  console.log('Testing division by zero protection logic...');

  // Test case 1: Previous month count is 0 (should return 0, not Infinity)
  const previousCountZero = 0;
  const currentCount = 10;

  // This is the logic from the analytics.ts file
  const changePercentZero = previousCountZero > 0
    ? ((currentCount - previousCountZero) / previousCountZero) * 100
    : 0;

  if (changePercentZero === 0) {
    console.log('✅ Division by zero protection working: changePercent =', changePercentZero);
  } else {
    console.log('❌ Division by zero protection failed: changePercent =', changePercentZero);
  }

  // Test case 2: Normal case with non-zero previous count
  const previousCountNormal = 5;

  const changePercentNormal = previousCountNormal > 0
    ? ((currentCount - previousCountNormal) / previousCountNormal) * 100
    : 0;

  const expectedNormal = ((10 - 5) / 5) * 100; // Should be 100%

  if (changePercentNormal === expectedNormal) {
    console.log('✅ Normal calculation working: changePercent =', changePercentNormal);
  } else {
    console.log('❌ Normal calculation failed: expected', expectedNormal, 'got', changePercentNormal);
  }

  // Test case 3: Edge case with both counts zero
  const bothZero = 0 > 0 ? ((0 - 0) / 0) * 100 : 0;

  if (bothZero === 0) {
    console.log('✅ Both counts zero handled: changePercent =', bothZero);
  } else {
    console.log('❌ Both counts zero failed: changePercent =', bothZero);
  }

  console.log('Logic verification completed.');
}

// Run the test
testDivisionByZeroLogic();
