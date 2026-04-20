/**
 * Snapping Test Suite
 *
 * Tests for Token-Snapping and Grid-Snapping features:
 * - Token-Snapping: Padding/Margin/Gap snap to design token values
 * - Grid-Snapping: Resize handles snap to grid
 * - Modifier Key Bypass: Cmd/Ctrl bypasses all snapping
 * - Snap Indicator: Visual feedback when snapping occurs
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if snap indicator is visible
 */
function getSnapIndicator(): HTMLElement | null {
  return document.querySelector('.snap-indicator') as HTMLElement | null
}

/**
 * Get computed padding value for an element
 */
function getComputedPadding(nodeId: string): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return { top: 0, right: 0, bottom: 0, left: 0 }
  const style = window.getComputedStyle(element)
  return {
    top: parseInt(style.paddingTop || '0', 10),
    right: parseInt(style.paddingRight || '0', 10),
    bottom: parseInt(style.paddingBottom || '0', 10),
    left: parseInt(style.paddingLeft || '0', 10),
  }
}

/**
 * Get computed margin value for an element
 */
function getComputedMargin(nodeId: string): {
  top: number
  right: number
  bottom: number
  left: number
} {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return { top: 0, right: 0, bottom: 0, left: 0 }
  const style = window.getComputedStyle(element)
  return {
    top: parseInt(style.marginTop || '0', 10),
    right: parseInt(style.marginRight || '0', 10),
    bottom: parseInt(style.marginBottom || '0', 10),
    left: parseInt(style.marginLeft || '0', 10),
  }
}

/**
 * Get computed gap value for a container
 */
function getComputedGap(nodeId: string): number {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return 0
  const style = window.getComputedStyle(element)
  return parseInt(style.gap || '0', 10)
}

/**
 * Get element dimensions
 */
function getElementDimensions(nodeId: string): { width: number; height: number } {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return { width: 0, height: 0 }
  const rect = element.getBoundingClientRect()
  return { width: rect.width, height: rect.height }
}

// =============================================================================
// Snapping Diagnostic - runs first to check service state
// =============================================================================

