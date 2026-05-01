/**
 * Pattern Match — Component / Token Extract Batch Replace
 *
 * Pure functions for deciding whether two Mirror lines describe the
 * same styling pattern. Used by the `::` extract triggers to find
 * other instances in the project that should be replaced too.
 *
 * Rule (from docs/archive/concepts/batch-replace-on-extract.md):
 *   Two lines match the same pattern when they are byte-identical
 *   *except* for quoted strings (which represent per-instance content
 *   and may legitimately differ between instances).
 *
 * Match is property-order-independent (sorted by property name) and
 * positional-resolution-aware (`Frame 100, 50, #333` matches
 * `Frame w 100, h 50, bg #333`).
 *
 * Element name is included for matching: `Frame pad 16, ...` does NOT
 * match `Btn pad 16, ...` even with identical properties — they are
 * different element types and should not be batched together.
 */

import { resolvePositionalArgs } from '../../../compiler/positional-resolver'

export type ValueKind =
  | 'string'
  | 'hex'
  | 'number'
  | 'token'
  | 'keyword'
  | 'function'
  | 'boolean'
  | 'unknown'

export interface ClassifiedValue {
  kind: ValueKind
  raw: string
}

export interface CanonicalProperty {
  /** Property name (e.g. 'bg', 'pad'). null = bare positional value. */
  name: string | null
  /** Tokens of the value (`pad 12 24` → ['12', '24']). */
  values: ClassifiedValue[]
}

export interface CanonicalLine {
  elementName: string
  /** Leading content string (e.g. `Text "Hi"` → '"Hi"'). null if absent. */
  leadingString: string | null
  /** Properties sorted alphabetically by name. */
  properties: CanonicalProperty[]
}

export interface MatchResult {
  filename: string
  /** 1-based line number. */
  lineNumber: number
  /** Original line text (untransformed). */
  originalText: string
}

const NAMED_COLORS = new Set([
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'black',
  'white',
  'gray',
  'grey',
  'cyan',
  'magenta',
  'brown',
  'transparent',
  'currentColor',
])

const SIZE_KEYWORDS = new Set(['hug', 'full'])

/**
 * Canonicalize a single Mirror line for pattern matching. Returns null
 * for lines that aren't element instance uses (definitions, slots,
 * tokens, comments, blank lines).
 */
export function canonicalize(line: string): CanonicalLine | null {
  // Strip inline comment (only outside of strings — primitive impl
  // assumes strings don't contain `//`, which is true for Mirror).
  const stripped = stripInlineComment(line).trim()
  if (!stripped) return null

  // Element name must be capitalized identifier at start.
  const elementMatch = stripped.match(/^([A-Z][a-zA-Z0-9_]*)\b/)
  if (!elementMatch) return null
  const elementName = elementMatch[1]

  let pos = elementMatch[0].length
  while (pos < stripped.length && /\s/.test(stripped[pos])) pos++

  // Definition site (`Name:` or `Name as X:`) — not an instance use.
  if (stripped[pos] === ':') return null
  if (stripped.slice(pos).match(/^as\s+[A-Z][a-zA-Z0-9_]*\s*:/)) return null

  // Optional leading content string.
  let leadingString: string | null = null
  if (stripped[pos] === '"' || stripped[pos] === "'") {
    const end = findStringEnd(stripped, pos)
    if (end === -1) return null
    leadingString = stripped.slice(pos, end + 1)
    pos = end + 1
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++
    if (stripped[pos] === ',') {
      pos++
      while (pos < stripped.length && /\s/.test(stripped[pos])) pos++
    }
  }

  const propsStr = stripped.slice(pos)
  const propSegments = splitOnComma(propsStr)

  const properties: CanonicalProperty[] = []
  for (const seg of propSegments) {
    const parsed = parseProperty(seg.trim())
    if (parsed) properties.push(parsed)
  }

  // Sort alphabetically by name; null-named (positional bare) keep
  // appearance order at the end.
  const named = properties.filter(p => p.name !== null)
  const positional = properties.filter(p => p.name === null)
  named.sort((a, b) => a.name!.localeCompare(b.name!))
  const sorted = [...named, ...positional]

  return { elementName, leadingString, properties: sorted }
}

function parseProperty(segment: string): CanonicalProperty | null {
  if (!segment) return null

  // Try named property: leading identifier
  const nameMatch = segment.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\b/)
  if (nameMatch) {
    const name = nameMatch[1]
    const valueStr = segment.slice(nameMatch[0].length).trim()

    // Standalone keyword property (no value): hor, hidden, focusable, etc.
    if (!valueStr) {
      return { name, values: [] }
    }

    return { name, values: tokenizeValue(valueStr) }
  }

  // Positional bare value (no name): #333, 100, $primary, "Hi"
  return { name: null, values: tokenizeValue(segment) }
}

