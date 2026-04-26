/**
 * Positional Arguments Resolver
 *
 * Source-to-source pre-parser pass that expands positional shorthand to
 * explicit property syntax. Runs after file combination and before parse,
 * so AST/IR/backends are completely unaware.
 *
 * Rules (R1 + R2 + R3 from docs/concepts/positional-args.md):
 *   R1 — bare color value (#hex, named, rgba(...)) → default color
 *        property based on primitive (Container → bg, Text/Link → col,
 *        Icon → ic).
 *   R2 — bare number / `hug` / `full` → size slots in order (most
 *        primitives: w then h; Icon: is only).
 *   R3 — bare token reference. Two forms:
 *        a) `$name.suffix` — unambiguous, suffix becomes the property
 *           name (`Frame $primary.bg` → `Frame bg $primary.bg`).
 *        b) `$name` — only if `name.<suffix>:` is defined somewhere in
 *           the source. Single-suffix tokens use that suffix; multi-
 *           suffix tokens (e.g. primary.bg + primary.col) pick the
 *           suffix matching the primitive's role.color (or first
 *           role-relevant suffix). Property-set refs (`$cardstyle`)
 *           where `cardstyle:` has no dot pass through unchanged.
 *
 * This is a *typing shortcut*, not a roundtrip-preserving syntax. The
 * Studio's code modifier writes back the explicit form on save.
 */

export interface PrimitiveRole {
  /** Property name a bare color resolves to. Omit if primitive has no color slot. */
  color?: string
  /** Property names that bare sizes fill, in order. First bare → sizes[0], etc. */
  sizes: string[]
}

export const PRIMITIVE_ROLES: Record<string, PrimitiveRole> = {
  // Container primitives → bg + w/h
  Frame: { color: 'bg', sizes: ['w', 'h'] },
  Box: { color: 'bg', sizes: ['w', 'h'] },
  Button: { color: 'bg', sizes: ['w', 'h'] },
  Header: { color: 'bg', sizes: ['w', 'h'] },
  Section: { color: 'bg', sizes: ['w', 'h'] },
  Article: { color: 'bg', sizes: ['w', 'h'] },
  Aside: { color: 'bg', sizes: ['w', 'h'] },
  Footer: { color: 'bg', sizes: ['w', 'h'] },
  Nav: { color: 'bg', sizes: ['w', 'h'] },
  Main: { color: 'bg', sizes: ['w', 'h'] },
  H1: { color: 'bg', sizes: ['w', 'h'] },
  H2: { color: 'bg', sizes: ['w', 'h'] },
  H3: { color: 'bg', sizes: ['w', 'h'] },
  H4: { color: 'bg', sizes: ['w', 'h'] },
  H5: { color: 'bg', sizes: ['w', 'h'] },
  H6: { color: 'bg', sizes: ['w', 'h'] },
  Divider: { color: 'bg', sizes: ['w', 'h'] },
  Spacer: { color: 'bg', sizes: ['w', 'h'] },
  Input: { color: 'bg', sizes: ['w', 'h'] },
  Textarea: { color: 'bg', sizes: ['w', 'h'] },
  Label: { color: 'bg', sizes: ['w', 'h'] },
  Slot: { color: 'bg', sizes: ['w', 'h'] },
  // Content primitives → col + w/h
  Text: { color: 'col', sizes: ['w', 'h'] },
  Link: { color: 'col', sizes: ['w', 'h'] },
  // Icon → ic + is
  Icon: { color: 'ic', sizes: ['is'] },
  // Image → w/h, no color slot
  Image: { sizes: ['w', 'h'] },
  Img: { sizes: ['w', 'h'] },
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

/**
 * Suffixes whose values are colors (used to classify a token-ref into
 * the color or size category for slot management).
 */
const COLOR_SUFFIXES = new Set(['bg', 'col', 'boc', 'ic', 'background', 'color'])

/**
 * Suffixes whose values are sizes / numbers.
 */
const SIZE_SUFFIXES = new Set([
  'w',
  'h',
  'is',
  'rad',
  'fs',
  'pad',
  'mar',
  'gap',
  'iw',
  'line',
  'minw',
  'maxw',
  'minh',
  'maxh',
  'opacity',
  'blur',
  'shadow',
])

type TokenSuffixMap = Map<string, Set<string>>

interface SourceScan {
  /** Token definitions: `primary.bg: #2271C1` → primary → {bg, col, ...} */
  tokens: TokenSuffixMap
  /** Object/variable names with nested sub-properties: `user:\n  name: "X"` → {user} */
  objects: Set<string>
}

/**
 * Pre-scan source to distinguish:
 *  - Token definitions: `primary.bg: VALUE` (flat, dot in name)
 *  - Object/variable definitions: `user:` followed by indented children
 *
 * The distinction matters for `$X.Y` use sites: if X is an object,
 * `$X.Y` is property access (don't transform); if X is a token, `$X.Y`
 * is a suffixed token-ref and Y becomes the property name.
 */
export function scanSource(source: string): SourceScan {
  const lines = source.split('\n')
  const tokens: TokenSuffixMap = new Map()
  const objects = new Set<string>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (!trimmed || trimmed.startsWith('//')) continue

    // Token definition: name.suffix: value
    const tokenMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\.([a-zA-Z][a-zA-Z0-9_-]*)\s*:/)
    if (tokenMatch) {
      const set = tokens.get(tokenMatch[1]) ?? new Set<string>()
      set.add(tokenMatch[2])
      tokens.set(tokenMatch[1], set)
      continue
    }

    // Object/variable: `name:` followed by indented child line.
    // Only matches when the colon ends the line (no value on same line).
    const objectMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*$/)
    if (objectMatch) {
      const myIndent = line.length - trimmed.length
      // Look ahead for next non-empty/non-comment line.
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]
        if (!next.trim() || next.trimStart().startsWith('//')) continue
        const nextIndent = next.length - next.trimStart().length
        if (nextIndent > myIndent) objects.add(objectMatch[1])
        break
      }
    }
  }

  return { tokens, objects }
}

