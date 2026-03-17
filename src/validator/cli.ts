#!/usr/bin/env node
/**
 * Mirror Validator CLI
 *
 * Usage:
 *   npx mirror-validate file.mirror
 *   npx mirror-validate src/*.mirror
 *   npx mirror-validate --watch file.mirror
 */

import * as fs from 'fs'
import * as path from 'path'
import { validate, formatErrors, ValidationResult } from './index'

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`
}

interface ValidationSummary {
  totalFiles: number
  validFiles: number
  invalidFiles: number
  totalErrors: number
  totalWarnings: number
}

function validateFile(filePath: string): { result: ValidationResult; source: string } | null {
  try {
    const absolutePath = path.resolve(filePath)
    const source = fs.readFileSync(absolutePath, 'utf-8')
    const result = validate(source)
    return { result, source }
  } catch (err) {
    console.error(colorize(`Error reading ${filePath}: ${(err as Error).message}`, 'red'))
    return null
  }
}

function printFileResult(filePath: string, result: ValidationResult, source: string, verbose: boolean): void {
  const relativePath = path.relative(process.cwd(), filePath)

  if (result.valid && result.warnings.length === 0) {
    if (verbose) {
      console.log(`${colorize('✓', 'green')} ${relativePath}`)
    }
    return
  }

  // Print file header
  console.log(`\n${colorize(relativePath, 'bold')}`)

  // Print errors
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      const line = source.split('\n')[err.line - 1] || ''
      console.log(`  ${colorize('✗', 'red')} ${colorize(`[${err.code}]`, 'dim')} ${err.message}`)
      console.log(`    ${colorize(`${err.line}`, 'dim')} │ ${line}`)
      console.log(`    ${' '.repeat(String(err.line).length)} │ ${' '.repeat(Math.max(0, err.column - 1))}${colorize('^', 'red')}`)
      if (err.suggestion) {
        console.log(`    ${colorize('→', 'cyan')} ${err.suggestion}`)
      }
    }
  }

  // Print warnings
  if (result.warnings.length > 0) {
    for (const warn of result.warnings) {
      const line = source.split('\n')[warn.line - 1] || ''
      console.log(`  ${colorize('⚠', 'yellow')} ${colorize(`[${warn.code}]`, 'dim')} ${warn.message}`)
      console.log(`    ${colorize(`${warn.line}`, 'dim')} │ ${line}`)
      if (warn.suggestion) {
        console.log(`    ${colorize('→', 'cyan')} ${warn.suggestion}`)
      }
    }
  }
}

function printSummary(summary: ValidationSummary): void {
  console.log('')
  console.log(colorize('─'.repeat(50), 'dim'))

  const status = summary.invalidFiles === 0
    ? colorize('✓ All files valid', 'green')
    : colorize(`✗ ${summary.invalidFiles} file(s) with errors`, 'red')

  console.log(status)
  console.log(
    `  ${summary.totalFiles} file(s) checked, ` +
    `${colorize(String(summary.totalErrors), summary.totalErrors > 0 ? 'red' : 'green')} error(s), ` +
    `${colorize(String(summary.totalWarnings), summary.totalWarnings > 0 ? 'yellow' : 'green')} warning(s)`
  )
}

function expandGlob(pattern: string): string[] {
  // Simple glob expansion for *.mirror patterns
  if (pattern.includes('*')) {
    const dir = path.dirname(pattern)
    const filePattern = path.basename(pattern)
    const regex = new RegExp('^' + filePattern.replace(/\*/g, '.*') + '$')

    try {
      const files = fs.readdirSync(dir)
      return files
        .filter(f => regex.test(f))
        .map(f => path.join(dir, f))
    } catch {
      return []
    }
  }
  return [pattern]
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
${colorize('Mirror Validator', 'bold')}

Usage:
  mirror-validate <file.mirror> [options]
  mirror-validate <pattern> [options]

Options:
  --verbose, -v    Show all files (including valid ones)
  --json           Output as JSON
  --help, -h       Show this help

Examples:
  mirror-validate app.mirror
  mirror-validate "src/*.mirror"
  mirror-validate src/components/*.mirror --verbose
`)
    process.exit(0)
  }

  const verbose = args.includes('--verbose') || args.includes('-v')
  const jsonOutput = args.includes('--json')
  const files = args
    .filter(a => !a.startsWith('-'))
    .flatMap(expandGlob)
    .filter(f => f.endsWith('.mirror'))

  if (files.length === 0) {
    console.error(colorize('No .mirror files found', 'red'))
    process.exit(1)
  }

  const summary: ValidationSummary = {
    totalFiles: files.length,
    validFiles: 0,
    invalidFiles: 0,
    totalErrors: 0,
    totalWarnings: 0,
  }

  const results: Array<{ file: string; result: ValidationResult }> = []

  for (const file of files) {
    const validation = validateFile(file)
    if (!validation) {
      summary.invalidFiles++
      continue
    }

    const { result, source } = validation
    results.push({ file, result })

    if (result.valid) {
      summary.validFiles++
    } else {
      summary.invalidFiles++
    }
    summary.totalErrors += result.errorCount
    summary.totalWarnings += result.warningCount

    if (!jsonOutput) {
      printFileResult(file, result, source, verbose)
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify({
      summary,
      results: results.map(r => ({
        file: r.file,
        valid: r.result.valid,
        errors: r.result.errors,
        warnings: r.result.warnings,
      })),
    }, null, 2))
  } else {
    printSummary(summary)
  }

  process.exit(summary.invalidFiles > 0 ? 1 : 0)
}

main()
