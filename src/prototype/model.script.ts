/**
 * Abstract Model for Natural Language → Mirror Translation
 *
 * Pure logic test without UI - simulates the document model,
 * line processing, indentation handling, and context building.
 */

import { classifyInput } from './classifier'

// ============================================
// DOCUMENT MODEL
// ============================================

interface Line {
  content: string
  indent: number  // Number of spaces
  status: 'pending' | 'translating' | 'done' | 'skipped'
  original?: string
  translated?: string
}

class Document {
  lines: Line[] = []

  constructor(text: string = '') {
    if (text) this.parse(text)
  }

  parse(text: string) {
    this.lines = text.split('\n').map(raw => ({
      content: raw.trimStart(),
      indent: raw.length - raw.trimStart().length,
      status: 'pending'
    }))
  }

  toString(): string {
    return this.lines.map(l => ' '.repeat(l.indent) + l.content).join('\n')
  }

  getLine(index: number): Line | undefined {
    return this.lines[index]
  }

  updateLine(index: number, translated: string, baseIndent: number) {
    const line = this.lines[index]
    if (!line) return

    const translatedLines = translated.split('\n')

    // Update first line in place
    line.original = line.content
    line.content = translatedLines[0]
    line.status = 'done'

    // Insert additional lines after
    if (translatedLines.length > 1) {
      const newLines: Line[] = translatedLines.slice(1).map(content => ({
        content: content.trim(),
        indent: baseIndent + 2, // Children get +2 indent
        status: 'done' as const,
      }))
      this.lines.splice(index + 1, 0, ...newLines)
    }
  }
}

// ============================================
// CONTEXT BUILDER
// ============================================

function buildContext(doc: Document, targetIndex: number): string {
  const start = Math.max(0, targetIndex - 5)
  const end = Math.min(doc.lines.length, targetIndex + 6)

  return doc.lines.slice(start, end).map((line, i) => {
    const actualIndex = start + i
    const prefix = actualIndex === targetIndex ? '>>> ' : '    '
    return prefix + ' '.repeat(line.indent) + line.content
  }).join('\n')
}

// ============================================
// LINE PROCESSOR
// ============================================

function shouldTranslate(line: Line): { translate: boolean; reason: string } {
  const content = line.content.trim()

  // Empty line
  if (!content) {
    return { translate: false, reason: 'empty' }
  }

  // Literal string
  if (content.startsWith('"') && content.endsWith('"')) {
    return { translate: false, reason: 'literal' }
  }

  // Classify
  const classification = classifyInput(content)

  if (classification === 'mirror') {
    return { translate: false, reason: 'already-dsl' }
  }

  return { translate: true, reason: classification }
}

// ============================================
// MOCK TRANSLATOR (simulates LLM)
// ============================================

const MOCK_TRANSLATIONS: Record<string, string> = {
  'blaues rechteck': 'Box: background #3B82F6',
  'roter button': 'Button background #EF4444 color white padding 12 24 radius 8 "Button"',
  'sidebar': 'Sidebar: vertical width 240 background #1E1E2E',
  'navigation mit 3 items': 'Nav: horizontal gap 16\n  - Link "Home"\n  - Link "About"\n  - Link "Contact"',
  'karte mit titel': 'Card: vertical padding 16 background #2A2A3E radius 12\n  Title: size 18 weight 600 "Titel"',
  'formular': 'Form: vertical gap 12',
  'email eingabe': 'Input Email: "E-Mail" type email padding 12 background #2A2A3E radius 8',
  'passwort eingabe': 'Input Password: "Passwort" type password padding 12 background #2A2A3E radius 8',
  'senden button': 'Button: padding 12 24 background #3B82F6 color white radius 8 "Senden"',
}

function mockTranslate(input: string): string {
  const normalized = input.toLowerCase().trim()
  return MOCK_TRANSLATIONS[normalized] || `Box: /* TODO: ${input} */`
}

// ============================================
// TRANSLATION ENGINE
// ============================================

function applyIndentation(translated: string, indent: number): string {
  const spaces = ' '.repeat(indent)
  const lines = translated.split('\n')

  return lines.map((line, i) => {
    if (i === 0) {
      // First line: original indent
      return spaces + line
    } else {
      // Child lines: original indent + 2 (for hierarchy)
      return spaces + '  ' + line
    }
  }).join('\n')
}

function processLine(doc: Document, index: number): number {
  const line = doc.getLine(index)
  if (!line) return 0

  const check = shouldTranslate(line)
  console.log(`  [${index}] "${line.content}" → ${check.reason}`)

  if (!check.translate) {
    line.status = 'skipped'
    return 0
  }

  // Build context
  const context = buildContext(doc, index)
  console.log(`  Context:\n${context.split('\n').map(l => '    ' + l).join('\n')}`)

  // Translate (mock)
  const translated = mockTranslate(line.content)
  console.log(`  Translated: ${translated.replace(/\n/g, '\\n')}`)

  // Count how many lines will be added
  const newLinesCount = translated.split('\n').length - 1

  // Update document (may insert new lines)
  doc.updateLine(index, translated, line.indent)

  return newLinesCount
}

// ============================================
// TEST SCENARIOS
// ============================================

function runTest(name: string, input: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`TEST: ${name}`)
  console.log('='.repeat(60))
  console.log('\nInput:')
  console.log(input.split('\n').map(l => '  ' + l).join('\n'))

  const doc = new Document(input)

  console.log('\nProcessing lines:')
  let i = 0
  while (i < doc.lines.length) {
    const added = processLine(doc, i)
    i += 1 + added // Skip newly inserted lines
  }

  console.log('\nOutput:')
  console.log(doc.toString().split('\n').map(l => '  ' + l).join('\n'))
}

// ============================================
// RUN TESTS
// ============================================

console.log('\n🧪 Mirror NL Translation Model Tests\n')

// Test 1: Simple single line
runTest('Single Line - Natural Language', 'roter button')

// Test 2: Already DSL
runTest('Single Line - Already DSL', 'Button background #F00 "Click"')

// Test 3: Literal string
runTest('Literal String', '"Willkommen"')

// Test 4: Hierarchy with indentation
runTest('Hierarchy with Indentation', `sidebar
  navigation mit 3 items
  "Footer Text"`)

// Test 5: Mixed - NL with DSL children
runTest('Mixed Content', `karte mit titel
  "Beschreibung hier"
  Button background #3B82F6 "Action"`)

// Test 6: Form with indented children
runTest('Form Structure', `formular
  email eingabe
  passwort eingabe
  senden button`)

// Test 7: Deep nesting
runTest('Deep Nesting', `blaues rechteck
  sidebar
    navigation mit 3 items
  "Main Content"`)

console.log('\n✅ All tests completed\n')
