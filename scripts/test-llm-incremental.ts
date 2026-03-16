/**
 * Incremental LLM Test Suite for Mirror Generation
 *
 * Tests progressively complex UI generation scenarios.
 * Each test has expectations that are validated.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import OpenAI from 'openai'
import { parse } from '../src/index'
import { MIRROR_SYSTEM_PROMPT } from '../src/llm/mirror-system-prompt'

dotenv.config()
dotenv.config({ path: path.join(process.cwd(), 'archive/v1-react-app/.env.local') })

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
const MODEL = process.env.LLM_MODEL || 'anthropic/claude-sonnet-4'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: API_KEY,
})

// ============================================================================
// Types
// ============================================================================

interface Expectation {
  name: string
  check: (code: string) => boolean
  required: boolean  // false = warning only
}

interface TestCase {
  id: string
  level: number  // 1 = basic, 2 = intermediate, 3 = advanced, 4 = complex
  name: string
  prompt: string
  expectations: Expectation[]
}

interface TestResult {
  id: string
  name: string
  level: number
  passed: boolean
  valid: boolean
  parseError?: string
  code: string
  expectationResults: {
    name: string
    passed: boolean
    required: boolean
  }[]
  failedRequired: string[]
  failedOptional: string[]
}

// ============================================================================
// Expectation Helpers
// ============================================================================

const hasTokens = (minCount: number): Expectation => ({
  name: `min ${minCount} tokens`,
  check: (code) => {
    const matches = code.match(/^\$[\w.]+:/gm) || []
    return matches.length >= minCount
  },
  required: true
})

const hasToken = (name: string): Expectation => ({
  name: `token ${name}`,
  check: (code) => code.includes(`${name}:`),
  required: true
})

const hasComponent = (name: string): Expectation => ({
  name: `component ${name}`,
  check: (code) => {
    // Check for component at any indentation level
    const regex = new RegExp(`^\\s*${name}:`, 'm')
    return regex.test(code)
  },
  required: true
})

const hasComponentAny = (names: string[]): Expectation => ({
  name: `component ${names.join('|')}`,
  check: (code) => names.some(name => {
    const regex = new RegExp(`^\\s*${name}:`, 'm')
    return regex.test(code)
  }),
  required: true
})

const hasState = (stateName: string): Expectation => ({
  name: `state ${stateName}`,
  check: (code) => code.includes(`state ${stateName}`),
  required: true
})

const hasStateAny = (stateNames: string[]): Expectation => ({
  name: `state ${stateNames.join('|')}`,
  check: (code) => stateNames.some(name => code.includes(`state ${name}`)),
  required: true
})

const hasEvent = (eventName: string): Expectation => ({
  name: `event ${eventName}`,
  check: (code) => code.includes(eventName),
  required: true
})

const hasAction = (actionName: string): Expectation => ({
  name: `action ${actionName}`,
  check: (code) => code.includes(actionName),
  required: true
})

const hasActionAny = (actionNames: string[]): Expectation => ({
  name: `action ${actionNames.join('|')}`,
  check: (code) => actionNames.some(name => code.includes(name)),
  required: true
})

const hasIcon = (iconName?: string): Expectation => ({
  name: iconName ? `icon "${iconName}"` : 'has icons',
  check: (code) => iconName
    ? code.includes(`"${iconName}"`) || code.includes(`Icon "${iconName}"`)
    : /Icon\s+"[\w-]+"/.test(code),
  required: true
})

const hasProperty = (prop: string): Expectation => ({
  name: `property ${prop}`,
  check: (code) => code.includes(prop),
  required: true
})

const hasPropertyOptional = (prop: string): Expectation => ({
  name: `property ${prop}`,
  check: (code) => code.includes(prop),
  required: false
})

const hasPropertyAny = (props: string[]): Expectation => ({
  name: `property ${props.join('|')}`,
  check: (code) => props.some(prop => code.includes(prop)),
  required: true
})

const hasSlots = (): Expectation => ({
  name: 'component slots',
  check: (code) => {
    // Look for component definitions with child definitions inside
    const componentBlocks = code.match(/^\w+:[\s\S]*?(?=\n\w+:|$)/gm) || []
    return componentBlocks.some(block => {
      const lines = block.split('\n')
      return lines.some((line, i) =>
        i > 0 && /^\s+\w+:/.test(line) && !/^\s+state\s/.test(line)
      )
    })
  },
  required: false
})

const hasKeyboardNav = (): Expectation => ({
  name: 'keyboard navigation',
  check: (code) => code.includes('keys') || code.includes('onkeydown'),
  required: true
})

const hasSemicolonSyntax = (): Expectation => ({
  name: 'semicolon child syntax',
  check: (code) => /\w+\s+\w+\s+"[^"]+"\s*;\s*\w+/.test(code),
  required: false
})

const hasMultipleInstances = (componentName: string, minCount: number): Expectation => ({
  name: `${minCount}+ ${componentName} instances`,
  check: (code) => {
    const regex = new RegExp(`^\\s*${componentName}\\s`, 'gm')
    const matches = code.match(regex) || []
    return matches.length >= minCount
  },
  required: true
})

const noHardcodedColors = (): Expectation => ({
  name: 'no hardcoded colors in components',
  check: (code) => {
    // Split into tokens section and rest
    const parts = code.split(/\/\/\s*Components?/i)
    if (parts.length < 2) return true
    const componentSection = parts[1]
    // Check for hardcoded hex colors (allow in tokens)
    const hardcoded = componentSection.match(/#[0-9A-Fa-f]{3,8}/)
    return !hardcoded
  },
  required: false
})

// ============================================================================
// Test Cases - Incremental Complexity
// ============================================================================

const TEST_CASES: TestCase[] = [
  // ========== LEVEL 1: Basic Components ==========
  {
    id: 'L1-01',
    level: 1,
    name: 'Simple Button',
    prompt: 'Ein einfacher Button mit Hover-Effekt',
    expectations: [
      hasTokens(3),
      hasComponent('Button'),
      hasState('hover'),
      hasProperty('cursor pointer'),
      hasProperty('pad'),
      hasProperty('rad'),
    ]
  },
  {
    id: 'L1-02',
    level: 1,
    name: 'Text with Styling',
    prompt: 'Ein Heading und ein Paragraph Text mit unterschiedlichen Styles',
    expectations: [
      hasTokens(2),
      hasProperty('font-size'),
      hasProperty('weight'),
      hasProperty('col'),
    ]
  },
  {
    id: 'L1-03',
    level: 1,
    name: 'Simple Card',
    prompt: 'Eine Card mit Titel, Beschreibung und abgerundeten Ecken',
    expectations: [
      hasTokens(3),
      hasComponent('Card'),
      hasProperty('pad'),
      hasProperty('rad'),
      hasProperty('bg'),
    ]
  },
  {
    id: 'L1-04',
    level: 1,
    name: 'Input Field',
    prompt: 'Ein Eingabefeld mit Placeholder und Focus-State',
    expectations: [
      hasTokens(3),
      hasComponent('Input') ,
      hasState('focus'),
      hasProperty('bor'),
    ]
  },

  // ========== LEVEL 2: Components with States ==========
  {
    id: 'L2-01',
    level: 2,
    name: 'Toggle Button',
    prompt: 'Ein Toggle-Button der bei Klick zwischen on und off wechselt. Bei Klick soll toggle ausgeführt werden.',
    expectations: [
      hasTokens(4),
      hasState('on'),  // 'off' is implicit default state
      hasEvent('onclick'),
      hasAction('toggle'),
    ]
  },
  {
    id: 'L2-02',
    level: 2,
    name: 'Selectable List Item',
    prompt: 'Ein Listen-Item das bei Klick selected wird und bei Hover hervorgehoben',
    expectations: [
      hasTokens(4),
      hasState('hover'),
      hasState('selected'),
      hasEvent('onclick'),
      hasAction('select'),
    ]
  },
  {
    id: 'L2-03',
    level: 2,
    name: 'Icon Button',
    prompt: 'Ein Button mit Icon und Text nebeneinander',
    expectations: [
      hasTokens(3),
      hasIcon(),
      hasProperty('hor'),
      hasProperty('gap'),
      hasState('hover'),
    ]
  },
  {
    id: 'L2-04',
    level: 2,
    name: 'Badge Component',
    prompt: 'Ein Badge/Tag Component in verschiedenen Varianten (default, success, danger)',
    expectations: [
      hasTokens(4),
      hasComponent('Badge'),
      hasToken('$success'),
      hasToken('$danger'),
    ]
  },

  // ========== LEVEL 3: Composite Components ==========
  {
    id: 'L3-01',
    level: 3,
    name: 'Navigation Item with Icon',
    prompt: 'Ein Navigations-Item mit Icon und Label als Child-Slots',
    expectations: [
      hasTokens(4),
      hasComponent('NavItem'),
      hasSlots(),
      hasIcon(),
      hasState('hover'),
    ]
  },
  {
    id: 'L3-02',
    level: 3,
    name: 'Card with Actions',
    prompt: 'Eine Card mit Titel, Content und Action-Buttons am unteren Rand. Verwende spread oder hor für das Layout der Buttons.',
    expectations: [
      hasTokens(5),
      hasComponent('Card'),
      hasSlots(),
      hasComponent('Button'),
      hasPropertyAny(['spread', 'hor']),
    ]
  },
  {
    id: 'L3-03',
    level: 3,
    name: 'Form Group',
    prompt: 'Eine Form-Gruppe mit Label, Input und Error-Message. Das Input soll einen state invalid haben der die Border rot färbt.',
    expectations: [
      hasTokens(4),
      hasComponent('FormGroup'),
      hasState('invalid'),
      hasProperty('ver'),
      hasProperty('gap'),
    ]
  },
  {
    id: 'L3-04',
    level: 3,
    name: 'Accordion Item',
    prompt: 'Ein Accordion-Item das bei Klick zwischen expanded und collapsed wechselt. onclick toggle verwenden.',
    expectations: [
      hasTokens(4),
      hasState('expanded'),
      // collapsed is the implicit default state
      hasEvent('onclick'),
      hasAction('toggle'),
    ]
  },

  // ========== LEVEL 4: Interactive Components ==========
  {
    id: 'L4-01',
    level: 4,
    name: 'Dropdown Menu',
    prompt: 'Ein Dropdown-Menü mit Trigger-Button, Liste von Optionen, Hover-Highlighting und Keyboard-Navigation (Escape schließt, Pfeiltasten navigieren)',
    expectations: [
      hasTokens(5),
      hasComponentAny(['Dropdown', 'DropdownMenu', 'Select', 'SelectMenu']),
      hasState('hover'),
      hasStateAny(['highlighted', 'active']),
      hasKeyboardNav(),
      hasEvent('onclick-outside'),
      hasAction('close'),
    ]
  },
  {
    id: 'L4-02',
    level: 4,
    name: 'Tab Navigation',
    prompt: 'Eine Tab-Navigation mit mehreren Tabs, der aktive Tab ist hervorgehoben, Klick wechselt den Tab',
    expectations: [
      hasTokens(5),
      hasComponentAny(['Tab', 'TabButton', 'TabItem']),
      hasStateAny(['active', 'selected']),
      hasEvent('onclick'),
      hasActionAny(['activate', 'select']),
    ]
  },
  {
    id: 'L4-03',
    level: 4,
    name: 'Sidebar Navigation',
    prompt: 'Eine komplette Sidebar mit Navigationsgruppen, jede Gruppe hat einen Titel und mehrere Nav-Items mit Icon und Text',
    expectations: [
      hasTokens(6),
      hasComponent('NavGroup'),
      hasComponent('NavItem'),
      hasIcon(),
      hasState('hover'),
      hasMultipleInstances('NavItem', 5),
      hasSemicolonSyntax(),
    ]
  },
  {
    id: 'L4-04',
    level: 4,
    name: 'Modal Dialog',
    prompt: 'Ein Modal-Dialog mit Overlay, Header mit Close-Button, Content-Bereich und Footer mit Action-Buttons. Escape schließt das Modal.',
    expectations: [
      hasTokens(6),
      hasComponent('Modal'),
      hasComponent('Overlay'),
      hasKeyboardNav(),
      hasIcon('x'),
      hasAction('close'),
      hasProperty('z'),
    ]
  },

  // ========== LEVEL 5: Complex UIs ==========
  {
    id: 'L5-01',
    level: 5,
    name: 'Login Form',
    prompt: 'Ein komplettes Login-Formular mit Email-Input, Passwort-Input (mit Show/Hide Toggle), Remember-Me Checkbox und Submit-Button. Verwende state invalid für Validierungsfehler.',
    expectations: [
      hasTokens(6),
      hasComponentAny(['Input', 'InputField', 'Field']),
      hasState('focus'),
      hasStateAny(['invalid', 'error']),
      hasAction('toggle'),
      hasComponent('Button'),
      hasEvent('onclick'),
    ]
  },
  {
    id: 'L5-02',
    level: 5,
    name: 'Data Table Row',
    prompt: 'Eine Tabellenzeile mit mehreren Spalten, Checkbox für Selektion, Hover-Effekt und Action-Buttons am Ende',
    expectations: [
      hasTokens(5),
      hasProperty('hor'),
      hasState('hover'),
      hasState('selected'),
      hasComponent('Checkbox'),
      hasIcon(),
    ]
  },
  {
    id: 'L5-03',
    level: 5,
    name: 'Command Palette',
    prompt: 'Eine Command-Palette (wie VS Code Cmd+P) mit Search-Input, gefilterte Liste von Commands, Keyboard-Navigation und Kategorien. Verwende state highlighted für das aktive Item.',
    expectations: [
      hasTokens(6),
      hasComponentAny(['Input', 'SearchInput', 'Search']),
      hasStateAny(['highlighted', 'selected', 'active']),
      hasKeyboardNav(),
      hasActionAny(['filter', 'highlight', 'select']),
      hasProperty('shadow'),
      hasProperty('z'),
    ]
  },
  {
    id: 'L5-04',
    level: 5,
    name: 'Full Dashboard Header',
    prompt: 'Ein Dashboard-Header mit Logo, Hauptnavigation (horizontal), Search-Input, Notifications-Icon mit Badge, und User-Avatar mit Dropdown-Menü',
    expectations: [
      hasTokens(7),
      hasProperty('hor'),
      hasProperty('spread'),
      hasComponentAny(['Input', 'SearchInput', 'Search']),
      hasIcon(),
      hasComponent('Badge'),
      hasComponentAny(['Dropdown', 'UserDropdown', 'UserMenu', 'ProfileDropdown', 'AvatarMenu']),
      hasState('hover'),
    ]
  },
]

// ============================================================================
// Test Runner
// ============================================================================

async function generateCode(prompt: string): Promise<{ code: string; error?: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: MIRROR_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    })

    let code = response.choices[0]?.message?.content || ''
    const match = code.match(/```(?:mirror)?\n([\s\S]*?)```/)
    if (match) code = match[1].trim()

    return { code }
  } catch (e) {
    return { code: '', error: e instanceof Error ? e.message : String(e) }
  }
}

async function runTest(testCase: TestCase): Promise<TestResult> {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`[${testCase.id}] ${testCase.name}`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`Prompt: ${testCase.prompt.substring(0, 80)}...`)

  const { code, error } = await generateCode(testCase.prompt)

  if (error) {
    console.log(`❌ Generation Error: ${error}`)
    return {
      id: testCase.id,
      name: testCase.name,
      level: testCase.level,
      passed: false,
      valid: false,
      parseError: error,
      code: '',
      expectationResults: [],
      failedRequired: ['generation failed'],
      failedOptional: [],
    }
  }

  // Validate parsing
  let valid = false
  let parseError: string | undefined

  try {
    parse(code)
    valid = true
    console.log(`✅ Parse: Valid`)
  } catch (e) {
    parseError = e instanceof Error ? e.message : String(e)
    console.log(`❌ Parse: ${parseError}`)
  }

  // Check expectations
  const expectationResults: TestResult['expectationResults'] = []
  const failedRequired: string[] = []
  const failedOptional: string[] = []

  for (const exp of testCase.expectations) {
    const passed = exp.check(code)
    expectationResults.push({
      name: exp.name,
      passed,
      required: exp.required,
    })

    const icon = passed ? '✅' : (exp.required ? '❌' : '⚠️')
    console.log(`${icon} ${exp.name}`)

    if (!passed) {
      if (exp.required) {
        failedRequired.push(exp.name)
      } else {
        failedOptional.push(exp.name)
      }
    }
  }

  const passed = valid && failedRequired.length === 0

  console.log(`\nResult: ${passed ? '✅ PASSED' : '❌ FAILED'}`)

  if (!passed && code) {
    console.log(`\n--- Generated Code ---`)
    console.log(code.substring(0, 500) + (code.length > 500 ? '...' : ''))
  }

  return {
    id: testCase.id,
    name: testCase.name,
    level: testCase.level,
    passed,
    valid,
    parseError,
    code,
    expectationResults,
    failedRequired,
    failedOptional,
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  // Parse arguments
  let maxLevel = 5
  let specificTest: string | undefined
  let stopOnFail = true

  for (const arg of args) {
    if (arg.startsWith('--level=')) {
      maxLevel = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--test=')) {
      specificTest = arg.split('=')[1]
    } else if (arg === '--no-stop') {
      stopOnFail = false
    } else if (arg === '--help') {
      console.log(`
Usage: npx tsx scripts/test-llm-incremental.ts [options]

Options:
  --level=N     Run tests up to level N (1-5, default: 5)
  --test=ID     Run specific test by ID (e.g., L1-01)
  --no-stop     Continue even if a test fails
  --help        Show this help

Levels:
  1 = Basic components (Button, Card, Input)
  2 = Components with states (Toggle, Selectable)
  3 = Composite components (NavItem, Form Group)
  4 = Interactive components (Dropdown, Modal)
  5 = Complex UIs (Login Form, Dashboard)
`)
      process.exit(0)
    }
  }

  if (!API_KEY) {
    console.error('Error: OPENROUTER_API_KEY not set')
    process.exit(1)
  }

  console.log('='.repeat(60))
  console.log('INCREMENTAL LLM TEST SUITE')
  console.log('='.repeat(60))
  console.log(`Model: ${MODEL}`)
  console.log(`Max Level: ${maxLevel}`)
  console.log(`Stop on Fail: ${stopOnFail}`)

  // Filter tests
  let tests = TEST_CASES.filter(t => t.level <= maxLevel)
  if (specificTest) {
    tests = tests.filter(t => t.id === specificTest)
  }

  console.log(`Tests to run: ${tests.length}`)

  const results: TestResult[] = []
  let passedCount = 0
  let failedCount = 0

  for (const test of tests) {
    const result = await runTest(test)
    results.push(result)

    if (result.passed) {
      passedCount++
    } else {
      failedCount++
      if (stopOnFail) {
        console.log(`\n⛔ Stopping due to failure (use --no-stop to continue)`)
        break
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('SUMMARY')
  console.log('='.repeat(60))

  console.log(`\nTotal: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`)

  // Group by level
  for (let level = 1; level <= maxLevel; level++) {
    const levelResults = results.filter(r => r.level === level)
    if (levelResults.length === 0) continue

    const levelPassed = levelResults.filter(r => r.passed).length
    const icon = levelPassed === levelResults.length ? '✅' : '❌'
    console.log(`\nLevel ${level}: ${icon} ${levelPassed}/${levelResults.length}`)

    for (const r of levelResults) {
      const icon = r.passed ? '✅' : '❌'
      console.log(`  ${icon} [${r.id}] ${r.name}`)
      if (!r.passed && r.failedRequired.length > 0) {
        console.log(`     Missing: ${r.failedRequired.join(', ')}`)
      }
    }
  }

  // Exit code
  process.exit(failedCount > 0 ? 1 : 0)
}

main()
