#!/usr/bin/env npx tsx
/**
 * Test Quality Analyzer
 *
 * Scans test files for common weakness patterns:
 * 1. Conditional assertions (if blocks containing assertions)
 * 2. Weak OR conditions (|| that make assertions too permissive)
 * 3. Always-true assertions (api.assert.ok(true, ...))
 * 4. Hardcoded node IDs (node-1, node-2, etc.)
 * 5. Unexplained magic numbers in delays
 * 6. Title vs. actual test mismatch indicators
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface Issue {
  file: string
  line: number
  pattern: string
  code: string
  severity: 'high' | 'medium' | 'low'
}

interface FileReport {
  file: string
  issues: Issue[]
  testCount: number
}

const SUITES_DIR = path.join(__dirname, '../studio/test-api/suites')

// Patterns to detect
const patterns = [
  {
    name: 'conditional-assertion',
    regex: /if\s*\([^)]+\)\s*\{[\s\S]*?api\.assert/g,
    severity: 'high' as const,
    description: 'Assertion inside if block - may be skipped',
  },
  {
    name: 'weak-or-condition',
    regex: /api\.assert\.ok\([^)]*\|\|[^)]*\)/g,
    severity: 'high' as const,
    description: 'OR condition in assertion - may always pass',
  },
  {
    name: 'always-true',
    regex: /api\.assert\.ok\(\s*true\s*,/g,
    severity: 'high' as const,
    description: 'Always-true assertion - provides no validation',
  },
  {
    name: 'hardcoded-node-id',
    regex: /['"]node-[0-9]+['"]/g,
    severity: 'medium' as const,
    description: 'Hardcoded node ID - fragile to layout changes',
  },
  {
    name: 'magic-delay',
    regex: /delay\(\d{3,}\)/g,
    severity: 'low' as const,
    description: 'Magic number in delay - should be documented',
  },
  {
    name: 'empty-catch',
    regex: /catch\s*\{[\s\n]*\}/g,
    severity: 'medium' as const,
    description: 'Empty catch block - swallows errors silently',
  },
  {
    name: 'length-zero-check',
    regex: /\.length\s*===?\s*0|\.length\s*>\s*0/g,
    severity: 'low' as const,
    description: 'Generic length check - consider more specific assertion',
  },
]

function findTestFiles(dir: string): string[] {
  const files: string[] = []

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

function analyzeFile(filePath: string): FileReport {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: Issue[] = []

  // Count tests
  const testMatches = content.match(/test\(|testWithSetup\(/g) || []
  const testCount = testMatches.length

  // Find issues by pattern
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.regex.source, 'g')
    let match

    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.substring(0, match.index)
      const lineNumber = beforeMatch.split('\n').length

      // Get the line content
      const lineContent = lines[lineNumber - 1]?.trim() || match[0].substring(0, 60)

      issues.push({
        file: path.relative(SUITES_DIR, filePath),
        line: lineNumber,
        pattern: pattern.name,
        code: lineContent.substring(0, 80),
        severity: pattern.severity,
      })
    }
  }

  return {
    file: path.relative(SUITES_DIR, filePath),
    issues,
    testCount,
  }
}

function generateReport(reports: FileReport[]): string {
  const lines: string[] = []

  // Header
  lines.push('# Test Quality Audit Report')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')

  // Summary
  const totalTests = reports.reduce((sum, r) => sum + r.testCount, 0)
  const totalIssues = reports.reduce((sum, r) => sum + r.issues.length, 0)
  const filesWithIssues = reports.filter(r => r.issues.length > 0).length

  const highIssues = reports.flatMap(r => r.issues).filter(i => i.severity === 'high').length
  const mediumIssues = reports.flatMap(r => r.issues).filter(i => i.severity === 'medium').length
  const lowIssues = reports.flatMap(r => r.issues).filter(i => i.severity === 'low').length

  lines.push('## Summary')
  lines.push('')
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Test Files | ${reports.length} |`)
  lines.push(`| Total Tests | ${totalTests} |`)
  lines.push(`| Files with Issues | ${filesWithIssues} |`)
  lines.push(`| Total Issues | ${totalIssues} |`)
  lines.push(`| 🔴 High Severity | ${highIssues} |`)
  lines.push(`| 🟡 Medium Severity | ${mediumIssues} |`)
  lines.push(`| 🟢 Low Severity | ${lowIssues} |`)
  lines.push('')

  // Issues by pattern
  lines.push('## Issues by Pattern')
  lines.push('')

  const byPattern = new Map<string, Issue[]>()
  for (const report of reports) {
    for (const issue of report.issues) {
      const existing = byPattern.get(issue.pattern) || []
      existing.push(issue)
      byPattern.set(issue.pattern, existing)
    }
  }

  for (const pattern of patterns) {
    const issues = byPattern.get(pattern.name) || []
    if (issues.length === 0) continue

    const severityIcon =
      pattern.severity === 'high' ? '🔴' : pattern.severity === 'medium' ? '🟡' : '🟢'
    lines.push(`### ${severityIcon} ${pattern.name} (${issues.length})`)
    lines.push('')
    lines.push(`> ${pattern.description}`)
    lines.push('')

    // Group by file
    const byFile = new Map<string, Issue[]>()
    for (const issue of issues) {
      const existing = byFile.get(issue.file) || []
      existing.push(issue)
      byFile.set(issue.file, existing)
    }

    for (const [file, fileIssues] of byFile) {
      lines.push(`**${file}**`)
      for (const issue of fileIssues.slice(0, 5)) {
        lines.push(`- Line ${issue.line}: \`${issue.code}\``)
      }
      if (fileIssues.length > 5) {
        lines.push(`- ... and ${fileIssues.length - 5} more`)
      }
      lines.push('')
    }
  }

  // Priority files
  lines.push('## Priority Files (Most Issues)')
  lines.push('')

  const sortedByIssues = [...reports]
    .filter(r => r.issues.length > 0)
    .sort((a, b) => {
      // Sort by high severity count first, then total
      const aHigh = a.issues.filter(i => i.severity === 'high').length
      const bHigh = b.issues.filter(i => i.severity === 'high').length
      if (aHigh !== bHigh) return bHigh - aHigh
      return b.issues.length - a.issues.length
    })
    .slice(0, 15)

  lines.push('| File | Tests | 🔴 High | 🟡 Med | 🟢 Low | Total |')
  lines.push('|------|-------|---------|--------|--------|-------|')

  for (const report of sortedByIssues) {
    const high = report.issues.filter(i => i.severity === 'high').length
    const medium = report.issues.filter(i => i.severity === 'medium').length
    const low = report.issues.filter(i => i.severity === 'low').length
    lines.push(
      `| ${report.file} | ${report.testCount} | ${high} | ${medium} | ${low} | ${report.issues.length} |`
    )
  }

  lines.push('')

  // Checklist
  lines.push('## Review Checklist')
  lines.push('')
  lines.push('For each file, verify:')
  lines.push('')
  lines.push('- [ ] No assertions inside `if` blocks (should always run)')
  lines.push('- [ ] No weak `||` conditions that make tests always pass')
  lines.push('- [ ] No `api.assert.ok(true, ...)` placeholders')
  lines.push('- [ ] Dynamic element finding instead of hardcoded `node-N`')
  lines.push('- [ ] Documented delays with comments explaining why')
  lines.push('- [ ] Test title matches what the test actually validates')
  lines.push('')

  return lines.join('\n')
}

// Main
console.log('Analyzing test files...')
const files = findTestFiles(SUITES_DIR)
console.log(`Found ${files.length} test files`)

const reports = files.map(analyzeFile)
const markdown = generateReport(reports)

const outputPath = path.join(__dirname, '../docs/TEST-QUALITY-AUDIT.md')
fs.writeFileSync(outputPath, markdown)

console.log(`\nReport written to: ${outputPath}`)
console.log('\nQuick Summary:')
console.log(`  Files: ${reports.length}`)
console.log(`  Tests: ${reports.reduce((s, r) => s + r.testCount, 0)}`)
console.log(`  Issues: ${reports.reduce((s, r) => s + r.issues.length, 0)}`)
