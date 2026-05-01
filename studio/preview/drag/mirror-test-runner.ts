/**
 * Run a Mirror Studio integration test case
 */

import type { BrowserTestResult, MirrorTestAPI, MirrorTestCase } from './test-api-types'

export async function runMirrorTest(
  testCase: MirrorTestCase,
  api: MirrorTestAPI
): Promise<BrowserTestResult> {
  const startTime = performance.now()

  try {
    // Setup
    if (testCase.setup) {
      api.studio.setCode(testCase.setup)
      await api.studio.waitForCompile()
    }

    // Run test
    const result = await testCase.run(api)

    // Verify
    if (testCase.verify && !testCase.verify(result, api.studio)) {
      return {
        ...result,
        success: false,
        error: 'Verification failed',
      }
    }

    return result
  } catch (error) {
    return {
      success: false,
      description: testCase.name,
      duration: performance.now() - startTime,
      error: String(error),
    }
  }
}
