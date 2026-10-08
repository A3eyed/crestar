// @ts-nocheck
/**
 * Currency System Test Endpoint
 * Quick test to verify currency conversion is working
 * GET /api/currency/test
 */

export async function GET(request) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    // Test 1: Simple conversion (GHS to USD)
    const test1 = await fetch(
      `${request.url.split("/api/")[0]}/api/currency/convert?amount=100&from=GHS&to=USD`,
    );
    const test1Data = await test1.json();
    results.tests.push({
      name: "Simple Conversion (100 GHS → USD)",
      status: test1.ok ? "✅ PASS" : "❌ FAIL",
      result: test1Data,
    });

    // Test 2: Same currency (no conversion)
    const test2 = await fetch(
      `${request.url.split("/api/")[0]}/api/currency/convert?amount=50&from=GHS&to=GHS`,
    );
    const test2Data = await test2.json();
    results.tests.push({
      name: "Same Currency (50 GHS → GHS)",
      status:
        test2.ok && test2Data.convertedAmount === 50 ? "✅ PASS" : "❌ FAIL",
      result: test2Data,
    });

    // Test 3: Batch conversion
    const test3 = await fetch(
      `${request.url.split("/api/")[0]}/api/currency/convert`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amounts: [10, 20, 30],
          from: "GHS",
          to: "USD",
        }),
      },
    );
    const test3Data = await test3.json();
    results.tests.push({
      name: "Batch Conversion ([10, 20, 30] GHS → USD)",
      status:
        test3.ok && test3Data.conversions?.length === 3 ? "✅ PASS" : "❌ FAIL",
      result: test3Data,
    });

    // Test 4: Invalid amount
    const test4 = await fetch(
      `${request.url.split("/api/")[0]}/api/currency/convert?amount=invalid&from=GHS&to=USD`,
    );
    const test4Data = await test4.json();
    results.tests.push({
      name: "Invalid Amount (should fail gracefully)",
      status: !test4.ok && test4Data.error ? "✅ PASS" : "❌ FAIL",
      result: test4Data,
    });

    // Test 5: Get rates
    const test5 = await fetch(
      `${request.url.split("/api/")[0]}/api/currency/rates?base=GHS`,
    );
    const test5Data = await test5.json();
    results.tests.push({
      name: "Get Exchange Rates (GHS base)",
      status: test5.ok && test5Data.rates ? "✅ PASS" : "❌ FAIL",
      result: {
        success: test5Data.success,
        rateCount: test5Data.rates ? Object.keys(test5Data.rates).length : 0,
        sampleRates: test5Data.rates
          ? {
              USD: test5Data.rates.USD,
              EUR: test5Data.rates.EUR,
              GBP: test5Data.rates.GBP,
            }
          : null,
      },
    });

    // Summary
    const passCount = results.tests.filter((t) =>
      t.status.includes("✅"),
    ).length;
    const totalCount = results.tests.length;

    results.summary = {
      passed: passCount,
      failed: totalCount - passCount,
      total: totalCount,
      status:
        passCount === totalCount
          ? "✅ ALL TESTS PASSED"
          : "⚠️ SOME TESTS FAILED",
    };

    return Response.json(results);
  } catch (error) {
    return Response.json(
      {
        error: "Test suite failed",
        details: error.message,
        results,
      },
      { status: 500 },
    );
  }
}
