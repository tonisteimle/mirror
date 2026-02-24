/**
 * LLM Mock Provider
 *
 * Provides mock LLM responses from fixtures for deterministic testing.
 * Can be configured to fall back to real API calls when fixtures are missing.
 */

import type { TestCase, ResponseFixture } from '../schema'
import { loadFixture, fixtureExists, loadAllFixtures } from './recorder'

// =============================================================================
// Types
// =============================================================================

export interface MockProviderConfig {
  /** Allow real API calls if fixture missing */
  allowRealCalls?: boolean

  /** Real LLM call function (used when allowRealCalls is true) */
  realLLM?: (prompt: string, context?: string) => Promise<string>

  /** Return processed or raw response */
  useProcessed?: boolean

  /** Callback when fixture is used */
  onFixtureUsed?: (caseId: string, fixture: ResponseFixture) => void

  /** Callback when real call is made */
  onRealCall?: (prompt: string) => void
}

export interface MockProvider {
  /** Get response for a test case */
  getResponse: (testCase: TestCase) => Promise<string>

  /** Get response by case ID */
  getResponseById: (pipeline: string, caseId: string) => Promise<string>

  /** Check if fixture exists */
  hasFixture: (pipeline: string, caseId: string) => boolean

  /** Get statistics */
  getStats: () => MockProviderStats
}

export interface MockProviderStats {
  fixtureHits: number
  fixtureMisses: number
  realCalls: number
  errors: number
}

// =============================================================================
// Mock Provider Factory
// =============================================================================

/**
 * Create a mock provider for a specific pipeline
 */
export function createMockProvider(
  pipeline: string,
  config: MockProviderConfig = {}
): MockProvider {
  const stats: MockProviderStats = {
    fixtureHits: 0,
    fixtureMisses: 0,
    realCalls: 0,
    errors: 0,
  }

  // Preload all fixtures for this pipeline
  const fixtures = loadAllFixtures(pipeline)

  const getResponse = async (testCase: TestCase): Promise<string> => {
    return getResponseById(testCase.pipeline, testCase.id)
  }

  const getResponseById = async (pipelineName: string, caseId: string): Promise<string> => {
    // Try to get from cache first
    const cached = fixtures.get(caseId)

    if (cached) {
      stats.fixtureHits++
      config.onFixtureUsed?.(caseId, cached)

      return config.useProcessed !== false
        ? cached.response.processed
        : cached.response.raw
    }

    // Try to load from disk
    if (fixtureExists(pipelineName, caseId)) {
      try {
        const fixture = loadFixture(pipelineName, caseId)
        fixtures.set(caseId, fixture)  // Cache it
        stats.fixtureHits++
        config.onFixtureUsed?.(caseId, fixture)

        return config.useProcessed !== false
          ? fixture.response.processed
          : fixture.response.raw
      } catch (err) {
        stats.errors++
        // Fall through to real call if allowed
      }
    }

    stats.fixtureMisses++

    // Make real call if allowed
    if (config.allowRealCalls && config.realLLM) {
      stats.realCalls++
      config.onRealCall?.(`Case: ${caseId}`)
      // Note: We'd need the prompt here, which we don't have from just caseId
      // This path is mainly for when called via getResponse with full TestCase
      throw new Error(`Fixture not found: ${caseId}. Real call requires TestCase context.`)
    }

    throw new Error(`Fixture not found: ${pipelineName}/${caseId}`)
  }

  const hasFixture = (pipelineName: string, caseId: string): boolean => {
    return fixtures.has(caseId) || fixtureExists(pipelineName, caseId)
  }

  const getStats = (): MockProviderStats => ({ ...stats })

  return {
    getResponse,
    getResponseById,
    hasFixture,
    getStats,
  }
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a simple mock function that returns fixture responses
 */
export function createFixtureMock(
  pipeline: string
): (testCase: TestCase) => string {
  const provider = createMockProvider(pipeline)

  return (testCase: TestCase): string => {
    // Synchronous version - fixtures must be preloaded
    const fixture = loadFixture(pipeline, testCase.id)
    return fixture.response.processed
  }
}

/**
 * Create a mock that throws if fixture is missing (strict mode)
 */
export function createStrictMock(
  pipeline: string
): (testCase: TestCase) => string {
  return (testCase: TestCase): string => {
    if (!fixtureExists(pipeline, testCase.id)) {
      throw new Error(
        `Missing fixture for test case: ${testCase.id}\n` +
        `Run the recorder to capture this fixture:\n` +
        `npm run llm:record -- --pipeline=${pipeline} --case=${testCase.id}`
      )
    }

    const fixture = loadFixture(pipeline, testCase.id)
    return fixture.response.processed
  }
}

// =============================================================================
// Vitest Integration
// =============================================================================

/**
 * Create mock functions for Vitest
 */
export function createVitestMocks(pipeline: string) {
  const fixtures = loadAllFixtures(pipeline)

  return {
    /**
     * Mock for translateLine
     */
    mockTranslateLine: (lineContent: string): Promise<{ code: string }> => {
      // Find fixture by matching prompt content
      for (const [caseId, fixture] of fixtures) {
        if (fixture.response.raw.includes(lineContent.trim())) {
          return Promise.resolve({ code: fixture.response.processed })
        }
      }
      return Promise.reject(new Error(`No fixture matches: ${lineContent}`))
    },

    /**
     * Mock for generateMirrorCode
     */
    mockGenerateMirrorCode: (prompt: string): Promise<{ code: string }> => {
      for (const [caseId, fixture] of fixtures) {
        // Simple matching - could be improved
        if (caseId.includes(prompt.toLowerCase().replace(/\s+/g, '-').slice(0, 20))) {
          return Promise.resolve({ code: fixture.response.processed })
        }
      }
      return Promise.reject(new Error(`No fixture matches prompt`))
    },

    /**
     * Get raw fixture data
     */
    getFixture: (caseId: string): ResponseFixture | undefined => {
      return fixtures.get(caseId)
    },

    /**
     * Get all fixtures
     */
    getAllFixtures: (): Map<string, ResponseFixture> => fixtures,
  }
}

// =============================================================================
// Recording Mode Detection
// =============================================================================

/**
 * Check if we're in recording mode (via env var)
 */
export function isRecordingMode(): boolean {
  return process.env.LLM_RECORD === 'true'
}

/**
 * Check if we should use real LLM (via env var)
 */
export function shouldUseRealLLM(): boolean {
  return process.env.LLM_REAL === 'true'
}

/**
 * Get the LLM API key from env
 */
export function getLLMApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
}
