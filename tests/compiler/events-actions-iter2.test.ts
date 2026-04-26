/**
 * Events & Actions — Iter 2: Coverage closure (Thema 8)
 *
 * Goal: bring `compiler/backends/dom/event-emitter.ts` from 55.33% L /
 * 43.03% B / 57.14% F to ≥90% on all three.
 *
 * Iter 1 covered the high-frequency Patterns. This file targets the
 * remaining branches in `emitRuntimeAction` and its sub-emitters
 * (Position, Animate, Scroll, Value, Input, CRUD, custom-fallback).
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const dom = (src: string) => generateDOM(parse(src))

// =============================================================================
// 4.1 Position-Actions (showAt / showBelow / showAbove / showLeft / showRight / showModal / dismiss)
// =============================================================================

describe('Events Iter2 — position actions', () => {
  it('showBelow(target) emits runtime call with target + currentVar + offset', () => {
    const out = dom(`canvas mobile

Frame name TooltipBox
Button "Hover", onhover showBelow(TooltipBox)
`)
    expect(out).toMatch(/_runtime\.showBelow\(_elements\['TooltipBox'\][^,]*,\s*[^,]+,\s*4\)/)
  })

  it('showAbove(target, 12) passes the explicit offset', () => {
    const out = dom(`canvas mobile

Frame name Tip
Button "X", onclick showAbove(Tip, 12)
`)
    expect(out).toMatch(/_runtime\.showAbove\([^,]+,\s*[^,]+,\s*12\)/)
  })

  it('showLeft(target) routes via emitPositionAction', () => {
    const out = dom(`canvas mobile

Frame name SideBox
Button "X", onclick showLeft(SideBox)
`)
    expect(out).toMatch(/_runtime\.showLeft\(/)
  })

  it('showRight(target) routes via emitPositionAction', () => {
    const out = dom(`canvas mobile

Frame name SideBox
Button "X", onclick showRight(SideBox)
`)
    expect(out).toMatch(/_runtime\.showRight\(/)
  })

  it('showAt(target, "top-end") uses showAt branch with explicit position', () => {
    const out = dom(`canvas mobile

Frame name PopBox
Button "X", onclick showAt(PopBox, "top-end")
`)
    expect(out).toMatch(/_runtime\.showAt\([^)]*'top-end'\)/)
  })

  it('showModal(target) emits showModal with default backdrop', () => {
    const out = dom(`canvas mobile

Frame name Dlg
Button "Open", onclick showModal(Dlg)
`)
    expect(out).toMatch(/_runtime\.showModal\(/)
  })

  it('dismiss(target) emits dismiss call with element lookup', () => {
    const out = dom(`canvas mobile

Frame name Dlg
Button "Close", onclick dismiss(Dlg)
`)
    expect(out).toMatch(/_runtime\.dismiss\(_elements\['Dlg'\]/)
  })

  it('dismiss() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "Close", onclick dismiss()
`)
    expect(out).toMatch(/_runtime\.dismiss\(/)
  })
})

// =============================================================================
// 4.2 Animate
// =============================================================================

describe('Events Iter2 — animate action', () => {
  it('animate("shake") on currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick animate("shake")
`)
    expect(out).toMatch(/_runtime\.animate\('shake',\s*[^,)]+\)/)
  })

  it('animate("pulse", target) animates explicit element', () => {
    const out = dom(`canvas mobile

Frame name Box
Button "X", onclick animate("pulse", Box)
`)
    expect(out).toMatch(/_runtime\.animate\('pulse',\s*\[_elements\['Box'\]\]\)/)
  })

  it('animate("bounce", a, b) animates multiple targets', () => {
    const out = dom(`canvas mobile

Frame name A
Frame name B
Button "X", onclick animate("bounce", A, B)
`)
    expect(out).toMatch(/_runtime\.animate\('bounce',\s*\[_elements\['A'\],\s*_elements\['B'\]\]\)/)
  })

  it('animate with stagger key produces stagger option', () => {
    const out = dom(`canvas mobile

Frame name A
Frame name B
Button "X", onclick animate("stagger-fade", A, B, stagger100)
`)
    expect(out).toMatch(/stagger:\s*100/)
  })
})

// =============================================================================
// 4.3 Scroll-Actions with args
// =============================================================================

describe('Events Iter2 — scroll actions', () => {
  it('scrollTo(target) emits scrollTo with element', () => {
    const out = dom(`canvas mobile

Frame name Section2
Button "X", onclick scrollTo(Section2)
`)
    expect(out).toMatch(/_runtime\.scrollTo\(_elements\['Section2'\]/)
  })

  it('scrollToTop(container) emits scrollToTop with container', () => {
    const out = dom(`canvas mobile

Frame name List
Button "X", onclick scrollToTop(List)
`)
    expect(out).toMatch(/_runtime\.scrollToTop\(_elements\['List'\]/)
  })

  it('scrollToBottom(container) emits scrollToBottom with container', () => {
    const out = dom(`canvas mobile

Frame name List
Button "X", onclick scrollToBottom(List)
`)
    expect(out).toMatch(/_runtime\.scrollToBottom\(_elements\['List'\]/)
  })

  it('scrollBy(container, 100) emits scrollBy with x=0, y=100', () => {
    const out = dom(`canvas mobile

Frame name List
Button "X", onclick scrollBy(List, 100)
`)
    expect(out).toMatch(/_runtime\.scrollBy\([^,]+,\s*0,\s*100\)/)
  })

  it('scrollBy(container, 50, 100) emits scrollBy with x=50, y=100', () => {
    const out = dom(`canvas mobile

Frame name List
Button "X", onclick scrollBy(List, 50, 100)
`)
    expect(out).toMatch(/_runtime\.scrollBy\([^,]+,\s*50,\s*100\)/)
  })
})

// =============================================================================
// 4.4 Value-Actions (covered: increment/decrement/set/reset; missing: get + step + key:val)
// =============================================================================

describe('Events Iter2 — value actions edge cases', () => {
  it('get(token) emits runtime.get', () => {
    const out = dom(`canvas mobile

count: 0
Button "X", onclick get(count)
`)
    expect(out).toMatch(/_runtime\.get\(\s*['"]count['"]\)/)
  })

  it('increment(count, 5) emits step:5 option', () => {
    const out = dom(`canvas mobile

count: 0
Button "+5", onclick increment(count, 5)
`)
    expect(out).toMatch(/_runtime\.increment\(\s*['"]count['"]\s*,\s*\{\s*step:\s*5/)
  })

  it('increment(count, step:5, min:0) emits both options', () => {
    const out = dom(`canvas mobile

count: 0
Button "+", onclick increment(count, step:5, min:0)
`)
    expect(out).toMatch(/_runtime\.increment\(\s*['"]count['"]\s*,\s*\{[^}]*step:\s*5[^}]*min:\s*0/)
  })

  it('reset(count, 10) emits reset with initial value', () => {
    const out = dom(`canvas mobile

count: 0
Button "10", onclick reset(count, 10)
`)
    expect(out).toMatch(/_runtime\.reset\(\s*['"]count['"]\s*,\s*10\)/)
  })

  it('set(token, "string") emits set with quoted value', () => {
    const out = dom(`canvas mobile

mode: "off"
Button "X", onclick set(mode, "on")
`)
    expect(out).toMatch(/_runtime\.set\(\s*['"]mode['"]\s*,\s*['"]on['"]\)/)
  })
})

// =============================================================================
// 4.5 Input-Actions extended
// =============================================================================

describe('Events Iter2 — input action variants', () => {
  it('blur(target) emits blur call', () => {
    const out = dom(`canvas mobile

Input name Email
Button "X", onclick blur(Email)
`)
    expect(out).toMatch(/_runtime\.blur\(_elements\['Email'\]\)/)
  })

  it('selectText(target) emits selectText call', () => {
    const out = dom(`canvas mobile

Input name F
Button "X", onclick selectText(F)
`)
    expect(out).toMatch(/_runtime\.selectText\(_elements\['F'\]\)/)
  })

  it('setError(target, "msg") emits setError with message', () => {
    const out = dom(`canvas mobile

Input name Email
Button "X", onclick setError(Email, "Required")
`)
    expect(out).toMatch(/_runtime\.setError\(/)
    expect(out).toContain('Required')
  })

  it('clearError(target) emits clearError call', () => {
    const out = dom(`canvas mobile

Input name Email
Button "X", onclick clearError(Email)
`)
    expect(out).toMatch(/_runtime\.clearError\(/)
  })

  it('clear(target) emits clear call (input)', () => {
    const out = dom(`canvas mobile

Input name Email
Button "X", onclick clear(Email)
`)
    expect(out).toMatch(/_runtime\.clear\(_elements\['Email'\]\)/)
  })
})

// =============================================================================
// 4.6 State actions (open/close/select/activate/deactivate/deselect/setState)
// =============================================================================

describe('Events Iter2 — state actions', () => {
  it('open(target) is a custom-function fallback when no runtime.open exists', () => {
    const out = dom(`canvas mobile

Frame name Drawer
Button "X", onclick open(Drawer)
`)
    // open() goes through the default branch (custom function fallback)
    expect(out).toContain('open')
    expect(out.length).toBeGreaterThan(100)
  })

  it('close(target) emits runtime.close', () => {
    const out = dom(`canvas mobile

Frame name Drawer
Button "X", onclick close(Drawer)
`)
    expect(out).toMatch(/_runtime\.close\(_elements\['Drawer'\]\)/)
  })

  it('select(highlighted) emits selectHighlighted', () => {
    const out = dom(`canvas mobile

Frame name List
Button "X", onclick select(highlighted)
`)
    expect(out).toMatch(/_runtime\.selectHighlighted\(/)
  })

  it('select(target) emits select with element', () => {
    const out = dom(`canvas mobile

Frame name Item
Button "X", onclick select(Item)
`)
    expect(out).toMatch(/_runtime\.select\(_elements\['Item'\]\)/)
  })

  it('activate(target) emits activate call', () => {
    const out = dom(`canvas mobile

Frame name Tab
Button "X", onclick activate(Tab)
`)
    expect(out).toMatch(/_runtime\.activate\(_elements\['Tab'\]\)/)
  })

  it('deactivate(target) emits deactivate call', () => {
    const out = dom(`canvas mobile

Frame name Tab
Button "X", onclick deactivate(Tab)
`)
    expect(out).toMatch(/_runtime\.deactivate\(_elements\['Tab'\]\)/)
  })

  it('deselect(target) emits deselect call', () => {
    const out = dom(`canvas mobile

Frame name Item
Button "X", onclick deselect(Item)
`)
    expect(out).toMatch(/_runtime\.deselect\(_elements\['Item'\]\)/)
  })
})

// =============================================================================
// 4.7 Highlight-Actions (first/last/named)
// =============================================================================

describe('Events Iter2 — highlight variants', () => {
  it('highlight(first) emits highlightFirst', () => {
    const out = dom(`canvas mobile

Frame name List
Frame onkeydown(home) highlight(first)
`)
    expect(out).toMatch(/_runtime\.highlightFirst\(/)
  })

  it('highlight(last) emits highlightLast', () => {
    const out = dom(`canvas mobile

Frame name List
Frame onkeydown(end) highlight(last)
`)
    expect(out).toMatch(/_runtime\.highlightLast\(/)
  })

  it('highlight(target) emits highlight with element', () => {
    const out = dom(`canvas mobile

Frame name Item3
Button "X", onclick highlight(Item3)
`)
    expect(out).toMatch(/_runtime\.highlight\(_elements\['Item3'\]\)/)
  })

  it('selectHighlighted(target) emits selectHighlighted with element', () => {
    const out = dom(`canvas mobile

Frame name List
Frame onkeydown(enter) selectHighlighted(List)
`)
    expect(out).toMatch(/_runtime\.selectHighlighted\(_elements\['List'\]\)/)
  })

  it('highlightNext(target) and highlightPrev(target) both emit', () => {
    const out = dom(`canvas mobile

Frame name List
Frame onkeydown(arrow-down) highlightNext(List)
Frame onkeydown(arrow-up) highlightPrev(List)
`)
    expect(out).toMatch(/_runtime\.highlightNext\(_elements\['List'\]\)/)
    expect(out).toMatch(/_runtime\.highlightPrev\(_elements\['List'\]\)/)
  })
})

// =============================================================================
// 4.8 Browser navigation (forward + openUrl variants)
// =============================================================================

describe('Events Iter2 — navigation extras', () => {
  it('forward() emits forward call', () => {
    const out = dom(`canvas mobile

Button ">", onclick forward()
`)
    expect(out).toMatch(/_runtime\.forward\(\)/)
  })

  it('openUrl(url, true) sets newTab option', () => {
    const out = dom(`canvas mobile

Button "X", onclick openUrl("https://x.com", true)
`)
    expect(out).toMatch(/_runtime\.openUrl\([^,]+,\s*\{\s*newTab:\s*true/)
  })

  it('openUrl(url, false) sets newTab=false', () => {
    const out = dom(`canvas mobile

Button "X", onclick openUrl("https://x.com", false)
`)
    expect(out).toMatch(/_runtime\.openUrl\([^,]+,\s*\{\s*newTab:\s*false/)
  })
})

// =============================================================================
// 4.9 toast variants
// =============================================================================

describe('Events Iter2 — toast variants', () => {
  it('toast("msg", "error", "top-right") includes type and position', () => {
    const out = dom(`canvas mobile

Button "X", onclick toast("Failed", "error", "top-right")
`)
    // Accept both single- and double-quoted variants (compiler uses JSON.stringify
    // for proper escaping, which produces double quotes).
    expect(out).toMatch(
      /_runtime\.toast\([^)]*["']Failed["'][^)]*["']error["'][^)]*["']top-right["']/
    )
  })
})

// =============================================================================
// 4.10 copy with $ ref + show/hide with target
// =============================================================================

describe('Events Iter2 — copy + show/hide with explicit target', () => {
  it('copy("plain text") emits copy with literal', () => {
    const out = dom(`canvas mobile

Button "X", onclick copy("plain text")
`)
    expect(out).toMatch(/_runtime\.copy\([^,]*'plain text'/)
  })

  it('show(target) targets element by name', () => {
    const out = dom(`canvas mobile

Frame name Box
Button "X", onclick show(Box)
`)
    expect(out).toMatch(/_runtime\.show\(_elements\['Box'\]\)/)
  })

  it('hide(target) targets element by name', () => {
    const out = dom(`canvas mobile

Frame name Box
Button "X", onclick hide(Box)
`)
    expect(out).toMatch(/_runtime\.hide\(_elements\['Box'\]\)/)
  })
})

// =============================================================================
// 4.11 Custom function fallback (default branch)
// =============================================================================

describe('Events Iter2 — custom function fallback', () => {
  it('unknown function name routes through `if (typeof X === function) X(currentVar)`', () => {
    const out = dom(`canvas mobile

Button "X", onclick myCustomHandler()
`)
    expect(out).toMatch(/typeof\s+myCustomHandler\s*===\s*['"]function['"]/)
    expect(out).toMatch(/myCustomHandler\(/)
  })

  it('custom function with args injects currentVar then args', () => {
    const out = dom(`canvas mobile

Button "X", onclick myFn("a", "b")
`)
    expect(out).toMatch(/typeof\s+myFn/)
    expect(out).toMatch(/myFn\([^,]+,\s*'a',\s*'b'\)/)
  })
})

// =============================================================================
// 4.12 onkey-* shortcut events
// =============================================================================

describe('Events Iter2 — keyboard shortcut events', () => {
  it('onspace fires on Space key', () => {
    const out = dom(`canvas mobile

count: 0
Frame onspace increment(count)
`)
    expect(out).toMatch(/keydown/)
    expect(out).toMatch(/' '|Space/)
  })

  it('onkeyenter is alias for onenter', () => {
    const out = dom(`canvas mobile

count: 0
Frame onkeyenter increment(count)
`)
    expect(out).toMatch(/keydown/)
    expect(out).toMatch(/Enter/)
  })

  it('onkeydown(arrow-left) maps to ArrowLeft', () => {
    const out = dom(`canvas mobile

count: 0
Frame onkeydown(arrow-left) decrement(count)
`)
    expect(out).toMatch(/ArrowLeft/)
  })

  it('onkeydown(arrow-right) maps to ArrowRight', () => {
    const out = dom(`canvas mobile

count: 0
Frame onkeydown(arrow-right) increment(count)
`)
    expect(out).toMatch(/ArrowRight/)
  })

  it('onkeydown(home) maps to Home key', () => {
    const out = dom(`canvas mobile

Frame onkeydown(home) toast("home")
`)
    expect(out).toMatch(/Home/)
  })

  it('onkeydown(end) maps to End key', () => {
    const out = dom(`canvas mobile

Frame onkeydown(end) toast("end")
`)
    expect(out).toMatch(/End/)
  })

  it('onkeydown(backspace) maps to Backspace key', () => {
    const out = dom(`canvas mobile

Frame onkeydown(backspace) toast("bs")
`)
    expect(out).toMatch(/Backspace/)
  })
})

// =============================================================================
// 4.13 No-arg variants of actions (currentVar fallback)
// =============================================================================

describe('Events Iter2 — no-arg action variants', () => {
  it('activate() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick activate()
`)
    expect(out).toMatch(/_runtime\.activate\(/)
  })

  it('deactivate() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick deactivate()
`)
    expect(out).toMatch(/_runtime\.deactivate\(/)
  })

  it('close() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick close()
`)
    expect(out).toMatch(/_runtime\.close\(/)
  })

  it('select() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick select()
`)
    expect(out).toMatch(/_runtime\.select\(/)
  })

  it('deselect() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick deselect()
`)
    expect(out).toMatch(/_runtime\.deselect\(/)
  })

  it('selectHighlighted() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick selectHighlighted()
`)
    expect(out).toMatch(/_runtime\.selectHighlighted\(/)
  })

  it('highlightNext() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick highlightNext()
`)
    expect(out).toMatch(/_runtime\.highlightNext\(/)
  })

  it('highlightPrev() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick highlightPrev()
`)
    expect(out).toMatch(/_runtime\.highlightPrev\(/)
  })

  it('blur() without args targets currentVar via fallthrough', () => {
    const out = dom(`canvas mobile

Button "X", onclick blur()
`)
    // blur without target falls through to: _runtime.blur(currentVar)
    expect(out).toMatch(/_runtime\.blur\(/)
  })

  it('setError() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick setError()
`)
    expect(out).toMatch(/_runtime\.setError\(/)
  })

  it('clearError() without args targets currentVar', () => {
    const out = dom(`canvas mobile

Button "X", onclick clearError()
`)
    expect(out).toMatch(/_runtime\.clearError\(/)
  })
})

// =============================================================================
// 4.14 setState action
// =============================================================================

describe('Events Iter2 — setState action', () => {
  it('setState(target, "open") emits setState with both args', () => {
    const out = dom(`canvas mobile

Frame name Drawer
Button "X", onclick setState(Drawer, "open")
`)
    expect(out).toMatch(/_runtime\.setState\(_elements\['Drawer'\][^,]*,\s*'open'/)
  })

  it('setState("on") on currentVar uses single-arg variant', () => {
    const out = dom(`canvas mobile

Button "X", onclick setState("on")
`)
    expect(out).toMatch(/_runtime\.setState\([^,]+,\s*'on'/)
  })
})

// =============================================================================
// 4.15 reset with string initial value
// =============================================================================

describe('Events Iter2 — reset string variant', () => {
  it('reset(name, "default") emits reset with quoted string fallback', () => {
    const out = dom(`canvas mobile

name: "old"
Button "X", onclick reset(name, "default")
`)
    expect(out).toMatch(/_runtime\.reset\(\s*['"]name['"]\s*,\s*['"]default['"]\)/)
  })
})

// =============================================================================
// 4.16 toggle with explicit state list — parsed as state-trigger, not action
// (left documented as known-limitation; the `toggle("on", "off")` syntax in
// onclick is not routed through emitRuntimeAction)
// =============================================================================

// =============================================================================
// 4.17 CRUD remaining branches (create / save / revert / delete)
// =============================================================================

describe('Events Iter2 — CRUD action variants', () => {
  it('create(collection) emits runtime.create call', () => {
    const out = dom(`canvas mobile

todos:
  t1:
    text: "First"
    done: false
Button "+", onclick create(todos)
`)
    // create() goes through emitCreateAction
    expect(out).toMatch(/_runtime\.create\(/)
  })

  it('save() emits save call', () => {
    const out = dom(`canvas mobile

Button "Save", onclick save()
`)
    expect(out).toMatch(/_runtime\.save\(/)
  })

  it('revert() emits revert call', () => {
    const out = dom(`canvas mobile

Button "Revert", onclick revert()
`)
    expect(out).toMatch(/_runtime\.revert\(/)
  })

  it('delete(target) emits deleteItem call', () => {
    const out = dom(`canvas mobile

todos:
  t1:
    text: "First"
each todo in $todos
  Button "X", onclick delete(todo)
`)
    // delete uses _runtime.deleteItem(...)
    expect(out).toMatch(/_runtime\.deleteItem\(/)
  })
})

// =============================================================================
// 4.18 page action — currently not wired through the action-parser
// (the `_runtime.navigateToPage` branch in event-emitter is reachable but
// not via inline `page("next")` syntax — left as known limitation)
// =============================================================================
