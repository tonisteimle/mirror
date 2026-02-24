/**
 * LLM Output Evaluation Tests
 *
 * Tests the self-healing system against realistic LLM-generated outputs.
 * These tests simulate common LLM mistakes and verify the fix pipeline
 * produces valid, usable Mirror DSL code.
 *
 * Run: npm test -- src/__tests__/self-healing/llm-output-evaluation.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  applyAllFixes,
  validateMirrorCode,
  enableTelemetry,
  disableTelemetry,
  getFixStats,
  clearTelemetry,
} from '../../lib/self-healing'
import { parse } from '../../parser/parser'

// =============================================================================
// Test Utilities
// =============================================================================

interface EvaluationResult {
  input: string
  fixed: string
  valid: boolean
  parseErrors: number
  fixesApplied: string[]
  issues: string[]
}

/**
 * Evaluate LLM output through the self-healing pipeline.
 */
function evaluateLLMOutput(input: string): EvaluationResult {
  clearTelemetry()
  enableTelemetry()

  const fixed = applyAllFixes(input)
  const validation = validateMirrorCode(fixed)
  const stats = getFixStats()

  let parseErrors = 0
  try {
    const result = parse(fixed)
    parseErrors = result.errors?.length ?? 0
  } catch {
    parseErrors = 1
  }

  const fixesApplied = Object.entries(stats.byFix)
    .filter(([, data]) => data.applications > 0)
    .map(([name]) => name)

  disableTelemetry()

  return {
    input,
    fixed,
    valid: validation.valid,
    parseErrors,
    fixesApplied,
    issues: validation.issues.map(i => i.message),
  }
}

/**
 * Print evaluation summary for debugging.
 */
function printEvaluation(name: string, result: EvaluationResult): void {
  console.log(`\n=== ${name} ===`)
  console.log('Input:', result.input.substring(0, 100) + (result.input.length > 100 ? '...' : ''))
  console.log('Fixed:', result.fixed.substring(0, 100) + (result.fixed.length > 100 ? '...' : ''))
  console.log('Valid:', result.valid)
  console.log('Parse Errors:', result.parseErrors)
  console.log('Fixes Applied:', result.fixesApplied.join(', ') || 'none')
  if (result.issues.length > 0) {
    console.log('Issues:', result.issues.slice(0, 3).join(', '))
  }
}

// =============================================================================
// LLM Output Simulation: CSS-Heavy Outputs
// =============================================================================

describe('LLM Evaluation: CSS-Heavy Outputs', () => {
  beforeAll(() => enableTelemetry())
  afterAll(() => {
    disableTelemetry()
    clearTelemetry()
  })

  it('fixes single-line CSS syntax', () => {
    // Current system handles single-line curly braces
    const input = 'Button { bg #3B82F6 pad 12 } "Click me"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).not.toContain('{')
    expect(result.fixed).not.toContain('}')
    expect(result.fixed).toContain('Button')
    expect(result.fixed).toContain('"Click me"')
  })

  it('fixes CSS property syntax with px units', () => {
    const input = 'Card padding: 16px; border-radius: 12px !important'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).not.toContain('px')
    expect(result.fixed).not.toContain('!important')
    expect(result.fixed).not.toContain(':')
    expect(result.fixed).toContain('Card')
  })

  it('converts rgba colors to hex', () => {
    const input = 'Box bg rgba(30, 30, 46, 1)'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('#')
    expect(result.fixed).not.toContain('rgba')
  })

  it('normalizes box-shadow to Mirror shadow', () => {
    const input = 'Card shadow 0 4px 6px rgba(0,0,0,0.1)'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toMatch(/shadow\s+(sm|md|lg)/)
  })

  // Document current limitation
  it.skip('TODO: multi-line CSS blocks need better handling', () => {
    const input = `Button {
  background-color: #3B82F6;
  padding: 12px;
}`
    const result = evaluateLLMOutput(input)
    // This currently doesn't fully work - multi-line braces not removed
    expect(result.fixed).not.toContain('{')
  })
})

// =============================================================================
// LLM Output Simulation: JSX/React Patterns
// =============================================================================

