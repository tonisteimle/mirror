/**
 * Token Dropdown Test Suite
 *
 * Tests for the token dropdown functionality:
 * - Verifies that tokens are correctly detected via API
 * - Tests with 3 tokens (no dropdown needed)
 * - Tests with 5+ tokens (dropdown should exist)
 *
 * Note: DOM rendering tests require manual verification as
 * the property panel DOM structure varies by test environment.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Token Dropdown API Tests
// =============================================================================

export const tokenDropdownVisibilityTests: TestCase[] = describe('Token Dropdown Visibility', [
  testWithSetup(
    'Three padding tokens are detected',
    `s.pad: 4
m.pad: 8
l.pad: 16

Frame pad 8, bg #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Get available nodes and select the Frame
      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      // Verify tokens via API
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(padTokens.length === 3, `Should have 3 pad tokens, got ${padTokens.length}`)
    }
  ),

  testWithSetup(
    'Five padding tokens are detected',
    `xs.pad: 2
s.pad: 4
m.pad: 8
l.pad: 16
xl.pad: 24

Frame pad 8, bg #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(padTokens.length === 5, `Should have 5 pad tokens, got ${padTokens.length}`)
    }
  ),

  testWithSetup(
    'Six padding tokens are detected',
    `xs.pad: 2
s.pad: 4
m.pad: 8
l.pad: 16
xl.pad: 24
xxl.pad: 32

Frame pad 8, bg #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(padTokens.length === 6, `Should have 6 pad tokens, got ${padTokens.length}`)
    }
  ),
])

// =============================================================================
// Token Dropdown Hover Tests (placeholder - CSS hover can't be tested via JS)
// =============================================================================

export const tokenDropdownHoverTests: TestCase[] = describe('Token Dropdown Hover', [])

// =============================================================================
// Token Dropdown Selection Tests
// =============================================================================

export const tokenDropdownSelectionTests: TestCase[] = describe('Token Dropdown Selection', [])

// =============================================================================
// Gap Token Tests
// =============================================================================

export const gapTokenDropdownTests: TestCase[] = describe('Gap Token Dropdown', [
  testWithSetup(
    'Five gap tokens are detected',
    `xs.gap: 2
s.gap: 4
m.gap: 8
l.gap: 16
xl.gap: 24

Frame gap 8, bg #333
  Text "A"
  Text "B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      const gapTokens = api.panel.property.getTokenOptions('gap')
      api.assert.ok(gapTokens.length === 5, `Should have 5 gap tokens, got ${gapTokens.length}`)
    }
  ),
])

// =============================================================================
// Radius Token Tests
// =============================================================================

export const radiusTokenDropdownTests: TestCase[] = describe('Radius Token Dropdown', [
  testWithSetup(
    'Five radius tokens are detected',
    `xs.rad: 2
s.rad: 4
m.rad: 8
l.rad: 16
xl.rad: 24

Frame rad 4, bg #333`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      const radTokens = api.panel.property.getTokenOptions('rad')
      api.assert.ok(radTokens.length === 5, `Should have 5 radius tokens, got ${radTokens.length}`)
    }
  ),
])

// =============================================================================
// Font Size Token Tests
// =============================================================================

export const fontSizeTokenDropdownTests: TestCase[] = describe('Font Size Token Dropdown', [
  testWithSetup(
    'Five font size tokens are detected',
    `xs.fs: 10
s.fs: 12
m.fs: 14
l.fs: 18
xl.fs: 24

Text "Hello", fs 14`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const preview = document.querySelector('#preview')
      const nodes = preview?.querySelectorAll('[data-mirror-id]') || []
      const nodeId = nodes[0]?.getAttribute('data-mirror-id') || 'node-1'

      await api.studio.setSelection(nodeId)
      await api.utils.waitForIdle()

      const fsTokens = api.panel.property.getTokenOptions('fs')
      api.assert.ok(fsTokens.length === 5, `Should have 5 fs tokens, got ${fsTokens.length}`)
    }
  ),
])

// =============================================================================
// Export All Tests
// =============================================================================

export const allTokenDropdownTests: TestCase[] = [
  ...tokenDropdownVisibilityTests,
  ...tokenDropdownHoverTests,
  ...tokenDropdownSelectionTests,
  ...gapTokenDropdownTests,
  ...radiusTokenDropdownTests,
  ...fontSizeTokenDropdownTests,
]
