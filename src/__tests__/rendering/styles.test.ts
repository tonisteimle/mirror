/**
 * V1 Rendering Tests: Styles
 *
 * Tests that parsed properties convert to correct CSS.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'

// Helper: Parse DSL and get CSS style
function getStyle(dsl: string): React.CSSProperties {
  const result = parse(dsl)
  if (result.nodes.length === 0) return {}
  const node = result.nodes[0]
  return propertiesToStyle(node.properties, node.children.length > 0, node.name)
}

describe('Spacing Styles', () => {
  it('renders padding', () => {
    const style = getStyle('Box pad 16')
    expect(style.padding).toBe('16px')
  })

  it('renders margin', () => {
    const style = getStyle('Box mar 8')
    expect(style.margin).toBe('8px')
  })

  it('renders gap', () => {
    const style = getStyle('Box gap 12')
    expect(style.gap).toBe('12px')
  })
})

describe('Color Styles', () => {
  it('renders background color', () => {
    const style = getStyle('Box bg #FF0000')
    expect(style.backgroundColor).toBe('#FF0000')
  })

  it('renders text color', () => {
    const style = getStyle('Box col #FFFFFF')
    expect(style.color).toBe('#FFFFFF')
  })

  it('renders border color', () => {
    const style = getStyle('Box boc #333333')
    expect(style.borderColor).toBe('#333333')
  })
})

describe('Size Styles', () => {
  it('renders width in pixels', () => {
    const style = getStyle('Box w 200')
    expect(style.width).toBe('200px')
  })

  it('renders height in pixels', () => {
    const style = getStyle('Box h 100')
    expect(style.height).toBe('100px')
  })

  it('renders percentage width', () => {
    const style = getStyle('Box w 50%')
    expect(style.width).toBe('50%')
  })
})

describe('Layout Styles', () => {
  it('renders horizontal as row', () => {
    const style = getStyle('Box hor')
    expect(style.flexDirection).toBe('row')
  })

  it('renders vertical as column', () => {
    const style = getStyle('Box ver')
    expect(style.flexDirection).toBe('column')
  })

  it('renders between as space-between', () => {
    const style = getStyle('Box between')
    expect(style.justifyContent).toBe('space-between')
  })
})

describe('Border Styles', () => {
  it('renders border width', () => {
    const style = getStyle('Box bor 1')
    expect(style.border).toContain('1px')
  })

  it('renders border radius', () => {
    const style = getStyle('Box rad 8')
    expect(style.borderRadius).toBe('8px')
  })
})

describe('Typography Styles', () => {
  it('renders font size', () => {
    const style = getStyle('Text size 14')
    expect(style.fontSize).toBe('14px')
  })

  it('renders font weight', () => {
    const style = getStyle('Text weight 600')
    expect(style.fontWeight).toBe(600)
  })

  it('renders line height', () => {
    const style = getStyle('Text line 1.5')
    expect(style.lineHeight).toBe(1.5)
  })
})

describe('Visual Styles', () => {
  it('renders opacity', () => {
    const style = getStyle('Box opa 0.5')
    expect(style.opacity).toBe(0.5)
  })

  it('renders z-index', () => {
    const style = getStyle('Box z 100')
    expect(style.zIndex).toBe(100)
  })

  it('renders cursor', () => {
    const style = getStyle('Box cursor pointer')
    expect(style.cursor).toBe('pointer')
  })
})
