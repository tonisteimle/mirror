#!/usr/bin/env npx ts-node
/**
 * Real CLI Quality Tests
 *
 * Tests the ACTUAL Claude CLI integration and validates
 * that generated Mirror code is correct and high quality.
 *
 * This is the REAL test - not mocks!
 *
 * Usage:
 *   npx ts-node studio/agent/__tests__/real-cli-tests.ts
 *   npx ts-node studio/agent/__tests__/real-cli-tests.ts --test button
 *   npx ts-node studio/agent/__tests__/real-cli-tests.ts --save  # Save results
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Import the parser for validation
// Note: Adjust path if needed
let parseSource: ((source: string) => any) | null = null
try {
  const parser = require('../../../src/parser/parser')
  parseSource = parser.parseSource || parser.parse
} catch (e) {
  console.warn('Parser not available, syntax validation disabled')
}

// ============================================
// TYPES
// ============================================

interface TestCase {
  id: string
  name: string
  /** Initial project state */
  files: Record<string, string>
  /** The prompt to send */
  prompt: string
  /** What we expect in the result */
  expectations: {
    /** Files that should be modified/created */
    files?: string[]
    /** Content that should appear */
    shouldContain?: string[]
    /** Content that should NOT appear */
    shouldNotContain?: string[]
    /** Should parse without errors */
    shouldParseParse?: boolean
    /** Custom validation function */
    customValidation?: (result: TestResult) => ValidationResult
  }
}

interface TestResult {
  testCase: TestCase
  success: boolean
  duration: number
  rawOutput: string
  parsedResponse: any | null
  parseError: string | null
  generatedFiles: Record<string, string>
  validationResults: ValidationResult[]
  cliError: string | null
}

interface ValidationResult {
  check: string
  passed: boolean
  message: string
}

// ============================================
// CLI RUNNER
// ============================================

async function runClaudeCli(prompt: string): Promise<{ output: string; error: string | null }> {
  return new Promise((resolve) => {
    let output = ''
    let error: string | null = null

    const proc = spawn('claude', ['-p', prompt], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      error = (error || '') + data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0 && !error) {
        error = `Process exited with code ${code}`
      }
      resolve({ output, error })
    })

    proc.on('error', (err) => {
      resolve({ output: '', error: err.message })
    })

    // Timeout after 2 minutes
    setTimeout(() => {
      proc.kill()
      resolve({ output, error: 'Timeout after 2 minutes' })
    }, 120000)
  })
}

// ============================================
// PROMPT BUILDER
// ============================================