/** @deprecated Use scanSource(); kept for backwards compat. */
export function scanTokenSuffixes(source: string): TokenSuffixMap {
  return scanSource(source).tokens
}

/**
 * Transform Mirror source by resolving positional shorthand to explicit
 * property syntax. Returns equivalent Mirror source ready for parse().
 */
export function resolvePositionalArgs(source: string): string {
  const scan = scanSource(source)
  return source
    .split('\n')
    .map((line, idx) => transformLine(line, idx + 1, scan))
    .join('\n')
}

function transformLine(line: string, lineNo: number, scan: SourceScan): string {
  if (!line.trim() || line.trimStart().startsWith('//')) return line

  const indent = line.match(/^(\s*)/)![1]
  const content = line.slice(indent.length)

  const segments = splitTopLevel(content, ';')
  return indent + segments.map(seg => transformSegment(seg, lineNo, scan)).join(';')
}

function transformSegment(segment: string, lineNo: number, scan: SourceScan): string {
  const leadingWS = segment.match(/^(\s*)/)![1]
  const body = segment.slice(leadingWS.length)

  const elementMatch = body.match(/^([A-Z][a-zA-Z0-9_]*)\b/)
  if (!elementMatch) return segment

  const elementName = elementMatch[1]
  const role = PRIMITIVE_ROLES[elementName]
  if (!role) return segment

  let pos = elementMatch[0].length
  while (pos < body.length && /\s/.test(body[pos])) pos++

  if (body[pos] === '"') {
    const end = findStringEnd(body, pos)
    if (end === -1) return segment
    pos = end + 1
    while (pos < body.length && /\s/.test(body[pos])) pos++
    if (body[pos] === ',') {
      pos++
      while (pos < body.length && /\s/.test(body[pos])) pos++
    }
  }

  const head = body.slice(0, pos)
  const props = body.slice(pos)

  if (!props.trim()) return segment

  const transformed = transformPropertyList(props, role, elementName, lineNo, scan)
  return leadingWS + head + transformed
}

interface BareClassification {
  /** 'color' or 'size' for kind-based slot filling, or 'fixed' for a token-ref with a known property name. */
  kind: 'color' | 'size' | 'fixed'
  /** For 'fixed' kind, the property name to prepend (e.g. 'pad' for `$space` when space.pad is defined). */
  fixedSlot?: string
}