/**
 * Split a value string into classified tokens. `pad 12 24` → 12, 24
 * (two number tokens). `bg rgba(0,0,0,0.5)` → one function token.
 */
function tokenizeValue(s: string): ClassifiedValue[] {
  const tokens: ClassifiedValue[] = []
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    if (i >= s.length) break

    // Quoted string
    if (s[i] === '"' || s[i] === "'") {
      const end = findStringEnd(s, i)
      if (end === -1) {
        // Unterminated — take rest as unknown
        tokens.push({ kind: 'unknown', raw: s.slice(i) })
        break
      }
      tokens.push({ kind: 'string', raw: s.slice(i, end + 1) })
      i = end + 1
      continue
    }

    // Function call (rgba/linear-gradient/etc.) — read until matching close paren
    const fnMatch = s.slice(i).match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*\(/)
    if (fnMatch) {
      let depth = 0
      let j = i + fnMatch[0].length - 1 // at the '('
      while (j < s.length) {
        if (s[j] === '(') depth++
        else if (s[j] === ')') {
          depth--
          if (depth === 0) {
            j++
            break
          }
        }
        j++
      }
      tokens.push({ kind: 'function', raw: s.slice(i, j) })
      i = j
      continue
    }

    // Read next whitespace-delimited token
    let j = i
    while (j < s.length && !/\s/.test(s[j])) j++
    const raw = s.slice(i, j)
    tokens.push({ kind: classifyToken(raw), raw })
    i = j
  }
  return tokens
}

function classifyToken(s: string): ValueKind {
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return 'hex'
  if (/^-?\d+(\.\d+)?$/.test(s)) return 'number'
  if (/^\$[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)?$/.test(s)) return 'token'
  if (s === 'true' || s === 'false') return 'boolean'
  if (NAMED_COLORS.has(s)) return 'keyword' // named colors classified as keywords for match strictness
  if (SIZE_KEYWORDS.has(s)) return 'keyword'
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)) return 'keyword'
  return 'unknown'
}

/**
 * Compare two canonical lines for STRICT pattern equality (same element
 * name + same properties + same string-presence). Used when the
 * matching identity includes the element type — e.g. for token-extract
 * batch-replace where `bg #333` should only match other `bg ...`.
 */
export function linesMatch(a: CanonicalLine, b: CanonicalLine): boolean {
  if (a.elementName !== b.elementName) return false
  return propertiesMatch(a, b)
}

/**
 * Compare two canonical lines IGNORING element names, but matching
 * properties strictly (with string-tolerance). Used by component-extract
 * batch-replace, where the user typing `Card::` may have originally had
 * `Frame`, `Btn`, or another element — we want all of them to surface
 * as candidates that can be unified under `Card` (with per-match opt-out
 * in the UI).
 *
 * Match rule:
 *   - Both have or both lack a leading string
 *   - Same number of properties
 *   - Each property pair (sorted by name) matches:
 *     - Property names identical
 *     - Same number of value tokens
 *     - Each value token matches: both 'string' kind (any value) OR
 *       same kind + same raw text
 */
export function propertiesMatch(a: CanonicalLine, b: CanonicalLine): boolean {
  if ((a.leadingString === null) !== (b.leadingString === null)) return false
  if (a.properties.length !== b.properties.length) return false
  for (let i = 0; i < a.properties.length; i++) {
    if (!propertyMatch(a.properties[i], b.properties[i])) return false
  }
  return true
}

function propertyMatch(a: CanonicalProperty, b: CanonicalProperty): boolean {
  if (a.name !== b.name) return false
  if (a.values.length !== b.values.length) return false
  for (let i = 0; i < a.values.length; i++) {
    if (!valueMatch(a.values[i], b.values[i])) return false
  }
  return true
}

function valueMatch(a: ClassifiedValue, b: ClassifiedValue): boolean {
  // Strings may differ — they are per-instance content.
  if (a.kind === 'string' && b.kind === 'string') return true
  return a.kind === b.kind && a.raw === b.raw
}

export interface ProjectFile {
  filename: string
  source: string
}

