/**
 * Tests for Core Components
 *
 * Verifies that core components are properly defined and can be used in parsing.
 */

import { describe, it, expect } from 'vitest'
import { buildCoreComponentRegistry, CORE_COMPONENT_NAMES, CORE_TOKENS } from '../../parser/core-components'
import { parse } from '../../parser/parser'
import {
  getCoreComponentDefinition,
  getAllCoreComponentNames,
  getCoreComponentsByCategory,
  isCoreComponent,
  getAllCoreTokens,
  getCoreTokensForComponent,
  CORE_COMPONENT_NAMES as SCHEMA_CORE_COMPONENTS,
  CORE_TOKENS as SCHEMA_CORE_TOKENS,
} from '../../dsl/master-schema'

describe('Core Components Registry', () => {
  it('builds the registry with all navigation components', () => {
    const registry = buildCoreComponentRegistry()

    // Should have all navigation components
    expect(registry.has('Nav')).toBe(true)
    expect(registry.has('NavItem')).toBe(true)
    expect(registry.has('NavItemBadge')).toBe(true)
    expect(registry.has('NavSection')).toBe(true)
    expect(registry.has('ToggleNav')).toBe(true)
    expect(registry.has('TreeItem')).toBe(true)
    expect(registry.has('TreeLeaf')).toBe(true)
    expect(registry.has('DrawerNav')).toBe(true)
    expect(registry.has('DrawerBackdrop')).toBe(true)
    expect(registry.has('MenuButton')).toBe(true)
  })

  it('NavItem has correct structure', () => {
    const registry = buildCoreComponentRegistry()
    const navItem = registry.get('NavItem')!

    // Properties
    expect(navItem.properties._layout).toBe('horizontal')
    expect(navItem.properties.gap).toBe(12)
    expect(navItem.properties.cursor).toBe('pointer')

    // Children (slots)
    expect(navItem.children).toHaveLength(2)
    expect(navItem.children[0].name).toBe('Icon')
    expect(navItem.children[1].name).toBe('Label')

    // States
    expect(navItem.states).toHaveLength(2)
    expect(navItem.states![0].name).toBe('hover')
    expect(navItem.states![1].name).toBe('active')
  })

  it('NavItemBadge has Badge slot', () => {
    const registry = buildCoreComponentRegistry()
    const navItemBadge = registry.get('NavItemBadge')!

    expect(navItemBadge.children).toHaveLength(3)
    expect(navItemBadge.children[2].name).toBe('Badge')
  })

  it('ToggleNav has child overrides in states', () => {
    const registry = buildCoreComponentRegistry()
    const toggleNav = registry.get('ToggleNav')!

    // Should have expanded and collapsed states
    expect(toggleNav.states).toHaveLength(2)

    const expandedState = toggleNav.states!.find(s => s.name === 'expanded')!
    const collapsedState = toggleNav.states!.find(s => s.name === 'collapsed')!

    // States should have child overrides
    expect(expandedState.children).toHaveLength(1)
    expect(expandedState.children[0].name).toBe('Arrow')
    expect(expandedState.children[0].properties.content).toBe('chevron-left')

    expect(collapsedState.children).toHaveLength(1)
    expect(collapsedState.children[0].name).toBe('Arrow')
    expect(collapsedState.children[0].properties.content).toBe('chevron-right')
  })

  it('Nav has expanded/collapsed states', () => {
    const registry = buildCoreComponentRegistry()
    const nav = registry.get('Nav')!

    expect(nav.states).toHaveLength(2)
    expect(nav.states![0].name).toBe('expanded')
    expect(nav.states![0].properties.width).toBe(240)
    expect(nav.states![1].name).toBe('collapsed')
    expect(nav.states![1].properties.width).toBe(64)
  })

  it('DrawerBackdrop has animations', () => {
    const registry = buildCoreComponentRegistry()
    const backdrop = registry.get('DrawerBackdrop')!

    expect(backdrop.showAnimation).toBeDefined()
    expect(backdrop.showAnimation!.animations).toContain('fade')
    expect(backdrop.hideAnimation).toBeDefined()
  })

  it('MenuButton has onclick handler', () => {
    const registry = buildCoreComponentRegistry()
    const menuButton = registry.get('MenuButton')!

    expect(menuButton.eventHandlers).toHaveLength(1)
    expect(menuButton.eventHandlers![0].event).toBe('onclick')
    expect(menuButton.eventHandlers![0].actions).toHaveLength(2)
  })

  // Form Components
  it('Field has correct slots', () => {
    const registry = buildCoreComponentRegistry()
    const field = registry.get('Field')!

    expect(field.children).toHaveLength(4)
    const slotNames = field.children!.map(c => c.name)
    expect(slotNames).toContain('Label')
    expect(slotNames).toContain('Input')
    expect(slotNames).toContain('Helper')
    expect(slotNames).toContain('Error')
  })

  it('Field has validation states', () => {
    const registry = buildCoreComponentRegistry()
    const field = registry.get('Field')!

    expect(field.states).toHaveLength(3)
    const stateNames = field.states!.map(s => s.name)
    expect(stateNames).toContain('focused')
    expect(stateNames).toContain('invalid')
    expect(stateNames).toContain('disabled')
  })

  it('PasswordInput has toggle functionality', () => {
    const registry = buildCoreComponentRegistry()
    const pwInput = registry.get('PasswordInput')!

    // Has Input and Toggle slots
    expect(pwInput.children).toHaveLength(2)
    const slotNames = pwInput.children!.map(c => c.name)
    expect(slotNames).toContain('Input')
    expect(slotNames).toContain('Toggle')

    // Has visible/hidden states
    const stateNames = pwInput.states!.map(s => s.name)
    expect(stateNames).toContain('visible')
    expect(stateNames).toContain('hidden')
  })

  it('IconInput has Icon and Input slots', () => {
    const registry = buildCoreComponentRegistry()
    const iconInput = registry.get('IconInput')!

    expect(iconInput.children).toHaveLength(2)
    const slotNames = iconInput.children!.map(c => c.name)
    expect(slotNames).toContain('Icon')
    expect(slotNames).toContain('Input')
  })

  // Button Components
  it('PrimaryButton has correct styling', () => {
    const registry = buildCoreComponentRegistry()
    const btn = registry.get('PrimaryButton')!

    expect(btn.properties?.background).toBe('$primary.bg')
    expect(btn.properties?.color).toBe('$primary.text')
    expect(btn.properties?.cursor).toBe('pointer')
  })

  it('All buttons have hover, active, disabled states', () => {
    const registry = buildCoreComponentRegistry()
    const buttonNames = ['PrimaryButton', 'SecondaryButton', 'GhostButton', 'DangerButton']

    for (const name of buttonNames) {
      const btn = registry.get(name)!
      const stateNames = btn.states!.map(s => s.name)
      expect(stateNames).toContain('hover')
      expect(stateNames).toContain('active')
      expect(stateNames).toContain('disabled')
    }
  })
})

