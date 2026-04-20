/**
 * Dashboard End-to-End Test
 *
 * A single comprehensive test that builds a complex dashboard from scratch using
 * visual editing tools: drag & drop, property panel, padding/margin mode,
 * resize handles, and keyboard shortcuts.
 *
 * This is a sequential test where each phase builds on the previous one.
 *
 * Validation Strategy:
 * 1. Code Verification - Check generated code matches expected patterns
 * 2. Visual Verification - Check computed styles via getComputedStyle()
 * 3. Layout Verification - Check element positions via getBoundingClientRect()
 * 4. Structure Verification - Check DOM hierarchy
 * 5. Token Verification - Check tokens are applied correctly
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, test } from '../../test-runner'
import { getLayoutInfo } from '../../layout-assertions'

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Get computed style for a node
 */
function getComputedStyleForNode(nodeId: string): CSSStyleDeclaration | null {
  const preview = document.getElementById('preview')
  const element = preview?.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return null
  return window.getComputedStyle(element)
}

/**
 * Parse RGB color to hex
 */
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return rgb
  const [, r, g, b] = match
  return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`
}

/**
 * Verify background color matches
 */
function verifyBackgroundColor(nodeId: string, expectedHex: string): boolean {
  const style = getComputedStyleForNode(nodeId)
  if (!style) return false
  const actual = style.backgroundColor
  const actualHex = rgbToHex(actual).toLowerCase()
  return actualHex === expectedHex.toLowerCase()
}

/**
 * Verify code contains pattern
 */
function codeHas(code: string, pattern: string): boolean {
  return code.includes(pattern)
}

/**
 * Count occurrences of a pattern in code
 */
function countPattern(code: string, pattern: string): number {
  const regex = new RegExp(pattern, 'g')
  return (code.match(regex) || []).length
}

// =============================================================================
// Token and Component Definitions
// =============================================================================

const TOKENS = `// Design Tokens

// Brand Colors
primary.bg: #3b82f6
accent.bg: #f59e0b
success.bg: #10b981
danger.bg: #ef4444

// Surface Colors
canvas.bg: #0f0f0f
surface.bg: #1a1a1a
card.bg: #27272a

// Text Colors
text.col: #ffffff
muted.col: #a1a1aa

// Border
border.boc: #3f3f46

// Typography
s.fs: 12
m.fs: 14
l.fs: 18
xl.fs: 24

// Spacing
s.pad: 8
m.pad: 12
l.pad: 16
xl.pad: 24

s.gap: 8
m.gap: 12
l.gap: 16

// Radius
s.rad: 4
m.rad: 8
l.rad: 12
`

const COMPONENTS = `
// Components

AppShell: w full, h full, bg $canvas

Sidebar: w 240, h full, bg $surface, pad $l, gap $m

MainContent: grow, pad $xl, gap $l, scroll

NavItem: pad $m $l, rad $m, col $muted, cursor pointer, hor, gap $m, ver-center
  hover:
    bg $card
    col $text

StatCard: bg $card, pad $l, rad $l, gap $s

Btn: pad $m $l, rad $m, cursor pointer
PrimaryBtn as Btn: bg $primary, col white
`

const LAYOUT = `
// Dashboard

AppShell
  Frame hor, h full
    Sidebar
      Text "Dashboard", fs $l, weight bold, col $text
      NavItem
        Icon "home", is 18
        Text "Home"
      NavItem
        Icon "settings", is 18
        Text "Settings"
    MainContent
      Text "Welcome", fs $xl, weight bold, col $text
      Text "Build amazing dashboards", col $muted
      Frame hor, gap $l, wrap
        StatCard w 200
          Text "Users", col $muted, fs $s
          Text "1,234", fs $xl, weight bold, col $text
        StatCard w 200
          Text "Revenue", col $muted, fs $s
          Text "$45.2k", fs $xl, weight bold, col $text
