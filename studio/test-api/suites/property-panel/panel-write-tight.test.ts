/**
 * Panel WRITE-side: byte-exact code assertions for the dominant
 * failure modes.
 *
 * The existing comprehensive / property-robustness suites use
 * `code.includes(...)` after setProperty. That's lax in three ways:
 *
 *   - Duplicate: `Frame bg #333, bg #ef4444` includes both — passes.
 *   - Wrong line: edit lands on a sibling — `code.includes` still
 *     finds the new value somewhere — passes.
 *   - Old value retained: `Frame bg #333, bg #ef4444` includes
 *     `#ef4444` — passes even though the modifier failed to replace.
 *
 * This suite asserts the *whole-file source* against the exact
 * expected string. Any of those failure modes will fail an assertion
 * loud and clear.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const panelWriteTightTests: TestCase[] = describe('Panel WRITE: byte-exact', [
  testWithSetup(
    'setProperty replaces existing value (no duplicate)',
    `Frame w 100, h 80, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '#ef4444')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame w 100, h 80, bg #ef4444`
      api.assert.ok(
        code === expected,
        `WRITE must replace bg in place. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'setProperty on selected sibling lands on the right line only',
    `Frame gap 8
  Button "A", bg #2271C1
  Button "B", bg #ef4444`,
    async (api: TestAPI) => {
      // Select the second Button (line 3, node-3).
      await api.interact.click('node-3')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '#10b981')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame gap 8
  Button "A", bg #2271C1
  Button "B", bg #10b981`
      api.assert.ok(
        code === expected,
        `WRITE must touch only line 3 (selected sibling). Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'setProperty on a missing prop appends to the line',
    `Frame w 100, h 80`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '#2271C1')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame w 100, h 80, bg #2271C1`
      api.assert.ok(
        code === expected,
        `Missing prop must append, not duplicate. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Numeric setProperty replaces the value, not the unit-less number',
    `Frame w 100, h 80, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('w', '250')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame w 250, h 80, bg #333`
      api.assert.ok(
        code === expected,
        `Numeric WRITE must replace, not duplicate. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Two sequential setProperty calls compose without losing the first',
    `Frame w 100, h 80, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#ef4444')
      await api.utils.delay(200)
      await api.panel.property.setProperty('w', '300')
      await api.utils.delay(400)

      const code = api.editor.getCode()
      const expected = `Frame w 300, h 80, bg #ef4444`
      api.assert.ok(
        code === expected,
        `Sequential edits must compose. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'setProperty preserves quoted text content on the line',
    `Frame
  Button "Click me", bg #333, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '#2271C1')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame
  Button "Click me", bg #333, col white`.replace('#333', '#2271C1')
      api.assert.ok(
        code === expected,
        `Quoted text must survive. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  // ---------- Edge-case coverage ----------

  testWithSetup(
    'setProperty with token-ref ($primary) writes ref, not resolved value',
    `primary.bg: #2271C1

Frame w 100, h 80, bg #333`,
    async (api: TestAPI) => {
      // Frame is line 3, node-1.
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '$primary')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      // The literal $primary must end up in source — NOT the resolved
      // hex value (#2271C1). Otherwise design tokens lose their point.
      const expected = `primary.bg: #2271C1

Frame w 100, h 80, bg $primary`
      api.assert.ok(
        code === expected,
        `Token-ref must be written verbatim. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'removeProperty drops the property (clean comma cleanup)',
    `Frame w 100, h 80, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.removeProperty('bg')
      api.assert.ok(ok, 'removeProperty must succeed')

      const code = api.editor.getCode()
      const expected = `Frame w 100, h 80`
      api.assert.ok(
        code === expected,
        `Remove must yield clean line. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'setProperty on long-form alias keeps the source name (width stays width)',
    `Frame width 200, height 100, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('w', '300')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      // The author wrote `width 200` long-form. The modifier must
      // preserve THAT alias — rewriting to `w 300` would surprise the
      // user. Either form is technically valid, but flipping aliases
      // mid-edit is a UX bug.
      const expected = `Frame width 300, height 100, bg #333`
      api.assert.ok(
        code === expected,
        `Long-form alias must survive. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Setting prop on parent does not bleed onto children',
    `Frame pad 16
  Button "A", bg #333
  Button "B", bg #333`,
    async (api: TestAPI) => {
      // Select the Frame parent.
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const ok = await api.panel.property.setProperty('bg', '#1a1a1a')
      api.assert.ok(ok, 'setProperty must succeed')

      const code = api.editor.getCode()
      // Frame's bg must be ADDED (it didn't exist) and the children's
      // bg #333 must remain untouched. A regex-based modifier without
      // line-scope would smear changes onto siblings.
      const expected = `Frame pad 16, bg #1a1a1a
  Button "A", bg #333
  Button "B", bg #333`
      api.assert.ok(
        code === expected,
        `Parent edit must not modify children. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),
])
