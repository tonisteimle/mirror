/**
 * Dropdown Library Component Tests
 *
 * Tests the Dropdown components defined in library.mirror:
 * - DropdownTrigger
 * - DropdownItem
 * - DropdownMenu
 * - Dropdown
 *
 * Verifies:
 * 1. Parser correctly parses library components
 * 2. States (highlighted, selected, open) are defined
 * 3. Event handlers (onclick, onhover, onkeydown) are set up
 * 4. Animations (show/hide) are configured
 * 5. Chained actions work correctly
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { parse } from '../../parser/parser'
import * as fs from 'fs'
import * as path from 'path'

// Load library.mirror content
const libraryPath = path.join(process.cwd(), 'public', 'library.mirror')
const libraryCode = fs.readFileSync(libraryPath, 'utf-8')

// TODO: Dropdown components not yet added to library.mirror
describe.skip('Dropdown Library Components', () => {
  let result: ReturnType<typeof parse>

  beforeAll(() => {
    result = parse(libraryCode)
  })

  // ============================================================
  // PARSE ERRORS
  // ============================================================

  describe('Parse Errors', () => {
    it('should parse library.mirror with only expected warnings', () => {
      // Library uses "--- Section ---" dividers which generate warnings
      // Filter out expected divider warnings
      const criticalErrors = result.errors.filter(
        (e) => e.message && !e.message.includes('Unexpected token "-"')
      )
      expect(criticalErrors).toHaveLength(0)
    })
  })

  // ============================================================
  // DROPDOWN TOKENS
  // Note: Compound tokens like $dropdown.bg are handled by the token
  // resolution system, not stored directly in result.tokens
  // ============================================================

  // ============================================================
  // DROPDOWN TRIGGER
  // ============================================================

  describe('DropdownTrigger', () => {
    it('should be defined in registry', () => {
      expect(result.registry.has('DropdownTrigger')).toBe(true)
    })

    it('should have horizontal layout', () => {
      const template = result.registry.get('DropdownTrigger')
      expect(template?.properties?.hor).toBe(true)
    })

    it('should have Value slot', () => {
      const template = result.registry.get('DropdownTrigger')
      const hasValue = template?.children?.some((c) => c.name === 'Value')
      expect(hasValue).toBe(true)
    })

    it('should have ChevronIcon slot with named reference', () => {
      const template = result.registry.get('DropdownTrigger')
      const chevron = template?.children?.find((c) => c.name === 'Icon')
      expect(chevron?.instanceName).toBe('ChevronIcon')
    })

    it('should have onclick toggle DropdownMenu event', () => {
      const template = result.registry.get('DropdownTrigger')
      const onclickHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onclick'
      )
      expect(onclickHandler).toBeDefined()
      expect(onclickHandler?.actions[0]).toMatchObject({
        type: 'toggle',
        target: 'DropdownMenu',
      })
    })

    it('should have state open with chevron rotation', () => {
      const template = result.registry.get('DropdownTrigger')
      const openState = template?.states?.find((s) => s.name === 'open')
      expect(openState).toBeDefined()
      // State should have child override for ChevronIcon with rotation
      expect(openState?.children?.length).toBeGreaterThan(0)
    })

    it('should have hover state', () => {
      const template = result.registry.get('DropdownTrigger')
      const hoverState = template?.states?.find((s) => s.name === 'hover')
      expect(hoverState).toBeDefined()
    })
  })

  // ============================================================
  // DROPDOWN ITEM
  // ============================================================

  describe('DropdownItem', () => {
    it('should be defined in registry', () => {
      expect(result.registry.has('DropdownItem')).toBe(true)
    })

    it('should have cursor pointer', () => {
      const template = result.registry.get('DropdownItem')
      expect(template?.properties?.cursor).toBe('pointer')
    })

    it('should have state default', () => {
      const template = result.registry.get('DropdownItem')
      const defaultState = template?.states?.find((s) => s.name === 'default')
      expect(defaultState).toBeDefined()
    })

    it('should have state highlighted', () => {
      const template = result.registry.get('DropdownItem')
      const highlightedState = template?.states?.find(
        (s) => s.name === 'highlighted'
      )
      expect(highlightedState).toBeDefined()
    })

    it('should have state selected', () => {
      const template = result.registry.get('DropdownItem')
      const selectedState = template?.states?.find((s) => s.name === 'selected')
      expect(selectedState).toBeDefined()
    })

    it('should have onhover highlight self event', () => {
      const template = result.registry.get('DropdownItem')
      const onhoverHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onhover'
      )
      expect(onhoverHandler).toBeDefined()
      expect(onhoverHandler?.actions[0]).toMatchObject({
        type: 'highlight',
        target: 'self',
      })
    })

    it('should have onclick with chained actions (select + close)', () => {
      const template = result.registry.get('DropdownItem')
      const onclickHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onclick'
      )
      expect(onclickHandler).toBeDefined()
      // Should have 2 actions: select self, close DropdownMenu
      expect(onclickHandler?.actions).toHaveLength(2)
      expect(onclickHandler?.actions[0]).toMatchObject({
        type: 'select',
        target: 'self',
      })
      expect(onclickHandler?.actions[1]).toMatchObject({
        type: 'close',
        target: 'DropdownMenu',
      })
    })
  })

  // ============================================================
  // DROPDOWN MENU
  // ============================================================

  describe('DropdownMenu', () => {
    it('should be defined in registry', () => {
      expect(result.registry.has('DropdownMenu')).toBe(true)
    })

    it('should be hidden by default', () => {
      const template = result.registry.get('DropdownMenu')
      expect(template?.properties?.hidden).toBe(true)
    })

    it('should have vertical layout', () => {
      const template = result.registry.get('DropdownMenu')
      expect(template?.properties?.ver).toBe(true)
    })

    it('should have show animation with fade and slide-down', () => {
      const template = result.registry.get('DropdownMenu')
      expect(template?.showAnimation).toBeDefined()
      expect(template?.showAnimation?.animations).toContain('fade')
      expect(template?.showAnimation?.animations).toContain('slide-down')
      expect(template?.showAnimation?.duration).toBe(150)
    })

    it('should have hide animation with fade', () => {
      const template = result.registry.get('DropdownMenu')
      expect(template?.hideAnimation).toBeDefined()
      expect(template?.hideAnimation?.animations).toContain('fade')
      expect(template?.hideAnimation?.duration).toBe(100)
    })

    it('should have onclick-outside close self event', () => {
      const template = result.registry.get('DropdownMenu')
      const clickOutsideHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onclick-outside'
      )
      expect(clickOutsideHandler).toBeDefined()
      expect(clickOutsideHandler?.actions[0]).toMatchObject({
        type: 'close',
        target: 'self',
      })
    })

    it('should have onkeydown escape close self event', () => {
      const template = result.registry.get('DropdownMenu')
      const escapeHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'escape'
      )
      expect(escapeHandler).toBeDefined()
      expect(escapeHandler?.actions[0]).toMatchObject({
        type: 'close',
        target: 'self',
      })
    })

    it('should have onkeydown arrow-down highlight next event', () => {
      const template = result.registry.get('DropdownMenu')
      const arrowDownHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'arrow-down'
      )
      expect(arrowDownHandler).toBeDefined()
      expect(arrowDownHandler?.actions[0]).toMatchObject({
        type: 'highlight',
        target: 'next',
      })
    })

    it('should have onkeydown arrow-up highlight prev event', () => {
      const template = result.registry.get('DropdownMenu')
      const arrowUpHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'arrow-up'
      )
      expect(arrowUpHandler).toBeDefined()
      expect(arrowUpHandler?.actions[0]).toMatchObject({
        type: 'highlight',
        target: 'prev',
      })
    })

    it('should have onkeydown enter with chained actions', () => {
      const template = result.registry.get('DropdownMenu')
      const enterHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'enter'
      )
      expect(enterHandler).toBeDefined()
      // Should have 2 actions: select highlighted, close self
      expect(enterHandler?.actions).toHaveLength(2)
      expect(enterHandler?.actions[0]).toMatchObject({
        type: 'select',
        target: 'highlighted',
      })
      expect(enterHandler?.actions[1]).toMatchObject({
        type: 'close',
        target: 'self',
      })
    })

    it('should have onkeydown home highlight first event', () => {
      const template = result.registry.get('DropdownMenu')
      const homeHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'home'
      )
      expect(homeHandler).toBeDefined()
      expect(homeHandler?.actions[0]).toMatchObject({
        type: 'highlight',
        target: 'first',
      })
    })

    it('should have onkeydown end highlight last event', () => {
      const template = result.registry.get('DropdownMenu')
      const endHandler = template?.eventHandlers?.find(
        (h) => h.event === 'onkeydown' && h.key === 'end'
      )
      expect(endHandler).toBeDefined()
      expect(endHandler?.actions[0]).toMatchObject({
        type: 'highlight',
        target: 'last',
      })
    })
  })

  // ============================================================
  // DROPDOWN (COMPOSED)
  // ============================================================

  describe('Dropdown (Container)', () => {
    it('should be defined in registry', () => {
      expect(result.registry.has('Dropdown')).toBe(true)
    })

    it('should have vertical layout', () => {
      const template = result.registry.get('Dropdown')
      expect(template?.properties?.ver).toBe(true)
    })

    it('should have gap 4', () => {
      const template = result.registry.get('Dropdown')
      expect(template?.properties?.g).toBe(4)
    })

    it('should have DropdownTrigger slot', () => {
      const template = result.registry.get('Dropdown')
      const hasTrigger = template?.children?.some(
        (c) => c.name === 'DropdownTrigger'
      )
      expect(hasTrigger).toBe(true)
    })

    it('should have DropdownMenu slot', () => {
      const template = result.registry.get('Dropdown')
      const hasMenu = template?.children?.some(
        (c) => c.name === 'DropdownMenu'
      )
      expect(hasMenu).toBe(true)
    })
  })
})

// ============================================================
// USAGE TEST - Dropdown with Items
// ============================================================

describe('Dropdown Usage', () => {
  it('should parse dropdown instance with items', () => {
    const code = `
${libraryCode}

Dropdown
  DropdownTrigger Value "Select option..."
  DropdownMenu
    DropdownItem "Dashboard"
    DropdownItem "Settings"
    DropdownItem "Profile"
`
    const result = parse(code)

    // Filter expected warnings (--- dividers and compound tokens)
    const criticalErrors = result.errors.filter(
      (e) => e.message && !e.message.includes('Unexpected token "-"')
    )
    expect(criticalErrors).toHaveLength(0)

    // Find our Dropdown instance (library may have other rendered nodes)
    const dropdown = result.nodes.find((n) => n.name === 'Dropdown')
    expect(dropdown).toBeDefined()

    // Find DropdownMenu and verify it has items
    const menu = dropdown?.children.find((c) => c.name === 'DropdownMenu')
    expect(menu).toBeDefined()

    const items = menu?.children.filter((c) => c.name === 'DropdownItem') || []
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it('should support custom styling on dropdown components', () => {
    const code = `
${libraryCode}

Dropdown
  DropdownTrigger w 300, bg #1E1E2E, Value "Custom Styled"
  DropdownMenu w 300, bg #1E1E2E
    DropdownItem "Option A"
    DropdownItem col #EF4444, "Delete"
`
    const result = parse(code)

    // Filter expected warnings (--- dividers and compound tokens)
    const criticalErrors = result.errors.filter(
      (e) => e.message && !e.message.includes('Unexpected token "-"')
    )
    expect(criticalErrors).toHaveLength(0)

    // Find our Dropdown instance
    const dropdown = result.nodes.find((n) => n.name === 'Dropdown')
    expect(dropdown).toBeDefined()

    const trigger = dropdown?.children.find(
      (c) => c.name === 'DropdownTrigger'
    )
    expect(trigger?.properties?.w).toBe(300)
    expect(trigger?.properties?.bg).toBe('#1E1E2E')
  })
})
