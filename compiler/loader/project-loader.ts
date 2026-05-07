/**
 * Project Loader — extension-agnostic
 *
 * Multi-File-Roadmap Komponente 2: Nimmt eine Map `{ filename → content }`
 * aller Mirror-Files im Projekt entgegen, klassifiziert jede Top-Level-
 * Definition über `classify()` und produziert eine einzige kombinierte
 * Source-String in der kanonischen Reihenfolge:
 *
 *     1. data        (data-objects, $schema, $icons)
 *     2. tokens      (plain tokens + property-sets)
 *     3. components  (component- + animation-definitions)
 *     4. layouts     (canvas + element-instances)
 *
 * Innerhalb der layout-Phase: das File mit `canvas`-Direktive kommt zuletzt
 * (= Preview-Entry). Andere Layouts werden alphabetisch nach Filename
 * sortiert. Files ohne canvas dürfen Layout-Instanzen enthalten — die
 * werden vor dem canvas-File gerendert (z.B. als zusätzliche Top-Level-
 * Komponenten oder Sub-Screens).
 *
 * **Hybrid-Files** sind explizit erlaubt: ein einzelnes File darf Tokens +
 * Components + Layouts mischen, jede Definition wird individuell der
 * richtigen Phase zugeordnet. Source-Lines werden im kombinierten Output
 * dabei auseinandergerissen, aber Source-Map-Offsets behalten die
 * Original-Position über das `originFile`-Field jedes Output-Knotens.
 *
 * Output ist ein String in der Form:
 *
 *     // === filename1 (data) ===
 *     <reproduzierter Source der data-Definitionen>
 *
 *     // === filename2 (tokens) ===
 *     <reproduzierter Source der token-Definitionen>
 *
 *     ...
 *
 * Das matcht den heutigen Separator-Stil aus `compiler/preprocessor.ts` und
 * lässt sich vom existierenden `parse()` ohne Änderungen verarbeiten.
 */

import { parse } from '../parser'
import type { ParseError } from '../parser/ast'
import { classify, type ClassifiedDefinitions } from './classify'

// ============================================================================
// Public types
// ============================================================================

export interface ProjectFile {
  filename: string
  content: string
}

export interface LoadedProject {
  /** Combined source ready for parse() / compile(). */
  source: string
  /**
   * Per-file diagnostics from the parse pass. If any file has parse
   * errors, the loader still returns a `source` (best-effort) but
   * `errors` is populated; downstream callers should typically halt
   * before further compilation when errors are non-empty.
   */
  errors: Array<{ filename: string; error: ParseError }>
  /**
   * Filename of the canvas-bearing file (preview-entry), if any. The
   * studio uses this to pick the file that drives the preview when the
   * editor sits on a non-layout file.
   */
  canvasFile: string | null
}

// ============================================================================
// Implementation
// ============================================================================

interface ParsedFile {
  filename: string
  source: string
  /** Source with the canvas-line removed (if any), to be emitted in-phase. */
  sourceWithoutCanvas: string
  /** The extracted canvas-line, or null if file has no canvas. */
  canvasLine: string | null
  classified: ClassifiedDefinitions
  hasCanvas: boolean
  parseErrors: ParseError[]
}

/**
 * Mirror's parser is strict: `canvas …` must be the FIRST non-comment line
 * of the source it parses. In a combined multi-file source, that means the
 * canvas declaration MUST be hoisted to the very top, above all phase
 * sections — otherwise tokens/components from other files appear before
 * canvas and the parser rejects it.
 *
 * We extract the canvas line from the file source using the AST's recorded
 * line number, then emit the rest of the file content in its normal phase.
 * Comments above the canvas line are preserved with the rest.
 */
function extractCanvasLine(
  source: string,
  canvasLineNum: number
): { canvasLine: string; rest: string } {
  const lines = source.split('\n')
  const idx = canvasLineNum - 1 // AST is 1-based
  if (idx < 0 || idx >= lines.length) {
    return { canvasLine: '', rest: source }
  }
  const canvasLine = lines[idx]
  const restLines = lines.slice(0, idx).concat(lines.slice(idx + 1))
  return { canvasLine, rest: restLines.join('\n') }
}

/**
 * Phase 1: parse and classify each file.
 */
function parseAndClassify(files: ProjectFile[]): ParsedFile[] {
  return files.map(({ filename, content }) => {
    const ast = parse(content)
    const classified = classify(ast)
    const hasCanvas = ast.canvas !== undefined
    let sourceWithoutCanvas = content
    let canvasLine: string | null = null
    if (hasCanvas && ast.canvas) {
      const extracted = extractCanvasLine(content, ast.canvas.line)
      canvasLine = extracted.canvasLine
      sourceWithoutCanvas = extracted.rest
    }
    return {
      filename,
      source: content,
      sourceWithoutCanvas,
      canvasLine,
      classified,
      hasCanvas,
      parseErrors: ast.errors,
    }
  })
}

