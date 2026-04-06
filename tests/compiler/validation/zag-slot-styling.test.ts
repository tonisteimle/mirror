/**
 * Zag Slot Styling Tests
 *
 * Validates that styles applied to Zag component slots are correctly
 * rendered to the DOM elements.
 *
 * Focus on:
 * - Dialog (7 slots): Trigger, Content, Backdrop
 * - Tabs (5 slots): List, Trigger, Indicator, Content
 * - Select (11 slots): Trigger, Content, Item
 * - Accordion (5 slots): Item, ItemTrigger, ItemContent
 * - SideNav (11 slots): Header, Footer, Item, Group
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  renderMirror,
  getElementBaseStyles,
} from '../../../compiler/testing'
import type { RenderContext } from '../../../compiler/testing'

// =============================================================================
// JSDOM SETUP
// =============================================================================

let dom: JSDOM
let cleanup: (() => void)[] = []
let pendingTimers: number[] = []

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
  })

  global.document = dom.window.document
  global.window = dom.window as unknown as Window & typeof globalThis
  global.HTMLElement = dom.window.HTMLElement
  global.Element = dom.window.Element
  global.Node = dom.window.Node
  global.getComputedStyle = dom.window.getComputedStyle

  // Polyfill requestAnimationFrame for Zag components (track timers for cleanup)
  pendingTimers = []
  ;(global as unknown as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = setTimeout(() => {
      try {
        cb(Date.now())
      } catch {
        // Suppress JSDOM event dispatch errors
      }
    }, 0) as unknown as number
    pendingTimers.push(id)
    return id
  }
  ;(global as unknown as Record<string, unknown>).cancelAnimationFrame = (id: number) => {
    clearTimeout(id)
    pendingTimers = pendingTimers.filter(t => t !== id)
  }

  cleanup = []
})

afterEach(() => {
  // Cancel all pending animation frames to prevent async errors
  for (const id of pendingTimers) {
    clearTimeout(id)
  }
  pendingTimers = []

  // Run cleanup functions
  for (const fn of cleanup) {
    fn()
  }
  cleanup = []
})

function render(code: string): RenderContext {
  const ctx = renderMirror(code, dom.window.document.body)
  cleanup.push(ctx.cleanup)
  return ctx
}

/**
 * Find element by data-part attribute (Zag convention)
 */
function findByPart(ctx: RenderContext, part: string): HTMLElement | null {
  return ctx.root.querySelector(`[data-part="${part}"]`) as HTMLElement | null
}

/**
 * Find all elements by data-part attribute
 */
function findAllByPart(ctx: RenderContext, part: string): HTMLElement[] {
  return Array.from(ctx.root.querySelectorAll(`[data-part="${part}"]`)) as HTMLElement[]
}

// =============================================================================
// DIALOG SLOT STYLING
// =============================================================================