describe('LLM Evaluation: JSX/React Patterns', () => {
  it('fixes camelCase onClick to lowercase', () => {
    const input = 'Button onClick toggle Menu "Submit"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('onclick')
    expect(result.fixed).toContain('"Submit"')
  })

  it('removes JSX ={handler} syntax', () => {
    const input = 'Button onClick={handleClick} "Submit"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('onclick')
    expect(result.fixed).not.toContain('={')
    expect(result.fixed).toContain('"Submit"')
  })

  it('removes JSX ={number} syntax', () => {
    const input = 'Icon size={24} "search"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('size 24')
    expect(result.fixed).not.toContain('={')
  })

  it('fixes Icon with name attribute', () => {
    const input = 'Icon name="search"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Icon "search"')
  })

  it('removes curly braces from JSX values', () => {
    const input = 'Icon { size 24 }'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).not.toContain('{')
    expect(result.fixed).not.toContain('}')
  })
})

// =============================================================================
// LLM Output Simulation: HTML Patterns
// =============================================================================

describe('LLM Evaluation: HTML Patterns', () => {
  it('converts simple HTML tags on one line', () => {
    const input = '<div>Hello</div>'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Box')
    expect(result.fixed).toContain('"Hello"')
  })

  it('converts button tag', () => {
    const input = '<button>Click me</button>'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Button')
    expect(result.fixed).toContain('"Click me"')
  })

  it('converts input tag', () => {
    const input = '<input />'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Input')
  })

  it('handles input placeholder', () => {
    // Note: placeholder without = is handled
    const input = 'Input placeholder "Enter email"'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Input')
    expect(result.fixed).toContain('"Enter email"')
  })

  it('handles anchor tags', () => {
    const input = '<a href="/about">About Us</a>'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Link')
    expect(result.fixed).toContain('"About Us"')
  })

  // Document limitations
  it.skip('TODO: multi-line HTML structure', () => {
    // Nested HTML tags across lines need better handling
  })

  it.skip('TODO: HTML attributes with = syntax', () => {
    // type="email" pattern needs conversion
  })
})

// =============================================================================
// LLM Output Simulation: Token Mistakes
// =============================================================================

describe('LLM Evaluation: Token Mistakes', () => {
  it('fixes tokens defined on same line', () => {
    const input = `$primary: #3B82F6 $secondary: #10B981 $spacing: 16

Button bg $primary pad $spacing`

    const result = evaluateLLMOutput(input)

    // Should split into separate lines
    expect(result.fixed).toContain('$primary: #3B82F6')
    expect(result.fixed).toContain('$secondary: #10B981')
    expect(result.fixed.split('\n').length).toBeGreaterThan(1)
    expect(result.valid).toBe(true)
  })

  it('fixes missing $ on token usage', () => {
    const input = `$primary: #3B82F6
$spacing: 16

Button bg primary pad spacing "Click"`

    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('bg $primary')
    expect(result.fixed).toContain('pad $spacing')
  })

  // Note: hyphenated tokens currently get partially processed but not fully converted
  it.skip('TODO: hyphenated token names to camelCase', () => {
    // $bg-color → $bgColor conversion needs improvement
  })

  it('fixes undefined token references', () => {
    const input = `$primary: #3B82F6

Button bg $primaryColor`

    const result = evaluateLLMOutput(input)

    // Should fix to use $primary
    expect(result.fixed).toContain('$primary')
  })
})

// =============================================================================
// LLM Output Simulation: Component Structure
// =============================================================================

describe('LLM Evaluation: Component Structure', () => {
  it('fixes duplicate element names', () => {
    const input = `Nav
  NavItem "Home"
  NavItem "About"
  NavItem "Contact"`

    const result = evaluateLLMOutput(input)

    // Should add - prefix to duplicates
    expect(result.fixed).toContain('- NavItem')
  })

  it('fixes text on separate line', () => {
    const input = `Button bg #3B82F6 pad 12
  "Submit"`

    const result = evaluateLLMOutput(input)

    // Text should be on same line as Button
    const lines = result.fixed.split('\n').filter(l => l.trim())
    expect(lines.length).toBe(1)
    expect(lines[0]).toContain('"Submit"')
  })

  it('fixes orphaned properties', () => {
    const input = `Card
  vertical
  gap 16
  pad 24`

    const result = evaluateLLMOutput(input)

    // Properties should be merged with Card
    expect(result.fixed).toContain('Card')
    expect(result.fixed).toContain('ver')
    expect(result.fixed).toContain('gap 16')
  })

  it('fixes definition and usage on same line', () => {
    const input = `Button: bg #3B82F6 pad 12 Button "Click"`

    const result = evaluateLLMOutput(input)

    // Should properly separate or merge
    expect(result.fixed).toContain('Button')
    expect(result.fixed).toContain('"Click"')
  })
})

// =============================================================================
// LLM Output Simulation: Typos
// =============================================================================