export const snappingDiagnosticTests: TestCase[] = describe('Snapping Diagnostic', [
  testWithSetup(
    'DIAGNOSTIC: Token parsing with various formats',
    // Test different token formats
    `// Standard format
s.pad: 4
m.pad: 8
l.pad: 16

// With $ prefix
$xs.pad: 2
$xl.pad: 24

// Margin tokens
s.mar: 4
m.mar: 8

// Gap tokens
s.gap: 4
m.gap: 8

Frame pad 10, bg #1a1a1a, w 200, h 150
  Text "Content"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const snapping = (window as any).__snapping
      if (!snapping) {
        throw new Error('Snapping API not available')
      }

      console.log('\n========================================')
      console.log('TOKEN PARSING DIAGNOSTIC')
      console.log('========================================')

      const debugInfo = snapping.getDebugInfo()

      console.log('\nParsed tokens:')
      console.log(
        '- Padding:',
        debugInfo.tokens.pad.map((t: any) => `${t.name}=${t.value}`).join(', ')
      )
      console.log(
        '- Margin:',
        debugInfo.tokens.mar.map((t: any) => `${t.name}=${t.value}`).join(', ')
      )
      console.log('- Gap:', debugInfo.tokens.gap.map((t: any) => `${t.name}=${t.value}`).join(', '))

      // Should find all padding tokens: s=4, m=8, l=16, xs=2, xl=24
      api.assert.ok(
        debugInfo.tokens.pad.length >= 5,
        `Should find at least 5 padding tokens, found ${debugInfo.tokens.pad.length}: ${debugInfo.tokens.pad.map((t: any) => t.name).join(', ')}`
      )

      // Should find margin tokens: s=4, m=8
      api.assert.ok(
        debugInfo.tokens.mar.length >= 2,
        `Should find at least 2 margin tokens, found ${debugInfo.tokens.mar.length}`
      )

      // Should find gap tokens: s=4, m=8
      api.assert.ok(
        debugInfo.tokens.gap.length >= 2,
        `Should find at least 2 gap tokens, found ${debugInfo.tokens.gap.length}`
      )

      console.log('\n========================================\n')
    }
  ),

  testWithSetup(
    'DIAGNOSTIC: Check snapping service initialization and token parsing',
    // Define spacing tokens: s.pad: 4, m.pad: 8, l.pad: 16
    's.pad: 4\nm.pad: 8\nl.pad: 16\ns.mar: 4\nm.mar: 8\n\nFrame pad 10, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Get snapping API
      const snapping = (window as any).__snapping
      if (!snapping) {
        throw new Error('Snapping API not available at window.__snapping')
      }

      // Log full state
      console.log('\n========================================')
      console.log('SNAPPING DIAGNOSTIC TEST')
      console.log('========================================')
      snapping.logState()

      // Get debug info
      const debugInfo = snapping.getDebugInfo()
      console.log('\nDebug Info:', JSON.stringify(debugInfo, null, 2))

      // Test snap
      console.log('\n--- Testing snap(10, "pad") ---')
      const snapResult = snapping.testSnap(10, 'pad')
      console.log('Snap result:', JSON.stringify(snapResult, null, 2))

      // Assertions
      api.assert.ok(debugInfo.initialized, 'Snapping service should be initialized')

      api.assert.ok(
        debugInfo.tokens.pad.length > 0,
        `Should have padding tokens, got ${debugInfo.tokens.pad.length}`
      )

      api.assert.ok(debugInfo.settings.handleSnap.enabled, 'Handle snap should be enabled')

      api.assert.ok(debugInfo.settings.handleSnap.tokenSnapping, 'Token snapping should be enabled')

      // Value 10 should be within threshold (4) of value 8
      api.assert.ok(
        snapResult.result.snapped,
        `Value 10 should snap to 8 (within threshold 4), but snapped=${snapResult.result.snapped}`
      )

      api.assert.ok(
        snapResult.result.value === 8,
        `Snapped value should be 8, got ${snapResult.result.value}`
      )

      console.log('\n========================================')
      console.log('DIAGNOSTIC COMPLETE')
      console.log('========================================\n')
    }
  ),

  testWithSetup(
    'DIAGNOSTIC: Test actual padding drag with snapping',
    's.pad: 4\nm.pad: 8\nl.pad: 16\n\nFrame pad 10, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(200)

      const snapping = (window as any).__snapping
      if (!snapping) {
        throw new Error('Snapping API not available')
      }

      // Get sources for comparison
      const editorSource = api.editor.getCode()
      const stateSource = (window as any).__mirrorStudio__?.state?.get?.()?.source ?? 'N/A'

      console.log('\n========================================')
      console.log('ACTUAL DRAG DIAGNOSTIC')
      console.log('========================================')

      console.log('\n0. SOURCE COMPARISON:')
      console.log('Editor source length:', editorSource.length)
      console.log('State source length:', stateSource.length)
      console.log('Sources match:', editorSource === stateSource)
      console.log('Editor source (first 200 chars):', editorSource.substring(0, 200))
      console.log('State source (first 200 chars):', stateSource.substring(0, 200))

      // Check initial state (BEFORE reinit)
      console.log('\n1. Initial state (BEFORE reinit):')
      snapping.logState()

      const debugInfoBefore = snapping.getDebugInfo()
      console.log('Tokens found BEFORE reinit:', debugInfoBefore.tokens.pad.length)

      // DO NOT reinit - test the actual state
      // snapping.reinit()
      // console.log('\n2. After reinit:')
      // snapping.logState()

      const initialPadding = getComputedPadding('node-1')
      console.log(`\n3. Initial computed padding: ${JSON.stringify(initialPadding)}`)

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(200)

      console.log('\n4. Entered padding mode')

      // Get handle
      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      if (!topHandle) {
        throw new Error('Top padding handle not found')
      }

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      console.log(`\n5. Handle position: (${startX}, ${startY})`)

      // Simulate drag
      console.log('\n6. Starting drag...')
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: startX,
          clientY: startY,
        })
      )

      // Move to create delta that should snap to 8
      // Moving up by 2 should change padding from 10 to 8 (within threshold)
      console.log('\n7. Moving mouse up by 2px...')
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: startX,
          clientY: startY - 2,
        })
      )

      await api.utils.delay(200)

      // Check live padding during drag
      const duringDragPadding = getComputedPadding('node-1')
      console.log(`\n8. Padding during drag: ${JSON.stringify(duringDragPadding)}`)

      // End drag
      console.log('\n9. Ending drag...')
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Check final padding
      const finalPadding = getComputedPadding('node-1')
      console.log(`\n10. Final padding: ${JSON.stringify(finalPadding)}`)

      // Check the source code
      const code = api.editor.getCode()
      console.log(`\n11. Final code:\n${code}`)

      console.log('\n========================================')
      console.log('DRAG DIAGNOSTIC COMPLETE')
      console.log('========================================\n')

      // The key assertion - did it snap to 8?
      api.assert.ok(
        finalPadding.top === 8,
        `Padding should have snapped to token value 8, but got ${finalPadding.top}. ` +
          `During drag was: ${duringDragPadding.top}`
      )
    }
  ),
])

// =============================================================================
// Token Snapping - Padding
// =============================================================================

export const paddingTokenSnappingTests: TestCase[] = describe('Padding Token Snapping', [
  testWithSetup(
    'Padding snaps to token value when within threshold',
    // Define spacing tokens: s.pad: 4, m.pad: 8, l.pad: 16
    's.pad: 4\nm.pad: 8\nl.pad: 16\n\nFrame pad 10, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 10, which is close to 8 (m.pad)
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 10,
        `Initial padding should be 10, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      // Get the top handle
      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag towards 8 (token value m.pad) - move up slightly to decrease from 10 to ~8
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      // Move up by 2px to get closer to 8
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY - 2 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check if value snapped to 8 (the token value)
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top === 8,
        `Padding should snap to token value 8, got ${finalPadding.top}`
      )
    }
  ),

  testWithSetup(
    'Padding does not snap when beyond threshold',
    's.pad: 4\nm.pad: 8\nl.pad: 16\n\nFrame pad 20, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 20, far from any token value
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 20,
        `Initial padding should be 20, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag down by 2px (increase padding to 22)
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 2 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check value is NOT 16 (no snap should occur) - should be 22 or snapped to grid (24)
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top !== 16,
        `Padding should not snap to 16 when starting from 20 and dragging +2, got ${finalPadding.top}`
      )
    }
  ),
])

// =============================================================================
// Token Snapping - Margin
// =============================================================================

export const marginTokenSnappingTests: TestCase[] = describe('Margin Token Snapping', [
  testWithSetup(
    'Margin snaps to token value when within threshold',
    's.mar: 4\nm.mar: 8\nl.mar: 16\n\nFrame mar 6, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial margin is 6, which is close to 8 (m.mar)
      const initialMargin = getComputedMargin('node-1')
      api.assert.ok(initialMargin.top === 6, `Initial margin should be 6, got ${initialMargin.top}`)

      // Enter margin mode
      await api.interact.enterMarginMode('node-1')
      await api.utils.delay(100)

      // Get the top handle
      const topHandle = document.querySelector('.margin-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top margin handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag up slightly to increase margin towards 8
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY - 2 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check if value snapped to 8 (the token value)
      const finalMargin = getComputedMargin('node-1')
      api.assert.ok(
        finalMargin.top === 8,
        `Margin should snap to token value 8, got ${finalMargin.top}`
      )
    }
  ),
])

// =============================================================================
// Token Snapping - Gap
// =============================================================================

export const gapTokenSnappingTests: TestCase[] = describe('Gap Token Snapping', [
  testWithSetup(
    'Gap snaps to token value when within threshold',
    's.gap: 4\nm.gap: 8\nl.gap: 16\n\nFrame gap 6, hor, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial gap is 6, which is close to 8 (m.gap)
      const initialGap = getComputedGap('node-1')
      api.assert.ok(initialGap === 6, `Initial gap should be 6, got ${initialGap}`)

      // Select the container
      await api.studio.setSelection('node-1')
      await api.utils.delay(200)

      // Enter gap mode
      await api.interact.pressKey('g')
      await api.utils.delay(200)

      // Get the gap handle
      const gapHandle = document.querySelector('.gap-handle') as HTMLElement
      api.assert.ok(gapHandle !== null, 'Gap handle should exist')

      const handleRect = gapHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag to increase gap towards 8
      gapHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX + 2, clientY: startY })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check if value snapped to 8 (the token value)
      const finalGap = getComputedGap('node-1')
      api.assert.ok(finalGap === 8, `Gap should snap to token value 8, got ${finalGap}`)
    }
  ),
])

// =============================================================================
// Grid Snapping - Resize
// =============================================================================

export const resizeGridSnappingTests: TestCase[] = describe('Resize Grid Snapping', [
  testWithSetup(
    'Width snaps to grid when resizing',
    'Frame w 102, h 100, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial width is 102, which should snap to 104 (grid size 8)
      const initialDims = getElementDimensions('node-1')
      api.assert.ok(
        initialDims.width === 102,
        `Initial width should be 102, got ${initialDims.width}`
      )

      // Select element
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Get the east resize handle
      const resizeHandles = document.querySelector('.resize-handles')
      api.assert.ok(resizeHandles !== null, 'Resize handles container should exist')

      const eastHandle = document.querySelector('.resize-handle[data-position="e"]') as HTMLElement
      api.assert.ok(eastHandle !== null, 'East resize handle should exist')

      const handleRect = eastHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag right by 2px (102 + 2 = 104, should snap to 104 which is multiple of 8)
      eastHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX + 2, clientY: startY })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check if width snapped to grid (104 is multiple of 8)
      const finalDims = getElementDimensions('node-1')
      api.assert.ok(
        finalDims.width % 8 === 0,
        `Width should snap to grid (multiple of 8), got ${finalDims.width}`
      )
    }
  ),

  testWithSetup(
    'Height snaps to grid when resizing',
    'Frame w 100, h 106, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial height is 106, which should snap to 104 or 112
      const initialDims = getElementDimensions('node-1')
      api.assert.ok(
        initialDims.height === 106,
        `Initial height should be 106, got ${initialDims.height}`
      )

      // Select element
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Get the south resize handle
      const southHandle = document.querySelector('.resize-handle[data-position="s"]') as HTMLElement
      api.assert.ok(southHandle !== null, 'South resize handle should exist')

      const handleRect = southHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag down by 2px (106 + 2 = 108, but snap should adjust to 112)
      southHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 6 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Check if height snapped to grid (multiple of 8)
      const finalDims = getElementDimensions('node-1')
      api.assert.ok(
        finalDims.height % 8 === 0,
        `Height should snap to grid (multiple of 8), got ${finalDims.height}`
      )
    }
  ),
])

// =============================================================================
// Modifier Key Bypass
// =============================================================================

export const snappingBypassTests: TestCase[] = describe('Snapping Bypass (Cmd/Ctrl)', [
  testWithSetup(
    'Cmd key bypasses padding token snapping',
    's.pad: 8\nm.pad: 16\n\nFrame pad 14, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 14 (close to 16)
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 14,
        `Initial padding should be 14, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag with metaKey (Cmd) held - should bypass snapping
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: startX,
          clientY: startY,
          metaKey: true,
        })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: startX,
          clientY: startY + 1,
          metaKey: true,
        })
      )
      await api.utils.delay(100)
      document.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          metaKey: true,
        })
      )

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Value should be exactly 15, NOT snapped to 16
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top === 15,
        `With Cmd held, padding should not snap - expected 15, got ${finalPadding.top}`
      )
    }
  ),

  testWithSetup(
    'Ctrl key bypasses resize grid snapping',
    'Frame w 100, h 100, bg #1a1a1a\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial width is 100
      const initialDims = getElementDimensions('node-1')
      api.assert.ok(
        initialDims.width === 100,
        `Initial width should be 100, got ${initialDims.width}`
      )

      // Select element
      await api.interact.click('node-1')
      await api.utils.delay(200)

      const eastHandle = document.querySelector('.resize-handle[data-position="e"]') as HTMLElement
      api.assert.ok(eastHandle !== null, 'East resize handle should exist')

      const handleRect = eastHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag with ctrlKey held - should bypass snapping
      eastHandle.dispatchEvent(
        new MouseEvent('mousedown', {
          bubbles: true,
          clientX: startX,
          clientY: startY,
          ctrlKey: true,
        })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: startX + 5,
          clientY: startY,
          ctrlKey: true,
        })
      )
      await api.utils.delay(100)
      document.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          ctrlKey: true,
        })
      )

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Width should be exactly 105, NOT snapped to 104 or 112
      const finalDims = getElementDimensions('node-1')
      api.assert.ok(
        finalDims.width === 105,
        `With Ctrl held, width should not snap - expected 105, got ${finalDims.width}`
      )
    }
  ),
])

