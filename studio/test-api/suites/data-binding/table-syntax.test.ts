/**
 * Table-Data Syntax Tests
 *
 * Covers two new compact data-block forms shipped on 2026-05-06:
 *
 *   1. Compact comma rows
 *      features:
 *        icon "home", title "Welcome", desc "..."
 *        icon "eye",  title "Preview", desc "..."
 *
 *   2. Aligned table form
 *      features:
 *        icon  title    desc
 *        home  Welcome  Demo project.
 *        eye   Preview  Live updates.
 *
 * Both produce the same IR shape: a keyed map with positional auto-keys
 * `_0`, `_1`, `_2`, each row a nested object whose keys come from the
 * column headers (or row-side identifiers in the comma form).
 *
 * Also verifies the icon-loop binding fix: `Icon feature.icon` inside an
 * each-loop must resolve `feature.icon` to the closure variable, not to
 * the literal placeholder marker that the runtime sanitizer would drop.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tableSyntaxTests: TestCase[] = describe('Table-Data Syntax', [
  // ===========================================================================
  // COMPACT COMMA FORM — `key value, key value, ...` per row
  // ===========================================================================

  testWithSetup(
    'compact comma form: each-loop renders one card per row',
    `features:
  icon "home",   title "Welcome"
  icon "layers", title "Components"
  icon "eye",    title "Preview"

Frame name Root, gap 8, pad 16, bg #1a1a1a
  each f in $features
    Frame hor, gap 8, pad 8, bg #222, rad 4
      Text f.title, col white`,
    async (api: TestAPI) => {
      const root = api.preview.getRoot()
      api.assert.ok(root !== null, 'Root must exist')

      // Three each-iteration wrappers expected (one per row in the data)
      const preview = document.getElementById('preview')!
      const wrappers = preview.querySelectorAll('[data-each-item]')
      api.assert.ok(wrappers.length === 3, `Expected 3 each-item wrappers, got ${wrappers.length}`)

      // Verify each row's title made it through the loop binding
      const txt = preview.textContent || ''
      for (const expected of ['Welcome', 'Components', 'Preview']) {
        api.assert.ok(txt.includes(expected), `Missing rendered title "${expected}"`)
      }
    }
  ),

  testWithSetup(
    'compact comma form: bare-identifier values (no quotes) work',
    `features:
  icon home,   title "Welcome"
  icon layers, title "Components"

Frame gap 8
  each f in $features
    Text f.icon, col white`,
    async (api: TestAPI) => {
      // `home` and `layers` must show up as text (string values) — they should
      // not silently drop because they're unquoted.
      const txt = document.getElementById('preview')!.textContent || ''
      api.assert.ok(txt.includes('home'), `Bare-id value "home" missing in render`)
      api.assert.ok(txt.includes('layers'), `Bare-id value "layers" missing in render`)
    }
  ),

  testWithSetup(
    'compact comma form: count aggregation reflects row count',
    `items:
  name "A"
  name "B"
  name "C"
  name "D"

Frame
  Text "Total: $items.count", col white`,
    async (api: TestAPI) => {
      const txt = document.getElementById('preview')!.textContent || ''
      api.assert.ok(
        txt.includes('Total: 4') || txt.includes('4'),
        `Expected count of 4 anonymous rows, got: "${txt.slice(0, 80)}"`
      )
    }
  ),

  // ===========================================================================
  // ALIGNED TABLE FORM — header line + sliced rows
  // ===========================================================================

  testWithSetup(
    'table form: header + rows produce iterable collection',
    `features:
  icon    title          desc
  home    Welcome        Demo project.
  layers  Components     Reusable building blocks.
  eye     Preview        Live updates.

Frame gap 8
  each f in $features
    Frame hor, gap 8
      Text f.title, col white
      Text f.desc, col #888`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const wrappers = preview.querySelectorAll('[data-each-item]')
      api.assert.ok(wrappers.length === 3, `Expected 3 each-item wrappers, got ${wrappers.length}`)

      const txt = preview.textContent || ''
      // Each title must render
      for (const t of ['Welcome', 'Components', 'Preview']) {
        api.assert.ok(txt.includes(t), `Missing title "${t}"`)
      }
      // Each desc must render — including punctuation (catches the lexer-DOT
      // bug where punctuation gets joined with extra spaces).
      api.assert.ok(
        txt.includes('Demo project.'),
        `desc with period missing or mangled — text was: "${txt.slice(0, 200)}"`
      )
      api.assert.ok(
        txt.includes('Reusable building blocks.'),
        `desc with multiple words missing — text was: "${txt.slice(0, 200)}"`
      )
    }
  ),

  testWithSetup(
    'table form: multi-word values land in the right column',
    // The "Live Preview" cell spans two words inside the title column.
    // Source-text slicing must group them under \`title\`, not split into
    // title="Live" + desc="Preview".
    `features:
  icon  title           desc
  eye   Live Preview    Sehr schön.

Frame gap 8
  each f in $features
    Frame hor, gap 8
      Text f.title, col white
      Text "|", col white
      Text f.desc, col white`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const txt = preview.textContent || ''
      // "Live Preview" must appear as one contiguous string, not split.
      api.assert.ok(
        txt.includes('Live Preview'),
        `Multi-word title "Live Preview" missing or split — got: "${txt}"`
      )
      api.assert.ok(txt.includes('Sehr schön'), `desc "Sehr schön" missing — got: "${txt}"`)
      // Negative: the title must NOT be just "Live" (would mean Preview leaked
      // into desc and we'd see "|Preview" or "Preview|Sehr").
      api.assert.ok(
        !/Live\s*\|\s*Preview/.test(txt),
        `"Preview" leaked into desc column — got: "${txt}"`
      )
    }
  ),

  testWithSetup(
    'table form: numeric column coerces to number',
    `items:
  name      qty
  Apples    3
  Pears     12
  Cherries  100

Frame gap 8
  each item in $items
    Text "$item.name x $item.qty", col white`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const txt = preview.textContent || ''
      // Numbers should appear as their integer rendering (no quotes,
      // no extra decimals, no leading "+0").
      api.assert.ok(txt.includes('Apples x 3'), `Got: "${txt}"`)
      api.assert.ok(txt.includes('Pears x 12'), `Got: "${txt}"`)
      api.assert.ok(txt.includes('Cherries x 100'), `Got: "${txt}"`)
    }
  ),

  // ===========================================================================
  // DISAMBIGUATION — old forms must continue to work
  // ===========================================================================

  testWithSetup(
    'regression: old keyed form (home: { ... }) still parses',
    `users:
  alice:
    name: "Alice"
    role: "Developer"
  bob:
    name: "Bob"
    role: "Designer"

Frame gap 8
  each user in $users
    Text user.name, col white`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const wrappers = preview.querySelectorAll('[data-each-item]')
      api.assert.ok(
        wrappers.length === 2,
        `Old keyed form: expected 2 wrappers, got ${wrappers.length}`
      )
      const txt = preview.textContent || ''
      api.assert.ok(txt.includes('Alice') && txt.includes('Bob'), `Got: "${txt}"`)
    }
  ),

  testWithSetup(
    'regression: bare-list form (one identifier per line) still parses as array',
    `colors:
  rot
  gruen
  blau

Frame gap 8
  each c in $colors
    Text c, col white`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const wrappers = preview.querySelectorAll('[data-each-item]')
      api.assert.ok(wrappers.length === 3, `Bare-list: expected 3 wrappers, got ${wrappers.length}`)
      const txt = preview.textContent || ''
      for (const c of ['rot', 'gruen', 'blau']) {
        api.assert.ok(txt.includes(c), `Bare-list color "${c}" missing — got: "${txt}"`)
      }
    }
  ),

  // ===========================================================================
  // ICON-LOOP FIX — Icon feature.icon inside each must bind to closure var
  // ===========================================================================

  testWithSetup(
    'icon-loop: Icon feature.icon resolves to per-row icon name',
    // Before the fix, the compiler emitted
    //   _runtime.loadIcon(el, '__loopVar:feature.icon')
    // which the runtime sanitizer rejected (placeholder marker pattern).
    // After the fix, every Icon element in the loop should carry its own
    // icon-* dataset and a textContent matching its row's icon name.
    `features:
  icon    title
  home    Welcome
  layers  Components
  eye     Preview

Frame gap 8
  each f in $features
    Icon f.icon, ic #2271C1, is 20`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const icons = Array.from(preview.querySelectorAll('[data-mirror-name="Icon"]'))
      api.assert.ok(icons.length === 3, `Expected 3 icon elements, got ${icons.length}`)

      const expectedNames = ['home', 'layers', 'eye']
      for (let i = 0; i < icons.length; i++) {
        const el = icons[i] as HTMLElement
        // Each icon element must have iconSize/iconColor data attrs set —
        // proves emitIconSetup ran for each loop child (not skipped due to
        // a __loopVar marker mismatch).
        api.assert.ok(
          el.dataset.iconSize === '20',
          `Icon ${i}: dataset.iconSize='${el.dataset.iconSize}', expected '20'`
        )
        api.assert.ok(
          (el.dataset.iconColor || '').toLowerCase().includes('2271c1') ||
            el.dataset.iconColor === 'rgb(34, 113, 193)',
          `Icon ${i}: dataset.iconColor='${el.dataset.iconColor}'`
        )
        // textContent is set from the bound name BEFORE the SVG fetch lands.
        // It must match the row's icon — NOT the literal "__loopVar:f.icon".
        const text = (el.textContent || '').trim()
        api.assert.ok(
          text === expectedNames[i] || text === '',
          `Icon ${i}: textContent='${text}', expected '${expectedNames[i]}' or empty (after SVG injection)`
        )
        api.assert.ok(
          !text.includes('__loopVar'),
          `Icon ${i}: still contains placeholder marker — fix did not take`
        )
      }
    }
  ),

  testWithSetup(
    'icon-loop: bound color from data per row',
    // Variant where the icon COLOR also comes from the row, exercising
    // emitIconLoading's resolveContentValue path on `ic`.
    `features:
  icon    accent
  home    #2271C1
  layers  #ef4444

Frame gap 8
  each f in $features
    Icon f.icon, ic f.accent, is 24`,
    async (api: TestAPI) => {
      const preview = document.getElementById('preview')!
      const icons = Array.from(
        preview.querySelectorAll('[data-mirror-name="Icon"]')
      ) as HTMLElement[]
      api.assert.ok(icons.length === 2, `Expected 2 icons, got ${icons.length}`)

      const c0 = (icons[0].dataset.iconColor || '').toLowerCase()
      const c1 = (icons[1].dataset.iconColor || '').toLowerCase()
      api.assert.ok(
        c0.includes('2271c1') || c0 === 'rgb(34, 113, 193)',
        `Row 0 color: '${c0}' (want #2271C1)`
      )
      api.assert.ok(
        c1.includes('ef4444') || c1 === 'rgb(239, 68, 68)',
        `Row 1 color: '${c1}' (want #ef4444)`
      )
    }
  ),
])
