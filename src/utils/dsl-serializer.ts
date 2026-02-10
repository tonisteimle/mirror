/**
 * DSL Serializer Utilities
 * Converts parsed AST properties back to DSL string format
 */

/**
 * Convert node properties to DSL string (without content)
 */
export function propsToString(p: Record<string, string | number | boolean>): string {
  const parts: string[] = []

  // Layout direction
  if (p.hor) parts.push('hor')
  if (p.ver) parts.push('ver')

  // Alignment
  if (p['hor-l']) parts.push('hor-l')
  if (p['hor-cen']) parts.push('hor-cen')
  if (p['hor-r']) parts.push('hor-r')
  if (p['ver-t']) parts.push('ver-t')
  if (p['ver-cen']) parts.push('ver-cen')
  if (p['ver-b']) parts.push('ver-b')

  // Gap
  if (p.gap) parts.push(`gap ${p.gap}`)

  // Padding
  if (p.pad) parts.push(`pad ${p.pad}`)
  if (p.pad_u || p.pad_d || p.pad_l || p.pad_r) {
    const dirs: string[] = []
    if (p.pad_u) dirs.push('u')
    if (p.pad_d) dirs.push('d')
    if (p.pad_l) dirs.push('l')
    if (p.pad_r) dirs.push('r')
    const val = p.pad_u || p.pad_d || p.pad_l || p.pad_r
    parts.push(`pad ${dirs.join('-')} ${val}`)
  }

  // Margin
  if (p.mar) parts.push(`mar ${p.mar}`)
  if (p.mar_u || p.mar_d || p.mar_l || p.mar_r) {
    const dirs: string[] = []
    if (p.mar_u) dirs.push('u')
    if (p.mar_d) dirs.push('d')
    if (p.mar_l) dirs.push('l')
    if (p.mar_r) dirs.push('r')
    const val = p.mar_u || p.mar_d || p.mar_l || p.mar_r
    parts.push(`mar ${dirs.join('-')} ${val}`)
  }

  // Size
  if (p.w) parts.push(`w ${p.w}`)
  if (p.h) parts.push(`h ${p.h}`)
  if (p.minw) parts.push(`minw ${p.minw}`)
  if (p.maxw) parts.push(`maxw ${p.maxw}`)
  if (p.minh) parts.push(`minh ${p.minh}`)
  if (p.maxh) parts.push(`maxh ${p.maxh}`)
  if (p.full) parts.push('full')
  if (p.grow) parts.push('grow')

  // Colors
  if (p.bg) parts.push(`bg ${p.bg}`)
  if (p.col) parts.push(`col ${p.col}`)
  if (p.boc) parts.push(`boc ${p.boc}`)

  // Border
  if (p.bor) parts.push(`bor ${p.bor}`)
  if (p.bor_u || p.bor_d || p.bor_l || p.bor_r) {
    const dirs: string[] = []
    if (p.bor_u) dirs.push('u')
    if (p.bor_d) dirs.push('d')
    if (p.bor_l) dirs.push('l')
    if (p.bor_r) dirs.push('r')
    const val = p.bor_u || p.bor_d || p.bor_l || p.bor_r
    parts.push(`bor ${dirs.join('-')} ${val}`)
  }
  if (p.rad) parts.push(`rad ${p.rad}`)

  // Typography
  if (p.size) parts.push(`size ${p.size}`)
  if (p.weight) parts.push(`weight ${p.weight}`)
  if (p.font) parts.push(`font "${p.font}"`)

  // Other
  if (p.wrap) parts.push('wrap')
  if (p.between) parts.push('between')
  if (p.icon) parts.push(`icon "${p.icon}"`)

  // Hover states
  if (p['hover-bg']) parts.push(`hover-bg ${p['hover-bg']}`)
  if (p['hover-col']) parts.push(`hover-col ${p['hover-col']}`)
  if (p['hover-boc']) parts.push(`hover-boc ${p['hover-boc']}`)

  return parts.join(' ')
}
