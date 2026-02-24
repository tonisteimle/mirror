/**
 * LLM Response Recorder
 *
 * Records real LLM responses and stores them as fixtures.
 * Used to capture responses for deterministic testing.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import type {
  TestCase,
  TestSuite,
  ResponseFixture,
  RecordingOptions,
  ResponseValidation,
} from '../schema'
import { createResponseFixture } from '../schema/response'
import { parse } from '../../../parser/parser'
import { validateCode } from '../../../validation/dsl-schema'

// =============================================================================
// Configuration
// =============================================================================

const FIXTURES_BASE_PATH = join(__dirname, '..', 'fixtures')

// =============================================================================
// Recording Functions
// =============================================================================

/**
 * Record a single LLM response as a fixture
 */
export async function recordResponse(
  testCase: TestCase,
  callLLM: (prompt: string, context?: string) => Promise<string>,
  options: RecordingOptions = {}
): Promise<ResponseFixture> {
  const fixturePath = getFixturePath(testCase.pipeline, testCase.id)

  // Check if fixture already exists
  if (existsSync(fixturePath) && options.skipExisting) {
    console.log(`[Skip] Fixture exists: ${testCase.id}`)
    return loadFixture(testCase.pipeline, testCase.id)
  }

  if (existsSync(fixturePath) && !options.overwrite) {
    throw new Error(`Fixture already exists: ${fixturePath}. Use overwrite: true to replace.`)
  }

  // Make the LLM call
  console.log(`[Recording] ${testCase.id}: "${testCase.input.prompt.slice(0, 50)}..."`)
  const startTime = performance.now()

  const contextStr = testCase.input.context?.tokens || ''
  const rawResponse = await callLLM(testCase.input.prompt, contextStr)

  const latencyMs = performance.now() - startTime

  // Process the response (remove markdown fences, etc.)
  const processed = processResponse(rawResponse)

  // Create the fixture
  const fixture = createResponseFixture(testCase.id, rawResponse, 'unknown', {
    processed,
    latencyMs,
  })

  // Validate if requested
  if (options.autoValidate) {
    fixture.validation = validateResponse(processed)
  }

  // Mark as reviewed if auto-review enabled
  if (options.autoReview) {
    fixture.review = {
      reviewed: true,
      reviewedBy: 'auto-recorder',
      reviewedAt: new Date().toISOString(),
      notes: options.notes,
    }
  }

  // Save the fixture
  saveFixture(testCase.pipeline, testCase.id, fixture)

  console.log(`[Recorded] ${testCase.id} (${Math.round(latencyMs)}ms)`)

  return fixture
}

/**
 * Record all test cases in a suite
 */
export async function recordSuite(
  suite: TestSuite,
  callLLM: (prompt: string, context?: string) => Promise<string>,
  options: RecordingOptions = {}
): Promise<Map<string, ResponseFixture>> {
  const results = new Map<string, ResponseFixture>()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Recording suite: ${suite.name}`)
  console.log(`Cases: ${suite.cases.length}`)
  console.log(`${'='.repeat(60)}\n`)

  for (const testCase of suite.cases) {
    if (testCase.skip) {
      console.log(`[Skip] ${testCase.id}: ${testCase.skipReason || 'marked as skip'}`)
      continue
    }

    try {
      const fixture = await recordResponse(testCase, callLLM, options)
      results.set(testCase.id, fixture)
    } catch (err) {
      console.error(`[Error] ${testCase.id}: ${err}`)
    }

    // Small delay between calls to avoid rate limiting
    await sleep(500)
  }

  console.log(`\nRecorded ${results.size}/${suite.cases.length} fixtures`)

  return results
}

// =============================================================================
// Fixture Storage
// =============================================================================

function getFixturePath(pipeline: string, caseId: string): string {
  return join(FIXTURES_BASE_PATH, pipeline, 'responses', `${caseId}.json`)
}

function saveFixture(pipeline: string, caseId: string, fixture: ResponseFixture): void {
  const filePath = getFixturePath(pipeline, caseId)
  const dir = dirname(filePath)

  // Ensure directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(filePath, JSON.stringify(fixture, null, 2), 'utf-8')
}

/**
 * Load a fixture from disk
 */
export function loadFixture(pipeline: string, caseId: string): ResponseFixture {
  const filePath = getFixturePath(pipeline, caseId)

  if (!existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`)
  }

  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as ResponseFixture
}

/**
 * Check if a fixture exists
 */
export function fixtureExists(pipeline: string, caseId: string): boolean {
  return existsSync(getFixturePath(pipeline, caseId))
}

