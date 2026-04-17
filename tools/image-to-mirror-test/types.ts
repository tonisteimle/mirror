/**
 * Image-to-Mirror Test System Types
 *
 * Type definitions for the roundtrip test system:
 * Mirror Code → PNG → Analysis → Generated Code → Comparison
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * A test case with source Mirror code
 */
export interface TestCase {
  /** Unique identifier */
  id: string
  /** Human-readable name */
  name: string
  /** Original Mirror DSL code */
  sourceCode: string
  /** Optional description */
  description?: string
  /** Categories for filtering */
  tags?: string[]
}

/**
 * Rendered image data
 */
export interface RenderedImage {
  /** PNG image as base64 string */
  base64: string
  /** PNG as Buffer */
  buffer: Buffer
  /** Image dimensions */
  width: number
  height: number
  /** Path if saved to disk */
  filePath?: string
}

/**
 * Result from the analyzer (placeholder interface for future implementation)
 */
export interface AnalysisResult {
  /** Generated Mirror code from image analysis */
  generatedCode: string
  /** Confidence score 0-1 */
  confidence: number
  /** Detected elements */
  elements: DetectedElement[]
  /** Analysis metadata */
  metadata: Record<string, unknown>
}

/**
 * A detected UI element from image analysis
 */
export interface DetectedElement {
  /** Element type (Frame, Text, Button, etc.) */
  type: string
  /** Bounding box */
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  /** Detected properties */
  properties: Record<string, string | number | boolean>
  /** Nested children */
  children?: DetectedElement[]
}

// =============================================================================
// Comparison Types
// =============================================================================

/**
 * Result of comparing original and generated code
 */
export interface ComparisonResult {
  /** Overall match score 0-1 */
  score: number
  /** Whether the test passed threshold */
  passed: boolean
  /** Detailed comparison data */
  details: ComparisonDetails
  /** Human-readable summary */
  summary: string
}

/**
 * Detailed comparison breakdown
 */
export interface ComparisonDetails {
  /** Structure match (hierarchy) */
  structureScore: number
  /** Element type match */
  elementTypeScore: number
  /** Property match */
  propertyScore: number
  /** Layout match */
  layoutScore: number
  /** Color match */
  colorScore: number
  /** Individual mismatches */
  mismatches: Mismatch[]
}

/**
 * A specific mismatch between original and generated
 */
export interface Mismatch {
  /** Type of mismatch */
  type: 'missing' | 'extra' | 'different'
  /** Path in the element tree */
  path: string
  /** Expected value */
  expected?: string
  /** Actual value */
  actual?: string
  /** Severity: low, medium, high */
  severity: 'low' | 'medium' | 'high'
}

// =============================================================================
// Test Result Types
// =============================================================================

/**
 * Result of a single test run
 */
export interface TestResult {
  /** Test case that was run */
  testCase: TestCase
  /** Whether the test passed */
  passed: boolean
  /** Rendered image */
  image: RenderedImage
  /** Analysis result (null if analyzer not implemented) */
  analysis: AnalysisResult | null
  /** Comparison result (null if analyzer not implemented) */
  comparison: ComparisonResult | null
  /** Execution duration in ms */
  duration: number
  /** Error if any */
  error?: string
}

/**
 * Summary of a test suite run
 */
export interface TestSuiteSummary {
  /** Total tests run */
  total: number
  /** Tests passed */
  passed: number
  /** Tests failed */
  failed: number
  /** Tests skipped */
  skipped: number
  /** Total duration in ms */
  duration: number
  /** Individual results */
  results: TestResult[]
  /** Timestamp */
  timestamp: Date
}

// =============================================================================
// Analyzer Interface
// =============================================================================

/**
 * Interface for image analyzers
 *
 * Implementations will analyze PNG images and generate Mirror code.
 * This is a placeholder - actual implementation comes later.
 */
export interface ImageAnalyzer {
  /** Analyze an image and return Mirror code */
  analyze(image: RenderedImage): Promise<AnalysisResult>

  /** Name of the analyzer for reporting */
  name: string

  /** Version of the analyzer */
  version: string
}

/**
 * Stub analyzer that returns empty results
 * Used for testing the test system itself
 */
export class StubAnalyzer implements ImageAnalyzer {
  name = 'StubAnalyzer'
  version = '0.0.0'

  async analyze(_image: RenderedImage): Promise<AnalysisResult> {
    return {
      generatedCode: '// Stub: No analysis performed',
      confidence: 0,
      elements: [],
      metadata: { stub: true },
    }
  }
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Test runner configuration
 */
export interface TestConfig {
  /** Browser headless mode */
  headless: boolean
  /** Screenshot output directory */
  outputDir: string
  /** Pass threshold (0-1) */
  passThreshold: number
  /** Viewport width */
  viewportWidth: number
  /** Viewport height */
  viewportHeight: number
  /** Timeout per test in ms */
  timeout: number
  /** Save screenshots to disk */
  saveScreenshots: boolean
  /** Verbose logging */
  verbose: boolean
}

/**
 * Default configuration
 */
export const defaultConfig: TestConfig = {
  headless: true,
  outputDir: './test-output/image-to-mirror',
  passThreshold: 0.8,
  viewportWidth: 800,
  viewportHeight: 600,
  timeout: 30000,
  saveScreenshots: true,
  verbose: false,
}
