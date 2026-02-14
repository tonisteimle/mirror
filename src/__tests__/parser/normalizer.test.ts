import { normalizeInput, getNormalizationChanges } from '../../parser/normalizer'

describe('Input Normalizer', () => {
  describe('Component name normalization', () => {
    it('normalizes lowercase component names to PascalCase', () => {
      expect(normalizeInput('button "Click"')).toBe('Button "Click"')
      expect(normalizeInput('box pad 16')).toBe('Box pad 16')
      expect(normalizeInput('text "Hello"')).toBe('text "Hello"') // text stays lowercase (doc-mode)
      expect(normalizeInput('Text "Hello"')).toBe('Text "Hello"') // Text stays as-is (already PascalCase)
    })

    it('normalizes known library components', () => {
      expect(normalizeInput('dropdown')).toBe('Dropdown')
      expect(normalizeInput('dialog')).toBe('Dialog')
      expect(normalizeInput('tooltip')).toBe('Tooltip')
      expect(normalizeInput('checkbox')).toBe('Checkbox')
    })

    it('normalizes list items with components', () => {
      expect(normalizeInput('- button "Click"')).toBe('- Button "Click"')
      expect(normalizeInput('- item "One"')).toBe('- Item "One"')
    })

    it('preserves already-correct casing', () => {
      expect(normalizeInput('Button "Click"')).toBe('Button "Click"')
      expect(normalizeInput('Box pad 16')).toBe('Box pad 16')
    })

    it('does not normalize keywords', () => {
      expect(normalizeInput('if $active')).toBe('if $active')
      expect(normalizeInput('each $item in $list')).toBe('each $item in $list')
      expect(normalizeInput('state hover')).toBe('state hover')
      expect(normalizeInput('events')).toBe('events')
    })
  })

  describe('Whitespace normalization', () => {
    it('converts tabs to 2 spaces', () => {
      expect(normalizeInput('\tButton')).toBe('  Button')
      expect(normalizeInput('\t\tButton')).toBe('    Button')
    })

    it('normalizes odd indentation to even', () => {
      expect(normalizeInput('   Button')).toBe('  Button') // 3 spaces → 2
      expect(normalizeInput('     Button')).toBe('    Button') // 5 spaces → 4
    })

    it('removes trailing whitespace', () => {
      expect(normalizeInput('Button   ')).toBe('Button')
      expect(normalizeInput('Box pad 16  ')).toBe('Box pad 16')
    })

    it('collapses multiple spaces to one', () => {
      expect(normalizeInput('Box  pad  16')).toBe('Box pad 16')
      expect(normalizeInput('Button   bg   #F00')).toBe('Button bg #F00')
    })

    it('collapses multiple empty lines', () => {
      expect(normalizeInput('Box\n\n\n\nButton')).toBe('Box\n\nButton')
    })

    it('removes trailing empty lines', () => {
      expect(normalizeInput('Button\n\n\n')).toBe('Button')
    })

    it('normalizes line endings', () => {
      expect(normalizeInput('Box\r\nButton')).toBe('Box\nButton')
      expect(normalizeInput('Box\rButton')).toBe('Box\nButton')
    })
  })

  describe('Quote normalization', () => {
    it('normalizes typographic double quotes', () => {
      // Using unicode escapes for typographic quotes
      expect(normalizeInput('Button \u201CClick\u201D')).toBe('Button "Click"') // "Click"
      expect(normalizeInput('Button \u201EClick\u201C')).toBe('Button "Click"') // „Click"
      expect(normalizeInput('Button \u00ABClick\u00BB')).toBe('Button "Click"') // «Click»
    })

    it('normalizes typographic single quotes', () => {
      // Note: Single quotes in the DSL are for multiline strings, so we keep them
      // But typographic single quotes get normalized
      const input = "Button \u2018text\u2019" // Using unicode for typographic quotes
      expect(normalizeInput(input)).toBe("Button 'text'")
    })
  })

  describe('Color normalization', () => {
    it('preserves hex color case as written by user', () => {
      expect(normalizeInput('Box bg #fff')).toBe('Box bg #fff')
      expect(normalizeInput('Box bg #F00')).toBe('Box bg #F00')
      expect(normalizeInput('Box bg #AbCdEf')).toBe('Box bg #AbCdEf')
    })

    it('replaces CSS color names with hex', () => {
      expect(normalizeInput('Box bg red')).toBe('Box bg #FF0000')
      expect(normalizeInput('Box bg blue col white')).toBe('Box bg #0000FF col #FFFFFF')
      expect(normalizeInput('Box bg transparent')).toBe('Box bg transparent')
    })

    it('does not replace colors inside strings', () => {
      expect(normalizeInput('Button "red button"')).toBe('Button "red button"')
      expect(normalizeInput('Label "the color is blue"')).toBe('Label "the color is blue"')
    })

    it('does not replace colors that are part of identifiers', () => {
      // e.g., "darkMode" should not become "#A9A9A9Mode"
      expect(normalizeInput('Box bg $darkMode')).toBe('Box bg $darkMode')
    })
  })

  describe('Unit removal', () => {
    it('removes px suffix', () => {
      expect(normalizeInput('Box pad 16px')).toBe('Box pad 16')
      expect(normalizeInput('Box w 200px h 100px')).toBe('Box w 200 h 100')
    })

    it('converts rem to px', () => {
      expect(normalizeInput('Box pad 1rem')).toBe('Box pad 16')
      expect(normalizeInput('Box pad 1.5rem')).toBe('Box pad 24')
      expect(normalizeInput('Box pad 0.5rem')).toBe('Box pad 8')
    })

    it('converts em to px', () => {
      expect(normalizeInput('Box size 1em')).toBe('Box size 16')
      expect(normalizeInput('Box size 2em')).toBe('Box size 32')
    })
  })

  describe('Property alias normalization', () => {
    it('normalizes CSS property names to Mirror shorthand', () => {
      expect(normalizeInput('Box background #F00')).toBe('Box bg #F00')
      expect(normalizeInput('Box color #FFF')).toBe('Box col #FFF')
      expect(normalizeInput('Box padding 16')).toBe('Box pad 16')
      expect(normalizeInput('Box margin 8')).toBe('Box mar 8')
      expect(normalizeInput('Box border-radius 8')).toBe('Box rad 8')
      expect(normalizeInput('Box width 200 height 100')).toBe('Box w 200 h 100')
    })
  })

  describe('Syntax artifact removal', () => {
    it('removes trailing semicolons', () => {
      expect(normalizeInput('Box bg #F00;')).toBe('Box bg #F00')
      expect(normalizeInput('Button pad 16;')).toBe('Button pad 16')
    })

    it('does not remove semicolons inside strings', () => {
      expect(normalizeInput('Label "Hello; World"')).toBe('Label "Hello; World"')
    })

    it('removes CSS-style colons from properties', () => {
      expect(normalizeInput('Box pad: 16')).toBe('Box pad 16')
      expect(normalizeInput('Box bg: #F00')).toBe('Box bg #F00')
    })

    it('preserves colons in component definitions', () => {
      expect(normalizeInput('Button: pad 16')).toBe('Button: pad 16')
      expect(normalizeInput('Card: bg #F00')).toBe('Card: bg #F00')
    })

    it('preserves colons in token definitions', () => {
      expect(normalizeInput('$primary: #3B82F6')).toBe('$primary: #3B82F6')
    })

    it('removes parentheses from property values', () => {
      expect(normalizeInput('Box pad(16)')).toBe('Box pad 16')
      expect(normalizeInput('Box bg(#F00)')).toBe('Box bg #F00')
    })

    it('preserves commas for action chaining', () => {
      // Commas are NOT normalized because they're used for action chaining
      // e.g., "onclick activate self, deactivate-siblings"
      expect(normalizeInput('Box pad 16, 12')).toBe('Box pad 16, 12')
      expect(normalizeInput('Button onclick show A, hide B')).toBe('Button onclick show A, hide B')
    })

    it('preserves commas inside strings', () => {
      expect(normalizeInput('Label "Hello, World"')).toBe('Label "Hello, World"')
    })
  })

  describe('Multiline string preservation', () => {
    it('does not normalize content inside multiline strings', () => {
      const input = `text
  'button bg red'`
      const result = normalizeInput(input)
      expect(result).toContain("'button bg red'") // Should NOT become 'Button bg #FF0000'
    })
  })

  describe('Comment preservation', () => {
    it('preserves comment content', () => {
      expect(normalizeInput('// This is a comment')).toBe('// This is a comment')
      expect(normalizeInput('Box pad 16 // inline comment')).toBe('Box pad 16 // inline comment')
    })

    it('preserves comment indentation', () => {
      expect(normalizeInput('  // indented comment')).toBe('  // indented comment')
    })
  })

  describe('getNormalizationChanges', () => {
    it('reports when changes were made', () => {
      const result = getNormalizationChanges('button bg red')
      expect(result.changed).toBe(true)
      expect(result.original).toBe('button bg red')
      expect(result.normalized).toBe('Button bg #FF0000') // CSS color name gets full hex
    })

    it('reports when no changes were needed', () => {
      const result = getNormalizationChanges('Button bg #FF0000')
      expect(result.changed).toBe(false)
    })
  })

  describe('Integration with real DSL examples', () => {
    it('normalizes a complete component definition', () => {
      const input = `button: pad 16px background #f00
  box  color  white`

      const expected = `Button: pad 16 bg #f00
  Box col #FFFFFF`

      expect(normalizeInput(input)).toBe(expected)
    })

    it('normalizes a layout with nested children', () => {
      const input = `container width 100% padding 24
  header horizontal between
    box "Logo"
    nav horizontal gap 16
      - button "Home"
      - button "About"`

      const result = normalizeInput(input)
      expect(result).toContain('Container w 100% pad 24')
      expect(result).toContain('Header hor between')
      expect(result).toContain('Nav hor gap 16')
      expect(result).toContain('- Button "Home"')
    })
  })
})
