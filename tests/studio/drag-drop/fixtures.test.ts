/**
 * Drag & Drop Test Fixtures - Unit Tests
 *
 * Tests that all fixtures are properly defined and valid.
 */

import { describe, it, expect } from 'vitest'
import {
  SIMPLE_COMPONENTS,
  LAYOUT_COMPONENTS,
  ZAG_SIMPLE,
  ZAG_WITH_SLOTS,
  CHART_COMPONENTS,
  ALL_COMPONENTS,
  ALL_CONTAINERS,
  getFixture,
  getSimpleFixture,
  getZagFixture,
  getChartFixture,
  getContainerFixture,
  getAllComponentNames,
  getComponentsByCategory,
} from '../../../studio/preview/drag/test-api/fixtures'

describe('Component Fixtures', () => {
  describe('SIMPLE_COMPONENTS', () => {
    it('should have required fields for each component', () => {
      for (const [name, fixture] of Object.entries(SIMPLE_COMPONENTS)) {
        expect(fixture.componentName, `${name} missing componentName`).toBeTruthy()
        expect(fixture.template, `${name} missing template`).toBeTruthy()
        expect(fixture.expectedLines, `${name} missing expectedLines`).toBeDefined()
        expect(fixture.expectedLines.length, `${name} expectedLines empty`).toBeGreaterThan(0)
        expect(fixture.category, `${name} missing category`).toBe('simple')
      }
    })

    it('should include common UI components', () => {
      expect(SIMPLE_COMPONENTS.Button).toBeDefined()
      expect(SIMPLE_COMPONENTS.Text).toBeDefined()
      expect(SIMPLE_COMPONENTS.Frame).toBeDefined()
      expect(SIMPLE_COMPONENTS.Icon).toBeDefined()
      expect(SIMPLE_COMPONENTS.Input).toBeDefined()
    })

    it('should have valid expected lines', () => {
      // Button should generate 'Button "Button"'
      expect(SIMPLE_COMPONENTS.Button.expectedLines[0]).toContain('Button')

      // Text should generate 'Text "Text"'
      expect(SIMPLE_COMPONENTS.Text.expectedLines[0]).toContain('Text')
    })
  })

  describe('LAYOUT_COMPONENTS', () => {
    it('should have layout category', () => {
      for (const [name, fixture] of Object.entries(LAYOUT_COMPONENTS)) {
        expect(fixture.category, `${name} should be layout`).toBe('layout')
      }
    })

    it('should include standard layouts', () => {
      expect(LAYOUT_COMPONENTS.Column).toBeDefined()
      expect(LAYOUT_COMPONENTS.Row).toBeDefined()
      expect(LAYOUT_COMPONENTS.Grid).toBeDefined()
      expect(LAYOUT_COMPONENTS.Stack).toBeDefined()
    })

    it('should use Frame as base template', () => {
      for (const fixture of Object.values(LAYOUT_COMPONENTS)) {
        expect(fixture.template).toBe('Frame')
      }
    })
  })

  describe('ZAG_SIMPLE', () => {
    it('should have zag category', () => {
      for (const [name, fixture] of Object.entries(ZAG_SIMPLE)) {
        expect(fixture.category, `${name} should be zag`).toBe('zag')
      }
    })

    it('should include Switch and Slider', () => {
      expect(ZAG_SIMPLE.Switch).toBeDefined()
      expect(ZAG_SIMPLE.Slider).toBeDefined()
    })
  })

  describe('ZAG_WITH_SLOTS', () => {
    it('should have zag category', () => {
      for (const [name, fixture] of Object.entries(ZAG_WITH_SLOTS)) {
        expect(fixture.category, `${name} should be zag`).toBe('zag')
      }
    })

    it('should include complex Zag components', () => {
      expect(ZAG_WITH_SLOTS.Checkbox).toBeDefined()
      expect(ZAG_WITH_SLOTS.Select).toBeDefined()
      expect(ZAG_WITH_SLOTS.Dialog).toBeDefined()
      expect(ZAG_WITH_SLOTS.Tabs).toBeDefined()
      expect(ZAG_WITH_SLOTS.Tooltip).toBeDefined()
    })

    it('should have multi-line expected output', () => {
      // Dialog should have multiple lines for slots
      expect(ZAG_WITH_SLOTS.Dialog.expectedLines.length).toBeGreaterThan(1)
      expect(ZAG_WITH_SLOTS.Select.expectedLines.length).toBeGreaterThan(1)
    })
  })

  describe('CHART_COMPONENTS', () => {
    it('should have chart category', () => {
      for (const [name, fixture] of Object.entries(CHART_COMPONENTS)) {
        expect(fixture.category, `${name} should be chart`).toBe('chart')
      }
    })

    it('should include all chart types', () => {
      expect(CHART_COMPONENTS.Line).toBeDefined()
      expect(CHART_COMPONENTS.Bar).toBeDefined()
      expect(CHART_COMPONENTS.Area).toBeDefined()
      expect(CHART_COMPONENTS.Pie).toBeDefined()
      expect(CHART_COMPONENTS.Donut).toBeDefined()
    })

    it('should have $data in properties', () => {
      for (const fixture of Object.values(CHART_COMPONENTS)) {
        expect(fixture.properties).toContain('$data')
      }
    })
  })

  describe('ALL_COMPONENTS', () => {
    it('should contain all component fixtures', () => {
      const totalComponents =
        Object.keys(SIMPLE_COMPONENTS).length +
        Object.keys(LAYOUT_COMPONENTS).length +
        Object.keys(ZAG_SIMPLE).length +
        Object.keys(ZAG_WITH_SLOTS).length +
        Object.keys(CHART_COMPONENTS).length

      expect(Object.keys(ALL_COMPONENTS).length).toBe(totalComponents)
    })
  })
})