export interface FindMatchesInput {
  /**
   * The user-typed `Name::` line (without `::` — i.e. what the line
   * "would have looked like" if user just typed properties without
   * triggering extraction). Used as the pattern reference.
   */
  targetReferenceLine: string
  /** All project files to scan, including the file containing the target. */
  files: ProjectFile[]
  /** Filename of the file containing the target line. */
  targetFilename: string
  /** 1-based line number of the target in its file. Skip-listed. */
  targetLineNumber: number
  /**
   * The new component name. Existing instances of `<componentName>`
   * are skipped (already this component, no replacement needed).
   */
  componentName: string
}

/**
 * Scan project files for lines that match the target pattern. The
 * target line itself is skipped, and any line whose element is already
 * the new component is skipped (no point replacing Card with Card).
 *
 * Each file's source is run through the positional-resolver before
 * line-by-line scanning, so positional and explicit forms canonicalize
 * to the same shape.
 */
export function findProjectMatches(input: FindMatchesInput): MatchResult[] {
  // Run the target reference through the positional-resolver too, so
  // a positional target matches explicit candidates (and vice versa).
  let targetResolved: string
  try {
    targetResolved = resolvePositionalArgs(input.targetReferenceLine)
  } catch {
    targetResolved = input.targetReferenceLine
  }
  const targetCanonical = canonicalize(targetResolved)
  if (!targetCanonical) return []

  const results: MatchResult[] = []

  for (const file of input.files) {
    let resolvedSource: string
    try {
      resolvedSource = resolvePositionalArgs(file.source)
    } catch {
      // If the file has positional resolver errors, skip it for matching.
      continue
    }

    const originalLines = file.source.split('\n')
    const resolvedLines = resolvedSource.split('\n')

    // Resolved lines should be 1:1 with original (resolver preserves line breaks).
    if (resolvedLines.length !== originalLines.length) continue

    for (let i = 0; i < resolvedLines.length; i++) {
      // Skip the target line itself.
      if (file.filename === input.targetFilename && i + 1 === input.targetLineNumber) {
        continue
      }

      const candidate = canonicalize(resolvedLines[i])
      if (!candidate) continue

      // Skip lines that are already the new component (no-op replace).
      if (candidate.elementName === input.componentName) continue

      if (propertiesMatch(targetCanonical, candidate)) {
        results.push({
          filename: file.filename,
          lineNumber: i + 1,
          originalText: originalLines[i],
        })
      }
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Near-Match (Override Mode) for Component-Extract
// ---------------------------------------------------------------------------

/** Maximum value-differences before we stop calling something "near". */
const NEAR_MATCH_MAX_DIFFS = 3

export interface NearMatchOverride {
  /** Property name (e.g. `bg`). */
  name: string
  /** The candidate's value text, formatted as it should appear in the
   *  override (e.g. `#2271C1` → emit as `bg #2271C1`). */
  rawValue: string
}

export interface NearMatchResult {
  filename: string
  lineNumber: number
  originalText: string
  /** Properties whose values differ from the target — become overrides
   *  on the new instance line. */
  overrides: NearMatchOverride[]
}

/**
 * Find lines that don't exactly match the target but are CLOSE: same
 * element name, same set of property names, ≤ NEAR_MATCH_MAX_DIFFS
 * value differences. Differing values become overrides on the resulting
 * instance line (e.g. `Card bg #ef4444`).
 *
 * Lines that exactly match the target are EXCLUDED — those go through
 * findProjectMatches. Same skip-list applies (target line itself,
 * lines already the new component).
 */
export function findNearMatches(input: FindMatchesInput): NearMatchResult[] {
  let targetResolved: string
  try {
    targetResolved = resolvePositionalArgs(input.targetReferenceLine)
  } catch {
    targetResolved = input.targetReferenceLine
  }
  const targetCanonical = canonicalize(targetResolved)
  if (!targetCanonical) return []

  const results: NearMatchResult[] = []

  for (const file of input.files) {
    let resolvedSource: string
    try {
      resolvedSource = resolvePositionalArgs(file.source)
    } catch {
      continue
    }

    const originalLines = file.source.split('\n')
    const resolvedLines = resolvedSource.split('\n')
    if (resolvedLines.length !== originalLines.length) continue

    for (let i = 0; i < resolvedLines.length; i++) {
      if (file.filename === input.targetFilename && i + 1 === input.targetLineNumber) {
        continue
      }

      const candidate = canonicalize(resolvedLines[i])
      if (!candidate) continue
      if (candidate.elementName === input.componentName) continue

      // Exact match → not a near match. Skip.
      if (propertiesMatch(targetCanonical, candidate)) continue

      const overrides = computeOverrides(targetCanonical, candidate)
      if (!overrides) continue
      if (overrides.length === 0 || overrides.length > NEAR_MATCH_MAX_DIFFS) continue

      results.push({
        filename: file.filename,
        lineNumber: i + 1,
        originalText: originalLines[i],
        overrides,
      })
    }
  }

  return results
}

/**
 * Compute the override list when candidate is a near-match of target.
 * Returns null if the lines are too different to consider near
 * (different shape, leading-string mismatch, missing properties).
 *
 * Allowed differences:
 *   - Same property NAMES (sets equal)
 *   - 1..NEAR_MATCH_MAX_DIFFS values differ
 * Everything else returns null.
 */
function computeOverrides(
  target: CanonicalLine,
  candidate: CanonicalLine
): NearMatchOverride[] | null {
  // Leading-string presence must match.
  if ((target.leadingString === null) !== (candidate.leadingString === null)) return null

  // Build property-name → value lookups (sorted canonical form).
  const targetByName = new Map<string, ClassifiedValue[]>()
  for (const p of target.properties) {
    if (p.name === null) return null // positional in target — too ambiguous
    targetByName.set(p.name, p.values)
  }
  const candidateByName = new Map<string, ClassifiedValue[]>()
  for (const p of candidate.properties) {
    if (p.name === null) return null // positional in candidate — too ambiguous
    candidateByName.set(p.name, p.values)
  }

  // Same set of property names required.
  if (targetByName.size !== candidateByName.size) return null
  for (const name of targetByName.keys()) {
    if (!candidateByName.has(name)) return null
  }

  // Walk and find differences.
  const overrides: NearMatchOverride[] = []
  for (const [name, targetValues] of targetByName) {
    const candValues = candidateByName.get(name)!
    if (targetValues.length !== candValues.length) {
      // Different number of value tokens — count as one diff and emit
      // the candidate's raw value list as the override.
      overrides.push({
        name,
        rawValue: candValues.map(v => v.raw).join(' '),
      })
      continue
    }
    let matches = true
    for (let i = 0; i < targetValues.length; i++) {
      if (!valueMatch(targetValues[i], candValues[i])) {
        matches = false
        break
      }
    }
    if (!matches) {
      overrides.push({
        name,
        rawValue: candValues.map(v => v.raw).join(' '),
      })
    }
  }

  return overrides
}

// ---------------------------------------------------------------------------
// Segment-Level Matching (for Token-Extract Batch-Replace)
// ---------------------------------------------------------------------------

export interface SegmentMatch {
  filename: string
  /** 1-based line number. */
  lineNumber: number
  /** 0-based column where the matched property segment begins. */
  columnStart: number
  /** Length of the matched segment in characters. */
  length: number
  /** The full original line text. */
  originalText: string
  /** The original matched segment text (e.g. `bg #2271C1`). */
  segmentText: string
}

export interface FindSegmentMatchesInput {
  files: ProjectFile[]
  targetFilename: string
  targetLineNumber: number
  /** Property name to match (e.g. `bg`). */
  targetProperty: string
  /** Verbatim value text (e.g. `#2271C1`). */
  targetValue: string
}

/**
 * Scan project files for explicit property segments matching the
 * target `<property> <value>` pair. Used by token-extract batch-
 * replace.
 *
 * v1 limit: matches only EXPLICIT property syntax (`bg #2271C1`).
 * Positional values (`Frame #2271C1` where `#2271C1` resolves to bg)
 * are not matched, because positional-replace in the source is
 * ambiguous. Mixed-syntax projects need a manual pass.
 */
export function findSegmentMatches(input: FindSegmentMatchesInput): SegmentMatch[] {
  const results: SegmentMatch[] = []
  const targetValueClassified = tokenizeValue(input.targetValue)
  if (targetValueClassified.length === 0) return results

  for (const file of input.files) {
    const lines = file.source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      // Skip the target line itself.
      if (file.filename === input.targetFilename && i + 1 === input.targetLineNumber) {
        continue
      }
      const lineText = lines[i]
      const lineMatches = findSegmentsInLine(lineText, input.targetProperty, targetValueClassified)
      for (const m of lineMatches) {
        results.push({
          filename: file.filename,
          lineNumber: i + 1,
          columnStart: m.columnStart,
          length: m.length,
          originalText: lineText,
          segmentText: lineText.slice(m.columnStart, m.columnStart + m.length),
        })
      }
    }
  }
  return results
}

function findSegmentsInLine(
  line: string,
  targetProperty: string,
  targetValue: ClassifiedValue[]
): { columnStart: number; length: number }[] {
  const stripped = stripInlineComment(line)
  const matches: { columnStart: number; length: number }[] = []

  // Detect element-name-prefixed lines so we skip the element name
  // before scanning properties. Example: in `Btn pad 10, bg #2271C1`
  // the comma-split should yield `pad 10`, `bg #2271C1` — NOT
  // `Btn pad 10` (which would mis-classify `Btn` as the property name).
  let scanText = stripped
  let scanOffset = 0

  const indentLen = (stripped.match(/^(\s*)/) || ['', ''])[1].length
  const elemMatch = stripped.slice(indentLen).match(/^([A-Z][a-zA-Z0-9_]*)\b/)
  if (elemMatch) {
    let pos = indentLen + elemMatch[0].length
    while (pos < stripped.length && /\s/.test(stripped[pos])) pos++

    // Definition site (`Name:` / `Name as X:`) — skip the whole line.
    if (stripped[pos] === ':') return matches
    if (stripped.slice(pos).match(/^as\s+[A-Z][a-zA-Z0-9_]*\s*:/)) return matches

    // Optional leading content string.
    if (stripped[pos] === '"' || stripped[pos] === "'") {
      const end = findStringEnd(stripped, pos)
      if (end !== -1) {
        pos = end + 1
        while (pos < stripped.length && /\s/.test(stripped[pos])) pos++
        if (stripped[pos] === ',') {
          pos++
          while (pos < stripped.length && /\s/.test(stripped[pos])) pos++
        }
      }
    }

    scanText = stripped.slice(pos)
    scanOffset = pos
  }

  const parts = splitOnCommaWithPositions(scanText)

  for (const part of parts) {
    const segText = part.text.trim()
    if (!segText) continue
    const offsetWithinTrim = part.text.indexOf(segText)
    const segStart = scanOffset + part.start + offsetWithinTrim

    const parsed = parseProperty(segText)
    if (!parsed) continue
    if (parsed.name !== targetProperty) continue
    if (!valuesEqualStrict(parsed.values, targetValue)) continue

    matches.push({
      columnStart: segStart,
      length: segText.length,
    })
  }
  return matches
}

function valuesEqualStrict(a: ClassifiedValue[], b: ClassifiedValue[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].kind !== b[i].kind || a[i].raw !== b[i].raw) return false
  }
  return true
}