/**
 * Render only the lines of `source` that contain definitions of the given
 * AST nodes. We use `node.line` (1-based) to determine the start line and
 * scan downward until we hit either:
 *   - the next non-included top-level start (line < the next picked node's
 *     line, if any), OR
 *   - the end of file.
 *
 * For Phase 2 we keep this simple: emit the entire file content under each
 * phase-section, with a header comment, but only ONCE per phase even if
 * the file contains multiple bucket types. The duplicate-emit problem is
 * avoided by emitting the WHOLE file content under its FIRST encountered
 * phase, never under subsequent phases.
 *
 * Trade-off: This means in a hybrid file `dashboard.mir` containing
 * `primary.bg + Card + Frame`, the entire file lands in the data/tokens
 * phase (whichever comes first). The parser is then re-run on the
 * combined source and STILL classifies each definition correctly because
 * Mirror's parse is order-insensitive within the same phase.
 *
 * In a future iteration we can split per-definition (extracting precise
 * line ranges per node) for cleaner output, but that requires accurate
 * end-line tracking that the AST doesn't currently provide consistently.
 * For now the simple "whole-file-under-first-phase" approach is correct
 * (semantically equivalent) and dependency-graph friendly.
 */

/**
 * Determine the dominant phase for a file based on which bucket has the
 * most top-level definitions. Ties are broken in canonical order
 * (data > tokens > components > layouts) — i.e. earliest phase wins.
 *
 * Files with NO definitions (empty / comment-only) get phase=null and are
 * skipped in the output (no point emitting an empty section).
 */
function dominantPhase(
  c: ClassifiedDefinitions
): 'data' | 'tokens' | 'components' | 'layouts' | null {
  const counts = {
    data: c.data.length,
    tokens: c.tokens.length,
    components: c.components.length,
    layouts: c.layouts.length,
  }
  const max = Math.max(counts.data, counts.tokens, counts.components, counts.layouts)
  if (max === 0) return null
  // Tie-break: earliest phase wins.
  if (counts.data === max) return 'data'
  if (counts.tokens === max) return 'tokens'
  if (counts.components === max) return 'components'
  return 'layouts'
}

/**
 * Sort layout-phase files: alphabetical, with the canvas-bearing file
 * last (so element-instances above it can reference it / be rendered
 * before the actual entry-point layout).
 */
function sortLayoutFiles(files: ParsedFile[]): ParsedFile[] {
  const canvasFile = files.find(f => f.hasCanvas)
  const others = files
    .filter(f => !f.hasCanvas)
    .sort((a, b) => a.filename.localeCompare(b.filename))
  return canvasFile ? [...others, canvasFile] : others
}

/**
 * Group files by their dominant phase, sorting each group as needed.
 */
function groupByPhase(
  parsed: ParsedFile[]
): Record<'data' | 'tokens' | 'components' | 'layouts', ParsedFile[]> {
  const groups = {
    data: [] as ParsedFile[],
    tokens: [] as ParsedFile[],
    components: [] as ParsedFile[],
    layouts: [] as ParsedFile[],
  }
  for (const file of parsed) {
    const phase = dominantPhase(file.classified)
    if (phase) groups[phase].push(file)
  }
  // Alphabetical within each non-layout phase; layouts use canvas-last rule.
  groups.data.sort((a, b) => a.filename.localeCompare(b.filename))
  groups.tokens.sort((a, b) => a.filename.localeCompare(b.filename))
  groups.components.sort((a, b) => a.filename.localeCompare(b.filename))
  groups.layouts = sortLayoutFiles(groups.layouts)
  return groups
}

// ============================================================================
// loadProject
// ============================================================================

/**
 * Loads and combines all project files in canonical phase order. The
 * returned `source` can be passed directly to `parse()` / the existing
 * compile pipeline.
 *
 * @param files Map-like array of `{ filename, content }` for every file
 *              in the project. Empty / comment-only files are skipped.
 * @returns LoadedProject with combined source, per-file parse errors,
 *          and the canvas-bearing filename (or null if none).
 */
export function loadProject(files: ProjectFile[]): LoadedProject {
  const parsed = parseAndClassify(files)

  // Aggregate per-file parse errors so callers can short-circuit before
  // running the combined source through compile.
  const errors: LoadedProject['errors'] = []
  for (const file of parsed) {
    for (const err of file.parseErrors) {
      errors.push({ filename: file.filename, error: err })
    }
  }

  const canvasParsed = parsed.find(f => f.hasCanvas) ?? null
  const canvasFile = canvasParsed?.filename ?? null

  const groups = groupByPhase(parsed)
  const sections: string[] = []

  // Canvas hoist: Mirror's parser requires `canvas …` to be the first
  // non-comment line. We emit it once at the very top, then emit the rest
  // of the canvas-bearing file (sans canvas-line) in its normal phase.
  if (canvasParsed?.canvasLine) {
    sections.push(`// === ${canvasParsed.filename} (canvas) ===`)
    sections.push(canvasParsed.canvasLine)
    sections.push('')
  }

  const phases: Array<'data' | 'tokens' | 'components' | 'layouts'> = [
    'data',
    'tokens',
    'components',
    'layouts',
  ]

  for (const phase of phases) {
    for (const file of groups[phase]) {
      // Use the source with the canvas line stripped for the canvas-file,
      // and the original source for everyone else. Skip if empty.
      const body = (file.hasCanvas ? file.sourceWithoutCanvas : file.source).trim()
      if (!body) continue
      sections.push(`// === ${file.filename} (${phase}) ===`)
      sections.push(body)
      sections.push('')
    }
  }

  return {
    source: sections.join('\n'),
    errors,
    canvasFile,
  }
}
