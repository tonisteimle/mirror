/**
 * Structural Fixes Tests
 *
 * Tests for Phase 4 (Structural) fixes.
 */

import { describe, it, expect } from 'vitest'
import {
  fixOrphanedLayoutKeywords,
  fixSplitPropertyLines,
  fixOrphanedNumbers,
  fixDimensionShorthandInDefinition,
  fixDefinitionAndUsageOnSameLine,
  fixDuplicateElementNames,
  fixTextOnSeparateLine,
  fixSingleDashElement,
  // Newly tested
  removeCurlyBraces,
  fixSemicolons,
  convertHtmlTags,
  fixQuotes,
  fixIconNameAttribute,
  fixFlexShorthand,
  fixStateInlineComma,
  removeCssClassSyntax,
  fixMarginShorthands,
  fixPaddingShorthands,
  fixUnknownComponents,
  removeHtmlInputTypes,
  removeBooleanTrue,
  removeUnsupportedAnimations,
  fixBorderShorthand,
  fixDisplayProperty,
  removePositionProperty,
  fixOverflowProperty,
  fixZIndex,
  fixCursorProperty,
} from '../../lib/self-healing/fixes/structural-fixes'

describe('Structural Fixes (Phase 4)', () => {
  describe('fixOrphanedLayoutKeywords', () => {
    it('merges orphaned layout keywords with parent', () => {
      const code = `Box
  ver
  gap 16`
      const result = fixOrphanedLayoutKeywords(code)
      expect(result).toContain('Box ver gap 16')
    })

    it('merges properties with component', () => {
      const code = `Card
  pad 16
  bg #333`
      const result = fixOrphanedLayoutKeywords(code)
      expect(result).toContain('Card pad 16 bg #333')
    })

    it('does not merge state block contents', () => {
      const code = `Button
state hover
  bg #444`
      expect(fixOrphanedLayoutKeywords(code)).toBe(code)
    })
  })

  describe('fixSplitPropertyLines', () => {
    it('merges property name and value on separate lines', () => {
      const code = `state focus
  border-color
  $primary`
      const expected = `state focus
  border-color $primary`
      expect(fixSplitPropertyLines(code)).toBe(expected)
    })

    it('merges color property with hex value', () => {
      const code = `background
#F00`
      const expected = `background #F00`
      expect(fixSplitPropertyLines(code)).toBe(expected)
    })

    it('merges property with token value', () => {
      const code = `padding
$spacing`
      const expected = `padding $spacing`
      expect(fixSplitPropertyLines(code)).toBe(expected)
    })
  })

  describe('fixOrphanedNumbers', () => {
    it('merges orphaned number with previous property', () => {
      const code = `border
1
#333`
      const result = fixOrphanedNumbers(code)
      expect(result).toContain('border 1')
    })

    it('handles radius values', () => {
      const code = `Card radius
8`
      const expected = `Card radius 8`
      expect(fixOrphanedNumbers(code)).toBe(expected)
    })
  })

  describe('fixDimensionShorthandInDefinition', () => {
    it('expands dimension shorthand in definitions', () => {
      expect(fixDimensionShorthandInDefinition('Box: 300 100 radius 12'))
        .toBe('Box: width 300 height 100 radius 12')
    })

    it('handles single dimension', () => {
      expect(fixDimensionShorthandInDefinition('Avatar: 80 radius 40'))
        .toBe('Avatar: width 80 radius 40')
    })

    it('handles percentage dimensions', () => {
      expect(fixDimensionShorthandInDefinition('Container: 100% 50% pad 16'))
        .toBe('Container: width 100% height 50% pad 16')
    })

    it('does not modify component instances', () => {
      expect(fixDimensionShorthandInDefinition('Box 300 100'))
        .toBe('Box 300 100')
    })
  })

  describe('fixDefinitionAndUsageOnSameLine', () => {
    it('merges same-name definition and usage', () => {
      const code = 'Card: background #1E1E1E Card color white "Hello"'
      const expected = 'Card background #1E1E1E color white "Hello"'
      expect(fixDefinitionAndUsageOnSameLine(code)).toBe(expected)
    })

    it('leaves different components unchanged', () => {
      const code = 'Card: background #1E1E1E Button "Click"'
      expect(fixDefinitionAndUsageOnSameLine(code)).toBe(code)
    })
  })

  describe('fixDuplicateElementNames', () => {
    it('adds dash prefix to duplicate element names', () => {
      const code = `Nav
  NavLink "Home"
  NavLink "About"
  NavLink "Contact"`
      const expected = `Nav
  - NavLink "Home"
  - NavLink "About"
  - NavLink "Contact"`
      expect(fixDuplicateElementNames(code)).toBe(expected)
    })

    it('does not modify unique elements', () => {
      const code = `Box
  Header "Title"
  Content "Body"
  Footer "End"`
      expect(fixDuplicateElementNames(code)).toBe(code)
    })

    it('does not double-prefix existing list items', () => {
      const code = `Nav
  - NavLink "Home"
  - NavLink "About"`
      expect(fixDuplicateElementNames(code)).toBe(code)
    })
  })

  describe('fixTextOnSeparateLine', () => {
    it('merges text content from separate line', () => {
      const code = `Button bg #F00
  "Click me"`
      const expected = `Button bg #F00 "Click me"`
      expect(fixTextOnSeparateLine(code)).toBe(expected)
    })

    it('only merges more-indented lines', () => {
      const code = `Box
"Not a child"`
      expect(fixTextOnSeparateLine(code)).toBe(code)
    })

    it('does not merge if current line has text', () => {
      const code = `Button "Save"
  "Click me"`
      expect(fixTextOnSeparateLine(code)).toBe(code)
    })
  })

  describe('fixSingleDashElement', () => {
    it('removes dash prefix from single elements', () => {
      const code = '- Button "Click"'
      const expected = 'Button "Click"'
      expect(fixSingleDashElement(code)).toBe(expected)
    })

    it('preserves dash prefix in lists', () => {
      const code = `- Item "A"
- Item "B"`
      expect(fixSingleDashElement(code)).toBe(code)
    })
  })

  // =========================================================================
  // Additional Structural Fixes Tests
  // =========================================================================

  describe('removeCurlyBraces', () => {
    it('removes curly braces around properties', () => {
      expect(removeCurlyBraces('Button { bg #333 }')).toBe('Button bg #333')
    })

    it('handles multiple properties in braces', () => {
      expect(removeCurlyBraces('Card { pad 16 bg #F00 }')).toBe('Card pad 16 bg #F00')
    })

    it('preserves indentation', () => {
      expect(removeCurlyBraces('  Box { center }')).toBe('  Box center')
    })
  })

  describe('fixSemicolons', () => {
    it('converts semicolons to commas', () => {
      expect(fixSemicolons('Box pad 16; bg #333')).toBe('Box pad 16, bg #333')
    })

    it('removes trailing semicolons', () => {
      expect(fixSemicolons('Button bg #F00;')).toBe('Button bg #F00')
    })
  })

  describe('convertHtmlTags', () => {
    it('converts div to Box', () => {
      expect(convertHtmlTags('<div>content</div>')).toBe('Box "content"')
    })

    it('converts span to Text', () => {
      expect(convertHtmlTags('<span>hello</span>')).toBe('Text "hello"')
    })

    it('converts button to Button', () => {
      expect(convertHtmlTags('<button>Click</button>')).toBe('Button "Click"')
    })

    it('converts input to Input', () => {
      expect(convertHtmlTags('<input>')).toBe('Input')
    })
  })

  describe('fixQuotes', () => {
    it('converts single quotes to double quotes', () => {
      expect(fixQuotes("Button 'Click'")).toBe('Button "Click"')
    })

    it('converts backticks to double quotes', () => {
      expect(fixQuotes('Text `Hello`')).toBe('Text "Hello"')
    })
  })

  describe('fixIconNameAttribute', () => {
    it('converts Icon name="x" to Icon "x"', () => {
      expect(fixIconNameAttribute('Icon name="search"')).toBe('Icon "search"')
    })

    it('handles single quotes', () => {
      expect(fixIconNameAttribute("Icon name='home'")).toBe('Icon "home"')
    })

    it('handles unquoted names', () => {
      expect(fixIconNameAttribute('Icon name search')).toBe('Icon "search"')
    })
  })

  describe('fixFlexShorthand', () => {
    it('converts flex: 1 to width full', () => {
      expect(fixFlexShorthand('Box flex: 1')).toBe('Box width full')
    })

    it('converts flex 1 to width full', () => {
      expect(fixFlexShorthand('Box flex 1')).toBe('Box width full')
    })
  })

  describe('fixStateInlineComma', () => {
    it('removes comma after hover', () => {
      expect(fixStateInlineComma('hover , bg #444')).toBe('hover bg #444')
    })

    it('removes comma after state keywords', () => {
      expect(fixStateInlineComma('state selected , bg #333')).toBe('state selected bg #333')
    })
  })

  describe('removeCssClassSyntax', () => {
    it('removes CSS class syntax from components', () => {
      expect(removeCssClassSyntax('Button.primary bg #333')).toBe('Button bg #333')
    })

    it('handles BEM-style classes', () => {
      expect(removeCssClassSyntax('Card.card-item bg #F00')).toBe('Card bg #F00')
    })
  })

  describe('fixMarginShorthands', () => {
    it('converts mt to margin top', () => {
      expect(fixMarginShorthands('Box mt 24')).toBe('Box margin top 24')
    })

    it('converts mb to margin bottom', () => {
      expect(fixMarginShorthands('Box mb 16')).toBe('Box margin bottom 16')
    })

    it('converts mx to margin 0 N', () => {
      expect(fixMarginShorthands('Box mx 24')).toBe('Box margin 0 24')
    })

    it('converts my to margin N 0', () => {
      expect(fixMarginShorthands('Box my 16')).toBe('Box margin 16 0')
    })
  })

  describe('fixPaddingShorthands', () => {
    it('converts pt to pad top', () => {
      expect(fixPaddingShorthands('Box pt 24')).toBe('Box pad top 24')
    })

    it('converts pb to pad bottom', () => {
      expect(fixPaddingShorthands('Card pb 16')).toBe('Card pad bottom 16')
    })

    it('converts px to pad 0 N', () => {
      expect(fixPaddingShorthands('Box px 24')).toBe('Box pad 0 24')
    })

    it('converts py to pad N 0', () => {
      expect(fixPaddingShorthands('Box py 16')).toBe('Box pad 16 0')
    })
  })

  describe('fixUnknownComponents', () => {
    it('converts Stack to Box', () => {
      expect(fixUnknownComponents('Stack gap 8')).toBe('Box gap 8')
    })

    it('converts VStack to Box', () => {
      expect(fixUnknownComponents('VStack')).toBe('Box')
    })

    it('converts HStack to Box', () => {
      expect(fixUnknownComponents('HStack hor')).toBe('Box hor')
    })

    it('converts Form to Box', () => {
      expect(fixUnknownComponents('Form pad 16')).toBe('Box pad 16')
    })

    it('converts Div to Box', () => {
      expect(fixUnknownComponents('Div bg #333')).toBe('Box bg #333')
    })

    it('converts Label to Text', () => {
      expect(fixUnknownComponents('Label "Name"')).toBe('Text "Name"')
    })

    it('preserves component definitions', () => {
      expect(fixUnknownComponents('Form: pad 16')).toBe('Box: pad 16')
    })
  })

  describe('removeHtmlInputTypes', () => {
    it('removes type email', () => {
      expect(removeHtmlInputTypes('Input type email "Email"')).toBe('Input "Email"')
    })

    it('removes type="password"', () => {
      expect(removeHtmlInputTypes('Input type="password"').trim()).toBe('Input')
    })

    it('removes type text', () => {
      expect(removeHtmlInputTypes('Input type text placeholder "Name"')).toBe('Input placeholder "Name"')
    })
  })

  describe('removeBooleanTrue', () => {
    it('removes center true', () => {
      expect(removeBooleanTrue('Box center true')).toBe('Box center')
    })

    it('removes disabled true', () => {
      expect(removeBooleanTrue('Button disabled true')).toBe('Button disabled')
    })

    it('removes hidden true', () => {
      expect(removeBooleanTrue('Box hidden true')).toBe('Box hidden')
    })

    it('removes wrap true', () => {
      expect(removeBooleanTrue('Box wrap true')).toBe('Box wrap')
    })
  })

  describe('removeUnsupportedAnimations', () => {
    it('removes animate shake', () => {
      expect(removeUnsupportedAnimations('Box animate shake').trim()).toBe('Box')
    })

    it('removes wiggle', () => {
      expect(removeUnsupportedAnimations('Button wiggle').trim()).toBe('Button')
    })

    it('preserves supported animations', () => {
      expect(removeUnsupportedAnimations('Box animate spin 1000')).toBe('Box animate spin 1000')
    })
  })

  describe('fixBorderShorthand (structural)', () => {
    it('normalizes border with short hex', () => {
      expect(fixBorderShorthand('Box border 1 #ddd')).toBe('Box bor 1 #DDDDDD')
    })

    it('expands 3-char hex to 6-char', () => {
      expect(fixBorderShorthand('Card bor 2 #abc')).toBe('Card bor 2 #AABBCC')
    })

    it('normalizes lowercase hex', () => {
      expect(fixBorderShorthand('Box border 1 #ff0000')).toBe('Box bor 1 #FF0000')
    })
  })

  describe('fixDisplayProperty', () => {
    it('converts display flex to hor', () => {
      expect(fixDisplayProperty('Box display flex')).toBe('Box hor')
    })

    it('converts display: flex to hor', () => {
      expect(fixDisplayProperty('Box display: flex')).toBe('Box hor')
    })

    it('converts display: none to hidden', () => {
      expect(fixDisplayProperty('Box display: none')).toBe('Box hidden')
    })

    it('converts display: grid to grid', () => {
      expect(fixDisplayProperty('Box display: grid')).toBe('Box grid')
    })

    it('removes display: block', () => {
      expect(fixDisplayProperty('Box display: block')).toBe('Box ')
    })
  })

  describe('removePositionProperty', () => {
    it('removes position absolute', () => {
      expect(removePositionProperty('Box position absolute bg #333')).toBe('Box bg #333')
    })

    it('removes position: fixed', () => {
      expect(removePositionProperty('Box position: fixed')).toBe('Box ')
    })

    it('removes position relative', () => {
      expect(removePositionProperty('Box position relative')).toBe('Box ')
    })
  })

  describe('fixOverflowProperty', () => {
    it('converts overflow hidden to clip', () => {
      expect(fixOverflowProperty('Box overflow hidden')).toBe('Box clip')
    })

    it('converts overflow: scroll to scroll', () => {
      expect(fixOverflowProperty('Box overflow: scroll')).toBe('Box scroll')
    })

    it('converts overflow auto to scroll', () => {
      expect(fixOverflowProperty('Box overflow auto')).toBe('Box scroll')
    })

    it('removes overflow visible', () => {
      expect(fixOverflowProperty('Box overflow visible')).toBe('Box ')
    })
  })

  describe('fixZIndex', () => {
    it('normalizes very large z-index', () => {
      expect(fixZIndex('Box z-index: 9999')).toBe('Box z 10')
    })

    it('preserves small z-index', () => {
      expect(fixZIndex('Box z-index: 5')).toBe('Box z 5')
    })

    it('caps at 100', () => {
      expect(fixZIndex('Box z-index: 50')).toBe('Box z 50')
    })
  })

  describe('fixCursorProperty', () => {
    it('removes colon after cursor', () => {
      expect(fixCursorProperty('Button cursor: pointer')).toBe('Button cursor pointer')
    })

    it('handles cursor: grab', () => {
      expect(fixCursorProperty('Box cursor: grab')).toBe('Box cursor grab')
    })
  })
})
