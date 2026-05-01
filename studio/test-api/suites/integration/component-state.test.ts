/**
 * Integration — Component + State (with and without tokens)
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

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
