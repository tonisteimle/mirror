/**
 * Radius Change Tests — bug-reproduction suite
 *
 * Verifies that changing the `rad` property via the panel propagates correctly
 * to the editor source and the rendered DOM, across simple Frames, component
 * definitions, instance overrides, token clicks, and direct input.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const radiusChangeTests: TestCase[] = describe('Radius Changes', [
  testWithSetup(
    'Change radius on simple Frame',
    `Frame rad 8, pad 16, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('rad 8'), `Initial code should have rad 8, got: ${code}`)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element, 'Element node-1 should exist in DOM')
      const initialRadius = window.getComputedStyle(element).borderRadius
      api.assert.ok(
        initialRadius === '8px',
        `Initial border-radius should be 8px, got: ${initialRadius}`
      )

      const success = await api.panel.property.setProperty('rad', '16')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      code = api.editor.getCode()
      api.assert.ok(code.includes('rad 16'), `Code should contain rad 16, got: ${code}`)
      api.assert.ok(!code.includes('rad 8'), `Code should not contain old rad 8, got: ${code}`)

      const updatedElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(updatedElement, 'Element node-1 should still exist after compile')
      const newRadius = window.getComputedStyle(updatedElement).borderRadius
      api.assert.ok(
        newRadius === '16px',
        `Border-radius should be updated to 16px in DOM, got: ${newRadius}`
      )
    }
  ),

  testWithSetup(
    'Change radius on component definition',
    `Card: bg #333, pad 16, rad 8

Card`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const selectedId = await api.panel.property.waitForSelectedNodeId()
      api.assert.ok(selectedId === 'node-1', `Panel should show node-1, got "${selectedId}"`)

      let code = api.editor.getCode()
      api.assert.ok(code.includes('rad 8'), `Initial code should have rad 8, got: ${code}`)

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element, 'Element node-1 should exist in DOM')
      const initialRadius = window.getComputedStyle(element).borderRadius
      api.assert.ok(
        initialRadius === '8px',
        `Initial border-radius should be 8px, got: ${initialRadius}`
      )

      const success = await api.panel.property.setProperty('rad', '20')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      code = api.editor.getCode()
      api.assert.ok(code.includes('rad 20'), `Code should contain rad 20, got: ${code}`)

      const updatedElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(updatedElement, 'Element node-1 should still exist after compile')
      const newRadius = window.getComputedStyle(updatedElement).borderRadius
      api.assert.ok(
        newRadius === '20px',
        `Border-radius should be updated to 20px in DOM, got: ${newRadius}`
      )
    }
  ),

  testWithSetup(
    'Change radius on component instance with override',
    `Card: bg #333, pad 16, rad 8

Card rad 12`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      let code = api.editor.getCode()
      api.assert.ok(
        code.includes('Card rad 12'),
        `Initial code should have Card rad 12, got: ${code}`
      )

      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element, 'Element node-1 should exist in DOM')
      const initialRadius = window.getComputedStyle(element).borderRadius
      api.assert.ok(
        initialRadius === '12px',
        `Initial border-radius should be 12px, got: ${initialRadius}`
      )

      const success = await api.panel.property.setProperty('rad', '24')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      code = api.editor.getCode()
      api.assert.ok(code.includes('rad 24'), `Code should contain rad 24, got: ${code}`)
      api.assert.ok(
        !code.includes('rad 12'),
        `Code should not contain old rad 12 on instance line, got: ${code}`
      )

      const updatedElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(updatedElement, 'Element node-1 should still exist after compile')
      const newRadius = window.getComputedStyle(updatedElement).borderRadius
      api.assert.ok(
        newRadius === '24px',
        `Border-radius should be updated to 24px in DOM, got: ${newRadius}`
      )
    }
  ),

  testWithSetup(
    'Change radius using token button',
    `s.rad: 4
m.rad: 8
l.rad: 16

Frame rad 8, pad 16, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      const radTokens = api.panel.property.getTokenOptions('rad')
      api.assert.ok(
        radTokens.length >= 3,
        `Expected 3+ rad tokens, got ${radTokens.length}: ${radTokens.join(', ')}`
      )

      const success = await api.panel.property.clickToken('rad', 'l')
      api.assert.ok(success, 'Token click should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('rad $l') || code.includes('rad 16'),
        `Code should contain rad $l or rad 16, got: ${code.substring(code.indexOf('Frame'), code.indexOf('Frame') + 50)}`
      )
    }
  ),

  testWithSetup(
    'Change radius via input field directly',
    `Frame rad 8, pad 16, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      const panel = document.querySelector('.property-panel')
      const radInput = panel?.querySelector(
        'input[data-rad-input], input[data-radius]'
      ) as HTMLInputElement

      if (radInput) {
        radInput.focus()
        radInput.value = '32'
        radInput.dispatchEvent(new Event('input', { bubbles: true }))
        radInput.dispatchEvent(new Event('change', { bubbles: true }))
        radInput.blur()

        await api.utils.delay(800)
        await api.utils.waitForCompile()

        const code = api.editor.getCode()
        api.assert.ok(
          code.includes('rad 32'),
          `Code should contain rad 32 after input change, got: ${code}`
        )
      } else {
        const success = await api.panel.property.setProperty('rad', '32')
        api.assert.ok(success, 'setProperty should succeed as fallback')

        await api.utils.delay(800)
        await api.utils.waitForCompile()

        const code = api.editor.getCode()
        api.assert.ok(code.includes('rad 32'), `Code should contain rad 32, got: ${code}`)
      }
    }
  ),
])