// =============================================================================
// Snap Indicator Visual Feedback
// =============================================================================

export const snapIndicatorTests: TestCase[] = describe('Snap Indicator Visual Feedback', [
  testWithSetup(
    'Snap indicator appears when snapping to token',
    's.pad: 8\nm.pad: 16\n\nFrame pad 7, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Start drag towards token value 8
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 1 })
      )

      await api.utils.delay(150)

      // Check for snap indicator
      const indicator = getSnapIndicator()
      api.assert.ok(indicator !== null, 'Snap indicator should appear when snapping to token')

      // Verify indicator shows token name
      if (indicator) {
        api.assert.ok(
          indicator.textContent?.includes('$s'),
          `Snap indicator should show token name "$s", got "${indicator.textContent}"`
        )
      }

      // Clean up - finish drag
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await api.utils.delay(100)
    }
  ),

  testWithSetup(
    'Snap indicator has correct styling',
    's.pad: 8\n\nFrame pad 7, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag to trigger snap
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 1 })
      )

      await api.utils.delay(150)

      // Check indicator styling
      const indicator = getSnapIndicator()
      if (indicator) {
        const style = window.getComputedStyle(indicator)

        // Check position is absolute
        api.assert.ok(
          style.position === 'absolute',
          `Indicator should be absolutely positioned, got ${style.position}`
        )

        // Check it has a background color
        api.assert.ok(
          style.backgroundColor !== 'transparent' && style.backgroundColor !== '',
          `Indicator should have background color, got ${style.backgroundColor}`
        )

        // Check pointer-events is none (shouldn't interfere with dragging)
        api.assert.ok(
          style.pointerEvents === 'none',
          `Indicator should have pointer-events: none, got ${style.pointerEvents}`
        )
      }

      // Clean up
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await api.utils.delay(100)
    }
  ),

  testWithSetup(
    'Snap indicator hides after drag completes',
    's.pad: 8\n\nFrame pad 7, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Start drag
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 1 })
      )
      await api.utils.delay(100)

      // Verify indicator appears
      let indicator = getSnapIndicator()
      api.assert.ok(indicator !== null, 'Indicator should appear during drag')

      // End drag
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      await api.utils.delay(200) // Wait for hide animation

      // Verify indicator is hidden
      indicator = getSnapIndicator()
      api.assert.ok(
        indicator === null || indicator.style.opacity === '0',
        'Indicator should be hidden after drag completes'
      )
    }
  ),
])

