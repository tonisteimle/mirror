/**
 * Template Inheritance Tests
 *
 * Comprehensive tests for component definition and instance inheritance.
 * Verifies that children defined in templates are correctly inherited by instances.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { parse } from '../../parser/parser'
import {
  generateReactElement,
  BehaviorRegistryProvider,
  ComponentRegistryProvider,
  RuntimeVariableProvider,
  OverlayRegistryProvider
} from '../../generator/react-generator'

// Wrapper component that provides all necessary contexts
function PreviewWrapper({ children }: { children: React.ReactNode }) {
  return (
    <BehaviorRegistryProvider>
      <ComponentRegistryProvider>
        <RuntimeVariableProvider>
          <OverlayRegistryProvider>
            {children}
          </OverlayRegistryProvider>
        </RuntimeVariableProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
}

// Helper to parse and render code
function parseAndRender(code: string) {
  const result = parse(code)
  const instances = result.nodes.filter(n => !n._isExplicitDefinition)
  const element = generateReactElement(instances, {})
  const { container } = render(
    <PreviewWrapper>
      <div data-testid="root">{element}</div>
    </PreviewWrapper>
  )
  return { result, container, instances }
}

// Helper to count elements by class name
function countByClass(container: HTMLElement, className: string): number {
  return container.querySelectorAll(`.${className}`).length
}

// Helper to count Icon elements (rendered as SVG or span with material class)
function countIcons(container: HTMLElement): number {
  const svgIcons = container.querySelectorAll('svg')
  const materialIcons = container.querySelectorAll('.material-symbols-outlined')
  return svgIcons.length + materialIcons.length
}

// Helper to count Text elements by content
function countTextContent(container: HTMLElement, text: string): number {
  const allElements = container.querySelectorAll('*')
  let count = 0
  allElements.forEach(el => {
    if (el.textContent === text && el.children.length === 0) {
      count++
    }
  })
  return count
}

describe('Template Inheritance', () => {

  // ==========================================================================
  // Scenario 1: Explicit Definition (with colon)
  // ==========================================================================
  describe('Scenario 1: Explicit Definition', () => {
    it('definition does not render, only instance renders', () => {
      const code = `
Item:
  Icon "beer"
  Text "Bier"

Item
`
      const { container, instances } = parseAndRender(code)

      // Only 1 instance (the Item without colon)
      expect(instances.length).toBe(1)

      // Should have 1 Item rendered
      expect(countByClass(container, 'Item')).toBe(1)

      // Should have 1 Icon
      expect(countIcons(container)).toBe(1)

      // Should have text "Bier"
      expect(container.textContent).toContain('Bier')
    })
  })

  // ==========================================================================
  // Scenario 2: Explicit Definition + Multiple Instances
  // ==========================================================================
  describe('Scenario 2: Multiple Instances', () => {
    it('all instances inherit children from definition', () => {
      const code = `
Item:
  Icon "star"
  Text "Favorit"

Item
Item
Item
`
      const { container, instances } = parseAndRender(code)

      // 3 instances
      expect(instances.length).toBe(3)

      // Should have 3 Items rendered
      expect(countByClass(container, 'Item')).toBe(3)

      // Should have 3 Icons (one per Item)
      expect(countIcons(container)).toBe(3)

      // Should have "Favorit" 3 times
      expect(countTextContent(container, 'Favorit')).toBe(3)
    })
  })

  // ==========================================================================
  // Scenario 3: Implicit Definition (without colon)
  // ==========================================================================
  describe('Scenario 3: Implicit Definition', () => {
    it('first usage with children becomes implicit template', () => {
      const code = `
Item
  Icon "beer"
  Text "Bier"

Item
Item
`
      const { container, instances } = parseAndRender(code)

      // 3 instances (first one defines implicitly AND renders)
      expect(instances.length).toBe(3)

      // Should have 3 Items rendered
      expect(countByClass(container, 'Item')).toBe(3)

      // Should have 3 Icons
      expect(countIcons(container)).toBe(3)

      // Should have "Bier" 3 times
      expect(countTextContent(container, 'Bier')).toBe(3)
    })
  })

  // ==========================================================================
  // Scenario 4: Definition + Instances in Container
  // ==========================================================================
  describe('Scenario 4: Instances in Container', () => {
    it('instances inside container inherit from global definition', () => {
      const code = `
Item:
  Icon "beer"
  Text "Bier"

Nav
  Item
  Item
`
      const { container, instances } = parseAndRender(code)

      // 1 instance (Nav), Item: is definition
      expect(instances.length).toBe(1)
      expect(instances[0].name).toBe('Nav')

      // Nav should have 2 Item children
      expect(instances[0].children.length).toBe(2)
      expect(instances[0].children[0].name).toBe('Item')
      expect(instances[0].children[1].name).toBe('Item')

      // Each Item should have 2 children (Icon + Text)
      expect(instances[0].children[0].children.length).toBe(2)
      expect(instances[0].children[1].children.length).toBe(2)

      // Should render 2 Icons (one per Item in Nav)
      expect(countIcons(container)).toBe(2)

      // Should have "Bier" 2 times
      expect(countTextContent(container, 'Bier')).toBe(2)
    })
  })

  // ==========================================================================
  // Scenario 5: Implicit Definition + Container
  // ==========================================================================
  describe('Scenario 5: Implicit Definition + Container', () => {
    it('standalone implicit definition + container instances all render', () => {
      const code = `
Item
  Icon "beer"
  Text "Bier"

Nav
  Item
  Item
`
      const { container, instances } = parseAndRender(code)

      // 2 instances: standalone Item + Nav
      expect(instances.length).toBe(2)

      // Should have 3 Items total (1 standalone + 2 in Nav)
      expect(countByClass(container, 'Item')).toBe(3)

      // Should have 3 Icons
      expect(countIcons(container)).toBe(3)

      // Should have "Bier" 3 times
      expect(countTextContent(container, 'Bier')).toBe(3)
    })
  })

  // ==========================================================================
  // Scenario 6: Nested Definitions (Slots)
  // ==========================================================================
  describe('Scenario 6: Nested Definitions', () => {
    it('nested slots can be filled in instances', () => {
      const code = `
Card:
  Header:
    Title "Default Title"
  Content:
    Text "Default Content"

Card
  Title "Custom Title"
  Content
    Text "Custom Content"
`
      const { container, instances } = parseAndRender(code)

      // 1 instance (Card)
      expect(instances.length).toBe(1)

      // Should show custom title
      expect(container.textContent).toContain('Custom Title')

      // Should show custom content
      expect(container.textContent).toContain('Custom Content')

      // Should NOT show default values (they were overridden)
      expect(container.textContent).not.toContain('Default Title')
    })
  })

  // ==========================================================================
  // Scenario 7: Component Inheritance
  // ==========================================================================
  describe('Scenario 7: Component Inheritance', () => {
    it('child component inherits and can override parent slots', () => {
      const code = `
Button:
  ButtonIcon as Icon "check", hidden
  ButtonLabel as Text "OK"

DangerButton: Button
  ButtonIcon "alert-triangle", visible

DangerButton
`
      const { container, instances } = parseAndRender(code)

      // 1 instance (DangerButton)
      expect(instances.length).toBe(1)

      // Should have icon visible (overridden from hidden)
      expect(countIcons(container)).toBe(1)

      // Should have label "OK" (inherited)
      expect(container.textContent).toContain('OK')
    })
  })

  // ==========================================================================
  // Scenario 8: Layout Slot with Custom Definition
  // ==========================================================================
  describe('Scenario 8: Layout Slot with Custom Definition', () => {
    it('custom definition is used even when name matches layout slot', () => {
      const code = `
Item:
  Icon "star"
  Text "Favorit"

Nav
  Item
  Item

Sidebar
  Item
`
      const { container, instances } = parseAndRender(code)

      // 2 instances: Nav + Sidebar
      expect(instances.length).toBe(2)

      // Nav should have 2 Items with children
      const nav = instances.find(n => n.name === 'Nav')
      expect(nav).toBeDefined()
      expect(nav!.children.length).toBe(2)
      expect(nav!.children[0].children.length).toBe(2) // Icon + Text
      expect(nav!.children[1].children.length).toBe(2)

      // Sidebar should have 1 Item with children
      const sidebar = instances.find(n => n.name === 'Sidebar')
      expect(sidebar).toBeDefined()
      expect(sidebar!.children.length).toBe(1)
      expect(sidebar!.children[0].children.length).toBe(2) // Icon + Text

      // Total: 3 Icons
      expect(countIcons(container)).toBe(3)

      // Total: 3x "Favorit"
      expect(countTextContent(container, 'Favorit')).toBe(3)
    })
  })

  // ==========================================================================
  // Scenario 9: Overriding Slot Contents (Semicolon Syntax)
  // ==========================================================================
  describe('Scenario 9: Overriding Slot Contents', () => {
    it('semicolon syntax overrides individual slot properties', () => {
      const code = `
NavItem:
  NavIcon as Icon "circle"
  NavLabel as Text "Default"

Nav
  NavItem NavIcon "home"; NavLabel "Home"
  NavItem NavIcon "settings"; NavLabel "Settings"
  NavItem NavIcon "user"; NavLabel "Profile"
`
      const { container, instances } = parseAndRender(code)

      // 1 instance (Nav)
      expect(instances.length).toBe(1)

      // Should have 3 NavItems
      const nav = instances[0]
      expect(nav.children.length).toBe(3)

      // Each should have overridden values
      expect(container.textContent).toContain('Home')
      expect(container.textContent).toContain('Settings')
      expect(container.textContent).toContain('Profile')

      // Should NOT have default text
      expect(container.textContent).not.toContain('Default')

      // Should have 3 Icons
      expect(countIcons(container)).toBe(3)
    })
  })

  // ==========================================================================
  // Scenario 10: Deep Nesting
  // ==========================================================================
  describe('Scenario 10: Deep Nesting', () => {
    it('deeply nested slots inherit and can be overridden', () => {
      const code = `
Card:
  Header:
    Left:
      Icon "info"
    Right:
      Badge "NEW"
  Content:
    Text "Card content"

Card
  Left
    Icon "alert-triangle"
`
      const { container, instances } = parseAndRender(code)

      // 1 instance (Card)
      expect(instances.length).toBe(1)

      // Should have Badge "NEW" (inherited from definition)
      expect(container.textContent).toContain('NEW')

      // Should have "Card content" (inherited from definition)
      expect(container.textContent).toContain('Card content')

      // Should have at least 1 icon (the overridden warning icon)
      expect(countIcons(container)).toBeGreaterThanOrEqual(1)
    })
  })

  // ==========================================================================
  // Regression: Layout Slot Should Not Block Inheritance
  // ==========================================================================
  describe('Regression: Layout Slot Inheritance', () => {
    it('Item in Nav inherits from Item definition (not blocked by layout slot)', () => {
      // This was the original bug: Nav has "Item" as a layout slot,
      // which was blocking inheritance from the global Item: definition
      const code = `
Item:
  Icon "beer"
  Text "Bier"

Nav
  Item
  Item
`
      const { result, container } = parseAndRender(code)

      // Check AST: Nav's Items should have children
      const nav = result.nodes.find(n => n.name === 'Nav')
      expect(nav).toBeDefined()
      expect(nav!.children[0].name).toBe('Item')
      expect(nav!.children[0].children.length).toBe(2) // Icon + Text
      expect(nav!.children[1].children.length).toBe(2)

      // Check rendered output: should have 2 Icons
      expect(countIcons(container)).toBe(2)

      // Should have "Bier" twice
      expect(countTextContent(container, 'Bier')).toBe(2)
    })
  })

})