interface SegInfo {
  raw: string
  leadingWS: string
  trimmed: string
  explicitName: string | null
  bare: BareClassification | null
  assignedSlot: string | null
}

function transformPropertyList(
  propList: string,
  role: PrimitiveRole,
  elementName: string,
  lineNo: number,
  scan: SourceScan
): string {
  const segments = splitTopLevel(propList, ',')

  const segs: SegInfo[] = segments.map(raw => {
    const leadingWS = raw.match(/^\s*/)![0]
    const trimmed = raw.trim()
    if (!trimmed) {
      return { raw, leadingWS, trimmed, explicitName: null, bare: null, assignedSlot: null }
    }
    const bare = classifyBare(trimmed, role, scan)
    if (bare) {
      return { raw, leadingWS, trimmed, explicitName: null, bare, assignedSlot: null }
    }
    const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\b/)
    return {
      raw,
      leadingWS,
      trimmed,
      explicitName: m ? m[1] : null,
      bare: null,
      assignedSlot: null,
    }
  })

  // Pass 1: collect slots/properties used explicitly. Includes the role
  // color/size slots AND any other explicit property name (e.g. `pad 16`)
  // so token-ref shorthands like `$space` (→ pad) detect conflicts too.
  const explicitlyUsed = new Set<string>()
  for (const seg of segs) {
    if (seg.explicitName) explicitlyUsed.add(seg.explicitName)
  }

  // Pass 2: assign bare values to slots.
  let bareColorUsed = false
  let nextSizeCursor = 0
  for (const seg of segs) {
    if (!seg.bare) continue

    // 'fixed' bares (token-refs with a known property) go straight to
    // their slot. They still participate in conflict detection, and if
    // the target slot is the role's color/size slot we mark it used.
    if (seg.bare.kind === 'fixed') {
      const slot = seg.bare.fixedSlot!
      if (explicitlyUsed.has(slot)) {
        throw new Error(
          `[positional-resolver] line ${lineNo}: '${slot}' is set both positionally (token '${seg.trimmed}') and explicitly on ${elementName}`
        )
      }
      // Track for downstream bare values: if the fixed slot happens to
      // be the role color or a role size, consume it.
      if (slot === role.color) {
        if (bareColorUsed) {
          throw new Error(
            `[positional-resolver] line ${lineNo}: ${elementName} accepts only one positional color (got '${seg.trimmed}' as second)`
          )
        }
        bareColorUsed = true
      }
      const sizeIdx = role.sizes.indexOf(slot)
      if (sizeIdx >= 0) {
        // Mark this size slot as used so subsequent bare numbers skip it.
        explicitlyUsed.add(slot)
      }
      seg.assignedSlot = slot
      continue
    }

    if (seg.bare.kind === 'color') {
      if (!role.color) {
        throw new Error(
          `[positional-resolver] line ${lineNo}: ${elementName} has no color slot for '${seg.trimmed}'`
        )
      }
      if (explicitlyUsed.has(role.color)) {
        throw new Error(
          `[positional-resolver] line ${lineNo}: '${role.color}' is set both positionally ('${seg.trimmed}') and explicitly on ${elementName}`
        )
      }
      if (bareColorUsed) {
        throw new Error(
          `[positional-resolver] line ${lineNo}: ${elementName} accepts only one positional color (got '${seg.trimmed}' as second)`
        )
      }
      seg.assignedSlot = role.color
      bareColorUsed = true
    } else {
      // size kind
      while (nextSizeCursor < role.sizes.length && explicitlyUsed.has(role.sizes[nextSizeCursor])) {
        nextSizeCursor++
      }
      if (nextSizeCursor >= role.sizes.length) {
        throw new Error(
          `[positional-resolver] line ${lineNo}: ${elementName} accepts only ${role.sizes.length} positional size value(s); '${seg.trimmed}' has no free slot`
        )
      }
      seg.assignedSlot = role.sizes[nextSizeCursor]
      nextSizeCursor++
    }
  }

  return segs
    .map(s => (s.assignedSlot ? s.leadingWS + s.assignedSlot + ' ' + s.trimmed : s.raw))
    .join(',')
}

