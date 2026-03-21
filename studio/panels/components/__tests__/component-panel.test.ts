/**
 * ComponentPanel Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ComponentPanel, createComponentPanel } from '../component-panel'
import { LAYOUT_PRESETS, BASIC_COMPONENTS } from '../layout-presets'
import { parseComponentSections } from '../section-parser'
import type { AST } from '../../../../src/parser/ast'
import type { ComponentDragData } from '../types'

// Mock DataTransfer for jsdom
class MockDataTransfer {
  private data: Map<string, string> = new Map()
  effectAllowed: string = 'none'
  dragImage: { element: Element; x: number; y: number } | null = null

  setData(type: string, value: string) {
    this.data.set(type, value)
  }

  getData(type: string): string {
    return this.data.get(type) || ''
  }

  setDragImage(element: Element, x: number, y: number) {
    this.dragImage = { element, x, y }
  }
}

// Helper to create drag events
function createDragEvent(type: string, dataTransfer?: MockDataTransfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  // @ts-ignore - adding dataTransfer property
  event.dataTransfer = dataTransfer || new MockDataTransfer()
  return event
}

describe('ComponentPanel', () => {
  let container: HTMLElement
  let panel: ComponentPanel

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    panel?.dispose()
    container.remove()
  })

  describe('initialization', () => {
    it('should render into container', () => {
      panel = createComponentPanel({ container })

      expect(container.querySelector('.component-panel')).not.toBeNull()
    })

    it('should render search bar', () => {
      panel = createComponentPanel({ container })

      expect(container.querySelector('.component-panel-search')).not.toBeNull()
      expect(container.querySelector('.component-panel-search-input')).not.toBeNull()
    })

    it('should render layout presets section', () => {
      panel = createComponentPanel({ container })

      const sections = container.querySelectorAll('.component-panel-section')
      const layoutSection = Array.from(sections).find(
        s => s.querySelector('.component-panel-section-name')?.textContent === 'Layouts'
      )

      expect(layoutSection).not.toBeNull()
    })

    it('should render basic components section', () => {
      panel = createComponentPanel({ container })

      const sections = container.querySelectorAll('.component-panel-section')
      const basicSection = Array.from(sections).find(
        s => s.querySelector('.component-panel-section-name')?.textContent === 'Basic'
      )

      expect(basicSection).not.toBeNull()
    })

    it('should render all layout presets', () => {
      panel = createComponentPanel({ container })

      const items = container.querySelectorAll('.component-panel-item')
      const layoutItems = LAYOUT_PRESETS.length

      expect(items.length).toBeGreaterThanOrEqual(layoutItems)
    })

    it('should render all basic components', () => {
      panel = createComponentPanel({ container })

      const items = container.querySelectorAll('.component-panel-item')
      const basicItems = BASIC_COMPONENTS.length

      expect(items.length).toBeGreaterThanOrEqual(basicItems)
    })
  })

  describe('sections', () => {
    it('should toggle section collapse on header click', () => {
      panel = createComponentPanel({ container })

      const header = container.querySelector('.component-panel-section-header') as HTMLElement
      const section = header?.closest('.component-panel-section')

      expect(section?.classList.contains('collapsed')).toBe(false)

      header.click()

      expect(section?.classList.contains('collapsed')).toBe(true)

      header.click()

      expect(section?.classList.contains('collapsed')).toBe(false)
    })

    it('should hide layout presets when disabled', () => {
      panel = createComponentPanel({
        container,
        showLayoutPresets: false,
      })

      const sections = container.querySelectorAll('.component-panel-section')
      const layoutSection = Array.from(sections).find(
        s => s.querySelector('.component-panel-section-name')?.textContent === 'Layouts'
      )

      expect(layoutSection).toBeUndefined()
    })

    it('should hide basic components when disabled', () => {
      panel = createComponentPanel({
        container,
        showBasicComponents: false,
      })

      const sections = container.querySelectorAll('.component-panel-section')
      const basicSection = Array.from(sections).find(
        s => s.querySelector('.component-panel-section-name')?.textContent === 'Basic'
      )

      expect(basicSection).toBeUndefined()
    })
  })

  describe('search', () => {
    it('should filter items by name', () => {
      panel = createComponentPanel({ container })

      const searchInput = container.querySelector('.component-panel-search-input') as HTMLInputElement
      // Search for "text" which matches the "Text" component
      searchInput.value = 'text'
      searchInput.dispatchEvent(new Event('input'))

      const visibleItems = container.querySelectorAll('.component-panel-item:not([style*="display: none"])')

      expect(visibleItems.length).toBeGreaterThan(0)
      expect(Array.from(visibleItems).some(
        item => item.querySelector('.component-panel-item-name')?.textContent?.toLowerCase().includes('text')
      )).toBe(true)
    })

    it('should be case insensitive', () => {
      panel = createComponentPanel({ container })

      const searchInput = container.querySelector('.component-panel-search-input') as HTMLInputElement
      searchInput.value = 'BUTTON'
      searchInput.dispatchEvent(new Event('input'))

      const visibleItems = container.querySelectorAll('.component-panel-item:not([style*="display: none"])')

      expect(visibleItems.length).toBeGreaterThan(0)
    })

    it('should hide empty sections', () => {
      panel = createComponentPanel({ container })

      const searchInput = container.querySelector('.component-panel-search-input') as HTMLInputElement
      searchInput.value = 'nonexistent'
      searchInput.dispatchEvent(new Event('input'))

      const visibleSections = container.querySelectorAll('.component-panel-section:not([style*="display: none"])')

      expect(visibleSections.length).toBe(0)
    })
  })

  describe('drag and drop', () => {
    it('should set draggable attribute', () => {
      panel = createComponentPanel({ container })

      const items = container.querySelectorAll('.component-panel-item')
      items.forEach(item => {
        expect((item as HTMLElement).draggable).toBe(true)
      })
    })

    it('should add dragging class on dragstart', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      item.dispatchEvent(createDragEvent('dragstart'))

      expect(item.classList.contains('dragging')).toBe(true)
    })

    it('should remove dragging class on dragend', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      item.dispatchEvent(createDragEvent('dragstart'))
      item.dispatchEvent(createDragEvent('dragend'))

      expect(item.classList.contains('dragging')).toBe(false)
    })

    it('should set drag data in correct format', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      const dataTransfer = new MockDataTransfer()

      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      const jsonData = dataTransfer.getData('application/mirror-component')
      expect(jsonData).toBeTruthy()

      const data = JSON.parse(jsonData) as ComponentDragData
      expect(data.fromComponentPanel).toBe(true)
      expect(data.componentName).toBeTruthy()
    })

    it('should call onDragStart callback', () => {
      const onDragStart = vi.fn()
      panel = createComponentPanel({ container }, { onDragStart })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      item.dispatchEvent(createDragEvent('dragstart'))

      expect(onDragStart).toHaveBeenCalled()
    })

    it('should call onDragEnd callback', () => {
      const onDragEnd = vi.fn()
      panel = createComponentPanel({ container }, { onDragEnd })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      item.dispatchEvent(createDragEvent('dragstart'))
      item.dispatchEvent(createDragEvent('dragend'))

      expect(onDragEnd).toHaveBeenCalled()
    })

    it('should set custom drag image', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      const dataTransfer = new MockDataTransfer()

      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      expect(dataTransfer.dragImage).not.toBeNull()
    })

    it('should create drag image with same dimensions as source element', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement

      // Mock getBoundingClientRect to return specific dimensions
      const mockRect = { width: 120, height: 32, x: 0, y: 0, top: 0, left: 0, right: 120, bottom: 32, toJSON: () => ({}) }
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect)

      const dataTransfer = new MockDataTransfer()
      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      expect(dataTransfer.dragImage).not.toBeNull()
      const dragImage = dataTransfer.dragImage!.element as HTMLElement

      // Drag image should match source element dimensions
      expect(dragImage.style.width).toBe('120px')
      expect(dragImage.style.height).toBe('32px')
    })

    it('should use border-box sizing so padding does not increase size', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement

      const mockRect = { width: 100, height: 30, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 30, toJSON: () => ({}) }
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect)

      const dataTransfer = new MockDataTransfer()
      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      const dragImage = dataTransfer.dragImage!.element as HTMLElement

      // Must use border-box so padding is included in width/height
      expect(dragImage.style.boxSizing).toBe('border-box')
    })

    it('should create different sized drag images for different elements', () => {
      panel = createComponentPanel({ container })

      const items = container.querySelectorAll('.component-panel-item') as NodeListOf<HTMLElement>
      expect(items.length).toBeGreaterThan(1)

      // Mock different sizes for first two items
      const mockRect1 = { width: 100, height: 30, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 30, toJSON: () => ({}) }
      const mockRect2 = { width: 150, height: 40, x: 0, y: 0, top: 0, left: 0, right: 150, bottom: 40, toJSON: () => ({}) }
      vi.spyOn(items[0], 'getBoundingClientRect').mockReturnValue(mockRect1 as DOMRect)
      vi.spyOn(items[1], 'getBoundingClientRect').mockReturnValue(mockRect2 as DOMRect)

      const dataTransfer1 = new MockDataTransfer()
      const dataTransfer2 = new MockDataTransfer()

      items[0].dispatchEvent(createDragEvent('dragstart', dataTransfer1))
      items[0].dispatchEvent(createDragEvent('dragend'))

      items[1].dispatchEvent(createDragEvent('dragstart', dataTransfer2))

      const dragImage1 = dataTransfer1.dragImage!.element as HTMLElement
      const dragImage2 = dataTransfer2.dragImage!.element as HTMLElement

      // Each drag image should have different dimensions matching its source
      expect(dragImage1.style.width).toBe('100px')
      expect(dragImage1.style.height).toBe('30px')
      expect(dragImage2.style.width).toBe('150px')
      expect(dragImage2.style.height).toBe('40px')
    })

    it('should position drag image cursor at center of element', () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement

      // Mock getBoundingClientRect
      const mockRect = { width: 100, height: 40, x: 0, y: 0, top: 0, left: 0, right: 100, bottom: 40, toJSON: () => ({}) }
      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect)

      const dataTransfer = new MockDataTransfer()
      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      expect(dataTransfer.dragImage).not.toBeNull()
      // Cursor should be at center (50, 20)
      expect(dataTransfer.dragImage!.x).toBe(50)
      expect(dataTransfer.dragImage!.y).toBe(20)
    })

    it('should remove drag image from DOM after dragstart', async () => {
      panel = createComponentPanel({ container })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      const dataTransfer = new MockDataTransfer()

      item.dispatchEvent(createDragEvent('dragstart', dataTransfer))

      // Drag image is temporarily added to body
      expect(dataTransfer.dragImage).not.toBeNull()

      // Wait for requestAnimationFrame cleanup
      await new Promise(resolve => requestAnimationFrame(resolve))

      // Drag image should be removed from DOM
      const dragImages = document.querySelectorAll('.component-panel-drag-image')
      expect(dragImages.length).toBe(0)
    })
  })

  describe('click to insert', () => {
    it('should call onClick callback when item is clicked', () => {
      const onClick = vi.fn()
      panel = createComponentPanel({ container }, { onClick })

      const item = container.querySelector('.component-panel-item') as HTMLElement
      item.click()

      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('icons', () => {
    it('should render icons for all items', () => {
      panel = createComponentPanel({ container })

      const items = container.querySelectorAll('.component-panel-item')
      items.forEach(item => {
        const icon = item.querySelector('.component-panel-item-icon')
        expect(icon).not.toBeNull()
        expect(icon?.innerHTML).toContain('svg')
      })
    })
  })

  describe('update with AST', () => {
    it('should add user-defined components section', () => {
      panel = createComponentPanel({ container })

      const mockAST: AST = {
        type: 'Program',
        line: 1,
        column: 1,
        tokens: [],
        components: [
          {
            type: 'Component',
            name: 'MyButton',
            primitive: null,
            extends: null,
            properties: [],
            states: [],
            events: [],
            children: [],
            line: 1,
            column: 1,
          },
        ],
        animations: [],
        instances: [],
        errors: [],
      }

      panel.update(mockAST)

      const sections = container.querySelectorAll('.component-panel-section')
      const componentsSection = Array.from(sections).find(
        s => s.querySelector('.component-panel-section-name')?.textContent === 'Components'
      )

      expect(componentsSection).not.toBeNull()
    })
  })

  describe('getSections', () => {
    it('should return all sections', () => {
      panel = createComponentPanel({ container })

      const sections = panel.getSections()

      expect(sections.length).toBeGreaterThanOrEqual(2) // Layouts + Basic
      expect(sections.find(s => s.name === 'Layouts')).toBeDefined()
      expect(sections.find(s => s.name === 'Basic')).toBeDefined()
    })
  })

  describe('dispose', () => {
    it('should clear container on dispose', () => {
      panel = createComponentPanel({ container })

      expect(container.innerHTML).not.toBe('')

      panel.dispose()

      expect(container.innerHTML).toBe('')
    })
  })
})

describe('parseComponentSections', () => {
  it('should return empty array for empty AST', () => {
    const ast: AST = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [],
      animations: [],
      instances: [],
      errors: [],
    }
    const sections = parseComponentSections(ast)

    expect(sections).toEqual([])
  })

  it('should extract user-defined components', () => {
    const ast: AST = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [
        {
          type: 'Component',
          name: 'MyButton',
          primitive: null,
          extends: null,
          properties: [],
          states: [],
          events: [],
          children: [],
          line: 1,
          column: 1,
        },
        {
          type: 'Component',
          name: 'MyCard',
          primitive: null,
          extends: null,
          properties: [],
          states: [],
          events: [],
          children: [],
          line: 5,
          column: 1,
        },
      ],
      animations: [],
      instances: [],
      errors: [],
    }

    const sections = parseComponentSections(ast)

    expect(sections.length).toBe(1)
    expect(sections[0].name).toBe('Components')
    expect(sections[0].items.length).toBe(2)
    expect(sections[0].items[0].name).toBe('MyButton')
    expect(sections[0].items[1].name).toBe('MyCard')
  })

  it('should mark components as user-defined', () => {
    const ast: AST = {
      type: 'Program',
      line: 1,
      column: 1,
      tokens: [],
      components: [
        {
          type: 'Component',
          name: 'CustomComponent',
          primitive: null,
          extends: null,
          properties: [],
          states: [],
          events: [],
          children: [],
          line: 1,
          column: 1,
        },
      ],
      animations: [],
      instances: [],
      errors: [],
    }

    const sections = parseComponentSections(ast)

    expect(sections[0].items[0].isUserDefined).toBe(true)
  })
})

describe('LAYOUT_PRESETS', () => {
  it('should have required fields for all presets', () => {
    LAYOUT_PRESETS.forEach(preset => {
      expect(preset.id).toBeTruthy()
      expect(preset.name).toBeTruthy()
      expect(preset.category).toBe('Layouts')
      expect(preset.template).toBeTruthy()
      expect(preset.icon).toBeTruthy()
    })
  })

  it('should have unique IDs', () => {
    const ids = LAYOUT_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('BASIC_COMPONENTS', () => {
  it('should have required fields for all components', () => {
    BASIC_COMPONENTS.forEach(component => {
      expect(component.id).toBeTruthy()
      expect(component.name).toBeTruthy()
      expect(component.category).toBe('Basic')
      expect(component.template).toBeTruthy()
      expect(component.icon).toBeTruthy()
    })
  })

  it('should have unique IDs', () => {
    const ids = BASIC_COMPONENTS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
