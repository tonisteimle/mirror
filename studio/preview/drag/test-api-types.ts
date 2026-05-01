/**
 * Public types for the drag test API
 */

import type { BrowserTestRunner } from './test-runner'
import type { MirrorStudioControl } from './studio-control'

export interface BrowserTestResult {
  success: boolean
  description: string
  duration: number
  codeBefore?: string
  codeAfter?: string
  error?: string
}

export interface AnimationConfig {
  /** Animation speed (ms between steps) */
  stepDelay: number
  /** Number of interpolation steps */
  steps: number
  /** Show visual cursor */
  showCursor: boolean
}

export const DEFAULT_ANIMATION: AnimationConfig = {
  stepDelay: 20,
  steps: 15,
  showCursor: true,
}

// ---------------------------------------------------------------------------
// Property panel types
// ---------------------------------------------------------------------------

export interface ExtractedPropertyInfo {
  name: string
  value: string
  hasValue: boolean
  isToken?: boolean
  tokenRef?: string
}

export interface PropertyCategoryInfo {
  name: string
  label: string
  properties: ExtractedPropertyInfo[]
}

export interface ExtractedElementInfo {
  nodeId: string
  nodeName: string
  componentName?: string
  isDefinition: boolean
  isTemplateInstance: boolean
  categories: PropertyCategoryInfo[]
  allProperties: ExtractedPropertyInfo[]
}

export interface PropertyModificationResult {
  success: boolean
  newSource?: string
  change?: { from: number; to: number; insert: string }
  error?: string
}

export interface TokenInfo {
  name: string
  type: string
  value: string
  fullName: string
}

// ---------------------------------------------------------------------------
// Test case types
// ---------------------------------------------------------------------------

export interface TestCase {
  name: string
  run: (runner: BrowserTestRunner) => Promise<BrowserTestResult>
}

export interface MirrorTestCase {
  name: string
  setup?: string
  run: (api: MirrorTestAPI) => Promise<BrowserTestResult>
  verify?: (result: BrowserTestResult, studio: MirrorStudioControl) => boolean
}

export interface MirrorTestAPI {
  drag: BrowserTestRunner
  studio: MirrorStudioControl
}