describe('Core Component Names', () => {
  it('exports all component names', () => {
    // Navigation
    expect(CORE_COMPONENT_NAMES).toContain('Nav')
    expect(CORE_COMPONENT_NAMES).toContain('NavItem')
    expect(CORE_COMPONENT_NAMES).toContain('NavItemBadge')
    expect(CORE_COMPONENT_NAMES).toContain('TreeItem')
    // Forms
    expect(CORE_COMPONENT_NAMES).toContain('Field')
    expect(CORE_COMPONENT_NAMES).toContain('TextInput')
    expect(CORE_COMPONENT_NAMES).toContain('IconInput')
    expect(CORE_COMPONENT_NAMES).toContain('PasswordInput')
    expect(CORE_COMPONENT_NAMES).toContain('TextareaInput')
    expect(CORE_COMPONENT_NAMES).toContain('SelectInput')
    // Buttons
    expect(CORE_COMPONENT_NAMES).toContain('PrimaryButton')
    expect(CORE_COMPONENT_NAMES).toContain('SecondaryButton')
    expect(CORE_COMPONENT_NAMES).toContain('GhostButton')
    expect(CORE_COMPONENT_NAMES).toContain('DangerButton')
    // 10 navigation + 6 form + 4 button = 20
    expect(CORE_COMPONENT_NAMES.length).toBe(20)
  })
})

describe('Core Tokens', () => {
  it('exports navigation tokens', () => {
    expect(CORE_TOKENS['$nav.bg']).toBe('#18181B')
    expect(CORE_TOKENS['$nav.hover']).toBe('#27272A')
    expect(CORE_TOKENS['$nav.text']).toBe('#D4D4D8')
  })

  it('exports form tokens', () => {
    expect(CORE_TOKENS['$form.bg']).toBe('#18181B')
    expect(CORE_TOKENS['$form.error']).toBe('#EF4444')
  })

  it('exports button tokens', () => {
    expect(CORE_TOKENS['$primary.bg']).toBe('#3B82F6')
    expect(CORE_TOKENS['$danger.bg']).toBe('#EF4444')
  })
})

// =============================================================================
// Parser Integration Tests
// =============================================================================

