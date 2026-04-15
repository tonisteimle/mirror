#!/usr/bin/env npx tsx
/**
 * Quality Analyzer CLI
 *
 * Usage:
 *   npx tsx compiler/quality/cli.ts <file.mir>
 *   npx tsx compiler/quality/cli.ts <file.mir> --json
 *   npx tsx compiler/quality/cli.ts <file.mir> --static-only
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { analyzeStatic } from './static-analyzer'
import { analyzeWithClaude } from './claude-analyzer'
import type { QualityReport, QualityIssue } from './types'

// =============================================================================
// CLI Colors
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
}

function c(color: keyof typeof colors, text: string): string {
  return `${colors[color]}${text}${colors.reset}`
}

// =============================================================================
// Output Formatting
// =============================================================================

function scoreColor(score: number): keyof typeof colors {
  if (score >= 80) return 'green'
  if (score >= 60) return 'yellow'
  return 'red'
}

function severityIcon(severity: string): string {
  switch (severity) {
    case 'error':
      return c('red', '✗')
    case 'warning':
      return c('yellow', '⚠')
    case 'info':
      return c('blue', 'ℹ')
    default:
      return '•'
  }
}

function formatScore(score: number): string {
  const color = scoreColor(score)
  const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10))
  return `${c(color, bar)} ${c('bold', String(score))}%`
}

function printReport(report: QualityReport): void {
  console.log()
  console.log(c('bold', '═══════════════════════════════════════════════════════════'))
  console.log(c('bold', '                   MIRROR QUALITY REPORT                    '))
  console.log(c('bold', '═══════════════════════════════════════════════════════════'))
  console.log()

  // Overall Score
  console.log(c('bold', '  Overall Score: ') + formatScore(report.overallScore))
  console.log()

  // Category Scores
  console.log(c('bold', '  Categories:'))
  console.log(`    Token Coverage:        ${formatScore(report.categories.tokenCoverage.score)}`)
  console.log(
    `    Component Abstraction: ${formatScore(report.categories.componentAbstraction.score)}`
  )
  console.log(`    Consistency:           ${formatScore(report.categories.consistency.score)}`)
  console.log(`    Design Variance:       ${formatScore(report.categories.designVariance.score)}`)
  console.log(
    `    Layout Cleanliness:    ${formatScore(report.categories.layoutCleanliness.score)}`
  )
  console.log()

  // Summary
  console.log(c('bold', '  Summary:'))
  console.log(`    ${c('dim', report.summary)}`)
  console.log()

  // Issues
  if (report.issues.length > 0) {
    console.log(c('bold', '═══════════════════════════════════════════════════════════'))
    console.log(c('bold', '                         ISSUES                             '))
    console.log(c('bold', '═══════════════════════════════════════════════════════════'))
    console.log()

    // Group by category
    const byCategory = new Map<string, QualityIssue[]>()
    for (const issue of report.issues) {
      const existing = byCategory.get(issue.category) || []
      existing.push(issue)
      byCategory.set(issue.category, existing)
    }

    for (const [category, issues] of Array.from(byCategory.entries())) {
      const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      console.log(c('cyan', `  ### ${categoryName}`))
      console.log()

      for (const issue of issues) {
        console.log(`  ${severityIcon(issue.severity)} ${issue.message}`)

        if (issue.lines.length > 0) {
          console.log(c('dim', `    Lines: ${issue.lines.join(', ')}`))
        }

        if (issue.current) {
          console.log(c('red', `    Current: ${issue.current}`))
        }

        if (issue.suggestion) {
          console.log(c('green', `    Fix: ${issue.suggestion}`))
        }

        if (issue.reason) {
          console.log(c('dim', `    Why: ${issue.reason}`))
        }

        console.log()
      }
    }
  } else {
    console.log(c('green', '  ✓ No issues found!'))
    console.log()
  }

  // Stats
  console.log(c('bold', '═══════════════════════════════════════════════════════════'))
  console.log(c('bold', '                         STATS                              '))
  console.log(c('bold', '═══════════════════════════════════════════════════════════'))
  console.log()
  console.log(`    Lines:       ${report.analysis.totalLines}`)
  console.log(`    Elements:    ${report.analysis.totalElements}`)
  console.log(`    Colors:      ${report.analysis.uniqueColors}`)
  console.log(`    Spacings:    ${report.analysis.uniqueSpacings}`)
  console.log(`    Fonts:       ${report.analysis.uniqueFonts}`)
  console.log(`    Tokens:      ${report.analysis.definedTokens.length}`)
  console.log(`    Components:  ${report.analysis.definedComponents.length}`)
  console.log()
}

function printStaticOnly(analysis: ReturnType<typeof analyzeStatic>): void {
  console.log()
  console.log(c('bold', 'Static Analysis Results'))
  console.log(c('bold', '═══════════════════════'))
  console.log()

  console.log(c('cyan', 'Colors:'))
  for (const color of analysis.colors) {
    console.log(`  ${color.value} (${color.count}x) - Lines: ${color.lines.join(', ')}`)
  }
  console.log()

  console.log(c('cyan', 'Spacings:'))
  for (const spacing of analysis.spacings) {
    console.log(`  ${spacing.value}px (${spacing.count}x) - Lines: ${spacing.lines.join(', ')}`)
  }
  console.log()

  console.log(c('cyan', 'Defined Tokens:'))
  for (const token of analysis.definedTokens) {
    console.log(`  $${token.name}: ${token.value} (used ${token.usageCount}x)`)
  }
  console.log()

  console.log(c('cyan', 'Defined Components:'))
  for (const comp of analysis.definedComponents) {
    console.log(`  ${comp.name}: ${comp.basePrimitive || '-'} (used ${comp.usageCount}x)`)
  }
  console.log()

  console.log(c('cyan', 'Repeated Patterns:'))
  for (const pattern of analysis.patterns) {
    console.log(`  "${pattern.sample}" (${pattern.count}x) - Lines: ${pattern.lines.join(', ')}`)
  }
  console.log()

  console.log(c('cyan', 'Inline Properties (first 10):'))
  for (const prop of analysis.propertiesInLayout.slice(0, 10)) {
    console.log(`  Line ${prop.line}: ${prop.component} - ${prop.properties.join(', ')}`)
  }
  console.log()

  if (analysis.unwrappedPrimitives.length > 0) {
    console.log(c('yellow', 'Unwrapped Primitives (should use component):'))
    for (const unwrapped of analysis.unwrappedPrimitives) {
      console.log(
        `  Line ${unwrapped.line}: ${c('red', unwrapped.primitive)} → use ${c('green', unwrapped.suggestedComponent)}`
      )
    }
    console.log()
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Parse arguments
  const flags = {
    json: args.includes('--json'),
    staticOnly: args.includes('--static-only'),
    help: args.includes('--help') || args.includes('-h'),
  }

  const files = args.filter(a => !a.startsWith('--') && !a.startsWith('-'))

  if (flags.help || files.length === 0) {
    console.log(`
${c('bold', 'Mirror Quality Analyzer')}

${c('cyan', 'Usage:')}
  npx tsx compiler/quality/cli.ts <file.mir> [options]

${c('cyan', 'Options:')}
  --json          Output as JSON (for programmatic use)
  --static-only   Only run static analysis (no Claude)
  --help, -h      Show this help

${c('cyan', 'Examples:')}
  npx tsx compiler/quality/cli.ts app.mir
  npx tsx compiler/quality/cli.ts app.mir --json
  npx tsx compiler/quality/cli.ts app.mir --static-only
`)
    process.exit(flags.help ? 0 : 1)
  }

  const filePath = resolve(files[0])

  if (!existsSync(filePath)) {
    console.error(c('red', `Error: File not found: ${filePath}`))
    process.exit(1)
  }

  // Read file
  const code = readFileSync(filePath, 'utf-8')

  // Static analysis
  console.log(c('dim', 'Running static analysis...'))
  const analysis = analyzeStatic(code)

  if (flags.staticOnly) {
    if (flags.json) {
      console.log(JSON.stringify(analysis, null, 2))
    } else {
      printStaticOnly(analysis)
    }
    return
  }

  // Claude analysis
  console.log(c('dim', 'Analyzing with Claude...'))
  const report = await analyzeWithClaude(code, analysis)

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printReport(report)
  }
}

main().catch(err => {
  console.error(c('red', `Error: ${err.message}`))
  process.exit(1)
})
