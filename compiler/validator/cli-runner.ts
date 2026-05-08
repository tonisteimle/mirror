/**
 * Validator CLI Runner — testable core for `mirror-validate`.
 *
 * The runner is split from `cli.ts` so the orchestration (file discovery,
 * cross-file validation, prelude seeding, severity overrides) can be
 * exercised by unit tests without spawning a subprocess.
 *
 * Inputs may be a mix of:
 *   - file paths (any Mirror code extension: .mir/.mirror/.tok/.tokens/.com/.components)
 *   - directory paths (treated as project — full discovery via `discoverProjectFiles`)
 *   - glob patterns (`*.mir`, `src/**\/*.tok`, ...)
 *
 * Multiple inputs are validated as a project: each file in isolation, but
 * with a shared prelude of cross-file token + component definitions, plus
 * a final cross-file pass for duplicate-token / undefined-reference errors
 * that single-file validation cannot see.
 */

import * as fs from 'fs'
import * as path from 'path'
import { validate, ValidateOptions } from './index'
import type { ValidationError, ValidationResult } from './types'
import { validateProject, type CrossFileError } from '../loader/cross-file-validator'
import type { ProjectFile } from '../loader/project-loader'
import { parse } from '../parser'
import { classify, isPlainToken, isPropertySet } from '../loader/classify'
import { FILE_EXTENSIONS, isMirrorCodeFile, isDataFile, getAllMirrorExtensions } from '../cli/types'
import { listMirrorCodeFiles, listDataFiles } from '../cli/files'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for the CLI runner. Most map 1:1 to a CLI flag.
 */
export interface RunnerOptions {
  /** File paths, dir paths, or glob patterns to validate. */
  inputs: string[]
  /** Treat all inputs as one project (cross-file checks). Default: auto. */
  projectMode?: boolean
  /** Codes to suppress (e.g., new Set(['W110'])). */
  ignoreCodes?: ReadonlySet<string>
  /** If set, exits non-zero when warning count exceeds this. */
  maxWarnings?: number
  /** Strict-mode: treat all warnings as errors (exit non-zero on any warning). */
  strict?: boolean
}

/**
 * One file's validation outcome. Errors and warnings are post-filter
 * (rule-config and prose-aware filtering already applied).
 */
export interface FileResult {
  filename: string
  /** Path relative to cwd, used for display. */
  relativePath: string
  /** Original source content (for context-line printing). */
  source: string
  errors: ValidationError[]
  warnings: ValidationError[]
}

/**
 * Aggregate runner result. Ready to feed into a printer (text or JSON).
 */
export interface RunnerResult {
  fileResults: FileResult[]
  /** Cross-file errors (duplicate-token, undefined-component-across-files). */
  crossFileErrors: CrossFileError[]
  totals: {
    files: number
    errors: number
    warnings: number
    crossFileErrors: number
  }
  /** Suggested process exit code: 0=clean, 1=errors, 2=warnings exceeded. */
  exitCode: number
  /** True if `--max-warnings` was hit. */
  warningLimitExceeded: boolean
}

// ============================================================================
// File discovery
// ============================================================================

/**
 * Expand a single input (file, dir, or glob) into a list of absolute
 * Mirror-code file paths. Returns an empty array if nothing matches.
 *
 * Globs supported: simple star-patterns (e.g. `*.mir`, `src/*.tok`). For
 * heavy patterns we lean on Node's `fs.readdirSync` + regex — no
 * external dependency.
 */
