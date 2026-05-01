/**
 * Effect Tests
 *
 * Tests for: opacity, shadow, blur, cursor, hidden, visible, clip, scroll
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const effectTests: TestCase[] = describe('Effects', [
  testWithSetup('opacity', 'Frame opacity 0.5', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'opacity', '0.5')
  }),

  testWithSetup('shadow sm', 'Frame shadow sm, w 100, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const boxShadow = window.getComputedStyle(element).boxShadow
    api.assert.ok(
      boxShadow !== 'none' && boxShadow !== '',
      `shadow sm should set boxShadow, got "${boxShadow}"`
    )
    // shadow sm should be small - check for small blur values
    api.assert.ok(
      boxShadow.includes('1px') || boxShadow.includes('2px'),
      `shadow sm should have small blur (1-2px), got "${boxShadow}"`
    )
  }),

  testWithSetup('shadow md', 'Frame shadow md, w 100, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const boxShadow = window.getComputedStyle(element).boxShadow
    api.assert.ok(
      boxShadow !== 'none' && boxShadow !== '',
      `shadow md should set boxShadow, got "${boxShadow}"`
    )
    // shadow md should have medium blur
    api.assert.ok(
      boxShadow.includes('4px') || boxShadow.includes('5px') || boxShadow.includes('6px'),
      `shadow md should have medium blur (4-6px), got "${boxShadow}"`
    )
  }),

  testWithSetup('shadow lg', 'Frame shadow lg, w 100, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const boxShadow = window.getComputedStyle(element).boxShadow
    api.assert.ok(
      boxShadow !== 'none' && boxShadow !== '',
      `shadow lg should set boxShadow, got "${boxShadow}"`
    )
    // shadow lg should have large blur (10px+)
    api.assert.ok(
      boxShadow.includes('10px') ||
        boxShadow.includes('15px') ||
        boxShadow.includes('20px') ||
        boxShadow.includes('25px'),
      `shadow lg should have large blur (10px+), got "${boxShadow}"`
    )
  }),

  testWithSetup('blur', 'Frame blur 4, w 100, h 100, bg #333', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Element should exist')
    const filter = window.getComputedStyle(element).filter
    api.assert.ok(
      filter.includes('blur'),
      `blur should set CSS filter with blur(), got "${filter}"`
    )
    // Check for blur value around 4px
    api.assert.ok(
      filter.includes('blur(4px)') || filter.includes('blur(4'),
      `blur 4 should have blur(4px), got "${filter}"`
    )
  }),

  testWithSetup(
    'backdrop-blur',
    'Frame backdrop-blur 8, w 100, h 100, bg rgba(0,0,0,0.5)',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Element should exist')
      const computedStyle = window.getComputedStyle(element) as CSSStyleDeclaration & {
        webkitBackdropFilter?: string
      }
      const backdropFilter = computedStyle.backdropFilter || computedStyle.webkitBackdropFilter
      api.assert.ok(
        backdropFilter && backdropFilter.includes('blur'),
        `backdrop-blur should set backdropFilter with blur(), got "${backdropFilter}"`
      )
    }
  ),

  testWithSetup('cursor pointer', 'Frame cursor pointer', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'pointer')
  }),

  testWithSetup('cursor not-allowed', 'Frame cursor not-allowed', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'cursor', 'not-allowed')
  }),
])

export const visibilityTests: TestCase[] = describe('Visibility', [
  testWithSetup('hidden sets display none', 'Frame hidden', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'none')
  }),

  testWithSetup('visible sets display flex', 'Frame visible', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'display', 'flex')
  }),

  testWithSetup('clip sets overflow hidden', 'Frame clip', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflow', 'hidden')
  }),

  testWithSetup('scroll enables scrolling', 'Frame scroll, h 100', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'overflowY', 'auto')
  }),
])

export const combinedTests: TestCase[] = describe('Combined Styles', [
  testWithSetup(
    'Button with full styling',
    'Button "Click", bg #2271C1, col white, pad 12 24, rad 6, fs 14, weight 500',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'fontSize', '14px')
      api.assert.hasStyle('node-1', 'fontWeight', '500')
    }
  ),

  testWithSetup(
    'Card with multiple styles',
    'Frame bg #1a1a1a, pad 16, rad 8, gap 8, shadow md\n  Text "Title", col white, fs 18, weight bold\n  Text "Desc", col #888, fs 14',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
    }
  ),
])
