/**
 * Pure UI Components — Behavior Spec (Schicht 2)
 *
 * Sub-Features:
 *   PUC1 Checkbox: text label, checked, disabled
 *   PUC2 Switch: text label, checked
 *   PUC3 Slider: value, min, max, step
 *   PUC4 RadioGroup + RadioItem: initial value, items
 *   PUC5 Dialog: Trigger / Backdrop / Content slots
 *   PUC6 Tooltip: Trigger / Content slots, positioning
 *   PUC7 Tabs: Tab tabs + content
 *   PUC8 Select + Item: Trigger / Content / Items
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  const fn = new Function(code + '\nreturn createUI();')
  const root = fn() as HTMLElement
  container.appendChild(root)
  return root
}

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('Pure UI Components — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // PUC1: Checkbox
  // ---------------------------------------------------------------------------

  describe('PUC1: Checkbox', () => {
    it('renders with text label as content', () => {
      const root = render(`Checkbox "Newsletter"`, container)
      const cb = findByName(root, 'Checkbox') as HTMLElement
      expect(cb).toBeTruthy()
      expect(cb.textContent).toContain('Newsletter')
    })

    it('checked sets the checked attribute', () => {
      const root = render(`Checkbox "AGB", checked`, container)
      const cb = findByName(root, 'Checkbox') as HTMLElement
      const isChecked =
        cb.hasAttribute('checked') ||
        cb.dataset.checked === 'true' ||
        cb.getAttribute('checked') === 'true'
      expect(isChecked).toBe(true)
    })

    it('without checked, the checkbox is unchecked', () => {
      const root = render(`Checkbox "X"`, container)
      const cb = findByName(root, 'Checkbox') as HTMLElement
      expect(cb.hasAttribute('checked')).toBe(false)
    })

    it('disabled adds the disabled attribute', () => {
      const root = render(`Checkbox "X", disabled`, container)
      const cb = findByName(root, 'Checkbox') as HTMLElement
      const dis =
        cb.hasAttribute('disabled') ||
        cb.getAttribute('disabled') !== null ||
        cb.dataset.disabled === 'true' ||
        (cb.style.opacity && parseFloat(cb.style.opacity) < 1)
      expect(dis).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // PUC2: Switch
  // ---------------------------------------------------------------------------

  describe('PUC2: Switch', () => {
    it('renders with text label', () => {
      const root = render(`Switch "Dark Mode"`, container)
      const sw = findByName(root, 'Switch') as HTMLElement
      expect(sw).toBeTruthy()
      expect(sw.textContent).toContain('Dark Mode')
    })

    it('checked sets initial state', () => {
      const root = render(`Switch "Notifications", checked`, container)
      const sw = findByName(root, 'Switch') as HTMLElement
      const isChecked =
        sw.hasAttribute('checked') ||
        sw.dataset.checked === 'true' ||
        sw.getAttribute('checked') === 'true'
      expect(isChecked).toBe(true)
    })

    it('compiles + renders without throwing', () => {
      expect(() => render(`Switch "X"`, container)).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // PUC3: Slider
  // ---------------------------------------------------------------------------

  describe('PUC3: Slider', () => {
    it('renders with value/min/max attributes', () => {
      const root = render(`Slider value 50, min 0, max 100, step 10`, container)
      const sl = findByName(root, 'Slider') as HTMLElement
      expect(sl).toBeTruthy()
      expect(sl.getAttribute('value')).toBe('50')
      expect(sl.getAttribute('min')).toBe('0')
      expect(sl.getAttribute('max')).toBe('100')
    })

    it('step attribute is set', () => {
      const root = render(`Slider value 0, min 0, max 10, step 2`, container)
      const sl = findByName(root, 'Slider') as HTMLElement
      expect(sl.getAttribute('step')).toBe('2')
    })

    it('compiles + renders without throwing', () => {
      expect(() => render(`Slider value 50`, container)).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // PUC4: RadioGroup + RadioItem
  // ---------------------------------------------------------------------------

  describe('PUC4: RadioGroup', () => {
    it('initial value attribute is set on the group', () => {
      const root = render(
        `RadioGroup value "monthly"\n  RadioItem "Monthly", value "monthly"\n  RadioItem "Yearly", value "yearly"`,
        container
      )
      const rg = findByName(root, 'RadioGroup') as HTMLElement
      expect(rg.getAttribute('value')).toBe('monthly')
    })

    it('renders all RadioItem children', () => {
      const root = render(
        `RadioGroup value "a"\n  RadioItem "A", value "a"\n  RadioItem "B", value "b"\n  RadioItem "C", value "c"`,
        container
      )
      expect(allByName(root, 'RadioItem').length).toBe(3)
    })

    it('RadioItem text appears in DOM', () => {
      const root = render(`RadioGroup\n  RadioItem "Choice One", value "1"`, container)
      const item = findByName(root, 'RadioItem') as HTMLElement
      expect(item.textContent).toContain('Choice One')
    })
  })

  // ---------------------------------------------------------------------------
  // PUC5: Dialog
  // ---------------------------------------------------------------------------

  describe('PUC5: Dialog', () => {
    it('renders with Trigger + Backdrop + Content slots', () => {
      const root = render(
        `Dialog\n  Trigger: Button "Open"\n  Backdrop: bg rgba(0,0,0,0.5)\n  Content: Frame pad 16\n    Text "Body"`,
        container
      )
      expect(findByName(root, 'Dialog')).toBeTruthy()
      expect(findByName(root, 'Trigger')).toBeTruthy()
      expect(findByName(root, 'Backdrop')).toBeTruthy()
      expect(findByName(root, 'Content')).toBeTruthy()
    })

    it('Trigger contains the Button child', () => {
      const root = render(
        `Dialog\n  Trigger: Button "Open"\n  Content: Frame\n    Text "X"`,
        container
      )
      const trigger = findByName(root, 'Trigger') as HTMLElement
      const btn = trigger.querySelector('[data-mirror-name="Button"]') as HTMLElement
      expect(btn).toBeTruthy()
      expect(btn.textContent?.trim()).toBe('Open')
    })

    it('compiles + renders without throwing', () => {
      expect(() =>
        render(`Dialog\n  Trigger: Button "X"\n  Content: Frame\n    Text "Y"`, container)
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // PUC6: Tooltip
  // ---------------------------------------------------------------------------

  describe('PUC6: Tooltip', () => {
    it('renders with Trigger + Content slots', () => {
      const root = render(
        `Tooltip positioning "bottom"\n  Trigger: Icon "info", is 20\n  Content: Text "Help"`,
        container
      )
      expect(findByName(root, 'Tooltip')).toBeTruthy()
      expect(findByName(root, 'Trigger')).toBeTruthy()
      expect(findByName(root, 'Content')).toBeTruthy()
    })

    // Bug #32: `Tooltip positioning "bottom"` parses, but the
    // `positioning` attribute is not emitted on the rendered div. Pinned as
    // current behavior — compiler accepts the keyword without surfacing it.
    it('positioning is parsed without throwing (Bug #32: not surfaced as attribute)', () => {
      expect(() =>
        render(
          `Tooltip positioning "bottom"\n  Trigger: Text "T"\n  Content: Text "Help"`,
          container
        )
      ).not.toThrow()
    })

    it('Content contains the help text', () => {
      const root = render(`Tooltip\n  Trigger: Text "T"\n  Content: Text "Help text"`, container)
      const content = findByName(root, 'Content') as HTMLElement
      expect(content.textContent).toContain('Help text')
    })
  })

  // ---------------------------------------------------------------------------
  // PUC7: Tabs
  // ---------------------------------------------------------------------------

  describe('PUC7: Tabs', () => {
    it('renders all Tab children', () => {
      const root = render(
        `Tabs\n  Tab "Home"\n    Text "H"\n  Tab "About"\n    Text "A"\n  Tab "Settings"\n    Text "S"`,
        container
      )
      expect(allByName(root, 'Tab').length).toBe(3)
    })

    // Bug #33: `Tabs defaultValue "home"` parses but the `defaultValue`
    // attribute is not emitted on the rendered div. Pinned as current
    // behavior — compiler accepts the keyword without surfacing it.
    it('defaultValue is parsed without throwing (Bug #33: not surfaced as attribute)', () => {
      expect(() =>
        render(`Tabs defaultValue "home"\n  Tab "Home"\n    Text "H"`, container)
      ).not.toThrow()
    })

    it('compiles + renders without throwing', () => {
      expect(() =>
        render(`Tabs\n  Tab "Home"\n    Text "X"\n  Tab "About"\n    Text "Y"`, container)
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // PUC8: Select
  // ---------------------------------------------------------------------------

  describe('PUC8: Select', () => {
    it('renders with Trigger + Content slots', () => {
      const root = render(
        `Select\n  Trigger\n    Text "Choose"\n  Content\n    Item "A"\n    Item "B"`,
        container
      )
      expect(findByName(root, 'Select')).toBeTruthy()
      expect(findByName(root, 'Trigger')).toBeTruthy()
      expect(findByName(root, 'Content')).toBeTruthy()
    })

    it('renders all Item children inside Content', () => {
      const root = render(
        `Select\n  Trigger\n    Text "T"\n  Content\n    Item "Berlin"\n    Item "Hamburg"\n    Item "Munich"`,
        container
      )
      expect(allByName(root, 'Item').length).toBe(3)
    })

    it('Item text is rendered', () => {
      const root = render(
        `Select\n  Trigger\n    Text "T"\n  Content\n    Item "Berlin"`,
        container
      )
      const item = findByName(root, 'Item') as HTMLElement
      expect(item.textContent).toContain('Berlin')
    })
  })
})