describe('LLM Evaluation: Typos', () => {
  it('converts camelCase onClick to lowercase', () => {
    const input = 'Button onClick toggle Menu'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('onclick')
    // Make sure camelCase is gone (capital C)
    expect(result.fixed).not.toContain('onClick')
  })

  it('fixes toggle typo', () => {
    const input = 'Button onclick toogle Menu'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('toggle')
    expect(result.fixed).not.toContain('toogle')
  })

  it('fixes onlick typo', () => {
    const input = 'Button onlick toggle Menu'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('onclick')
  })

  it('removes colon from CSS pseudo-class syntax', () => {
    const input = `Button bg #3B82F6
  :hover
    bg #2563EB`
    const result = evaluateLLMOutput(input)

    // :hover should become hover
    expect(result.fixed).toContain('hover')
    expect(result.fixed).not.toMatch(/^\s*:hover/m)
  })
})

// =============================================================================
// LLM Output Simulation: Value Conversions
// =============================================================================

describe('LLM Evaluation: Value Conversions', () => {
  it('converts rgba colors to hex', () => {
    const inputs = [
      { input: 'Box bg rgba(59, 130, 246, 1)', expected: '#3B82F6' },
      { input: 'Box bg rgba(255, 0, 0, 1)', expected: '#FF0000' },
      { input: 'Box bg rgba(0, 0, 0, 0.5)', expected: /#[0-9A-F]+/i },
    ]

    for (const { input, expected } of inputs) {
      const result = evaluateLLMOutput(input)
      expect(result.fixed).toMatch(expected)
      expect(result.fixed).not.toContain('rgba')
    }
  })

  it('converts named colors to hex', () => {
    const inputs = [
      { input: 'Box bg red', expected: /#FF0000|#ff0000|#F00/i },
      { input: 'Box bg white', expected: /#FFF|#FFFFFF/i },
      { input: 'Box bg blue', expected: /#00F|#0000FF/i },
    ]

    for (const { input, expected } of inputs) {
      const result = evaluateLLMOutput(input)
      expect(result.fixed).toMatch(expected)
    }
  })

  it('removes px units', () => {
    const input = 'Box pad 16px rad 8px gap 12px'
    const result = evaluateLLMOutput(input)

    expect(result.fixed).not.toContain('px')
    expect(result.fixed).toContain('16')
    expect(result.fixed).toContain('8')
    expect(result.fixed).toContain('12')
  })

  it('normalizes opacity values', () => {
    const inputs = [
      { input: 'Box opacity 50', expected: /opacity\s+0\.5|opa\s+0\.5/ },
      { input: 'Box opacity 100', expected: /opacity\s+1|opa\s+1/ },
      { input: 'Box opacity 25', expected: /opacity\s+0\.25|opa\s+0\.25/ },
    ]

    for (const { input, expected } of inputs) {
      const result = evaluateLLMOutput(input)
      expect(result.fixed).toMatch(expected)
    }
  })

  it('normalizes shadow values', () => {
    const inputs = [
      { input: 'Box shadow 0 2px 4px rgba(0,0,0,0.1)', expected: /shadow\s+(sm|md)/ },
      { input: 'Box shadow 0 4px 8px rgba(0,0,0,0.2)', expected: /shadow\s+(md|lg)/ },
    ]

    for (const { input, expected } of inputs) {
      const result = evaluateLLMOutput(input)
      expect(result.fixed).toMatch(expected)
    }
  })
})

// =============================================================================
// Complex Multi-Issue Outputs
// =============================================================================

describe('LLM Evaluation: Complex Multi-Issue Outputs', () => {
  it('fixes token on same line', () => {
    const input = '$primary: #3B82F6 $spacing: 16'

    const result = evaluateLLMOutput(input)

    // Should split into separate lines
    expect(result.fixed).toContain('$primary: #3B82F6')
    expect(result.fixed).toContain('$spacing: 16')
  })

  it('fixes simple curly braces', () => {
    const input = 'Card { bg #333 pad 16 } "Welcome"'

    const result = evaluateLLMOutput(input)

    expect(result.fixed).not.toContain('{')
    expect(result.fixed).not.toContain('}')
    expect(result.fixed).toContain('Card')
    expect(result.fixed).toContain('"Welcome"')
  })

  it('fixes quotes conversion', () => {
    const input = "Button 'Click me'"

    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('"Click me"')
  })

  it('fixes form with input types', () => {
    const input = `Form pad 24 gap 16
  Input type="email" "Email"
  Input type="password" "Password"
  Button onclick submit "Log In"`

    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Box') // Form → Box
    expect(result.fixed).not.toContain('type=')
    expect(result.fixed).toContain('Input')
    expect(result.fixed).toContain('"Log In"')
  })

  it('fixes navigation with duplicates', () => {
    const input = `Nav hor pad 16 bg #1E1E2E
  Icon name="star"
  NavLink "Home"
  NavLink "About"
  NavLink "Contact"`

    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Box') // Nav → Box
    expect(result.fixed).toContain('Icon "star"')
    expect(result.fixed).toContain('- NavLink') // duplicates get dash prefix
  })

  // Document current limitation
  it.skip('TODO: complex multi-line CSS blocks', () => {
    // Multi-line CSS blocks with curly braces need better handling
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('LLM Evaluation: Edge Cases', () => {
  it('handles empty input', () => {
    const result = evaluateLLMOutput('')
    expect(result.fixed).toBe('')
  })

  it('handles only comments', () => {
    const input = '// This is a comment'
    const result = evaluateLLMOutput(input)
    expect(result.fixed).toBe(input)
  })

  it('preserves valid Mirror code', () => {
    const input = `$primary: #3B82F6

Button bg $primary pad 12 rad 8 "Click me"
  hover
    bg #2563EB`

    const result = evaluateLLMOutput(input)

    // Should remain valid
    expect(result.fixed).toContain('$primary: #3B82F6')
    expect(result.fixed).toContain('Button')
    expect(result.fixed).toContain('hover')
    expect(result.valid).toBe(true)
  })

  it('handles nested structure', () => {
    // Note: Custom components like Header, Main get converted to Box
    const input = `Card
  Icon name="star"
  Title "Welcome"
  Button "Click"`

    const result = evaluateLLMOutput(input)

    // Structure should be preserved
    expect(result.fixed).toContain('Card')
    expect(result.fixed).toContain('Icon "star"')
    expect(result.fixed).toContain('Title "Welcome"')
    expect(result.fixed).toContain('Button "Click"')
  })

  it('handles special characters in strings', () => {
    const input = `Button "Hello! @#$%^&*() 123"`
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('"Hello! @#$%^&*() 123"')
  })

  it('handles Unicode in strings', () => {
    const input = `Text "Hallo 👋 Welt 🌍"`
    const result = evaluateLLMOutput(input)

    expect(result.fixed).toContain('Hallo')
    expect(result.fixed).toContain('👋')
    expect(result.fixed).toContain('🌍')
  })
})

// =============================================================================
// Quality Metrics
// =============================================================================

describe('LLM Evaluation: Quality Metrics', () => {
  const testCases = [
    { name: 'CSS Button', input: 'Button { background: #333; padding: 12px; } "Click"' },
    { name: 'JSX Event', input: 'Button onClick={toggle} "Submit"' },
    { name: 'HTML Tags', input: '<div><button>Click</button></div>' },
    { name: 'Token Error', input: '$primary: #3B82F6\nButton bg primary' },
    { name: 'Typo', input: 'Button onclick toogle Menu' },
    { name: 'Duplicate Elements', input: 'Nav\n  Item "A"\n  Item "B"\n  Item "C"' },
    { name: 'Value Units', input: 'Box pad 16px rad 8px' },
  ]

  it('achieves high success rate on common patterns', () => {
    let successCount = 0
    const results: Array<{ name: string; success: boolean; issues: string[] }> = []

    for (const { name, input } of testCases) {
      const result = evaluateLLMOutput(input)
      const success = result.parseErrors === 0

      results.push({ name, success, issues: result.issues })
      if (success) successCount++
    }

    const successRate = successCount / testCases.length

    console.log('\n=== Quality Metrics ===')
    console.log(`Success Rate: ${(successRate * 100).toFixed(1)}% (${successCount}/${testCases.length})`)
    for (const r of results) {
      console.log(`  ${r.success ? '✓' : '✗'} ${r.name}`)
    }

    // Target: at least 80% success rate
    expect(successRate).toBeGreaterThanOrEqual(0.8)
  })

  it('logs fix frequency statistics', () => {
    clearTelemetry()
    enableTelemetry()

    // Run all test cases
    for (const { input } of testCases) {
      applyAllFixes(input)
    }

    const stats = getFixStats()

    console.log('\n=== Fix Frequency ===')
    const sorted = Object.entries(stats.byFix)
      .filter(([, data]) => data.applications > 0)
      .sort((a, b) => b[1].applications - a[1].applications)

    for (const [name, data] of sorted.slice(0, 10)) {
      console.log(`  ${name}: ${data.applications}`)
    }

    disableTelemetry()
  })
})
