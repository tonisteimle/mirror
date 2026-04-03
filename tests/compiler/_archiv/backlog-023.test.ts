/**
 * Backlog 023: Fehlende Features testen
 *
 * Systematisch alle Features aus dem Backlog durchgehen.
 */

import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'

function getStyle(node: any, property: string): string | undefined {
  if (!node?.styles) return undefined
  const matches = node.styles.filter((s: any) => s.property === property && !s.state)
  return matches.length > 0 ? matches[matches.length - 1].value : undefined
}

// ============================================================
// 1. Icon Primitive
// ============================================================
describe('Icon Primitive', () => {

  test('Icon erzeugt span', () => {
    const ir = toIR(parse('Icon "check"'))
    expect(ir.nodes[0].tag).toBe('span')
  })

  test('Icon hat default size 20x20', () => {
    const ir = toIR(parse('Icon "check"'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'width')).toBe('20px')
    expect(getStyle(node, 'height')).toBe('20px')
  })

  test('Icon mit custom size', () => {
    const ir = toIR(parse('Icon "check" size 32'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'width')).toBe('32px')
    expect(getStyle(node, 'height')).toBe('32px')
  })

  test('Icon mit color', () => {
    const ir = toIR(parse('Icon "check" col #f00'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'color')).toBe('#f00')
  })

})

// ============================================================
// 2. Stacked Layout
// ============================================================
describe('Stacked Layout', () => {

  test('stacked setzt position relative auf parent', () => {
    const ir = toIR(parse('Frame stacked'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'position')).toBe('relative')
  })

  test('stacked kinder werden absolute positioniert', () => {
    const ir = toIR(parse(`
Frame stacked
  Frame
  Frame
`))
    const parent = ir.nodes[0]
    const child1 = parent.children[0]
    const child2 = parent.children[1]

    expect(getStyle(parent, 'position')).toBe('relative')
    expect(getStyle(child1, 'position')).toBe('absolute')
    expect(getStyle(child2, 'position')).toBe('absolute')
  })

})

// ============================================================
// 3. Align Property
// ============================================================
describe('Align Property', () => {

  test('align top', () => {
    const ir = toIR(parse('Frame align top'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('flex-start')
  })

  test('align bottom', () => {
    const ir = toIR(parse('Frame align bottom'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('flex-end')
  })

  test('align left', () => {
    const ir = toIR(parse('Frame align left'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'align-items')).toBe('flex-start')
  })

  test('align right', () => {
    const ir = toIR(parse('Frame align right'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'align-items')).toBe('flex-end')
  })

  test('align center', () => {
    const ir = toIR(parse('Frame align center'))
    const node = ir.nodes[0]
    // center sollte beide Achsen zentrieren
    expect(getStyle(node, 'justify-content')).toBe('center')
    expect(getStyle(node, 'align-items')).toBe('center')
  })

})

// ============================================================
// 4. Standalone Alignment (left, right, top, bottom)
// ============================================================
describe('Standalone Alignment', () => {

  test('left (standalone)', () => {
    const ir = toIR(parse('Frame left'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'align-items')).toBe('flex-start')
  })

  test('right (standalone)', () => {
    const ir = toIR(parse('Frame right'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'align-items')).toBe('flex-end')
  })

  test('top (standalone)', () => {
    const ir = toIR(parse('Frame top'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('flex-start')
  })

  test('bottom (standalone)', () => {
    const ir = toIR(parse('Frame bottom'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('flex-end')
  })

})

// ============================================================
// 5. Hor-Center, Ver-Center
// ============================================================
describe('Hor-Center, Ver-Center', () => {

  test('hor-center zentriert horizontal', () => {
    const ir = toIR(parse('Frame hor-center'))
    const node = ir.nodes[0]
    // In column layout: align-items für horizontale Zentrierung
    expect(getStyle(node, 'align-items')).toBe('center')
  })

  test('ver-center zentriert vertikal', () => {
    const ir = toIR(parse('Frame ver-center'))
    const node = ir.nodes[0]
    // In column layout: justify-content für vertikale Zentrierung
    expect(getStyle(node, 'justify-content')).toBe('center')
  })

  test('hor-center + ver-center = center', () => {
    const ir = toIR(parse('Frame hor-center ver-center'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('center')
    expect(getStyle(node, 'align-items')).toBe('center')
  })

})

// ============================================================
// 6. Directional Margin
// ============================================================
describe('Directional Margin', () => {

  test('margin left', () => {
    const ir = toIR(parse('Frame margin left 10'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'margin-left')).toBe('10px')
  })

  test('margin right', () => {
    const ir = toIR(parse('Frame margin right 10'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'margin-right')).toBe('10px')
  })

  test('margin top', () => {
    const ir = toIR(parse('Frame margin top 10'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'margin-top')).toBe('10px')
  })

  test('margin bottom', () => {
    const ir = toIR(parse('Frame margin bottom 10'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'margin-bottom')).toBe('10px')
  })

  test('m alias für margin', () => {
    const ir = toIR(parse('Frame m 20'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'margin')).toBe('20px')
  })

})

// ============================================================
// 7. Pin-Center Variants
// ============================================================
describe('Pin-Center Variants', () => {

  test('pin-center-x', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pin-center-x
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('50%')
    expect(getStyle(child, 'transform')).toContain('translateX(-50%)')
  })

  test('pin-center-y', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pin-center-y
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'top')).toBe('50%')
    expect(getStyle(child, 'transform')).toContain('translateY(-50%)')
  })

  test('pin-center (both)', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pin-center
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'position')).toBe('absolute')
    expect(getStyle(child, 'left')).toBe('50%')
    expect(getStyle(child, 'top')).toBe('50%')
    expect(getStyle(child, 'transform')).toContain('translate(-50%, -50%)')
  })

  test('pcx alias für pin-center-x', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pcx
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'left')).toBe('50%')
  })

  test('pcy alias für pin-center-y', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pcy
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'top')).toBe('50%')
  })

  test('pc alias für pin-center', () => {
    const ir = toIR(parse(`
Frame pos
  Frame pc
`))
    const child = ir.nodes[0].children[0]
    expect(getStyle(child, 'left')).toBe('50%')
    expect(getStyle(child, 'top')).toBe('50%')
  })

})

// ============================================================
// 8. Property Aliases
// ============================================================
describe('Property Aliases', () => {

  test('g alias für gap', () => {
    const ir = toIR(parse('Frame g 10'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'gap')).toBe('10px')
  })

  test('cen alias für center', () => {
    const ir = toIR(parse('Frame cen'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'justify-content')).toBe('center')
    expect(getStyle(node, 'align-items')).toBe('center')
  })

  test('positioned alias für pos', () => {
    const ir = toIR(parse('Frame positioned'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'position')).toBe('relative')
  })

  test('rot alias für rotate', () => {
    const ir = toIR(parse('Frame rot 45'))
    const node = ir.nodes[0]
    expect(getStyle(node, 'transform')).toContain('rotate(45deg)')
  })

})
