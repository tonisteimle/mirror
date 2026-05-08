#!/usr/bin/env node
/**
 * Mirror Validator CLI
 *
 * Validate Mirror DSL code with project-aware cross-file checks. The CLI is
 * a thin wrapper around `runValidator()` in `cli-runner.ts` — file
 * discovery, multi-file project mode, and severity filtering all live
 * there so tests can drive them without spawning a subprocess.
 *
 * Usage:
 *   mirror-validate app.mir
 *   mirror-validate tokens.tok components.com app.mir
 *   mirror-validate examples/personas-informatik
 *   mirror-validate "src/*.mir" --watch
 *   mirror-validate app.mir --ignore=E014,W110 --max-warnings=5
 *   mirror-validate examples/foo --json
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  runValidator,
  expandInputs,
  type RunnerOptions,
  type RunnerResult,
  type FileResult,
  crossFileCodeToErrorCode,
  getAllMirrorExtensions,
} from './cli-runner'
import type { ValidationError } from './types'
import { watchFiles } from '../cli/watch'

// ============================================================================
// Color helpers
// ============================================================================

const COLOR_ENABLED =
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== '0' &&
  (process.stdout.isTTY ?? false)

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

let useColor = COLOR_ENABLED

function colorize(text: string, color: keyof typeof colors): string {
  return useColor ? `${colors[color]}${text}${colors.reset}` : text
}

// ============================================================================
// Args
// ============================================================================

interface ParsedArgs {
  inputs: string[]
  watch: boolean
  json: boolean
  verbose: boolean
  quiet: boolean
  strict: boolean
  noColor: boolean
  help: boolean
  version: boolean
  ignoreCodes: Set<string>
  maxWarnings: number | undefined
  projectMode: boolean | undefined
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    inputs: [],
    watch: false,
    json: false,
    verbose: false,
    quiet: false,
    strict: false,
    noColor: false,
    help: false,
    version: false,
    ignoreCodes: new Set(),
    maxWarnings: undefined,
    projectMode: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') out.help = true
    else if (arg === '--version' || arg === '-V') out.version = true
    else if (arg === '--watch' || arg === '-w') out.watch = true
    else if (arg === '--json') out.json = true
    else if (arg === '--verbose' || arg === '-v') out.verbose = true
    else if (arg === '--quiet' || arg === '-q') out.quiet = true
    else if (arg === '--strict') out.strict = true
    else if (arg === '--no-color') out.noColor = true
    else if (arg === '--project') out.projectMode = true
    else if (arg === '--no-project') out.projectMode = false
    else if (arg.startsWith('--ignore=')) {
      const codes = arg.slice('--ignore='.length).split(',')
      for (const c of codes) {
        const t = c.trim()
        if (t) out.ignoreCodes.add(t)
      }
    } else if (arg === '--ignore') {
      const next = argv[++i]
      if (next) {
        for (const c of next.split(',')) {
          const t = c.trim()
          if (t) out.ignoreCodes.add(t)
        }
      }
    } else if (arg.startsWith('--max-warnings=')) {
      const n = Number(arg.slice('--max-warnings='.length))
      if (!Number.isNaN(n) && n >= 0) out.maxWarnings = n
    } else if (arg === '--max-warnings') {
      const n = Number(argv[++i])
      if (!Number.isNaN(n) && n >= 0) out.maxWarnings = n
    } else if (arg.startsWith('-')) {
      console.error(colorize(`Unknown flag: ${arg}`, 'red'))
      process.exit(3)
    } else {
      out.inputs.push(arg)
    }
  }
  return out
}

// ============================================================================
// Help / version
// ============================================================================

function printHelp(): void {
  const exts = getAllMirrorExtensions().join(', ')
  console.log(`
${colorize('Mirror Validator', 'bold')}

Usage:
  mirror-validate <input...> [options]

Inputs:
  Files            tokens.tok, components.com, app.mir
  Directories      examples/personas-informatik (project mode, auto-discover)
  Globs            "src/*.mir"

Supported extensions:
  ${exts}

Modes:
  Single file      validate that file alone (no cross-file checks)
  Multiple files   validate as project — shared prelude + cross-file checks
  Directory        project mode — full recursive discovery

Options:
  --project           Force project mode even with a single file
  --no-project        Force single-file mode even with multiple files
  --watch, -w         Re-validate on file change
  --json              Machine-readable JSON output
  --verbose, -v       Show all files (including valid ones)
  --quiet, -q         Suppress success messages, only print errors/warnings
  --strict            Treat warnings as errors (exit non-zero on any warning)
  --ignore <codes>    Suppress specific error codes (comma-separated)
                      e.g., --ignore=E014,W110
  --max-warnings <N>  Exit non-zero if warnings exceed N
  --no-color          Disable colored output
  --help, -h          Show this help
  --version, -V       Show version

Exit codes:
  0  No errors (and warnings within --max-warnings, if set)
  1  Validation errors (or --strict + warnings)
  2  Warnings exceeded --max-warnings
  3  Bad CLI usage (unknown flag, no inputs, etc.)

Examples:
  mirror-validate app.mir
  mirror-validate tokens.tok components.com app.mir
  mirror-validate examples/personas-informatik
  mirror-validate "src/*.mir" --watch
  mirror-validate app.mir --ignore=E014,W110
  mirror-validate examples/foo --json --max-warnings=0
`)
}

function readVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      return pkg.version || 'unknown'
    }
  } catch {
    // Ignore — fall through to 'unknown'.
  }
  return 'unknown'
}

// ============================================================================
// Text output
// ============================================================================

function formatLineWithCaret(
  source: string,
  line: number,
  column: number,
  marker: keyof typeof colors
): string[] {
  const lines = source.split('\n')
  const sourceLine = lines[line - 1] || ''
  const prefix = `    ${colorize(String(line), 'dim')} │ `
  const padding = ' '.repeat(String(line).length)
  return [
    `${prefix}${sourceLine}`,
    `    ${padding} │ ${' '.repeat(Math.max(0, column - 1))}${colorize('^', marker)}`,
  ]
}

function printFileResult(fr: FileResult, opts: ParsedArgs): void {
  const hasIssues = fr.errors.length > 0 || fr.warnings.length > 0
  if (!hasIssues) {
    if (opts.verbose) console.log(`${colorize('✓', 'green')} ${fr.relativePath}`)
    return
  }

  console.log(`\n${colorize(fr.relativePath, 'bold')}`)

  const printOne = (e: ValidationError, kind: 'error' | 'warning'): void => {
    const symbol = kind === 'error' ? colorize('✗', 'red') : colorize('⚠', 'yellow')
    const codeTag = colorize(`[${e.code}]`, 'dim')
    console.log(`  ${symbol} ${codeTag} ${e.message}`)
    for (const ctx of formatLineWithCaret(
      fr.source,
      e.line,
      e.column,
      kind === 'error' ? 'red' : 'yellow'
    )) {
      console.log(ctx)
    }
    if (e.suggestion) console.log(`    ${colorize('→', 'cyan')} ${e.suggestion}`)
  }

  for (const err of fr.errors) printOne(err, 'error')
  for (const warn of fr.warnings) printOne(warn, 'warning')
}

function printCrossFileErrors(result: RunnerResult): void {
  if (result.crossFileErrors.length === 0) return
  console.log(`\n${colorize('Cross-file errors', 'bold')}`)
  for (const e of result.crossFileErrors) {
    const code = crossFileCodeToErrorCode(e.code)
    const codeTag = colorize(`[${code}]`, 'dim')
    console.log(`  ${colorize('✗', 'red')} ${codeTag} ${e.filename}:${e.line} — ${e.message}`)
    if (e.suggestion) console.log(`    ${colorize('→', 'cyan')} ${e.suggestion}`)
    if (e.otherFile && e.otherLine !== undefined) {
      console.log(`    ${colorize('also defined at', 'dim')} ${e.otherFile}:${e.otherLine}`)
    }
  }
}

function printSummary(result: RunnerResult, opts: ParsedArgs): void {
  if (opts.quiet && result.totals.errors === 0 && result.totals.warnings === 0) return

  const sep = colorize('──────────────────────────────────────────────────', 'dim')
  console.log(`\n${sep}`)

  const filesChecked = result.totals.files
  const errorCount = result.totals.errors
  const warningCount = result.totals.warnings

  if (errorCount === 0 && warningCount === 0) {
    console.log(
      `${colorize('✓', 'green')} ${filesChecked} file(s) validated · ${colorize('clean', 'green')}`
    )
    return
  }

  const errorTxt = colorize(String(errorCount), errorCount > 0 ? 'red' : 'green')
  const warnTxt = colorize(String(warningCount), warningCount > 0 ? 'yellow' : 'green')
  console.log(`${filesChecked} file(s) checked · ${errorTxt} error(s) · ${warnTxt} warning(s)`)

  if (result.warningLimitExceeded) {
    console.log(colorize(`✗ Warning count exceeds --max-warnings limit`, 'red'))
  }
}

// ============================================================================
// JSON output
// ============================================================================

function jsonOutput(result: RunnerResult): string {
  return JSON.stringify(
    {
      totals: result.totals,
      exitCode: result.exitCode,
      warningLimitExceeded: result.warningLimitExceeded,
      files: result.fileResults.map(fr => ({
        filename: fr.filename,
        relativePath: fr.relativePath,
        errors: fr.errors,
        warnings: fr.warnings,
      })),
      crossFileErrors: result.crossFileErrors.map(e => ({
        ...e,
        code: e.code,
        errorCode: crossFileCodeToErrorCode(e.code),
      })),
    },
    null,
    2
  )
}

// ============================================================================
// Run
// ============================================================================

function runOnce(args: ParsedArgs): number {
  const runnerOpts: RunnerOptions = {
    inputs: args.inputs,
    projectMode: args.projectMode,
    ignoreCodes: args.ignoreCodes,
    maxWarnings: args.maxWarnings,
    strict: args.strict,
  }

  const result = runValidator(runnerOpts)

  if (args.json) {
    console.log(jsonOutput(result))
    return result.exitCode
  }

  if (result.totals.files === 0 && result.crossFileErrors.length === 0) {
    console.error(
      colorize(
        `No Mirror files found. Supported extensions: ${getAllMirrorExtensions().join(', ')}`,
        'red'
      )
    )
    return 3
  }

  for (const fr of result.fileResults) printFileResult(fr, args)
  printCrossFileErrors(result)
  printSummary(result, args)

  return result.exitCode
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  if (args.noColor) useColor = false

  if (args.help) {
    printHelp()
    process.exit(0)
  }
  if (args.version) {
    console.log(readVersion())
    process.exit(0)
  }
  if (args.inputs.length === 0) {
    console.error(colorize('No input files. Use --help for usage.', 'red'))
    process.exit(3)
  }

  if (args.watch) {
    // Initial run
    runOnce(args)

    // Determine watch targets: directories stay as dirs, files stay as files.
    const watchTargets: string[] = []
    const directWatchDirs: string[] = []
    for (const input of args.inputs) {
      const abs = path.resolve(input)
      if (fs.existsSync(abs)) {
        if (fs.statSync(abs).isDirectory()) directWatchDirs.push(abs)
        else watchTargets.push(abs)
      }
    }

    // For directory inputs, watch the directory; for files use file watch.
    const expanded = expandInputs(args.inputs)

    watchFiles(expanded.length > 0 ? expanded : watchTargets, directWatchDirs[0], () => {
      console.log(colorize('\n— re-validating —', 'cyan'))
      runOnce(args)
    })
    return
  }

  process.exit(runOnce(args))
}

main()
