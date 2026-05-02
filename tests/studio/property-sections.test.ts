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
  MarginSection,
  createMarginSection,
  BorderSection,
  createBorderSection,
  ColorSection,
  createColorSection,
} from '../../studio/panels/property'
import type { SectionDependencies } from '../../studio/panels/property/base/section'
import type { SectionData, PropertyCategory } from '../../studio/panels/property/types'

// Create mock dependencies (matching SectionDependencies interface)
function createMockDeps(): SectionDependencies {
  return {
    onPropertyChange: vi.fn(),
    onToggleProperty: vi.fn(),
    escapeHtml: (str: string) =>
      str.replace(
        /[&<>"']/g,
        c =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[c] || c
      ),
    getDisplayLabel: (name: string) => name.charAt(0).toUpperCase() + name.slice(1),
  }
}

// Create mock category
function createMockCategory(
  name: string,
  properties: Array<{ name: string; value: string; hasValue?: boolean }>
): PropertyCategory {
  return {
    name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    properties: properties.map(p => ({
      name: p.name,
      value: p.value,
      hasValue: p.hasValue ?? true,
      source: 'instance' as const,
    })),
  }
}

// Create mock section data
// - LayoutSection uses `categories` (plural) to find category by name
// - SizingSection and SpacingSection use `category` (singular)
// - ColorSection uses `allProperties`
function createMockSectionData(
  options: {
    category?: PropertyCategory
    categories?: PropertyCategory[]
    allProperties?: Array<{ name: string; value: string; source?: string }>
  } = {}
): SectionData {
  const allProperties =
    options.allProperties || options.categories?.flatMap(c => c.properties) || []
  return {
    category: options.category,
    categories: options.categories,
    allProperties,
    spacingTokens: [
      { name: 'sm', fullName: 'sm.pad', value: '4' },
      { name: 'md', fullName: 'md.pad', value: '8' },
    ],
    colorTokens: [{ name: 'primary', value: '#2563eb' }],
    getSpacingTokens: () => [
      { name: 'sm', fullName: 'sm.gap', value: '4' },
      { name: 'md', fullName: 'md.gap', value: '8' },
    ],
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
        { name: 'gap', value: '12' },
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
        { name: 'height', value: '100' },
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
        { name: 'h', value: 'full' },
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
      const spacingCategory = createMockCategory('spacing', [{ name: 'pad', value: '16' }])
      const data = createMockSectionData({ category: spacingCategory })
      const html = section.render(data)

      // SpacingSection renders "Padding" section (not "Spacing")
      expect(html).toContain('Padding')
    })

    it('should handle shorthand padding values', () => {
      // SpacingSection uses data.category (singular)
      const spacingCategory = createMockCategory('spacing', [{ name: 'pad', value: '10 20' }])
      const data = createMockSectionData({ category: spacingCategory })
      const html = section.render(data)

      // Should render without error
      expect(html).toBeDefined()
      expect(html).toContain('Padding')
    })

    it('should NOT add expanded class when expandedSections is empty', () => {
      const spacingCategory = createMockCategory('spacing', [{ name: 'pad', value: '8' }])
      const data: SectionData = {
        ...createMockSectionData({ category: spacingCategory }),
        expandedSections: new Set<string>(),
      }
      const html = section.render(data)
      expect(html).toContain('class="section"')
      expect(html).toContain('class="section-content"')
      expect(html).not.toContain('class="section expanded"')
      expect(html).not.toContain('class="section-content expanded"')
    })

    it('should add expanded class when expandedSections has "spacing"', () => {
      const spacingCategory = createMockCategory('spacing', [{ name: 'pad', value: '8' }])
      const data: SectionData = {
        ...createMockSectionData({ category: spacingCategory }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      expect(html).toContain('class="section expanded"')
      expect(html).toContain('class="section-content expanded"')
    })

    it('should not throw when expandedSections is undefined', () => {
      const spacingCategory = createMockCategory('spacing', [{ name: 'pad', value: '8' }])
      const data = createMockSectionData({ category: spacingCategory })
      expect(() => section.render(data)).not.toThrow()
      const html = section.render(data)
      // Outer wrappers stay collapsed — `expanded-row` on individual rows is
      // a separate, pre-existing CSS hook so we only assert the wrapper classes.
      expect(html).not.toContain('class="section expanded"')
      expect(html).not.toContain('class="section-content expanded"')
    })

    it('parses 3-value padding shorthand (T H B form)', () => {
      // CSS: `padding: 8 16 12` → T=8, R=L=16, B=12
      const cat = createMockCategory('spacing', [{ name: 'pad', value: '8 16 12' }])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      // Top input = 8
      expect(html).toMatch(/value="8"\s+data-pad-dir="t"/)
      // Right input = 16
      expect(html).toMatch(/value="16"\s+data-pad-dir="r"/)
      // Bottom input = 12
      expect(html).toMatch(/value="12"\s+data-pad-dir="b"/)
      // Left input = 16 (mirrored from R in 3-form)
      expect(html).toMatch(/value="16"\s+data-pad-dir="l"/)
    })

    it('reads per-side props (pad-t, pad-r, ...) when shorthand is absent', () => {
      const cat = createMockCategory('spacing', [
        { name: 'pad-t', value: '4' },
        { name: 'pad-r', value: '8' },
        { name: 'pad-b', value: '12' },
        { name: 'pad-l', value: '16' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="4"\s+data-pad-dir="t"/)
      expect(html).toMatch(/value="8"\s+data-pad-dir="r"/)
      expect(html).toMatch(/value="12"\s+data-pad-dir="b"/)
      expect(html).toMatch(/value="16"\s+data-pad-dir="l"/)
    })

    it('per-side props override shorthand', () => {
      // pad 8 sets all sides to 8, then pad-t 20 overrides T only
      const cat = createMockCategory('spacing', [
        { name: 'pad', value: '8' },
        { name: 'pad-t', value: '20' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="20"\s+data-pad-dir="t"/)
      expect(html).toMatch(/value="8"\s+data-pad-dir="r"/)
      expect(html).toMatch(/value="8"\s+data-pad-dir="b"/)
      expect(html).toMatch(/value="8"\s+data-pad-dir="l"/)
    })

    it('pad-x / pad-y axis props apply to both sides on that axis', () => {
      const cat = createMockCategory('spacing', [
        { name: 'pad-x', value: '12' },
        { name: 'pad-y', value: '4' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="4"\s+data-pad-dir="t"/)
      expect(html).toMatch(/value="4"\s+data-pad-dir="b"/)
      expect(html).toMatch(/value="12"\s+data-pad-dir="r"/)
      expect(html).toMatch(/value="12"\s+data-pad-dir="l"/)
    })

    it('per-side props win over axis props', () => {
      // pad-x sets both r/l to 12; pad-r 30 overrides r
      const cat = createMockCategory('spacing', [
        { name: 'pad-x', value: '12' },
        { name: 'pad-r', value: '30' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['spacing']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="30"\s+data-pad-dir="r"/)
      expect(html).toMatch(/value="12"\s+data-pad-dir="l"/)
    })
  })

  describe('MarginSection', () => {
    let section: MarginSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createMarginSection(deps)
    })

    it('should create a MarginSection instance', () => {
      expect(section).toBeInstanceOf(MarginSection)
    })

    it('renders a Margin label', () => {
      const cat = createMockCategory('spacing', [{ name: 'mar', value: '8' }])
      const data = createMockSectionData({ category: cat })
      const html = section.render(data)
      expect(html).toContain('Margin')
    })

    it('parses shorthand margin values without throwing', () => {
      const cat = createMockCategory('spacing', [{ name: 'mar', value: '10 20' }])
      const data = createMockSectionData({ category: cat })
      const html = section.render(data)
      expect(html).toBeDefined()
      expect(html).toContain('Margin')
    })

    it('renders empty when category is missing', () => {
      const data = createMockSectionData({})
      const html = section.render(data)
      expect(html).toBe('')
    })

    it('respects expandedSections.has("margin")', () => {
      const cat = createMockCategory('spacing', [{ name: 'mar', value: '8' }])
      const dataExpanded: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['margin']),
      }
      const dataCollapsed: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set<string>(),
      }
      expect(section.render(dataExpanded)).toContain('class="section expanded"')
      expect(section.render(dataCollapsed)).not.toContain('class="section expanded"')
    })

    it('uses __MAR_TOKEN__ / __MAR_INPUT__ sentinels (not __PAD_*)', () => {
      const handlers = section.getHandlers()
      // Sanity-check the selectors so we don't accidentally collide with padding's
      expect(handlers).toHaveProperty('input[data-mar-dir]')
      expect(handlers).not.toHaveProperty('input[data-pad-dir]')
    })

    it('parses 3-value margin shorthand', () => {
      const cat = createMockCategory('spacing', [{ name: 'mar', value: '4 8 12' }])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['margin']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="4"\s+data-mar-dir="t"/)
      expect(html).toMatch(/value="8"\s+data-mar-dir="r"/)
      expect(html).toMatch(/value="12"\s+data-mar-dir="b"/)
      expect(html).toMatch(/value="8"\s+data-mar-dir="l"/)
    })

    it('reads per-side margin props (mar-t, ...)', () => {
      const cat = createMockCategory('spacing', [
        { name: 'mar-t', value: '4' },
        { name: 'mar-r', value: '8' },
        { name: 'mar-b', value: '12' },
        { name: 'mar-l', value: '16' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['margin']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="4"\s+data-mar-dir="t"/)
      expect(html).toMatch(/value="8"\s+data-mar-dir="r"/)
      expect(html).toMatch(/value="12"\s+data-mar-dir="b"/)
      expect(html).toMatch(/value="16"\s+data-mar-dir="l"/)
    })

    it('per-side margin props override shorthand', () => {
      const cat = createMockCategory('spacing', [
        { name: 'mar', value: '8' },
        { name: 'mar-t', value: '20' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: cat }),
        expandedSections: new Set(['margin']),
      }
      const html = section.render(data)
      expect(html).toMatch(/value="20"\s+data-mar-dir="t"/)
      expect(html).toMatch(/value="8"\s+data-mar-dir="r"/)
    })
  })

  describe('BorderSection', () => {
    let section: BorderSection
    let deps: SectionDependencies

    beforeEach(() => {
      deps = createMockDeps()
      section = createBorderSection(deps)
    })

    it('should render Radius and Border subsections', () => {
      const borderCategory = createMockCategory('border', [
        { name: 'radius', value: '8' },
        { name: 'border', value: '1 #333' },
      ])
      const data = createMockSectionData({ category: borderCategory })
      const html = section.render(data)
      expect(html).toContain('Radius')
      expect(html).toContain('Border')
    })

    it('should add expanded class on radius container when "radius" is expanded', () => {
      const borderCategory = createMockCategory('border', [{ name: 'radius', value: '8' }])
      const data: SectionData = {
        ...createMockSectionData({ category: borderCategory }),
        expandedSections: new Set(['radius']),
      }
      const html = section.render(data)
      // Radius container shows expanded
      expect(html).toMatch(/class="section-content expanded"\s+data-expand-container="radius"/)
      // Border container should NOT (only "radius" key is in the set)
      expect(html).toMatch(/class="section-content"\s+data-expand-container="border"/)
    })

    it('should add expanded class on border container when "border" is expanded', () => {
      const borderCategory = createMockCategory('border', [{ name: 'border', value: '1 #333' }])
      const data: SectionData = {
        ...createMockSectionData({ category: borderCategory }),
        expandedSections: new Set(['border']),
      }
      const html = section.render(data)
      expect(html).toMatch(/class="section-content expanded"\s+data-expand-container="border"/)
      expect(html).toMatch(/class="section-content"\s+data-expand-container="radius"/)
    })

    it('should add expanded class on both subsections independently', () => {
      const borderCategory = createMockCategory('border', [
        { name: 'radius', value: '8' },
        { name: 'border', value: '1 #333' },
      ])
      const data: SectionData = {
        ...createMockSectionData({ category: borderCategory }),
        expandedSections: new Set(['radius', 'border']),
      }
      const html = section.render(data)
      expect(html).toMatch(/class="section-content expanded"\s+data-expand-container="radius"/)
      expect(html).toMatch(/class="section-content expanded"\s+data-expand-container="border"/)
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
        allProperties: [{ name: 'bg', value: '#2563eb' }],
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