// =============================================================================
// Grid Snapping Fallback
// =============================================================================

export const gridSnappingFallbackTests: TestCase[] = describe('Grid Snapping Fallback', [
  testWithSetup(
    'Padding snaps to grid when NO tokens are defined',
    // NO padding tokens defined - should fall back to grid snapping
    'Frame pad 25, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 25 (no tokens defined)
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 25,
        `Initial padding should be 25, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag slightly - since no tokens exist, should snap to grid
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY - 1 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Should snap to grid (multiple of 8) since no tokens defined
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top % 8 === 0,
        `Padding should snap to grid (multiple of 8) when no tokens defined, got ${finalPadding.top}`
      )
    }
  ),

  testWithSetup(
    'Padding does NOT snap to grid when tokens exist but value is not near any token',
    // Tokens exist but value 25 is far from all of them (4, 32)
    's.pad: 4\nm.pad: 32\n\nFrame pad 25, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 25 (tokens exist but not nearby)
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 25,
        `Initial padding should be 25, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag slightly - tokens exist so NO grid fallback should happen
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 1 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Should NOT snap to grid - value should be 26 (exact drag result)
      // Since tokens exist, no grid fallback occurs
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top === 26,
        `Padding should NOT snap to grid when tokens exist - expected 26, got ${finalPadding.top}`
      )
    }
  ),
])

