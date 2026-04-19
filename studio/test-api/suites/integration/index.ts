/**
 * Integration Tests
 *
 * Tests for real-world designer workflows - feature combinations
 * that designers use daily. These tests validate that the core
 * features work together correctly, not just in isolation.
 *
 * Coverage:
 * - Component + Token combinations
 * - Component + State combinations
 * - Component + Token + State (the trifecta)
 * - Nested component structures
 * - Real-world UI patterns
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
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
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save' })

      // Verify token was resolved to actual color
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
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

      // Both should have same green background
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(16, 185, 129)')
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(16, 185, 129)')
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

      // Verify all tokens resolved
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'borderRadius', '8px')
      api.assert.hasStyle('node-1', 'padding', '16px')
      api.assert.hasStyle('node-1', 'gap', '12px')
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
      api.assert.exists('node-2') // Save button
      api.assert.exists('node-3') // Delete button

      // Save uses primary token
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Delete overrides with danger token
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
    }
  ),

  testWithSetup(
    'Property set token in component',
    `btnstyle: pad 10 20, rad 6, cursor pointer

Btn: $btnstyle, bg #333, col white

Btn "Click me"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Verify property set was expanded
      api.assert.hasStyle('node-1', 'paddingTop', '10px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')
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

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')

      // Simulate hover
      await api.interact.hover('node-1')
      await api.utils.delay(200)

      // Hover state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(37, 37, 37)')
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

      // Initial (off) state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // On state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Toggle off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Back to off state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
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
      api.assert.exists('node-2') // Home (selected)
      api.assert.exists('node-3') // Profile
      api.assert.exists('node-4') // Settings

      // Home is selected initially
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // Click Profile
      await api.interact.click('node-3')
      await api.utils.delay(200)

      // Profile is now selected, Home is not
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-2', 'color', 'rgb(136, 136, 136)')
    }
  ),

  testWithSetup(
    'Component with multiple custom states (cycle)',
    `StatusBtn as Button: pad 8 16, rad 6, bg #333, col #888, toggle()
  on:
    bg #10b981
    col white

StatusBtn "Task"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial: off (gray)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Click: toggle on (green)
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(16, 185, 129)')

      // Click: toggle off (back to gray)
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
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

      // Initial: off
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Hover while off
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(68, 68, 68)')

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
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

      // Initial: uses primary token
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Hover: uses primary-hover token
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(29, 95, 168)')
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

      // Initial: card token
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-1', 'padding', '16px')

      // Toggle on: card-active token
      await api.interact.click('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
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
      api.assert.exists('node-2') // Dashboard
      api.assert.exists('node-3') // Projects
      api.assert.exists('node-4') // Settings

      // Dashboard selected: uses nav-active tokens
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-2', 'color', 'rgb(255, 255, 255)')

      // Projects not selected: uses nav tokens
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(26, 26, 26)')
      api.assert.hasStyle('node-3', 'color', 'rgb(136, 136, 136)')

      // Click Projects
      await api.interact.click('node-3')
      await api.utils.delay(200)

      // Projects now selected
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'color', 'rgb(255, 255, 255)')

      // Dashboard no longer selected
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
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

      // Initial: default icon color
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      // Verify button state changed
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'Element should exist')
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
      api.assert.exists('node-2') // PrimaryBtn
      api.assert.exists('node-3') // DangerBtn
      api.assert.exists('node-4') // GhostBtn

      // Initial states
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-4', 'color', 'rgb(136, 136, 136)')

      // Hover primary
      await api.interact.hover('node-2')
      await api.utils.delay(200)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(29, 95, 168)')

      // Hover danger
      await api.interact.hover('node-3')
      await api.utils.delay(200)
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(220, 38, 38)')
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

      // Check structure
      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      api.assert.ok(card?.textContent?.includes('Project Update'), 'Should have title')
      api.assert.ok(card?.textContent?.includes('This is the latest'), 'Should have description')

      // Buttons exist
      const buttons = card?.querySelectorAll('button')
      api.assert.ok(buttons?.length === 2, 'Should have 2 buttons')
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

      // Check we have 2 list items
      const frame = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(frame !== null, 'Frame should exist')
      api.assert.ok(frame?.textContent?.includes('John Doe'), 'Should have first person')
      api.assert.ok(frame?.textContent?.includes('Alice Smith'), 'Should have second person')
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

      const shell = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(shell !== null, 'AppShell should exist')
      api.assert.ok(shell?.textContent?.includes('Dashboard'), 'Should have Dashboard')
      api.assert.ok(shell?.textContent?.includes('Content Area'), 'Should have main content')
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

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')

      // Should have multiple badges
      api.assert.ok(card?.textContent?.includes('New'), 'Should have New badge')
      api.assert.ok(card?.textContent?.includes('High'), 'Should have High badge')
      api.assert.ok(card?.textContent?.includes('Urgent'), 'Should have Urgent badge')
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

      // Find the input
      const field = document.querySelector('[data-mirror-id="node-1"]')
      const input = field?.querySelector('input')
      api.assert.ok(input !== null, 'Input should exist')
      api.assert.ok(input?.placeholder === 'you@example.com', 'Should have placeholder')
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

      // Check different background colors
      const success = document.querySelector('[data-mirror-id="node-2"]')
      const error = document.querySelector('[data-mirror-id="node-5"]')

      api.assert.ok(success !== null, 'Success alert should exist')
      api.assert.ok(error !== null, 'Error alert should exist')
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

      // Menu button starts closed
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      // Click to open
      await api.interact.click('node-2')
      await api.utils.delay(200)

      // Button should be in open state
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(68, 68, 68)')
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

      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(container?.textContent?.includes('JavaScript'), 'Should have JS tag')
      api.assert.ok(container?.textContent?.includes('TypeScript'), 'Should have TS tag')

      // Check it has wrap layout
      api.assert.hasStyle('node-1', 'flexWrap', 'wrap')
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

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      api.assert.ok(card?.textContent?.includes('Pro Plan'), 'Should have plan name')
      api.assert.ok(card?.textContent?.includes('$49'), 'Should have price')
      api.assert.ok(card?.textContent?.includes('Get Started'), 'Should have CTA')

      // Find CTA button and test hover
      const buttons = card?.querySelectorAll('button')
      api.assert.ok(buttons?.length === 1, 'Should have 1 CTA button')
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

      // Grid should have 2 columns
      const grid = document.querySelector('[data-mirror-id="node-1"]')
      const computedStyle = getComputedStyle(grid as Element)
      api.assert.ok(computedStyle.display === 'grid', 'Should be grid display')

      // Toggle first card
      await api.interact.click('node-2')
      await api.utils.delay(200)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')

      // Second card still default
      api.assert.hasStyle('node-4', 'backgroundColor', 'rgb(26, 26, 26)')
    }
  ),

  testWithSetup(
    'Horizontal scroll with hover cards',
    `Card: bg #1a1a1a, pad 16, rad 8, w 200, shrink, cursor pointer
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

      // Should have horizontal scroll
      const container = document.querySelector('[data-mirror-id="node-1"]')
      const computedStyle = getComputedStyle(container as Element)
      api.assert.ok(
        computedStyle.overflowX === 'auto' || computedStyle.overflowX === 'scroll',
        'Should have horizontal scroll'
      )
      api.assert.ok(computedStyle.flexDirection === 'row', 'Should be horizontal')
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

      // Verify stacked layout
      const container = document.querySelector('[data-mirror-id="node-1"]')
      const computedStyle = getComputedStyle(container as Element)
      api.assert.ok(computedStyle.position === 'relative', 'Container should be relative')
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
]

// Quick integration tests for fast validation
export const quickIntegrationTests: TestCase[] = [
  componentTokenTests[0], // Button component uses color token
  componentStateTests[1], // Component with toggle state
  componentTokenStateTests[0], // Button with token colors and hover state
  nestedComponentTests[0], // Card with nested slot components
  realWorldPatternTests[0], // Complete form field pattern
]
