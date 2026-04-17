/**
 * Image-to-Mirror Test System
 *
 * Roundtrip testing for image-to-Mirror conversion:
 * Mirror Code → Render → PNG → Analyze → Generate → Compare
 *
 * Usage:
 *
 * 1. CLI:
 *    npx tsx tools/image-to-mirror-test/cli.ts --level=basic --verbose
 *
 * 2. Programmatic:
 *    import { ImageToMirrorTestRunner, allFixtures } from './tools/image-to-mirror-test'
 *
 *    const runner = new ImageToMirrorTestRunner({ verbose: true })
 *    await runner.start()
 *    const results = await runner.runTests(allFixtures)
 *    await runner.stop()
 *
 * 3. Quick test:
 *    import { quickTest } from './tools/image-to-mirror-test'
 *
 *    const result = await quickTest('Button "Click", bg #2271C1')
 *    console.log(result.image.filePath)
 */

// Types
export type {
  TestCase,
  TestResult,
  TestSuiteSummary,
  TestConfig,
  RenderedImage,
  AnalysisResult,
  DetectedElement,
  ComparisonResult,
  ComparisonDetails,
  Mismatch,
  ImageAnalyzer,
} from './types'

export { defaultConfig, StubAnalyzer } from './types'

// Runner
export { ImageToMirrorTestRunner, createTestCase, quickTest } from './runner'

// Renderer
export { MirrorRenderer, compileToHTML } from './renderer'

// Comparator
export { MirrorComparator } from './comparator'

// Fixtures
export {
  allFixtures,
  basicPrimitives,
  layoutTests,
  stylingTests,
  typographyTests,
  componentTests,
  complexTests,
  getFixturesByTag,
  getFixturesByLevel,
} from './fixtures'
