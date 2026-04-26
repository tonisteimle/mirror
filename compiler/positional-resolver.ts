/**
 * Positional Arguments Resolver
 *
 * Source-to-source pre-parser pass that expands positional shorthand to
 * explicit property syntax. Runs after file combination and before parse,
 * so AST/IR/backends are completely unaware.
 *
 * Rules (R1 + R2 from docs/concepts/positional-args.md):
 *   R1 — bare color value (#hex, named, $token, rgba(...)) → default color
 *        property based on primitive (Container → bg, Text/Link → col,
 *        Icon → ic).
 *   R2 — bare number / `hug` / `full` → size slots in order (most
 *        primitives: w then h; Icon: is only).
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

/**
 * Per-primitive resolution table. Only built-in primitives are listed —
 * components (PrimaryBtn etc.) and unknown identifiers pass through
 * unchanged in Phase 1.
 */
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
  // Content primitives → col + w/h (text-color, not background)
  Text: { color: 'col', sizes: ['w', 'h'] },
  Link: { color: 'col', sizes: ['w', 'h'] },
  // Icon → ic (icon-color) + is (icon-size). Only one size slot.
  Icon: { color: 'ic', sizes: ['is'] },
  // Image → w/h. No color slot (Image is not a paint surface).
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
 * Transform Mirror source by resolving positional shorthand to explicit
 * property syntax. Returns equivalent Mirror source ready for parse().
 *
 * Throws on slot conflicts (E4/E5/E8 from the concept doc) with a
 * descriptive message containing 1-based line number.
 */
export function resolvePositionalArgs(source: string): string {
  return source
    .split('\n')
    .map((line, idx) => transformLine(line, idx + 1))
    .join('\n')
}

function transformLine(line: string, lineNo: number): string {
  if (!line.trim() || line.trimStart().startsWith('//')) return line

  const indent = line.match(/^(\s*)/)![1]
  const content = line.slice(indent.length)

  const segments = splitTopLevel(content, ';')
  return indent + segments.map(seg => transformSegment(seg, lineNo)).join(';')
}

function transformSegment(segment: string, lineNo: number): string {
  const leadingWS = segment.match(/^(\s*)/)![1]
  const body = segment.slice(leadingWS.length)

  // Element name must be a capitalized identifier at the segment start.
  const elementMatch = body.match(/^([A-Z][a-zA-Z0-9_]*)\b/)
  if (!elementMatch) return segment

  const elementName = elementMatch[1]
  const role = PRIMITIVE_ROLES[elementName]
  if (!role) return segment // unknown primitive / component → leave untouched

  let pos = elementMatch[0].length

  // Skip whitespace after the element name.
  while (pos < body.length && /\s/.test(body[pos])) pos++

  // If a leading bare string follows (e.g. `Text "Hi"`, `Button "Save"`,
  // `Icon "check"`), treat it as positional content/name and skip past
  // it + an optional trailing comma.
  if (body[pos] === '"') {
    const end = findStringEnd(body, pos)
    if (end === -1) return segment // unterminated string — let parser report
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

  const transformed = transformPropertyList(props, role, elementName, lineNo)
  return leadingWS + head + transformed
}

interface SegInfo {
  raw: string
  leadingWS: string
  trimmed: string
  /** name of explicit property (e.g. 'bg' from 'bg #333'), or null if bare */
  explicitName: string | null
  /** classification if bare, null otherwise */
  bareKind: 'color' | 'size' | null
  /** slot name to prepend if bare and assigned */
  assignedSlot: string | null
}

function transformPropertyList(
  propList: string,
  role: PrimitiveRole,
  elementName: string,
  lineNo: number
): string {
  const segments = splitTopLevel(propList, ',')

  const segs: SegInfo[] = segments.map(raw => {
    const leadingWS = raw.match(/^\s*/)![0]
    const trimmed = raw.trim()
    if (!trimmed) {
      return {
        raw,
        leadingWS,
        trimmed,
        explicitName: null,
        bareKind: null,
        assignedSlot: null,
      }
    }
    const bareKind = classifyBareValue(trimmed)
    if (bareKind) {
      return { raw, leadingWS, trimmed, explicitName: null, bareKind, assignedSlot: null }
    }
    const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\b/)
    return {
      raw,
      leadingWS,
      trimmed,
      explicitName: m ? m[1] : null,
      bareKind: null,
      assignedSlot: null,
    }
  })

  // Pass 1: collect slots used by EXPLICIT properties. Bare values then
  // fill the remaining free slots in canonical order. This lets users
  // mix positional + explicit naturally: `Frame w 100, 50, #333` → bare
  // 50 takes the still-free `h` slot, bare #333 takes the still-free
  // color slot.
  const explicitlyUsed = new Set<string>()
  for (const seg of segs) {
    if (seg.explicitName) {
      if (role.color === seg.explicitName) explicitlyUsed.add(role.color)
      for (const sizeSlot of role.sizes) {
        if (seg.explicitName === sizeSlot) explicitlyUsed.add(sizeSlot)
      }
    }
  }

  // Pass 2: assign bare values to first-free slot of matching kind.
  let bareColorUsed = false
  let nextSizeCursor = 0
  for (const seg of segs) {
    if (!seg.bareKind) continue
    if (seg.bareKind === 'color') {
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
      // Find next free size slot starting from cursor.
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
 * Classify a single trimmed property segment: is it a bare value (no
 * explicit name in front), and if so, what kind?
 *
 * - Hex `#abc`, `#abc123`, `#abc12345` (3/6/8 digits)
 * - rgba/rgb function call
 * - named color (red, white, transparent, …)
 * - number (positive, negative, decimal)
 * - keyword `hug` / `full`
 *
 * Phase 1 deliberately excludes `$name` token references — they are
 * syntactically indistinguishable from property-set references, and we
 * cannot tell them apart from the line alone. Users must write
 * `Frame bg $primary` explicitly when using tokens. Property-set
 * application like `Frame $cardstyle` continues to work unchanged.
 */
export function classifyBareValue(s: string): 'color' | 'size' | null {
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return 'color'
  if (/^rgba?\s*\([^)]+\)$/.test(s)) return 'color'
  if (/^-?\d+(\.\d+)?$/.test(s)) return 'size'
  if (s === 'hug' || s === 'full') return 'size'
  if (NAMED_COLORS.has(s)) return 'color'
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

/**
 * Split a string on a top-level separator, respecting quoted strings
 * and balanced parens/brackets.
 */
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
