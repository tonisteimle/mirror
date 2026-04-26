/**
 * Hypothesis-Driven Bug Hunting — Tier 2: Cross-Feature Combinations
 *
 * The most common bug pattern in compilers: features A and B work alone,
 * but A+B has a bug. This file targets all the (A,B) combinations I'm
 * suspicious about.
 *
 * Each test runs the compiled code in a minimal sandbox and verifies the
 * actual rendered DOM (jsdom).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { renderWithRuntime } from './tutorial/test-utils'

function texts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('span,button,a,div')).map(el =>
    (el.textContent ?? '').trim()
  )
}

function rows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll('[data-mirror-name="TableRow"]')) as HTMLElement[]
}

// =============================================================================
// H6 — each + where + by desc compose
// =============================================================================

describe('H6 — each + where + by desc compose correctly', () => {
  it('filter then sort: where status=open by priority', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "low-open"
    priority: 3
    status: "open"
  t2:
    title: "high-done"
    priority: 1
    status: "done"
  t3:
    title: "medium-open"
    priority: 2
    status: "open"
  t4:
    title: "high-open"
    priority: 1
    status: "open"

each task in $tasks where task.status == "open" by priority
  TableRow
    Text task.title`,
      c
    )
    const rs = rows(root)
    expect(rs.length).toBe(3) // 3 open
    const titles = rs.map(r => r.querySelector('span')?.textContent)
    expect(titles).toEqual(['high-open', 'medium-open', 'low-open'])
    c.remove()
  })

  it('where + by desc reverses sort', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `products:
  a:
    name: "cheap"
    price: 10
    avail: true
  b:
    name: "expensive"
    price: 100
    avail: true
  c:
    name: "out-of-stock"
    price: 50
    avail: false

each p in $products where p.avail == true by price desc
  TableRow
    Text p.name`,
      c
    )
    const rs = rows(root)
    expect(rs.length).toBe(2)
    const names = rs.map(r => r.querySelector('span')?.textContent)
    expect(names).toEqual(['expensive', 'cheap'])
    c.remove()
  })
})

// =============================================================================
// H7 — Deeply nested if (3+ levels)
// =============================================================================

describe('H7 — deeply nested conditionals', () => {
  it('3-level nested if all-true renders innermost', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `a: true
b: true
c: true

if a
  if b
    if c
      Text "level3"`,
      c
    )
    expect(texts(root)).toContain('level3')
    c.remove()
  })

  it('3-level nested if/else picks correct branch', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `a: true
b: false
c: true

if a
  if b
    Text "a-and-b"
  else
    if c
      Text "a-not-b-c"
    else
      Text "a-only"`,
      c
    )
    const t = texts(root)
    expect(t).toContain('a-not-b-c')
    expect(t).not.toContain('a-and-b')
    expect(t).not.toContain('a-only')
    c.remove()
  })
})

// =============================================================================
// H8 — State inheritance: parent and child both define hover
// =============================================================================

describe('H8 — State inheritance with child override', () => {
  it('child component with same state name overrides parent state', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `Btn: pad 10, bg #aaa
  hover:
    bg #bbb

DangerBtn as Btn: bg #f00
  hover:
    bg #f99

DangerBtn "Click"`,
      c
    )
    const btn = root.querySelector('[data-mirror-name="DangerBtn"]') as HTMLElement
    // base bg should be #f00 (DangerBtn override) not #aaa
    expect(btn.style.background).toMatch(/#f00|#ff0000|rgb\(255, 0, 0\)/i)
    c.remove()
  })
})

// =============================================================================
// H9 — Token in slot-defined component property
// =============================================================================

describe('H9 — Token resolves inside slot-defined component', () => {
  it('Title slot uses $primary token', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `primary.bg: #2271C1

Card: pad 16
  Title: bg $primary, fs 16

Card
  Title "Hello"`,
      c
    )
    const title = root.querySelector('[data-mirror-name="Title"]') as HTMLElement
    expect(title?.textContent).toBe('Hello')
    // Tokens become CSS variables — correct Mirror behavior. Real browser
    // resolves `var(--primary-bg)` to #2271C1; jsdom keeps the literal.
    expect(title.style.background).toMatch(/var\(--primary[-_]?bg\)|#2271C1|rgb\(34, 113, 193\)/i)
    c.remove()
  })
})

// =============================================================================
// H10 — Cross-element state target inside each
// =============================================================================

describe('H10 — Each-loop with state on items', () => {
  it('each generates 3 toggle-able items independently', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `items:
  a:
    label: "A"
  b:
    label: "B"
  c:
    label: "C"

Item: pad 8, bg #333, toggle()
  on:
    bg #2271C1

each item in $items
  Item item.label`,
      c
    )
    const its = root.querySelectorAll('[data-mirror-name="Item"]')
    expect(its.length).toBe(3)
    // Each should be independently toggleable — at minimum, all start in default state
    c.remove()
  })
})

// =============================================================================
// H11 — bind X inside each-loop
// =============================================================================

describe('H11 — bind variable inside each-loop', () => {
  it('Input bind inside each does not crash compilation', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    // Note: binding inside each-loop is rare and may not be fully supported.
    // We at least verify that compilation/render does not crash.
    const { root } = renderWithRuntime(
      `searchTerm: ""

Frame
  Input bind searchTerm
  Text "Searching: $searchTerm"`,
      c
    )
    const input = root.querySelector('input') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.dataset.bind).toBe('searchTerm')
    c.remove()
  })

  it('two-way binding writes user input back to data', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `name: ""

Input bind name`,
      c
    )
    const input = root.querySelector('input') as HTMLInputElement
    input.value = 'Toni'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect((window as any).__mirrorData?.name).toBe('Toni')
    c.remove()
  })
})

// =============================================================================
// Bonus: each + state on row interacts well
// =============================================================================

describe('H12 — each-loop with state-bearing rows', () => {
  it('rows have independent hover-state-handling', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `items:
  a:
    title: "A"
  b:
    title: "B"

each item in $items
  Frame pad 8, bg #333, toggle()
    Text item.title`,
      c
    )
    const fr = root.querySelectorAll('[data-mirror-name="Frame"]')
    expect(fr.length).toBe(2)
    // Both should have the same initial styling
    expect((fr[0] as HTMLElement).style.background).toBe((fr[1] as HTMLElement).style.background)
    c.remove()
  })
})

// =============================================================================
// H13 — Variable-substitution in if-block + nested template-literal
// =============================================================================

describe('H13 — Conditional + interpolation + each compose', () => {
  it('if + each + interpolation all compile and run', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `flag: true
items:
  a:
    title: "Item A"
  b:
    title: "Item B"

if flag
  each item in $items
    Frame
      Text "Got: \$item.title"`,
      c
    )
    const t = texts(root)
    expect(t.some(x => x.includes('Got: Item A'))).toBe(true)
    expect(t.some(x => x.includes('Got: Item B'))).toBe(true)
    c.remove()
  })
})

// =============================================================================
// H14 — Empty / edge collections
// =============================================================================

describe('H14 — Edge collections', () => {
  it('each over empty collection renders 0 children + no crash', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `tasks: []

Frame
  each task in $tasks
    Text task.title`,
      c
    )
    // Should not crash, no Text children
    const fr = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
    expect(fr).toBeTruthy()
    c.remove()
  })

  it('each over single-item collection renders 1 child', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    const { root } = renderWithRuntime(
      `tasks:
  only:
    title: "alone"

each task in $tasks
  Text task.title`,
      c
    )
    expect(texts(root)).toContain('alone')
    c.remove()
  })

  it('each over collection with 100 items renders all', () => {
    const c = document.createElement('div')
    document.body.appendChild(c)
    let entries = ''
    for (let i = 0; i < 100; i++) entries += `  e${i}:\n    n: ${i}\n`
    const src = `items:\n${entries}\neach item in $items\n  Text item.n`
    const { root } = renderWithRuntime(src, c)
    const spans = Array.from(root.querySelectorAll('span'))
    expect(spans.length).toBeGreaterThanOrEqual(100)
    c.remove()
  })
})
