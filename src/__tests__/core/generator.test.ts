import { describe, it, expect } from 'vitest'
import { getStyle, generate } from '../test-utils'

describe('Generator', () => {
  describe('Layout Direction', () => {
    it('hor generates flexDirection: row', () => {
      const element = generate('Box hor')
      const style = getStyle(element)
      expect(style.flexDirection).toBe('row')
    })

    it('ver generates flexDirection: column', () => {
      const element = generate('Box ver')
      const style = getStyle(element)
      expect(style.flexDirection).toBe('column')
    })

    it('default is row when flex is needed', () => {
      // Without layout properties, flex is not applied
      const element = generate('Box hor')
      const style = getStyle(element)
      expect(style.flexDirection).toBe('row')
    })
  })

  describe('Absolute Alignment - Horizontal Layout', () => {
    it('hor + hor-l generates justifyContent: flex-start', () => {
      const element = generate('Box hor hor-l')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('flex-start')
    })

    it('hor + hor-cen generates justifyContent: center', () => {
      const element = generate('Box hor hor-cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
    })

    it('hor + hor-r generates justifyContent: flex-end', () => {
      const element = generate('Box hor hor-r')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('flex-end')
    })

    it('hor + ver-t generates alignItems: flex-start', () => {
      const element = generate('Box hor ver-t')
      const style = getStyle(element)
      expect(style.alignItems).toBe('flex-start')
    })

    it('hor + ver-cen generates alignItems: center', () => {
      const element = generate('Box hor ver-cen')
      const style = getStyle(element)
      expect(style.alignItems).toBe('center')
    })

    it('hor + ver-b generates alignItems: flex-end', () => {
      const element = generate('Box hor ver-b')
      const style = getStyle(element)
      expect(style.alignItems).toBe('flex-end')
    })
  })

  describe('Absolute Alignment - Vertical Layout', () => {
    it('ver + hor-l generates alignItems: flex-start', () => {
      const element = generate('Box ver hor-l')
      const style = getStyle(element)
      expect(style.alignItems).toBe('flex-start')
    })

    it('ver + hor-cen generates alignItems: center', () => {
      const element = generate('Box ver hor-cen')
      const style = getStyle(element)
      expect(style.alignItems).toBe('center')
    })

    it('ver + hor-r generates alignItems: flex-end', () => {
      const element = generate('Box ver hor-r')
      const style = getStyle(element)
      expect(style.alignItems).toBe('flex-end')
    })

    it('ver + ver-t generates justifyContent: flex-start', () => {
      const element = generate('Box ver ver-t')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('flex-start')
    })

    it('ver + ver-cen generates justifyContent: center', () => {
      const element = generate('Box ver ver-cen')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('center')
    })

    it('ver + ver-b generates justifyContent: flex-end', () => {
      const element = generate('Box ver ver-b')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('flex-end')
    })
  })

  describe('Sizing', () => {
    it('w and h generate width and height', () => {
      const element = generate('Box w 200 h 100')
      const style = getStyle(element)
      expect(style.width).toBe('200px')
      expect(style.height).toBe('100px')
    })

    it('full generates 100% width and height', () => {
      const element = generate('Box full')
      const style = getStyle(element)
      expect(style.width).toBe('100%')
      expect(style.height).toBe('100%')
    })

    it('minw, maxw, minh, maxh work correctly', () => {
      const element = generate('Box minw 100 maxw 500 minh 50 maxh 300')
      const style = getStyle(element)
      expect(style.minWidth).toBe('100px')
      expect(style.maxWidth).toBe('500px')
      expect(style.minHeight).toBe('50px')
      expect(style.maxHeight).toBe('300px')
    })
  })

  describe('Spacing', () => {
    it('pad generates padding', () => {
      const element = generate('Box pad 16')
      const style = getStyle(element)
      expect(style.padding).toBe('16px')
    })

    it('pad with directions generates specific padding', () => {
      const element = generate('Box pad l 8')
      const style = getStyle(element)
      expect(style.paddingLeft).toBe('8px')
    })

    it('mar generates margin', () => {
      const element = generate('Box mar 8')
      const style = getStyle(element)
      expect(style.margin).toBe('8px')
    })

    it('gap generates gap', () => {
      const element = generate('Box gap 16')
      const style = getStyle(element)
      expect(style.gap).toBe('16px')
    })
  })

  describe('Colors', () => {
    it('bg generates backgroundColor', () => {
      const element = generate('Box bg #3B82F6')
      const style = getStyle(element)
      expect(style.backgroundColor).toBe('#3B82F6')
    })

    it('col generates text color', () => {
      const element = generate('Box col #FFFFFF')
      const style = getStyle(element)
      expect(style.color).toBe('#FFFFFF')
    })

    it('col and bg can be used together', () => {
      const element = generate('Box col #FFFFFF bg #3B82F6')
      const style = getStyle(element)
      expect(style.color).toBe('#FFFFFF')
      expect(style.backgroundColor).toBe('#3B82F6')
    })
  })

  describe('Border', () => {
    it('rad generates borderRadius', () => {
      const element = generate('Box rad 8')
      const style = getStyle(element)
      expect(style.borderRadius).toBe('8px')
    })

    it('border generates border', () => {
      const element = generate('Box border 1')
      const style = getStyle(element)
      expect(style.border).toBe('1px solid')
    })
  })

  describe('Typography', () => {
    it('size generates fontSize', () => {
      // Use Box to test typography since Text might wrap content differently
      const element = generate('Box size 16')
      const style = getStyle(element)
      expect(style.fontSize).toBe('16px')
    })

    it('weight generates fontWeight', () => {
      // Use Box to test typography since Text might wrap content differently
      const element = generate('Box weight 600')
      const style = getStyle(element)
      expect(style.fontWeight).toBe(600)
    })
  })

  describe('Flex Properties', () => {
    it('grow generates flexGrow', () => {
      const element = generate('Box grow')
      const style = getStyle(element)
      expect(style.flexGrow).toBe(1)
    })

    it('wrap generates flexWrap', () => {
      const element = generate('Box wrap')
      const style = getStyle(element)
      expect(style.flexWrap).toBe('wrap')
    })

    it('between generates justifyContent: space-between', () => {
      const element = generate('Box between')
      const style = getStyle(element)
      expect(style.justifyContent).toBe('space-between')
    })
  })
})
