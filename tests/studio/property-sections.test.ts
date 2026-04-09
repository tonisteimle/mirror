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
  createColorSection
} from '../../studio/panels/property'
import type { SectionDependencies } from '../../studio/panels/property/base/section'
import type { SectionData, PropertyCategory } from '../../studio/panels/property/types'

// Create mock dependencies (matching SectionDependencies interface)
function createMockDeps(): SectionDependencies {
  return {
    onPropertyChange: vi.fn(),
    onToggleProperty: vi.fn(),
    escapeHtml: (str: string) => str.replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c] || c)),
    getDisplayLabel: (name: string) => name.charAt(0).toUpperCase() + name.slice(1)
  }
}

// Create mock category
function createMockCategory(name: string, properties: Array<{ name: string; value: string; hasValue?: boolean }>): PropertyCategory {
  return {
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    properties: properties.map(p => ({
      name: p.name,
      value: p.value,
      hasValue: p.hasValue ?? true,
      source: 'instance' as const
    }))
  }
}

// Create mock section data
// - LayoutSection uses `categories` (plural) to find category by name
// - SizingSection and SpacingSection use `category` (singular)
// - ColorSection uses `allProperties`
function createMockSectionData(options: {
  category?: PropertyCategory
  categories?: PropertyCategory[]
  allProperties?: Array<{ name: string; value: string; source?: string }>
} = {}): SectionData {
  const allProperties = options.allProperties || options.categories?.flatMap(c => c.properties) || []
  return {
    category: options.category,
    categories: options.categories,
    allProperties,
    spacingTokens: [
      { name: 'sm', fullName: 'sm.pad', value: '4' },
      { name: 'md', fullName: 'md.pad', value: '8' }
    ],
    colorTokens: [
      { name: 'primary', value: '#2563eb' }
    ],
    getSpacingTokens: () => [
      { name: 'sm', fullName: 'sm.gap', value: '4' },
      { name: 'md', fullName: 'md.gap', value: '8' }
    ]
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

    it('should render empty string when no layout category', () => {
      const data = createMockSectionData({ categories: [] })
      const html = section.render(data)
      expect(html).toBe('')
    })

    it('should render layout controls when layout category exists', () => {
      const layoutCategory = createMockCategory('layout', [
        { name: 'horizontal', value: 'true' },
        { name: 'gap', value: '12' }
      ])
      const data = createMockSectionData({ categories: [layoutCategory] })
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
      // SizingSection uses data.category (singular)
      const sizingCategory = createMockCategory('sizing', [
        { name: 'width', value: '200' },
        { name: 'height', value: '100' }
      ])
      const data = createMockSectionData({ category: sizingCategory })
      const html = section.render(data)

      // SizingSection renders "Size" as section label, with "Width" and "Height" rows
      expect(html).toContain('Size')
      expect(html).toContain('Width')
      expect(html).toContain('Height')
    })

    it('should handle hug and full values', () => {
      // SizingSection uses data.category (singular)
      const sizingCategory = createMockCategory('sizing', [
        { name: 'w', value: 'hug' },
        { name: 'h', value: 'full' }
      ])
      const data = createMockSectionData({ category: sizingCategory })
      const html = section.render(data)

      // Values are rendered in input fields
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

    it('should render padding controls', () => {
      // SpacingSection uses data.category (singular) and renders as "Padding"
      const spacingCategory = createMockCategory('spacing', [
        { name: 'pad', value: '16' }
      ])
      const data = createMockSectionData({ category: spacingCategory })
      const html = section.render(data)

      // SpacingSection renders "Padding" section (not "Spacing")
      expect(html).toContain('Padding')
    })

    it('should handle shorthand padding values', () => {
      // SpacingSection uses data.category (singular)
      const spacingCategory = createMockCategory('spacing', [
        { name: 'pad', value: '10 20' }
      ])
      const data = createMockSectionData({ category: spacingCategory })
      const html = section.render(data)

      // Should render without error
      expect(html).toBeDefined()
      expect(html).toContain('Padding')
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
      // ColorSection uses data.allProperties, renders even without color properties
      const data = createMockSectionData({})
      const html = section.render(data)

      expect(html).toContain('Color')
    })

    it('should show color inputs', () => {
      // ColorSection uses data.allProperties (not category)
      const data = createMockSectionData({
        allProperties: [
          { name: 'bg', value: '#2563eb' }
        ]
      })
      const html = section.render(data)

      expect(html).toContain('Background')
    })
  })

  describe('Section Event Handlers', () => {
    it('should have handlers object', () => {
      const deps = createMockDeps()
      const section = createLayoutSection(deps)
      const handlers = section.getHandlers()

      expect(handlers).toBeDefined()
      expect(typeof handlers).toBe('object')
    })
  })
})