describe('Container Fixtures', () => {
  describe('ALL_CONTAINERS', () => {
    it('should have required fields for each container', () => {
      for (const container of ALL_CONTAINERS) {
        expect(container.name, 'missing name').toBeTruthy()
        expect(container.code, 'missing code').toBeTruthy()
        expect(container.nodeIds, 'missing nodeIds').toBeDefined()
        expect(container.layout, 'missing layout').toBeTruthy()
        expect(typeof container.childCount).toBe('number')
      }
    })

    it('should have unique names', () => {
      const names = ALL_CONTAINERS.map(c => c.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(names.length)
    })

    it('should include various layout types', () => {
      const layouts = ALL_CONTAINERS.map(c => c.layout)
      expect(layouts).toContain('vertical')
      expect(layouts).toContain('horizontal')
      expect(layouts).toContain('grid')
    })
  })
})

describe('Fixture Helpers', () => {
  describe('getFixture', () => {
    it('should return fixture by name', () => {
      expect(getFixture('Button')).toBe(SIMPLE_COMPONENTS.Button)
      expect(getFixture('Dialog')).toBe(ZAG_WITH_SLOTS.Dialog)
      expect(getFixture('Line')).toBe(CHART_COMPONENTS.Line)
    })

    it('should return undefined for unknown component', () => {
      expect(getFixture('NonExistent')).toBeUndefined()
    })
  })

  describe('getSimpleFixture', () => {
    it('should return simple or layout fixture', () => {
      expect(getSimpleFixture('Button')).toBe(SIMPLE_COMPONENTS.Button)
      expect(getSimpleFixture('Row')).toBe(LAYOUT_COMPONENTS.Row)
    })

    it('should not return Zag fixtures', () => {
      expect(getSimpleFixture('Dialog')).toBeUndefined()
    })
  })

  describe('getZagFixture', () => {
    it('should return Zag fixtures', () => {
      expect(getZagFixture('Switch')).toBe(ZAG_SIMPLE.Switch)
      expect(getZagFixture('Dialog')).toBe(ZAG_WITH_SLOTS.Dialog)
    })

    it('should not return simple fixtures', () => {
      expect(getZagFixture('Button')).toBeUndefined()
    })
  })

  describe('getChartFixture', () => {
    it('should return chart fixtures', () => {
      expect(getChartFixture('Line')).toBe(CHART_COMPONENTS.Line)
      expect(getChartFixture('Pie')).toBe(CHART_COMPONENTS.Pie)
    })

    it('should not return non-chart fixtures', () => {
      expect(getChartFixture('Button')).toBeUndefined()
    })
  })

  describe('getContainerFixture', () => {
    it('should return container by name', () => {
      const container = getContainerFixture('empty-vertical')
      expect(container).toBeDefined()
      expect(container?.layout).toBe('vertical')
    })

    it('should return undefined for unknown container', () => {
      expect(getContainerFixture('non-existent')).toBeUndefined()
    })
  })

  describe('getAllComponentNames', () => {
    it('should return all component names', () => {
      const names = getAllComponentNames()
      expect(names).toContain('Button')
      expect(names).toContain('Dialog')
      expect(names).toContain('Line')
      expect(names).toContain('Row')
    })
  })

  describe('getComponentsByCategory', () => {
    it('should filter by category', () => {
      const simple = getComponentsByCategory('simple')
      expect(simple.every(c => c.category === 'simple')).toBe(true)

      const zag = getComponentsByCategory('zag')
      expect(zag.every(c => c.category === 'zag')).toBe(true)

      const chart = getComponentsByCategory('chart')
      expect(chart.every(c => c.category === 'chart')).toBe(true)
    })
  })
})
