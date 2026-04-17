/**
 * Quick test: Icon inside colored button
 */

import { ImageToMirrorTestRunner, createTestCase } from '../runner'
import { NestedRectangleAnalyzer } from '../analyzers/nested-rectangle-analyzer'

async function run() {
  const runner = new ImageToMirrorTestRunner(
    {
      headless: true,
      verbose: false,
      saveScreenshots: true,
      outputDir: 'test-output/icon-button-test',
    },
    new NestedRectangleAnalyzer()
  )

  const tests = [
    {
      name: 'Icon in dark frame (Step 9 style)',
      code: `Frame w 400, h 300, bg #ffffff, center
  Frame w 120, h 120, bg #1a1a1a, center
    Icon "check", ic #10b981, is 48`,
    },
    {
      name: 'Icon in blue frame (Button style)',
      code: `Frame w 400, h 300, bg #f0f0f0, center
  Frame w 120, h 60, bg #2271C1, center
    Icon "check", ic white, is 24`,
    },
    {
      name: 'Icon + Text in blue frame',
      code: `Frame w 400, h 300, bg #f0f0f0, center
  Frame bg #2271C1, pad 12 24, rad 6, hor, gap 8, ver-center
    Icon "check", ic white, is 16
    Text "OK", col white`,
    },
  ]

  try {
    await runner.start()

    for (const test of tests) {
      console.log(`\n=== ${test.name} ===`)
      console.log('Input:')
      test.code.split('\n').forEach(l => console.log('  ' + l))

      const result = await runner.runTest(createTestCase('test', test.name, test.code))

      console.log('Output:')
      result.analysis?.generatedCode.split('\n').forEach(l => console.log('  ' + l))
    }
  } finally {
    await runner.stop()
  }
}

run().catch(console.error)
