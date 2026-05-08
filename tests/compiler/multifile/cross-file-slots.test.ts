/**
 * Cross-file validator — slot-scoped component references.
 *
 * When a component definition declares slot-style children (`Card: ...;
 * Title: col white; Body: pad 16`), use-sites can reference those slots
 * by name (`Card; Title "..."; Body "..."`). The slots aren't globally
 * defined components — they're scoped to the parent's body.
 *
 * Pre-fix the cross-file walker treated every Instance as a global
 * component reference, producing a wall of "undefined-component"
 * warnings on every slot use. Post-fix the walker descends with a
 * scope-stack that includes the current component's slots.
 */

import { describe, it, expect } from 'vitest'
import { validateProject } from '../../../compiler/loader/cross-file-validator'

describe('cross-file validator — slot scoping', () => {
  it('recognises slot names referenced inside an instance of the parent', () => {
    const errs = validateProject([
      {
        filename: 'components.mirror',
        content: `Card: bg #1a1a1a, pad 16, gap 8
  Title: col white, fs 16, weight 500
  Body: col #888, fs 14
`,
      },
      {
        filename: 'app.mirror',
        content: `canvas mobile
Card
  Title "Welcome"
  Body "This is a card"
`,
      },
    ])
    expect(errs.filter(e => e.code === 'undefined-component')).toEqual([])
  })

  it('still flags genuinely undefined refs (not slots, not components, not built-ins)', () => {
    const errs = validateProject([
      {
        filename: 'components.mirror',
        content: `Card: bg #1a1a1a, pad 16
  Title: col white
`,
      },
      {
        filename: 'app.mirror',
        content: `canvas mobile
Card
  Title "Welcome"
  NotAThing
`,
      },
    ])
    expect(
      errs.some(e => e.code === 'undefined-component' && e.message.includes('NotAThing'))
    ).toBe(true)
    expect(errs.some(e => e.code === 'undefined-component' && e.message.includes('Title'))).toBe(
      false
    )
  })

  it('slot scope nests — Card slot inside Section is still valid', () => {
    const errs = validateProject([
      {
        filename: 'components.mirror',
        content: `Section: pad 24, gap 12
  Card: bg #1a1a1a
    Title: col white
`,
      },
      {
        filename: 'app.mirror',
        content: `canvas mobile
Section
  Card
    Title "Hello"
`,
      },
    ])
    expect(errs.filter(e => e.code === 'undefined-component')).toEqual([])
  })

  it('slot from one parent does NOT leak to siblings of an unrelated component', () => {
    // Use a non-builtin slot name (`Headline`, `Spec`) so the SLOT_ALIASES
    // prelude doesn't accidentally cover them.
    const errs = validateProject([
      {
        filename: 'components.mirror',
        content: `Card: bg #1a1a1a
  Headline: col white
  Spec: col #888

Other: pad 8
`,
      },
      {
        filename: 'app.mirror',
        content: `canvas mobile
Other
  Headline "Should fail — Headline is Card's slot, not Other's"
`,
      },
    ])
    expect(errs.some(e => e.code === 'undefined-component' && e.message.includes('Headline'))).toBe(
      true
    )
  })
})
