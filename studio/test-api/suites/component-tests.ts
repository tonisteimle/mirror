/**
 * Component Tests
 *
 * Tests for Mirror's component system:
 * - Basic component definition with :
 * - Component usage without :
 * - Property inheritance with as
 * - Component variants
 * - Nested slots (child components)
 * - Layout components
 * - Property overrides
 * - Multi-level inheritance
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Basic Component Definition
// =============================================================================

export const basicComponentTests: TestCase[] = describe('Basic Components', [
  testWithSetup(
    'Component definition applies styles',
    `Btn as Button: pad 10 20, rad 6, bg #2271C1, col white

Btn "Click me"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      // Check that component styles are applied
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Button should exist')
      api.assert.ok(
        el.style.backgroundColor === 'rgb(34, 113, 193)' ||
          el.style.background.includes('34, 113, 193'),
        'Should have blue background'
      )
    }
  ),

  testWithSetup(
    'Component with text content',
    `Label: fs 14, col #888, weight 500

Label "Username"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { textContains: 'Username' })
    }
  ),

  testWithSetup(
    'Multiple instances of same component',
    `Tag: pad 4 8, bg #333, col white, rad 4, fs 12

Frame hor, gap 8
  Tag "JavaScript"
  Tag "TypeScript"
  Tag "React"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Tag 1
      api.assert.exists('node-3') // Tag 2
      api.assert.exists('node-4') // Tag 3

      api.dom.expect('node-2', { textContains: 'JavaScript' })
      api.dom.expect('node-3', { textContains: 'TypeScript' })
      api.dom.expect('node-4', { textContains: 'React' })
    }
  ),

  testWithSetup(
    'Component without text (container)',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Content inside card", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Text

      api.dom.expect('node-2', { textContains: 'Content inside card' })
    }
  ),
])

// =============================================================================
// Property Overrides
// =============================================================================

export const propertyOverrideTests: TestCase[] = describe('Property Overrides', [
  testWithSetup(
    'Override single property',
    `Btn: pad 10 20, bg #2271C1, col white, rad 6

Frame gap 8
  Btn "Primary"
  Btn "Danger", bg #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Primary button
      api.assert.exists('node-3') // Danger button

      const primary = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const danger = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(primary !== null, 'Primary button should exist')
      api.assert.ok(danger !== null, 'Danger button should exist')
    }
  ),

  testWithSetup(
    'Override multiple properties',
    `Btn as Button: pad 10 20, bg #333, col white, rad 6

Btn "Custom", bg #10b981, col black, rad 99`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Custom' })
    }
  ),

  testWithSetup(
    'Add properties not in definition',
    `Box: pad 16, bg #1a1a1a

Box shadow md, bor 1, boc #333
  Text "With extra styling", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Box
      api.assert.exists('node-2') // Text
    }
  ),
])

// =============================================================================
// Inheritance with 'as'
// =============================================================================

export const inheritanceTests: TestCase[] = describe('Component Inheritance', [
  testWithSetup(
    'Inherit from Button primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6

PrimaryBtn "Save"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save' })
    }
  ),

  testWithSetup(
    'Inherit from Frame primitive',
    `Card as Frame: bg #1a1a1a, pad 16, rad 8, shadow md

Card
  Text "Card content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card (Frame)
      api.assert.exists('node-2') // Text

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card element should exist in DOM')
      api.assert.ok(
        card!.tagName === 'DIV',
        `Card should be a div (from Frame), got: ${card!.tagName}`
      )
    }
  ),

  testWithSetup(
    'Inherit from Text primitive',
    `Heading as Text: fs 24, weight bold, col white

Heading "Welcome"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { textContains: 'Welcome' })
    }
  ),

  testWithSetup(
    'Inherit from Input primitive',
    `SearchInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444

SearchInput placeholder "Search..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'input' })
    }
  ),

  testWithSetup(
    'Inherit from Icon primitive',
    `StatusIcon as Icon: is 20, ic #888

StatusIcon "check"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Icon should render as SVG or span
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'Icon should exist')
    }
  ),
])

// =============================================================================
// Component Variants
// =============================================================================

export const variantTests: TestCase[] = describe('Component Variants', [
  testWithSetup(
    'Multiple variants from base',
    `Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #444

Frame gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
  GhostBtn "Cancel"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // PrimaryBtn
      api.assert.exists('node-3') // DangerBtn
      api.assert.exists('node-4') // GhostBtn

      api.dom.expect('node-2', { text: 'Save' })
      api.dom.expect('node-3', { text: 'Delete' })
      api.dom.expect('node-4', { text: 'Cancel' })
    }
  ),

  testWithSetup(
    'Size variants',
    `Btn: rad 6, bg #2271C1, col white
SmallBtn as Btn: pad 6 12, fs 12
MediumBtn as Btn: pad 10 20, fs 14
LargeBtn as Btn: pad 14 28, fs 16

Frame gap 8, ver-center
  SmallBtn "Small"
  MediumBtn "Medium"
  LargeBtn "Large"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // SmallBtn
      api.assert.exists('node-3') // MediumBtn
      api.assert.exists('node-4') // LargeBtn
    }
  ),

  testWithSetup(
    'Icon variants',
    `IconBtn as Button: w 40, h 40, rad 6, center, cursor pointer
PrimaryIconBtn as IconBtn: bg #2271C1, col white
GhostIconBtn as IconBtn: bg transparent, col #888

Frame hor, gap 8
  PrimaryIconBtn
    Icon "plus", ic white, is 20
  GhostIconBtn
    Icon "settings", ic #888, is 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // PrimaryIconBtn
      api.assert.exists('node-4') // GhostIconBtn
    }
  ),
])

// =============================================================================
// Nested Slots (Child Components)
// =============================================================================

export const nestedSlotTests: TestCase[] = describe('Nested Slots', [
  testWithSetup(
    'Card with Title and Description slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

Card
  Title "Project Name"
  Desc "A description of the project"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      // Check for title and description content
      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const content = card!.textContent || ''
      api.assert.ok(
        content.includes('Project Name'),
        `Should contain title, got: ${content.substring(0, 100)}`
      )
      api.assert.ok(
        content.includes('A description of the project'),
        `Should contain description, got: ${content.substring(0, 100)}`
      )
    }
  ),

  testWithSetup(
    'Card with Header, Body, Footer slots',
    `Card: bg #1a1a1a, rad 8, gap 0
  Header: pad 16, bor 0 0 1 0, boc #333
  Body: pad 16, grow
  Footer: pad 16, bor 1 0 0 0, boc #333, hor, gap 8

Card h 300
  Header
    Text "Card Title", col white, weight bold
  Body
    Text "Main content goes here", col #888
  Footer
    Button "Cancel", bg #333, col white, pad 8 16, rad 4
    Button "Save", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Card

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
    }
  ),

  testWithSetup(
    'List item with slots',
    `ListItem: hor, pad 12, bg #1a1a1a, gap 12, ver-center, rad 6
  Avatar: w 40, h 40, rad 99, bg #333, center
  Content: grow, gap 2
  Actions: hor, gap 8

Frame gap 8
  ListItem
    Avatar
      Text "JD", col white, fs 12
    Content
      Text "John Doe", col white, weight 500
      Text "john@example.com", col #888, fs 12
    Actions
      Button "Edit", bg #333, col white, pad 6 12, rad 4, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // ListItem
    }
  ),
])

// =============================================================================
// Layout Components
// =============================================================================

export const layoutComponentTests: TestCase[] = describe('Layout Components', [
  testWithSetup(
    'AppShell with Sidebar and Main',
    `AppShell: hor, h 200
  Sidebar: w 160, bg #1a1a1a, pad 16, gap 8
  Main: grow, pad 16, bg #0a0a0a

AppShell
  Sidebar
    Text "Nav Item 1", col white
    Text "Nav Item 2", col white
  Main
    Text "Main Content", col white, fs 18`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // AppShell

      const shell = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(shell !== null, 'AppShell should exist')
    }
  ),

  testWithSetup(
    'Two-column layout',
    `TwoColumn: hor, gap 16
  Left: w 200, shrink
  Right: grow

TwoColumn
  Left
    Text "Sidebar", col #888
  Right
    Text "Content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // TwoColumn
    }
  ),

  testWithSetup(
    'Stack layout component',
    `Stack: gap 8
VStack as Stack: ver
HStack as Stack: hor

Frame gap 16
  VStack
    Text "Item 1", col white
    Text "Item 2", col white
  HStack
    Text "A", col white
    Text "B", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // VStack
      api.assert.exists('node-5') // HStack
    }
  ),
])

// =============================================================================
// Multi-level Inheritance
// =============================================================================

export const multiLevelInheritanceTests: TestCase[] = describe('Multi-level Inheritance', [
  testWithSetup(
    'Three levels of inheritance',
    `BaseBtn as Button: pad 10 20, rad 6, cursor pointer
ColoredBtn as BaseBtn: col white
PrimaryBtn as ColoredBtn: bg #2271C1

PrimaryBtn "Deep Inheritance"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Deep Inheritance' })
    }
  ),

  testWithSetup(
    'Override at each level',
    `Base: pad 8, bg #111
Level1 as Base: pad 12, col white
Level2 as Level1: pad 16, rad 4
Level3 as Level2: pad 20, shadow sm

Level3
  Text "Inherited styles", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Level3
      api.assert.exists('node-2') // Text
    }
  ),
])

// =============================================================================
// Component with States
// =============================================================================

export const componentStateTests: TestCase[] = describe('Components with States', [
  testWithSetup(
    'Component with hover state',
    `HoverCard: bg #1a1a1a, pad 16, rad 8, cursor pointer
  hover:
    bg #222
    shadow md

HoverCard
  Text "Hover me", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // HoverCard
      api.assert.exists('node-2') // Text
    }
  ),

  testWithSetup(
    'Component with toggle state',
    `ToggleBtn as Button: pad 10 20, bg #333, col #888, rad 6, toggle()
  on:
    bg #2271C1
    col white

ToggleBtn "Toggle"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Toggle' })
    }
  ),

  testWithSetup(
    'Component with multiple states',
    `StatusBadge: pad 4 8, rad 4, fs 12
  success:
    bg #10b981
    col white
  warning:
    bg #f59e0b
    col black
  error:
    bg #ef4444
    col white

Frame hor, gap 8
  StatusBadge "Active", success
  StatusBadge "Pending", warning
  StatusBadge "Failed", error`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // success
      api.assert.exists('node-3') // warning
      api.assert.exists('node-4') // error
    }
  ),
])

// =============================================================================
// Complex Component Patterns
// =============================================================================

export const complexComponentTests: TestCase[] = describe('Complex Component Patterns', [
  testWithSetup(
    'Form field component',
    `FormField: gap 4
  Label: fs 12, col #888, weight 500, uppercase
  Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444
  Error: fs 11, col #ef4444, hidden

FormField
  Label "Email"
  Input placeholder "Enter email..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // FormField
    }
  ),

  testWithSetup(
    'Navigation component',
    `NavItem: pad 12 16, col #888, rad 6, cursor pointer
  hover:
    bg #222
    col white
  selected:
    bg #2271C1
    col white

Frame gap 4, w 200, bg #1a1a1a, pad 8
  NavItem "Dashboard", selected
  NavItem "Projects"
  NavItem "Settings"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // Dashboard (selected)
      api.assert.exists('node-3') // Projects
      api.assert.exists('node-4') // Settings
    }
  ),

  testWithSetup(
    'Avatar component with sizes',
    `Avatar: rad 99, center, bg #333, col white, weight 500
SmallAvatar as Avatar: w 32, h 32, fs 12
MediumAvatar as Avatar: w 40, h 40, fs 14
LargeAvatar as Avatar: w 56, h 56, fs 18

Frame hor, gap 12, ver-center
  SmallAvatar
    Text "S"
  MediumAvatar
    Text "M"
  LargeAvatar
    Text "L"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // SmallAvatar
      api.assert.exists('node-4') // MediumAvatar
      api.assert.exists('node-6') // LargeAvatar
    }
  ),

  testWithSetup(
    'Alert component with icon',
    `Alert: hor, pad 12 16, rad 6, gap 12, ver-center
  AlertIcon: is 20
  AlertContent: grow

SuccessAlert as Alert: bg #10b98120, bor 1, boc #10b981
ErrorAlert as Alert: bg #ef444420, bor 1, boc #ef4444

Frame gap 8
  SuccessAlert
    AlertIcon
      Icon "check-circle", ic #10b981
    AlertContent
      Text "Operation successful", col #10b981
  ErrorAlert
    AlertIcon
      Icon "x-circle", ic #ef4444
    AlertContent
      Text "Something went wrong", col #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // SuccessAlert
      api.assert.exists('node-6') // ErrorAlert
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allComponentTests: TestCase[] = [
  ...basicComponentTests,
  ...propertyOverrideTests,
  ...inheritanceTests,
  ...variantTests,
  ...nestedSlotTests,
  ...layoutComponentTests,
  ...multiLevelInheritanceTests,
  ...componentStateTests,
  ...complexComponentTests,
]
