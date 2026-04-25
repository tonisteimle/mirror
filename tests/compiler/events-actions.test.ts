/**
 * Events & Actions — Coverage-Tests (Thema 8)
 *
 * Vor diesem File: `compiler/backends/dom/event-emitter.ts` 43.5% Lines.
 * Dieses File deckt die ungetesteten Action-Branches im Backend ab.
 *
 * Pipeline: Parser → IR (event-transformer 100%) → DOM-Backend (event-emitter,
 * Hauptlücke vor Thema 8). Die Tests sind backend-fokussiert: jede Action
 * wird so eingesetzt, dass der entsprechende Emitter-Pfad ausgelöst wird,
 * und der Output auf den runtime-Call geprüft.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function dom(src: string): string {
  return generateDOM(parse(src))
}

// =============================================================================
// 3.1 Lifecycle Events (IntersectionObserver, onload)
// =============================================================================

describe('Events — lifecycle (onviewenter / onviewexit / onload)', () => {
  it('E1: onviewenter triggers IntersectionObserver wiring', () => {
    const out = dom(`canvas mobile

Frame onviewenter toast("visible")
`)
    expect(out).toContain('IntersectionObserver')
    expect(out).toContain('_enterCallback')
  })

  it('E2: onviewexit produces the exit branch', () => {
    const out = dom(`canvas mobile

Frame onviewexit toast("gone")
`)
    expect(out).toContain('IntersectionObserver')
    expect(out).toContain('_exitCallback')
  })

  it('E3: onload registers a load handler', () => {
    const out = dom(`canvas mobile

loaded: false
Frame onload set(loaded, true)
`)
    expect(out).toMatch(/addEventListener\('load'|onload\s*=/)
  })
})

// =============================================================================
// 3.2 Boolean-Actions on currentVar
// =============================================================================

describe('Events — show/hide/toggle on current element', () => {
  it('E4: show() targets currentVar via _runtime.show', () => {
    const out = dom(`canvas mobile

Button "X", onclick show()
`)
    expect(out).toMatch(/_runtime\.show\(/)
  })

  it('E5: hide() emits _runtime.hide', () => {
    const out = dom(`canvas mobile

Button "X", onclick hide()
`)
    expect(out).toMatch(/_runtime\.hide\(/)
  })

  it('E6: toggle() emits stateMachineToggle', () => {
    const out = dom(`canvas mobile

Button "X", onclick toggle()
`)
    expect(out).toMatch(/_runtime\.stateMachineToggle/)
  })
})

// =============================================================================
// 3.3 Counter Actions
// =============================================================================

describe('Events — counter actions', () => {
  it('E8: increment(count) emits runtime call with token name', () => {
    const out = dom(`canvas mobile

count: 0
Button "+", onclick increment(count)
`)
    expect(out).toMatch(/_runtime\.increment\(\s*['"]count['"]/)
  })

  it('E10: decrement(count) emits runtime call', () => {
    const out = dom(`canvas mobile

count: 0
Button "-", onclick decrement(count)
`)
    expect(out).toMatch(/_runtime\.decrement\(\s*['"]count['"]/)
  })

  it('E11: set(count, 10) emits set call with explicit value', () => {
    const out = dom(`canvas mobile

count: 0
Button "10", onclick set(count, 10)
`)
    expect(out).toMatch(/_runtime\.set\(\s*['"]count['"]/)
    expect(out).toContain('10')
  })

  it('E12: reset(count) emits reset call', () => {
    const out = dom(`canvas mobile

count: 0
Button "Reset", onclick reset(count)
`)
    expect(out).toMatch(/_runtime\.reset\(/)
  })
})

// =============================================================================
// 3.4 Feedback Actions
// =============================================================================

describe('Events — feedback actions', () => {
  it('E13: toast("Hello") emits toast runtime call with the message', () => {
    const out = dom(`canvas mobile

Button "X", onclick toast("Hello")
`)
    expect(out).toMatch(/_runtime\.toast\([^)]*Hello/)
  })

  it('E14: toast("Err", "error") includes the type argument', () => {
    const out = dom(`canvas mobile

Button "X", onclick toast("Err", "error")
`)
    expect(out).toMatch(/_runtime\.toast\([^)]*Err[^)]*error/)
  })

  it('E15: copy("text") emits copy call', () => {
    const out = dom(`canvas mobile

Button "X", onclick copy("text")
`)
    expect(out).toMatch(/_runtime\.copy\(/)
  })
})

// =============================================================================
// 3.5 Navigation
// =============================================================================

describe('Events — navigation actions', () => {
  it('E16: navigate(HomeView) targets the view by name', () => {
    const out = dom(`canvas mobile

Button "Home", onclick navigate(HomeView)
`)
    expect(out).toMatch(/_runtime\.navigate\([^)]*HomeView/)
  })

  it('E17: back() emits back call', () => {
    const out = dom(`canvas mobile

Button "Back", onclick back()
`)
    expect(out).toMatch(/_runtime\.back\(\)|history\.back\(\)/)
  })

  it('E18: openUrl("https://x.com") emits openUrl call', () => {
    const out = dom(`canvas mobile

Button "Link", onclick openUrl("https://x.com")
`)
    expect(out).toMatch(/_runtime\.openUrl\([^)]*https:\/\/x\.com/)
  })
})

// =============================================================================
// 3.6 Scroll Actions
// =============================================================================

describe('Events — scroll actions', () => {
  it('E19: scrollToTop() emits scroll call', () => {
    const out = dom(`canvas mobile

Button "Top", onclick scrollToTop()
`)
    expect(out).toMatch(/_runtime\.scrollToTop\(|scrollTo\(/)
  })

  it('E20: scrollToBottom() emits scroll call', () => {
    const out = dom(`canvas mobile

Button "Btm", onclick scrollToBottom()
`)
    expect(out).toMatch(/_runtime\.scrollToBottom\(|scrollTo\(/)
  })
})

// =============================================================================
// 3.7 Input Actions
// =============================================================================

describe('Events — input actions', () => {
  it('E21: focus(F) emits focus call with target', () => {
    const out = dom(`canvas mobile

Button "Go", onclick focus(EmailField)
`)
    expect(out).toMatch(/_runtime\.focus\(/)
  })

  it('E22: clear(F) emits clear call', () => {
    const out = dom(`canvas mobile

Button "Clear", onclick clear(EmailField)
`)
    expect(out).toMatch(/_runtime\.clear\(/)
  })
})

// =============================================================================
// 3.8 onclick-outside
// =============================================================================

describe('Events — onclick-outside', () => {
  it('E28: onclick-outside registers the listener', () => {
    const out = dom(`canvas mobile

Frame onclick-outside hide()
`)
    // Either explicit click-outside-listener or document-level handler.
    expect(out).toMatch(/click-outside|document\.addEventListener\('click'/)
  })
})

// =============================================================================
// 3.9 Multi-Action chains
// =============================================================================

describe('Events — multi-action chains', () => {
  it('E27: 3 actions in one onclick all reach the output', () => {
    const out = dom(`canvas mobile

count: 0
Button "Combo", onclick toggle(), increment(count), toast("Yay")
`)
    expect(out).toMatch(/_runtime\.stateMachineToggle/)
    expect(out).toMatch(/_runtime\.increment/)
    expect(out).toMatch(/_runtime\.toast/)
  })
})

// =============================================================================
// 3.10 Keyboard event variants
// =============================================================================

describe('Events — keyboard variants', () => {
  it('onkeydown(arrow-down) fires action only on that key', () => {
    const out = dom(`canvas mobile

count: 0
Frame onkeydown(arrow-down) increment(count)
`)
    // Output must contain a keydown listener and a key check for ArrowDown.
    expect(out).toMatch(/keydown/)
    expect(out).toMatch(/ArrowDown/)
  })

  it('onenter is a keydown shortcut for Enter', () => {
    const out = dom(`canvas mobile

count: 0
Frame onenter increment(count)
`)
    expect(out).toMatch(/keydown/)
    expect(out).toMatch(/Enter/)
  })

  it('onescape fires on Escape key', () => {
    const out = dom(`canvas mobile

Frame onescape hide()
`)
    expect(out).toMatch(/keydown/)
    expect(out).toMatch(/Escape/)
  })
})
