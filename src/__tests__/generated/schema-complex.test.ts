/**
 * Schema Complex Properties Tests
 *
 * Tests für Properties die spezielle Syntax oder Behandlung brauchen
 * und nicht automatisch aus dem Schema generiert werden können.
 */

import { describe, it, expect } from 'vitest'
import { compileAndExecute } from '../../test-utils'

// ============================================================================
// Border Tests
// ============================================================================

describe('Complex Property: border', () => {
  describe('basic syntax', () => {
    it('border with width only', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 1

Box
`)
      expect(root.style.borderWidth).toBe('1px')
    })

    // Multi-value border syntax - now implemented
    it('border with width and color', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 1 #333

Box
`)
      // The shorthand is decomposed by browser
      expect(root.style.borderWidth).toBe('1px')
      expect(root.style.borderStyle).toBe('solid')  // default added by formatBorderValue
    })

    it('border with width, style, and color', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 2 solid #FF0000

Box
`)
      expect(root.style.borderWidth).toBe('2px')
      expect(root.style.borderStyle).toBe('solid')
    })

    it('border dashed style', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 1 dashed #666

Box
`)
      expect(root.style.borderStyle).toBe('dashed')
    })

    it('border dotted style', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 1 dotted #666

Box
`)
      expect(root.style.borderStyle).toBe('dotted')
    })
  })

  describe('directional borders', () => {
    it('border top', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor t 1 solid #333

Box
`)
      expect(root.style.borderTopWidth).toBe('1px')
    })

    it('border bottom', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor b 1 solid #333

Box
`)
      expect(root.style.borderBottomWidth).toBe('1px')
    })

    it('border left', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor l 1 solid #333

Box
`)
      expect(root.style.borderLeftWidth).toBe('1px')
    })

    it('border right', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor r 1 solid #333

Box
`)
      expect(root.style.borderRightWidth).toBe('1px')
    })
  })

  describe('aliases', () => {
    it('bor is alias for border (width only)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  bor 1

Box
`)
      expect(root.style.borderWidth).toBe('1px')
    })
  })
})

// ============================================================================
// Radius Tests
// ============================================================================

describe('Complex Property: radius', () => {
  describe('basic syntax', () => {
    it('single radius value', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad 8

Box
`)
      expect(root.style.borderRadius).toBe('8px')
    })

    it('multiple radius values (4 corners)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad 4 8 12 16

Box
`)
      expect(root.style.borderRadius).toBe('4px 8px 12px 16px')
    })
  })

  describe('directional radius', () => {
    it('top-left radius', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad tl 8

Box
`)
      expect(root.style.borderTopLeftRadius).toBe('8px')
    })

    it('top-right radius', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad tr 8

Box
`)
      expect(root.style.borderTopRightRadius).toBe('8px')
    })

    it('bottom-left radius', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad bl 8

Box
`)
      expect(root.style.borderBottomLeftRadius).toBe('8px')
    })

    it('bottom-right radius', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad br 8

Box
`)
      expect(root.style.borderBottomRightRadius).toBe('8px')
    })

    it('top radius (both corners)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad t 8

Box
`)
      expect(root.style.borderTopLeftRadius).toBe('8px')
      expect(root.style.borderTopRightRadius).toBe('8px')
    })

    it('bottom radius (both corners)', () => {
      const { root } = compileAndExecute(`
Box as frame:
  rad b 8

Box
`)
      expect(root.style.borderBottomLeftRadius).toBe('8px')
      expect(root.style.borderBottomRightRadius).toBe('8px')
    })
  })
})

// ============================================================================
// Grid Tests
// ============================================================================

describe('Complex Property: grid', () => {
  describe('column count', () => {
    it('grid with 2 columns', () => {
      const { root } = compileAndExecute(`
Box as frame:
  grid 2

Box
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toBe('repeat(2, 1fr)')
    })

    it('grid with 3 columns', () => {
      const { root } = compileAndExecute(`
Box as frame:
  grid 3

Box
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toBe('repeat(3, 1fr)')
    })

    it('grid with 4 columns', () => {
      const { root } = compileAndExecute(`
Box as frame:
  grid 4

Box
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gridTemplateColumns).toBe('repeat(4, 1fr)')
    })
  })

  describe('auto-fill', () => {
    it('grid auto with min width', () => {
      const { root } = compileAndExecute(`
Box as frame:
  grid auto 200

Box
`)
      expect(root.style.display).toBe('grid')
      // Should contain auto-fill or auto-fit
      expect(root.style.gridTemplateColumns).toContain('auto')
    })
  })

  describe('with gap', () => {
    it('grid with gap', () => {
      const { root } = compileAndExecute(`
Box as frame:
  grid 3, gap 16

Box
`)
      expect(root.style.display).toBe('grid')
      expect(root.style.gap).toBe('16px')
    })
  })
})