/**
 * Load all fixtures for a pipeline
 */
export function loadAllFixtures(pipeline: string): Map<string, ResponseFixture> {
  const dir = join(FIXTURES_BASE_PATH, pipeline, 'responses')
  const fixtures = new Map<string, ResponseFixture>()

  if (!existsSync(dir)) {
    return fixtures
  }

  const { readdirSync } = require('fs')
  const files = readdirSync(dir).filter((f: string) => f.endsWith('.json'))

  for (const file of files) {
    const caseId = file.replace('.json', '')
    try {
      const fixture = loadFixture(pipeline, caseId)
      fixtures.set(caseId, fixture)
    } catch (err) {
      console.warn(`Failed to load fixture ${file}: ${err}`)
    }
  }

  return fixtures
}

// =============================================================================
// Response Processing
// =============================================================================

/**
 * Process raw LLM response to extract clean Mirror code
 */
function processResponse(raw: string): string {
  let processed = raw

  // Remove markdown code fences
  processed = processed.replace(/```(?:mirror|dsl)?\n?/gi, '')
  processed = processed.replace(/```\s*$/gm, '')

  // Remove leading/trailing whitespace
  processed = processed.trim()

  // Remove any explanatory text before or after code
  // (This is a heuristic - might need refinement)
  const lines = processed.split('\n')
  const codeLines: string[] = []
  let inCode = false

  for (const line of lines) {
    // Detect start of code (component definition or instance)
    if (!inCode && (
      /^[A-Z][a-zA-Z0-9]*:?\s/.test(line) ||  // Component
      /^\$[a-z]/.test(line) ||                  // Token
      /^-\s+[A-Z]/.test(line) ||                // List item
      /^\s+[A-Z]/.test(line)                    // Indented child
    )) {
      inCode = true
    }

    if (inCode) {
      codeLines.push(line)
    }
  }

  return codeLines.length > 0 ? codeLines.join('\n') : processed
}

/**
 * Validate a response and return validation metadata
 */
function validateResponse(code: string): ResponseValidation {
  const validation: ResponseValidation = {
    parses: false,
    validates: false,
  }

  // Try parsing
  try {
    const parseResult = parse(code)

    if (parseResult.errors && parseResult.errors.length > 0) {
      validation.parseErrors = parseResult.errors.map(e => e.message || String(e))
    } else {
      validation.parses = true
    }

    // Collect components and properties
    if (parseResult.nodes) {
      validation.componentsFound = collectComponents(parseResult.nodes)
      validation.propertiesFound = collectProperties(parseResult.nodes)
    }

    // Collect tokens
    if (parseResult.tokens) {
      validation.tokensReferenced = Array.from(parseResult.tokens.keys())
    }
  } catch (err) {
    validation.parseErrors = [err instanceof Error ? err.message : String(err)]
  }

  // Try validation
  if (validation.parses) {
    try {
      const validationResult = validateCode(code)
      validation.validates = validationResult.valid

      if (validationResult.errors) {
        validation.validationIssues = validationResult.errors.map(e => ({
          line: e.line || 0,
          message: e.message,
          severity: 'error' as const,
        }))
      }
    } catch (err) {
      validation.validationIssues = [{
        line: 0,
        message: err instanceof Error ? err.message : String(err),
        severity: 'error' as const,
      }]
    }
  }

  return validation
}

// =============================================================================
// Helpers
// =============================================================================

function collectComponents(nodes: any[], result: Set<string> = new Set()): string[] {
  for (const node of nodes) {
    if (node.type) result.add(node.type)
    if (node.componentType) result.add(node.componentType)
    if (node.children) collectComponents(node.children, result)
  }
  return Array.from(result)
}

function collectProperties(nodes: any[], result: Set<string> = new Set()): string[] {
  for (const node of nodes) {
    if (node.properties) {
      Object.keys(node.properties).forEach(p => result.add(p))
    }
    if (node.children) collectProperties(node.children, result)
  }
  return Array.from(result)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// =============================================================================
// CLI Helper
// =============================================================================

/**
 * Format fixture status for display
 */
export function formatFixtureStatus(pipeline: string, cases: TestCase[]): string {
  const lines: string[] = []

  for (const testCase of cases) {
    const exists = fixtureExists(pipeline, testCase.id)
    const status = exists ? '✓' : '○'
    const skip = testCase.skip ? ' [SKIP]' : ''
    lines.push(`  ${status} ${testCase.id}${skip}`)
  }

  return lines.join('\n')
}
