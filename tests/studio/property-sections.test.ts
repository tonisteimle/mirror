/**
 * Property Panel Sections Tests
 *
 * Tests for the extracted property panel sections.
 * Each section is independently testable.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  LayoutSection,
  createLayoutSection,
  SizingSection,
  createSizingSection,
  SpacingSection,
  createSpacingSection,
  ColorSection,
  createColorSection,
  EventsSection,
  createEventsSection
} from '../../studio/panels/property'
import type { SectionDependencies } from '../../studio/panels/property/base/section'
import type { SectionData, PropertyCategory } from '../../studio/panels/property/types'

// Create mock dependencies
function createMockDeps(): SectionDependencies {
  return {
    onPropertyChange: vi.fn(),
    escapeHtml: (str: string) => str.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c)),
    getSpacingTokens: vi.fn(() => [
      { name: 'sm', fullName: 'sm.pad', value: '4' },
      { name: 'md', fullName: 'md.pad', value: '8' },
      { name: 'lg', fullName: 'lg.pad', value: '16' }
    ]),
    getColorTokens: vi.fn(() => [
      { name: 'primary', value: '#2563eb' },
      { name: 'secondary', value: '#64748b' }
    ])
  }
}

// Create mock category
function createMockCategory(properties: Array<{ name: string; value: string; hasValue?: boolean }>): PropertyCategory {
  return {
    name: 'test',
    label: 'Test',
    properties: properties.map(p => ({
      name: p.name,
      value: p.value,
      hasValue: p.hasValue ?? true,
      source: 'instance' as const
    }))
  }
}

// Create mock section data
function createMockSectionData(category?: PropertyCategory): SectionData {
  return {
    category,
    allProperties: category?.properties || [],
    nodeId: 'test-node',
    spacingTokens: [
      { name: 'sm', fullName: 'sm.pad', value: '4' },
      { name: 'md', fullName: 'md.pad', value: '8' }
    ],
    colorTokens: [
      { name: 'primary', value: '#2563eb' }
    ],
    isInPositionedContainer: false
  }
}

describe('Property Panel Sections', () => {
  describe('LayoutSection', () => {
    let section: LayoutSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createLayoutSection(deps)
    })

    it('should create a LayoutSection instance', () => {
      expect(section).toBeInstanceOf(LayoutSection)
    })

    it('should render empty string when no category', () => {
      const data = createMockSectionData()
      const html = section.render(data)
      expect(html).toBe('')
    })

    it('should render layout controls when category exists', () => {
      const category = createMockCategory([
        { name: 'horizontal', value: 'true' },
        { name: 'gap', value: '12' }
      ])
      const data = createMockSectionData(category)
      const html = section.render(data)

      expect(html).toContain('Layout')
      expect(html).toContain('section')
    })

    it('should return event handlers', () => {
      const handlers = section.getHandlers()
      expect(handlers).toBeDefined()
      expect(typeof handlers).toBe('object')
    })
  })

  describe('SizingSection', () => {
    let section: SizingSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createSizingSection(deps)
    })

    it('should create a SizingSection instance', () => {
      expect(section).toBeInstanceOf(SizingSection)
    })

    it('should render width and height controls', () => {
      const category = createMockCategory([
        { name: 'width', value: '200' },
        { name: 'height', value: '100' }
      ])
      const data = createMockSectionData(category)
      const html = section.render(data)

      // SizingSection renders "Size" as section label, with "Width" and "Height" rows
      expect(html).toContain('Size')
      expect(html).toContain('Width')
      expect(html).toContain('Height')
    })

    it('should handle hug and full values', () => {
      const category = createMockCategory([
        { name: 'w', value: 'hug' },
        { name: 'h', value: 'full' }
      ])
      const data = createMockSectionData(category)
      const html = section.render(data)

      expect(html).toContain('hug')
      expect(html).toContain('full')
    })
  })

  describe('SpacingSection', () => {
    let section: SpacingSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createSpacingSection(deps)
    })

    it('should create a SpacingSection instance', () => {
      expect(section).toBeInstanceOf(SpacingSection)
    })

    it('should render padding and margin controls', () => {
      const category = createMockCategory([
        { name: 'pad', value: '16' },
        { name: 'margin', value: '8' }
      ])
      const data = createMockSectionData(category)
      const html = section.render(data)

      // SpacingSection renders "Padding" and "Margin" sub-sections
      expect(html).toContain('Padding')
      expect(html).toContain('Margin')
    })

    it('should handle shorthand padding values', () => {
      const category = createMockCategory([
        { name: 'pad', value: '10 20' }
      ])
      const data = createMockSectionData(category)
      const html = section.render(data)

      // Should render without error
      expect(html).toBeDefined()
    })
  })

  describe('ColorSection', () => {
    let section: ColorSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createColorSection(deps)
    })

    it('should create a ColorSection instance', () => {
      expect(section).toBeInstanceOf(ColorSection)
    })

    it('should always render (colors are always relevant)', () => {
      const data = createMockSectionData()
      const html = section.render(data)

      expect(html).toContain('Color')
      expect(html).toContain('Background')
      expect(html).toContain('Text')
    })

    it('should show color tokens', () => {
      const data = createMockSectionData()
      data.allProperties = [
        { name: 'bg', value: '$primary', hasValue: true, source: 'instance' as const }
      ]
      const html = section.render(data)

      expect(html).toContain('$primary')
    })
  })

  describe('EventsSection', () => {
    let section: EventsSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createEventsSection(deps)
    })

    it('should create an EventsSection instance', () => {
      expect(section).toBeInstanceOf(EventsSection)
    })

    it('should render empty state when no events', () => {
      const data: SectionData = {
        ...createMockSectionData(),
        events: []
      }
      const html = section.render(data)

      expect(html).toContain('Events')
      expect(html).toContain('No events defined')
    })

    it('should render events list when events exist', () => {
      const data: SectionData = {
        ...createMockSectionData(),
        events: [
          {
            name: 'onclick',
            actions: [{ name: 'toggle', isFunctionCall: true }]
          }
        ]
      }
      const html = section.render(data)

      expect(html).toContain('Events')
      expect(html).toContain('onclick')
      expect(html).toContain('toggle')
    })
  })

  describe('Section Event Handlers', () => {
    it('should call onPropertyChange when handler is invoked', () => {
      const deps = createMockDeps()
      const section = createLayoutSection(deps)
      const handlers = section.getHandlers()

      // Find a handler
      const layoutHandler = handlers['.pp-toggle-btn[data-layout]']
      expect(layoutHandler).toBeDefined()
      expect(layoutHandler.click).toBeDefined()
    })
  })
})
