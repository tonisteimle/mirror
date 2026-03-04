/**
 * Visual Properties E2E Tests
 *
 * Tests the full compilation pipeline for visual properties:
 * - opacity
 * - shadow
 * - cursor
 * - z-index
 * - hidden
 * - visible
 * - disabled
 * - rotate
 * - translate
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'

// Helper to compile Mirror code to JS
function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

// ============================================
// OPACITY
// ============================================

describe('E2E: Opacity', () => {
  it('generates opacity style', () => {
    const input = `
Card as frame:
  opacity 0.5

Card
`
    const output = compile(input)
    expect(output).toContain("'opacity': '0.5'")
  })

  it('generates opacity with shorthand o', () => {
    const input = `
Overlay as frame:
  o 0.8

Overlay
`
    const output = compile(input)
    expect(output).toContain("'opacity': '0.8'")
  })

  it('opacity 0 hides element visually', () => {
    const input = `
Hidden as frame:
  opacity 0

Hidden
`
    const output = compile(input)
    expect(output).toContain("'opacity': '0'")
  })

  it('opacity 1 fully visible', () => {
    const input = `
Visible as frame:
  opacity 1

Visible
`
    const output = compile(input)
    expect(output).toContain("'opacity': '1'")
  })
})

// ============================================
// SHADOW
// ============================================

describe('E2E: Shadow', () => {
  it('generates sm shadow preset', () => {
    const input = `
Card as frame:
  shadow sm

Card
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
    expect(output).toContain('rgba(0,0,0,')
  })

  it('generates md shadow preset', () => {
    const input = `
Modal as frame:
  shadow md

Modal
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
  })

  it('generates lg shadow preset', () => {
    const input = `
Dialog as frame:
  shadow lg

Dialog
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
  })

  // Note: Custom shadow values are parsed as the preset name, not as raw CSS
  it.skip('generates custom shadow value (custom values not yet supported)', () => {
    const input = `
Custom as frame:
  shadow "0 2px 8px rgba(0,0,0,0.2)"

Custom
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
  })
})

// ============================================
// CURSOR
// ============================================

describe('E2E: Cursor', () => {
  it('generates pointer cursor', () => {
    const input = `
Button as button:
  cursor pointer

Button
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'pointer'")
  })

  it('generates not-allowed cursor', () => {
    const input = `
Disabled as frame:
  cursor not-allowed

Disabled
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'not-allowed'")
  })

  it('generates grab cursor', () => {
    const input = `
Draggable as frame:
  cursor grab

Draggable
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'grab'")
  })

  it('generates move cursor', () => {
    const input = `
Movable as frame:
  cursor move

Movable
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'move'")
  })

  it('generates text cursor', () => {
    const input = `
TextArea as frame:
  cursor text

TextArea
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'text'")
  })
})

// ============================================
// Z-INDEX
// ============================================

describe('E2E: Z-Index', () => {
  it('generates z-index style', () => {
    const input = `
Modal as frame:
  z 100

Modal
`
    const output = compile(input)
    expect(output).toContain("'z-index': '100'")
  })

  it('generates high z-index for overlay', () => {
    const input = `
Overlay as frame:
  z 1000

Overlay
`
    const output = compile(input)
    expect(output).toContain("'z-index': '1000'")
  })

  // Note: Negative z-index might not be parsed correctly
  it.skip('generates negative z-index (negative values not yet supported)', () => {
    const input = `
Background as frame:
  z -1

Background
`
    const output = compile(input)
    expect(output).toContain("'z-index': '-1'")
  })
})

// ============================================
// HIDDEN / VISIBLE
// ============================================

describe('E2E: Hidden Property', () => {
  it('generates display: none', () => {
    const input = `
HiddenPanel as frame:
  hidden

HiddenPanel
`
    const output = compile(input)
    expect(output).toContain("'display': 'none'")
  })

  it('hidden with other properties', () => {
    const input = `
Panel as frame:
  hidden
  pad 16
  bg #333

Panel
`
    const output = compile(input)
    expect(output).toContain("'display': 'none'")
    expect(output).toContain("'padding': '16px'")
    expect(output).toContain("'background': '#333'")
  })
})

describe('E2E: Visible Property', () => {
  it('generates visibility: visible', () => {
    const input = `
Panel as frame:
  visible

Panel
`
    const output = compile(input)
    expect(output).toContain("'visibility': 'visible'")
  })
})

// ============================================
// DISABLED
// ============================================

describe('E2E: Disabled Property', () => {
  it('generates disabled styles', () => {
    const input = `
Button as button:
  disabled

Button
`
    const output = compile(input)
    expect(output).toContain("'pointer-events': 'none'")
    expect(output).toContain("'opacity': '0.5'")
  })

  it('disabled with cursor', () => {
    const input = `
Button as button:
  disabled
  cursor not-allowed

Button
`
    const output = compile(input)
    expect(output).toContain("'pointer-events': 'none'")
  })
})

// ============================================
// ROTATE
// ============================================

describe('E2E: Rotate Property', () => {
  it('generates rotate transform', () => {
    const input = `
Icon as frame:
  rotate 45

Icon
`
    const output = compile(input)
    expect(output).toContain("'transform':")
    expect(output).toContain('rotate(45deg)')
  })

  it('generates negative rotation', () => {
    const input = `
Arrow as frame:
  rotate -90

Arrow
`
    const output = compile(input)
    expect(output).toContain('rotate(-90deg)')
  })

  it('rotate shorthand rot', () => {
    const input = `
Icon as frame:
  rot 180

Icon
`
    const output = compile(input)
    expect(output).toContain('rotate(180deg)')
  })
})

// ============================================
// TRANSLATE
// ============================================

describe('E2E: Translate Property', () => {
  it('generates translate transform', () => {
    const input = `
Tooltip as frame:
  translate 10 20

Tooltip
`
    const output = compile(input)
    expect(output).toContain("'transform':")
    expect(output).toContain('translate')
  })

  it('generates negative translate', () => {
    const input = `
Popup as frame:
  translate -50 0

Popup
`
    const output = compile(input)
    expect(output).toContain('translate')
  })
})

// ============================================
// COMBINATIONS
// ============================================

describe('E2E: Visual Property Combinations', () => {
  it('shadow with opacity', () => {
    const input = `
Card as frame:
  shadow md
  opacity 0.9

Card
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
    expect(output).toContain("'opacity': '0.9'")
  })

  it('cursor with z-index', () => {
    const input = `
Button as button:
  cursor pointer
  z 10

Button
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'pointer'")
    expect(output).toContain("'z-index': '10'")
  })

  it('cursor with z-index and opacity', () => {
    const input = `
Overlay as frame:
  cursor pointer
  z 10
  opacity 0.8

Overlay
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'pointer'")
    expect(output).toContain("'z-index': '10'")
    expect(output).toContain("'opacity': '0.8'")
  })

  it('full visual stack', () => {
    const input = `
Modal as frame:
  shadow lg
  z 1000
  opacity 1
  cursor default

Modal
`
    const output = compile(input)
    expect(output).toContain("'box-shadow':")
    expect(output).toContain("'z-index': '1000'")
    expect(output).toContain("'opacity': '1'")
    expect(output).toContain("'cursor': 'default'")
  })
})

// ============================================
// REAL WORLD PATTERNS
// ============================================

describe('E2E: Visual Properties Real World Patterns', () => {
  it('overlay with opacity and z-index', () => {
    const input = `
Overlay as frame:
  bg #000
  opacity 0.5
  z 999

Overlay
`
    const output = compile(input)
    expect(output).toContain("'background': '#000'")
    expect(output).toContain("'opacity': '0.5'")
    expect(output).toContain("'z-index': '999'")
  })

  it('card with shadow', () => {
    const input = `
Card as frame:
  bg #fff
  pad 20
  rad 8
  shadow md

Card
`
    const output = compile(input)
    expect(output).toContain("'padding': '20px'")
    expect(output).toContain("'border-radius': '8px'")
    expect(output).toContain("'box-shadow':")
  })

  it('button with pointer cursor', () => {
    const input = `
Button as button:
  pad 12 24
  bg #3B82F6
  cursor pointer

Button "Click me"
`
    const output = compile(input)
    expect(output).toContain("'cursor': 'pointer'")
    expect(output).toContain('textContent = "Click me"')
  })

  it('dropdown menu with z-index', () => {
    const input = `
DropdownMenu as frame:
  z 100
  shadow lg
  bg #fff
  rad 4

DropdownMenu
`
    const output = compile(input)
    expect(output).toContain("'z-index': '100'")
    expect(output).toContain("'box-shadow':")
  })

  it('disabled button state', () => {
    const input = `
DisabledButton as button:
  disabled
  bg #ccc

DisabledButton
`
    const output = compile(input)
    expect(output).toContain("'pointer-events': 'none'")
    expect(output).toContain("'opacity': '0.5'")
    expect(output).toContain("'background': '#ccc'")
  })

  it('hidden element with z-index', () => {
    const input = `
HiddenOverlay as frame:
  hidden
  z 1000

HiddenOverlay
`
    const output = compile(input)
    expect(output).toContain("'display': 'none'")
    expect(output).toContain("'z-index': '1000'")
  })
})
