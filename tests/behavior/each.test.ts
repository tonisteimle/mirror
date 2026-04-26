/**
 * Each-Loop — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft die observable Semantik des Each-Loop-Features:
 *  - Basic, with-index, inline-array, over-object
 *  - where (filter), by (orderBy), desc, kombiniert
 *  - Nested, mit innerem Conditional, mit `bind`
 *  - Bug-Regressions: #17 (parallel), #19 (loopVar), #20 (token-ref)
 *
 * Sub-Features E1-E13 aus docs/concepts/feature-test-execution-plan.md.
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

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('Each-Loop — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  // ---------------------------------------------------------------------------
  // E1-E4: Basic forms
  // ---------------------------------------------------------------------------

  describe('E1: basic each over object-collection', () => {
    it('renders one Text per entry, in source order', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Design"\n  t2:\n    title: "Develop"\n  t3:\n    title: "Test"\n\neach task in $tasks\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Design', 'Develop', 'Test'])
    })

    it('empty collection renders 0 entries', () => {
      const root = render(`tasks:\n\neach task in $tasks\n  Text "$task.title"`, container)
      expect(allByName(root, 'Text')).toHaveLength(0)
    })
  })

  describe('E2: each with index variable (Bug #27 — pinned)', () => {
    it('PIN Bug #27: `$idx` is not substituted, renders literal text', () => {
      const root = render(
        `items:\n  a:\n    label: "First"\n  b:\n    label: "Second"\n\neach item, idx in $items\n  Text "$idx: $item.label"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      // Currently: "$idx: First" (idx not substituted), should be "0: First"
      expect(texts[0]).toBe('$idx: First')
      expect(texts[1]).toBe('$idx: Second')
    })
  })

  describe('E3: each over inline array', () => {
    it('iterates literal array values', () => {
      const root = render(`each x in [1, 2, 3]\n  Text "$x"`, container)
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['1', '2', '3'])
    })
  })

  describe('E4: each over object — entries', () => {
    it('renders one element per object-key', () => {
      const root = render(
        `users:\n  max:\n    name: "Max"\n  anna:\n    name: "Anna"\n\neach user in $users\n  Text "$user.name"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Max', 'Anna'])
    })
  })

  // ---------------------------------------------------------------------------
  // E5-E8: Filter + OrderBy
  // ---------------------------------------------------------------------------

  describe('E5: where filter', () => {
    it('renders only entries matching the filter', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Done"\n    done: true\n  t2:\n    title: "Open"\n    done: false\n  t3:\n    title: "Done2"\n    done: true\n\neach task in $tasks where task.done\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Done', 'Done2'])
    })

    it('all-false filter renders nothing', () => {
      const root = render(
        `items:\n  a:\n    keep: false\n  b:\n    keep: false\n\neach x in $items where x.keep\n  Text "shown"`,
        container
      )
      expect(allByName(root, 'Text')).toHaveLength(0)
    })
  })

  describe('E6: by orderBy (ascending default)', () => {
    it('sorts entries by the named field ascending', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "B"\n    priority: 2\n  t2:\n    title: "A"\n    priority: 1\n  t3:\n    title: "C"\n    priority: 3\n\neach task in $tasks by priority\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['A', 'B', 'C'])
    })
  })

  describe('E7: by orderBy desc', () => {
    it('sorts entries descending', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "B"\n    priority: 2\n  t2:\n    title: "A"\n    priority: 1\n  t3:\n    title: "C"\n    priority: 3\n\neach task in $tasks by priority desc\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['C', 'B', 'A'])
    })
  })

  describe('E8: filter + orderBy combined', () => {
    it('applies filter first, then sort', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Important done"\n    done: true\n    priority: 1\n  t2:\n    title: "Open"\n    done: false\n    priority: 2\n  t3:\n    title: "Lower done"\n    done: true\n    priority: 3\n\neach task in $tasks where task.done by priority\n  Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Important done', 'Lower done'])
    })
  })

  // ---------------------------------------------------------------------------
  // E9: Nested
  // ---------------------------------------------------------------------------

  describe('E9: nested each', () => {
    it('renders inner items per outer entry', () => {
      const root = render(
        `categories:\n  food:\n    name: "Food"\n    items:\n      a:\n        label: "Pizza"\n      b:\n        label: "Pasta"\n  drinks:\n    name: "Drinks"\n    items:\n      c:\n        label: "Water"\n\neach cat in $categories\n  Frame\n    Text "$cat.name"\n    each item in cat.items\n      Text "$item.label"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toEqual(['Food', 'Pizza', 'Pasta', 'Drinks', 'Water'])
    })
  })

  // ---------------------------------------------------------------------------
  // E10: Inner conditional (Bug #28 — pinned)
  // ---------------------------------------------------------------------------

  describe('E10: each with inner if/else (Bug #28 pinned)', () => {
    // Bug #28: in `each` with inner `if/else`, BOTH then- and else-branches
    // render when the condition is true. Should render only the then-branch.
    it('PIN Bug #28: if/else inside each renders both branches for truthy', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Active"\n    done: true\n\neach task in $tasks\n  Frame\n    Text "$task.title"\n    if task.done\n      Text "✓"\n    else\n      Text "○"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      // Currently rendering: ['Active', '✓', '○'] — both then AND else visible.
      expect(texts).toContain('✓')
      expect(texts).toContain('○') // bug — should NOT be present
    })

    it('falsy → only else-branch (works correctly)', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Pending"\n    done: false\n\neach task in $tasks\n  Frame\n    Text "$task.title"\n    if task.done\n      Text "✓"\n    else\n      Text "○"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(texts).toContain('○')
      expect(texts).not.toContain('✓')
    })
  })

  // ---------------------------------------------------------------------------
  // E11: bind on item-property
  // ---------------------------------------------------------------------------

  describe('E11: each-item with `bind` on property', () => {
    it('renders one Input per entry', () => {
      const root = render(
        `items:\n  a:\n    label: "First"\n    value: "x"\n  b:\n    label: "Second"\n    value: "y"\n\neach item in $items\n  Frame\n    Text "$item.label"\n    Input bind item.value`,
        container
      )
      const inputs = allByName(root, 'Input')
      expect(inputs.length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // E12: Bug #17 regression — parallel each over same collection
  // ---------------------------------------------------------------------------

  describe('E12: Bug #17 regression — two parallel `each` over same collection', () => {
    it('both loops render all entries (no const-redeclaration crash)', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "Alpha"\n  t2:\n    title: "Beta"\n\nFrame\n  Text "List 1:"\n  each task in $tasks\n    Text "$task.title"\n\nFrame\n  Text "List 2:"\n  each task in $tasks\n    Text "$task.title"`,
        container
      )
      const texts = allByName(root, 'Text').map(t => t.textContent?.trim())
      // Each list has its own header + 2 task entries. Total: 6 Text elements.
      expect(texts).toEqual(['List 1:', 'Alpha', 'Beta', 'List 2:', 'Alpha', 'Beta'])
    })
  })

  // ---------------------------------------------------------------------------
  // E13: Bug #20 regression — token reference inside loop body
  // ---------------------------------------------------------------------------

  describe('E13: Bug #20 regression — `$token` inside each-loop body', () => {
    it('token references resolve to var(--token) inside loop styles', () => {
      const root = render(
        `accent.bg: #10b981\nmuted.col: #888\n\ntasks:\n  t1:\n    title: "Alpha"\n  t2:\n    title: "Beta"\n\neach task in $tasks\n  Frame bg $accent\n    Text "$task.title", col $muted`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      expect(frames.length).toBe(2)
      for (const frame of frames) {
        expect(frame.style.background).toContain('var(--accent-bg)')
      }
      const texts = allByName(root, 'Text') as HTMLElement[]
      for (const text of texts) {
        expect(text.style.color).toContain('var(--muted-col)')
      }
    })
  })
})
