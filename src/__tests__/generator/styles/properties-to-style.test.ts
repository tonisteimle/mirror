/**
 * Generator Tests: Properties to Style
 *
 * Tests for converting Mirror properties to CSS styles.
 */

import { describe, it, expect } from 'vitest'
import { style } from '../../test-utils'

describe('Layout to CSS', () => {
  it('hor → flexDirection row', () => {
    expect(style('Box hor').flexDirection).toBe('row')
  })

  it('ver → flexDirection column', () => {
    expect(style('Box ver').flexDirection).toBe('column')
  })

  it('center → alignItems + justifyContent', () => {
    const s = style('Box cen')
    expect(s.alignItems).toBe('center')
    expect(s.justifyContent).toBe('center')
  })

  it('gap → gap', () => {
    expect(style('Box gap 12').gap).toBe('12px')
  })

  it('spread → justifyContent space-between', () => {
    expect(style('Box spread').justifyContent).toBe('space-between')
  })

  it('wrap → flexWrap wrap', () => {
    expect(style('Box wrap').flexWrap).toBe('wrap')
  })
})

describe('Sizing to CSS', () => {
  it('width number → width px', () => {
    expect(style('Box w 200').width).toBe('200px')
  })

  it('width percentage → width %', () => {
    expect(style('Box w 50%').width).toBe('50%')
  })

  it('width full → width 100%', () => {
    const s = style('Box w full')
    expect(s.width).toBe('100%')
    expect(s.flexGrow).toBe(1)
  })

  it('width hug → width fit-content', () => {
    expect(style('Box w hug').width).toBe('fit-content')
  })

  it('height number → height px', () => {
    expect(style('Box h 100').height).toBe('100px')
  })

  it('min-width → minWidth', () => {
    expect(style('Box minw 100').minWidth).toBe('100px')
  })

  it('max-width → maxWidth', () => {
    expect(style('Box max-w 500').maxWidth).toBe('500px')
  })
})

describe('Spacing to CSS', () => {
  it('pad → padding', () => {
    expect(style('Box pad 16').padding).toBe('16px')
  })

  it('pad with two values → padding', () => {
    const s = style('Box pad 16 8')
    expect(s.paddingTop).toBe('16px')
    expect(s.paddingBottom).toBe('16px')
    expect(s.paddingLeft).toBe('8px')
    expect(s.paddingRight).toBe('8px')
  })

  it('margin → margin', () => {
    expect(style('Box mar 8').margin).toBe('8px')
  })
})

describe('Colors to CSS', () => {
  it('bg → backgroundColor', () => {
    expect(style('Box bg #333').backgroundColor).toBe('#333')
  })

  it('col → color', () => {
    expect(style('Text col #FFF').color).toBe('#FFF')
  })

  it('boc → borderColor', () => {
    expect(style('Box boc #999').borderColor).toBe('#999')
  })
})

describe('Border to CSS', () => {
  it('bor number → border', () => {
    const s = style('Box bor 1')
    // bor may create full border shorthand or just width
    expect(s.borderWidth || s.border).toBeDefined()
  })

  it('rad → borderRadius', () => {
    expect(style('Box rad 8').borderRadius).toBe('8px')
  })

  it('rad with corners → individual radii', () => {
    const s = style('Box rad tl 8 br 8')
    expect(s.borderTopLeftRadius).toBe('8px')
    expect(s.borderBottomRightRadius).toBe('8px')
  })
})

describe('Typography to CSS', () => {
  it('text-size → fontSize', () => {
    expect(style('Text text-size 16').fontSize).toBe('16px')
  })

  it('weight number → fontWeight', () => {
    expect(style('Text weight 600').fontWeight).toBe(600)
  })

  it('weight bold → fontWeight 700', () => {
    expect(style('Text weight bold').fontWeight).toBe(700)
  })

  it('line → lineHeight', () => {
    expect(style('Text line 1.5').lineHeight).toBe(1.5)
  })

  it('font → fontFamily', () => {
    expect(style('Text font "Inter"').fontFamily).toBe('Inter')
  })

  it('align → textAlign', () => {
    expect(style('Text align center').textAlign).toBe('center')
  })

  it('italic → fontStyle', () => {
    expect(style('Text italic').fontStyle).toBe('italic')
  })

  it('underline → textDecoration', () => {
    expect(style('Text underline').textDecoration).toBe('underline')
  })

  it('uppercase → textTransform', () => {
    expect(style('Text uppercase').textTransform).toBe('uppercase')
  })

  it('truncate → overflow properties', () => {
    const s = style('Text truncate')
    expect(s.overflow).toBe('hidden')
    expect(s.textOverflow).toBe('ellipsis')
    expect(s.whiteSpace).toBe('nowrap')
  })
})

describe('Visual to CSS', () => {
  it('opacity → opacity', () => {
    expect(style('Box o 0.5').opacity).toBe(0.5)
  })

  it('cursor → cursor', () => {
    expect(style('Box cursor pointer').cursor).toBe('pointer')
  })

  it('z → zIndex', () => {
    expect(style('Box z 10').zIndex).toBe(10)
  })

  it('hidden → display none', () => {
    expect(style('Box hidden').display).toBe('none')
  })
})

describe('Transform to CSS', () => {
  it('rotate → transform rotate', () => {
    const s = style('Icon rotate 45')
    expect(s.transform).toContain('rotate')
  })
})

describe('Scroll to CSS', () => {
  it('scroll → overflowY auto', () => {
    expect(style('Box scroll').overflowY).toBe('auto')
  })

  it('scroll-hor → overflowX auto', () => {
    expect(style('Box scroll-hor').overflowX).toBe('auto')
  })

  it('clip → overflow hidden', () => {
    expect(style('Box clip').overflow).toBe('hidden')
  })
})

describe('Combined Properties', () => {
  it('card with multiple properties', () => {
    const s = style('Card bg #1E1E2E, pad 16, rad 8, shadow md')
    expect(s.backgroundColor).toBe('#1E1E2E')
    expect(s.padding).toBe('16px')
    expect(s.borderRadius).toBe('8px')
    expect(s.boxShadow).toBeDefined()
  })

  it('button with full styling', () => {
    const s = style('Button bg #3B82F6, col #FFF, pad 12, rad 8, cursor pointer')
    expect(s.backgroundColor).toBe('#3B82F6')
    expect(s.color).toBe('#FFF')
    expect(s.padding).toBe('12px')
    expect(s.borderRadius).toBe('8px')
    expect(s.cursor).toBe('pointer')
  })
})