export function expandInput(input: string): string[] {
  // Glob? Expand and recurse.
  if (input.includes('*')) {
    const dir = path.dirname(input) || '.'
    const filePattern = path.basename(input)
    const regex = new RegExp('^' + filePattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$')
    try {
      return fs
        .readdirSync(path.resolve(dir))
        .filter(f => regex.test(f))
        .map(f => path.resolve(dir, f))
        .filter(p => isMirrorCodeFile(p) || isDataFile(p))
    } catch {
      return []
    }
  }

  const absolute = path.resolve(input)

  if (!fs.existsSync(absolute)) return []

  const stat = fs.statSync(absolute)
  if (stat.isDirectory()) {
    return discoverProjectFiles(absolute)
  }

  // Single file — only accept if it's a Mirror code/data file.
  if (isMirrorCodeFile(absolute) || isDataFile(absolute)) {
    return [absolute]
  }
  return []
}

/**
 * Discover all Mirror code files in a project directory. Mirrors the
 * discovery order used by `compileProject` so validation matches
 * compilation behavior.
 *
 * Order: data → tokens → components → layouts → root.
 */
function discoverProjectFiles(absoluteProjectDir: string): string[] {
  const files: string[] = []
  const seen = new Set<string>()

  const add = (p: string): void => {
    const abs = path.resolve(p)
    if (seen.has(abs)) return
    if (!fs.existsSync(abs)) return
    seen.add(abs)
    files.push(abs)
  }

  const addAll = (paths: string[]): void => paths.forEach(add)

  const findRoot = (baseName: string, exts: readonly string[]): void => {
    for (const ext of exts) {
      const candidate = path.join(absoluteProjectDir, baseName + ext)
      if (fs.existsSync(candidate)) {
        add(candidate)
        return
      }
    }
  }

  // Same discovery order as compile.ts:discoverProjectFiles.
  addAll(listDataFiles(path.join(absoluteProjectDir, 'data')))
  findRoot('data', FILE_EXTENSIONS.data)

  addAll(listMirrorCodeFiles(path.join(absoluteProjectDir, 'tokens')))
  findRoot('tokens', [...FILE_EXTENSIONS.tokens, ...FILE_EXTENSIONS.layout])

  addAll(listMirrorCodeFiles(path.join(absoluteProjectDir, 'components')))
  findRoot('components', [...FILE_EXTENSIONS.component, ...FILE_EXTENSIONS.layout])

  addAll(listMirrorCodeFiles(path.join(absoluteProjectDir, 'layouts')))
  addAll(listMirrorCodeFiles(path.join(absoluteProjectDir, 'screens')))
  addAll(listMirrorCodeFiles(absoluteProjectDir))
  addAll(listDataFiles(absoluteProjectDir))

  return files
}

/**
 * Expand all inputs and de-duplicate. Returns absolute paths in stable
 * (input-) order.
 */
export function expandInputs(inputs: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const input of inputs) {
    for (const file of expandInput(input)) {
      if (seen.has(file)) continue
      seen.add(file)
      out.push(file)
    }
  }
  return out
}

// ============================================================================
// Cross-file prelude collection
// ============================================================================

/**
 * Walk every file once to collect all top-level token and component
 * definitions. The result is fed back into per-file validation as the
 * prelude — so a tokens.tok-only file doesn't make every $token in
 * components.com look undefined when validated in isolation.
 */
export function collectPrelude(files: Array<{ filename: string; content: string }>): {
  tokens: Set<string>
  components: Set<string>
} {
  const tokens = new Set<string>()
  const components = new Set<string>()
  // Also seed token "base names" — `primary.bg` registers `primary` so
  // `bg $primary` resolves the family-shorthand.
  const tokenBases = new Set<string>()

  for (const f of files) {
    let ast
    try {
      ast = parse(f.content)
    } catch {
      continue
    }
    const c = classify(ast)
    for (const t of c.tokens) {
      if (isPlainToken(t) || isPropertySet(t)) {
        tokens.add(t.name)
        const dot = t.name.indexOf('.')
        if (dot > 0) tokenBases.add(t.name.slice(0, dot))
      }
    }
    for (const comp of c.components) {
      if (comp.type === 'Component') components.add(comp.name)
    }
  }

  for (const base of tokenBases) tokens.add(base)
  return { tokens, components }
}

// ============================================================================
// Severity / ignore filtering
// ============================================================================

