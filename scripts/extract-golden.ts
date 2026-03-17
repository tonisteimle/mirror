#!/usr/bin/env npx ts-node
/**
 * Extract Golden Master Cases from Existing Tests
 *
 * Dieses Script extrahiert erwartete Werte aus bestehenden manuellen Tests
 * und generiert Golden Master Cases daraus.
 *
 * Usage:
 *   npx ts-node scripts/extract-golden.ts
 *
 * Output:
 *   Generierte Golden Cases als TypeScript Code
 */

import * as fs from 'fs'
import * as path from 'path'

interface ExtractedCase {
  input: string
  css: Record<string, string>
  source: string
  lineNumber: number
}

// Pattern to match test cases
const TEST_PATTERN = /it\(['"](.*?)['"],.*?\{([\s\S]*?)\}\s*\)/g
const COMPILE_PATTERN = /compileAndExecute\(`([\s\S]*?)`\)/
const EXPECT_PATTERN = /expect\(root\.style\.(\w+)\)\.toBe\(['"](.*?)['"]\)/g

function extractFromFile(filePath: string): ExtractedCase[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const cases: ExtractedCase[] = []
  const fileName = path.basename(filePath)

  // Split by test blocks
  const lines = content.split('\n')
  let currentTest = ''
  let testStartLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Find test start
    if (line.includes("it('") || line.includes('it("') || line.includes('it(`')) {
      currentTest = line
      testStartLine = i + 1
    }

    // Accumulate test content
    if (currentTest) {
      currentTest += '\n' + line
    }

    // Find test end and extract
    if (currentTest && line.trim() === '})') {
      const extracted = extractFromTest(currentTest, fileName, testStartLine)
      if (extracted) {
        cases.push(extracted)
      }
      currentTest = ''
    }
  }

  return cases
}

function extractFromTest(testContent: string, source: string, lineNumber: number): ExtractedCase | null {
  // Extract DSL code
  const compileMatch = testContent.match(COMPILE_PATTERN)
  if (!compileMatch) return null

  const dslCode = compileMatch[1]

  // Find property line (indented line after "as frame:" or similar)
  const lines = dslCode.split('\n')
  let propertyLine = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Skip component definitions and empty lines
    if (line.includes(' as ') || line === '' || !line.startsWith(' ') && !lines[i].startsWith('  ')) {
      continue
    }
    // This should be a property line
    if (lines[i].startsWith('  ') && !line.includes(' as ')) {
      propertyLine = line
      break
    }
  }

  if (!propertyLine) return null

  // Extract expected CSS
  const css: Record<string, string> = {}
  let match
  EXPECT_PATTERN.lastIndex = 0

  while ((match = EXPECT_PATTERN.exec(testContent)) !== null) {
    const [, prop, value] = match
    css[prop] = value
  }

  if (Object.keys(css).length === 0) return null

  return {
    input: propertyLine,
    css,
    source,
    lineNumber,
  }
}

function formatAsGoldenCase(c: ExtractedCase): string {
  const cssStr = JSON.stringify(c.css)
    .replace(/"/g, "'")
    .replace(/,/g, ', ')

  return `    { input: '${c.input}', css: ${cssStr} },`
}

// Main
const testDir = path.join(__dirname, '../src/__tests__/e2e/dom')
const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts'))

console.log('// ============================================================================')
console.log('// Auto-extracted Golden Cases')
console.log('// Generated from existing manual tests')
console.log('// ============================================================================')
console.log('')

let totalCases = 0

for (const file of files) {
  const filePath = path.join(testDir, file)
  const cases = extractFromFile(filePath)

  if (cases.length > 0) {
    console.log(`// From: ${file}`)
    for (const c of cases) {
      console.log(formatAsGoldenCase(c))
    }
    console.log('')
    totalCases += cases.length
  }
}

console.log(`// Total: ${totalCases} cases extracted`)
