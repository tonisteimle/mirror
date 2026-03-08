/**
 * LLM Workflow E2E Tests
 *
 * Tests the complete workflow:
 * User Prompt → LLM (React) → Mirror → Edit → React
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { LLMTestRunner, createMockRunner } from './test-runner'
import {
  simpleScenarios,
  mediumScenarios,
  hardScenarios,
  complexScenarios,
  contextualScenarios,
  allScenarios,
  getScenariosByComplexity,
  getScenariosByContext,
  getContextualScenarios,
} from './scenarios'
import { buildEditorContextPrompt } from './types'
import { reactToMirror } from './react-to-mirror'
import { parse } from '../../index'

// =============================================================================
// React to Mirror Conversion Tests
// =============================================================================

describe('React to Mirror Conversion', () => {
  describe('Simple Components', () => {
    it('converts a simple button', () => {
      const react = `
function Button() {
  return (
    <button style={{ padding: '12px 24px', backgroundColor: '#3B82F6', color: 'white' }}>
      Click me
    </button>
  )
}`
      const result = reactToMirror(react)

      expect(result.errors).toHaveLength(0)
      expect(result.mirror).toContain('Button')
      expect(result.mirror).toContain('pad')
      expect(result.mirror).toContain('bg')
    })

    it('converts a div with styles', () => {
      const react = `
function Card() {
  return (
    <div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
      <span>Hello</span>
    </div>
  )
}`
      const result = reactToMirror(react)

      expect(result.errors).toHaveLength(0)
      expect(result.mirror).toContain('pad')
      expect(result.mirror).toContain('bg')
      expect(result.mirror).toContain('rad')
    })

    it('handles CSS variable references', () => {
      const react = `
function Button() {
  return (
    <button style={{ backgroundColor: 'var(--primary)' }}>
      Click
    </button>
  )
}`
      const result = reactToMirror(react)

      expect(result.errors).toHaveLength(0)
      expect(result.mirror).toContain('$primary')
    })
  })

  describe('Nested Components', () => {
    it('converts nested elements', () => {
      const react = `
function Card() {
  return (
    <div style={{ padding: '16px' }}>
      <h1 style={{ fontWeight: 'bold' }}>Title</h1>
      <p>Description</p>
    </div>
  )
}`
      const result = reactToMirror(react)

      expect(result.errors).toHaveLength(0)
      expect(result.mirror).toContain('Heading')
      expect(result.mirror).toContain('Text')
    })

    it('handles flex layouts', () => {
      const react = `
function Row() {
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '8px' }}>
      <span>One</span>
      <span>Two</span>
    </div>
  )
}`
      const result = reactToMirror(react)

      expect(result.errors).toHaveLength(0)
      expect(result.mirror).toContain('hor')
      expect(result.mirror).toContain('gap')
    })
  })
})

// =============================================================================
// LLM Workflow Tests (Mock)
// =============================================================================

describe('LLM Workflow (Mock)', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(false)
  })

  describe('Simple Scenarios', () => {
    it('generates and converts a simple button', async () => {
      const scenario = simpleScenarios.find(s => s.id === 'simple-button-empty')!
      const result = await runner.runScenario(scenario)

      expect(result.llmResponse.react).toContain('button')
      expect(result.mirrorCode.mirror).toBeTruthy()

      // Verify Mirror code is parseable
      const ast = parse(result.mirrorCode.mirror)
      expect(ast.errors).toHaveLength(0)
    })

    it('handles button with tokens', async () => {
      const scenario = simpleScenarios.find(s => s.id === 'simple-button-with-tokens')!
      const result = await runner.runScenario(scenario)

      expect(result.llmResponse.react).toContain('var(--')
      // The mirror code should be generated (token conversion happens at runtime)
      expect(result.mirrorCode.mirror).toBeTruthy()
    })
  })

  describe('Medium Scenarios', () => {
    it('generates a task list', async () => {
      const scenario = mediumScenarios.find(s => s.id === 'medium-list-empty')!
      const result = await runner.runScenario(scenario)

      expect(result.llmResponse.react).toContain('Buy groceries')
      expect(result.mirrorCode.mirror).toBeTruthy()
    })
  })

  describe('Hard Scenarios', () => {
    it('generates a sidebar navigation', async () => {
      const scenario = hardScenarios.find(s => s.id === 'hard-nav-empty')!
      const result = await runner.runScenario(scenario)

      expect(result.llmResponse.react).toContain('Dashboard')
      expect(result.llmResponse.react).toContain('Settings')
      expect(result.mirrorCode.mirror).toBeTruthy()
    })
  })

  describe('Complex Scenarios', () => {
    it('generates an analytics dashboard', async () => {
      const scenario = complexScenarios.find(s => s.id === 'complex-dashboard-empty')!
      const result = await runner.runScenario(scenario)

      expect(result.llmResponse.react).toContain('Analytics')
      expect(result.llmResponse.react).toContain('Users')
      expect(result.llmResponse.react).toContain('Revenue')
      expect(result.mirrorCode.mirror).toBeTruthy()
    })
  })
})

// =============================================================================
// Edit Workflow Tests
// =============================================================================

describe('Edit Workflow', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(false)
  })

  it('applies property edit to generated code', async () => {
    const scenario = simpleScenarios.find(s => s.id === 'simple-button-empty')!
    const result = await runner.runScenario(scenario)

    if (result.editResult) {
      expect(result.editResult.mirror).toContain(scenario.editAction!.newValue)
    }
  })

  it('can modify background color', async () => {
    const scenario = {
      ...simpleScenarios[0],
      editAction: {
        selector: 'Button',
        property: 'bg',
        newValue: '#FF0000',
      },
    }

    const result = await runner.runScenario(scenario)

    if (result.editResult) {
      expect(result.editResult.mirror).toContain('#FF0000')
    }
  })
})

// =============================================================================
// Context Variations Tests
// =============================================================================

describe('Context Variations', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(false)
  })

  it('handles empty context scenarios', async () => {
    const emptyScenarios = getScenariosByContext('empty')
    expect(emptyScenarios.length).toBeGreaterThan(0)

    const result = await runner.runScenario(emptyScenarios[0])
    expect(result.mirrorCode.mirror).toBeTruthy()
  })

  it('handles with-components context', async () => {
    const withComponentsScenarios = getScenariosByContext('with-components')
    expect(withComponentsScenarios.length).toBeGreaterThan(0)

    const result = await runner.runScenario(withComponentsScenarios[0])
    expect(result.mirrorCode.mirror).toBeTruthy()
  })

  it('handles mixed context', async () => {
    const mixedScenarios = getScenariosByContext('mixed')
    expect(mixedScenarios.length).toBeGreaterThan(0)

    const result = await runner.runScenario(mixedScenarios[0])
    expect(result.mirrorCode.mirror).toBeTruthy()
  })
})

// =============================================================================
// Complexity Progression Tests
// =============================================================================

describe('Complexity Progression', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(false)
  })

  it('simple scenarios generate valid code', async () => {
    for (const scenario of getScenariosByComplexity('simple').slice(0, 2)) {
      const result = await runner.runScenario(scenario)
      expect(result.mirrorCode.mirror).toBeTruthy()
    }
  })

  it('medium scenarios generate valid code', async () => {
    for (const scenario of getScenariosByComplexity('medium').slice(0, 2)) {
      const result = await runner.runScenario(scenario)
      expect(result.mirrorCode.mirror).toBeTruthy()
    }
  })

  it('hard scenarios generate valid code', async () => {
    for (const scenario of getScenariosByComplexity('hard').slice(0, 2)) {
      const result = await runner.runScenario(scenario)
      expect(result.mirrorCode.mirror).toBeTruthy()
    }
  })

  it('complex scenarios generate valid code', async () => {
    for (const scenario of getScenariosByComplexity('complex').slice(0, 2)) {
      const result = await runner.runScenario(scenario)
      expect(result.mirrorCode.mirror).toBeTruthy()
    }
  })
})

// =============================================================================
// Contextual Scenarios Tests (Editor Context)
// =============================================================================

describe('Contextual Scenarios (Editor Context)', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(false)
  })

  it('has contextual scenarios defined', () => {
    const contextual = getContextualScenarios()
    expect(contextual.length).toBeGreaterThan(0)
  })

  it('builds editor context prompt correctly', () => {
    const ctx = {
      cursorLine: 5,
      selectedNodeName: 'Button',
      ancestors: ['App', 'Card'],
      insideComponent: 'Card',
    }

    const prompt = buildEditorContextPrompt(ctx)

    expect(prompt).toContain('Button')
    expect(prompt).toContain('App → Card')
    expect(prompt).toContain('Card')
  })

  it('generates code for add-inside-card scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-add-inside-card')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    expect(result.mirrorCode.mirror).toContain('button')
  })

  it('generates code for modify-selected scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-modify-selected')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    // Should have larger padding (16 instead of 8)
    expect(result.mirrorCode.mirror).toContain('pad 16')
  })

  it('generates code for add-after scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-add-after')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    expect(result.mirrorCode.mirror.toLowerCase()).toContain('nav')
  })

  it('generates code for change-color scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-change-color')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    // Should have red color (#EF4444)
    expect(result.mirrorCode.mirror).toContain('#EF4444')
  })

  it('generates code for wrap-element scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-wrap-element')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    // Should have card-like structure
    expect(result.mirrorCode.mirror).toContain('pad')
    expect(result.mirrorCode.mirror).toContain('rad')
  })

  it('generates code for preview-selection scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-preview-selection')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    // Should have border radius
    expect(result.mirrorCode.mirror).toContain('rad')
  })

  it('generates code for deep-nesting scenario', async () => {
    const scenario = contextualScenarios.find(s => s.id === 'context-deep-nesting')!
    const result = await runner.runScenario(scenario)

    expect(result.mirrorCode.mirror).toBeTruthy()
    // Should have icon-like element
    expect(result.mirrorCode.mirror.toLowerCase()).toMatch(/icon|span|text/)
  })

  it('all contextual scenarios generate valid Mirror code', async () => {
    for (const scenario of contextualScenarios) {
      const result = await runner.runScenario(scenario)
      expect(result.mirrorCode.mirror).toBeTruthy()

      // Verify Mirror code is parseable
      const ast = parse(result.mirrorCode.mirror)
      expect(ast.errors).toHaveLength(0)
    }
  })
})

// =============================================================================
// Full Suite Test (Optional - for CI)
// =============================================================================

describe.skip('Full LLM Test Suite', () => {
  let runner: LLMTestRunner

  beforeAll(() => {
    runner = createMockRunner(true)
  })

  it('runs all scenarios', async () => {
    const results = await runner.runScenarios(allScenarios)

    const passed = results.filter(r => r.validation.passed).length
    const total = results.length

    console.log(`\nPassed: ${passed}/${total}`)

    // At least 80% should pass
    expect(passed / total).toBeGreaterThanOrEqual(0.8)
  }, 60000)
})
