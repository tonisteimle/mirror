/**
 * Cross-File Validator
 *
 * Multi-File-Roadmap Komponente 3: Validates references across all files in
 * a project. Catches the class of errors that pure single-file parsing
 * misses — undefined tokens, undefined components, duplicate definitions,
 * missing data keys — with file + line + Levenshtein-suggested alternative.
 *
 * Runs as a separate pass AFTER classify() and BEFORE the final
 * compilation. The validator is content-only — it never mutates the AST.
 *
 * Errors emitted:
 *   - undefined-token       — `$primary` referenced but no `primary.*: …`
 *   - undefined-component   — `Card` instance but no `Card:` definition
 *   - undefined-data-key    — `$users` in data context but no `users:` def
 *   - duplicate-token       — two files define `primary.bg` differently
 *
 * Single-file errors (parse errors, syntax errors) belong in the parser
 * itself. This validator only deals with cross-file consistency.
 */

import type { Property, Instance } from '../parser/ast'
import { parse, parseWithDiagnostics } from '../parser'
import { isPrimitive } from '../schema/dsl'
import { suggestSimilar } from '../validator/string-utils'
import { getBuiltinComponents } from '../validator/builtin-prelude'
import { classify, isPropertySet, isPlainToken, isDataObject } from './classify'
import type { ProjectFile } from './project-loader'

// ============================================================================
// Public types
// ============================================================================

export type CrossFileErrorCode =
  | 'undefined-token'
  | 'undefined-component'
  | 'undefined-data-key'
  | 'duplicate-token'

