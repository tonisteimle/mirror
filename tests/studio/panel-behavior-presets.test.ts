/**
 * Tests for Component Panel with Zag Components
 *
 * Tests the new simplified structure:
 * - Layout section (Row, Column, Grid, Stack)
 * - Components section (all UI components alphabetically)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { LAYOUT_SECTION, COMPONENTS_SECTION } from '../../studio/panels/components/layout-presets'
import { ComponentPanel } from '../../studio/panels/components/component-panel'

describe('Component Panel Structure', () => {
  describe('Layout Section', () => {
    it('should include Column layout', () => {
      const column = LAYOUT_SECTION.find(c => c.id === 'layout-column')
      expect(column).toBeDefined()
      expect(column?.template).toBe('Frame')
      expect(column?.properties).toContain('ver')
    })

    it('should include Row layout', () => {
      const row = LAYOUT_SECTION.find(c => c.id === 'layout-row')
      expect(row).toBeDefined()
      expect(row?.template).toBe('Frame')
      expect(row?.properties).toContain('hor')
    })

    it('should include Grid layout', () => {
      const grid = LAYOUT_SECTION.find(c => c.id === 'layout-grid')
      expect(grid).toBeDefined()
      expect(grid?.template).toBe('Frame')
      expect(grid?.properties).toContain('grid')
    })

    it('should include Stack layout', () => {
      const stack = LAYOUT_SECTION.find(c => c.id === 'layout-stack')
      expect(stack).toBeDefined()
      expect(stack?.template).toBe('Frame')
      expect(stack?.properties).toContain('stacked')
    })
  })

  describe('Basic Components', () => {
    it('should include Text component', () => {
      const text = COMPONENTS_SECTION.find(c => c.id === 'comp-text')
      expect(text).toBeDefined()
      expect(text?.template).toBe('Text')
    })

    it('should include Frame component', () => {
      const frame = COMPONENTS_SECTION.find(c => c.id === 'comp-frame')
      expect(frame).toBeDefined()
      expect(frame?.template).toBe('Frame')
    })

    it('should include Image component', () => {
      const image = COMPONENTS_SECTION.find(c => c.id === 'comp-image')
      expect(image).toBeDefined()
      expect(image?.template).toBe('Image')
    })

    it('should include Icon component', () => {
      const icon = COMPONENTS_SECTION.find(c => c.id === 'comp-icon')
      expect(icon).toBeDefined()
      expect(icon?.template).toBe('Icon')
    })

    it('should include Button component', () => {
      const button = COMPONENTS_SECTION.find(c => c.id === 'comp-button')
      expect(button).toBeDefined()
      expect(button?.template).toBe('Button')
    })

    it('should include Input component', () => {
      const input = COMPONENTS_SECTION.find(c => c.id === 'comp-input')
      expect(input).toBeDefined()
      expect(input?.template).toBe('Input')
    })
  })

  describe('Zag Select Components', () => {
    it('should include Select with Frame-based implementation', () => {
      const select = COMPONENTS_SECTION.find(c => c.id === 'comp-select')
      expect(select).toBeDefined()
      // Select is now implemented as a Frame with name Select
      expect(select?.template).toBe('Frame')
      expect(select?.name).toBe('Select')
      // Uses mirTemplate for complex multi-line component
      expect(select?.mirTemplate).toBeDefined()
      expect(select?.mirTemplate).toContain('name Select')
      expect(select?.mirTemplate).toContain('Trigger')
      expect(select?.mirTemplate).toContain('Content')
      expect(select?.mirTemplate).toContain('Item')
    })
  })

  describe('Zag Form Controls', () => {
    it('should include Checkbox with Control and Label slots', () => {
      const checkbox = COMPONENTS_SECTION.find(c => c.id === 'comp-checkbox')
      expect(checkbox).toBeDefined()
      expect(checkbox?.children?.find(c => c.template === 'Control')?.isSlot).toBe(true)
      expect(checkbox?.children?.find(c => c.template === 'Label')?.isSlot).toBe(true)
    })

    it('should include Switch with Track and Thumb slots', () => {
      const toggle = COMPONENTS_SECTION.find(c => c.id === 'comp-switch')
      expect(toggle).toBeDefined()
      expect(toggle?.children?.find(c => c.template === 'Track')?.isSlot).toBe(true)
      expect(toggle?.children?.find(c => c.template === 'Thumb')?.isSlot).toBe(true)
    })

    it('should include Slider with Track, Range, Thumb slots', () => {
      const slider = COMPONENTS_SECTION.find(c => c.id === 'comp-slider')
      expect(slider).toBeDefined()
      expect(slider?.children?.find(c => c.template === 'Track')?.isSlot).toBe(true)
      expect(slider?.children?.find(c => c.template === 'Range')?.isSlot).toBe(true)
      expect(slider?.children?.find(c => c.template === 'Thumb')?.isSlot).toBe(true)
    })

    it('should include Radio Group with items', () => {
      const radio = COMPONENTS_SECTION.find(c => c.id === 'comp-radio-group')
      expect(radio).toBeDefined()
      expect(radio?.children?.filter(c => c.isItem).length).toBe(3)
    })
  })

  describe('Zag Overlays', () => {
    it('should include Dialog with Trigger, Backdrop, Content slots', () => {
      const dialog = COMPONENTS_SECTION.find(c => c.id === 'comp-dialog')
      expect(dialog).toBeDefined()
      expect(dialog?.children?.find(c => c.template === 'Trigger')?.isSlot).toBe(true)
      expect(dialog?.children?.find(c => c.template === 'Backdrop')?.isSlot).toBe(true)
      expect(dialog?.children?.find(c => c.template === 'Content')?.isSlot).toBe(true)
    })

    it('should include Tooltip', () => {
      const tooltip = COMPONENTS_SECTION.find(c => c.id === 'comp-tooltip')
      expect(tooltip).toBeDefined()
      expect(tooltip?.template).toBe('Tooltip')
    })
  })

  describe('Zag Navigation', () => {
    it('should include Tabs with List slot and Tab items', () => {
      const tabs = COMPONENTS_SECTION.find(c => c.id === 'comp-tabs')
      expect(tabs).toBeDefined()
      const list = tabs?.children?.find(c => c.template === 'List')
      expect(list?.isSlot).toBe(true)
      // Tab items are nested inside List slot
      expect(list?.children?.filter(c => c.template === 'Tab').length).toBe(3)
    })

    it('should include SideNav', () => {
      const sidenav = COMPONENTS_SECTION.find(c => c.id === 'comp-sidenav')
      expect(sidenav).toBeDefined()
      expect(sidenav?.template).toBe('SideNav')
    })
  })

  describe('Code Generation', () => {
    it('should use mirTemplate for complex components like Select', () => {
      // Select uses mirTemplate for multi-line code, not buildComponentCode
      const select = COMPONENTS_SECTION.find(c => c.id === 'comp-select')!

      // mirTemplate contains the full complex component code
      expect(select.mirTemplate).toBeDefined()
      expect(select.mirTemplate).toContain('Frame name Select')
      expect(select.mirTemplate).toContain('Frame name Trigger')
      expect(select.mirTemplate).toContain('Frame name Content')
      expect(select.mirTemplate).toContain('Frame name Item')
    })

    it('should generate nested slot children correctly', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const buildCode = (panel as any).buildComponentCode.bind(panel)
      const dialog = COMPONENTS_SECTION.find(c => c.id === 'comp-dialog')!
      const code = buildCode(dialog)

      expect(code).toContain('Trigger:')
      expect(code).toContain('Button')
      expect(code).toContain('Backdrop:')
      expect(code).toContain('Content:')

      panel.dispose()
    })
  })

  describe('Component Panel getSections', () => {
    it('should have Layout and Components sections', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const sections = panel.getSections()
      const sectionNames = sections.map(s => s.name)

      expect(sectionNames).toContain('Layout')
      expect(sectionNames).toContain('Components')

      panel.dispose()
    })

    it('should have all Zag components available', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const sections = panel.getSections()
      const allItems = sections.flatMap(s => s.items)

      // Check for key components
      const componentIds = [
        'comp-select',
        'comp-checkbox',
        'comp-switch',
        'comp-slider',
        'comp-dialog',
        'comp-tabs',
      ]
      for (const id of componentIds) {
        expect(
          allItems.find(i => i.id === id),
          `Missing component: ${id}`
        ).toBeDefined()
      }

      panel.dispose()
    })
  })
})
