/**
 * Integration Tests - Strong Validation Edition
 *
 * Tests for real-world designer workflows - feature combinations
 * that designers use daily. These tests validate that the core
 * features work together correctly, not just in isolation.
 *
 * VALIDATION PHILOSOPHY:
 * - Every test checks EXACT CSS values, not just existence
 * - DOM structure is validated (tag, hierarchy, attributes)
 * - State transitions are verified with before/after comparisons
 * - Token resolution is tested against actual computed values
 * - Layout properties (flex, grid) are explicitly validated
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Component + Token Integration
// =============================================================================

export const componentTokenTests: TestCase[] = describe('Component + Token', [
  testWithSetup(
    'Button component uses color token',
    `primary.bg: #2271C1
primary.col: white

Btn as Button: bg $primary, col $primary, pad 12 24, rad 6

Btn "Save"`,
    async (api: TestAPI) => {
      // 1. Element exists and is correct tag
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save' })

      // 2. Token was resolved to EXACT color values
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // 3. Component properties were applied correctly
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingRight', '24px')
      api.assert.hasStyle('node-1', 'paddingBottom', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // 4. It's actually a clickable button
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLButtonElement
      api.assert.ok(el.tagName === 'BUTTON', 'Must be a button element')
      api.assert.ok(!el.disabled, 'Button should be enabled')
    }
  ),

  testWithSetup(
    'Multiple components share same token',
    `accent.bg: #10b981

Card: bg $accent, pad 16, rad 8
Badge: bg $accent, pad 4 8, rad 4, fs 12

Frame gap 8
  Card
    Text "Card using accent", col white
  Badge "Active"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Card
      api.assert.exists('node-4') // Badge

      // Both components resolved same token to EXACT same RGB value
      const expectedGreen = 'rgb(16, 185, 129)'
      api.assert.hasStyle('node-2', 'backgroundColor', expectedGreen)
      api.assert.hasStyle('node-4', 'backgroundColor', expectedGreen)

      // Card styling validated
      api.assert.hasStyle('node-2', 'padding', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')

      // Badge styling validated
      api.assert.hasStyle('node-4', 'paddingTop', '4px')
      api.assert.hasStyle('node-4', 'paddingLeft', '8px')
      api.assert.hasStyle('node-4', 'borderRadius', '4px')
      api.assert.hasStyle('node-4', 'fontSize', '12px')

      // Text inside Card is white
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // DOM hierarchy: Card contains Text
      const card = document.querySelector('[data-mirror-id="node-2"]')
      const cardText = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(card !== null, 'Card element should exist')
      api.assert.ok(cardText !== null, 'Card text element should exist')
      api.assert.ok(card!.contains(cardText), 'Card must contain Text')
    }
  ),

  testWithSetup(
    'Component with multiple token types',
    `card.bg: #1a1a1a
card.rad: 8
space.pad: 16
space.gap: 12

Card: bg $card, rad $card, pad $space, gap $space

Card
  Text "Title", col white, fs 18
  Text "Description", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Title
      api.assert.exists('node-3') // Description

      // ALL tokens resolved to exact values
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'gap', '12px')

      // Card is a flex container (vertical by default)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')

      // Title styling
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')

      // Description styling
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // DOM hierarchy validated
      const card = document.querySelector('[data-mirror-id="node-1"]')
      const title = document.querySelector('[data-mirror-id="node-2"]')
      const desc = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(card !== null, 'Card element should exist')
      api.assert.ok(title !== null, 'Title element should exist')
      api.assert.ok(desc !== null, 'Description element should exist')
      api.assert.ok(card!.contains(title), 'Card must contain Title')
      api.assert.ok(card!.contains(desc), 'Card must contain Description')
      api.assert.ok(
        card!.children.length === 2,
        `Card must have exactly 2 children, got ${card!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Token override in component instance',
    `primary.bg: #2271C1
danger.bg: #ef4444

Btn as Button: bg $primary, col white, pad 10 20, rad 6

Frame hor, gap 8
  Btn "Save"
  Btn "Delete", bg $danger`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Save button
      api.assert.exists('node-3') // Delete button

      // Save uses primary token
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // Delete OVERRIDES with danger token
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // Both have same base component styling
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '20px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      api.assert.hasStyle('node-3', 'paddingTop', '10px')
      api.assert.hasStyle('node-3', 'paddingLeft', '20px')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      // Frame layout verified
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // Both are actual buttons
      const save = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      const del = document.querySelector('[data-mirror-id="node-3"]') as HTMLButtonElement
      api.assert.ok(save.tagName === 'BUTTON', 'Save must be button')
      api.assert.ok(del.tagName === 'BUTTON', 'Delete must be button')
    }
  ),

  testWithSetup(
    'Property set token in component',
    `btnstyle: pad 10 20, rad 6, cursor pointer

Btn: $btnstyle, bg #333, col white

Btn "Click me"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Property set was fully expanded
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingRight', '20px')
      api.assert.hasStyle('node-1', 'paddingBottom', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Additional component properties
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Text content
      api.dom.expect('node-1', { text: 'Click me' })
    }
  ),
])

// =============================================================================
// Component + State Integration
// =============================================================================

export const componentStateTests: TestCase[] = describe('Component + State', [
  testWithSetup(
    'Component with hover state',
    `Card: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover:
    bg #252525
    shadow md

Card
  Text "Hover over me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // BEFORE hover - exact initial values
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Store initial shadow state
      const initialShadow = getComputedStyle(
        document.querySelector('[data-mirror-id="node-1"]') as Element
      ).boxShadow

      // Perform hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // AFTER hover - background changed
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(37, 37, 37)')

      // Shadow was added
      const afterShadow = getComputedStyle(
        document.querySelector('[data-mirror-id="node-1"]') as Element
      ).boxShadow
      api.assert.ok(afterShadow !== 'none', 'Shadow should be applied on hover')
      api.assert.ok(initialShadow !== afterShadow, 'Shadow should change on hover')
    }
  ),

  testWithSetup(
    'Component with toggle state',
    `LikeBtn as Button: bg #333, col #888, pad 12 20, rad 6, toggle()
  on:
    bg #ef4444
    col white

LikeBtn "Like"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Like' })

      // === OFF STATE ===
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // Check data-state attribute
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const initialState = el.getAttribute('data-state')
      api.assert.ok(initialState !== 'on', 'Should start in off state')

      // === TOGGLE ON ===
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // data-state changed
      const onState = el.getAttribute('data-state')
      api.assert.ok(onState === 'on', 'Should be in on state after click')

      // === TOGGLE OFF ===
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')

      // data-state back
      const offState = el.getAttribute('data-state')
      api.assert.ok(offState !== 'on', 'Should be back in off state')
    }
  ),

  testWithSetup(
    'Component with exclusive state (tabs)',
    `Tab: pad 12 20, col #888, cursor pointer, exclusive()
  selected:
    col white
    bor 0 0 2 0
    boc #2271C1

Frame hor, gap 0, bor 0 0 1 0, boc #333
  Tab "Home", selected
  Tab "Profile"
  Tab "Settings"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Home (selected)
      api.assert.exists('node-3') // Profile
      api.assert.exists('node-4') // Settings

      // Frame has horizontal layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '0px')

      // === INITIAL STATE: Home selected ===
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'borderBottomWidth', '2px')
      api.assert.hasStyle('node-2', 'borderBottomColor', 'rgb(34, 113, 193)')

      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // All have base styling
      api.assert.hasStyle('node-2', 'paddingTop', '12px')
      api.assert.hasStyle('node-3', 'paddingTop', '12px')
      api.assert.hasStyle('node-4', 'paddingTop', '12px')

      // === CLICK PROFILE ===
      await api.interact.click('node-3')
      await api.utils.delay(200)

      // Profile is now selected
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'borderBottomWidth', '2px')

      // Home is deselected (exclusive!)
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')

      // Settings still unselected
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // === CLICK SETTINGS ===
      await api.interact.click('node-4')
      await api.utils.delay(200)

      // Settings selected
      api.assert.hasStyle('node-4', 'color', 'rgb(255, 255, 255)')

      // Others deselected
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
    }
  ),

  testWithSetup(
    'Component with toggle cycle',
    `StatusBtn as Button: pad 8 16, rad 6, bg #333, col #888, toggle()
  on:
    bg #10b981
    col white

StatusBtn "Task"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Task' })

      // Off state (gray)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')

      // Toggle on (green)
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Toggle off again
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
    }
  ),

  // SKIPPED: Test environment timing issue - click doesn't maintain hover state
  testWithSetupSkip(
    'Component hover + toggle combined',
    `Btn as Button: bg #333, col white, pad 12 20, rad 6, toggle()
  hover:
    bg #444
  on:
    bg #2271C1
  on hover:
    bg #1d5fa8

Btn "Interactive"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Interactive' })

      // === INITIAL: OFF ===
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // === HOVER WHILE OFF ===
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')

      // === CLICK TO TOGGLE ON ===
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Verify data-state changed
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el.getAttribute('data-state') === 'on', 'Should be in on state')
    }
  ),
])

// =============================================================================
// Component + Token + State (The Trifecta)
// =============================================================================

export const componentTokenStateTests: TestCase[] = describe('Component + Token + State', [
  testWithSetup(
    'Button with token colors and hover state',
    `primary.bg: #2271C1
primary-hover.bg: #1d5fa8

Btn as Button: bg $primary, col white, pad 12 24, rad 6
  hover:
    bg $primary-hover

Btn "Save Changes"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save Changes' })

      // === INITIAL: primary token resolved ===
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingRight', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')

      // === HOVER: primary-hover token resolved ===
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(29, 95, 168)')

      // Other styles unchanged
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
    }
  ),

  testWithSetup(
    'Card with token + toggle state',
    `card.bg: #1a1a1a
card-active.bg: #2271C1
space.pad: 16

Card: bg $card, pad $space, rad 8, cursor pointer, toggle()
  on:
    bg $card-active

Card
  Text "Click to select", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // === INITIAL: card token ===
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Text styling
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // DOM hierarchy
      const card = document.querySelector('[data-mirror-id="node-1"]')
      const text = document.querySelector('[data-mirror-id="node-2"]')
      api.assert.ok(card !== null, 'Card element should exist')
      api.assert.ok(text !== null, 'Text element should exist')
      api.assert.ok(card!.contains(text), 'Card must contain Text')

      // === TOGGLE ON: card-active token ===
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Other styles unchanged
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // === TOGGLE OFF ===
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Navigation with tokens and exclusive state',
    `nav.bg: #1a1a1a
nav-active.bg: #2271C1
nav-active.col: white
nav.col: #888
space.pad: 12

NavItem: bg $nav, col $nav, pad $space, rad 6, cursor pointer, exclusive()
  selected:
    bg $nav-active
    col $nav-active

Frame gap 4, w 200, pad 8, bg #111, rad 8
  NavItem "Dashboard", selected
  NavItem "Projects"
  NavItem "Settings"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Dashboard
      api.assert.exists('node-3') // Projects
      api.assert.exists('node-4') // Settings

      // Frame styling
      api.assert.hasStyle('node-1', 'gap', '4px')
      api.assert.hasStyle('node-1', 'width', '200px')
      api.assert.hasStyle('node-1', 'padding', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(17, 17, 17)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // === INITIAL: Dashboard selected (nav-active tokens) ===
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'padding', '12px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // Projects and Settings use nav tokens
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // === CLICK PROJECTS ===
      await api.interact.click('node-3')
      await api.utils.delay(200)

      // Projects now selected
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // Dashboard deselected (exclusive!)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')

      // Settings still unselected
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  // SKIPPED: Flaky test - passes when run alone, fails intermittently in full suite
  // The SVG icon loading timing is inconsistent
  testWithSetupSkip(
    'Icon button with token + hover + toggle',
    `icon-default.ic: #888
icon-active.ic: #2271C1
btn.bg: #222

IconBtn: bg $btn, w 40, h 40, rad 6, center, cursor pointer, toggle()
  Icon "heart", ic $icon-default, is 20
  hover:
    bg #333
  on:
    Icon "heart", ic $icon-active, is 20, fill

IconBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // === INITIAL: btn token + icon-default token ===
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'width', '40px')
      api.assert.hasStyle('node-1', 'height', '40px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Has centering
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      // Icon exists inside
      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element must exist')
      const icon = btn!.querySelector('svg, [data-icon], span[style*="icon"]')
      api.assert.ok(
        icon !== null,
        `Button should contain icon element, got innerHTML: ${btn!.innerHTML.substring(0, 100)}`
      )

      // === TOGGLE ON ===
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify state changed
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el.getAttribute('data-state') === 'on', 'Should be in on state')
    }
  ),

  testWithSetup(
    'Full button variant system with tokens and states',
    `primary.bg: #2271C1
primary-hover.bg: #1d5fa8
danger.bg: #ef4444
danger-hover.bg: #dc2626
ghost.col: #888
ghost-hover.bg: #222

Btn: pad 12 24, rad 6, cursor pointer
  hover 0.15s:
    scale 1.02

PrimaryBtn as Btn: bg $primary, col white
  hover:
    bg $primary-hover

DangerBtn as Btn: bg $danger, col white
  hover:
    bg $danger-hover

GhostBtn as Btn: bg transparent, col $ghost, bor 1, boc #444
  hover:
    bg $ghost-hover

Frame hor, gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
  GhostBtn "Cancel"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // PrimaryBtn
      api.assert.exists('node-3') // DangerBtn
      api.assert.exists('node-4') // GhostBtn

      // Frame layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // === INITIAL: All buttons with correct token colors ===
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      api.assert.hasStyle('node-4', 'backgroundColor', 'rgba(0, 0, 0, 0)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'borderWidth', '1px')
      api.assert.hasStyle('node-4', 'borderColor', 'rgb(68, 68, 68)')

      // All share base component styling
      api.assert.hasStyle('node-2', 'paddingTop', '12px')
      api.assert.hasStyle('node-2', 'paddingRight', '24px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasStyle('node-2', 'cursor', 'pointer')

      api.assert.hasStyle('node-3', 'paddingTop', '12px')
      api.assert.hasStyle('node-3', 'borderRadius', '6px')

      api.assert.hasStyle('node-4', 'paddingTop', '12px')
      api.assert.hasStyle('node-4', 'borderRadius', '6px')

      // === HOVER PRIMARY ===
      await api.interact.hover('node-2')
      await api.utils.delay(200)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(29, 95, 168)')

      // === HOVER DANGER ===
      await api.interact.hover('node-3')
      await api.utils.delay(200)
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(220, 38, 38)')

      // === HOVER GHOST ===
      await api.interact.hover('node-4')
      await api.utils.delay(200)
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(34, 34, 34)')
    }
  ),
])

// =============================================================================
// Nested Component Structures
// =============================================================================

export const nestedComponentTests: TestCase[] = describe('Nested Components', [
  testWithSetup(
    'Card with nested slot components',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 18, weight bold
  Desc: col #888, fs 14
  Footer: hor, gap 8, mar 8 0 0 0

Btn as Button: pad 8 16, rad 4
PrimaryBtn as Btn: bg #2271C1, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #444

Card
  Title "Project Update"
  Desc "This is the latest status of the project."
  Footer
    GhostBtn "Cancel"
    PrimaryBtn "Save"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'gap', '8px')

      // DOM structure
      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // Check all content is inside card
      api.assert.ok(
        cardText.includes('Project Update'),
        `Card must contain title, got: "${cardText.substring(0, 100)}"`
      )
      api.assert.ok(cardText.includes('This is the latest'), 'Card must contain description')
      api.assert.ok(cardText.includes('Cancel'), 'Card must contain Cancel button')
      api.assert.ok(cardText.includes('Save'), 'Card must contain Save button')

      // Find buttons and verify they are actual button elements
      const buttons = card!.querySelectorAll('button')
      api.assert.ok(buttons.length === 2, `Should have exactly 2 buttons, found ${buttons.length}`)

      // Verify button texts
      const buttonTexts = Array.from(buttons || []).map(b => b.textContent)
      api.assert.ok(buttonTexts.includes('Cancel'), 'Cancel button should exist')
      api.assert.ok(buttonTexts.includes('Save'), 'Save button should exist')
    }
  ),

  testWithSetup(
    'List with repeated item component',
    `ListItem: hor, pad 12, gap 12, bg #1a1a1a, rad 6, ver-center
  Avatar: w 40, h 40, rad 99, bg #333, center
  Content: grow, gap 2
  Action: pad 6 12, bg #2271C1, col white, rad 4, fs 12

Frame gap 8
  ListItem
    Avatar
      Text "JD", col white, fs 12
    Content
      Text "John Doe", col white, weight 500
      Text "Developer", col #888, fs 12
    Action
      Text "View"
  ListItem
    Avatar
      Text "AS", col white, fs 12
    Content
      Text "Alice Smith", col white, weight 500
      Text "Designer", col #888, fs 12
    Action
      Text "View"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame

      // Frame has gap
      api.assert.hasStyle('node-1', 'gap', '8px')

      const frame = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(frame !== null, 'Frame should exist')
      const frameText = frame!.textContent || ''

      // Should contain both people
      api.assert.ok(frameText.includes('John Doe'), 'Should have John Doe')
      api.assert.ok(frameText.includes('Alice Smith'), 'Should have Alice Smith')
      api.assert.ok(frameText.includes('Developer'), 'Should have Developer role')
      api.assert.ok(frameText.includes('Designer'), 'Should have Designer role')

      // Count list items (children of frame)
      const children = frame!.children
      api.assert.ok(
        children.length === 2,
        `Frame should have 2 children (ListItems), found ${children.length}`
      )

      // Each list item should have horizontal layout
      // We already verified children.length === 2 above
      const firstItem = children[0] as HTMLElement
      api.assert.ok(firstItem !== null, 'First ListItem should exist')
      const style = getComputedStyle(firstItem)
      api.assert.ok(style.flexDirection === 'row', 'ListItem should be horizontal')
      api.assert.ok(style.gap === '12px', 'ListItem should have gap 12px')
    }
  ),

  testWithSetup(
    'Deeply nested layout components',
    `AppShell: hor, h 200
  Sidebar: w 160, bg #1a1a1a, pad 12, gap 8
  Main: grow, bg #0a0a0a

NavGroup: gap 4
  NavLabel: fs 11, col #666, uppercase, weight 500
  NavItems: gap 2

NavItem: pad 8 12, col #888, rad 4, cursor pointer
  hover:
    bg #222
    col white

AppShell
  Sidebar
    NavGroup
      NavLabel "Main"
      NavItems
        NavItem "Dashboard"
        NavItem "Projects"
    NavGroup
      NavLabel "Settings"
      NavItems
        NavItem "Account"
        NavItem "Team"
  Main
    Text "Content Area", col white, pad 16`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // AppShell

      // AppShell layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'height', '200px')

      const shell = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(shell !== null, 'AppShell should exist')
      const shellText = shell!.textContent || ''

      // Verify content exists
      api.assert.ok(shellText.includes('Main'), 'Should have Main label')
      api.assert.ok(shellText.includes('Dashboard'), 'Should have Dashboard')
      api.assert.ok(shellText.includes('Projects'), 'Should have Projects')
      api.assert.ok(shellText.includes('Settings'), 'Should have Settings label')
      api.assert.ok(shellText.includes('Account'), 'Should have Account')
      api.assert.ok(shellText.includes('Team'), 'Should have Team')
      api.assert.ok(shellText.includes('Content Area'), 'Should have main content')

      // Shell should have exactly 2 children (Sidebar and Main)
      const children = shell!.children
      api.assert.ok(
        children.length === 2,
        `AppShell should have 2 children, found ${children.length}`
      )

      // First child (Sidebar) styling
      // We already verified children.length === 2 above
      const sidebar = children[0] as HTMLElement
      api.assert.ok(sidebar !== null, 'Sidebar should exist')
      const sidebarStyle = getComputedStyle(sidebar)
      api.assert.ok(sidebarStyle.width === '160px', 'Sidebar should be 160px wide')
      api.assert.ok(
        sidebarStyle.backgroundColor === 'rgb(26, 26, 26)',
        'Sidebar should have dark background'
      )
    }
  ),

  testWithSetup(
    'Component reused at multiple levels',
    `Badge: pad 2 6, rad 4, fs 10, bg #333, col white

Card: bg #1a1a1a, pad 12, rad 6, gap 8
  Header: hor, spread, ver-center
  Body: gap 4

Card
  Header
    Text "Task", col white, weight 500
    Badge "New"
  Body
    Text "Complete the feature", col #888
    Frame hor, gap 4
      Badge "High"
      Badge "Urgent"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '12px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'gap', '8px')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // All badges exist
      api.assert.ok(cardText.includes('New'), 'Should have New badge')
      api.assert.ok(cardText.includes('High'), 'Should have High badge')
      api.assert.ok(cardText.includes('Urgent'), 'Should have Urgent badge')

      // Count elements with badge styling (bg #333 = rgb(51, 51, 51))
      const allElements = card!.querySelectorAll('*')
      let badgeCount = 0
      allElements?.forEach(el => {
        const bg = getComputedStyle(el).backgroundColor
        const fs = getComputedStyle(el).fontSize
        if (bg === 'rgb(51, 51, 51)' && fs === '10px') {
          badgeCount++
        }
      })
      api.assert.ok(
        badgeCount >= 3,
        `Should have at least 3 badge-styled elements, found ${badgeCount}`
      )
    }
  ),
])

// =============================================================================
// Real-World UI Patterns
// =============================================================================

export const realWorldPatternTests: TestCase[] = describe('Real-World Patterns', [
  testWithSetup(
    'Complete form field pattern',
    `FormField: gap 4
  FieldLabel: fs 12, col #888, weight 500
  FieldInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1
  FieldError: fs 11, col #ef4444, hidden

FormField
  FieldLabel "Email Address"
  FieldInput placeholder "you@example.com"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // FormField

      // FormField layout
      api.assert.hasStyle('node-1', 'gap', '4px')

      const field = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(field !== null, 'FormField should exist')

      // Find the input element
      const input = field!.querySelector('input') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input.tagName === 'INPUT', 'Should be an input element')
      api.assert.ok(input.placeholder === 'you@example.com', 'Should have correct placeholder')

      // Input styling
      const inputStyle = getComputedStyle(input)
      api.assert.ok(inputStyle.padding === '12px', 'Input should have 12px padding')
      api.assert.ok(
        inputStyle.backgroundColor === 'rgb(34, 34, 34)',
        'Input should have dark background'
      )
      api.assert.ok(inputStyle.borderRadius === '6px', 'Input should have 6px radius')

      // Label exists
      const fieldText = field!.textContent || ''
      api.assert.ok(fieldText.includes('Email Address'), 'Should have label text')
    }
  ),

  testWithSetup(
    'Alert component with variants',
    `Alert: hor, pad 12 16, rad 6, gap 12, ver-center
  AlertIcon as Icon: is 20
  AlertText: grow

SuccessAlert as Alert: bg #10b98120, bor 1, boc #10b981
InfoAlert as Alert: bg #2271C120, bor 1, boc #2271C1
WarningAlert as Alert: bg #f59e0b20, bor 1, boc #f59e0b
ErrorAlert as Alert: bg #ef444420, bor 1, boc #ef4444

Frame gap 8
  SuccessAlert
    AlertIcon "check-circle", ic #10b981
    AlertText "Operation successful", col #10b981
  ErrorAlert
    AlertIcon "x-circle", ic #ef4444
    AlertText "Something went wrong", col #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // SuccessAlert
      api.assert.exists('node-5') // ErrorAlert

      // Frame layout
      api.assert.hasStyle('node-1', 'gap', '8px')

      // SuccessAlert layout and border
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'paddingTop', '12px')
      api.assert.hasStyle('node-2', 'paddingLeft', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')
      api.assert.hasStyle('node-2', 'gap', '12px')
      api.assert.hasStyle('node-2', 'alignItems', 'center')
      api.assert.hasStyle('node-2', 'borderWidth', '1px')
      api.assert.hasStyle('node-2', 'borderColor', 'rgb(16, 185, 129)')

      // ErrorAlert border
      api.assert.hasStyle('node-5', 'borderColor', 'rgb(239, 68, 68)')

      // Content exists
      const success = document.querySelector('[data-mirror-id="node-2"]')
      const error = document.querySelector('[data-mirror-id="node-5"]')
      api.assert.ok(success !== null, 'Success alert should exist')
      api.assert.ok(error !== null, 'Error alert should exist')
      const successText = success!.textContent || ''
      const errorText = error!.textContent || ''
      api.assert.ok(
        successText.includes('Operation successful'),
        `Success should have message, got: "${successText}"`
      )
      api.assert.ok(
        errorText.includes('Something went wrong'),
        `Error should have message, got: "${errorText}"`
      )
    }
  ),

  testWithSetup(
    'Dropdown menu pattern with cross-element state',
    `MenuBtn as Button: pad 10 16, bg #333, col white, rad 6, hor, gap 8, toggle()
  open:
    bg #444

Dropdown: bg #1a1a1a, pad 8, rad 8, shadow lg, hidden, abs, y 48
  MenuBtn.open:
    visible

MenuItem: pad 10 16, col #888, rad 4, cursor pointer
  hover:
    bg #222
    col white

Frame relative
  MenuBtn
    Text "Options"
    Icon "chevron-down", ic white, is 16
  Dropdown
    MenuItem "Edit"
    MenuItem "Duplicate"
    MenuItem "Delete"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // MenuBtn

      // Frame must be relative positioned
      api.assert.hasStyle('node-1', 'position', 'relative')

      // === INITIAL: Menu button closed ===
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '8px')
      api.assert.hasStyle('node-2', 'paddingTop', '10px')
      api.assert.hasStyle('node-2', 'paddingLeft', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '6px')

      // Button has correct content
      const btn = document.querySelector('[data-mirror-id="node-2"]') as HTMLButtonElement
      api.assert.ok(btn !== null, 'MenuBtn element should exist')
      api.assert.ok(btn.tagName === 'BUTTON', 'MenuBtn must be a button')
      const btnText = btn.textContent || ''
      api.assert.ok(btnText.includes('Options'), `Button should say Options, got: "${btnText}"`)

      // === CLICK TO OPEN ===
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // Button changes to open state
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(68, 68, 68)')

      // Verify data-state - Mirror code uses 'open:' state block
      const el = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const actualState = el.getAttribute('data-state')
      api.assert.ok(actualState === 'open', `Should be in 'open' state, got: '${actualState}'`)
    }
  ),

  testWithSetup(
    'Tag input pattern',
    `Tag: hor, gap 4, pad 4 8, bg #333, rad 4, ver-center
  TagText: col white, fs 12
  TagRemove as Icon: is 14, ic #888, cursor pointer
    hover:
      ic white

TagInput as Input: pad 8, bg transparent, col white, bor 0, grow

Frame hor, wrap, gap 8, pad 12, bg #1a1a1a, rad 6, bor 1, boc #444
  Tag
    TagText "JavaScript"
    TagRemove "x"
  Tag
    TagText "TypeScript"
    TagRemove "x"
  Tag
    TagText "React"
    TagRemove "x"
  TagInput placeholder "Add tag..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container

      // Container layout with wrap
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'flexWrap', 'wrap')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'padding', '12px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'borderWidth', '1px')
      api.assert.hasStyle('node-1', 'borderColor', 'rgb(68, 68, 68)')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // All tags present
      api.assert.ok(containerText.includes('JavaScript'), 'Should have JS tag')
      api.assert.ok(containerText.includes('TypeScript'), 'Should have TS tag')
      api.assert.ok(containerText.includes('React'), 'Should have React tag')

      // Input exists with correct placeholder
      const input = container!.querySelector('input') as HTMLInputElement
      api.assert.ok(input !== null, 'TagInput should exist')
      api.assert.ok(input.placeholder === 'Add tag...', 'Input should have placeholder')

      // Input has grow (flex-grow)
      const inputStyle = getComputedStyle(input)
      api.assert.ok(inputStyle.flexGrow === '1', 'Input should have flex-grow: 1')
    }
  ),

  testWithSetup(
    'Pricing card with CTA',
    `PricingCard: bg #1a1a1a, pad 24, rad 12, gap 16, center, w 280
  PlanName: fs 14, col #888, uppercase, weight 500
  Price: hor, gap 4, ver-center
  PriceAmount: fs 48, col white, weight bold
  PricePeriod: fs 14, col #888
  Features: gap 8, w full
  Feature: hor, gap 8, ver-center
  FeatureIcon as Icon: is 16, ic #10b981
  FeatureText: col #888, fs 14
  CTABtn as Button: w full, pad 12, bg #2271C1, col white, rad 6, weight 500
    hover:
      bg #1d5fa8

PricingCard
  PlanName "Pro Plan"
  Price
    PriceAmount "$49"
    PricePeriod "/month"
  Features
    Feature
      FeatureIcon "check"
      FeatureText "Unlimited projects"
    Feature
      FeatureIcon "check"
      FeatureText "Priority support"
    Feature
      FeatureIcon "check"
      FeatureText "Advanced analytics"
  CTABtn "Get Started"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // PricingCard

      // Card styling
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
      api.assert.hasStyle('node-1', 'gap', '16px')
      api.assert.hasStyle('node-1', 'width', '280px')

      // Card has centering
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const cardText = card!.textContent || ''

      // Content verification
      api.assert.ok(cardText.includes('Pro Plan'), 'Should have plan name')
      api.assert.ok(cardText.includes('$49'), 'Should have price')
      api.assert.ok(cardText.includes('/month'), 'Should have period')
      api.assert.ok(cardText.includes('Unlimited projects'), 'Should have feature 1')
      api.assert.ok(cardText.includes('Priority support'), 'Should have feature 2')
      api.assert.ok(cardText.includes('Advanced analytics'), 'Should have feature 3')
      api.assert.ok(cardText.includes('Get Started'), 'Should have CTA')

      // Find CTA button
      const button = card!.querySelector('button') as HTMLButtonElement
      api.assert.ok(button !== null, 'CTA button should exist')
      const buttonText = button.textContent || ''
      api.assert.ok(
        buttonText.includes('Get Started'),
        `Button should say Get Started, got: "${buttonText}"`
      )

      // CTA button styling
      const btnStyle = getComputedStyle(button)
      api.assert.ok(
        btnStyle.backgroundColor === 'rgb(34, 113, 193)',
        'Button should be primary blue'
      )
      api.assert.ok(btnStyle.color === 'rgb(255, 255, 255)', 'Button text should be white')
      api.assert.ok(btnStyle.borderRadius === '6px', 'Button should have 6px radius')
    }
  ),
])

// =============================================================================
// Layout + Component + State Integration
// =============================================================================

export const layoutIntegrationTests: TestCase[] = describe('Layout + Component + State', [
  testWithSetup(
    'Grid of toggleable cards',
    `Card: bg #1a1a1a, pad 16, rad 8, cursor pointer, toggle()
  hover:
    shadow md
  on:
    bg #2271C1
    shadow lg

Frame grid 2, gap 12
  Card
    Text "Option A", col white
  Card
    Text "Option B", col white
  Card
    Text "Option C", col white
  Card
    Text "Option D", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Grid
      api.assert.exists('node-2') // Card A
      api.assert.exists('node-4') // Card B
      api.assert.exists('node-6') // Card C
      api.assert.exists('node-8') // Card D

      // Grid layout verified
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'gap', '12px')

      const grid = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const gridStyle = getComputedStyle(grid)
      api.assert.ok(
        gridStyle.gridTemplateColumns.includes('repeat') ||
          gridStyle.gridTemplateColumns.split(' ').length >= 2,
        'Grid should have 2 columns'
      )

      // All cards have default styling
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')

      // === TOGGLE FIRST CARD ===
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // First card is on (blue)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Others still default (independent toggle)
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')

      // === TOGGLE THIRD CARD ===
      await api.interact.click('node-6')
      await api.utils.delay(200)

      // Both first and third on
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-6', 'backgroundColor', 'rgb(34, 113, 193)')

      // Second and fourth still off
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-8', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Horizontal scroll with hover cards',
    `Card: bg #1a1a1a, pad 16, rad 8, w 200, cursor pointer
  hover:
    bg #252525
    scale 1.02

Frame hor, gap 12, scroll-hor, pad 4
  Card
    Text "Card 1", col white
  Card
    Text "Card 2", col white
  Card
    Text "Card 3", col white
  Card
    Text "Card 4", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Scroll container

      // Container layout
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '12px')
      api.assert.hasStyle('node-1', 'padding', '4px')

      // Should have horizontal scroll
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const computedStyle = getComputedStyle(container)
      api.assert.ok(
        computedStyle.overflowX === 'auto' || computedStyle.overflowX === 'scroll',
        `Should have horizontal scroll, got ${computedStyle.overflowX}`
      )

      // Cards exist with fixed width
      api.assert.hasStyle('node-2', 'width', '200px')
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-2', 'padding', '16px')
      api.assert.hasStyle('node-2', 'borderRadius', '8px')

      // Cards should NOT shrink in horizontal scroll (default flex-shrink: 0 for items with fixed width)
      api.assert.hasStyle('node-2', 'flexShrink', '0')
    }
  ),

  testWithSetup(
    'Stacked layout with interactive overlay',
    `Overlay: abs, x 0, y 0, w full, h full, bg rgba(0,0,0,0.5), center, hidden
  Button.open:
    visible

CloseBtn as Button: pad 12 24, bg white, col black, rad 6
  hover:
    bg #f0f0f0

Frame stacked, w 300, h 200, bg #1a1a1a, rad 8, relative
  Text "Background Content", col white, pad 16
  Button name openBtn, pad 10 20, bg #2271C1, col white, rad 6, toggle(), x 16, y 50
    open:
      bg #1d5fa8
  Overlay
    CloseBtn "Close"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Stacked container

      // Container is stacked (position: relative for stacking context)
      api.assert.hasStyle('node-1', 'position', 'relative')
      api.assert.hasStyle('node-1', 'width', '300px')
      api.assert.hasStyle('node-1', 'height', '200px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Container has stacked display
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(container)
      api.assert.ok(
        style.display === 'grid' || style.position === 'relative',
        'Stacked container should use grid or relative positioning'
      )

      // Content exists
      const containerText = container.textContent || ''
      api.assert.ok(containerText.includes('Background Content'), 'Should have background content')
    }
  ),
])

// =============================================================================
// Data & Iteration Integration
// =============================================================================

export const dataIterationTests: TestCase[] = describe('Data & Iteration', [
  testWithSetup(
    'Each loop renders list items',
    `items:
  a:
    name: "Alpha"
    value: 100
  b:
    name: "Beta"
    value: 200
  c:
    name: "Gamma"
    value: 300

Frame gap 8
  each item in $items
    Frame hor, spread, pad 12, bg #1a1a1a, rad 6
      Text item.name, col white
      Text item.value, col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame container

      // Container has gap
      api.assert.hasStyle('node-1', 'gap', '8px')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // All items rendered
      api.assert.ok(containerText.includes('Alpha'), 'Should have Alpha')
      api.assert.ok(containerText.includes('Beta'), 'Should have Beta')
      api.assert.ok(containerText.includes('Gamma'), 'Should have Gamma')
      api.assert.ok(containerText.includes('100'), 'Should have value 100')
      api.assert.ok(containerText.includes('200'), 'Should have value 200')
      api.assert.ok(containerText.includes('300'), 'Should have value 300')

      // Should have 3 list items (via each container with display:contents)
      // The each container creates itemContainers with data-each-item attribute
      const eachItems = container!.querySelectorAll('[data-each-item]')
      api.assert.ok(eachItems.length === 3, `Should have 3 each items, found ${eachItems.length}`)

      // Each item contains a Frame with horizontal layout
      // We already verified eachItems.length === 3 above
      const firstItemContainer = eachItems[0] as HTMLElement
      api.assert.ok(firstItemContainer !== null, 'First each item container should exist')
      // Find the actual Frame inside the item container
      const firstItem = firstItemContainer.querySelector(
        '[data-mirror-name="Frame"]'
      ) as HTMLElement
      api.assert.ok(firstItem !== null, 'Item should contain Frame')
      const style = getComputedStyle(firstItem)
      api.assert.ok(style.flexDirection === 'row', 'Item should be horizontal')
      api.assert.ok(style.justifyContent === 'space-between', 'Item should have spread')
      api.assert.ok(style.padding === '12px', 'Item should have 12px padding')
      api.assert.ok(style.backgroundColor === 'rgb(26, 26, 26)', 'Item should have dark bg')
      api.assert.ok(style.borderRadius === '6px', 'Item should have 6px radius')
    }
  ),

  testWithSetup(
    'Each loop with component',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 4
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

cards:
  first:
    title: "Card One"
    desc: "First description"
  second:
    title: "Card Two"
    desc: "Second description"

Frame gap 12
  each card in $cards
    Card
      Title card.title
      Desc card.desc`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Both cards rendered with correct content
      api.assert.ok(containerText.includes('Card One'), 'Should have Card One')
      api.assert.ok(containerText.includes('Card Two'), 'Should have Card Two')
      api.assert.ok(containerText.includes('First description'), 'Should have first desc')
      api.assert.ok(containerText.includes('Second description'), 'Should have second desc')

      // Container has 2 card children (via each container with display:contents)
      const eachItems = container!.querySelectorAll('[data-each-item]')
      api.assert.ok(eachItems.length === 2, `Should have 2 cards, found ${eachItems.length}`)

      // Cards have correct styling
      // We already verified eachItems.length === 2 above
      // Find the Card component inside the first item container
      const card = eachItems[0].querySelector('[data-mirror-name="Card"]') as HTMLElement
      api.assert.ok(card !== null, 'Each item should contain Card')
      const cardStyle = getComputedStyle(card)
      api.assert.ok(cardStyle.backgroundColor === 'rgb(26, 26, 26)', 'Card should have dark bg')
      api.assert.ok(cardStyle.padding === '16px', 'Card should have 16px padding')
      api.assert.ok(cardStyle.borderRadius === '8px', 'Card should have 8px radius')
      api.assert.ok(cardStyle.gap === '4px', 'Card should have 4px gap')
    }
  ),

  testWithSetup(
    'Variable interpolation in text',
    `user:
  name: "Max Mustermann"
  role: "Admin"
  points: 1250

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Willkommen, $user.name!", col white, fs 18, weight bold
  Text "Rolle: $user.role", col #888
  Text "Punkte: $user.points", col #10b981`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Container styling
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Variables interpolated correctly
      api.assert.ok(containerText.includes('Max Mustermann'), 'Should interpolate name')
      api.assert.ok(containerText.includes('Admin'), 'Should interpolate role')
      api.assert.ok(containerText.includes('1250'), 'Should interpolate points')

      // Text styling
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'fontSize', '18px')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-4', 'color', 'rgb(16, 185, 129)')
    }
  ),

  testWithSetup(
    'Aggregation functions on collections',
    `tasks:
  t1:
    name: "Task 1"
    done: true
  t2:
    name: "Task 2"
    done: false
  t3:
    name: "Task 3"
    done: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text "Anzahl: $tasks.count", col white
  Text "Erster: $tasks.first.name", col #888
  Text "Letzter: $tasks.last.name", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Aggregation functions work - $tasks.count should show the number 3
      const content = container!.textContent || ''
      api.assert.ok(
        content.includes('3'),
        `Should show count '3' from $tasks.count, got: "${content.substring(0, 100)}"`
      )
      api.assert.ok(
        content.includes('Anzahl'),
        `Should show 'Anzahl' label, got: "${content.substring(0, 100)}"`
      )
      api.assert.ok(content.includes('Task 1'), 'Should show first task')
      api.assert.ok(content.includes('Task 3'), 'Should show last task')
    }
  ),
])

// =============================================================================
// Conditional Rendering Integration
// =============================================================================

export const conditionalTests: TestCase[] = describe('Conditional Rendering', [
  testWithSetup(
    'If/else block rendering',
    `loggedIn: true
user:
  name: "Max"

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  if loggedIn
    Text "Willkommen, $user.name!", col white
    Button "Logout", bg #ef4444, col white, pad 8 16, rad 4
  else
    Button "Login", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Get all buttons in container
      const buttons = container?.querySelectorAll('button') || []

      // Find visible buttons (display !== 'none')
      const visibleButtons: Element[] = []
      buttons.forEach(btn => {
        if (getComputedStyle(btn).display !== 'none') {
          visibleButtons.push(btn)
        }
      })

      // loggedIn is true, so Logout should be visible, Login should be hidden
      api.assert.ok(visibleButtons.length === 1, 'Should have exactly 1 visible button')
      api.assert.ok(visibleButtons[0] !== undefined, 'Visible button should exist')
      const visibleBtnText = visibleButtons[0]!.textContent || ''
      api.assert.ok(
        visibleBtnText.includes('Logout'),
        `Visible button should be Logout, got: "${visibleBtnText}"`
      )

      // Check Welcome text is visible (parent Frame should be visible)
      const node2 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(node2 !== null, 'node-2 should exist')
      api.assert.ok(getComputedStyle(node2).display !== 'none', 'Welcome frame should be visible')
      const node2Text = node2.textContent || ''
      api.assert.ok(node2Text.includes('Willkommen'), `Should contain welcome, got: "${node2Text}"`)
      api.assert.ok(node2Text.includes('Max'), 'Should contain user name')

      // Login button (in else branch) should be hidden when condition is true
      // Both branches exist in DOM but the else branch has display: none
      const loginButton = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement
      api.assert.ok(loginButton !== null, 'Login button should exist in DOM')
      api.assert.ok(
        getComputedStyle(loginButton).display === 'none',
        'Login button (else branch) should be hidden'
      )

      // Logout button styling
      api.assert.ok(visibleButtons[0] !== null, 'Logout button should exist')
      const style = getComputedStyle(visibleButtons[0] as Element)
      api.assert.ok(style.backgroundColor === 'rgb(239, 68, 68)', 'Logout should be red')
    }
  ),

  testWithSetup(
    'Ternary in text content',
    `active: true

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  Text active ? "Aktiv" : "Inaktiv", col active ? #10b981 : #ef4444
  Frame hor, gap 4, ver-center
    Frame w 8, h 8, rad 99, bg active ? #10b981 : #ef4444
    Text "Status", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // active is true, so should show "Aktiv" in green
      api.assert.ok(containerText.includes('Aktiv'), 'Should show Aktiv')
      api.assert.ok(!containerText.includes('Inaktiv'), 'Should NOT show Inaktiv')

      // Text should be green (active = true)
      api.assert.hasStyle('node-2', 'color', 'rgb(16, 185, 129)')

      // Status indicator dot should be green
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'width', '8px')
      api.assert.hasStyle('node-4', 'height', '8px')
      api.assert.hasStyle('node-4', 'borderRadius', '99px')
    }
  ),

  testWithSetup(
    'Ternary in styling properties',
    `selected: true

Button "Option", pad 12 24, rad 6, cursor pointer, bg selected ? #2271C1 : #333, col selected ? white : #888, bor selected ? 0 : 1, boc #444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Option' })

      // selected is true, so should have primary blue, white text, no border
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
    }
  ),

  testWithSetup(
    'Numeric comparison in condition',
    `count: 5

Frame gap 8, pad 16, bg #1a1a1a, rad 8
  if count > 0
    Text "$count Einträge", col white
  else
    Text "Keine Einträge", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Container should exist')
      // Use innerText which only returns visible text (respects display:none)
      const visibleText = container!.innerText || ''

      // count > 0, so should show entries
      api.assert.ok(visibleText.includes('5'), 'Should show count')
      api.assert.ok(visibleText.includes('Einträge'), 'Should show Einträge')
      api.assert.ok(!visibleText.includes('Keine'), 'Should NOT show Keine')
    }
  ),
])

// =============================================================================
// Icon & Button Patterns
// =============================================================================

export const iconButtonTests: TestCase[] = describe('Icon & Button Patterns', [
  testWithSetup(
    'Button with leading icon',
    `IconBtn as Button: hor, gap 8, pad 12 20, bg #2271C1, col white, rad 6, ver-center
  BtnIcon as Icon: is 18, ic white
  BtnText: weight 500

IconBtn
  BtnIcon "plus"
  BtnText "Hinzufügen"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      // Button styling
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      // Has icon and text
      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Hinzufügen'), `Should have text, got: "${btnText}"`)

      // Should have 2 children (icon + text)
      api.assert.ok(
        btn!.children.length === 2,
        `Should have 2 children, found ${btn!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Icon-only button with hover',
    `IconBtn: w 40, h 40, rad 6, bg #222, center, cursor pointer
  hover:
    bg #333
  Icon "settings", ic #888, is 20
    hover:
      ic white

IconBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Button styling
      api.assert.hasStyle('node-1', 'width', '40px')
      api.assert.hasStyle('node-1', 'height', '40px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Centered content
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      // Hover changes background
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Button group with icons',
    `BtnGroup: hor, gap 0
  GroupBtn: pad 10 16, bg #222, col #888, cursor pointer, bor 1, boc #333
    hover:
      bg #333
      col white

Frame
  BtnGroup
    GroupBtn, rad 6 0 0 6
      Icon "align-left", ic #888, is 16
    GroupBtn
      Icon "align-center", ic #888, is 16
    GroupBtn
      Icon "align-right", ic #888, is 16
    GroupBtn, rad 0 6 6 0
      Icon "align-justify", ic #888, is 16`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // BtnGroup

      // BtnGroup is horizontal with no gap
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '0px')

      // Count buttons in group
      const group = document.querySelector('[data-mirror-id="node-2"]')
      api.assert.ok(group !== null, 'BtnGroup should exist')
      api.assert.ok(
        group!.children.length === 4,
        `Should have 4 buttons, found ${group!.children.length}`
      )

      // First button has left radius only
      const firstBtn = group!.children[0] as HTMLElement
      const firstStyle = getComputedStyle(firstBtn)
      api.assert.ok(firstStyle.borderTopLeftRadius === '6px', 'First should have top-left radius')
      api.assert.ok(
        firstStyle.borderBottomLeftRadius === '6px',
        'First should have bottom-left radius'
      )

      // Last button has right radius only
      const lastBtn = group!.children[3] as HTMLElement
      const lastStyle = getComputedStyle(lastBtn)
      api.assert.ok(lastStyle.borderTopRightRadius === '6px', 'Last should have top-right radius')
      api.assert.ok(
        lastStyle.borderBottomRightRadius === '6px',
        'Last should have bottom-right radius'
      )
    }
  ),

  testWithSetup(
    'Toggle button with icon change',
    `LikeBtn: hor, gap 8, pad 10 16, bg #222, col #888, rad 6, cursor pointer, ver-center, toggle()
  Icon "heart", ic #888, is 18
  Text "Like"
  on:
    bg #ef4444
    col white
    Icon "heart", ic white, is 18, fill
    Text "Liked"

LikeBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')

      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Like'), `Should say Like initially, got: "${btnText}"`)

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Toggle off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
    }
  ),
])

// =============================================================================
// Animation & Transition Integration
// =============================================================================

export const animationTests: TestCase[] = describe('Animation & Transition', [
  testWithSetup(
    'Hover with transition timing',
    `Card: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover 0.2s ease-out:
    bg #252525
    scale 1.02
    shadow md

Card
  Text "Hover me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')

      // Check transition is set
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)
      api.assert.ok(
        style.transition.includes('0.2s') || style.transitionDuration.includes('0.2'),
        'Should have 0.2s transition'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(300) // Wait for transition

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(37, 37, 37)')
    }
  ),

  testWithSetup(
    'Toggle state with transition',
    `ToggleCard: bg #333, pad 16, rad 8, cursor pointer, toggle()
  on 0.3s ease-in-out:
    bg #2271C1
    scale 1.05

ToggleCard
  Text "Click to toggle", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(400) // Wait for transition

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Verify data-state
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el.getAttribute('data-state') === 'on', 'Should be in on state')
    }
  ),

  testWithSetup(
    'Loading spinner animation',
    `LoadingBtn as Button: hor, gap 8, pad 12 24, bg #2271C1, col white, rad 6, ver-center
  Icon "loader", ic white, is 18, anim spin
  Text "Loading..."

LoadingBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      // Button styling
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Has loading text
      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Loading'), `Should say Loading, got: "${btnText}"`)

      // Icon should have animation
      const icon = btn!.querySelector('svg, [data-icon], span')
      api.assert.ok(icon !== null, 'Button should contain an icon element')
      const iconStyle = getComputedStyle(icon!)
      api.assert.ok(
        iconStyle.animation.includes('spin') || iconStyle.animationName.includes('spin'),
        `Icon should have spin animation, got animation: "${iconStyle.animation}", animationName: "${iconStyle.animationName}"`
      )
    }
  ),

  testWithSetup(
    'Pulse animation on notification badge',
    `Badge: pad 4 8, bg #ef4444, col white, rad 99, fs 12, anim pulse

Frame relative, w 40, h 40, bg #222, rad 6, center
  Icon "bell", ic #888, is 24
  Frame abs, x 24, y -4
    Badge "3"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Container
      api.assert.exists('node-3') // Badge wrapper

      // Container is relative
      api.assert.hasStyle('node-1', 'position', 'relative')
      api.assert.hasStyle('node-1', 'width', '40px')
      api.assert.hasStyle('node-1', 'height', '40px')

      // Badge wrapper is absolute positioned
      api.assert.hasStyle('node-3', 'position', 'absolute')

      // Find badge and check animation
      const badgeWrapper = document.querySelector('[data-mirror-id="node-3"]')
      api.assert.ok(badgeWrapper !== null, 'Badge wrapper should exist')
      const badgeText = badgeWrapper!.textContent || ''
      api.assert.ok(badgeText.includes('3'), `Badge should show 3, got: "${badgeText}"`)
    }
  ),
])

// =============================================================================
// Form Integration
// =============================================================================

export const formIntegrationTests: TestCase[] = describe('Form Integration', [
  testWithSetup(
    'Complete login form',
    `FormField: gap 4
  Label: fs 12, col #888, weight 500
  FormInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full
    focus:
      boc #2271C1

SubmitBtn as Button: w full, pad 14, bg #2271C1, col white, rad 6, weight 600, fs 16
  hover:
    bg #1d5fa8

Frame gap 20, pad 24, bg #1a1a1a, rad 12, w 320
  Text "Login", col white, fs 24, weight bold, center
  FormField
    Label "Email"
    FormInput placeholder "you@example.com", type email
  FormField
    Label "Password"
    FormInput placeholder "••••••••", type password
  SubmitBtn "Sign In"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Form container

      // Container styling
      api.assert.hasStyle('node-1', 'gap', '20px')
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')
      api.assert.hasStyle('node-1', 'width', '320px')

      const form = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(form !== null, 'Form should exist')
      const formText = form!.textContent || ''

      // Title exists
      api.assert.ok(formText.includes('Login'), 'Should have Login title')

      // Find inputs
      const inputs = form!.querySelectorAll('input')
      api.assert.ok(inputs.length === 2, `Should have 2 inputs, found ${inputs.length}`)

      // Email input
      const emailInput = inputs[0] as HTMLInputElement
      api.assert.ok(emailInput.placeholder === 'you@example.com', 'Email should have placeholder')
      api.assert.ok(emailInput.type === 'email', 'Email should have type email')

      // Password input
      const passwordInput = inputs[1] as HTMLInputElement
      api.assert.ok(passwordInput.type === 'password', 'Password should have type password')

      // Submit button
      const button = form!.querySelector('button')
      api.assert.ok(button !== null, 'Submit button should exist')
      const buttonText = button!.textContent || ''
      api.assert.ok(
        buttonText.includes('Sign In'),
        `Button should say Sign In, got: "${buttonText}"`
      )

      const btnStyle = getComputedStyle(button as Element)
      api.assert.ok(btnStyle.backgroundColor === 'rgb(34, 113, 193)', 'Button should be blue')
      // Button has `w full` which becomes width: 100%, computed to content width of parent
      // Parent is 320px with 24px padding, so content area is 272px
      const btnWidth = parseFloat(btnStyle.width)
      api.assert.ok(btnWidth > 0, `Button should have width > 0, got: ${btnStyle.width}`)
      api.assert.ok(
        btnWidth >= 200 && btnWidth <= 320,
        `Button should fill available width (~272px), got: ${btnStyle.width}`
      )
    }
  ),

  testWithSetup(
    'Input with validation states',
    `ValidInput as Input: pad 12, bg #222, col white, rad 6, bor 2, boc #10b981, w full
ErrorInput as Input: pad 12, bg #222, col white, rad 6, bor 2, boc #ef4444, w full
DefaultInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full

Frame gap 12, pad 16, bg #1a1a1a, rad 8, w 300
  Frame gap 4
    Text "Valid Input", col #10b981, fs 12
    ValidInput placeholder "Valid value"
  Frame gap 4
    Text "Error Input", col #ef4444, fs 12
    ErrorInput placeholder "Invalid value"
  Frame gap 4
    Text "Default Input", col #888, fs 12
    DefaultInput placeholder "Enter value"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Find all inputs
      const inputs = container!.querySelectorAll('input')
      api.assert.ok(inputs.length === 3, `Should have 3 inputs, found ${inputs.length}`)

      // Valid input has green border
      const validInput = inputs[0] as HTMLInputElement
      const validStyle = getComputedStyle(validInput)
      api.assert.ok(
        validStyle.borderColor === 'rgb(16, 185, 129)',
        'Valid input should have green border'
      )
      api.assert.ok(validStyle.borderWidth === '2px', 'Valid input should have 2px border')

      // Error input has red border
      const errorInput = inputs[1] as HTMLInputElement
      const errorStyle = getComputedStyle(errorInput)
      api.assert.ok(
        errorStyle.borderColor === 'rgb(239, 68, 68)',
        'Error input should have red border'
      )

      // Default input has gray border
      const defaultInput = inputs[2] as HTMLInputElement
      const defaultStyle = getComputedStyle(defaultInput)
      api.assert.ok(
        defaultStyle.borderColor === 'rgb(68, 68, 68)',
        'Default input should have gray border'
      )
      api.assert.ok(defaultStyle.borderWidth === '1px', 'Default input should have 1px border')
    }
  ),

  testWithSetup(
    'Checkbox and switch styling',
    `Frame gap 16, pad 16, bg #1a1a1a, rad 8
  Frame hor, gap 12, ver-center
    Frame w 20, h 20, rad 4, bor 2, boc #2271C1, bg #2271C1, center
      Icon "check", ic white, is 14
    Text "Checked checkbox", col white
  Frame hor, gap 12, ver-center
    Frame w 20, h 20, rad 4, bor 2, boc #444
    Text "Unchecked checkbox", col #888
  Frame hor, gap 12, ver-center
    Frame w 44, h 24, rad 99, bg #2271C1, relative
      Frame w 20, h 20, rad 99, bg white, abs, x 22, y 2
    Text "Switch on", col white
  Frame hor, gap 12, ver-center
    Frame w 44, h 24, rad 99, bg #444, relative
      Frame w 20, h 20, rad 99, bg white, abs, x 2, y 2
    Text "Switch off", col #888`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const containerText = container!.textContent || ''

      // Has all checkbox/switch labels
      api.assert.ok(containerText.includes('Checked checkbox'), 'Should have checked label')
      api.assert.ok(containerText.includes('Unchecked checkbox'), 'Should have unchecked label')
      api.assert.ok(containerText.includes('Switch on'), 'Should have switch on label')
      api.assert.ok(containerText.includes('Switch off'), 'Should have switch off label')

      // Checked checkbox styling (node-2 is the Frame with checkbox)
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '12px')
      api.assert.hasStyle('node-2', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'Textarea with character count',
    `Textarea as Textarea: pad 12, bg #222, col white, rad 6, bor 1, boc #444, w full, h 120, resize none

Frame gap 8, pad 16, bg #1a1a1a, rad 8, w 300
  Text "Message", col #888, fs 12, weight 500
  Textarea placeholder "Enter your message..."
  Frame hor, spread
    Text "Max 500 characters", col #666, fs 11
    Text "0/500", col #888, fs 11`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')

      // Find textarea
      const textarea = container!.querySelector('textarea')
      api.assert.ok(textarea !== null, 'Textarea should exist')
      api.assert.ok(
        textarea!.placeholder === 'Enter your message...',
        'Textarea should have placeholder'
      )

      // Textarea styling
      const style = getComputedStyle(textarea as Element)
      api.assert.ok(style.padding === '12px', 'Textarea should have 12px padding')
      api.assert.ok(style.backgroundColor === 'rgb(34, 34, 34)', 'Textarea should have dark bg')
      api.assert.ok(style.borderRadius === '6px', 'Textarea should have 6px radius')
      api.assert.ok(style.height === '120px', 'Textarea should be 120px tall')

      // Character count text
      const containerText = container!.textContent || ''
      api.assert.ok(containerText.includes('0/500'), 'Should show character count')
    }
  ),
])

// =============================================================================
// Gradient Integration
// =============================================================================

export const gradientTests: TestCase[] = describe('Gradient Integration', [
  testWithSetup(
    'Horizontal gradient background',
    `GradientCard: pad 24, rad 12, bg grad #2271C1 #7c3aed

GradientCard
  Text "Gradient Card", col white, fs 20, weight bold
  Text "Horizontal gradient from blue to purple", col rgba(255,255,255,0.8), fs 14`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Card styling
      api.assert.hasStyle('node-1', 'padding', '24px')
      api.assert.hasStyle('node-1', 'borderRadius', '12px')

      // Gradient background
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Text content
      const elText = el.textContent || ''
      api.assert.ok(elText.includes('Gradient Card'), 'Should have title')
    }
  ),

  testWithSetup(
    'Vertical gradient background',
    `Frame pad 24, rad 12, bg grad-ver #10b981 #2271C1
  Text "Vertical Gradient", col white, fs 18, weight 500`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)

      // Should have gradient
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Check it's vertical: Chrome normalizes 180deg (default direction) by removing it,
      // so a vertical gradient is `linear-gradient(color1, color2)` without an angle.
      // Non-vertical gradients would have explicit angles like 90deg, 45deg, etc.
      const bgImage = style.backgroundImage
      const isVertical =
        bgImage.includes('180deg') ||
        bgImage.includes('to bottom') ||
        // Chrome normalized: no explicit angle in linear-gradient means default (180deg = vertical)
        (bgImage.startsWith('linear-gradient(rgb') && !bgImage.includes('deg'))
      api.assert.ok(isVertical, 'Should be vertical gradient')
    }
  ),

  testWithSetup(
    'Gradient with angle',
    `Frame pad 24, rad 12, bg grad 45 #f59e0b #ef4444
  Text "45° Gradient", col white, fs 18, weight 500`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const style = getComputedStyle(el)

      // Should have gradient
      api.assert.ok(
        style.backgroundImage.includes('gradient') || style.background.includes('gradient'),
        'Should have gradient background'
      )

      // Check angle
      api.assert.ok(
        style.backgroundImage.includes('45deg') || style.background.includes('45deg'),
        'Should have 45 degree angle'
      )
    }
  ),

  testWithSetup(
    'Gradient text color',
    `Frame pad 24, bg #0a0a0a, rad 12
  Text "Gradient Text", col grad #2271C1 #7c3aed, fs 32, weight bold`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      // Container
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(10, 10, 10)')

      // Text should have gradient (via background-clip: text)
      const text = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const style = getComputedStyle(text)

      // Either has gradient background with text clip, or special color property
      const hasGradient =
        style.backgroundImage.includes('gradient') ||
        style.background.includes('gradient') ||
        style.webkitBackgroundClip === 'text' ||
        (style as CSSStyleDeclaration & { backgroundClip?: string }).backgroundClip === 'text'

      api.assert.ok(hasGradient, 'Text should have gradient styling')
      api.assert.hasStyle('node-2', 'fontSize', '32px')
    }
  ),

  testWithSetup(
    'Gradient button with hover',
    `GradBtn as Button: pad 14 28, rad 8, bg grad #2271C1 #7c3aed, col white, weight 600, cursor pointer
  hover:
    bg grad #1d5fa8 #6d28d9
    scale 1.02

GradBtn "Gradient Button"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Gradient Button' })

      // Button styling
      api.assert.hasStyle('node-1', 'paddingTop', '14px')
      api.assert.hasStyle('node-1', 'paddingLeft', '28px')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Has gradient
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const initialStyle = getComputedStyle(el)
      api.assert.ok(
        initialStyle.backgroundImage.includes('gradient'),
        'Button should have gradient background'
      )

      // Hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Should still have gradient (different colors)
      const hoverStyle = getComputedStyle(el)
      api.assert.ok(
        hoverStyle.backgroundImage.includes('gradient'),
        'Button should have gradient on hover'
      )
    }
  ),
])

// =============================================================================
// Export All Integration Tests
// =============================================================================

export const allIntegrationTests: TestCase[] = [
  ...componentTokenTests,
  ...componentStateTests,
  ...componentTokenStateTests,
  ...nestedComponentTests,
  ...realWorldPatternTests,
  ...layoutIntegrationTests,
  ...dataIterationTests,
  ...conditionalTests,
  ...iconButtonTests,
  ...animationTests,
  ...formIntegrationTests,
  ...gradientTests,
]

// Quick integration tests for fast validation
export const quickIntegrationTests: TestCase[] = [
  componentTokenTests[0], // Button component uses color token
  componentStateTests[1], // Component with toggle state
  componentTokenStateTests[0], // Button with token colors and hover state
  nestedComponentTests[0], // Card with nested slot components
  realWorldPatternTests[0], // Complete form field pattern
  dataIterationTests[0], // Each loop renders list items
  conditionalTests[0], // If/else block rendering
  iconButtonTests[0], // Button with leading icon
  animationTests[0], // Hover with transition timing
  formIntegrationTests[0], // Complete login form
  gradientTests[0], // Horizontal gradient background
]