function buildTestPrompt(testCase: TestCase): string {
  const systemPrompt = `Du bist ein Mirror DSL Code-Generator.

Mirror ist eine DSL für UI-Prototyping. Wichtige Syntax:

PRIMITIVES: Box, Text, Button, Input, Image, Icon, Link, H1-H6
LAYOUT: hor, ver, gap N, center, spread, wrap, grid N
SIZE: w/h full/hug/N, pad N, margin N
STYLE: bg #hex, col #hex, rad N, bor N #hex, shadow sm/md/lg
STATES: hover:, active:, disabled:, focus:
EVENTS: onclick:, onhover:, onkeydown key:

Komponenten: Name as Primitive:
Tokens: $name: value

WICHTIG: Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "explanation": "Kurze Erklärung",
  "changes": [
    {
      "file": "dateiname.mir",
      "action": "replace" | "insert" | "append" | "create",
      "code": "Der Mirror Code"
    }
  ]
}

Kein Markdown, keine Erklärungen außerhalb des JSON.`

  const filesContext = Object.entries(testCase.files)
    .map(([name, content]) => `--- ${name} ---\n${content || '(leer)'}`)
    .join('\n\n')

  return `${systemPrompt}

AKTUELLE DATEIEN:
${filesContext}

AUFGABE: ${testCase.prompt}

Antworte NUR mit dem JSON-Objekt.`
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseResponse(output: string): { parsed: any | null; error: string | null } {
  if (!output || output.trim().length === 0) {
    return { parsed: null, error: 'Leere Antwort' }
  }

  // Try to find JSON in the output
  const jsonPatterns = [
    // Direct JSON
    /^\s*(\{[\s\S]*\})\s*$/,
    // JSON in code block
    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
    // JSON anywhere
    /(\{[\s\S]*"changes"[\s\S]*\})/
  ]

  for (const pattern of jsonPatterns) {
    const match = output.match(pattern)
    if (match) {
      try {
        const parsed = JSON.parse(match[1])
        if (parsed.changes && Array.isArray(parsed.changes)) {
          return { parsed, error: null }
        }
      } catch (e) {
        continue
      }
    }
  }

  return { parsed: null, error: 'Kein valides JSON gefunden' }
}

// ============================================
// CODE VALIDATOR
// ============================================

function validateMirrorCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Basic syntax checks
  if (!code || code.trim().length === 0) {
    return { valid: false, errors: ['Code ist leer'] }
  }

  // Check for common syntax issues
  const lines = code.split('\n')
  let indentStack: number[] = [0]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Skip empty lines
    if (line.trim() === '') continue

    // Check indentation (should be multiples of 2)
    const indent = line.match(/^(\s*)/)?.[1].length || 0
    if (indent % 2 !== 0) {
      errors.push(`Zeile ${lineNum}: Ungültige Einrückung (${indent} Leerzeichen, sollte gerade sein)`)
    }

    // Check for common typos
    if (line.includes('backgorund') || line.includes('backgrund')) {
      errors.push(`Zeile ${lineNum}: Tippfehler "background"`)
    }
    if (line.includes('colro') || line.includes('clor')) {
      errors.push(`Zeile ${lineNum}: Tippfehler "color"`)
    }

    // Check for invalid property values
    const hexColorPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/
    if (line.includes('bg #') || line.includes('col #') || line.includes('boc #')) {
      const hasValidHex = hexColorPattern.test(line)
      if (!hasValidHex && !line.includes('$')) {
        // Allow token references
        const colorPart = line.match(/(bg|col|boc)\s+#\S+/)
        if (colorPart && !hexColorPattern.test(colorPart[0])) {
          errors.push(`Zeile ${lineNum}: Ungültiger Hex-Farbwert`)
        }
      }
    }
  }

  // Try actual parser if available
  if (parseSource) {
    try {
      parseSource(code)
    } catch (e: any) {
      errors.push(`Parser-Fehler: ${e.message}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// ============================================
// TEST RUNNER
// ============================================

async function runTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now()

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`▶ ${testCase.name}`)
  console.log(`  Prompt: ${testCase.prompt}`)

  // Build and send prompt
  const fullPrompt = buildTestPrompt(testCase)
  const { output, error: cliError } = await runClaudeCli(fullPrompt)

  const duration = Date.now() - startTime
  console.log(`  Dauer: ${duration}ms`)

  if (cliError) {
    console.log(`  ❌ CLI Fehler: ${cliError}`)
    return {
      testCase,
      success: false,
      duration,
      rawOutput: output,
      parsedResponse: null,
      parseError: cliError,
      generatedFiles: {},
      validationResults: [],
      cliError
    }
  }

  // Parse response
  const { parsed, error: parseError } = parseResponse(output)

  if (!parsed) {
    console.log(`  ❌ Parse Fehler: ${parseError}`)
    console.log(`  Raw Output (first 500 chars):`)
    console.log(`  ${output.slice(0, 500)}`)
    return {
      testCase,
      success: false,
      duration,
      rawOutput: output,
      parsedResponse: null,
      parseError,
      generatedFiles: {},
      validationResults: [],
      cliError: null
    }
  }

  console.log(`  ✓ Antwort geparst: ${parsed.changes?.length || 0} Änderungen`)

  if (parsed.explanation) {
    console.log(`  📝 "${parsed.explanation}"`)
  }

  // Extract generated files
  const generatedFiles: Record<string, string> = { ...testCase.files }
  for (const change of parsed.changes || []) {
    if (change.action === 'replace' || change.action === 'create') {
      generatedFiles[change.file] = change.code
    } else if (change.action === 'append') {
      generatedFiles[change.file] = (generatedFiles[change.file] || '') + '\n\n' + change.code
    }
  }

  // Run validations
  const validationResults: ValidationResult[] = []

  // Check if expected files were modified
  if (testCase.expectations.files) {
    for (const expectedFile of testCase.expectations.files) {
      const wasModified = parsed.changes?.some((c: any) => c.file === expectedFile)
      validationResults.push({
        check: `Datei "${expectedFile}" modifiziert`,
        passed: wasModified,
        message: wasModified ? 'OK' : `Datei "${expectedFile}" wurde nicht modifiziert`
      })
    }
  }

  // Check content expectations
  if (testCase.expectations.shouldContain) {
    for (const expected of testCase.expectations.shouldContain) {
      const allCode = Object.values(generatedFiles).join('\n')
      const found = allCode.toLowerCase().includes(expected.toLowerCase())
      validationResults.push({
        check: `Enthält "${expected}"`,
        passed: found,
        message: found ? 'OK' : `"${expected}" nicht gefunden`
      })
    }
  }

  if (testCase.expectations.shouldNotContain) {
    for (const notExpected of testCase.expectations.shouldNotContain) {
      const allCode = Object.values(generatedFiles).join('\n')
      const found = allCode.toLowerCase().includes(notExpected.toLowerCase())
      validationResults.push({
        check: `Enthält NICHT "${notExpected}"`,
        passed: !found,
        message: found ? `"${notExpected}" sollte nicht enthalten sein` : 'OK'
      })
    }
  }

  // Validate Mirror syntax
  if (testCase.expectations.shouldParseParse !== false) {
    for (const [filename, code] of Object.entries(generatedFiles)) {
      if (filename.endsWith('.mir') || filename.endsWith('.com') || filename.endsWith('.tok')) {
        const { valid, errors } = validateMirrorCode(code)
        validationResults.push({
          check: `${filename} ist valider Mirror-Code`,
          passed: valid,
          message: valid ? 'OK' : errors.join('; ')
        })
      }
    }
  }

  // Custom validation
  if (testCase.expectations.customValidation) {
    const customResult = testCase.expectations.customValidation({
      testCase,
      success: true, // preliminary
      duration,
      rawOutput: output,
      parsedResponse: parsed,
      parseError: null,
      generatedFiles,
      validationResults,
      cliError: null
    })
    validationResults.push(customResult)
  }

  // Determine overall success
  const allPassed = validationResults.every(v => v.passed)

  // Print validation results
  for (const v of validationResults) {
    const icon = v.passed ? '✓' : '✗'
    const color = v.passed ? '\x1b[32m' : '\x1b[31m'
    console.log(`  ${color}${icon}\x1b[0m ${v.check}`)
    if (!v.passed) {
      console.log(`    → ${v.message}`)
    }
  }

  // Show generated code
  console.log(`\n  Generierter Code:`)
  for (const [filename, code] of Object.entries(generatedFiles)) {
    if (code !== testCase.files[filename]) {
      console.log(`  ┌── ${filename} ${'─'.repeat(40)}`)
      const lines = code.split('\n').slice(0, 15)
      for (const line of lines) {
        console.log(`  │ ${line}`)
      }
      if (code.split('\n').length > 15) {
        console.log(`  │ ... (${code.split('\n').length - 15} weitere Zeilen)`)
      }
      console.log(`  └${'─'.repeat(50)}`)
    }
  }

  return {
    testCase,
    success: allPassed,
    duration,
    rawOutput: output,
    parsedResponse: parsed,
    parseError: null,
    generatedFiles,
    validationResults,
    cliError: null
  }
}

// ============================================
// TEST CASES
// ============================================

const testCases: TestCase[] = [
  // ============================================
  // BASIC TESTS
  // ============================================
  {
    id: 'basic-button',
    name: 'Einfacher Button',
    files: { 'app.mir': 'Box' },
    prompt: 'Füge einen Button mit Text "Klick mich" hinzu',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['Button', 'Klick mich']
    }
  },
  {
    id: 'basic-styled-button',
    name: 'Gestylter Button',
    files: { 'app.mir': 'Box' },
    prompt: 'Erstelle einen blauen Button mit weißem Text und abgerundeten Ecken',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['Button', 'bg', 'col', 'rad']
    }
  },
  {
    id: 'basic-card',
    name: 'Card mit Inhalt',
    files: { 'app.mir': 'Box' },
    prompt: 'Erstelle eine Card mit Titel "Willkommen" und einem kurzen Text darunter',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['Willkommen']
    }
  },

  // ============================================
  // LAYOUT TESTS
  // ============================================
  {
    id: 'layout-horizontal',
    name: 'Horizontales Layout',
    files: { 'app.mir': 'Box\n  Button "A"\n  Button "B"\n  Button "C"' },
    prompt: 'Ordne die Buttons horizontal mit 16px Abstand an',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['hor', 'gap']
    }
  },
  {
    id: 'layout-grid',
    name: 'Grid Layout',
    files: { 'app.mir': 'Box' },
    prompt: 'Erstelle ein 3-Spalten Grid mit 4 Box-Elementen',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['grid']
    }
  },
  {
    id: 'layout-center',
    name: 'Zentrierter Inhalt',
    files: { 'app.mir': 'Box\n  Text "Center me"' },
    prompt: 'Zentriere den Text horizontal und vertikal',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['center']
    }
  },

  // ============================================
  // COMPONENT TESTS
  // ============================================
  {
    id: 'comp-create',
    name: 'Komponente erstellen',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: 'Erstelle eine PrimaryButton Komponente mit blauem Hintergrund',
    expectations: {
      files: ['components.com'],
      shouldContain: ['PrimaryButton', 'as', 'Button', 'bg']
    }
  },
  {
    id: 'comp-card',
    name: 'Card Komponente',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: 'Erstelle eine Card Komponente mit Padding, Schatten und abgerundeten Ecken',
    expectations: {
      files: ['components.com'],
      shouldContain: ['Card', 'as', 'pad', 'shadow', 'rad']
    }
  },

  // ============================================
  // TOKEN TESTS
  // ============================================
  {
    id: 'token-colors',
    name: 'Farb-Tokens',
    files: {
      'app.mir': 'Button bg #3b82f6',
      'tokens.tok': ''
    },
    prompt: 'Extrahiere die Farbe als $primary Token und verwende ihn',
    expectations: {
      files: ['tokens.tok', 'app.mir'],
      shouldContain: ['$primary']
    }
  },

  // ============================================
  // EVENT TESTS
  // ============================================
  {
    id: 'event-click',
    name: 'Click Event',
    files: { 'app.mir': 'Box\n  Button "Toggle"\n  Box = Panel\n    Text "Content"' },
    prompt: 'Der Button soll das Panel ein- und ausblenden',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['onclick', 'toggle']
    }
  },

  // ============================================
  // STATE TESTS
  // ============================================
  {
    id: 'state-hover',
    name: 'Hover State',
    files: { 'app.mir': 'Button "Hover me" bg #3b82f6' },
    prompt: 'Füge einen Hover-Effekt hinzu der die Farbe dunkler macht',
    expectations: {
      files: ['app.mir'],
      shouldContain: ['hover:']
    }
  },

  // ============================================
  // COMPLEX TESTS
  // ============================================
  {
    id: 'complex-login',
    name: 'Login Formular',
    files: {
      'app.mir': 'Box',
      'components.com': '',
      'tokens.tok': ''
    },
    prompt: 'Erstelle ein Login-Formular mit Email-Input, Passwort-Input und Submit-Button. Verwende Komponenten und Tokens.',
    expectations: {
      shouldContain: ['Input', 'Button', 'Email', 'Passwort']
    }
  },
  {
    id: 'complex-nav',
    name: 'Navigation Header',
    files: {
      'app.mir': 'Box',
      'components.com': ''
    },
    prompt: 'Erstelle einen Header mit Logo links, Navigation-Links in der Mitte und einem CTA-Button rechts',
    expectations: {
      shouldContain: ['hor', 'spread']
    }
  }
]

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2)
  const testFilter = args.find(a => a.startsWith('--test='))?.split('=')[1]
  const saveResults = args.includes('--save')

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Mirror Fixer - ECHTE CLI Tests                    ║
║                                                           ║
║  Diese Tests verwenden die echte Claude CLI!              ║
║  Jeder Test macht einen API-Call.                         ║
╚═══════════════════════════════════════════════════════════╝
`)

  // Check CLI availability
  const { error: checkError } = await runClaudeCli('echo test')
  if (checkError && !checkError.includes('echo')) {
    console.error('❌ Claude CLI nicht verfügbar!')
    console.error('   Bitte installieren: https://github.com/anthropics/claude-code')
    process.exit(1)
  }
  console.log('✓ Claude CLI verfügbar\n')

  // Filter tests
  let testsToRun = testCases
  if (testFilter) {
    testsToRun = testCases.filter(t =>
      t.id.includes(testFilter) || t.name.toLowerCase().includes(testFilter.toLowerCase())
    )
    if (testsToRun.length === 0) {
      console.error(`Keine Tests gefunden für: ${testFilter}`)
      process.exit(1)
    }
  }

  console.log(`Führe ${testsToRun.length} Tests aus...\n`)

  // Run tests
  const results: TestResult[] = []
  let passed = 0
  let failed = 0

  for (const testCase of testsToRun) {
    const result = await runTest(testCase)
    results.push(result)

    if (result.success) {
      passed++
    } else {
      failed++
    }
  }

  // Summary
  console.log(`
${'═'.repeat(60)}

ZUSAMMENFASSUNG

  Gesamt:    ${testsToRun.length}
  Bestanden: \x1b[32m${passed}\x1b[0m
  Fehlgeschlagen: \x1b[31m${failed}\x1b[0m

  Durchschnittliche Dauer: ${Math.round(results.reduce((s, r) => s + r.duration, 0) / results.length)}ms
`)

  // Failed tests
  const failedTests = results.filter(r => !r.success)
  if (failedTests.length > 0) {
    console.log('Fehlgeschlagene Tests:')
    for (const r of failedTests) {
      console.log(`  ✗ ${r.testCase.name}`)
      for (const v of r.validationResults.filter(v => !v.passed)) {
        console.log(`    - ${v.message}`)
      }
      if (r.cliError) {
        console.log(`    - CLI: ${r.cliError}`)
      }
      if (r.parseError) {
        console.log(`    - Parse: ${r.parseError}`)
      }
    }
  }

  // Save results
  if (saveResults) {
    const resultsDir = path.join(__dirname, 'results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir)
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const resultsFile = path.join(resultsDir, `test-results-${timestamp}.json`)

    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp,
      summary: { total: testsToRun.length, passed, failed },
      results: results.map(r => ({
        id: r.testCase.id,
        name: r.testCase.name,
        success: r.success,
        duration: r.duration,
        generatedFiles: r.generatedFiles,
        validations: r.validationResults
      }))
    }, null, 2))

    console.log(`\nErgebnisse gespeichert: ${resultsFile}`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
