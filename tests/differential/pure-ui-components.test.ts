/**
 * Pure UI Components — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/pure-ui-components-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'PUC1: Checkbox', src: `Checkbox "Newsletter"` },
  { name: 'PUC1: Checkbox checked', src: `Checkbox "X", checked` },
  { name: 'PUC2: Switch', src: `Switch "Dark Mode"` },
  { name: 'PUC2: Switch checked', src: `Switch "X", checked` },
  { name: 'PUC3: Slider', src: `Slider value 50, min 0, max 100, step 10` },
  {
    name: 'PUC4: RadioGroup',
    src: `RadioGroup value "a"\n  RadioItem "A", value "a"\n  RadioItem "B", value "b"`,
  },
  {
    name: 'PUC5: Dialog',
    src: `Dialog\n  Trigger: Button "Open"\n  Backdrop: bg rgba(0,0,0,0.5)\n  Content: Frame\n    Text "Body"`,
  },
  {
    name: 'PUC6: Tooltip',
    src: `Tooltip\n  Trigger: Text "T"\n  Content: Text "Help"`,
  },
  {
    name: 'PUC7: Tabs',
    src: `Tabs\n  Tab "Home"\n    Text "H"\n  Tab "About"\n    Text "A"`,
  },
  {
    name: 'PUC8: Select',
    src: `Select\n  Trigger\n    Text "T"\n  Content\n    Item "A"\n    Item "B"`,
  },
]

describe('Pure UI Components — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Pure UI Components — DOM emits expected attributes', () => {
  it('Checkbox checked → checked attribute present', () => {
    const dom = generateDOM(parse(`Checkbox "X", checked`))
    expect(dom).toMatch(/checked/)
  })

  it('Slider value/min/max emit as attributes in DOM', () => {
    const dom = generateDOM(parse(`Slider value 50, min 0, max 100`))
    expect(dom).toContain('"50"')
    expect(dom).toContain('"100"')
  })

  it('RadioGroup value attribute is set in DOM', () => {
    const dom = generateDOM(parse(`RadioGroup value "a"\n  RadioItem "A", value "a"`))
    expect(dom).toMatch(/value/)
  })

  it('Dialog emits Trigger + Backdrop + Content slots in DOM', () => {
    const dom = generateDOM(
      parse(
        `Dialog\n  Trigger: Button "Open"\n  Backdrop: bg #000\n  Content: Frame\n    Text "Body"`
      )
    )
    expect(dom).toContain('Trigger')
    expect(dom).toContain('Backdrop')
    expect(dom).toContain('Content')
  })

  it('Tooltip emits Trigger + Content slots in DOM', () => {
    const dom = generateDOM(parse(`Tooltip\n  Trigger: Text "T"\n  Content: Text "Help"`))
    expect(dom).toContain('Trigger')
    expect(dom).toContain('Content')
  })

  it('Select emits Trigger + Content + Item in DOM', () => {
    const dom = generateDOM(parse(`Select\n  Trigger\n    Text "T"\n  Content\n    Item "A"`))
    expect(dom).toContain('Trigger')
    expect(dom).toContain('Content')
    expect(dom).toContain('Item')
  })
})

describe('Pure UI Components — known limitations (pinned)', () => {
  // Bug #32 + #33: keyword args are parsed but not surfaced as DOM attributes.
  it('Bug #32: Tooltip `positioning` accepts but does not emit attribute', () => {
    const dom = generateDOM(
      parse(`Tooltip positioning "bottom"\n  Trigger: Text "T"\n  Content: Text "X"`)
    )
    // Compiles — but `positioning="bottom"` does not appear in setAttribute
    // calls (this is the known limitation pinned by tests/behavior).
    expect(dom).not.toContain('positioning="bottom"')
  })

  it('Bug #33: Tabs `defaultValue` accepts but does not emit attribute', () => {
    const dom = generateDOM(parse(`Tabs defaultValue "home"\n  Tab "Home"\n    Text "H"`))
    expect(dom).not.toContain('defaultValue="home"')
  })
})
