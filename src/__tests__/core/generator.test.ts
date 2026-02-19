import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { propertiesToStyle } from '../../utils/style-converter'

/**
 * Helper: Parse DSL and get style from properties
 * Tests the full parse → style pipeline without React rendering
 */
function getStyleFromDSL(dsl: string): React.CSSProperties {
  const result = parse(dsl)
  if (result.nodes.length === 0) return {}
  const node = result.nodes[0]
  const hasChildren = node.children.length > 0
  return propertiesToStyle(node.properties, hasChildren, node.name)
}

describe('Generator', () => {
  describe('Layout Direction', () => {
    it('hor generates flexDirection: row', () => {
      const style = getStyleFromDSL('Box hor')
      expect(style.flexDirection).toBe('row')
    })

    it('ver generates flexDirection: column', () => {
      const style = getStyleFromDSL('Box ver')
      expect(style.flexDirection).toBe('column')
    })

    it('default is row when flex is needed', () => {
      const style = getStyleFromDSL('Box hor')
      expect(style.flexDirection).toBe('row')
    })
  })

  describe('Absolute Alignment - Horizontal Layout', () => {
    it('hor + hor-l generates justifyContent: flex-start', () => {
      const style = getStyleFromDSL('Box hor hor-l')
      expect(style.justifyContent).toBe('flex-start')
    })

    it('hor + hor-cen generates justifyContent: center', () => {
      const style = getStyleFromDSL('Box hor hor-cen')
      expect(style.justifyContent).toBe('center')
    })

    it('hor + hor-r generates justifyContent: flex-end', () => {
      const style = getStyleFromDSL('Box hor hor-r')
      expect(style.justifyContent).toBe('flex-end')
    })

    it('hor + ver-t generates alignItems: flex-start', () => {
      const style = getStyleFromDSL('Box hor ver-t')
      expect(style.alignItems).toBe('flex-start')
    })

    it('hor + ver-cen generates alignItems: center', () => {
      const style = getStyleFromDSL('Box hor ver-cen')
      expect(style.alignItems).toBe('center')
    })

    it('hor + ver-b generates alignItems: flex-end', () => {
      const style = getStyleFromDSL('Box hor ver-b')
      expect(style.alignItems).toBe('flex-end')
    })
  })

  describe('Absolute Alignment - Vertical Layout', () => {
    it('ver + hor-l generates alignItems: flex-start', () => {
      const style = getStyleFromDSL('Box ver hor-l')
      expect(style.alignItems).toBe('flex-start')
    })

    it('ver + hor-cen generates alignItems: center', () => {
      const style = getStyleFromDSL('Box ver hor-cen')
      expect(style.alignItems).toBe('center')
    })

    it('ver + hor-r generates alignItems: flex-end', () => {
      const style = getStyleFromDSL('Box ver hor-r')
      expect(style.alignItems).toBe('flex-end')
    })

    it('ver + ver-t generates justifyContent: flex-start', () => {
      const style = getStyleFromDSL('Box ver ver-t')
      expect(style.justifyContent).toBe('flex-start')
    })

    it('ver + ver-cen generates justifyContent: center', () => {
      const style = getStyleFromDSL('Box ver ver-cen')
      expect(style.justifyContent).toBe('center')
    })

    it('ver + ver-b generates justifyContent: flex-end', () => {
      const style = getStyleFromDSL('Box ver ver-b')
      expect(style.justifyContent).toBe('flex-end')
    })
  })

  describe('Sizing', () => {
    it('w and h generate width and height', () => {
      const style = getStyleFromDSL('Box w 200 h 100')
      expect(style.width).toBe('200px')
      expect(style.height).toBe('100px')
    })

    it('full generates 100% width and height', () => {
      const style = getStyleFromDSL('Box full')
      expect(style.width).toBe('100%')
      expect(style.height).toBe('100%')
    })

    it('minw, maxw, minh, maxh work correctly', () => {
      const style = getStyleFromDSL('Box minw 100 maxw 500 minh 50 maxh 300')
      expect(style.minWidth).toBe('100px')
      expect(style.maxWidth).toBe('500px')
      expect(style.minHeight).toBe('50px')
      expect(style.maxHeight).toBe('300px')
    })
  })

  describe('Spacing', () => {
    it('pad generates padding', () => {
      const style = getStyleFromDSL('Box pad 16')
      expect(style.padding).toBe('16px')
    })

    it('pad with directions generates specific padding', () => {
      const style = getStyleFromDSL('Box pad l 8')
      expect(style.paddingLeft).toBe('8px')
    })

    it('mar generates margin', () => {
      const style = getStyleFromDSL('Box mar 8')
      expect(style.margin).toBe('8px')
    })

    it('gap generates gap', () => {
      const style = getStyleFromDSL('Box gap 16')
      expect(style.gap).toBe('16px')
    })
  })

  describe('Colors', () => {
    it('bg generates backgroundColor', () => {
      const style = getStyleFromDSL('Box bg #3B82F6')
      expect(style.backgroundColor).toBe('#3B82F6')
    })

    it('col generates text color', () => {
      const style = getStyleFromDSL('Box col #FFFFFF')
      expect(style.color).toBe('#FFFFFF')
    })

    it('col and bg can be used together', () => {
      const style = getStyleFromDSL('Box col #FFFFFF bg #3B82F6')
      expect(style.color).toBe('#FFFFFF')
      expect(style.backgroundColor).toBe('#3B82F6')
    })
  })

  describe('Border', () => {
    it('rad generates borderRadius', () => {
      const style = getStyleFromDSL('Box rad 8')
      expect(style.borderRadius).toBe('8px')
    })

    it('border generates border', () => {
      const style = getStyleFromDSL('Box border 1')
      expect(style.border).toBe('1px solid')
    })
  })

  describe('Typography', () => {
    it('size generates fontSize', () => {
      const style = getStyleFromDSL('Box size 16')
      expect(style.fontSize).toBe('16px')
    })

    it('weight generates fontWeight', () => {
      const style = getStyleFromDSL('Box weight 600')
      expect(style.fontWeight).toBe(600)
    })
  })

  describe('Flex Properties', () => {
    it('grow generates flexGrow', () => {
      const style = getStyleFromDSL('Box grow')
      expect(style.flexGrow).toBe(1)
    })

    it('wrap generates flexWrap', () => {
      const style = getStyleFromDSL('Box wrap')
      expect(style.flexWrap).toBe('wrap')
    })

    it('between generates justifyContent: space-between', () => {
      const style = getStyleFromDSL('Box between')
      expect(style.justifyContent).toBe('space-between')
    })
  })
})
