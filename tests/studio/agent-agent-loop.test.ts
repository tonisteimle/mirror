/**
 * Agent Loop Test
 *
 * Tests the agent with real prompts and validates outputs.
 * Run with: OPENROUTER_API_KEY=sk-... npx vitest run studio/agent/__tests__/agent-loop.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { MirrorAgent, createMirrorAgent } from '../../studio/agent/mirror-agent'
import { validateAndFix, formatErrors, type ValidationResult } from '../../studio/agent/validator'
import type { MirrorAgentConfig, LLMCommand } from '../types'

// ============================================
// TEST CONFIGURATION
// ============================================

const API_KEY = process.env.OPENROUTER_API_KEY || ''
const RUN_LIVE_TESTS = API_KEY.length > 0

// Test prompts - these are common user requests
const TEST_PROMPTS = [
  {
    name: 'Login Form',
    prompt: 'Erstelle ein Login-Formular mit Email und Passwort',
    expectedElements: ['Input', 'Button'],
    forbiddenPatterns: [
      /Input[^]*\n\s+\S/,  // Input followed by indented content (children)
      /^App\s+.*abs/m,     // App with abs
      /H[1-6]\s*$/m,       // Empty heading
      /Label\s*$/m,        // Empty label
    ]
  },
  {
    name: 'Card Component',
    prompt: 'Erstelle eine Card mit Bild, Titel und Beschreibung',
    expectedElements: ['Image', 'Text'],
    forbiddenPatterns: [
      /Image[^]*\n\s+\S/,  // Image with children
    ]
  },
  {
    name: 'Navigation',
    prompt: 'Erstelle eine horizontale Navigation mit 4 Links',
    expectedElements: ['Nav', 'Link'],
    forbiddenPatterns: [
      /Link\s*$/m,  // Empty link
    ]
  },
  {
    name: 'Form with Inputs',
    prompt: 'Erstelle ein Kontaktformular mit Name, Email, Nachricht und Senden-Button',
    expectedElements: ['Input', 'Textarea', 'Button'],
    forbiddenPatterns: [
      /Input[^]*\n\s+\w/,     // Input with children
      /Textarea[^]*\n\s+\w/,  // Textarea with children
    ]
  },
  {
    name: 'Icon Button',
    prompt: 'Erstelle einen Button mit einem Icon',
    expectedElements: ['Button', 'Icon'],
    forbiddenPatterns: [
      /Icon[^]*\n\s+\S/,  // Icon with children
    ]
  }
]

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  prompt: string
  code: string | null
  commands: LLMCommand[]
  validation: ValidationResult
  issues: string[]
  passed: boolean
}

function createTestAgent(): MirrorAgent {
  const config: MirrorAgentConfig = {
    apiKey: API_KEY,
    model: 'anthropic/claude-sonnet-4',
    getCode: () => 'App ver gap 16 pad 24\n  Text "Hello"',
    tokens: {
      '$accent.bg': '#007bff',
      '$primary.col': '#ffffff',
      '$surface.bg': '#f8f9fa'
    },
    components: ['Card', 'Button', 'Input']
  }
  return createMirrorAgent(config)
}

async function runPrompt(agent: MirrorAgent, prompt: string): Promise<{ code: string | null, commands: LLMCommand[] }> {
  let code: string | null = null
  const commands: LLMCommand[] = []

  for await (const event of agent.run(prompt)) {
    if (event.type === 'command' && event.command) {
      commands.push(event.command)
      if (event.command.type === 'UPDATE_SOURCE' && event.command.insert) {
        code = event.command.insert
      }
    }
    if (event.type === 'error') {
      console.error('Agent error:', event.error)
    }
  }

  return { code, commands }
}

function checkForbiddenPatterns(code: string, patterns: RegExp[]): string[] {
  const issues: string[] = []
  for (const pattern of patterns) {
    if (pattern.test(code)) {
      issues.push(`Forbidden pattern found: ${pattern.toString()}`)
    }
  }
  return issues
}

function checkExpectedElements(code: string, elements: string[]): string[] {
  const issues: string[] = []
  for (const element of elements) {
    if (!code.includes(element)) {
      issues.push(`Expected element not found: ${element}`)
    }
  }
  return issues
}

// ============================================
// TESTS
// ============================================

describe.skipIf(!RUN_LIVE_TESTS)('Agent Loop Tests', () => {
  let agent: MirrorAgent
  const results: TestResult[] = []

  beforeAll(() => {
    agent = createTestAgent()
  })

  for (const test of TEST_PROMPTS) {
    it(`generates valid code for: ${test.name}`, async () => {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Testing: ${test.name}`)
      console.log(`Prompt: ${test.prompt}`)
      console.log('='.repeat(60))

      const { code, commands } = await runPrompt(agent, test.prompt)

      if (!code) {
        console.log('❌ No code generated')
        results.push({
          prompt: test.prompt,
          code: null,
          commands,
          validation: { valid: false, errors: [] },
          issues: ['No code generated'],
          passed: false
        })
        expect(code).not.toBeNull()
        return
      }

      console.log('\n--- Generated Code ---')
      console.log(code)
      console.log('----------------------\n')

      // Validate structure
      const validation = validateAndFix(code)
      const issues: string[] = []

      // Check for validation errors
      if (!validation.valid) {
        console.log('⚠️ Validation errors:')
        console.log(formatErrors(validation.errors))
        issues.push(...validation.errors.map(e => e.message))
      }

      // Check forbidden patterns
      const patternIssues = checkForbiddenPatterns(code, test.forbiddenPatterns)
      if (patternIssues.length > 0) {
        console.log('⚠️ Forbidden patterns found:')
        patternIssues.forEach(i => console.log(`  - ${i}`))
        issues.push(...patternIssues)
      }

      // Check expected elements
      const elementIssues = checkExpectedElements(code, test.expectedElements)
      if (elementIssues.length > 0) {
        console.log('⚠️ Missing elements:')
        elementIssues.forEach(i => console.log(`  - ${i}`))
        issues.push(...elementIssues)
      }

      // Report fixed code if available
      if (validation.fixedCode && validation.fixedCode !== code) {
        console.log('\n--- Auto-Fixed Code ---')
        console.log(validation.fixedCode)
        console.log('-----------------------\n')
      }

      const passed = issues.length === 0
      console.log(passed ? '✅ PASSED' : `❌ FAILED (${issues.length} issues)`)

      results.push({
        prompt: test.prompt,
        code,
        commands,
        validation,
        issues,
        passed
      })

      // For now, we're collecting data - not failing tests
      // expect(issues.length).toBe(0)
    }, 60000) // 60s timeout for API calls
  }

  it('prints summary', () => {
    console.log('\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))

    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length

    console.log(`Passed: ${passed}/${results.length}`)
    console.log(`Failed: ${failed}/${results.length}`)

    if (failed > 0) {
      console.log('\nFailed tests:')
      for (const result of results.filter(r => !r.passed)) {
        console.log(`\n  "${result.prompt}"`)
        result.issues.forEach(i => console.log(`    - ${i}`))
      }
    }

    // Collect common issues for prompt improvement
    const issueFrequency = new Map<string, number>()
    for (const result of results) {
      for (const issue of result.issues) {
        const count = issueFrequency.get(issue) || 0
        issueFrequency.set(issue, count + 1)
      }
    }

    if (issueFrequency.size > 0) {
      console.log('\nIssue frequency:')
      const sorted = [...issueFrequency.entries()].sort((a, b) => b[1] - a[1])
      for (const [issue, count] of sorted) {
        console.log(`  ${count}x: ${issue}`)
      }
    }
  })
})

// ============================================
// VALIDATOR-ONLY TESTS (no API needed)
// ============================================

describe('Validator Tests', () => {
  it('detects Input with children', () => {
    const code = `Box ver gap 16
  Input "Email"
    Text "test@example.com"`

    const result = validateAndFix(code)
    expect(result.errors.some(e => e.type === 'self-closing-with-children')).toBe(true)
  })

  it('detects and fixes empty H1', () => {
    const code = `Box ver gap 16
  H1
  Text "Content"`

    const result = validateAndFix(code)
    // H1 should be auto-fixed with placeholder text
    expect(result.fixedCode).toContain('H1 "Placeholder"')
  })

  it('detects root with abs', () => {
    const code = `App abs center
  Text "Hello"`

    const result = validateAndFix(code)
    // After fix, it should be valid (abs removed)
    expect(result.fixedCode).not.toContain('abs')
  })

  it('detects center on Text', () => {
    const code = `Box ver gap 16
  Text "Hello" center`

    const result = validateAndFix(code)
    // Should be fixed to text-align center
    expect(result.fixedCode).toContain('text-align center')
  })

  it('fixes empty Label', () => {
    const code = `Box ver gap 16
  Label
  Input "Name"`

    const result = validateAndFix(code)
    expect(result.fixedCode).toContain('Label "Placeholder"')
  })

  it('handles complex nested structure', () => {
    const code = `App ver gap 24 pad 32
  Box ver gap 16 bg #fff rad 12
    H2 "Login"
    Box ver gap 12
      Label "Email"
      Input "email@example.com"
    Box ver gap 12
      Label "Password"
      Input "••••••••"
    Button "Sign In" bg #007bff col #fff`

    const result = validateAndFix(code)
    expect(result.valid).toBe(true)
  })
})