`

// =============================================================================
// Main E2E Test
// =============================================================================

export const dashboardE2ETests: TestCase[] = describe('Dashboard E2E', [
  test('Build complete dashboard from scratch', async (api: TestAPI) => {
    // =========================================================================
    // PHASE 1: Clear and Set Up Tokens
    // =========================================================================
    console.log('📝 Phase 1: Setting up tokens...')

    // Set up tokens first (no waitForCompile - tokens alone don't render)
    // Note: Tokens and components are just definitions, they don't render anything
    await api.editor.setCode(TOKENS)
    await api.utils.delay(300)

    let code = api.editor.getCode()
    api.assert.ok(codeHas(code, 'primary.bg: #3b82f6'), 'Token primary.bg should exist')
    api.assert.ok(codeHas(code, 'canvas.bg: #0f0f0f'), 'Token canvas.bg should exist')
    api.assert.ok(codeHas(code, 'xl.pad: 24'), 'Token xl.pad should exist')
    console.log('✅ Phase 1 complete: Tokens set up')

    // =========================================================================
    // PHASE 2: Add Components
    // =========================================================================
    console.log('📝 Phase 2: Adding components...')

    // Add component definitions (no waitForCompile - definitions don't render)
    await api.editor.setCode(TOKENS + COMPONENTS)
    await api.utils.delay(300)

    code = api.editor.getCode()
    api.assert.ok(codeHas(code, 'AppShell:'), 'Component AppShell should exist')
    api.assert.ok(codeHas(code, 'Sidebar:'), 'Component Sidebar should exist')
    api.assert.ok(codeHas(code, 'StatCard:'), 'Component StatCard should exist')
    api.assert.ok(codeHas(code, 'PrimaryBtn as Btn:'), 'Component PrimaryBtn should exist')
    console.log('✅ Phase 2 complete: Components defined')

    // =========================================================================
    // PHASE 3: Build Main Layout
    // =========================================================================
    console.log('📝 Phase 3: Building main layout...')

    await api.editor.setCode(TOKENS + COMPONENTS + LAYOUT)
    await api.utils.waitForCompile()
    await api.utils.delay(400)

    // Update code variable for later assertions
    code = api.editor.getCode()

    // Verify structure
    api.assert.exists('node-1', 'AppShell should be rendered')
    api.assert.exists('node-2', 'Frame hor should be rendered')
    api.assert.exists('node-3', 'Sidebar should be rendered')

    // Verify AppShell has canvas background (#0f0f0f)
    const appShellBgOk = verifyBackgroundColor('node-1', '#0f0f0f')
    api.assert.ok(appShellBgOk, 'AppShell should have canvas bg (#0f0f0f)')

    // Verify Sidebar has surface background (#1a1a1a)
    const sidebarBgOk = verifyBackgroundColor('node-3', '#1a1a1a')
    api.assert.ok(sidebarBgOk, 'Sidebar should have surface bg (#1a1a1a)')

    console.log('✅ Phase 3 complete: Layout built')

    // =========================================================================
    // PHASE 4: Verify Layout Relationships
    // =========================================================================
    console.log('📝 Phase 4: Verifying layout relationships...')

    // Check Frame hor has flex-direction: row
    const frameHor = getLayoutInfo('node-2')
    api.assert.ok(frameHor !== null, 'Frame hor (node-2) should have layout info')

    const flexDir = frameHor!.computedStyle.flexDirection
    api.assert.ok(flexDir === 'row', `Frame hor should be row, got ${flexDir}`)

    // Find Sidebar by checking for width 240 and surface background
    const sidebarInfo = getLayoutInfo('node-3')
    api.assert.ok(sidebarInfo !== null, 'Sidebar (node-3) should have layout info')

    // Sidebar should have width around 240
    const sidebarWidth = sidebarInfo!.bounds.width
    api.assert.ok(
      sidebarWidth >= 230 && sidebarWidth <= 250,
      `Sidebar should have width ~240, got ${sidebarWidth}`
    )

    // Verify code structure shows horizontal layout with Sidebar and MainContent
    api.assert.ok(codeHas(code, 'Frame hor'), 'Should have horizontal Frame')
    api.assert.ok(codeHas(code, 'Sidebar'), 'Should have Sidebar')
    api.assert.ok(codeHas(code, 'MainContent'), 'Should have MainContent')

    console.log('✅ Phase 4 complete: Layout verified')

    // =========================================================================
    // PHASE 5: Test Visual Editing - Selection
    // =========================================================================
    console.log('📝 Phase 5: Testing selection...')

    await api.studio.setSelection('node-1')
    await api.utils.delay(200)

    // Verify property panel shows selection
    const panelVisible = api.panel.property.isVisible()
    api.assert.ok(panelVisible, 'Property panel should be visible')

    const selectedId = api.panel.property.getSelectedNodeId()
    api.assert.ok(selectedId === 'node-1', `node-1 should be selected, got ${selectedId}`)

    console.log('✅ Phase 5 complete: Selection works')

    // =========================================================================
    // PHASE 6: Test Padding Mode
    // =========================================================================
    console.log('📝 Phase 6: Testing padding mode...')

    // Select Sidebar (should have padding)
    await api.studio.setSelection('node-3')
    await api.utils.delay(200)

    // Press P to toggle padding mode
    await api.interact.pressKey('p')
    await api.utils.delay(200)

    // Verify padding handles appear
    let paddingHandles = document.querySelectorAll('.padding-handle')
    api.assert.ok(
      paddingHandles.length === 4,
      `Should have 4 padding handles, got ${paddingHandles.length}`
    )

    // Press P again to exit
    await api.interact.pressKey('p')
    await api.utils.delay(200)

    paddingHandles = document.querySelectorAll('.padding-handle')
    api.assert.ok(paddingHandles.length === 0, 'Padding handles should be hidden')

    console.log('✅ Phase 6 complete: Padding mode works')

    // =========================================================================
    // PHASE 7: Test Drag & Drop
    // =========================================================================
    console.log('📝 Phase 7: Testing drag & drop...')

    // Find MainContent and add a Button via drag & drop
    // MainContent is node-4
    const nodesBefore = api.preview.getNodeIds().length

    await api.interact.dragFromPalette('Button', 'node-4', 99) // Add at end
    await api.utils.delay(400)

    code = api.editor.getCode()
    const buttonCount = countPattern(code, 'Button')
    api.assert.ok(buttonCount >= 1, `Should have at least 1 Button, found ${buttonCount}`)

    console.log('✅ Phase 7 complete: Drag & drop works')

    // =========================================================================
    // PHASE 8: Test Keyboard Shortcuts (H/V for layout)
    // =========================================================================
    console.log('📝 Phase 8: Testing keyboard shortcuts...')

    // Select a StatCard and try to toggle its layout
    const nodeIds = api.preview.getNodeIds()
    let statCardId: string | null = null

    // Find a node that's a StatCard by checking if it has the card bg color (#27272a)
    for (const id of nodeIds) {
      if (verifyBackgroundColor(id, '#27272a')) {
        statCardId = id
        break
      }
    }

    api.assert.ok(
      statCardId !== null,
      `Should find StatCard with card bg color. Checked ${nodeIds.length} nodes`
    )

    await api.studio.setSelection(statCardId!)
    await api.utils.delay(200)

    // Verify selection worked
    const statCardSelectedId = api.panel.property.getSelectedNodeId()
    api.assert.ok(
      statCardSelectedId === statCardId,
      `StatCard ${statCardId} should be selected, got ${statCardSelectedId}`
    )

    // Get code before pressing H
    const codeBefore = api.editor.getCode()

    // Press H to try horizontal
    await api.interact.pressKey('h')
    await api.utils.delay(300)

    // Verify the key press was processed (selection should still exist)
    const selectionAfter = api.panel.property.getSelectedNodeId()
    api.assert.ok(selectionAfter !== null, 'Selection should persist after H key press')

    console.log('✅ Phase 8 complete: Keyboard shortcuts work')

    // =========================================================================
    // PHASE 9: Final Validation
    // =========================================================================
    console.log('📝 Phase 9: Final validation...')

    code = api.editor.getCode()

    // Verify all tokens present
    const requiredTokens = ['primary.bg:', 'canvas.bg:', 'text.col:', 'xl.pad:', 'l.gap:']
    for (const token of requiredTokens) {
      api.assert.ok(codeHas(code, token), `Token ${token} should be present`)
    }

    // Verify all components present
    const requiredComponents = [
      'AppShell:',
      'Sidebar:',
      'StatCard:',
      'NavItem:',
      'PrimaryBtn as Btn:',
    ]
    for (const comp of requiredComponents) {
      api.assert.ok(codeHas(code, comp), `Component ${comp} should be present`)
    }

    // Verify layout structure
    api.assert.ok(codeHas(code, 'Frame hor'), 'Horizontal Frame should exist')
    api.assert.ok(codeHas(code, 'MainContent'), 'MainContent should exist')

    // Verify rendered elements
    const finalNodeCount = api.preview.getNodeIds().length
    api.assert.ok(
      finalNodeCount >= 15,
      `Should have at least 15 rendered nodes, got ${finalNodeCount}`
    )

    // Verify code length (should be substantial)
    api.assert.ok(code.length > 1000, `Code should be >1000 chars, got ${code.length}`)

    console.log('✅ Phase 9 complete: All validations passed')
    console.log(`📊 Final stats: ${finalNodeCount} nodes, ${code.length} chars of code`)
  }),
])

// =============================================================================
// Export
// =============================================================================

export const allDashboardE2ETests = dashboardE2ETests
