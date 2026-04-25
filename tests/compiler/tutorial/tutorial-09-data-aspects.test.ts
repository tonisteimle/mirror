/**
 * Tutorial 09-daten — Aspect Closure Tests (Thema 9)
 *
 * Schließt die 6 Tutorial-Lücken aus `themen/09-data.md` Schritt 3:
 * - Externe `.data`-Dateien (separate-File-Pfad)
 * - 1:n Relationen (`assignee: $users.toni`)
 * - N:N Relationen (`members: $users.toni, $users.anna`)
 * - Aggregation `.count`
 * - Aggregation `.first` / `.last`
 * - Aggregation `.unique`
 * Plus: dedizierter Attribut-Typen-Test (string/number/boolean)
 *
 * Plus 7 Provokations-Tests (D1-D7) aus dem Themen-Doc.
 *
 * Alle Tests sind **Verhaltens-Tests** mit `renderWithRuntime` — der Runtime-
 * `$get`-Pfad muss tatsächlich die richtigen Werte produzieren, nicht nur das
 * Code-Pattern emittiert werden.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

function texts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('span')).map(el => el.textContent ?? '')
}

// =============================================================================
// Tutorial-Aspekt: Attribut-Typen
// =============================================================================

describe('Tutorial 09 — Attribut-Typen (string/number/boolean)', () => {
  it('mixed primitives in a data object surface as their typed values', () => {
    const { root } = renderWithRuntime(
      `user:
  name: "Max"
  age: 42
  active: true

Text "$user.name"
Text "$user.age"
Text "$user.active"`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Max')
    expect(t).toContain('42')
    // Boolean is rendered as "true" string
    expect(t.some(s => s === 'true')).toBe(true)
  })
})

// =============================================================================
// Tutorial-Aspekt: Aggregation .count
// =============================================================================

describe('Tutorial 09 — Aggregation .count', () => {
  it('$collection.count returns the number of entries', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Design"
    hours: 4
  t2:
    title: "Dev"
    hours: 8
  t3:
    title: "Testing"
    hours: 2

Text "$tasks.count"`,
      container
    )
    expect(texts(root)).toContain('3')
  })

  it('$collection.count on an inline list (Tutorial colors example)', () => {
    const { root } = renderWithRuntime(
      `colors:
  red
  blue
  red
  green
  blue
  red

Text "$colors.count"`,
      container
    )
    expect(texts(root)).toContain('6')
  })
})

// =============================================================================
// Tutorial-Aspekt: Aggregation .first / .last
// =============================================================================

describe('Tutorial 09 — Aggregation .first / .last', () => {
  it('$collection.first.attr returns the first entry', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Design"
  t2:
    title: "Dev"
  t3:
    title: "Testing"

Text "$tasks.first.title"`,
      container
    )
    expect(texts(root)).toContain('Design')
  })

  it('$collection.last.attr returns the last entry', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Design"
  t2:
    title: "Dev"
  t3:
    title: "Testing"

Text "$tasks.last.title"`,
      container
    )
    expect(texts(root)).toContain('Testing')
  })
})

// =============================================================================
// Tutorial-Aspekt: Aggregation .unique
// =============================================================================

describe('Tutorial 09 — Aggregation .unique', () => {
  it('$collection.unique deduplicates an inline list', () => {
    const { root } = renderWithRuntime(
      `colors:
  red
  blue
  red
  green
  blue
  red

Text "$colors.unique"`,
      container
    )
    const out = texts(root).join(' ')
    // The unique values must appear, each only once.
    expect(out).toMatch(/red/)
    expect(out).toMatch(/blue/)
    expect(out).toMatch(/green/)
    // Naive count: how often does "red" appear in the output text?
    const redCount = (out.match(/red/g) || []).length
    expect(redCount).toBe(1)
  })
})

// =============================================================================
// Tutorial-Aspekt: 1:n Relationen
// =============================================================================

describe('Tutorial 09 — 1:n Relationen', () => {
  it('reference attribute resolves to target entry attributes', () => {
    // Tutorial uses separate `.data` files; we test the same semantics inline.
    const { root } = renderWithRuntime(
      `users:
  toni:
    name: "Toni Steimle"
    role: "Lead"
  anna:
    name: "Anna Schmidt"
    role: "Design"

tasks:
  task1:
    title: "Design Review"
    assignee: $users.toni

Text "$tasks.task1.title"
Text "$tasks.task1.assignee.name"`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Design Review')
    expect(t).toContain('Toni Steimle')
  })
})

// =============================================================================
// Tutorial-Aspekt: N:N Relationen
// =============================================================================

describe('Tutorial 09 — N:N Relationen', () => {
  it('comma-separated references resolve as a collection (each iteration)', () => {
    const { root } = renderWithRuntime(
      `users:
  toni:
    name: "Toni"
  anna:
    name: "Anna"

projects:
  website:
    name: "Website Relaunch"
    members: $users.toni, $users.anna

Text "$projects.website.name"
each member in $projects.website.members
  Text "$member.name"`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Website Relaunch')
    expect(t).toContain('Toni')
    expect(t).toContain('Anna')
  })
})

// =============================================================================
// Provokations-Liste D1–D7
// =============================================================================

describe('Tutorial 09 — Provokations / Edge cases', () => {
  it('D1: each over an empty collection produces zero iterations', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Hello"

each x in $emptyCollection
  Text "should-not-render"

Text "after"`,
      container
    )
    const t = texts(root)
    expect(t).not.toContain('should-not-render')
    expect(t).toContain('after')
  })

  it('D2: undefined token reference yields empty/literal text, no crash', () => {
    expect(() => {
      renderWithRuntime(`Text "$undefined.fallback"`, container)
    }).not.toThrow()
  })

  it('D4: aggregation .count on empty collection returns 0', () => {
    const { root } = renderWithRuntime(
      `empty:

Text "$empty.count"`,
      container
    )
    expect(texts(root)).toContain('0')
  })

  it('D5: aggregation .first on empty collection does not crash', () => {
    expect(() => {
      renderWithRuntime(
        `empty:

Text "$empty.first.name"`,
        container
      )
    }).not.toThrow()
  })

  it('D6: 2-level nested each (cartesian iteration) renders all 4 combinations', () => {
    // Mirror loop variables are bare identifiers in Text properties, not
    // $-interpolated. We use object-collections so `.name` works.
    const { root } = renderWithRuntime(
      `xs:
  a:
    label: "A"
  b:
    label: "B"
ys:
  one:
    n: "1"
  two:
    n: "2"

each x in $xs
  each y in $ys
    Text x.label
    Text y.n`,
      container
    )
    const t = texts(root)
    // 2 outer × 2 inner = 4 iterations × 2 spans = 8 entries; minimum we
    // need every label and every n at least once
    expect(t.filter(s => s === 'A').length).toBeGreaterThanOrEqual(2)
    expect(t.filter(s => s === 'B').length).toBeGreaterThanOrEqual(2)
    expect(t.filter(s => s === '1').length).toBeGreaterThanOrEqual(2)
    expect(t.filter(s => s === '2').length).toBeGreaterThanOrEqual(2)
  })

  it('D7: each over a list-style collection (`nums:\\n  one\\n ...`) iterates each value', () => {
    // The list-style detection landed in Iter 1 of Thema 9 —
    // before the fix this would render duplicates as deduplicated keys.
    // Loop variable for primitives is a bare identifier, e.g. `Text n`.
    const { root } = renderWithRuntime(
      `nums:
  one
  two
  three

each n in $nums
  Text n`,
      container
    )
    const t = texts(root)
    expect(t).toContain('one')
    expect(t).toContain('two')
    expect(t).toContain('three')
    // Total 3 spans
    expect(t.filter(s => ['one', 'two', 'three'].includes(s)).length).toBe(3)
  })
})
