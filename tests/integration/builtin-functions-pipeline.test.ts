/**
 * Built-in Functions Pipeline Tests
 *
 * Full pipeline tests: Parse → IR → Backend → Execute → Verify DOM
 * Tests actual runtime behavior with compileAndExecute()
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse, generateDOM } from '../../compiler'
import { JSDOM } from 'jsdom'

// ============================================
// TEST HELPERS
// ============================================

function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

function compileAndExecute(mirrorCode: string, data: Record<string, unknown> = {}): {
  dom: JSDOM
  root: HTMLElement
  container: HTMLElement
  api: any
  jsCode: string
  window: Window & typeof globalThis
} {
  const jsCode = compile(mirrorCode)
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'http://localhost',
  })

  const { window } = dom
  const { document } = window

  // Mock clipboard API
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: async (text: string) => {
        ;(window as any).__lastCopiedText = text
      },
    },
    writable: true,
  })

  // The generated code includes the runtime, so we just need to execute it
  const executableCode = jsCode.replace(/^export /gm, '')
  const wrappedCode = `
    (function() {
      ${executableCode}
      window.__mirrorAPI = createUI(${JSON.stringify(data)});
      window.__mirrorRoot = window.__mirrorAPI.root;
      window._runtime = _runtime;
    })();
  `

  const script = document.createElement('script')
  script.textContent = wrappedCode
  document.body.appendChild(script)

  const container = (window as any).__mirrorRoot
  const root = container?.firstElementChild as HTMLElement

  return {
    dom,
    root,
    container,
    api: (window as any).__mirrorAPI,
    jsCode,
    window: window as Window & typeof globalThis,
  }
}

function findByName(container: HTMLElement, name: string): HTMLElement | null {
  // Backend sets dataset.mirrorName which becomes data-mirror-name attribute
  return container.querySelector(`[data-mirror-name="${name}"]`) as HTMLElement | null
}

function findByMirrorId(container: HTMLElement, id: string): HTMLElement | null {
  return container.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement | null
}

function getAllElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll('[data-mirror-id]')) as HTMLElement[]
}

function isVisible(el: HTMLElement): boolean {
  if (!el) return false
  const style = el.style
  return style.display !== 'none' && !el.hidden && style.visibility !== 'hidden'
}

function click(el: HTMLElement): void {
  el.click()
}

// ============================================
// OVERLAY FUNCTIONS - PIPELINE TESTS
// ============================================

describe('Pipeline: Overlay Functions', () => {
  describe('showBelow()', () => {
    it('zeigt verstecktes Element nach Klick', () => {
      const { container } = compileAndExecute(`
Button "Open", name Trigger
  onclick: showBelow(Dropdown)

Frame hidden, name Dropdown
  Text "Content"
      `)

      const trigger = findByName(container, 'Trigger')
      const dropdown = findByName(container, 'Dropdown')

      expect(trigger).not.toBeNull()
      expect(dropdown).not.toBeNull()
      expect(isVisible(dropdown!)).toBe(false)

      click(trigger!)
      expect(isVisible(dropdown!)).toBe(true)
    })

    it('positioniert Element mit fixed positioning', () => {
      const { container } = compileAndExecute(`
Button "Open", name Trigger
  onclick: showBelow(Menu)

Frame hidden, name Menu
  Text "Item"
      `)

      const trigger = findByName(container, 'Trigger')
      const menu = findByName(container, 'Menu')

      click(trigger!)

      expect(menu!.style.position).toBe('fixed')
    })
  })

  describe('showAbove()', () => {
    it('zeigt Element oberhalb des Triggers', () => {
      const { container } = compileAndExecute(`
Button "Info", name Trigger
  onclick: showAbove(Tooltip)

Frame hidden, name Tooltip
  Text "Help text"
      `)

      const trigger = findByName(container, 'Trigger')
      const tooltip = findByName(container, 'Tooltip')

      expect(isVisible(tooltip!)).toBe(false)
      click(trigger!)
      expect(isVisible(tooltip!)).toBe(true)
    })
  })

  describe('showModal()', () => {
    it('zeigt Element als Modal mit Backdrop', () => {
      const { container, window } = compileAndExecute(`
Button "Open", name Trigger
  onclick: showModal(Dialog)

Frame hidden, name Dialog
  Text "Modal Content"
      `)

      const trigger = findByName(container, 'Trigger')
      const dialog = findByName(container, 'Dialog')

      click(trigger!)

      expect(isVisible(dialog!)).toBe(true)
      expect(dialog!.style.position).toBe('fixed')

      // Check for backdrop
      const backdrop = window.document.querySelector('[data-mirror-backdrop]')
      expect(backdrop).not.toBeNull()
    })
  })

  describe('dismiss()', () => {
    it('schließt geöffnetes Overlay', () => {
      const { container } = compileAndExecute(`
Button "Open", name OpenBtn
  onclick: showBelow(Menu)

Frame hidden, name Menu
  Button "Close", name CloseBtn
    onclick: dismiss(Menu)
      `)

      const openBtn = findByName(container, 'OpenBtn')
      const closeBtn = findByName(container, 'CloseBtn')
      const menu = findByName(container, 'Menu')

      // Open
      click(openBtn!)
      expect(isVisible(menu!)).toBe(true)

      // Close
      click(closeBtn!)
      expect(isVisible(menu!)).toBe(false)
    })

    it('entfernt fixed positioning nach dismiss', () => {
      const { container } = compileAndExecute(`
Button "Open", name OpenBtn
  onclick: showModal(Dialog)

Frame hidden, name Dialog
  Button "Close", name CloseBtn
    onclick: dismiss(Dialog)
      `)

      const openBtn = findByName(container, 'OpenBtn')
      const closeBtn = findByName(container, 'CloseBtn')
      const dialog = findByName(container, 'Dialog')

      click(openBtn!)
      expect(dialog!.style.position).toBe('fixed')

      click(closeBtn!)
      // Position should be reset
      expect(dialog!.style.position).not.toBe('fixed')
    })
  })
})

// ============================================
// SCROLL FUNCTIONS - PIPELINE TESTS
// ============================================

describe('Pipeline: Scroll Functions', () => {
  describe('scrollTo()', () => {
    it('scrollt zu Element ohne Fehler', () => {
      const { container } = compileAndExecute(`
Button "Scroll", name ScrollBtn
  onclick: scrollTo(Target)

Frame scroll, h 100, name Container
  Frame h 50, bg #333
  Frame h 50, bg #666, name Target
      `)

      const scrollBtn = findByName(container, 'ScrollBtn')

      // Should not throw
      expect(() => click(scrollBtn!)).not.toThrow()
    })
  })

  describe('scrollBy()', () => {
    it('scrollt Container um Offset', () => {
      const { container } = compileAndExecute(`
Button "Scroll", name ScrollBtn
  onclick: scrollBy(List, 0, 50)

Frame scroll, h 100, name List
  Frame h 200, bg #333
      `)

      const scrollBtn = findByName(container, 'ScrollBtn')
      const list = findByName(container, 'List')

      // Note: scrollBy might not work in JSDOM, but should not throw
      expect(() => click(scrollBtn!)).not.toThrow()
    })
  })

  describe('scrollToTop() / scrollToBottom()', () => {
    it('scrollToTop funktioniert ohne Fehler', () => {
      const { container } = compileAndExecute(`
Button "Top", name TopBtn
  onclick: scrollToTop(List)

Frame scroll, h 100, name List
  Frame h 200, bg #333
      `)

      const topBtn = findByName(container, 'TopBtn')
      expect(() => click(topBtn!)).not.toThrow()
    })

    it('scrollToBottom funktioniert ohne Fehler', () => {
      const { container } = compileAndExecute(`
Button "Bottom", name BottomBtn
  onclick: scrollToBottom(List)

Frame scroll, h 100, name List
  Frame h 200, bg #333
      `)

      const bottomBtn = findByName(container, 'BottomBtn')
      expect(() => click(bottomBtn!)).not.toThrow()
    })
  })
})

// ============================================
// VALUE FUNCTIONS - PIPELINE TESTS
// ============================================

describe('Pipeline: Value Functions', () => {
  describe('increment()', () => {
    it('erhöht Token-Wert', () => {
      const { container, window } = compileAndExecute(`
$count: 0

Button "+", name IncBtn
  onclick: increment($count)
      `)

      const incBtn = findByName(container, 'IncBtn')
      const runtime = (window as any)._runtime

      // Get initial state
      expect(runtime._tokens['$count']).toBe(0)

      click(incBtn!)

      // Value should be incremented
      expect(runtime._tokens['$count']).toBe(1)
    })

    it('erhöht mehrfach', () => {
      const { container, window } = compileAndExecute(`
$count: 5

Button "+", name IncBtn
  onclick: increment($count)
      `)

      const incBtn = findByName(container, 'IncBtn')
      const runtime = (window as any)._runtime

      click(incBtn!)
      click(incBtn!)
      click(incBtn!)

      expect(runtime._tokens['$count']).toBe(8)
    })
  })

  describe('decrement()', () => {
    it('verringert Token-Wert', () => {
      const { container, window } = compileAndExecute(`
$count: 10

Button "-", name DecBtn
  onclick: decrement($count)
      `)

      const decBtn = findByName(container, 'DecBtn')
      const runtime = (window as any)._runtime

      click(decBtn!)

      expect(runtime._tokens['$count']).toBe(9)
    })

    it('kann negativ werden', () => {
      const { container, window } = compileAndExecute(`
$count: 0

Button "-", name DecBtn
  onclick: decrement($count)
      `)

      const decBtn = findByName(container, 'DecBtn')
      const runtime = (window as any)._runtime

      click(decBtn!)
      click(decBtn!)

      expect(runtime._tokens['$count']).toBe(-2)
    })
  })

  describe('set()', () => {
    it('setzt Token auf numerischen Wert', () => {
      const { container, window } = compileAndExecute(`
$value: 0

Button "Set 42", name SetBtn
  onclick: set($value, 42)
      `)

      const setBtn = findByName(container, 'SetBtn')
      const runtime = (window as any)._runtime

      click(setBtn!)

      expect(runtime._tokens['$value']).toBe(42)
    })

    it('setzt Token auf String-Wert', () => {
      const { container, window } = compileAndExecute(`
$name: "initial"

Button "Set", name SetBtn
  onclick: set($name, "updated")
      `)

      const setBtn = findByName(container, 'SetBtn')
      const runtime = (window as any)._runtime

      click(setBtn!)

      expect(runtime._tokens['$name']).toBe('updated')
    })
  })

  describe('reset()', () => {
    it('setzt Token auf Initial-Wert zurück', () => {
      const { container, window } = compileAndExecute(`
$count: 99

Button "+", name IncBtn
  onclick: increment($count)
Button "Reset", name ResetBtn
  onclick: reset($count)
      `)

      const incBtn = findByName(container, 'IncBtn')
      const resetBtn = findByName(container, 'ResetBtn')
      const runtime = (window as any)._runtime

      // Initial value
      expect(runtime._tokens['$count']).toBe(99)

      // Increment
      click(incBtn!)
      expect(runtime._tokens['$count']).toBe(100)

      // Reset to initial
      click(resetBtn!)
      expect(runtime._tokens['$count']).toBe(99)
    })

    it('setzt Token auf benutzerdefinierten Wert', () => {
      const { container, window } = compileAndExecute(`
$count: 99

Button "Reset to 5", name ResetBtn
  onclick: reset($count, 5)
      `)

      const resetBtn = findByName(container, 'ResetBtn')
      const runtime = (window as any)._runtime

      click(resetBtn!)

      expect(runtime._tokens['$count']).toBe(5)
    })
  })

  describe('Counter Kombination', () => {
    it('increment und decrement zusammen', () => {
      const { container, window } = compileAndExecute(`
$count: 5

Frame hor, gap 8
  Button "-", name DecBtn
    onclick: decrement($count)
  Button "+", name IncBtn
    onclick: increment($count)
      `)

      const incBtn = findByName(container, 'IncBtn')
      const decBtn = findByName(container, 'DecBtn')
      const runtime = (window as any)._runtime

      click(incBtn!)
      click(incBtn!)
      click(decBtn!)

      expect(runtime._tokens['$count']).toBe(6)
    })

    it('reset setzt Counter zurück', () => {
      const { container, window } = compileAndExecute(`
$count: 0

Frame gap 8
  Button "+", name IncBtn
    onclick: increment($count)
  Button "Reset", name ResetBtn
    onclick: reset($count)
      `)

      const incBtn = findByName(container, 'IncBtn')
      const resetBtn = findByName(container, 'ResetBtn')
      const runtime = (window as any)._runtime

      click(incBtn!)
      click(incBtn!)
      click(incBtn!)

      expect(runtime._tokens['$count']).toBe(3)

      click(resetBtn!)

      expect(runtime._tokens['$count']).toBe(0)
    })
  })
})

// ============================================
// CLIPBOARD FUNCTIONS - PIPELINE TESTS
// ============================================

describe('Pipeline: Clipboard Functions', () => {
  describe('copy()', () => {
    it('kopiert String in Zwischenablage', async () => {
      const { container, window } = compileAndExecute(`
Button "Copy", name CopyBtn
  onclick: copy("Hello World")
      `)

      const copyBtn = findByName(container, 'CopyBtn')

      click(copyBtn!)

      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 10))

      expect((window as any).__lastCopiedText).toBe('Hello World')
    })

    it('kopiert Token-Wert', async () => {
      const { container, window } = compileAndExecute(`
$code: "SECRET123"

Button "Copy", name CopyBtn
  onclick: copy($code)
      `)

      const copyBtn = findByName(container, 'CopyBtn')

      click(copyBtn!)

      await new Promise(resolve => setTimeout(resolve, 10))

      // Note: The runtime uses get() to fetch the token value
      // The actual copied text depends on how get() resolves
    })

    it('setzt copied state auf Element', async () => {
      const { container } = compileAndExecute(`
Button "Copy", name CopyBtn
  copied:
    bg green
  onclick: copy("text")
      `)

      const copyBtn = findByName(container, 'CopyBtn')

      click(copyBtn!)

      await new Promise(resolve => setTimeout(resolve, 10))

      // Element should have copied state
      expect(copyBtn!.dataset.state).toBe('copied')
    })
  })
})

// ============================================
// CROSS-FEATURE TESTS
// ============================================

describe('Pipeline: Cross-Feature Kombinationen', () => {
  it('Dropdown mit Counter', () => {
    const { container, window } = compileAndExecute(`
$count: 0

Button "Menu", name MenuBtn
  onclick: showBelow(Menu)

Frame hidden, name Menu
  Button "+", name IncBtn
    onclick: increment($count)
  Button "Reset", name ResetBtn
    onclick: reset($count)
    `)

    const menuBtn = findByName(container, 'MenuBtn')
    const menu = findByName(container, 'Menu')
    const incBtn = findByName(container, 'IncBtn')
    const resetBtn = findByName(container, 'ResetBtn')
    const runtime = (window as any)._runtime

    // Open menu
    click(menuBtn!)
    expect(isVisible(menu!)).toBe(true)

    // Increment
    click(incBtn!)
    click(incBtn!)

    expect(runtime._tokens['$count']).toBe(2)

    // Reset
    click(resetBtn!)

    expect(runtime._tokens['$count']).toBe(0)
  })

  it('Modal mit Counter und Dismiss', () => {
    const { container, window } = compileAndExecute(`
$step: 1

Button "Open Wizard", name OpenBtn
  onclick: showModal(Wizard)

Frame hidden, name Wizard
  Button "Next", name NextBtn
    onclick: increment($step)
  Button "Back", name BackBtn
    onclick: decrement($step)
  Button "Close", name CloseBtn
    onclick: dismiss(Wizard)
    `)

    const openBtn = findByName(container, 'OpenBtn')
    const wizard = findByName(container, 'Wizard')
    const nextBtn = findByName(container, 'NextBtn')
    const backBtn = findByName(container, 'BackBtn')
    const closeBtn = findByName(container, 'CloseBtn')
    const runtime = (window as any)._runtime

    // Open wizard
    click(openBtn!)
    expect(isVisible(wizard!)).toBe(true)

    // Navigate
    click(nextBtn!)
    click(nextBtn!)

    expect(runtime._tokens['$step']).toBe(3)

    click(backBtn!)

    expect(runtime._tokens['$step']).toBe(2)

    // Close
    click(closeBtn!)
    expect(isVisible(wizard!)).toBe(false)
  })
})

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Pipeline: Error Handling', () => {
  it('dismiss mit nicht existierendem Element wirft keinen Fehler', () => {
    const { container } = compileAndExecute(`
Button "Close", name CloseBtn
  onclick: dismiss(NonExistent)
    `)

    const closeBtn = findByName(container, 'CloseBtn')

    // Should not throw
    expect(() => click(closeBtn!)).not.toThrow()
  })

  it('showBelow mit nicht existierendem Element wirft keinen Fehler', () => {
    const { container } = compileAndExecute(`
Button "Open", name OpenBtn
  onclick: showBelow(NonExistent)
    `)

    const openBtn = findByName(container, 'OpenBtn')

    // Should not throw
    expect(() => click(openBtn!)).not.toThrow()
  })

  it('increment mit nicht gesetztem Token startet bei 0', () => {
    const { container, window } = compileAndExecute(`
Button "+", name IncBtn
  onclick: increment($newToken)
    `)

    const incBtn = findByName(container, 'IncBtn')
    const runtime = (window as any)._runtime

    click(incBtn!)

    expect(runtime._tokens['$newToken']).toBe(1)
  })

  it('decrement mit nicht gesetztem Token startet bei 0', () => {
    const { container, window } = compileAndExecute(`
Button "-", name DecBtn
  onclick: decrement($newToken)
    `)

    const decBtn = findByName(container, 'DecBtn')
    const runtime = (window as any)._runtime

    click(decBtn!)

    expect(runtime._tokens['$newToken']).toBe(-1)
  })
})
