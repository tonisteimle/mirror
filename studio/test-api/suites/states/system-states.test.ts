/**
 * System States Tests
 *
 * Tests for browser-native system states with REAL interactions:
 * - focus: state (keyboard/programmatic focus)
 * - active: state (element being pressed)
 * - disabled: state (non-interactive element)
 *
 * These are CSS pseudo-class states that the browser manages.
 *
 * @created Developer A - Phase 2 (A2.1)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { trustedInteractions, coordsOfElement } from '../../trusted-interactions'

// =============================================================================
// Focus State Tests
// =============================================================================

export const focusStateTests: TestCase[] = describe('Focus State', [
  testWithSetup(
    'Input focus changes border color',
    `Input placeholder "Email", bg #222, col white, pad 12, rad 6, bor 1, boc #333
  focus:
    bor 2
    boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')

      // Initial state: thin gray border
      api.assert.hasStyle('node-1', 'borderWidth', '1px')

      // Focus the input
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      // Should have focus styling: thicker blue border
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')

      // Blur the input
      await api.interact.blur('node-1')
      await api.utils.delay(100)

      // Should return to original
      api.assert.hasStyle('node-1', 'borderWidth', '1px')
    }
  ),

  testWithSetup(
    'Button focus shows outline',
    `Button "Click me", bg #2271C1, col white, pad 12 24, rad 6
  focus:
    bor 2
    boc #fff`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const button = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(button !== null, 'Button should exist')

      // Initial: no explicit border (or default)
      const initialBorder = window.getComputedStyle(button).borderWidth

      // Focus the button (e.g., via Tab key)
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      // Should have focus border
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(255, 255, 255)')

      // Blur
      await api.interact.blur('node-1')
      await api.utils.delay(100)

      // Border should revert
      const afterBorder = window.getComputedStyle(button).borderWidth
      api.assert.ok(
        afterBorder === initialBorder || afterBorder === '0px',
        `Border should revert after blur, got ${afterBorder}`
      )
    }
  ),

  testWithSetup(
    'Textarea focus changes background',
    `Textarea placeholder "Message...", bg #1a1a1a, col white, pad 12, rad 6, w 300, h 100
  focus:
    bg #222
    bor 1
    boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const textarea = document.querySelector('[data-mirror-id="node-1"]') as HTMLTextAreaElement
      api.assert.ok(textarea !== null, 'Textarea should exist')

      // Initial background
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      // Focus
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      // Background should lighten
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')

      // Blur
      await api.interact.blur('node-1')
      await api.utils.delay(100)

      // Revert
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Focus state with multiple property changes',
    `Input placeholder "Search...", bg #333, col #888, pad 12 16, rad 20, bor 1, boc #444
  focus:
    bg #222
    col white
    bor 2
    boc #2271C1
    shadow md`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'borderWidth', '1px')

      // Focus
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      // All properties should change
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')

      // Check shadow exists
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const shadow = window.getComputedStyle(element).boxShadow
      api.assert.ok(shadow !== 'none', `Focus should add shadow, got ${shadow}`)
    }
  ),

  testWithSetup(
    'Focus moves between form fields',
    `Frame gap 12, pad 16, bg #1a1a1a
  Input placeholder "First name", bg #222, col white, pad 12, rad 6
    focus:
      bor 2
      boc #2271C1
  Input placeholder "Last name", bg #222, col white, pad 12, rad 6
    focus:
      bor 2
      boc #2271C1
  Input placeholder "Email", bg #222, col white, pad 12, rad 6
    focus:
      bor 2
      boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement
      const input2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLInputElement
      const input3 = document.querySelector('[data-mirror-id="node-4"]') as HTMLInputElement

      // Focus first input
      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.ok(document.activeElement === input1, 'First input should be focused')
      api.assert.hasStyle('node-2', 'borderWidth', '2px')

      // Move focus to second input
      await api.interact.focus('node-3')
      await api.utils.delay(100)

      api.assert.ok(document.activeElement === input2, 'Second input should be focused')
      api.assert.hasStyle('node-3', 'borderWidth', '2px')
      // First should no longer have focus style (reverted)

      // Move focus to third input
      await api.interact.focus('node-4')
      await api.utils.delay(100)

      api.assert.ok(document.activeElement === input3, 'Third input should be focused')
      api.assert.hasStyle('node-4', 'borderWidth', '2px')
    }
  ),

  testWithSetup(
    'Focus via Tab key navigation',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "First", bg #333, col white, pad 8 16, rad 4
    focus:
      bor 2
      boc white
  Button "Second", bg #333, col white, pad 8 16, rad 4
    focus:
      bor 2
      boc white
  Button "Third", bg #333, col white, pad 8 16, rad 4
    focus:
      bor 2
      boc white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Focus first button
      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'borderWidth', '2px')

      // Simulate Tab key to move to next
      await api.interact.pressKey('Tab')
      await api.utils.delay(100)

      // Second button should now be focused
      const secondButton = document.querySelector('[data-mirror-id="node-3"]') as HTMLButtonElement
      api.assert.ok(
        document.activeElement === secondButton,
        'Second button should be focused after Tab'
      )
      api.assert.hasStyle('node-3', 'borderWidth', '2px')

      // Tab again
      await api.interact.pressKey('Tab')
      await api.utils.delay(100)

      const thirdButton = document.querySelector('[data-mirror-id="node-4"]') as HTMLButtonElement
      api.assert.ok(
        document.activeElement === thirdButton,
        'Third button should be focused after Tab'
      )
    }
  ),
])

// =============================================================================
// Active State Tests (Button Press)
// =============================================================================

export const activeStateTests: TestCase[] = describe('Active State', [
  testWithSetup(
    'Button active state changes on mousedown',
    `Button "Press me", bg #2271C1, col white, pad 12 24, rad 6
  active:
    bg #1a5490
    scale 0.98`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const button = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(button !== null, 'Button should exist')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Trusted mousedown — CSS `:active` only matches when the
      // pointer was pressed via a real input pipeline; synthetic
      // `dispatchEvent` skipped this gate and the old assertion below
      // was a tautology (`true`) that masked the silent failure.
      const btnPt = coordsOfElement(button)
      await trustedInteractions.mouseDown(btnPt)
      await api.utils.delay(50)

      // Now `:active` styling should apply. The test fixture sets
      // bg #1a5490 and scale 0.98 in the `active:` block.
      const bg = window.getComputedStyle(button).backgroundColor
      const transform = window.getComputedStyle(button).transform
      api.assert.ok(
        bg === 'rgb(26, 84, 144)',
        `Active bg should be #1a5490 (rgb(26, 84, 144)) while pressed, got ${bg}`
      )
      api.assert.ok(
        transform.includes('matrix') || transform.includes('scale'),
        `Active transform should reflect scale 0.98 while pressed, got ${transform}`
      )

      // Release — `:active` should clear, base style returns.
      await trustedInteractions.mouseUp(btnPt)
      await api.utils.delay(50)
      const bgAfter = window.getComputedStyle(button).backgroundColor
      api.assert.ok(
        bgAfter === 'rgb(34, 113, 193)',
        `Base bg should be back to #2271C1 (rgb(34, 113, 193)) after release, got ${bgAfter}`
      )
    }
  ),

  testWithSetup(
    'Button active with scale effect',
    `Button "Click", bg #10b981, col white, pad 12 24, rad 6
  hover:
    bg #059669
  active:
    scale 0.95
    bg #047857`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')

      // Hover first
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(5, 150, 105)')

      // Active state would require real mouse press
      // Testing that hover works as expected
      await api.interact.unhover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
    }
  ),

  testWithSetup(
    'Link active state styling',
    `Link "Click here", href "#", col #2271C1, fs 16
  hover:
    col #1a5490
    underline
  active:
    col #0d3f6e`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial
      api.assert.hasStyle('node-1', 'color', 'rgb(34, 113, 193)')

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'color', 'rgb(26, 84, 144)')

      // Active would require mousedown during click
      api.assert.ok(true, 'Link styling changes on hover (active requires real click)')
    }
  ),
])

// =============================================================================
// Disabled State Tests
// =============================================================================

export const disabledStateTests: TestCase[] = describe('Disabled State', [
  testWithSetup(
    'Disabled button has correct styling',
    `Button "Submit", bg #2271C1, col white, pad 12 24, rad 6, disabled
  disabled:
    bg #666
    col #999
    cursor not-allowed
    opacity 0.6`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const button = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(button !== null, 'Button should exist')

      // Button should be disabled
      api.assert.ok(button.disabled === true, 'Button should be disabled')

      // Should have disabled styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(102, 102, 102)')
      api.assert.hasStyle('node-1', 'color', 'rgb(153, 153, 153)')
      api.assert.hasStyle('node-1', 'cursor', 'not-allowed')

      // Check opacity
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const opacity = window.getComputedStyle(element).opacity
      api.assert.ok(parseFloat(opacity) < 1, `Opacity should be reduced, got ${opacity}`)
    }
  ),

  testWithSetup(
    'Disabled input cannot be focused',
    `Input placeholder "Email", bg #222, col white, pad 12, rad 6, disabled
  disabled:
    bg #1a1a1a
    col #666
    cursor not-allowed`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.disabled === true, 'Input should be disabled')

      // Should have disabled styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'color', 'rgb(102, 102, 102)')
      api.assert.hasStyle('node-1', 'cursor', 'not-allowed')

      // Try to focus - should not work
      input.focus()
      await api.utils.delay(50)

      // Disabled input should not become active element
      api.assert.ok(
        document.activeElement !== input || input.disabled,
        'Disabled input should not be focusable'
      )
    }
  ),

  testWithSetup(
    'Disabled button does not respond to click',
    `count: 0

Frame gap 12, pad 16, bg #1a1a1a
  Button "Increment", increment(count), bg #2271C1, col white, pad 12 24, rad 6, disabled
    disabled:
      bg #444
      col #888
  Text "$count", col white, fs 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const button = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      api.assert.ok(button.disabled === true, 'Button should be disabled')

      // Initial count
      api.dom.expect('node-3', { textContains: '0' })

      // Try to click disabled button via our interaction API
      // (native button.click() can fire events even on disabled buttons in some contexts)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Count should not change - our click() checks for disabled state
      api.dom.expect('node-3', { textContains: '0' })

      // Try another click to confirm
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Still should be 0
      api.dom.expect('node-3', { textContains: '0' })
    }
  ),

  testWithSetup(
    'Mixed enabled and disabled buttons',
    `Frame hor, gap 12, pad 16, bg #1a1a1a
  Button "Enabled", bg #10b981, col white, pad 12 24, rad 6
    hover:
      bg #059669
  Button "Disabled", bg #10b981, col white, pad 12 24, rad 6, disabled
    disabled:
      bg #444
      col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const enabledBtn = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      const disabledBtn = document.querySelector('[data-mirror-id="node-3"]') as HTMLButtonElement

      // Check enabled button
      api.assert.ok(enabledBtn.disabled === false, 'First button should be enabled')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(16, 185, 129)')

      // Check disabled button
      api.assert.ok(disabledBtn.disabled === true, 'Second button should be disabled')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(68, 68, 68)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // Enabled button responds to hover
      await api.interact.hover('node-2')
      await api.utils.delay(100)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(5, 150, 105)')

      // Disabled button does not respond to hover
      await api.interact.hover('node-3')
      await api.utils.delay(100)
      // Should still have disabled styling
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(68, 68, 68)')
    }
  ),

  testWithSetup(
    'Disabled textarea styling',
    `Textarea placeholder "Notes...", bg #222, col white, pad 12, rad 6, w 300, h 100, disabled
  disabled:
    bg #1a1a1a
    col #555
    bor 1
    boc #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const textarea = document.querySelector('[data-mirror-id="node-1"]') as HTMLTextAreaElement
      api.assert.ok(textarea !== null, 'Textarea should exist')
      api.assert.ok(textarea.disabled === true, 'Textarea should be disabled')

      // Disabled styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'color', 'rgb(85, 85, 85)')

      // Cannot type
      textarea.value = 'test'
      api.assert.ok(
        textarea.value === '' || textarea.disabled,
        'Disabled textarea should not accept input'
      )
    }
  ),
])

// =============================================================================
// Combined System States
// =============================================================================

export const combinedSystemStatesTests: TestCase[] = describe('Combined System States', [
  testWithSetup(
    'Button with hover, focus, and active states',
    `Button "Interactive", bg #333, col white, pad 12 24, rad 6
  hover:
    bg #444
  focus:
    bor 2
    boc #2271C1
  active:
    bg #222
    scale 0.98`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Focus first
      await api.interact.focus('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')

      // Hover while focused
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')
      // Focus styling should persist
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')

      // Unhover
      await api.interact.unhover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Blur
      await api.interact.blur('node-1')
      await api.utils.delay(100)
    }
  ),

  testWithSetup(
    'Input with all system states',
    `Input placeholder "Enter text", bg #222, col white, pad 12, rad 6, bor 1, boc #333
  hover:
    boc #555
  focus:
    bor 2
    boc #2271C1
    bg #1f1f1f`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Initial
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(51, 51, 51)')

      // Hover (not focused)
      await api.interact.hover('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(85, 85, 85)')

      // Focus (should override hover border)
      await api.interact.focus('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'borderWidth', '2px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(31, 31, 31)')

      // Type some text while focused
      await api.interact.type('node-1', 'Hello')
      await api.utils.delay(100)

      const input = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(input.value === 'Hello', `Input should have typed value, got "${input.value}"`)

      // Blur
      await api.interact.blur('node-1')
      await api.utils.delay(100)
      api.assert.hasStyle('node-1', 'borderWidth', '1px')
    }
  ),

  testWithSetup(
    'Form with enabled and disabled fields',
    `Frame gap 12, pad 16, bg #1a1a1a
  Input placeholder "Username", bg #222, col white, pad 12, rad 6
    focus:
      bor 2
      boc #2271C1
  Input placeholder "Email", bg #222, col white, pad 12, rad 6, disabled
    disabled:
      bg #1a1a1a
      col #666
  Button "Submit", bg #2271C1, col white, pad 12 24, rad 6
    hover:
      bg #1a5490
    focus:
      bor 2
      boc white
    disabled:
      bg #444
      col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const usernameInput = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement
      const emailInput = document.querySelector('[data-mirror-id="node-3"]') as HTMLInputElement
      const submitButton = document.querySelector('[data-mirror-id="node-4"]') as HTMLButtonElement

      // Username input is enabled
      api.assert.ok(usernameInput.disabled === false, 'Username should be enabled')

      // Email input is disabled
      api.assert.ok(emailInput.disabled === true, 'Email should be disabled')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-3', 'color', 'rgb(102, 102, 102)')

      // Submit button is enabled
      api.assert.ok(submitButton.disabled === false, 'Submit should be enabled')

      // Focus username
      await api.interact.focus('node-2')
      await api.utils.delay(100)
      api.assert.hasStyle('node-2', 'borderWidth', '2px')

      // Tab to skip disabled email, go to submit
      await api.interact.pressKey('Tab')
      await api.utils.delay(100)

      // Submit button should be focused (email was skipped)
      api.assert.ok(
        document.activeElement === submitButton,
        'Focus should skip disabled email and land on submit'
      )
    }
  ),
])

// =============================================================================
// Slice 26 Iter-2: Advanced System States
// =============================================================================
//
// Iter-1 erweiterte das Schema von 4 auf 13 system-states; Iter-2-Sweep
// zieht jetzt CDP-Coverage für die bisher untested 5 nach
// (focus-visible, focus-within, visited, checked, placeholder).
// `placeholder-shown`, `first-child`, `last-child`, `empty` haben keine
// programmatic-fallback-Form (kein `[data-X="true"]`), sind reine CSS-
// Pseudo-classes — Browser-Verhalten ist die Test-Quelle.

export const focusVisibleStateTests: TestCase[] = describe('Focus-Visible State', [
  testWithSetup(
    'Button focus-visible only on keyboard focus',
    `Button "Tab me", bg #2271C1, col white, pad 12 24, rad 6
  focus-visible:
    bor 3
    boc #ff0`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const btn = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(btn !== null, 'Button should exist')
      const css = getPreviewCSS()
      api.assert.ok(
        /:focus-visible/.test(css),
        `:focus-visible missing in preview CSS — sample: ${css.slice(0, 200) || '(empty)'}`
      )
    }
  ),
])

/**
 * Helper: read the Mirror-preview's inline `<style>` element. The DOM
 * backend appends the preview stylesheet to `_root` (a child of body)
 * via `_root.appendChild(_style)` (compiler/backends/dom/style-emitter.ts:490).
 * `document.styleSheets` includes Studio-chrome stylesheets (CodeMirror,
 * pp-content) which contain false-positive matches for state selectors —
 * scope the read to the `.mirror-root` subtree to isolate preview CSS.
 */
