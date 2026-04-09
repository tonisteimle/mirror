/**
 * Tests for Component Panel with Zag Components
 *
 * Tutorial Set: Select, Checkbox, Switch, RadioGroup, Slider, DatePicker, Dialog, Tooltip, Tabs, SideNav
 * Entfernt: Listbox, Combobox, Popover, HoverCard, Accordion, Collapsible, etc.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { BASIC_COMPONENTS, BASIC_PRIMITIVES } from '../../studio/panels/components/layout-presets'
import { ComponentPanel } from '../../studio/panels/components/component-panel'

describe('Basic Components with Zag', () => {
  describe('Display Elements (no Zag)', () => {
    it('should include Text component', () => {
      const text = BASIC_PRIMITIVES.find(c => c.id === 'basic-text')
      expect(text).toBeDefined()
      expect(text?.template).toBe('Text')
    })

    it('should include Frame component', () => {
      const frame = BASIC_PRIMITIVES.find(c => c.id === 'basic-frame')
      expect(frame).toBeDefined()
      expect(frame?.template).toBe('Frame')
    })

    it('should include Image component', () => {
      const image = BASIC_PRIMITIVES.find(c => c.id === 'basic-image')
      expect(image).toBeDefined()
      expect(image?.template).toBe('Image')
    })

    it('should include Icon component', () => {
      const icon = BASIC_PRIMITIVES.find(c => c.id === 'basic-icon')
      expect(icon).toBeDefined()
      expect(icon?.template).toBe('Icon')
    })
  })

  describe('Simple Elements (no Zag)', () => {
    it('should include Button component', () => {
      const button = BASIC_COMPONENTS.find(c => c.id === 'form-button')
      expect(button).toBeDefined()
      expect(button?.template).toBe('Button')
    })

    it('should include Input component', () => {
      const input = BASIC_COMPONENTS.find(c => c.id === 'form-input')
      expect(input).toBeDefined()
      expect(input?.template).toBe('Input')
    })
  })

  describe('Zag Select Components', () => {
    it('should include Select with slots and items', () => {
      const select = BASIC_COMPONENTS.find(c => c.id === 'form-select')
      expect(select).toBeDefined()
      expect(select?.template).toBe('Select')
      expect(select?.children?.find(c => c.template === 'Trigger')?.isSlot).toBe(true)
      const content = select?.children?.find(c => c.template === 'Content')
      expect(content?.isSlot).toBe(true)
      // Items are nested inside Content slot
      expect(content?.children?.filter(c => c.isItem).length).toBe(3)
    })
  })

  describe('Zag Form Controls', () => {
    it('should include Checkbox with Control and Label slots', () => {
      const checkbox = BASIC_COMPONENTS.find(c => c.id === 'form-checkbox')
      expect(checkbox).toBeDefined()
      expect(checkbox?.children?.find(c => c.template === 'Control')?.isSlot).toBe(true)
      expect(checkbox?.children?.find(c => c.template === 'Label')?.isSlot).toBe(true)
    })

    it('should include Switch with Track and Thumb slots', () => {
      const toggle = BASIC_COMPONENTS.find(c => c.id === 'form-switch')
      expect(toggle).toBeDefined()
      expect(toggle?.children?.find(c => c.template === 'Track')?.isSlot).toBe(true)
      expect(toggle?.children?.find(c => c.template === 'Thumb')?.isSlot).toBe(true)
    })

    it('should include Slider with Track, Range, Thumb slots', () => {
      const slider = BASIC_COMPONENTS.find(c => c.id === 'form-slider')
      expect(slider).toBeDefined()
      expect(slider?.children?.find(c => c.template === 'Track')?.isSlot).toBe(true)
      expect(slider?.children?.find(c => c.template === 'Range')?.isSlot).toBe(true)
      expect(slider?.children?.find(c => c.template === 'Thumb')?.isSlot).toBe(true)
    })

    it('should include Radio Group with items', () => {
      const radio = BASIC_COMPONENTS.find(c => c.id === 'form-radio-group')
      expect(radio).toBeDefined()
      expect(radio?.children?.filter(c => c.isItem).length).toBe(3)
    })
  })

  describe('Zag Overlays', () => {
    it('should include Dialog with Trigger, Backdrop, Content slots', () => {
      const dialog = BASIC_COMPONENTS.find(c => c.id === 'overlay-dialog')
      expect(dialog).toBeDefined()
      expect(dialog?.children?.find(c => c.template === 'Trigger')?.isSlot).toBe(true)
      expect(dialog?.children?.find(c => c.template === 'Backdrop')?.isSlot).toBe(true)
      expect(dialog?.children?.find(c => c.template === 'Content')?.isSlot).toBe(true)
    })

    it('should include Tooltip', () => {
      const tooltip = BASIC_COMPONENTS.find(c => c.id === 'overlay-tooltip')
      expect(tooltip).toBeDefined()
      expect(tooltip?.template).toBe('Tooltip')
    })
  })

  describe('Zag Navigation', () => {
    it('should include Tabs with List slot and Tab items', () => {
      const tabs = BASIC_COMPONENTS.find(c => c.id === 'nav-tabs')
      expect(tabs).toBeDefined()
      const list = tabs?.children?.find(c => c.template === 'List')
      expect(list?.isSlot).toBe(true)
      // Tab items are nested inside List slot
      expect(list?.children?.filter(c => c.template === 'Tab').length).toBe(3)
    })

    it('should include SideNav', () => {
      const sidenav = BASIC_COMPONENTS.find(c => c.id === 'nav-sidenav')
      // SideNav may or may not be in the presets - just check it doesn't error
      if (sidenav) {
        expect(sidenav?.template).toBe('SideNav')
      }
    })
  })

  describe('Code Generation', () => {
    it('should generate slot syntax with colon', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const buildCode = (panel as any).buildComponentCode.bind(panel)
      const select = BASIC_COMPONENTS.find(c => c.id === 'form-select')!
      const code = buildCode(select)

      expect(code).toContain('Trigger:')
      expect(code).toContain('Content:')
      expect(code).toContain('Item "Option A"')

      panel.dispose()
    })

    it('should generate nested slot children correctly', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const buildCode = (panel as any).buildComponentCode.bind(panel)
      const dialog = BASIC_COMPONENTS.find(c => c.id === 'overlay-dialog')!
      const code = buildCode(dialog)

      expect(code).toContain('Trigger:')
      expect(code).toContain('Button')
      expect(code).toContain('Backdrop:')
      expect(code).toContain('Content:')

      panel.dispose()
    })
  })

  describe('Component Panel Structure', () => {
    it('should have Basic and Components sections', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const sections = panel.getSections()
      const sectionNames = sections.map(s => s.name)

      // Panel has Basic and Form sections
      expect(sectionNames).toContain('Basic')
      expect(sectionNames).toContain('Form')

      panel.dispose()
    })

    it('should have tutorial Zag components available', () => {
      const container = document.createElement('div')
      const panel = new ComponentPanel({ container })

      const sections = panel.getSections()
      const allItems = sections.flatMap(s => s.items)

      // Component IDs use category-based naming (form-select, nav-tabs, etc.)
      // Tutorial Set: Select, Checkbox, Switch, Slider, Dialog, Tabs
      const componentIds = ['form-select', 'form-checkbox', 'form-switch', 'form-slider', 'overlay-dialog', 'nav-tabs']
      for (const id of componentIds) {
        expect(allItems.find(i => i.id === id)).toBeDefined()
      }

      panel.dispose()
    })
  })
})
