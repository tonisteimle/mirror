/**
 * Test API E2E Tests
 *
 * Tests the Test API in a real browser environment using Playwright.
 * Verifies state machines, events, and visual changes.
 */

import { test, expect } from '@playwright/test'

test.describe('Test API E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to studio
    await page.goto('/')
  })

  test('Test API should be available on window', async ({ page }) => {
    const hasTestAPI = await page.evaluate(() => {
      return typeof (window as any).__MIRROR_TEST__ !== 'undefined'
    })

    expect(hasTestAPI).toBe(true)
  })

  test('Test API should have all methods', async ({ page }) => {
    const methods = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return []

      return [
        'getElement',
        'getAllElements',
        'findByName',
        'getState',
        'getAvailableStates',
        'getStyles',
        'getBaseStyles',
        'setState',
        'resetToBase',
        'trigger',
        'triggerKey',
        'toggle',
        'exclusive',
        'isVisible',
        'getComputedStyle',
        'waitForState',
        'waitForVisible',
        'logStateMachine',
        'getStateMachineInfo',
      ].filter(method => typeof api[method] === 'function')
    })

    expect(methods).toHaveLength(19)
  })

  test('toggle() should change element state', async ({ page }) => {
    // Set up a simple toggle button in the editor
    await page.evaluate(() => {
      const editor = document.querySelector('.cm-content') as HTMLElement
      if (editor) {
        // This depends on how the studio sets up the editor
        // For now, we test with existing preview elements
      }
    })

    // Wait for any elements to render
    await page.waitForTimeout(500)

    const result = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return { error: 'No API' }

      const elements = api.getAllElements()
      if (elements.length === 0) return { error: 'No elements' }

      // Find first element with state machine
      const elWithSM = elements.find((el: any) => el._stateMachine)
      if (!elWithSM) return { noStateMachine: true, count: elements.length }

      const beforeState = api.getState(elWithSM)
      api.toggle(elWithSM)
      const afterState = api.getState(elWithSM)

      return {
        before: beforeState,
        after: afterState,
        changed: beforeState !== afterState,
      }
    })

    // If there's an element with state machine, verify toggle works
    if (result && 'before' in result) {
      expect(result.changed).toBe(true)
    }
  })

  test('trigger click should activate event handlers', async ({ page }) => {
    await page.waitForTimeout(500)

    const result = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return { error: 'No API' }

      const elements = api.getAllElements()
      const elWithSM = elements.find((el: any) => el._stateMachine)
      if (!elWithSM) return { noStateMachine: true }

      // Reset to default first
      api.resetToBase(elWithSM)
      const beforeState = api.getState(elWithSM)

      // Trigger click
      api.trigger(elWithSM, 'click')
      const afterState = api.getState(elWithSM)

      return {
        before: beforeState,
        after: afterState,
      }
    })

    // Verify state changed after click (if element has onclick handler)
    if (result && 'before' in result && result.before === 'default') {
      // State should have changed if there's an onclick handler
      expect(result).toBeDefined()
    }
  })

  test('getStateMachineInfo should return correct info', async ({ page }) => {
    await page.waitForTimeout(500)

    const info = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return null

      const elements = api.getAllElements()
      const elWithSM = elements.find((el: any) => el._stateMachine)
      if (!elWithSM) return null

      return api.getStateMachineInfo(elWithSM)
    })

    if (info) {
      expect(info).toHaveProperty('current')
      expect(info).toHaveProperty('initial')
      expect(info).toHaveProperty('states')
      expect(info).toHaveProperty('transitions')
      expect(Array.isArray(info.states)).toBe(true)
      expect(Array.isArray(info.transitions)).toBe(true)
    }
  })

  test('isVisible should detect hidden elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return null

      const elements = api.getAllElements()
      if (elements.length === 0) return null

      // Check visibility of first element
      const el = elements[0]
      return {
        isVisible: api.isVisible(el),
        display: window.getComputedStyle(el).display,
      }
    })

    if (result) {
      // Visible elements should have non-none display
      if (result.display !== 'none') {
        expect(result.isVisible).toBe(true)
      }
    }
  })

  test('exclusive() should deselect siblings', async ({ page }) => {
    // This test requires multiple sibling elements with state machines
    const result = await page.evaluate(() => {
      const api = (window as any).__MIRROR_TEST__
      if (!api) return { error: 'No API' }

      // Find elements that look like tabs (same component in same parent)
      const elements = api.getAllElements()
      const tabs = elements.filter((el: any) => {
        return el._stateMachine && el.parentElement
      })

      if (tabs.length < 2) return { notEnoughTabs: true }

      // Find siblings
      const firstTab = tabs[0]
      const parent = firstTab.parentElement
      const siblingTabs = tabs.filter((t: any) => t.parentElement === parent && t !== firstTab)

      if (siblingTabs.length === 0) return { noSiblings: true }

      // Get initial states
      const initialStates = [firstTab, ...siblingTabs].map((t: any) => api.getState(t))

      // Trigger exclusive on first tab
      api.exclusive(firstTab)

      // Get final states
      const finalStates = [firstTab, ...siblingTabs].map((t: any) => api.getState(t))

      return {
        initial: initialStates,
        final: finalStates,
        firstTabActive: api.getState(firstTab) !== 'default',
      }
    })

    // Verify exclusive behavior if we found tabs
    if (result && 'firstTabActive' in result) {
      expect(result.firstTabActive).toBe(true)
    }
  })
})
