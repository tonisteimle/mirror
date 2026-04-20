/**
 * Typography Tests
 *
 * Tests for: fs, weight, font, italic, underline, uppercase, lowercase, truncate, text-align
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const typographyTests: TestCase[] = describe('Typography', [
  testWithSetup('fs sets font-size', 'Text "Big", fs 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontSize', '24px')
  }),

  testWithSetup('weight bold', 'Text "Bold", weight bold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '700')
  }),

  testWithSetup('weight semibold', 'Text "Semi", weight semibold', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '600')
  }),

  testWithSetup('weight medium', 'Text "Medium", weight medium', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('weight normal', 'Text "Normal", weight normal', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '400')
  }),

  testWithSetup('weight light', 'Text "Light", weight light', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '300')
  }),

  testWithSetup('weight numeric', 'Text "500", weight 500', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontWeight', '500')
  }),

  testWithSetup('font mono', 'Text "Code", font mono', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const fontFamily = window.getComputedStyle(element).fontFamily.toLowerCase()
    api.assert.ok(
      fontFamily.includes('mono') ||
        fontFamily.includes('courier') ||
        fontFamily.includes('consolas') ||
        fontFamily.includes('menlo'),
      `font mono should set monospace fontFamily, got "${fontFamily}"`
    )
  }),

  testWithSetup('font sans', 'Text "Sans", font sans', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const fontFamily = window.getComputedStyle(element).fontFamily.toLowerCase()
    api.assert.ok(
      fontFamily.includes('sans') ||
        fontFamily.includes('helvetica') ||
        fontFamily.includes('arial') ||
        fontFamily.includes('inter'),
      `font sans should set sans-serif fontFamily, got "${fontFamily}"`
    )
  }),

  testWithSetup('font serif', 'Text "Serif", font serif', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const fontFamily = window.getComputedStyle(element).fontFamily.toLowerCase()
    api.assert.ok(
      fontFamily.includes('serif') ||
        fontFamily.includes('georgia') ||
        fontFamily.includes('times'),
      `font serif should set serif fontFamily, got "${fontFamily}"`
    )
  }),

  testWithSetup('italic', 'Text "Italic", italic', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'fontStyle', 'italic')
  }),

  testWithSetup('underline', 'Text "Underline", underline', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textDecoration', 'underline')
  }),

  testWithSetup('uppercase', 'Text "upper", uppercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'uppercase')
  }),

  testWithSetup('lowercase', 'Text "LOWER", lowercase', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'textTransform', 'lowercase')
  }),

  testWithSetup(
    'truncate adds ellipsis',
    'Text "Very long text that gets cut off", truncate, w 100',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Element should exist')

      // truncate requires overflow: hidden
      api.assert.hasStyle('node-1', 'overflow', 'hidden')

      // truncate requires text-overflow: ellipsis
      const textOverflow = window.getComputedStyle(element).textOverflow
      api.assert.ok(
        textOverflow === 'ellipsis',
        `truncate should set text-overflow: ellipsis, got "${textOverflow}"`
      )

      // truncate requires white-space: nowrap
      const whiteSpace = window.getComputedStyle(element).whiteSpace
      api.assert.ok(
        whiteSpace === 'nowrap',
        `truncate should set white-space: nowrap, got "${whiteSpace}"`
      )
    }
  ),

  testWithSetup('line-height', 'Text "Line height test", line 1.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const lineHeight = window.getComputedStyle(element).lineHeight
    // line-height can be in px or relative (e.g., "1.5" or "24px")
    api.assert.ok(
      lineHeight.includes('1.5') || parseFloat(lineHeight) > 0,
      `line 1.5 should set line-height, got "${lineHeight}"`
    )
  }),

  testWithSetup(
    'text-align center',
    'Text "Centered", text-align center, w 200',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'textAlign', 'center')
    }
  ),
])
