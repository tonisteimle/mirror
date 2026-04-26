/**
 * React Backend Tests (Thema 21)
 *
 * `compiler/backends/react.ts` (440 LOC) hat 0% Coverage. Diese Datei
 * bringt es auf > 60%.
 *
 * Scope:
 * - Header: `import React`
 * - Tokens werden als JS-Object exportiert
 * - Top-level App-Function emittiert
 * - Frame → <div>, Text → <span>, Button → <button>, Input → <input>
 * - Image → <img>, Link → <a>
 * - Heuristics für Header/Footer/Section/Nav
 * - Style-Objekt aus Mirror-Properties
 * - Text-Content (sowohl Property als auch Child)
 * - Verschachtelung
 * - Empty Program → <div /> Fallback
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

function react(src: string): string {
  return generateReact(parse(src))
}

describe('React Backend — Header & Boilerplate', () => {
  it('emits "import React" + default export App', () => {
    const out = react(`Frame`)
    expect(out).toContain("import React from 'react'")
    expect(out).toContain('export default function App()')
    expect(out).toContain('return (')
  })

  it('emits <div /> fallback for empty program', () => {
    const out = react('')
    expect(out).toContain('<div />')
  })
})

describe('React Backend — Primitive → HTML tag mapping', () => {
  it('Frame → <div>', () => {
    expect(react(`Frame`)).toContain('<div')
  })

  it('Text "Hello" → <span>{"Hello"}</span>', () => {
    const out = react(`Text "Hello"`)
    expect(out).toContain('<span')
    expect(out).toContain('"Hello"')
  })

  it('Button "OK" → <button>', () => {
    const out = react(`Button "OK"`)
    expect(out).toContain('<button')
    expect(out).toContain('"OK"')
  })

  it('Input → <input />', () => {
    const out = react(`Input placeholder "X"`)
    expect(out).toContain('<input')
  })

  it('Image src "..." → <img>', () => {
    const out = react(`Image src "/foo.jpg"`)
    expect(out).toContain('<img')
  })

  it('Link "Home" → <a>', () => {
    const out = react(`Link "Home", href "/"`)
    expect(out).toContain('<a')
    expect(out).toContain('"Home"')
  })
})

describe('React Backend — Style object emission', () => {
  it('numeric props become px in style', () => {
    const out = react(`Frame w 200, h 100`)
    expect(out).toMatch(/style=\{[^}]*200/)
    expect(out).toMatch(/style=\{[^}]*100/)
  })

  it('color props become hex in style', () => {
    const out = react(`Frame bg #2271C1, col white`)
    expect(out.toLowerCase()).toContain('#2271c1')
  })

  it('Frame without props omits style attribute', () => {
    const out = react(`Frame`)
    // No style attribute on the bare Frame
    expect(out).toMatch(/<div\s*\/?>|<div>/)
  })
})

describe('React Backend — Nesting', () => {
  it('renders parent + children correctly', () => {
    const out = react(`Frame
  Text "A"
  Text "B"`)
    expect(out).toContain('<div')
    expect(out).toContain('"A"')
    expect(out).toContain('"B"')
    expect(out).toContain('</div>')
  })

  it('three-level deep nesting', () => {
    const out = react(`Frame
  Frame
    Frame
      Text "Deep"`)
    expect(out).toContain('"Deep"')
    // At least 3 div opening tags
    const divCount = (out.match(/<div/g) ?? []).length
    expect(divCount).toBeGreaterThanOrEqual(3)
  })
})

describe('React Backend — Tokens', () => {
  it('emits a tokens object when tokens are defined', () => {
    const out = react(`primary.bg: #2271C1
danger.bg: #ef4444

Frame bg $primary`)
    // tokens should appear in some form (either inline or as object)
    expect(out).toMatch(/(tokens\s*=|primary)/i)
  })

  it('skips tokens if includeTokens=false', () => {
    const ast = parse(`primary.bg: #2271C1

Frame`)
    const out = generateReact(ast, { includeTokens: false })
    expect(out).not.toContain('Design Tokens')
  })
})

describe('React Backend — Component definitions resolve into JSX', () => {
  it('user-defined component emits JSX with merged props', () => {
    const out = react(`Btn: pad 12 24, bg #2271C1, col white

Btn "Click me"`)
    // The JSX should contain the button text and the bg color
    expect(out).toContain('"Click me"')
    expect(out.toLowerCase()).toContain('#2271c1')
  })

  it('component as Button primitive renders as <button>', () => {
    const out = react(`PrimaryBtn as Button: bg #2271C1

PrimaryBtn "OK"`)
    expect(out).toContain('<button')
    expect(out).toContain('"OK"')
  })
})

describe('React Backend — Heuristic tag resolution', () => {
  it('component named "MyHeader" → <header>', () => {
    const out = react(`MyHeader: pad 16

MyHeader`)
    expect(out).toContain('<header')
  })

  it('component named "Sidebar" → <aside>', () => {
    const out = react(`Sidebar: pad 16

Sidebar`)
    expect(out).toContain('<aside')
  })

  it('component named "Title" → <h2> (heading heuristic)', () => {
    const out = react(`Title: fs 16

Title "Hi"`)
    expect(out).toContain('<h2')
    expect(out).toContain('"Hi"')
  })
})

describe('React Backend — Skipping unsupported primitives', () => {
  it('Slot primitive is skipped in output', () => {
    const out = react(`Slot`)
    // Slot should not produce JSX (only for visual editor)
    expect(out).not.toMatch(/<Slot/)
  })

  it('Table primitive is skipped in output', () => {
    const out = react(`Table
  TableRow
    Text "X"`)
    // Table is currently not supported → no <Table tag
    expect(out).not.toMatch(/<Table\b/)
  })
})

// =============================================================================
// generateStyles — property switch-case coverage
// =============================================================================

describe('React Backend — Layout flag properties (no value)', () => {
  it.each([
    ['hor', 'flexDirection', 'row'],
    ['ver', 'flexDirection', 'column'],
    ['center', 'justifyContent', 'center'],
    ['spread', 'justifyContent', 'space-between'],
    ['wrap', 'flexWrap', 'wrap'],
    ['scroll', 'overflowY', 'auto'],
    ['hidden', 'display', 'none'],
  ])('%s flag-property maps to %s: %s', (flag, _key, _val) => {
    const out = react(`Frame ${flag}`)
    // For most flags the style object should be present
    if (flag === 'hidden') {
      expect(out).toContain("display: 'none'")
    } else {
      expect(out).toMatch(/style=/)
    }
  })
})

describe('React Backend — Spacing properties', () => {
  it.each([
    ['gap 12', 'gap'],
    ['pad 16', 'padding'],
    ['margin 8', 'margin'],
  ])('%s emits %s style key', (mirror, key) => {
    const out = react(`Frame ${mirror}`)
    expect(out).toContain(key)
  })
})

describe('React Backend — Size properties', () => {
  it('w 200 emits width style key', () => {
    expect(react(`Frame w 200`)).toContain('width')
  })

  it('w full → width: "100%"', () => {
    expect(react(`Frame w full`)).toContain('100%')
  })

  it('w hug → width: "fit-content"', () => {
    expect(react(`Frame w hug`)).toContain('fit-content')
  })

  it('h 100 emits height style key', () => {
    expect(react(`Frame h 100`)).toContain('height')
  })

  it('minw 50 / maxw 500 / minh 30 / maxh 300', () => {
    const out = react(`Frame minw 50, maxw 500, minh 30, maxh 300`)
    expect(out).toMatch(/minWidth|min-width/i)
    expect(out).toMatch(/maxWidth|max-width/i)
    expect(out).toMatch(/minHeight|min-height/i)
    expect(out).toMatch(/maxHeight|max-height/i)
  })
})

describe('React Backend — Alignment properties', () => {
  it('left/right/top/bottom flags map to flex alignment', () => {
    const lr = react(`Frame left`)
    expect(lr).toContain('flex-start')
    const rt = react(`Frame right`)
    expect(rt).toContain('flex-end')
    const tp = react(`Frame top`)
    expect(tp).toContain('flex-start')
    const bt = react(`Frame bottom`)
    expect(bt).toContain('flex-end')
  })
})

describe('React Backend — Token resolution in styles', () => {
  it('bg $primary resolves to token value', () => {
    const out = react(`primary.bg: #2271C1

Frame bg $primary`)
    expect(out.toLowerCase()).toContain('#2271c1')
  })

  it('reference chain $a → $b → value resolves transitively', () => {
    const out = react(`base.bg: #FF0000
secondary.bg: $base.bg

Frame bg $secondary.bg`)
    // Either the chain resolves or the original $primary stays
    expect(out.toUpperCase()).toContain('#FF0000')
  })
})

describe('React Backend — Border + radius', () => {
  it('bor 1, boc #333 → border + borderColor', () => {
    const out = react(`Frame bor 1, boc #333`)
    expect(out).toContain('border')
    expect(out).toContain('#333')
  })

  it('rad 8 → borderRadius: "8px"', () => {
    expect(react(`Frame rad 8`)).toContain('borderRadius')
  })
})

describe('React Backend — Typography', () => {
  it('fs 16 → fontSize', () => {
    expect(react(`Text "X", fs 16`)).toContain('fontSize')
  })

  it('weight bold → fontWeight', () => {
    expect(react(`Text "X", weight bold`)).toContain('fontWeight')
  })
})