describe('Parser Integration', () => {
  it('parser has core components in registry', () => {
    const result = parse('Box', { skipDefaults: true })

    // Core components should be in the registry
    expect(result.registry.has('Nav')).toBe(true)
    expect(result.registry.has('NavItem')).toBe(true)
    expect(result.registry.has('NavItemBadge')).toBe(true)
    expect(result.registry.has('ToggleNav')).toBe(true)
    expect(result.registry.has('TreeItem')).toBe(true)
  })

  it('can use NavItem without defining it', () => {
    const code = `
Nav
  NavItem Icon "home"; Label "Dashboard"
  NavItem Icon "settings"; Label "Settings"
`
    const result = parse(code, { skipDefaults: true })

    // Should parse without errors
    expect(result.errors).toHaveLength(0)

    // Should have Nav as top-level node
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('Nav')

    // Nav should have NavItem children
    expect(result.nodes[0].children).toHaveLength(2)
    expect(result.nodes[0].children[0].name).toBe('NavItem')
    expect(result.nodes[0].children[1].name).toBe('NavItem')
  })

  it('NavItem inherits properties from core definition', () => {
    const code = `NavItem Icon "home"; Label "Home"`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    const navItem = result.nodes[0]
    expect(navItem.name).toBe('NavItem')

    // Should have inherited layout properties
    expect(navItem.properties._layout).toBe('horizontal')
    expect(navItem.properties.gap).toBe(12)
    expect(navItem.properties.cursor).toBe('pointer')

    // Should have Icon and Label children from template
    expect(navItem.children.length).toBeGreaterThanOrEqual(2)
  })

  it('inherits template properties from core definition', () => {
    const code = `NavItem Icon "user"; Label "Profile"`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    const navItem = result.nodes[0]
    // All template properties are inherited
    expect(navItem.properties._layout).toBe('horizontal')
    expect(navItem.properties.gap).toBe(12)
    expect(navItem.properties.cursor).toBe('pointer')
    expect(navItem.properties.radius).toBe(4)
  })

  it('can extend core component with from', () => {
    const code = `
BrandNavItem from NavItem:
  Label col #3B82F6

BrandNavItem Icon "star"; Label "Featured"
`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    // Should have the custom component in registry
    expect(result.registry.has('BrandNavItem')).toBe(true)

    // Instance should exist
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('BrandNavItem')
  })

  it('can use as syntax with core components', () => {
    const code = `myNav as Nav`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    // Should have myNav in registry (defined via as)
    expect(result.registry.has('myNav')).toBe(true)

    // Should have myNav as rendered node
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].name).toBe('myNav')

    // Template properties are inherited
    expect(result.nodes[0].properties.width).toBe(240)
    expect(result.nodes[0].properties._layout).toBe('vertical')
    expect(result.nodes[0].properties.background).toBe('$nav.bg')
  })

  it('core component states are preserved', () => {
    const code = `NavItem active, Icon "home"; Label "Home"`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    const navItem = result.nodes[0]
    // States should be inherited from core definition
    expect(navItem.states).toBeDefined()
    expect(navItem.states!.length).toBeGreaterThanOrEqual(2)

    const stateNames = navItem.states!.map(s => s.name)
    expect(stateNames).toContain('hover')
    expect(stateNames).toContain('active')
  })

  it('core component event handlers are preserved', () => {
    const code = `ToggleNav expanded`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    const toggleNav = result.nodes[0]
    // Event handlers should be inherited from core definition
    expect(toggleNav.eventHandlers).toBeDefined()
    expect(toggleNav.eventHandlers!.length).toBeGreaterThanOrEqual(1)
    expect(toggleNav.eventHandlers![0].event).toBe('onclick')
  })

  it('core component animations are preserved', () => {
    const code = `DrawerBackdrop`
    const result = parse(code, { skipDefaults: true })

    expect(result.errors).toHaveLength(0)

    const backdrop = result.nodes[0]
    // Animations should be inherited from core definition
    expect(backdrop.showAnimation).toBeDefined()
    expect(backdrop.showAnimation!.animations).toContain('fade')
    expect(backdrop.hideAnimation).toBeDefined()
  })

  it('state properties have correct token values', () => {
    const code = `NavItem Icon "home"; Label "Home"`
    const result = parse(code, { skipDefaults: true })

    const navItem = result.nodes[0]
    const hoverState = navItem.states?.find(s => s.name === 'hover')

    expect(hoverState).toBeDefined()
    expect(hoverState!.properties.background).toBe('$nav.hover')
  })
})

// =============================================================================
// Schema Integration Tests
// =============================================================================

