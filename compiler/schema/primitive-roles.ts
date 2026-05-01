/**
 * Primitive Roles — schema knowledge about which property a bare positional
 * argument fills for each primitive (used by the positional-args pre-parser).
 *
 *   Frame "Hi", #fff, 100, 50  →  Frame "Hi", bg #fff, w 100, h 50
 *
 * The mapping is schema-level: it says "for this primitive, a bare color
 * means `bg` and bare sizes fill `w`/`h`" — orthogonal to the positional
 * resolution algorithm itself, which lives in `compiler/positional-resolver.ts`.
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

/**
 * Look up the role for a primitive. Returns undefined if `name` is not a
 * known primitive (positional resolver may then fall back to user-defined
 * components scanned from source).
 */
export function getPrimitiveRole(name: string): PrimitiveRole | undefined {
  return PRIMITIVE_ROLES[name]
}
