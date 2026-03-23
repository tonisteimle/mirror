#!/usr/bin/env npx ts-node
/**
 * Inline Prompt Tests
 *
 * Testet den ECHTEN Use Case:
 * User tippt "/prompt" direkt im Code, Claude generiert passenden Code.
 *
 * Das ist der realistische Test - so wie es in der App funktioniert.
 *
 * Usage:
 *   npx ts-node studio/agent/__tests__/inline-prompt-tests.ts
 *   npx ts-node studio/agent/__tests__/inline-prompt-tests.ts --test card
 *   npx ts-node studio/agent/__tests__/inline-prompt-tests.ts --interactive
 */

import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// ============================================
// TYPES
// ============================================

interface InlinePromptTest {
  id: string
  name: string
  /** Code with /prompt line embedded */
  codeWithPrompt: string
  /** Additional project files */
  otherFiles?: Record<string, string>
  /** What to check in the result */
  expectations: {
    /** Should contain these strings */
    contains?: string[]
    /** Should NOT contain */
    notContains?: string[]
    /** Indentation should match context */
    checkIndentation?: boolean
    /** Custom check */
    custom?: (result: string) => { passed: boolean; message: string }
  }
}

interface TestResult {
  test: InlinePromptTest
  passed: boolean
  duration: number
  promptLine: number
  promptText: string
  generatedCode: string
  finalCode: string
  errors: string[]
}

// ============================================
// COLORS
// ============================================

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

// ============================================
// PROMPT EXTRACTION
// ============================================

function extractPromptInfo(code: string): {
  promptLine: number
  promptText: string
  promptIndent: number
  codeBefore: string
  codeAfter: string
  fullCode: string
} {
  const lines = code.split('\n')
  let promptLine = -1
  let promptText = ''
  let promptIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const match = line.match(/^(\s*)\/(.+)$/)
    if (match && !line.trim().startsWith('//')) {
      promptLine = i + 1 // 1-indexed
      promptIndent = match[1].length
      promptText = match[2].trim()
      break
    }
  }

  if (promptLine === -1) {
    throw new Error('Kein /prompt im Code gefunden')
  }

  const codeBefore = lines.slice(0, promptLine - 1).join('\n')
  const codeAfter = lines.slice(promptLine).join('\n')

  // Code without prompt line
  const codeWithoutPrompt = [...lines.slice(0, promptLine - 1), ...lines.slice(promptLine)].join('\n')

  return {
    promptLine,
    promptText,
    promptIndent,
    codeBefore,
    codeAfter,
    fullCode: codeWithoutPrompt
  }
}

// ============================================
// CONTEXT BUILDER
// ============================================

