#!/usr/bin/env npx ts-node
/**
 * Quick Fixer Test Runner
 *
 * Run manually with: npx ts-node studio/agent/__tests__/run-fixer-test.ts
 *
 * Options:
 *   --mock     Use mock mode (fast, default)
 *   --real     Use real Claude CLI (slow)
 *   --debug    Enable debug logging
 *   --prompt   Custom prompt to test
 */

import {
  createFixerTestHarness,
  createMockFixerResponse,
  FixerTestHarness
} from './fixer-harness'

// ============================================
// PARSE ARGS
// ============================================

const args = process.argv.slice(2)
const useMock = !args.includes('--real')
const debug = args.includes('--debug')
const promptIndex = args.indexOf('--prompt')
const customPrompt = promptIndex >= 0 ? args[promptIndex + 1] : null

// ============================================
// TEST SCENARIOS
// ============================================

interface TestScenario {
  name: string
  files: Record<string, string>
  prompt: string
  mockResponse?: ReturnType<typeof createMockFixerResponse>
  expectedInFile?: { file: string; contains: string }
}

const scenarios: TestScenario[] = [
  {
    name: 'Simple Button',
    files: { 'app.mir': 'Box' },
    prompt: '/roter Button',
    mockResponse: createMockFixerResponse([
      { file: 'app.mir', action: 'replace', code: 'Box\n  Button "Click" bg red' }
    ], 'Button mit rotem Hintergrund erstellt'),
    expectedInFile: { file: 'app.mir', contains: 'bg red' }
  },
  {
    name: 'Create Component',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: '/Card Komponente mit Schatten',
    mockResponse: createMockFixerResponse([
      { file: 'components.com', action: 'replace', code: 'Card as Box:\n  pad 20\n  rad 12\n  shadow md' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  Card' }
    ], 'Card Komponente erstellt und verwendet'),
    expectedInFile: { file: 'components.com', contains: 'Card as Box' }
  },
  {
    name: 'Add Token',
    files: {
      'tokens.tok': '$primary: #3b82f6',
      'app.mir': 'Button bg $primary'
    },
    prompt: '/secondary Token hinzufügen',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'append', code: '$secondary: #22c55e' }
    ], 'Secondary Token hinzugefügt'),
    expectedInFile: { file: 'tokens.tok', contains: '$secondary' }
  },
  {
    name: 'Multi-File Change',
    files: {
      'app.mir': 'Box\n  Button "Click"',
      'tokens.tok': '$primary: #fff',
      'components.com': ''
    },
    prompt: '/PrimaryButton Komponente mit primary Farbe',
    mockResponse: createMockFixerResponse([
      { file: 'tokens.tok', action: 'replace', code: '$primary: #3b82f6' },
      { file: 'components.com', action: 'replace', code: 'PrimaryButton as Button:\n  bg $primary\n  col white' },
      { file: 'app.mir', action: 'replace', code: 'Box\n  PrimaryButton "Click"' }
    ], 'PrimaryButton Komponente erstellt'),
    expectedInFile: { file: 'components.com', contains: 'PrimaryButton as Button' }
  }
]

// ============================================
// RUN TESTS
// ============================================

async function runTest(scenario: TestScenario, index: number): Promise<boolean> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Test ${index + 1}: ${scenario.name}`)
  console.log(`${'='.repeat(60)}`)

  const harness = createFixerTestHarness({
    files: scenario.files,
    useMockCli: useMock,
    mockResponse: scenario.mockResponse,
    debug
  })

  try {
    console.log(`\nPrompt: ${scenario.prompt}`)
    console.log(`Files:`, Object.keys(scenario.files).join(', '))

    const result = await harness.runPrompt(scenario.prompt)

    console.log(`\nResult:`)
    console.log(`  Success: ${result.success ? '✅' : '❌'}`)
    console.log(`  Duration: ${result.duration}ms`)
    console.log(`  Files Changed: ${result.filesChanged.join(', ') || 'none'}`)
    console.log(`  Files Created: ${result.filesCreated.join(', ') || 'none'}`)

    if (result.error) {
      console.log(`  Error: ${result.error}`)
    }

    // Check expected content
    if (scenario.expectedInFile) {
      const content = harness.getFileContent(scenario.expectedInFile.file)
      const found = content?.includes(scenario.expectedInFile.contains)
      console.log(`\nExpected "${scenario.expectedInFile.contains}" in ${scenario.expectedInFile.file}: ${found ? '✅' : '❌'}`)

      if (!found && content) {
        console.log(`  Actual content: ${content.slice(0, 200)}...`)
      }

      return result.success && found === true
    }

    return result.success
  } finally {
    harness.dispose()
  }
}

async function runCustomTest(prompt: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Custom Test`)
  console.log(`${'='.repeat(60)}`)

  const harness = createFixerTestHarness({
    files: {
      'app.mir': 'Box\n  Text "Hello"',
      'tokens.tok': '$primary: #3b82f6',
      'components.com': ''
    },
    useMockCli: useMock,
    debug: true
  })

  try {
    console.log(`\nPrompt: ${prompt}`)
    console.log(`Mode: ${useMock ? 'Mock' : 'Real CLI'}`)

    const result = await harness.runPrompt(prompt)

    console.log(`\nResult:`)
    console.log(`  Success: ${result.success ? '✅' : '❌'}`)
    console.log(`  Duration: ${result.duration}ms`)
    console.log(`  Files Changed: ${result.filesChanged.join(', ') || 'none'}`)
    console.log(`  Files Created: ${result.filesCreated.join(', ') || 'none'}`)

    if (result.error) {
      console.log(`  Error: ${result.error}`)
    }

    if (result.response?.explanation) {
      console.log(`  Explanation: ${result.response.explanation}`)
    }

    console.log(`\nFinal Files:`)
    for (const [filename, content] of Object.entries(harness.getFiles())) {
      console.log(`\n--- ${filename} ---`)
      console.log(content || '(empty)')
    }

    console.log(`\nEvents:`)
    for (const event of result.events) {
      console.log(`  [${event.type}] ${event.content?.slice(0, 50) || event.error || ''}`)
    }
  } finally {
    harness.dispose()
  }
}

async function main(): Promise<void> {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Mirror Fixer Test Runner                        ║
║                                                           ║
║  Mode: ${useMock ? 'Mock (fast)' : 'Real CLI (slow)'}                                   ║
║  Debug: ${debug ? 'On' : 'Off'}                                              ║
╚═══════════════════════════════════════════════════════════╝
`)

  if (customPrompt) {
    await runCustomTest(customPrompt)
    return
  }

  let passed = 0
  let failed = 0

  for (let i = 0; i < scenarios.length; i++) {
    const success = await runTest(scenarios[i], i)
    if (success) {
      passed++
    } else {
      failed++
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Summary: ${passed} passed, ${failed} failed`)
  console.log(`${'='.repeat(60)}\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

// Run
main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
