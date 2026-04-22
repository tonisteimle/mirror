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

  describe('DatePicker Component', () => {
    it('should include DatePicker with slots', () => {
      const datePicker = COMPONENTS_SECTION.find(c => c.id === 'comp-date-picker')
      expect(datePicker).toBeDefined()
      expect(datePicker?.template).toBe('DatePicker')
      expect(datePicker?.children?.find(c => c.template === 'Control')?.isSlot).toBe(true)
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

    it('should generate nested slot children correctly for DatePicker', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const buildCode = (panel as any).buildComponentCode.bind(panel)
      const datePicker = COMPONENTS_SECTION.find(c => c.id === 'comp-date-picker')!
      const code = buildCode(datePicker)

      expect(code).toContain('Control:')
      expect(code).toContain('Input:')
      expect(code).toContain('Trigger:')
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

    it('should have key components available', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const sections = panel.getSections()
      const allItems = sections.flatMap(s => s.items)

      // Check for key components (Select is Pure Mirror, DatePicker is only Zag)
      const componentIds = ['comp-select', 'comp-date-picker']
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