function splitOnCommaWithPositions(s: string): { text: string; start: number }[] {
  const parts: { text: string; start: number }[] = []
  let buf = ''
  let bufStart = 0
  let depth = 0
  let inString = false
  let quote = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      buf += c
      if (c === '\\') {
        buf += s[++i] ?? ''
        continue
      }
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
      buf += c
      continue
    }
    if (c === '(' || c === '[') {
      depth++
      buf += c
      continue
    }
    if (c === ')' || c === ']') {
      depth--
      buf += c
      continue
    }
    if (c === ',' && depth === 0) {
      parts.push({ text: buf, start: bufStart })
      buf = ''
      bufStart = i + 1
      continue
    }
    if (buf === '') bufStart = i
    buf += c
  }
  if (buf) parts.push({ text: buf, start: bufStart })
  return parts
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findStringEnd(s: string, openPos: number): number {
  const quote = s[openPos]
  for (let i = openPos + 1; i < s.length; i++) {
    if (s[i] === '\\') {
      i++
      continue
    }
    if (s[i] === quote) return i
  }
  return -1
}

function splitOnComma(s: string): string[] {
  const parts: string[] = []
  let buf = ''
  let depth = 0
  let inString = false
  let quote = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      buf += c
      if (c === '\\') {
        buf += s[++i] ?? ''
        continue
      }
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
      buf += c
      continue
    }
    if (c === '(' || c === '[') {
      depth++
      buf += c
      continue
    }
    if (c === ')' || c === ']') {
      depth--
      buf += c
      continue
    }
    if (c === ',' && depth === 0) {
      parts.push(buf.trim())
      buf = ''
      continue
    }
    buf += c
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts
}

function stripInlineComment(line: string): string {
  // Strip `// ...` to end of line, but not inside strings.
  let inString = false
  let quote = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inString) {
      if (c === '\\') {
        i++
        continue
      }
      if (c === quote) inString = false
      continue
    }
    if (c === '"' || c === "'") {
      inString = true
      quote = c
      continue
    }
    if (c === '/' && line[i + 1] === '/') return line.slice(0, i)
  }
  return line
}