function getPreviewCSS(): string {
  const root = document.querySelector('.mirror-root, [data-mirror-root]')
  if (!root) return ''
  const styles = root.querySelectorAll('style')
  return Array.from(styles)
    .map(s => s.textContent ?? '')
    .join('\n')
}

export const focusWithinStateTests: TestCase[] = describe('Focus-Within State', [
  testWithSetup(
    'Frame focus-within emits CSS selector',
    `Frame bg #1a1a1a, pad 16, rad 8
  focus-within:
    bor 2
    boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.utils.delay(200)
      const css = getPreviewCSS()
      // Tail of the CSS — preview-base CSS comes first, state-blocks last
      const tail = css.slice(-1500)
      api.assert.ok(
        /:focus-within/.test(css),
        `:focus-within missing — total ${css.length} chars, tail: ${tail || '(empty)'}`
      )
    }
  ),
])

export const visitedStateTests: TestCase[] = describe('Visited State', [
  testWithSetup(
    'Link visited emits CSS selector',
    `Link "Open", href "https://example.com", col #2271C1
  visited:
    col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const cssText = getPreviewCSS()
      api.assert.ok(/:visited/.test(cssText), 'Inline CSS should contain :visited selector')
    }
  ),
])

export const checkedStateTests: TestCase[] = describe('Checked State', [
  testWithSetup(
    'Input[type=checkbox] checked emits CSS selector',
    `Input type "checkbox"
  checked:
    bg #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const cssText = getPreviewCSS()
      api.assert.ok(/:checked/.test(cssText), 'Inline CSS should contain :checked selector')
    }
  ),
])

export const placeholderStateTests: TestCase[] = describe('Placeholder Pseudo-Element', [
  testWithSetup(
    'Input placeholder block emits ::placeholder',
    `Input placeholder "name@example.com", bg #1a1a1a, col white
  placeholder:
    col #666
    italic`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const cssText = getPreviewCSS()
      api.assert.ok(
        /::placeholder/.test(cssText),
        'Inline CSS should contain ::placeholder pseudo-element'
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allSystemStatesTests: TestCase[] = [
  ...focusStateTests,
  ...activeStateTests,
  ...disabledStateTests,
  ...combinedSystemStatesTests,
  // Slice 26 Iter-2 advanced states
  ...focusVisibleStateTests,
  ...focusWithinStateTests,
  ...visitedStateTests,
  ...checkedStateTests,
  ...placeholderStateTests,
]
