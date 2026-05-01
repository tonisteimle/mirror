/**
 * Positional Arguments Resolver
 *
 * Source-to-source pre-parser pass that expands positional shorthand to
 * explicit property syntax. Runs after file combination and before parse,
 * so AST/IR/backends are completely unaware.
 *
 * Rules (R1 + R2 + R3 from docs/archive/concepts/positional-args.md):
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

import { PRIMITIVE_ROLES, type PrimitiveRole } from './schema/primitive-roles'

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
  /** Object/variable names (camelCase) with nested sub-properties. */
  objects: Set<string>
  /**
   * Custom components (PascalCase) with their resolved primitive role.
   * Includes `Btn:` (defaults to Container/Frame role) and
   * `MyText as Text:` (inherits Text's role). `as` chains are resolved.
   */
  components: Map<string, PrimitiveRole>
}

/**
 * Pre-scan source to distinguish:
 *  - Token definitions: `primary.bg: VALUE` (flat, dot in name) → tokens map
 *  - Object/variable defs: `user:` (camelCase) + indented children → objects set
 *  - Component defs: `Btn:` or `Btn as Button:` (PascalCase, top-level) →
 *    components map with resolved primitive role
 *
 * Slots inside component definitions (`Title:` indented under `Card:`) are
 * NOT registered as components — only column-0 PascalCase definitions count.
 */
function scanSource(source: string): SourceScan {
  const lines = source.split('\n')
  const tokens: TokenSuffixMap = new Map()
  const objects = new Set<string>()
  const components = new Map<string, PrimitiveRole>()

  // First pass: tokens, objects, and component definitions with direct
  // `as Primitive` resolution. Component-to-component `as` chains are
  // collected as deferred so we can resolve them in a second pass.
  const deferredAs: Array<{ name: string; base: string }> = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trimStart()
    if (!trimmed || trimmed.startsWith('//')) continue

    const indent = line.length - trimmed.length

    // Token definition: name.suffix: value
    const tokenMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\.([a-zA-Z][a-zA-Z0-9_-]*)\s*:/)
    if (tokenMatch) {
      const set = tokens.get(tokenMatch[1]) ?? new Set<string>()
      set.add(tokenMatch[2])
      tokens.set(tokenMatch[1], set)
      continue
    }

    // Component definition (only at top level, column 0):
    //   `Btn:` (default Container role)
    //   `Btn: pad 10, bg #333` (default Container role)
    //   `MyText as Text:`  → inherits Text's role
    //   `DangerBtn as Btn:` → deferred chain
    if (indent === 0) {
      const compAs = trimmed.match(/^([A-Z][a-zA-Z0-9_]*)\s+as\s+([A-Z][a-zA-Z0-9_]*)\s*:/)
      if (compAs) {
        const baseRole = PRIMITIVE_ROLES[compAs[2]]
        if (baseRole) {
          components.set(compAs[1], baseRole)
        } else {
          deferredAs.push({ name: compAs[1], base: compAs[2] })
        }
        continue
      }
      const compNoAs = trimmed.match(/^([A-Z][a-zA-Z0-9_]*)\s*:/)
      if (compNoAs && !PRIMITIVE_ROLES[compNoAs[1]]) {
        // Default to Frame's role (Container)
        components.set(compNoAs[1], PRIMITIVE_ROLES.Frame)
        continue
      }
    }

    // Object/variable (camelCase) with indented children, or PascalCase
    // component-with-no-inline-properties (also indented children).
    const objectMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*$/)
    if (objectMatch) {
      const name = objectMatch[1]
      const myIndent = indent
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]
        if (!next.trim() || next.trimStart().startsWith('//')) continue
        const nextIndent = next.length - next.trimStart().length
        if (nextIndent > myIndent) {
          // PascalCase + indented children + column 0 → component
          if (myIndent === 0 && /^[A-Z]/.test(name)) {
            if (!components.has(name) && !PRIMITIVE_ROLES[name]) {
              components.set(name, PRIMITIVE_ROLES.Frame)
            }
          } else {
            objects.add(name)
          }
        }
        break
      }
    }
  }

  // Second pass: resolve deferred `Component as OtherComponent` chains.
  // Bounded iteration (each pass either resolves or terminates).
  for (let iter = 0; iter < deferredAs.length + 1; iter++) {
    let changed = false
    for (const def of deferredAs) {
      if (components.has(def.name)) continue
      const baseRole = components.get(def.base)
      if (baseRole) {
        components.set(def.name, baseRole)
        changed = true
      }
    }
    if (!changed) break
  }
  // Any still-unresolved components default to Container.
  for (const def of deferredAs) {
    if (!components.has(def.name)) components.set(def.name, PRIMITIVE_ROLES.Frame)
  }

  return { tokens, objects, components }
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
  const role = PRIMITIVE_ROLES[elementName] ?? scan.components.get(elementName)
  if (!role) return segment

  let pos = elementMatch[0].length
  while (pos < body.length && /\s/.test(body[pos])) pos++

  // Definition site (`Btn:` or `Btn as Button:`) — not a use, leave alone.
  if (body[pos] === ':') return segment
  if (body.slice(pos).match(/^as\s+[A-Z][a-zA-Z0-9_]*\s*:/)) return segment

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
function classifyBare(s: string, role: PrimitiveRole, scan: SourceScan): BareClassification | null {
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
