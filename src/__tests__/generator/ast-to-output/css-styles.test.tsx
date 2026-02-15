/**
 * AST to CSS Styles Tests
 *
 * Tests that DSL properties are correctly converted to CSS styles.
 * Uses the propertiesToStyle function via generated React elements.
 */
import { describe, it, expect } from 'vitest'
import { getGeneratedStyle, expectDSLStyle, expectDSLStyles } from '../../kit/style-assertions'

describe('AST to CSS Styles', () => {
  // ==========================================================================
  // Layout Direction
  // ==========================================================================
  describe('Layout Direction', () => {
    it('converts hor to flexDirection row', () => {
      expect(getGeneratedStyle('Box hor').flexDirection).toBe('row')
    })

    it('converts ver to flexDirection column', () => {
      expect(getGeneratedStyle('Box ver').flexDirection).toBe('column')
    })

    it('defaults to column for containers with children', () => {
      const style = getGeneratedStyle(`Box
  Text "child"`)
      expect(style.flexDirection).toBe('column')
    })
  })

  // ==========================================================================
  // Gap
  // ==========================================================================
  describe('Gap', () => {
    it('converts gap to CSS gap', () => {
      expect(getGeneratedStyle('Box gap 16').gap).toBe('16px')
    })

    it('converts gap-x to columnGap', () => {
      expect(getGeneratedStyle('Box gap-x 12').columnGap).toBe('12px')
    })

    it('converts gap-y to rowGap', () => {
      expect(getGeneratedStyle('Box gap-y 8').rowGap).toBe('8px')
    })
  })

  // ==========================================================================
  // Dimension Shorthand
  // ==========================================================================
  describe('Dimension Shorthand', () => {
    it('converts single number to width', () => {
      expect(getGeneratedStyle('Box 300').width).toBe('300px')
    })

    it('converts two numbers to width and height', () => {
      const style = getGeneratedStyle('Box 300 200')
      expect(style.width).toBe('300px')
      expect(style.height).toBe('200px')
    })

    it('converts w property to width', () => {
      expect(getGeneratedStyle('Box w 250').width).toBe('250px')
    })

    it('converts h property to height', () => {
      expect(getGeneratedStyle('Box h 150').height).toBe('150px')
    })

    it('handles percentage widths', () => {
      expect(getGeneratedStyle('Box w 50%').width).toBe('50%')
    })

    it('handles full keyword', () => {
      const style = getGeneratedStyle('Box full')
      expect(style.width).toBe('100%')
      expect(style.height).toBe('100%')
    })
  })

  // ==========================================================================
  // Min/Max Sizing
  // ==========================================================================
  describe('Min/Max Sizing', () => {
    it('converts minw to minWidth', () => {
      expect(getGeneratedStyle('Box minw 100').minWidth).toBe('100px')
    })

    it('converts maxw to maxWidth', () => {
      expect(getGeneratedStyle('Box maxw 500').maxWidth).toBe('500px')
    })

    it('converts minh to minHeight', () => {
      expect(getGeneratedStyle('Box minh 50').minHeight).toBe('50px')
    })

    it('converts maxh to maxHeight', () => {
      expect(getGeneratedStyle('Box maxh 300').maxHeight).toBe('300px')
    })
  })

  // ==========================================================================
  // Colors
  // ==========================================================================
  describe('Colors', () => {
    it('converts col to text color', () => {
      expect(getGeneratedStyle('Text col #FF0000').color).toBe('#FF0000')
    })

    it('converts bg to backgroundColor', () => {
      expect(getGeneratedStyle('Box bg #3B82F6').backgroundColor).toBe('#3B82F6')
    })

    it('converts boc to borderColor', () => {
      expect(getGeneratedStyle('Box boc #333').borderColor).toBe('#333')
    })

    it('handles hex color with alpha', () => {
      expect(getGeneratedStyle('Box bg #3B82F680').backgroundColor).toBe('#3B82F680')
    })
  })

  // ==========================================================================
  // Spacing - Padding
  // ==========================================================================
  describe('Padding', () => {
    it('converts pad to padding', () => {
      expect(getGeneratedStyle('Box pad 16').padding).toBe('16px')
    })

    it('converts padding to padding', () => {
      expect(getGeneratedStyle('Box padding 16').padding).toBe('16px')
    })

    it('converts pad left to paddingLeft', () => {
      expect(getGeneratedStyle('Box padding left 12').paddingLeft).toBe('12px')
    })

    it('converts pad right to paddingRight', () => {
      expect(getGeneratedStyle('Box padding right 12').paddingRight).toBe('12px')
    })

    it('converts pad top to paddingTop', () => {
      expect(getGeneratedStyle('Box padding top 8').paddingTop).toBe('8px')
    })

    it('converts pad bottom to paddingBottom', () => {
      expect(getGeneratedStyle('Box padding bottom 8').paddingBottom).toBe('8px')
    })
  })

  // ==========================================================================
  // Spacing - Margin
  // ==========================================================================
  describe('Margin', () => {
    it('converts mar to margin', () => {
      expect(getGeneratedStyle('Box mar 16').margin).toBe('16px')
    })

    it('converts margin to margin', () => {
      expect(getGeneratedStyle('Box margin 16').margin).toBe('16px')
    })

    it('converts margin left to marginLeft', () => {
      expect(getGeneratedStyle('Box margin left 12').marginLeft).toBe('12px')
    })
  })

  // ==========================================================================
  // Border
  // ==========================================================================
  describe('Border', () => {
    it('converts rad to borderRadius', () => {
      expect(getGeneratedStyle('Box rad 8').borderRadius).toBe('8px')
    })

    it('converts radius to borderRadius', () => {
      expect(getGeneratedStyle('Box radius 8').borderRadius).toBe('8px')
    })

    it('converts bor to border solid', () => {
      expect(getGeneratedStyle('Box bor 1').border).toBe('1px solid')
    })

    it('converts border to border solid', () => {
      expect(getGeneratedStyle('Box border 2').border).toBe('2px solid')
    })

    it('handles per-corner radius', () => {
      const style = getGeneratedStyle('Box radius 8 8 0 0')
      expect(style.borderTopLeftRadius).toBe('8px')
      expect(style.borderTopRightRadius).toBe('8px')
      expect(style.borderBottomRightRadius).toBe('0px')
      expect(style.borderBottomLeftRadius).toBe('0px')
    })
  })

  // ==========================================================================
  // Typography
  // ==========================================================================
  describe('Typography', () => {
    it('converts size to fontSize', () => {
      expect(getGeneratedStyle('Text size 14').fontSize).toBe('14px')
    })

    it('converts weight to fontWeight', () => {
      expect(getGeneratedStyle('Text weight 600').fontWeight).toBe(600)
    })

    it('converts weight bold to fontWeight 700', () => {
      expect(getGeneratedStyle('Text weight bold').fontWeight).toBe(700)
    })

    it('converts line to lineHeight', () => {
      expect(getGeneratedStyle('Text line 1.5').lineHeight).toBe(1.5)
    })

    it('converts align to textAlign', () => {
      expect(getGeneratedStyle('Text align center').textAlign).toBe('center')
    })

    it('converts italic to fontStyle', () => {
      expect(getGeneratedStyle('Text italic').fontStyle).toBe('italic')
    })

    it('converts underline to textDecoration', () => {
      expect(getGeneratedStyle('Text underline').textDecoration).toBe('underline')
    })

    it('converts uppercase to textTransform', () => {
      expect(getGeneratedStyle('Text uppercase').textTransform).toBe('uppercase')
    })

    it('converts lowercase to textTransform', () => {
      expect(getGeneratedStyle('Text lowercase').textTransform).toBe('lowercase')
    })

    it('converts truncate to overflow styles', () => {
      const style = getGeneratedStyle('Text truncate')
      expect(style.overflow).toBe('hidden')
      expect(style.textOverflow).toBe('ellipsis')
      expect(style.whiteSpace).toBe('nowrap')
    })
  })

  // ==========================================================================
  // Alignment
  // ==========================================================================
  describe('Alignment', () => {
    it('converts hor-l in column to alignItems flex-start', () => {
      const style = getGeneratedStyle('Box ver hor-l')
      expect(style.alignItems).toBe('flex-start')
    })

    it('converts hor-cen in column to alignItems center', () => {
      const style = getGeneratedStyle('Box ver hor-cen')
      expect(style.alignItems).toBe('center')
    })

    it('converts hor-r in column to alignItems flex-end', () => {
      const style = getGeneratedStyle('Box ver hor-r')
      expect(style.alignItems).toBe('flex-end')
    })

    it('converts ver-t in column to justifyContent flex-start', () => {
      const style = getGeneratedStyle('Box ver ver-t')
      expect(style.justifyContent).toBe('flex-start')
    })

    it('converts ver-cen in column to justifyContent center', () => {
      const style = getGeneratedStyle('Box ver ver-cen')
      expect(style.justifyContent).toBe('center')
    })

    it('converts ver-b in column to justifyContent flex-end', () => {
      const style = getGeneratedStyle('Box ver ver-b')
      expect(style.justifyContent).toBe('flex-end')
    })

    it('converts between to justifyContent space-between', () => {
      expect(getGeneratedStyle('Box between').justifyContent).toBe('space-between')
    })
  })

  // ==========================================================================
  // Flex Properties
  // ==========================================================================
  describe('Flex Properties', () => {
    it('converts grow to flexGrow 1', () => {
      expect(getGeneratedStyle('Box grow').flexGrow).toBe(1)
    })

    it('converts fill to flexGrow 1', () => {
      expect(getGeneratedStyle('Box fill').flexGrow).toBe(1)
    })

    it('converts shrink to flexShrink', () => {
      expect(getGeneratedStyle('Box shrink 0').flexShrink).toBe(0)
    })

    it('converts wrap to flexWrap', () => {
      expect(getGeneratedStyle('Box wrap').flexWrap).toBe('wrap')
    })
  })

  // ==========================================================================
  // Grid
  // ==========================================================================
  describe('Grid', () => {
    it('converts grid N to repeat columns', () => {
      expect(getGeneratedStyle('Box grid 3').gridTemplateColumns).toBe('repeat(3, 1fr)')
    })

    it('converts grid auto N to auto-fill minmax', () => {
      expect(getGeneratedStyle('Box grid auto 250').gridTemplateColumns).toBe('repeat(auto-fill, minmax(250px, 1fr))')
    })

    it('converts grid percentages', () => {
      expect(getGeneratedStyle('Box grid 30% 70%').gridTemplateColumns).toBe('30% 70%')
    })
  })

  // ==========================================================================
  // Visual Effects
  // ==========================================================================
  describe('Visual Effects', () => {
    it('converts opacity to opacity', () => {
      expect(getGeneratedStyle('Box opacity 0.5').opacity).toBe(0.5)
    })

    it('converts opa shorthand to opacity', () => {
      expect(getGeneratedStyle('Box opa 0.8').opacity).toBe(0.8)
    })

    it('converts cursor to cursor', () => {
      expect(getGeneratedStyle('Box cursor pointer').cursor).toBe('pointer')
    })

    it('converts z to zIndex', () => {
      expect(getGeneratedStyle('Box z 100').zIndex).toBe(100)
    })
  })

  // ==========================================================================
  // Scroll / Overflow
  // ==========================================================================
  describe('Scroll / Overflow', () => {
    it('converts scroll to overflowY auto', () => {
      expect(getGeneratedStyle('Box scroll').overflowY).toBe('auto')
    })

    it('converts scroll-hor to overflowX auto', () => {
      expect(getGeneratedStyle('Box scroll-hor').overflowX).toBe('auto')
    })

    it('converts scroll-both to overflow auto', () => {
      expect(getGeneratedStyle('Box scroll-both').overflow).toBe('auto')
    })

    it('converts clip to overflow hidden', () => {
      expect(getGeneratedStyle('Box clip').overflow).toBe('hidden')
    })
  })

  // ==========================================================================
  // Visibility
  // ==========================================================================
  describe('Visibility', () => {
    it('converts hidden to display none', () => {
      expect(getGeneratedStyle('Box hidden').display).toBe('none')
    })
  })

  // ==========================================================================
  // Stacked Layout
  // ==========================================================================
  describe('Stacked Layout', () => {
    it('converts stacked to grid display', () => {
      const style = getGeneratedStyle('Box stacked')
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('1fr')
      expect(style.gridTemplateRows).toBe('1fr')
    })
  })

  // ==========================================================================
  // Combined Properties
  // ==========================================================================
  describe('Combined Properties', () => {
    it('handles multiple properties together', () => {
      expectDSLStyles('Card 300 200 bg #1A1A23 pad 24 rad 12', {
        width: '300px',
        height: '200px',
        backgroundColor: '#1A1A23',
        padding: '24px',
        borderRadius: '12px',
      })
    })

    it('handles layout with sizing and colors', () => {
      expectDSLStyles('Box hor gap 16 bg #333 pad 12', {
        flexDirection: 'row',
        gap: '16px',
        backgroundColor: '#333',
        padding: '12px',
      })
    })

    it('handles typography combination', () => {
      expectDSLStyles('Text size 18 weight 600 col #FFF', {
        fontSize: '18px',
        fontWeight: 600,
        color: '#FFF',
      })
    })
  })
})