/**
 * Apply `ignoreCodes` filter to a result. Returns a new shallow-copy with
 * filtered arrays — does not mutate.
 */
export function applyIgnore(
  result: ValidationResult,
  ignoreCodes?: ReadonlySet<string>
): ValidationResult {
  if (!ignoreCodes || ignoreCodes.size === 0) return result
  const errors = result.errors.filter(e => !ignoreCodes.has(e.code))
  const warnings = result.warnings.filter(w => !ignoreCodes.has(w.code))
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
  }
}

// ============================================================================
// runner
// ============================================================================

/**
 * Validate one or more inputs and return a structured result. This is the
 * single entry point used by both the CLI and tests.
 */
export function runValidator(opts: RunnerOptions): RunnerResult {
  const expanded = expandInputs(opts.inputs)

  // Read all files up-front so we can build a prelude.
  const projectFiles: ProjectFile[] = []
  const codeFiles: { filename: string; absolute: string; content: string }[] = []
  for (const abs of expanded) {
    const content = fs.readFileSync(abs, 'utf-8')
    projectFiles.push({ filename: path.basename(abs), content })
    codeFiles.push({
      filename: path.basename(abs),
      absolute: abs,
      content,
    })
  }

  // Decide project-mode: explicit option wins; otherwise true if >1 file.
  const projectMode = opts.projectMode ?? expanded.length > 1

  // Build cross-file prelude (only for project mode — single-file mode
  // intentionally validates standalone so missing token defs surface).
  const prelude = projectMode
    ? collectPrelude(codeFiles.filter(f => isMirrorCodeFile(f.filename)))
    : { tokens: new Set<string>(), components: new Set<string>() }
  const validateOpts: ValidateOptions = {
    preludeTokens: prelude.tokens,
    preludeComponents: prelude.components,
  }

  // Validate each code file (data files have their own grammar, skipped).
  const fileResults: FileResult[] = []
  for (const f of codeFiles) {
    if (!isMirrorCodeFile(f.filename)) continue
    const raw = validate(f.content, validateOpts)
    const filtered = applyIgnore(raw, opts.ignoreCodes)
    fileResults.push({
      filename: f.filename,
      relativePath: path.relative(process.cwd(), f.absolute),
      source: f.content,
      errors: filtered.errors,
      warnings: filtered.warnings,
    })
  }

  // Cross-file pass: only in project mode and only across code files.
  const crossFileErrors = projectMode
    ? validateProject(projectFiles.filter(p => isMirrorCodeFile(p.filename))).filter(
        e => !opts.ignoreCodes?.has(crossFileCodeToErrorCode(e.code))
      )
    : []

  // Tally
  const errorCount =
    fileResults.reduce((acc, fr) => acc + fr.errors.length, 0) + crossFileErrors.length
  const warningCount = fileResults.reduce((acc, fr) => acc + fr.warnings.length, 0)

  const warningLimitExceeded = opts.maxWarnings !== undefined && warningCount > opts.maxWarnings

  let exitCode = 0
  if (errorCount > 0) exitCode = 1
  else if (opts.strict && warningCount > 0) exitCode = 1
  else if (warningLimitExceeded) exitCode = 2

  return {
    fileResults,
    crossFileErrors,
    totals: {
      files: fileResults.length,
      errors: errorCount,
      warnings: warningCount,
      crossFileErrors: crossFileErrors.length,
    },
    exitCode,
    warningLimitExceeded,
  }
}

/**
 * Map a `CrossFileError.code` ('undefined-token', ...) to its public
 * validator error code so users can suppress it via `--ignore`.
 */
export function crossFileCodeToErrorCode(code: CrossFileError['code']): string {
  switch (code) {
    case 'undefined-token':
      return 'W500'
    case 'undefined-component':
      return 'E002'
    case 'undefined-data-key':
      return 'W500'
    case 'duplicate-token':
      return 'E603'
  }
}

// ============================================================================
// Helpers re-exported for tests
// ============================================================================

export { getAllMirrorExtensions }
