/**
 * Zag Component Fixtures
 *
 * Fixtures for Zag-based components with state machines and slots.
 */

import type { ComponentFixture } from '../types'

/**
 * Zag components without slots - simple state machines
 */
export const ZAG_SIMPLE: Record<string, ComponentFixture> = {
  Switch: {
    componentName: 'Switch',
    template: 'Switch',
    hasSlots: true,
    expectedLines: [
      'Switch',
      '  Track: w 44, h 24, rad 12, bg #555',
      '  Thumb: w 20, h 20, rad 10, bg #fff',
    ],
    category: 'zag',
  },

  Slider: {
    componentName: 'Slider',
    template: 'Slider',
    hasSlots: true,
    expectedLines: [
      'Slider',
      '  Track: h 4, bg #333, rad 2',
      '  Range: bg #5BA8F5',
      '  Thumb: w 16, h 16, rad 8, bg #fff',
    ],
    category: 'zag',
  },
}

/**
 * Zag components with slots - more complex structure
 */
export const ZAG_WITH_SLOTS: Record<string, ComponentFixture> = {
  Checkbox: {
    componentName: 'Checkbox',
    template: 'Checkbox',
    hasSlots: true,
    expectedLines: ['Checkbox', '  Control: w 20, h 20, bor 1 #555, rad 4', '  Label: "Check me"'],
    category: 'zag',
  },

  Select: {
    componentName: 'Select',
    properties: 'placeholder "Choose..."',
    template: 'Select',
    hasSlots: true,
    expectedLines: [
      'Select placeholder "Choose..."',
      '  Trigger: pad 12, bg #1e1e2e, rad 6, bor 1 #333',
      '  Content: bg #2a2a3e, rad 8, pad 4, shadow md',
      '    Item "Option A"',
      '    Item "Option B"',
      '    Item "Option C"',
    ],
    category: 'zag',
  },

  Dialog: {
    componentName: 'Dialog',
    template: 'Dialog',
    hasSlots: true,
    expectedLines: [
      'Dialog',
      '  Trigger:',
      '    Button "Open", pad 12 24, bg #5BA8F5, col #fff, rad 6',
      '  Backdrop: bg #00000080',
      '  Content: w 400, bg #1e1e2e, rad 12, pad 24, shadow lg',
    ],
    category: 'zag',
  },

  Tooltip: {
    componentName: 'Tooltip',
    template: 'Tooltip',
    hasSlots: true,
    expectedLines: [
      'Tooltip',
      '  Trigger:',
      '    Button "Hover me"',
      '  Content: pad 8 12, bg #333, col #fff, rad 4, fs 12',
      '    Text "Tooltip text"',
    ],
    category: 'zag',
  },

  Tabs: {
    componentName: 'Tabs',
    template: 'Tabs',
    hasSlots: true,
    expectedLines: [
      'Tabs',
      '  List: hor, gap 4, bg #1e1e2e, pad 4, rad 8',
      '    Tab "Tab 1"',
      '    Tab "Tab 2"',
      '    Tab "Tab 3"',
      '  Content: pad 16',
    ],
    category: 'zag',
  },

  RadioGroup: {
    componentName: 'RadioGroup',
    template: 'RadioGroup',
    hasSlots: false,
    expectedLines: [
      'RadioGroup',
      '  RadioItem "Option A"',
      '  RadioItem "Option B"',
      '  RadioItem "Option C"',
    ],
    category: 'zag',
  },

  DatePicker: {
    componentName: 'DatePicker',
    template: 'DatePicker',
    hasSlots: true,
    expectedLines: ['DatePicker', '  Control:', '  Input:', '  Trigger:', '  Content:'],
    category: 'zag',
  },

  Accordion: {
    componentName: 'Accordion',
    template: 'Frame',
    hasSlots: true,
    mirTemplate: `AccordionItem as Frame: ver, toggle()
  Header: Frame hor, spread, ver-center, pad 12 16, bg #27272a, rad 6, cursor pointer
    hover:
      bg #3f3f46
    Content: Slot
    Chevron: Icon "chevron-down", is 16, ic #888
      on:
        rot 180
  Panel: Frame pad 16, hidden
    on:
      visible
    Content: Slot

AccordionItem
  Header: Text "Section 1"
  Panel: Text "Content for section 1"`,
    expectedLines: ['AccordionItem as Frame:', 'Header:', 'Panel:', 'AccordionItem', 'Section 1'],
    category: 'zag',
  },
}

/**
 * Get all Zag component names
 */
export function getZagComponentNames(): string[] {
  return [...Object.keys(ZAG_SIMPLE), ...Object.keys(ZAG_WITH_SLOTS)]
}

/**
 * Get Zag fixture by component name
 */
export function getZagFixture(name: string): ComponentFixture | undefined {
  return ZAG_SIMPLE[name] || ZAG_WITH_SLOTS[name]
}

/**
 * Check if a component is a Zag component
 */
export function isZagComponent(name: string): boolean {
  return name in ZAG_SIMPLE || name in ZAG_WITH_SLOTS
}
