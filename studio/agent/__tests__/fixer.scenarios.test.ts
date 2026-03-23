/**
 * Fixer Scenario Tests
 *
 * Runs all defined test scenarios using Jest.
 * This allows integration with CI/CD pipelines.
 *
 * Run with: npm test -- --testPathPattern="fixer.scenarios"
 */

import {
  allScenarios,
  basicScenarios,
  stylingScenarios,
  layoutScenarios,
  componentScenarios,
  tokenScenarios,
  eventScenarios,
  stateScenarios,
  multiFileScenarios,
  edgeCaseScenarios,
  complexScenarios,
  validateResult,
  TestScenario
} from './test-scenarios'
import { createFixerTestHarness, FixerTestHarness } from './fixer-harness'

// ============================================
// HELPER
// ============================================

async function runScenario(scenario: TestScenario) {
  const harness = createFixerTestHarness({
    files: scenario.files,
    currentFile: scenario.currentFile,
    cursor: scenario.cursor,
    useMockCli: true,
    mockResponse: scenario.mockResponse
  })

  try {
    const result = await harness.runPrompt(scenario.prompt)
    const validation = validateResult(result, scenario.validate)

    return {
      result,
      validation,
      harness
    }
  } finally {
    harness.dispose()
  }
}

// ============================================
// BASIC SCENARIOS
// ============================================

describe('Basic Scenarios', () => {
  test.each(basicScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)

      if (!validation.passed) {
        console.error('Validation errors:', validation.errors)
      }

      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// STYLING SCENARIOS
// ============================================

describe('Styling Scenarios', () => {
  test.each(stylingScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// LAYOUT SCENARIOS
// ============================================

describe('Layout Scenarios', () => {
  test.each(layoutScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// COMPONENT SCENARIOS
// ============================================

describe('Component Scenarios', () => {
  test.each(componentScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// TOKEN SCENARIOS
// ============================================

describe('Token Scenarios', () => {
  test.each(tokenScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// EVENT SCENARIOS
// ============================================

describe('Event Scenarios', () => {
  test.each(eventScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// STATE SCENARIOS
// ============================================

describe('State Scenarios', () => {
  test.each(stateScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// MULTI-FILE SCENARIOS
// ============================================

describe('Multi-File Scenarios', () => {
  test.each(multiFileScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// EDGE CASE SCENARIOS
// ============================================

describe('Edge Case Scenarios', () => {
  test.each(edgeCaseScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// COMPLEX SCENARIOS
// ============================================

describe('Complex Scenarios', () => {
  test.each(complexScenarios.map(s => [s.id, s.name, s]))(
    '%s: %s',
    async (_id, _name, scenario) => {
      const { validation } = await runScenario(scenario)
      expect(validation.passed).toBe(true)
    }
  )
})

// ============================================
// STATISTICS
// ============================================

describe('Scenario Statistics', () => {
  test('should have correct number of scenarios', () => {
    expect(allScenarios.length).toBeGreaterThan(50)
    expect(basicScenarios.length).toBeGreaterThan(5)
    expect(stylingScenarios.length).toBeGreaterThan(5)
    expect(layoutScenarios.length).toBeGreaterThan(5)
    expect(componentScenarios.length).toBeGreaterThan(5)
    expect(tokenScenarios.length).toBeGreaterThan(5)
    expect(eventScenarios.length).toBeGreaterThan(5)
    expect(stateScenarios.length).toBeGreaterThan(5)
    expect(multiFileScenarios.length).toBeGreaterThan(2)
    expect(edgeCaseScenarios.length).toBeGreaterThan(5)
    expect(complexScenarios.length).toBeGreaterThan(3)
  })

  test('all scenarios should have unique IDs', () => {
    const ids = allScenarios.map(s => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('all scenarios should have required fields', () => {
    for (const scenario of allScenarios) {
      expect(scenario.id).toBeTruthy()
      expect(scenario.name).toBeTruthy()
      expect(scenario.category).toBeTruthy()
      expect(scenario.prompt).toBeTruthy()
      expect(scenario.files).toBeDefined()
      expect(scenario.mockResponse).toBeDefined()
      expect(scenario.validate).toBeDefined()
    }
  })

  test('all mock responses should have valid structure', () => {
    for (const scenario of allScenarios) {
      expect(scenario.mockResponse.changes).toBeDefined()
      expect(Array.isArray(scenario.mockResponse.changes)).toBe(true)

      for (const change of scenario.mockResponse.changes) {
        expect(change.file).toBeTruthy()
        expect(change.action).toBeTruthy()
        expect(['create', 'insert', 'append', 'replace']).toContain(change.action)
        expect(typeof change.code).toBe('string')
      }
    }
  })
})