/**
 * Classify a single trimmed property segment as a bare value, returning
 * its kind. Tokens are recognized either by explicit suffix (`$name.suffix`)
 * or by name match against the pre-scanned token-suffix map.
 */
export function classifyBare(
  s: string,
  role: PrimitiveRole,
  scan: SourceScan
): BareClassification | null {
  // Hex / rgba / named color → role-based color slot
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return { kind: 'color' }
  if (/^rgba?\s*\([^)]+\)$/.test(s)) return { kind: 'color' }
  if (NAMED_COLORS.has(s)) return { kind: 'color' }

  // Number / hug / full → role-based size slot
  if (/^-?\d+(\.\d+)?$/.test(s)) return { kind: 'size' }
  if (s === 'hug' || s === 'full') return { kind: 'size' }

  // $name.suffix — could be a token-ref (primary.bg) or object-property
  // access ($user.name where user is an object). Distinguish via scan.
  const dotted = s.match(/^\$([a-zA-Z][a-zA-Z0-9_-]*)\.([a-zA-Z][a-zA-Z0-9_-]*)$/)
  if (dotted) {
    const name = dotted[1]
    if (scan.objects.has(name)) return null // object property access, leave alone
    if (scan.tokens.has(name)) return { kind: 'fixed', fixedSlot: dotted[2] }
    return null // unknown — could be a bare property access we shouldn't touch
  }

  // $name without suffix — look up token map
  const bareName = s.match(/^\$([a-zA-Z][a-zA-Z0-9_-]*)$/)
  if (bareName) {
    const name = bareName[1]
    if (scan.objects.has(name)) return null // variable / object, not a token
    const suffixes = scan.tokens.get(name)
    if (!suffixes || suffixes.size === 0) return null // not a token (could be property-set ref)

    const slot = pickSuffixForRole(suffixes, role)
    if (!slot) return null
    return { kind: 'fixed', fixedSlot: slot }
  }

  return null
}

/**
 * For multi-suffix tokens, pick the suffix that best matches the
 * primitive's role. Single-suffix tokens trivially return their suffix.
 */
function pickSuffixForRole(suffixes: Set<string>, role: PrimitiveRole): string | null {
  if (suffixes.size === 1) {
    return suffixes.values().next().value ?? null
  }
  // Multi-suffix: prefer role.color, then any role.sizes member.
  if (role.color && suffixes.has(role.color)) return role.color
  for (const sizeSlot of role.sizes) {
    if (suffixes.has(sizeSlot)) return sizeSlot
  }
  // No match — could still be a useful prefix if exactly one of the
  // suffixes is a known color/size suffix on its own. Otherwise give up.
  const colorMatches = [...suffixes].filter(s => COLOR_SUFFIXES.has(s))
  if (colorMatches.length === 1 && role.color) return colorMatches[0]
  const sizeMatches = [...suffixes].filter(s => SIZE_SUFFIXES.has(s))
  if (sizeMatches.length === 1 && role.sizes.length > 0) return sizeMatches[0]
  return null
}

/**
 * Legacy alias: classifyBareValue is exported for older tests that call
 * it without a scan. Treats input as if no tokens or objects were defined.
 */
export function classifyBareValue(s: string): 'color' | 'size' | null {
  const emptyScan: SourceScan = { tokens: new Map(), objects: new Set() }
  const result = classifyBare(s, { sizes: [] }, emptyScan)
  if (!result || result.kind === 'fixed') return null
  return result.kind
}

function findStringEnd(s: string, openPos: number): number {
  for (let i = openPos + 1; i < s.length; i++) {
    if (s[i] === '\\') {
      i++
      continue
    }
    if (s[i] === '"') return i
  }
  return -1
}

function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = []
  let depth = 0
  let inString = false
  let buf = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      buf += c
      if (c === '\\') {
        buf += s[++i] ?? ''
        continue
      }
      if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
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
    if (c === sep && depth === 0) {
      parts.push(buf)
      buf = ''
      continue
    }
    buf += c
  }
  parts.push(buf)
  return parts
}