// =============================================================================
// Token Priority over Grid
// =============================================================================

export const tokenPriorityTests: TestCase[] = describe('Token Priority over Grid', [
  testWithSetup(
    'Token snap takes priority over grid snap',
    // Token value 12 is NOT a multiple of 8 (default grid)
    's.pad: 12\n\nFrame pad 10, bg #1a1a1a, w 200, h 150\n  Text "Content"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.interact.pressKey('Escape')
      await api.utils.delay(100)

      // Initial padding is 10, close to token 12
      const initialPadding = getComputedPadding('node-1')
      api.assert.ok(
        initialPadding.top === 10,
        `Initial padding should be 10, got ${initialPadding.top}`
      )

      // Enter padding mode
      await api.interact.enterPaddingMode('node-1')
      await api.utils.delay(100)

      const topHandle = document.querySelector('.padding-handle-top') as HTMLElement
      api.assert.ok(topHandle !== null, 'Top padding handle should exist')

      const handleRect = topHandle.getBoundingClientRect()
      const startX = handleRect.left + handleRect.width / 2
      const startY = handleRect.top + handleRect.height / 2

      // Drag towards 12 (which is within threshold of 4 from 10)
      topHandle.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, clientX: startX, clientY: startY })
      )
      document.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: startX, clientY: startY + 2 })
      )
      await api.utils.delay(100)
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Should snap to token value 12 (NOT grid value 8 or 16)
      const finalPadding = getComputedPadding('node-1')
      api.assert.ok(
        finalPadding.top === 12,
        `Padding should snap to token value 12 (not grid), got ${finalPadding.top}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allSnappingTests: TestCase[] = [
  ...snappingDiagnosticTests,
  ...paddingTokenSnappingTests,
  ...marginTokenSnappingTests,
  ...gapTokenSnappingTests,
  ...resizeGridSnappingTests,
  ...snappingBypassTests,
  ...snapIndicatorTests,
  ...gridSnappingFallbackTests,
  ...tokenPriorityTests,
]