function buildContextualPrompt(
  test: InlinePromptTest,
  promptInfo: ReturnType<typeof extractPromptInfo>
): string {
  const { promptLine, promptText, promptIndent, codeBefore, codeAfter } = promptInfo

  // Calculate depth from indentation (2 spaces per level)
  const depth = Math.floor(promptIndent / 2)

  // Get parent context (what's the element we're inside?)
  const linesAbove = codeBefore.split('\n')
  let parentElement = ''
  for (let i = linesAbove.length - 1; i >= 0; i--) {
    const line = linesAbove[i]
    const lineIndent = (line.match(/^\s*/)?.[0] || '').length
    if (lineIndent < promptIndent && line.trim()) {
      parentElement = line.trim().split(/\s/)[0]
      break
    }
  }

  // Get siblings (elements at same level)
  const siblings: string[] = []
  for (const line of [...linesAbove.reverse().slice(0, 5), ...codeAfter.split('\n').slice(0, 5)]) {
    const lineIndent = (line.match(/^\s*/)?.[0] || '').length
    if (lineIndent === promptIndent && line.trim() && !line.trim().startsWith('/')) {
      const elementName = line.trim().split(/\s/)[0]
      if (elementName && !siblings.includes(elementName)) {
        siblings.push(elementName)
      }
    }
  }

  const otherFilesContext = test.otherFiles
    ? Object.entries(test.otherFiles)
        .map(([name, content]) => `--- ${name} ---\n${content}`)
        .join('\n\n')
    : ''

  return `Du bist ein Mirror DSL Code-Generator.

WICHTIG: Der User hat einen Inline-Prompt geschrieben - er tippt "/" direkt im Code.
Du musst Code generieren der GENAU AN DIESER STELLE passt.

MIRROR SYNTAX:
- Primitives: Box, Text, Button, Input, Image, Icon, Link, H1-H6
- Layout: hor, ver, gap N, center, spread, wrap, grid N
- Size: w/h full/hug/N, pad N
- Style: bg #hex, col #hex, rad N, bor N #hex, shadow sm/md/lg
- States: hover:, active:, disabled:
- Events: onclick:, onhover:

KOMPONENTEN (in .com Datei):
  Name as Primitive:
    properties

TOKENS (in .tok Datei):
  $name: value

KONTEXT:
- Prompt steht in Zeile ${promptLine}
- Einrückung: ${promptIndent} Leerzeichen (Tiefe: ${depth})
- Parent-Element: ${parentElement || 'root'}
- Geschwister-Elemente: ${siblings.join(', ') || 'keine'}

CODE VOR DEM PROMPT:
\`\`\`
${codeBefore || '(Dateianfang)'}
\`\`\`

CODE NACH DEM PROMPT:
\`\`\`
${codeAfter || '(Dateiende)'}
\`\`\`

${otherFilesContext ? `ANDERE DATEIEN:\n${otherFilesContext}\n` : ''}

USER PROMPT: ${promptText}

WICHTIG - Antworte NUR mit JSON:
{
  "explanation": "Kurze Erklärung",
  "code": "Der generierte Code (mit korrekter Einrückung: ${promptIndent} Leerzeichen)"
}

Der "code" wird die Prompt-Zeile ERSETZEN.
Er muss mit ${promptIndent} Leerzeichen eingerückt sein um zum Kontext zu passen.
Generiere NUR den Code für diese Stelle, nicht die ganze Datei.`
}

// ============================================
// CLI RUNNER
// ============================================

