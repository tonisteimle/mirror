/**
 * HTML Primitives E2E Tests
 *
 * Tests the full compilation pipeline for HTML primitive components:
 * - Image
 * - Input
 * - Textarea
 * - Link
 * - Button
 * - Icon
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
// BUTTON
// ============================================

describe('E2E: Button Primitive', () => {
  it('generates button element', () => {
    const input = `
Btn as button:

Btn "Click me"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('button')")
    expect(output).toContain('textContent = "Click me"')
  })

  it('button with styles', () => {
    const input = `
Button as button:
  pad 12 24
  bg #3B82F6
  col white
  rad 6

Button "Submit"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('button')")
    expect(output).toContain("'padding': '12px 24px'")
    expect(output).toContain("'background': '#3B82F6'")
    expect(output).toContain("'color': 'white'")
    expect(output).toContain("'border-radius': '6px'")
  })

  it('button with hover state', () => {
    const input = `
Button as button:
  bg #3B82F6
  hover:
    bg #2563EB

Button "Hover me"
`
    const output = compile(input)
    expect(output).toContain(':hover')
    expect(output).toContain('#2563EB')
  })

  it('button with click event', () => {
    const input = `
Button as button:
  onclick submit

Button "Submit"
`
    const output = compile(input)
    expect(output).toContain("addEventListener('click'")
  })
})

// ============================================
// INPUT
// ============================================

describe('E2E: Input Primitive', () => {
  it('generates input element', () => {
    const input = `
TextField as input:

TextField
`
    const output = compile(input)
    expect(output).toContain("document.createElement('input')")
  })

  it('input with styles', () => {
    const input = `
Input as input:
  pad 8 12
  bg #1a1a23
  bor 1 #333
  rad 4

Input "Search..."
`
    const output = compile(input)
    expect(output).toContain("'padding': '8px 12px'")
    expect(output).toContain("'background': '#1a1a23'")
    expect(output).toContain("'border-radius': '4px'")
  })

  it('input with focus state', () => {
    const input = `
Input as input:
  bor 1 #333
  focus:
    bor 1 #3B82F6

Input "Email"
`
    const output = compile(input)
    expect(output).toContain(':focus')
    expect(output).toContain('#3B82F6')
  })

  it('input with onchange event', () => {
    const input = `
Search as input:
  onchange filter

Search "Search"
`
    const output = compile(input)
    expect(output).toContain("addEventListener('change'")
  })

  it('input with oninput event', () => {
    const input = `
LiveSearch as input:
  oninput filter

LiveSearch "Search"
`
    const output = compile(input)
    expect(output).toContain("addEventListener('input'")
  })
})

// ============================================
// TEXTAREA
// ============================================

describe('E2E: Textarea Primitive', () => {
  it('generates textarea element', () => {
    const input = `
TextArea as textarea:

TextArea
`
    const output = compile(input)
    expect(output).toContain("document.createElement('textarea')")
  })

  it('textarea with dimensions', () => {
    const input = `
Message as textarea:
  width 300
  height 150
  pad 12

Message "Your message..."
`
    const output = compile(input)
    expect(output).toContain("'width': '300px'")
    expect(output).toContain("'height': '150px'")
    expect(output).toContain("'padding': '12px'")
  })
})

// ============================================
// IMAGE
// Note: Image src handling via string might not be fully implemented
// ============================================

describe('E2E: Image Primitive', () => {
  it('image with dimensions', () => {
    // Note: Using MyAvatar instead of Avatar because Avatar is a Zag primitive
    const input = `
MyAvatar as image:
  width 48
  height 48
  rad 24

MyAvatar "https://example.com/avatar.png"
`
    const output = compile(input)
    expect(output).toContain("'width': '48px'")
    expect(output).toContain("'height': '48px'")
    expect(output).toContain("'border-radius': '24px'")
  })

  it('image with clip for circular', () => {
    const input = `
CircleAvatar as image:
  width 64
  height 64
  rad 32
  clip

CircleAvatar "https://example.com/user.jpg"
`
    const output = compile(input)
    expect(output).toContain("'overflow': 'hidden'")
    expect(output).toContain("'border-radius': '32px'")
  })
})

// ============================================
// LINK
// ============================================

describe('E2E: Link Primitive', () => {
  it('generates anchor element', () => {
    const input = `
Link as link:

Link "Click here"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('a')")
    expect(output).toContain('textContent = "Click here"')
  })

  it('link with href property', () => {
    const input = `
NavLink as link:
  href "/about"

NavLink "About"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('a')")
    expect(output).toContain('href')
    expect(output).toContain('/about')
  })

  it('link with styles', () => {
    const input = `
StyledLink as link:
  col #3B82F6
  underline

StyledLink "Learn more"
`
    const output = compile(input)
    expect(output).toContain("'color': '#3B82F6'")
    expect(output).toContain("'text-decoration': 'underline'")
  })
})

// ============================================
// ICON
// Icons are loaded from Lucide CDN at runtime
// ============================================

describe('E2E: Icon Primitive', () => {
  it('generates icon span element with loadIcon call', () => {
    const input = `
Icon as icon:

Icon "home"
`
    const output = compile(input)
    // Icons render as spans
    expect(output).toContain("document.createElement('span')")
    // Should call loadIcon runtime helper
    expect(output).toContain('_runtime.loadIcon')
    expect(output).toContain('"home"')
  })

  it('icon with size', () => {
    const input = `
LargeIcon as icon:
  icon-size 24

LargeIcon "settings"
`
    const output = compile(input)
    expect(output).toContain('data-icon-size')
    expect(output).toContain('24')
    expect(output).toContain('_runtime.loadIcon')
  })

  it('icon with color', () => {
    const input = `
ColorIcon as icon:
  icon-color #3B82F6

ColorIcon "star"
`
    const output = compile(input)
    expect(output).toContain('data-icon-color')
    expect(output).toContain('#3B82F6')
  })

  it('icon with shorthand properties', () => {
    const input = `
MyIcon as icon:
  is 32
  ic #EF4444
  iw 3

MyIcon "alert-circle"
`
    const output = compile(input)
    expect(output).toContain('data-icon-size')
    expect(output).toContain('32')
    expect(output).toContain('data-icon-color')
    expect(output).toContain('#EF4444')
    expect(output).toContain('data-icon-weight')
    expect(output).toContain('3')
  })

  it('runtime includes loadIcon helper', () => {
    const input = `
Icon as icon:

Icon "home"
`
    const output = compile(input)
    // Check that the runtime includes the loadIcon function
    expect(output).toContain('async loadIcon(el, iconName)')
    expect(output).toContain('unpkg.com/lucide-static')
  })
})

// ============================================
// TEXT PRIMITIVE
// ============================================

describe('E2E: Text Primitive', () => {
  it('generates span element', () => {
    const input = `
Label as text:

Label "Hello World"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('span')")
    expect(output).toContain('textContent = "Hello World"')
  })

  it('text with styles', () => {
    const input = `
Title as text:
  font-size 24
  weight 700
  col #fff

Title "Page Title"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('span')")
    expect(output).toContain("'font-size': '24px'")
    expect(output).toContain("'font-weight': '700'")
    expect(output).toContain("'color': '#fff'")
  })
})

// ============================================
// FRAME PRIMITIVE
// ============================================

describe('E2E: Frame Primitive', () => {
  it('generates div element', () => {
    const input = `
Card as frame:
  pad 16

Card
`
    const output = compile(input)
    expect(output).toContain("document.createElement('div')")
    expect(output).toContain("'padding': '16px'")
  })

  it('frame has flex layout by default', () => {
    const input = `
Container as frame:

Container
`
    const output = compile(input)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'column'")
  })

  it('frame with horizontal layout', () => {
    const input = `
Row as frame:
  horizontal

Row
`
    const output = compile(input)
    expect(output).toContain("'flex-direction': 'row'")
  })

  it('frame with children', () => {
    const input = `
Item as text:

List as frame:
  gap 8

List
  - Item "First"
  - Item "Second"
  - Item "Third"
`
    const output = compile(input)
    expect(output).toContain("'gap': '8px'")
    expect(output).toContain('textContent = "First"')
    expect(output).toContain('textContent = "Second"')
    expect(output).toContain('textContent = "Third"')
  })
})

// ============================================
// COMBINATIONS AND REAL WORLD PATTERNS
// ============================================

describe('E2E: Primitives in Real World Patterns', () => {
  it('login form', () => {
    const input = `
Input as input:
  pad 8 12
  bor 1 #333

Button as button:
  pad 12 24
  bg #3B82F6

Form as frame:
  gap 16
  pad 20

Form
  Input "Email"
  Input "Password"
  Button "Login"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('input')")
    expect(output).toContain("document.createElement('button')")
    expect(output).toContain('textContent = "Login"')
    expect(output).toContain("'gap': '16px'")
  })

  it('navigation menu', () => {
    const input = `
NavLink as link:
  pad 8 16
  col #888

Nav as frame:
  horizontal
  gap 8

Nav
  NavLink "Home"
  NavLink "About"
  NavLink "Contact"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('a')")
    expect(output).toContain("'flex-direction': 'row'")
    expect(output).toContain('textContent = "Home"')
  })

  it('user profile card', () => {
    const input = `
Avatar as image:
  width 64
  height 64
  rad 32

Name as text:
  font-size 18
  weight 600

Bio as text:
  font-size 14
  col #666

Card as frame:
  pad 20
  gap 12
  bg #fff
  rad 8
  shadow md

Card
  Avatar "https://example.com/user.jpg"
  Name "John Doe"
  Bio "Software developer"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('img')")
    expect(output).toContain("document.createElement('span')")
    expect(output).toContain("document.createElement('div')")
    expect(output).toContain('textContent = "John Doe"')
    expect(output).toContain('textContent = "Software developer"')
  })

  it('search input with button', () => {
    const input = `
SearchInput as input:
  pad 8 12
  bg #1a1a23
  bor 1 #333

SearchBtn as button:
  pad 8 16
  bg #3B82F6

SearchBar as frame:
  horizontal
  gap 8

SearchBar
  SearchInput "Search..."
  SearchBtn "Go"
`
    const output = compile(input)
    expect(output).toContain("document.createElement('input')")
    expect(output).toContain("document.createElement('button')")
    expect(output).toContain("'flex-direction': 'row'")
  })
})

// ============================================
// PRIMITIVE ELEMENT MAPPING
// ============================================

describe('E2E: Primitive to HTML Element Mapping', () => {
  it('frame maps to div', () => {
    const output = compile(`Box as frame:\nBox`)
    expect(output).toContain("document.createElement('div')")
  })

  it('text maps to span', () => {
    const output = compile(`Label as text:\nLabel "Text"`)
    expect(output).toContain("document.createElement('span')")
  })

  it('button maps to button', () => {
    const output = compile(`Btn as button:\nBtn "Click"`)
    expect(output).toContain("document.createElement('button')")
  })

  it('input maps to input', () => {
    const output = compile(`Field as input:\nField`)
    expect(output).toContain("document.createElement('input')")
  })

  it('image maps to img', () => {
    const output = compile(`Img as image:\nImg "url"`)
    expect(output).toContain("document.createElement('img')")
  })

  it('link maps to a', () => {
    const output = compile(`Link as link:\nLink "text"`)
    expect(output).toContain("document.createElement('a')")
  })

  it('textarea maps to textarea', () => {
    const output = compile(`Area as textarea:\nArea`)
    expect(output).toContain("document.createElement('textarea')")
  })
})