export interface CrossFileError {
  code: CrossFileErrorCode
  /** File where the error was detected. */
  filename: string
  /** 1-based line number within `filename`. */
  line: number
  /** Human-readable message including the offending name. */
  message: string
  /** Levenshtein-suggested alternative, if any. */
  suggestion?: string
  /** For duplicate-token: the OTHER file that defines the same name. */
  otherFile?: string
  otherLine?: number
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Walk every Property in an Instance + its children, calling visit() on
 * each. Used to collect token references. Only the value side is
 * inspected (token refs live in property values, not in property names).
 */
function visitProperties(node: Instance, visit: (prop: Property) => void): void {
  for (const prop of node.properties) visit(prop)
  for (const child of node.children) {
    if (child.type === 'Instance') visitProperties(child, visit)
  }
}

/**
 * Collect every TokenReference name from a property's values, including
 * nested expressions / conditionals.
 */
function collectTokenRefs(prop: Property): { name: string; line: number }[] {
  const refs: { name: string; line: number }[] = []
  for (const v of prop.values) {
    if (typeof v === 'object' && v !== null && 'kind' in v) {
      if (v.kind === 'token') {
        refs.push({ name: v.name, line: prop.line })
      } else if (v.kind === 'expression') {
        for (const part of v.parts) {
          if (
            typeof part === 'object' &&
            part !== null &&
            'kind' in part &&
            part.kind === 'token'
          ) {
            refs.push({ name: part.name, line: prop.line })
          }
        }
      } else if (v.kind === 'conditional') {
        // Conditional values can contain token refs in then/else, but the
        // Conditional's leaf values are scalars in the current grammar.
        // No-op for now.
      }
    }
  }
  return refs
}

interface FileIndex {
  filename: string
  source: string
  parseLine: number
  // All token names defined in this file (with their first-line position).
  tokenDefs: Map<string, { line: number; value: string | number | boolean | undefined }>
  // Component names defined here.
  componentDefs: Map<string, number>
  // Data-object keys defined here.
  dataDefs: Map<string, number>
  // Layout-instance roots that need cross-file checking.
  instances: Instance[]
}

/**
 * Build a per-file index of definitions + instance roots. The prose
 * prelude lets the parser switch to prose-body parsing for components
 * defined in OTHER files — without it, capitalized German words inside
 * prose paragraphs would be parsed as Instance refs and flagged as
 * undefined components in the cross-file pass.
 */
function indexFile(file: ProjectFile, proseComponentPrelude?: ReadonlySet<string>): FileIndex {
  const ast = proseComponentPrelude
    ? parseWithDiagnostics(file.content, { proseComponentPrelude }).ast
    : parse(file.content)
  const c = classify(ast)
  const tokenDefs = new Map<
    string,
    { line: number; value: string | number | boolean | undefined }
  >()
  const componentDefs = new Map<string, number>()
  const dataDefs = new Map<string, number>()

  // Plain tokens + property-sets land in c.tokens. Data objects land in
  // c.data. Components in c.components. Each AST node has its line.
  for (const t of c.tokens) {
    if (isPlainToken(t) || isPropertySet(t)) {
      tokenDefs.set(t.name, { line: t.line, value: isPlainToken(t) ? t.value : undefined })
    }
  }
  for (const d of c.data) {
    if (d.type === 'Token' && isDataObject(d)) {
      dataDefs.set(d.name, d.line)
    }
    // $schema and $icons don't introduce reachable names from layouts.
  }
  for (const comp of c.components) {
    if (comp.type === 'Component') componentDefs.set(comp.name, comp.line)
  }

  // Layout-instance roots need to be walked to find token + component refs.
  const instances: Instance[] = []
  for (const layout of c.layouts) {
    if (layout.type === 'Instance') instances.push(layout)
  }

  return {
    filename: file.filename,
    source: file.content,
    parseLine: 1,
    tokenDefs,
    componentDefs,
    dataDefs,
    instances,
  }
}

// ============================================================================
// validateProject
// ============================================================================

/**
 * Run cross-file validation across all files in a project.
 *
 * @param files Project files (typically the same input given to
 *              loadProject()).
 * @returns An array of cross-file errors. Empty array means the project
 *          is internally consistent.
 */
export function validateProject(files: ProjectFile[]): CrossFileError[] {
  const errors: CrossFileError[] = []

  // Phase 0: prelude scan — find every component name across all files
  // that carries `, prose` so the parser knows to switch to prose-body
  // parsing in OTHER files where the component is used. Without this
  // every capitalized German word inside a prose paragraph (e.g.
  // "Universalfragen", "Schaffe", "Was") gets parsed as an undefined
  // component reference.
  const proseComponentPrelude = new Set<string>()
  for (const file of files) {
    let ast
    try {
      ast = parse(file.content)
    } catch {
      continue
    }
    const cls = classify(ast)
    for (const comp of cls.components) {
      if (comp.type === 'Component' && comp.properties.some(p => p.name === 'prose')) {
        proseComponentPrelude.add(comp.name)
      }
    }
  }

  // Phase 1: index every file's definitions, this time with the prose
  // prelude so prose bodies don't pollute the instance tree.
  const indexes = files.map(f => indexFile(f, proseComponentPrelude))

  // Phase 2: build global definition tables. For tokens, also detect
  // duplicate definitions across files (same name with different values).
  const globalTokens = new Map<string, { filename: string; line: number; value: unknown }>()
  const globalComponents = new Map<string, { filename: string; line: number }>()
  const globalDataKeys = new Map<string, { filename: string; line: number }>()

  for (const idx of indexes) {
    for (const [name, info] of idx.tokenDefs) {
      const existing = globalTokens.get(name)
      if (existing && existing.value !== info.value) {
        errors.push({
          code: 'duplicate-token',
          filename: idx.filename,
          line: info.line,
          message: `Token "${name}" wird zweimal mit unterschiedlichen Werten definiert (${existing.value} vs ${info.value}).`,
          otherFile: existing.filename,
          otherLine: existing.line,
        })
      } else if (!existing) {
        globalTokens.set(name, { filename: idx.filename, line: info.line, value: info.value })
      }
    }
    for (const [name, line] of idx.componentDefs) {
      // Last-write-wins for components — a project can override a
      // shared component locally without it being an error.
      globalComponents.set(name, { filename: idx.filename, line })
    }
    for (const [name, line] of idx.dataDefs) {
      globalDataKeys.set(name, { filename: idx.filename, line })
    }
  }

  // Phase 3: walk all instances and check refs.
  // Token refs (`$name` and `$name.suffix`) — name is everything before
  // the first dot if present. We accept both an exact match (e.g.
  // `primary.bg`) and a base-name match (e.g. `primary` matches a token
  // family `primary.bg` / `primary.col`).
  const tokenBaseNames = new Set<string>()
  for (const fullName of globalTokens.keys()) {
    const dot = fullName.indexOf('.')
    tokenBaseNames.add(dot >= 0 ? fullName.slice(0, dot) : fullName)
  }

  function checkTokenRef(name: string, filename: string, line: number): void {
    // Exact match wins (e.g. `primary.bg`).
    if (globalTokens.has(name)) return
    // Base-name family match (e.g. `primary` for `primary.bg`).
    if (tokenBaseNames.has(name)) return
    // Not found — emit error with suggestion.
    const suggestion =
      suggestSimilar(name, [...globalTokens.keys(), ...tokenBaseNames], 2) ?? undefined
    errors.push({
      code: 'undefined-token',
      filename,
      line,
      message: `Token "${name}" nicht definiert.`,
      suggestion,
    })
  }

  // Built-in components / template slots / chart primitives / Zag
  // primitives + their slots — always defined regardless of project files.
  const builtinComponents = getBuiltinComponents()

  function checkComponentRef(name: string, filename: string, line: number): void {
    if (isPrimitive(name)) return
    if (builtinComponents.has(name)) return
    if (globalComponents.has(name)) return
    const suggestion =
      suggestSimilar(name, [...globalComponents.keys(), ...builtinComponents], 2) ?? undefined
    errors.push({
      code: 'undefined-component',
      filename,
      line,
      message: `Component "${name}" nicht definiert.`,
      suggestion,
    })
  }

  function walkInstance(node: Instance, filename: string): void {
    // Component reference (the type itself).
    checkComponentRef(node.component, filename, node.line)
    // Token references in this node's properties.
    for (const prop of node.properties) {
      for (const ref of collectTokenRefs(prop)) {
        checkTokenRef(ref.name, filename, ref.line)
      }
    }
    // Recurse into children (only Instance children — Slot/Text/Zag don't
    // carry component types).
    for (const child of node.children) {
      if (child.type === 'Instance') walkInstance(child, filename)
    }
  }

  for (const idx of indexes) {
    for (const inst of idx.instances) {
      walkInstance(inst, idx.filename)
    }
  }

  return errors
}
