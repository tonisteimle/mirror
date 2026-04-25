/**
 * Tutorial 09-daten Conditionals — Aspect Closure (Thema 10)
 *
 * Tutorial-Aspekte aus dem Conditionals-Subset von `09-daten.html`:
 * - if (block, single condition)
 * - if/else
 * - Logische Operatoren (&&, ||, and, or)
 * - Vergleiche (==, !=, >, <)
 * - Negation (! / not)
 * - Verschachtelte Bedingungen
 * - if mit each kombiniert
 * - Inline Ternary (`expr ? a : b`)
 * - Praxis: Empty / Loading / User-Status
 *
 * Verhaltens-Tests mit `renderWithRuntime`.
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
// if (block, single condition)
// =============================================================================

describe('Tutorial 09 Conditionals — if (single condition)', () => {
  it('if true → renders the then-branch', () => {
    const { root } = renderWithRuntime(
      `loggedIn: true

if loggedIn
  Text "Willkommen"
`,
      container
    )
    expect(texts(root)).toContain('Willkommen')
  })

  it('if false → does NOT render the then-branch', () => {
    const { root } = renderWithRuntime(
      `loggedIn: false

if loggedIn
  Text "Willkommen"

Text "after"`,
      container
    )
    const t = texts(root)
    expect(t).not.toContain('Willkommen')
    expect(t).toContain('after')
  })
})

// =============================================================================
// if / else
// =============================================================================

describe('Tutorial 09 Conditionals — if / else', () => {
  it('if false → renders the else-branch', () => {
    const { root } = renderWithRuntime(
      `loggedIn: false

if loggedIn
  Text "Drinnen"
else
  Text "Draußen"`,
      container
    )
    const t = texts(root)
    expect(t).not.toContain('Drinnen')
    expect(t).toContain('Draußen')
  })
})

// =============================================================================
// Logische Operatoren
// =============================================================================

describe('Tutorial 09 Conditionals — Logische Operatoren (&&)', () => {
  it('AND: both true → render', () => {
    const { root } = renderWithRuntime(
      `isAdmin: true
hasPermission: true

if isAdmin && hasPermission
  Text "OK"`,
      container
    )
    expect(texts(root)).toContain('OK')
  })

  it('AND: one false → do not render', () => {
    const { root } = renderWithRuntime(
      `isAdmin: true
hasPermission: false

if isAdmin && hasPermission
  Text "OK"

Text "after"`,
      container
    )
    expect(texts(root)).not.toContain('OK')
    expect(texts(root)).toContain('after')
  })
})

describe('Tutorial 09 Conditionals — Logische Operatoren (||)', () => {
  it('OR: one true → render', () => {
    const { root } = renderWithRuntime(
      `a: true
b: false

if a || b
  Text "OR-OK"`,
      container
    )
    expect(texts(root)).toContain('OR-OK')
  })
})

// =============================================================================
// Vergleiche
// =============================================================================

describe('Tutorial 09 Conditionals — Vergleiche', () => {
  it('count > 0 → renders inner block (without $-interpolation, see todo)', () => {
    const { root } = renderWithRuntime(
      `count: 5

if count > 0
  Text "Has count"`,
      container
    )
    expect(texts(root)).toContain('Has count')
  })

  it('userPlan == "Pro" → render', () => {
    const { root } = renderWithRuntime(
      `userPlan: "Pro"

if userPlan == "Pro"
  Text "Premium"`,
      container
    )
    expect(texts(root)).toContain('Premium')
  })

  it('count != 0 → render', () => {
    const { root } = renderWithRuntime(
      `count: 5

if count != 0
  Text "Has items"`,
      container
    )
    expect(texts(root)).toContain('Has items')
  })

  it('Variable-Substitution inside if-block-Text-Property (fixed 2026-04-25)', () => {
    const { root } = renderWithRuntime(
      `count: 5

if count > 0
  Text "$count Punkte"`,
      container
    )
    expect(texts(root)).toContain('5 Punkte')
  })
})

// =============================================================================
// Inline Ternary
// =============================================================================

describe('Tutorial 09 Conditionals — Inline Ternary', () => {
  it('Text done ? "Ja" : "Nein" — true branch', () => {
    const { root } = renderWithRuntime(
      `done: true

Text done ? "Ja" : "Nein"`,
      container
    )
    expect(texts(root)).toContain('Ja')
  })

  it('Text done ? "Ja" : "Nein" — false branch', () => {
    const { root } = renderWithRuntime(
      `done: false

Text done ? "Ja" : "Nein"`,
      container
    )
    expect(texts(root)).toContain('Nein')
  })

  it('color attribute via ternary applies correct value', () => {
    const { root } = renderWithRuntime(
      `active: true

Frame bg active ? #2271C1 : #333, w 100, h 50, name Box`,
      container
    )
    const box = root.querySelector('[data-mirror-name="Box"]') as HTMLElement
    expect(box?.style.background).toMatch(/#2271c1|rgb\(34/i)
  })
})

// =============================================================================
// if mit each kombiniert
// =============================================================================

describe('Tutorial 09 Conditionals — if mit each', () => {
  it('if $task.done inside each task in $tasks filters items correctly (fixed 2026-04-25)', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Erledigt"
    done: true
  t2:
    title: "Offen"
    done: false
  t3:
    title: "Auch erledigt"
    done: true

each task in $tasks
  if $task.done
    Text task.title`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Erledigt')
    expect(t).toContain('Auch erledigt')
    expect(t).not.toContain('Offen')
  })

  it('plain each over a collection works (no if filter)', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Erledigt"
  t2:
    title: "Offen"
  t3:
    title: "Auch erledigt"

each task in $tasks
  Text task.title`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Erledigt')
    expect(t).toContain('Offen')
    expect(t).toContain('Auch erledigt')
  })
})

// =============================================================================
// Verschachtelte Bedingungen
// =============================================================================

describe('Tutorial 09 Conditionals — Verschachtelte if', () => {
  it('outer if + inner if both true → render inner', () => {
    const { root } = renderWithRuntime(
      `loggedIn: true
isAdmin: true

if loggedIn
  Text "Hello"
  if isAdmin
    Text "Admin"`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Hello')
    expect(t).toContain('Admin')
  })

  it('outer if + inner if (one false) → only outer renders', () => {
    const { root } = renderWithRuntime(
      `loggedIn: true
isAdmin: false

if loggedIn
  Text "Hello"
  if isAdmin
    Text "Admin"`,
      container
    )
    const t = texts(root)
    expect(t).toContain('Hello')
    expect(t).not.toContain('Admin')
  })
})

// =============================================================================
// Praxis: Empty State / Loading / User-Status
// =============================================================================

describe('Tutorial 09 Conditionals — Praxis-Patterns', () => {
  it('Empty State pattern: hasItems=false → empty UI', () => {
    const { root } = renderWithRuntime(
      `hasItems: false

if hasItems
  Text "Inhalt"
else
  Text "Keine Einträge"`,
      container
    )
    expect(texts(root)).toContain('Keine Einträge')
  })

  it('Loading pattern: loading=true → spinner UI', () => {
    const { root } = renderWithRuntime(
      `loading: true
data: "Done"

if loading
  Text "Lädt..."
else
  Text "$data"`,
      container
    )
    expect(texts(root)).toContain('Lädt...')
  })

  it('User-Status pattern: simple text branches (without $-interpolation in if)', () => {
    // Variable-Interpolation inside if-block doesn't work today (see todo above).
    const { root } = renderWithRuntime(
      `loggedIn: true

if loggedIn
  Text "Hi"
else
  Text "Anmelden"`,
      container
    )
    expect(texts(root)).toContain('Hi')
  })
})
