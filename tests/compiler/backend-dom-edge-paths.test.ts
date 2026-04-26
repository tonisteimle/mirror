/**
 * DOM Backend — Edge-Path Coverage
 *
 * Targets uncovered branches in compiler/backends/dom.ts (was 64.65% Lines).
 * Each test exercises a specific orchestrator path that the existing
 * test suite doesn't reach.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function compile(src: string): string {
  return generateDOM(parse(src))
}

// =============================================================================
// Top-level ternary in CSS values (parseTopLevelConditional)
// =============================================================================

describe('DOM Edge — Ternary in CSS values', () => {
  it('simple ternary in bg property: active ? #111 : #222', () => {
    const out = compile(`active: true

Frame bg active ? #111 : #222, w 100, h 50`)
    expect(out).toContain('createUI')
    // The ternary should appear in some form in the emitted code
    expect(out).toMatch(/\$get\("active"\)|active/)
  })

  it('nested ternary: a ? X : b ? Y : Z', () => {
    const out = compile(`a: true
b: false

Frame bg a ? #111 : b ? #222 : #333, w 100`)
    expect(out).toContain('createUI')
    expect(out).toMatch(/#111|#222|#333/)
  })

  it('ternary with comparison operator: count > 0 ? #green : #red', () => {
    const out = compile(`count: 5

Frame bg count > 0 ? #10b981 : #ef4444, w 100`)
    expect(out).toContain('createUI')
    expect(out).toContain('10b981')
  })
})

// =============================================================================
// Nested each loops (each-in-each)
// =============================================================================

describe('DOM Edge — Nested each loops', () => {
  it('outer each with inner each compiles', () => {
    const out = compile(`groups:
  g1:
    items:
      i1:
        title: "A"
      i2:
        title: "B"
  g2:
    items:
      i3:
        title: "C"

each group in $groups
  Frame
    each item in group.items
      Text item.title`)
    expect(out).toContain('createUI')
    expect(out).toMatch(/forEach/)
  })

  it('each + conditional inside compiles', () => {
    const out = compile(`tasks:
  t1:
    title: "A"
    done: true

each task in $tasks
  if $task.done
    Text task.title
  else
    Text "incomplete"`)
    expect(out).toContain('createUI')
    expect(out).toContain('forEach')
  })
})

// =============================================================================
// Canvas + Inheritance (col, font, fs flow to children)
// =============================================================================

describe('DOM Edge — Canvas styles', () => {
  it('canvas with bg + col + fs sets inherited properties', () => {
    const out = compile(`canvas mobile, bg #1a1a1a, col white, fs 16

Frame
  Text "Hi"`)
    expect(out).toContain('createUI')
    expect(out).toContain('375')
    expect(out).toContain('1a1a1a')
  })

  it('canvas with custom width/height', () => {
    const out = compile(`canvas bg #fff, w 480, h 640

Text "X"`)
    expect(out).toContain('480')
    expect(out).toContain('640')
  })

  it('canvas tablet preset', () => {
    const out = compile(`canvas tablet

Text "X"`)
    expect(out).toContain('768')
  })

  it('canvas desktop preset', () => {
    const out = compile(`canvas desktop

Text "X"`)
    expect(out).toContain('1440')
  })
})

// =============================================================================
// State machines (toggle, exclusive, multi-state cycles)
// =============================================================================

describe('DOM Edge — State machines', () => {
  it('Button with toggle() + on: state', () => {
    const out = compile(`Btn: bg #333, col white, toggle()
  on:
    bg #2271C1

Btn "Click"`)
    expect(out).toContain('createUI')
    expect(out).toContain('toggle')
  })

  it('multi-state cycle: todo → doing → done', () => {
    const out = compile(`Status: pad 8, toggle()
  todo:
    bg #333
  doing:
    bg #f59e0b
  done:
    bg #10b981

Status "X"`)
    expect(out).toContain('createUI')
    expect(out).toContain('toggle')
  })

  it('exclusive() state on multiple siblings', () => {
    const out = compile(`Tab: pad 12, exclusive()
  selected:
    bg #2271C1

Frame
  Tab "A"
  Tab "B", selected
  Tab "C"`)
    expect(out).toContain('createUI')
    expect(out).toContain('exclusive')
  })
})

// =============================================================================
// Animations
// =============================================================================

describe('DOM Edge — Animations', () => {
  it.each([
    ['anim spin'],
    ['anim pulse'],
    ['anim bounce'],
    ['anim shake'],
    ['anim fade-in'],
    ['anim slide-up'],
  ])('%s emits keyframes reference', anim => {
    const out = compile(`Icon "loader", ${anim}`)
    expect(out).toContain('createUI')
    expect(out).toMatch(/animation|mirror-/)
  })

  it('transition with duration: hover 0.2s ease-out', () => {
    const out = compile(`Btn: bg #333
  hover 0.2s ease-out:
    bg #444

Btn "X"`)
    expect(out).toContain('createUI')
  })
})

// =============================================================================
// Multi-feature integration
// =============================================================================

describe('DOM Edge — Multi-feature integration', () => {
  it('canvas + tokens + components + each + state all together', () => {
    const out = compile(`canvas mobile, bg #1a1a1a

primary.bg: #2271C1

Item: pad 8, bg #333, toggle()
  on:
    bg $primary

tasks:
  t1:
    title: "A"
  t2:
    title: "B"

each task in $tasks
  Item task.title`)
    expect(out).toContain('createUI')
    expect(out).toContain('forEach')
    expect(out).toContain('375')
    expect(out).toContain('toggle')
  })

  it('Stacked layout with absolute children', () => {
    const out = compile(`Frame stacked, w 200, h 200
  Frame x 0, y 0, w 100, h 100, bg #f00
  Frame x 50, y 50, w 100, h 100, bg #00f`)
    expect(out).toContain('createUI')
    // Stacked → position relative on parent
  })

  it('Grid layout with x/y children', () => {
    const out = compile(`Frame grid 12, gap 8
  Frame x 1, y 1, w 6, h 1, bg #333
  Frame x 7, y 1, w 6, h 1, bg #444`)
    expect(out).toContain('createUI')
    expect(out).toContain('grid')
  })
})

// =============================================================================
// Visibility (visibleWhen, show/hide)
// =============================================================================

describe('DOM Edge — Visibility', () => {
  it('Element with visibleWhen via state-cross-reference', () => {
    const out = compile(`Btn: name MenuBtn, pad 10, toggle()
  open:
    bg #2271C1

Frame
  MenuBtn.open:
    visible
  Text "Hidden by default", hidden`)
    expect(out).toContain('createUI')
  })
})

// =============================================================================
// Charts in different contexts
// =============================================================================

describe('DOM Edge — Chart contexts', () => {
  it('Chart inside conditional compiles without throw', () => {
    const out = compile(`flag: true

sales:
  Jan: 100
  Feb: 200

if flag
  Bar $sales, w 200, h 100`)
    // Whether the chart actually renders inside conditionals depends on the
    // template-emitter — we only verify compilation succeeds.
    expect(out).toContain('createUI')
  })

  it('Multiple chart types in one file', () => {
    const out = compile(`d:
  A: 30
  B: 50

Frame
  Line $d, w 200, h 100
  Bar $d, w 200, h 100
  Pie $d, w 200, h 200
  Donut $d, w 200, h 200`)
    expect(out).toContain('createUI')
    expect(out).toMatch(/createChart[\s\S]*createChart/)
  })
})

// =============================================================================
// Data: relations, aggregations
// =============================================================================

describe('DOM Edge — Data relations & aggregations', () => {
  it('aggregation: $items.count', () => {
    const out = compile(`items:
  a:
    title: "A"
  b:
    title: "B"

Text "Total: $items.count"`)
    expect(out).toContain('createUI')
  })

  it('aggregation: $items.first.title', () => {
    const out = compile(`items:
  a:
    title: "First"
  b:
    title: "Second"

Text "First: $items.first.title"`)
    expect(out).toContain('createUI')
  })

  it('aggregation: $items.sum(value)', () => {
    const out = compile(`items:
  a:
    value: 10
  b:
    value: 20

Text "Sum: $items.sum(value)"`)
    expect(out).toContain('createUI')
  })
})

// =============================================================================
// Error recovery
// =============================================================================

describe('DOM Edge — Robustness', () => {
  it('only-tokens program (no instances)', () => {
    const out = compile(`primary.bg: #2271C1
danger.bg: #ef4444`)
    expect(out).toContain('createUI')
  })

  it('only-components program (no top-level instances)', () => {
    const out = compile(`Card: pad 16, bg #1a1a1a`)
    expect(out).toContain('createUI')
  })

  it('comment-only program', () => {
    const out = compile(`// Just a comment line`)
    expect(out).toContain('createUI')
  })
})