// ============================================================================
// Font Weight Keywords Tests
// ============================================================================

describe('Complex Property: weight keywords', () => {
  // Weight keywords are defined in schema
  describe('keyword values', () => {
    it.each([
      ['thin', '100'],
      ['light', '300'],
      ['normal', '400'],
      ['medium', '500'],
      ['semibold', '600'],
      ['bold', '700'],
      ['black', '900'],
    ])('weight %s applies font-weight %s', (keyword, expected) => {
      const { root } = compileAndExecute(`
Label as text:
  weight ${keyword}

Label "Test"
`)
      expect(root.style.fontWeight).toBe(expected)
    })
  })

  it('weight with numeric value', () => {
    const { root } = compileAndExecute(`
Label as text:
  weight 550

Label "Test"
`)
    expect(root.style.fontWeight).toBe('550')
  })
})

// ============================================================================
// Font Family Tests
// ============================================================================

describe('Complex Property: font', () => {
  it('font sans applies sans-serif stack', () => {
    const { root } = compileAndExecute(`
Label as text:
  font sans

Label "Test"
`)
    expect(root.style.fontFamily).toContain('sans')
  })

  it('font serif applies serif stack', () => {
    const { root } = compileAndExecute(`
Label as text:
  font serif

Label "Test"
`)
    expect(root.style.fontFamily).toContain('serif')
  })

  it('font mono applies monospace stack', () => {
    const { root } = compileAndExecute(`
Label as text:
  font mono

Label "Test"
`)
    expect(root.style.fontFamily).toContain('mono')
  })
})

// ============================================================================
// Aspect Ratio Tests
// ============================================================================

describe('Complex Property: aspect', () => {
  // Note: aspect-ratio may not be fully supported in JSDOM
  // These tests verify the code is generated correctly

  it('aspect square generates correct code', () => {
    const { jsCode } = compileAndExecute(`
Box as frame:
  aspect square

Box
`)
    expect(jsCode).toContain('aspect')
  })

  it('aspect video generates correct code', () => {
    const { jsCode } = compileAndExecute(`
Box as frame:
  aspect video

Box
`)
    expect(jsCode).toContain('aspect')
  })

  it('aspect with numeric ratio', () => {
    const { jsCode } = compileAndExecute(`
Box as frame:
  aspect 1.5

Box
`)
    expect(jsCode).toContain('aspect')
  })
})

// ============================================================================
// Translate Tests
// ============================================================================

describe('Complex Property: translate', () => {
  it('translate with single value', () => {
    const { root } = compileAndExecute(`
Box as frame:
  translate 10

Box
`)
    // Browser normalizes 0 to 0px
    expect(root.style.transform).toContain('translate')
  })

  it('translate with x and y values', () => {
    const { root } = compileAndExecute(`
Box as frame:
  translate 10 20

Box
`)
    expect(root.style.transform).toContain('translate')
  })
})

// ============================================================================
// Missing Alias Tests
// ============================================================================

describe('Alias Coverage', () => {
  describe('opacity aliases', () => {
    it('o is alias for opacity', () => {
      const { root } = compileAndExecute(`
Box as frame:
  o 0.5

Box
`)
      expect(root.style.opacity).toBe('0.5')
    })

    // opa alias - now implemented
    it('opa is alias for opacity', () => {
      const { root } = compileAndExecute(`
Box as frame:
  opa 0.5

Box
`)
      expect(root.style.opacity).toBe('0.5')
    })
  })

  describe('position aliases', () => {
    it('abs sets absolute positioning', () => {
      const { root } = compileAndExecute(`
Container as frame:
  stacked

Child as frame:
  abs

Container
  Child
`)
      const child = root.querySelector('div')
      expect(child?.style.position).toBe('absolute')
    })

    it('x position implies absolute', () => {
      const { root } = compileAndExecute(`
Container as frame:
  stacked

Child as frame:
  x 10

Container
  Child
`)
      const child = root.querySelector('div')
      expect(child?.style.position).toBe('absolute')
      expect(child?.style.left).toBe('10px')
    })
  })

  describe('scroll aliases', () => {
    it('scroll-ver is alias for scroll', () => {
      const { root } = compileAndExecute(`
Box as frame:
  scroll-ver

Box
`)
      expect(root.style.overflowY).toBe('auto')
    })
  })

  describe('backdrop-blur alias', () => {
    it('blur-bg is alias for backdrop-blur', () => {
      const { root } = compileAndExecute(`
Box as frame:
  blur-bg 10

Box
`)
      expect(root.style.backdropFilter).toContain('blur')
    })
  })
})