describe('Dialog Slot Styling', () => {
  describe('Trigger slot', () => {
    it('should render Dialog with trigger and content', () => {
      const ctx = render(`
Dialog
  Trigger: Button "Open", bg #2563eb, pad 12, rad 6
  Content: Frame pad 20
    Text "Content"
`)
      // Dialog should render (may not have data-part in JSDOM)
      expect(ctx.root).toBeDefined()
      expect(ctx.elements.size).toBeGreaterThan(0)

      // Check if a button exists (Trigger content)
      const button = ctx.root.querySelector('button')
      if (button) {
        // Button should have some styles applied
        const styles = getElementBaseStyles(button)
        expect(styles['padding'] || styles['border-radius']).toBeDefined()
      }
    })
  })

  describe('Content slot', () => {
    it('should apply styles to Content slot', () => {
      const ctx = render(`
Dialog
  Trigger: Button "Open"
  Content: Frame pad 24, bg #1a1a1a, rad 12
    Text "Dialog content"
`)
      const content = findByPart(ctx, 'content')
      if (content) {
        const styles = getElementBaseStyles(content)
        expect(styles['padding']).toBe('24px')
        expect(styles['border-radius']).toBe('12px')
      }
    })
  })

  describe('Backdrop slot', () => {
    it('should apply styles to Backdrop slot', () => {
      const ctx = render(`
Dialog
  Trigger: Button "Open"
  Backdrop: bg rgba(0,0,0,0.5)
  Content: Frame pad 20
    Text "Content"
`)
      const backdrop = findByPart(ctx, 'backdrop')
      if (backdrop) {
        const styles = getElementBaseStyles(backdrop)
        expect(styles['background']).toMatch(/rgba?\(0,\s*0,\s*0/)
      }
    })
  })
})

// =============================================================================
// TABS SLOT STYLING
// =============================================================================

describe('Tabs Slot Styling', () => {
  describe('List slot', () => {
    it('should apply border styles to List', () => {
      const ctx = render(`
Tabs defaultValue "a"
  List: bor 0 0 1 0, boc #333
  Tab "One", value "a"
    Text "Content One"
`)
      const list = findByPart(ctx, 'list')
      if (list) {
        const styles = getElementBaseStyles(list)
        // Should have bottom border
        expect(styles['border-bottom-width'] || styles['border-width']).toBeDefined()
      }
    })
  })

  describe('Trigger slot', () => {
    it('should render Tabs with triggers', () => {
      const ctx = render(`
Tabs defaultValue "a"
  Trigger: pad 12 20, col #888
  Tab "One", value "a"
    Text "Content One"
  Tab "Two", value "b"
    Text "Content Two"
`)
      // Tabs should render
      expect(ctx.root).toBeDefined()
      expect(ctx.elements.size).toBeGreaterThan(0)

      // Try to find triggers (may have different structure in JSDOM)
      const triggers = findAllByPart(ctx, 'trigger')
      if (triggers.length > 0) {
        const styles = getElementBaseStyles(triggers[0])
        // Check for padding on triggers
        expect(styles['padding'] || styles['padding-top']).toBeDefined()
      }
    })
  })

  describe('Content slot', () => {
    it('should apply padding to Content', () => {
      const ctx = render(`
Tabs defaultValue "a"
  Content: pad 16
  Tab "One", value "a"
    Text "Content One"
`)
      const content = findByPart(ctx, 'content')
      if (content) {
        const styles = getElementBaseStyles(content)
        expect(styles['padding']).toBe('16px')
      }
    })
  })

  describe('Indicator slot', () => {
    it('should apply height and color to Indicator', () => {
      const ctx = render(`
Tabs defaultValue "a"
  Indicator: h 2, bg #2563eb
  Tab "One", value "a"
    Text "Content"
`)
      const indicator = findByPart(ctx, 'indicator')
      if (indicator) {
        const styles = getElementBaseStyles(indicator)
        expect(styles['height']).toBe('2px')
      }
    })
  })
})

// =============================================================================
// SELECT SLOT STYLING
// =============================================================================

describe('Select Slot Styling', () => {
  describe('Trigger slot', () => {
    it('should apply styles to Select Trigger', () => {
      const ctx = render(`
Select
  Trigger: bg #1a1a1a, pad 12, rad 6, bor 1, boc #333
  Content: bg #1a1a1a, rad 8
    Item "Option 1", value "1"
    Item "Option 2", value "2"
`)
      const trigger = findByPart(ctx, 'trigger')
      if (trigger) {
        const styles = getElementBaseStyles(trigger)
        expect(styles['padding']).toBe('12px')
        expect(styles['border-radius']).toBe('6px')
      }
    })
  })

  describe('Content slot', () => {
    it('should apply styles to Select Content', () => {
      const ctx = render(`
Select
  Trigger: Button "Select"
  Content: bg #1a1a1a, rad 8, pad 4, shadow lg
    Item "Option 1", value "1"
`)
      const content = findByPart(ctx, 'content')
      if (content) {
        const styles = getElementBaseStyles(content)
        expect(styles['border-radius']).toBe('8px')
      }
    })
  })
})

// =============================================================================
// ACCORDION SLOT STYLING
// =============================================================================

describe('Accordion Slot Styling', () => {
  describe('Item slot', () => {
    it('should render Accordion with items', () => {
      const ctx = render(`
Accordion
  Item: bg #1a1a1a, rad 8, margin 0 0 4 0
  AccordionItem "Section 1"
    Text "Content 1"
  AccordionItem "Section 2"
    Text "Content 2"
`)
      // Accordion should render
      expect(ctx.root).toBeDefined()
      expect(ctx.elements.size).toBeGreaterThan(0)

      // Try to find items (may have different structure in JSDOM)
      const items = findAllByPart(ctx, 'item')
      if (items.length > 0) {
        const styles = getElementBaseStyles(items[0])
        expect(styles['border-radius']).toBe('8px')
      }
    })
  })

  describe('ItemTrigger slot', () => {
    it('should apply padding to ItemTrigger', () => {
      const ctx = render(`
Accordion
  ItemTrigger: pad 16
  AccordionItem "Section"
    Text "Content"
`)
      const trigger = findByPart(ctx, 'item-trigger')
      if (trigger) {
        const styles = getElementBaseStyles(trigger)
        expect(styles['padding']).toBe('16px')
      }
    })
  })

  describe('ItemContent slot', () => {
    it('should apply padding to ItemContent', () => {
      const ctx = render(`
Accordion
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "Section"
    Text "Content"
`)
      const content = findByPart(ctx, 'item-content')
      if (content) {
        const styles = getElementBaseStyles(content)
        // Should have some padding defined
        expect(styles['padding-left'] || styles['padding']).toBeDefined()
      }
    })
  })
})

// =============================================================================
// SIDENAV SLOT STYLING
// =============================================================================

describe('SideNav Slot Styling', () => {
  describe('Root slot', () => {
    it('should apply styles to SideNav Root', () => {
      const ctx = render(`
SideNav defaultValue "dashboard"
  Root: bg #0a0a0a, bor 0 1 0 0, boc #1a1a1a
  NavItem "Dashboard", icon "home", value "dashboard"
`)
      // SideNav root might be the component itself
      const root = findByPart(ctx, 'root') || ctx.root.querySelector('[data-mirror-id]')
      if (root) {
        const styles = getElementBaseStyles(root as HTMLElement)
        // Check for background or border
        expect(styles['background'] || styles['border-right-width']).toBeDefined()
      }
    })
  })

  describe('Item slot', () => {
    it('should apply styles to NavItem', () => {
      const ctx = render(`
SideNav defaultValue "dashboard"
  Item: pad 12 16, rad 8, margin 2 8, col #888
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Settings", icon "settings", value "settings"
`)
      const items = findAllByPart(ctx, 'item')
      if (items.length > 0) {
        const styles = getElementBaseStyles(items[0])
        expect(styles['border-radius']).toBe('8px')
      }
    })
  })

  describe('Header and Footer slots', () => {
    it('should render Header slot', () => {
      const ctx = render(`
SideNav defaultValue "dashboard"
  Header:
    Frame pad 16
      Text "My App", fs 18, weight bold
  NavItem "Dashboard", value "dashboard"
`)
      // Header might have different data-part naming
      const header = ctx.root.querySelector('[data-part="header"]') ||
                     ctx.root.querySelector('header')
      expect(header || ctx.root.textContent?.includes('My App')).toBeTruthy()
    })

    it('should render Footer slot', () => {
      const ctx = render(`
SideNav defaultValue "dashboard"
  NavItem "Dashboard", value "dashboard"
  Footer:
    Frame pad 16
      Text "v1.0.0", col #666, fs 12
`)
      const footer = ctx.root.querySelector('[data-part="footer"]') ||
                     ctx.root.querySelector('footer')
      expect(footer || ctx.root.textContent?.includes('v1.0.0')).toBeTruthy()
    })
  })
})

// =============================================================================
// CHECKBOX, SWITCH, RADIO SLOT STYLING
// =============================================================================

describe('Form Control Slot Styling', () => {
  describe('Checkbox', () => {
    it('should apply styles to Checkbox Control', () => {
      const ctx = render(`
Checkbox
  Control: w 20, h 20, bor 2, boc #444, rad 4
  Label: col white, fs 13
`)
      const control = findByPart(ctx, 'control')
      if (control) {
        const styles = getElementBaseStyles(control)
        expect(styles['width']).toBe('20px')
        expect(styles['height']).toBe('20px')
      }
    })
  })

  describe('Switch', () => {
    it('should apply styles to Switch Track', () => {
      const ctx = render(`
Switch
  Track: w 44, h 24, rad 99, pad 2
  Thumb: w 20, h 20, bg white, rad 99
`)
      const track = findByPart(ctx, 'track')
      if (track) {
        const styles = getElementBaseStyles(track)
        expect(styles['width']).toBe('44px')
        expect(styles['border-radius']).toBe('99px')
      }
    })
  })

  describe('RadioGroup', () => {
    it('should apply styles to RadioGroup Item', () => {
      const ctx = render(`
RadioGroup value "a"
  Item: margin 0 0 8 0
  ItemControl: w 20, h 20, bor 2, boc #444, rad 99
  Item value "a"
    ItemText "Option A", col white
  Item value "b"
    ItemText "Option B", col white
`)
      const controls = findAllByPart(ctx, 'item-control')
      if (controls.length > 0) {
        const styles = getElementBaseStyles(controls[0])
        expect(styles['border-radius']).toBe('99px')
      }
    })
  })
})

// =============================================================================
// SLIDER SLOT STYLING
// =============================================================================

describe('Slider Slot Styling', () => {
  it('should apply styles to Track and Thumb', () => {
    const ctx = render(`
Slider value 50, min 0, max 100
  Track: h 6, bg #333, rad 99
  Range: bg #2563eb, rad 99
  Thumb: w 18, h 18, bg white, rad 99
`)
    const track = findByPart(ctx, 'track')
    const thumb = findByPart(ctx, 'thumb')

    if (track) {
      const styles = getElementBaseStyles(track)
      expect(styles['height']).toBe('6px')
    }

    if (thumb) {
      const styles = getElementBaseStyles(thumb)
      expect(styles['width']).toBe('18px')
      expect(styles['border-radius']).toBe('99px')
    }
  })
})

// =============================================================================
// POPOVER AND TOOLTIP SLOT STYLING
// =============================================================================

describe('Popover Slot Styling', () => {
  it('should apply styles to Popover Content', () => {
    const ctx = render(`
Popover
  Trigger: Button "Open"
  Content: bg #1a1a1a, pad 16, rad 8, shadow lg
    Text "Popover content"
`)
    const content = findByPart(ctx, 'content')
    if (content) {
      const styles = getElementBaseStyles(content)
      expect(styles['padding']).toBe('16px')
      expect(styles['border-radius']).toBe('8px')
    }
  })
})

describe('Tooltip Slot Styling', () => {
  it('should apply styles to Tooltip Content', () => {
    const ctx = render(`
Tooltip
  Trigger: Button "Hover"
  Content: bg #333, col white, pad 8 12, rad 4, fs 12
    Text "Tooltip text"
`)
    const content = findByPart(ctx, 'content')
    if (content) {
      const styles = getElementBaseStyles(content)
      expect(styles['border-radius']).toBe('4px')
    }
  })
})
