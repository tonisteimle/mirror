/**
 * AI Features Test Suite Index
 *
 * Tests for AI-assist features including:
 * - Draft Mode (?? marker, auto-submit on closing ??, Cmd+Enter fallback)
 * - Draft Lines (visual feedback for validated vs unvalidated code)
 */

import type { TestCase } from '../../types'

// Import test suites
import { draftModeIntegrationTests } from './draft-mode-integration.test'
import { draftModeSafetyTests } from './draft-mode-safety.test'

// Re-export individual suites
export { draftModeIntegrationTests } from './draft-mode-integration.test'
export { draftModeSafetyTests } from './draft-mode-safety.test'

// Combined AI tests
export const allAITests: TestCase[] = [...draftModeIntegrationTests, ...draftModeSafetyTests]

// Smoke tests that should always pass (tests integration is working)
export const aiSmokeTests: TestCase[] = draftModeIntegrationTests.filter(t =>
  t.name.includes('[SMOKE]')
)

// Detection tests
export const aiDetectionTests: TestCase[] = draftModeIntegrationTests.filter(
  t => t.name.includes('detect') || t.name.includes('isLineInDraft')
)

// Submit tests (Cmd+Enter)
export const aiSubmitTests: TestCase[] = draftModeIntegrationTests.filter(
  t => t.name.includes('Submit') || t.name.includes('Cmd+Enter') || t.name.includes('trigger')
)

// Event tests
export const aiEventTests: TestCase[] = draftModeIntegrationTests.filter(
  t => t.name.includes('event') || t.name.includes('Event')
)

// Replacement tests
export const aiReplacementTests: TestCase[] = draftModeIntegrationTests.filter(
  t => t.name.includes('replace') || t.name.includes('Replace') || t.name.includes('simulation')
)