describe('Master Schema - Core Components', () => {
  it('schema has all core components', () => {
    const names = getAllCoreComponentNames()

    // Navigation
    expect(names).toContain('Nav')
    expect(names).toContain('NavItem')
    expect(names).toContain('NavItemBadge')
    expect(names).toContain('NavSection')
    expect(names).toContain('ToggleNav')
    expect(names).toContain('TreeItem')
    expect(names).toContain('TreeLeaf')
    expect(names).toContain('DrawerNav')
    expect(names).toContain('DrawerBackdrop')
    expect(names).toContain('MenuButton')
    // Forms
    expect(names).toContain('Field')
    expect(names).toContain('TextInput')
    expect(names).toContain('IconInput')
    expect(names).toContain('PasswordInput')
    expect(names).toContain('TextareaInput')
    expect(names).toContain('SelectInput')
    // Buttons
    expect(names).toContain('PrimaryButton')
    expect(names).toContain('SecondaryButton')
    expect(names).toContain('GhostButton')
    expect(names).toContain('DangerButton')
    // 10 navigation + 6 form + 4 button = 20
    expect(names).toHaveLength(20)
  })

  it('getCoreComponentDefinition returns correct structure', () => {
    const navItem = getCoreComponentDefinition('NavItem')

    expect(navItem).toBeDefined()
    expect(navItem!.name).toBe('NavItem')
    expect(navItem!.category).toBe('navigation')
    expect(navItem!.description).toContain('Icon')
    expect(navItem!.description).toContain('Label')

    // Properties
    expect(navItem!.properties._layout).toBe('horizontal')
    expect(navItem!.properties.gap).toBe(12)

    // Slots
    expect(navItem!.slots).toHaveLength(2)
    expect(navItem!.slots[0].name).toBe('Icon')
    expect(navItem!.slots[1].name).toBe('Label')

    // States
    expect(navItem!.states).toHaveLength(2)
    expect(navItem!.states[0].name).toBe('hover')
    expect(navItem!.states[1].name).toBe('active')

    // Tokens
    expect(navItem!.tokens).toContain('$nav.muted')
    expect(navItem!.tokens).toContain('$nav.text')

    // Examples
    expect(navItem!.examples.length).toBeGreaterThan(0)
  })

  it('getCoreComponentsByCategory returns navigation components', () => {
    const navComponents = getCoreComponentsByCategory('navigation')

    expect(navComponents).toHaveLength(10)
    expect(navComponents.map(c => c.name)).toContain('Nav')
    expect(navComponents.map(c => c.name)).toContain('NavItem')
  })

  it('isCoreComponent returns correct values', () => {
    expect(isCoreComponent('NavItem')).toBe(true)
    expect(isCoreComponent('Nav')).toBe(true)
    expect(isCoreComponent('TreeItem')).toBe(true)
    expect(isCoreComponent('Button')).toBe(false)
    expect(isCoreComponent('Box')).toBe(false)
  })

  it('getAllCoreTokens returns token definitions', () => {
    const tokens = getAllCoreTokens()

    expect(tokens['$nav.bg']).toBeDefined()
    expect(tokens['$nav.bg'].value).toBe('#18181B')
    expect(tokens['$nav.bg'].description).toContain('Navigation')

    expect(tokens['$nav.hover']).toBeDefined()
    expect(tokens['$nav.text']).toBeDefined()
    expect(tokens['$form.error']).toBeDefined()
    expect(tokens['$primary.bg']).toBeDefined()
  })

  it('getCoreTokensForComponent returns component tokens', () => {
    const navItemTokens = getCoreTokensForComponent('NavItem')

    expect(navItemTokens).toContain('$nav.muted')
    expect(navItemTokens).toContain('$nav.text')
    expect(navItemTokens).toContain('$nav.hover')
    expect(navItemTokens).toContain('$nav.active')
  })

  it('CORE_COMPONENT_NAMES set contains all components', () => {
    // Navigation
    expect(SCHEMA_CORE_COMPONENTS.has('Nav')).toBe(true)
    expect(SCHEMA_CORE_COMPONENTS.has('NavItem')).toBe(true)
    expect(SCHEMA_CORE_COMPONENTS.has('MenuButton')).toBe(true)
    // Forms
    expect(SCHEMA_CORE_COMPONENTS.has('Field')).toBe(true)
    expect(SCHEMA_CORE_COMPONENTS.has('TextInput')).toBe(true)
    expect(SCHEMA_CORE_COMPONENTS.has('PasswordInput')).toBe(true)
    // Buttons
    expect(SCHEMA_CORE_COMPONENTS.has('PrimaryButton')).toBe(true)
    expect(SCHEMA_CORE_COMPONENTS.has('DangerButton')).toBe(true)
    // 10 navigation + 6 form + 4 button = 20
    expect(SCHEMA_CORE_COMPONENTS.size).toBe(20)
  })

  it('CORE_TOKENS set contains all tokens', () => {
    expect(SCHEMA_CORE_TOKENS.has('$nav.bg')).toBe(true)
    expect(SCHEMA_CORE_TOKENS.has('$nav.hover')).toBe(true)
    expect(SCHEMA_CORE_TOKENS.has('$form.error')).toBe(true)
    expect(SCHEMA_CORE_TOKENS.has('$primary.bg')).toBe(true)
  })
})