async function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    let error = ''

    // Ensure PATH includes common locations for claude CLI
    const env = {
      ...process.env,
      PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}`
    }

    const proc = spawn('claude', ['-p', prompt], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
      process.stdout.write(c.dim + '.' + c.reset)
    })

    proc.stderr.on('data', (data: Buffer) => {
      error += data.toString()
    })

    proc.on('close', (code) => {
      console.log('')
      if (code !== 0 && error) {
        reject(new Error(error))
      } else {
        resolve(output)
      }
    })

    proc.on('error', reject)

    // Timeout
    setTimeout(() => {
      proc.kill()
      reject(new Error('Timeout'))
    }, 120000)
  })
}

// ============================================
// RESPONSE PARSER
// ============================================

function parseResponse(output: string): { explanation: string; code: string } {
  const patterns = [
    /\{[\s\S]*"code"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
    /(\{[\s\S]*"code"[\s\S]*\})/
  ]

  for (const pattern of patterns) {
    const match = output.match(pattern)
    if (match) {
      try {
        // Try to parse as JSON
        const jsonStr = match[1].startsWith('{') ? match[1] : `{${match[0]}`
        const parsed = JSON.parse(output.match(/\{[\s\S]*\}/)?.[0] || '{}')
        if (parsed.code !== undefined) {
          // Unescape the code
          const code = parsed.code
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
          return {
            explanation: parsed.explanation || '',
            code
          }
        }
      } catch (e) {
        continue
      }
    }
  }

  // Fallback: try to extract code directly
  const codeMatch = output.match(/"code"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/)
  if (codeMatch) {
    return {
      explanation: '',
      code: codeMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
    }
  }

  throw new Error('Konnte Code nicht aus Antwort extrahieren')
}

// ============================================
// TEST RUNNER
// ============================================

async function runTest(test: InlinePromptTest): Promise<TestResult> {
  const startTime = Date.now()
  const errors: string[] = []

  console.log(`\n${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`)
  console.log(`${c.bold}${test.name}${c.reset} ${c.dim}(${test.id})${c.reset}`)

  // Extract prompt info
  const promptInfo = extractPromptInfo(test.codeWithPrompt)
  console.log(`${c.dim}Zeile ${promptInfo.promptLine}: /${promptInfo.promptText}${c.reset}`)
  console.log(`${c.dim}Einrückung: ${promptInfo.promptIndent} Leerzeichen${c.reset}`)

  // Show code with prompt highlighted
  console.log(`\n${c.dim}Code:${c.reset}`)
  const lines = test.codeWithPrompt.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const lineNum = (i + 1).toString().padStart(2)
    const isPromptLine = i + 1 === promptInfo.promptLine
    if (isPromptLine) {
      console.log(`${c.yellow}${lineNum}│ ${lines[i]}${c.reset}`)
    } else {
      console.log(`${c.dim}${lineNum}│${c.reset} ${lines[i]}`)
    }
  }

  // Build and send prompt
  const fullPrompt = buildContextualPrompt(test, promptInfo)

  console.log(`\n${c.dim}Sende an Claude...${c.reset}`)

  try {
    const output = await runClaude(fullPrompt)
    const duration = Date.now() - startTime

    console.log(`${c.dim}(${duration}ms)${c.reset}`)

    // Parse response
    const { explanation, code: generatedCode } = parseResponse(output)

    if (explanation) {
      console.log(`\n${c.blue}📝 ${explanation}${c.reset}`)
    }

    // Build final code (replace prompt line with generated code)
    const finalLines = [...lines]
    const generatedLines = generatedCode.split('\n')
    finalLines.splice(promptInfo.promptLine - 1, 1, ...generatedLines)
    const finalCode = finalLines.join('\n')

    // Show generated code
    console.log(`\n${c.green}Generierter Code:${c.reset}`)
    for (const line of generatedCode.split('\n')) {
      console.log(`${c.green}  + ${line}${c.reset}`)
    }

    // Show final result
    console.log(`\n${c.dim}Ergebnis:${c.reset}`)
    for (let i = 0; i < finalLines.length; i++) {
      const lineNum = (i + 1).toString().padStart(2)
      const isNew = i >= promptInfo.promptLine - 1 && i < promptInfo.promptLine - 1 + generatedLines.length
      if (isNew) {
        console.log(`${c.green}${lineNum}│ ${finalLines[i]}${c.reset}`)
      } else {
        console.log(`${c.dim}${lineNum}│${c.reset} ${finalLines[i]}`)
      }
    }

    // Validate
    console.log(`\n${c.dim}Validierung:${c.reset}`)

    // Check indentation
    if (test.expectations.checkIndentation !== false) {
      const firstGenLine = generatedCode.split('\n')[0]
      const genIndent = (firstGenLine.match(/^\s*/)?.[0] || '').length
      if (genIndent === promptInfo.promptIndent) {
        console.log(`${c.green}  ✓ Einrückung korrekt (${genIndent} Leerzeichen)${c.reset}`)
      } else {
        console.log(`${c.red}  ✗ Einrückung falsch: ${genIndent} statt ${promptInfo.promptIndent}${c.reset}`)
        errors.push(`Falsche Einrückung: ${genIndent} statt ${promptInfo.promptIndent}`)
      }
    }

    // Check contains
    if (test.expectations.contains) {
      for (const expected of test.expectations.contains) {
        if (generatedCode.toLowerCase().includes(expected.toLowerCase())) {
          console.log(`${c.green}  ✓ Enthält "${expected}"${c.reset}`)
        } else {
          console.log(`${c.red}  ✗ Enthält NICHT "${expected}"${c.reset}`)
          errors.push(`Fehlt: "${expected}"`)
        }
      }
    }

    // Check not contains
    if (test.expectations.notContains) {
      for (const notExpected of test.expectations.notContains) {
        if (!generatedCode.toLowerCase().includes(notExpected.toLowerCase())) {
          console.log(`${c.green}  ✓ Enthält nicht "${notExpected}"${c.reset}`)
        } else {
          console.log(`${c.red}  ✗ Enthält unerwünscht "${notExpected}"${c.reset}`)
          errors.push(`Unerwünscht: "${notExpected}"`)
        }
      }
    }

    // Custom check
    if (test.expectations.custom) {
      const result = test.expectations.custom(generatedCode)
      if (result.passed) {
        console.log(`${c.green}  ✓ ${result.message}${c.reset}`)
      } else {
        console.log(`${c.red}  ✗ ${result.message}${c.reset}`)
        errors.push(result.message)
      }
    }

    return {
      test,
      passed: errors.length === 0,
      duration,
      promptLine: promptInfo.promptLine,
      promptText: promptInfo.promptText,
      generatedCode,
      finalCode,
      errors
    }

  } catch (error: any) {
    console.log(`${c.red}✗ Fehler: ${error.message}${c.reset}`)
    return {
      test,
      passed: false,
      duration: Date.now() - startTime,
      promptLine: promptInfo.promptLine,
      promptText: promptInfo.promptText,
      generatedCode: '',
      finalCode: '',
      errors: [error.message]
    }
  }
}

// ============================================
// TEST CASES
// ============================================

const testCases: InlinePromptTest[] = [
  // ============================================
  // BASIC INLINE PROMPTS
  // ============================================
  {
    id: 'inline-basic-button',
    name: 'Button im Box hinzufügen',
    codeWithPrompt: `Box
  Text "Header"
  /blauer Button
  Text "Footer"`,
    expectations: {
      contains: ['Button', 'bg'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-nested',
    name: 'Element in tieferer Verschachtelung',
    codeWithPrompt: `Box
  Card
    Header
      /Icon für Schließen
    Content
      Text "Inhalt"`,
    expectations: {
      contains: ['Icon'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-root-level',
    name: 'Element auf Root-Level',
    codeWithPrompt: `Box
  Text "Eins"

/Navigation Header

Box
  Text "Zwei"`,
    expectations: {
      contains: ['Header', 'Nav'],
      custom: (code) => ({
        passed: !code.startsWith('  '),
        message: 'Keine Einrückung auf Root-Level'
      })
    }
  },
  {
    id: 'inline-after-sibling',
    name: 'Nach Geschwister-Element',
    codeWithPrompt: `Box hor gap 16
  Button "Eins"
  Button "Zwei"
  /dritter Button rot`,
    expectations: {
      contains: ['Button'],
      checkIndentation: true
    }
  },

  // ============================================
  // STYLING PROMPTS
  // ============================================
  {
    id: 'inline-style-card',
    name: 'Gestylte Card einfügen',
    codeWithPrompt: `Box ver gap 20
  /Card mit Schatten und abgerundeten Ecken
  Text "Danach"`,
    expectations: {
      contains: ['shadow', 'rad'],
      checkIndentation: true
    }
  },

  // ============================================
  // COMPONENT USAGE
  // ============================================
  {
    id: 'inline-use-component',
    name: 'Komponente verwenden',
    codeWithPrompt: `Box
  /verwende PrimaryButton Komponente`,
    otherFiles: {
      'components.com': `PrimaryButton as Button:
  bg #3b82f6
  col white
  pad 12 24
  rad 8`
    },
    expectations: {
      contains: ['PrimaryButton'],
      checkIndentation: true
    }
  },

  // ============================================
  // COMPLEX INLINE
  // ============================================
  {
    id: 'inline-form-field',
    name: 'Formular-Feld hinzufügen',
    codeWithPrompt: `Box ver gap 20 pad 40
  H2 "Login"
  Box ver gap 8
    Label "Email"
    Input placeholder "email@example.com"
  /Passwort Feld wie das Email Feld darüber
  Button "Anmelden"`,
    expectations: {
      contains: ['Label', 'Input', 'Passwort'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-grid-item',
    name: 'Grid Item hinzufügen',
    codeWithPrompt: `Box grid 3 gap 16
  Box bg #1a1a1a pad 20 rad 8
    Text "Item 1"
  Box bg #1a1a1a pad 20 rad 8
    Text "Item 2"
  /drittes Item gleicher Style`,
    expectations: {
      contains: ['Box', 'bg', 'pad'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-nav-item',
    name: 'Navigation Item',
    codeWithPrompt: `Nav hor gap 24
  Link "Home" href "/"
  Link "About" href "/about"
  /Kontakt Link`,
    expectations: {
      contains: ['Link', 'Kontakt'],
      checkIndentation: true
    }
  },

  // ============================================
  // EVENTS & STATES
  // ============================================
  {
    id: 'inline-add-event',
    name: 'Event hinzufügen',
    codeWithPrompt: `Box
  Button "Toggle"
    /bei klick Panel ein/ausblenden
  Box = Panel hidden
    Text "Content"`,
    expectations: {
      contains: ['onclick', 'toggle'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-add-hover',
    name: 'Hover State hinzufügen',
    codeWithPrompt: `Button "Hover me" bg #3b82f6
  /hover effekt dunkler`,
    expectations: {
      contains: ['hover:'],
      checkIndentation: true
    }
  },

  // ============================================
  // GERMAN PROMPTS (REALISTIC)
  // ============================================
  {
    id: 'inline-german-1',
    name: 'Deutscher Prompt - Überschrift',
    codeWithPrompt: `Box pad 40
  /große Überschrift "Willkommen"
  Text "Beschreibung"`,
    expectations: {
      contains: ['H1', 'Willkommen'],
      checkIndentation: true
    }
  },
  {
    id: 'inline-german-2',
    name: 'Deutscher Prompt - Layout',
    codeWithPrompt: `Box
  /zwei Buttons nebeneinander mit Abstand`,
    expectations: {
      contains: ['hor', 'Button'],
      checkIndentation: true
    }
  }
]

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const testFilter = args.find(a => a.startsWith('--test='))?.split('=')[1]
  const interactive = args.includes('--interactive')
  const saveResults = args.includes('--save')

  console.log(`
${c.cyan}╔═══════════════════════════════════════════════════════════╗
║         Inline Prompt Tests - ECHTER Use Case             ║
║                                                           ║
║  Testet: User tippt /prompt im Code                       ║
║  → Claude generiert passenden Code                        ║
║  → Code wird an der Stelle eingefügt                      ║
╚═══════════════════════════════════════════════════════════╝${c.reset}
`)

  // Check CLI
  try {
    await runClaude('echo test')
  } catch {
    console.error(`${c.red}❌ Claude CLI nicht verfügbar!${c.reset}`)
    process.exit(1)
  }
  console.log(`${c.green}✓${c.reset} Claude CLI verfügbar\n`)

  // Filter tests
  let tests = testCases
  if (testFilter) {
    tests = testCases.filter(t =>
      t.id.includes(testFilter) || t.name.toLowerCase().includes(testFilter.toLowerCase())
    )
    if (tests.length === 0) {
      console.error(`${c.red}Keine Tests für "${testFilter}"${c.reset}`)
      process.exit(1)
    }
  }

  console.log(`${c.bold}${tests.length} Tests${c.reset}\n`)

  // Run tests
  const results: TestResult[] = []

  for (const test of tests) {
    const result = await runTest(test)
    results.push(result)

    // Pause between tests to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000))
  }

  // Summary
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  const avgDuration = Math.round(results.reduce((s, r) => s + r.duration, 0) / results.length)

  console.log(`
${c.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}
${c.bold}ZUSAMMENFASSUNG${c.reset}

  Gesamt:        ${tests.length}
  Bestanden:     ${c.green}${passed}${c.reset}
  Fehlgeschlagen: ${failed > 0 ? c.red : c.green}${failed}${c.reset}
  Ø Dauer:       ${avgDuration}ms
`)

  if (failed > 0) {
    console.log(`${c.red}Fehlgeschlagene Tests:${c.reset}`)
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  ${c.red}✗${c.reset} ${r.test.name}`)
      for (const e of r.errors) {
        console.log(`    ${c.dim}→ ${e}${c.reset}`)
      }
    }
  }

  // Save results
  if (saveResults) {
    const resultsDir = path.join(__dirname, 'results')
    if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const file = path.join(resultsDir, `inline-prompt-${timestamp}.json`)

    fs.writeFileSync(file, JSON.stringify({
      timestamp,
      summary: { total: tests.length, passed, failed, avgDuration },
      results: results.map(r => ({
        id: r.test.id,
        name: r.test.name,
        passed: r.passed,
        duration: r.duration,
        prompt: r.promptText,
        generatedCode: r.generatedCode,
        errors: r.errors
      }))
    }, null, 2))

    console.log(`\n${c.dim}Gespeichert: ${file}${c.reset}`)
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(`${c.red}Fatal:${c.reset}`, err)
  process.exit(1)
})
