/**
 * Zag Component Recognition Tests
 *
 * Verifies that all defined Zag primitives are recognized by the parser.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser'
import { ZAG_PRIMITIVES } from '../../schema/zag-primitives'

describe('Zag Component Recognition', () => {
  const zagPrimitiveNames = Object.keys(ZAG_PRIMITIVES)

  it('should have 50 Zag primitives defined', () => {
    expect(zagPrimitiveNames.length).toBe(50)
  })

  it.each(zagPrimitiveNames)('%s should be parsed as ZagComponent', (name) => {
    const code = `${name} placeholder "Test"`
    const ast = parse(code)

    expect(ast.instances.length).toBe(1)
    const instance = ast.instances[0] as any
    expect(instance.type).toBe('ZagComponent')
    expect(instance.machine).toBe(ZAG_PRIMITIVES[name].machine)
  })

  it.each(zagPrimitiveNames)('%s should have correct machine type', (name) => {
    const code = `${name}`
    const ast = parse(code)

    const instance = ast.instances[0] as any
    expect(instance.machine).toBe(ZAG_PRIMITIVES[name].machine)
  })

  describe('Slot Parsing', () => {
    it('should parse Select with Trigger slot', () => {
      const code = `Select
  Trigger:
    pad 12`
      const ast = parse(code)

      const select = ast.instances[0] as any
      expect(select.type).toBe('ZagComponent')
      expect(select.slots).toBeDefined()
      expect(select.slots.Trigger).toBeDefined()
      expect(select.slots.Trigger.name).toBe('Trigger')
    })

    it('should parse Dialog with multiple slots', () => {
      const code = `Dialog
  Trigger:
    Button "Open"
  Backdrop:
    bg #00000080
  Content:
    pad 24`
      const ast = parse(code)

      const dialog = ast.instances[0] as any
      expect(dialog.type).toBe('ZagComponent')
      expect(Object.keys(dialog.slots)).toContain('Trigger')
      expect(Object.keys(dialog.slots)).toContain('Backdrop')
      expect(Object.keys(dialog.slots)).toContain('Content')
    })

    it('should parse Tabs with List slot and items', () => {
      const code = `Tabs
  List:
    hor, gap 4
  Item "Tab 1"
  Item "Tab 2"`
      const ast = parse(code)

      const tabs = ast.instances[0] as any
      expect(tabs.type).toBe('ZagComponent')
      expect(tabs.slots.List).toBeDefined()
      expect(tabs.items.length).toBe(2)
      expect(tabs.items[0].label).toBe('Tab 1')
    })

    it('should parse Accordion with Item items', () => {
      const code = `Accordion
  Item "Section 1"
  Item "Section 2"
  Item "Section 3"`
      const ast = parse(code)

      const accordion = ast.instances[0] as any
      expect(accordion.type).toBe('ZagComponent')
      expect(accordion.items.length).toBe(3)
    })

    it('should parse Tabs with Tab keyword', () => {
      const code = `Tabs
  Tab "Home"
  Tab "Settings"`
      const ast = parse(code)

      const tabs = ast.instances[0] as any
      expect(tabs.type).toBe('ZagComponent')
      expect(tabs.items.length).toBe(2)
      expect(tabs.items[0].label).toBe('Home')
      expect(tabs.items[1].label).toBe('Settings')
    })

    it('should parse Tab with children (content-items pattern)', () => {
      const code = `Tabs
  Tab "Home"
    Text "Welcome"
    Button "Click me"`
      const ast = parse(code)

      const tabs = ast.instances[0] as any
      expect(tabs.items.length).toBe(1)
      expect(tabs.items[0].label).toBe('Home')
      expect(tabs.items[0].children).toBeDefined()
      expect(tabs.items[0].children.length).toBe(2)
      expect(tabs.items[0].children[0].component).toBe('Text')
      expect(tabs.items[0].children[1].component).toBe('Button')
    })

    it('should parse Steps with Step keyword', () => {
      const code = `Steps
  Step "Account"
  Step "Profile"
  Step "Complete"`
      const ast = parse(code)

      const steps = ast.instances[0] as any
      expect(steps.type).toBe('ZagComponent')
      expect(steps.items.length).toBe(3)
      expect(steps.items[0].label).toBe('Account')
    })

    it('should parse Tour step with target', () => {
      const code = `Tour
  TourStep "Welcome" target "#header"
    Text "This is the header"
  TourStep "Next" target "#content"`
      const ast = parse(code)

      const tour = ast.instances[0] as any
      expect(tour.items.length).toBe(2)
      expect(tour.items[0].label).toBe('Welcome')
      expect(tour.items[0].target).toBe('#header')
      expect(tour.items[0].children).toBeDefined()
      expect(tour.items[1].target).toBe('#content')
    })

    it('should parse Carousel with Slide keyword', () => {
      const code = `Carousel
  Slide "First"
    Image src "img1.jpg"
  Slide "Second"
    Image src "img2.jpg"`
      const ast = parse(code)

      const carousel = ast.instances[0] as any
      expect(carousel.items.length).toBe(2)
      expect(carousel.items[0].label).toBe('First')
      expect(carousel.items[0].children).toBeDefined()
    })
  })

  describe('Property Parsing', () => {
    it('should parse Zag-specific boolean properties', () => {
      const code = `Select multiple searchable clearable disabled`
      const ast = parse(code)

      const select = ast.instances[0] as any
      const propNames = select.properties.map((p: any) => p.name)
      expect(propNames).toContain('multiple')
      expect(propNames).toContain('searchable')
      expect(propNames).toContain('clearable')
      expect(propNames).toContain('disabled')
    })

    it('should parse Zag-specific value properties', () => {
      const code = `Select placeholder "Choose..."  value "opt-1"`
      const ast = parse(code)

      const select = ast.instances[0] as any
      const placeholder = select.properties.find((p: any) => p.name === 'placeholder')
      const value = select.properties.find((p: any) => p.name === 'value')
      expect(placeholder?.values[0]).toBe('Choose...')
      expect(value?.values[0]).toBe('opt-1')
    })
  })
})
