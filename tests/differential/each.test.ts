/**
 * Each-Loop — Differential Testing (Schicht 4 der Test-Pyramide)
 *
 * Pinned support matrix per backend für Each-Loop-Sub-Features.
 * Documentation: docs/archive/concepts/each-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  {
    name: 'E1: basic each',
    src: `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n\neach task in $tasks\n  Text "$task.title"`,
  },
  {
    name: 'E3: inline-array',
    src: `each x in [1, 2, 3]\n  Text "$x"`,
  },
  {
    name: 'E5: where-filter',
    src: `tasks:\n  t1:\n    done: true\n  t2:\n    done: false\n\neach t in $tasks where t.done\n  Text "X"`,
  },
]

describe('Each-Loop — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Each-Loop — DOM-only runtime semantics', () => {
  // Block-each uses runtime template (data-each-container + _eachConfig).
  // React/Framework backends do NOT have this runtime — they emit fewer
  // children or no loop at all.
  it('DOM emits _eachConfig runtime hook', () => {
    const dom = generateDOM(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    expect(dom).toContain('_eachConfig')
  })

  it('DOM emits data-each-container in renderItem template', () => {
    const dom = generateDOM(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    expect(dom).toContain('eachContainer')
  })

  it('React backend: top-level each renders as `.map()` over the collection', () => {
    // React backend now emits a real `.map()` over the collection (was
    // a documented limitation pre-Tier-9 follow-up). Object-keyed
    // collections coerced via Object.values; output wrapped in `<>...</>`
    // because the `.map()` expression is naked JSX.
    const react = generateReact(
      parse(`tasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Text "$task.title"`)
    )
    expect(react).toMatch(/\.map\(\(task,/)
    expect(react).toContain('Object.values')
    // Top-level Each → Fragment wrapper (return value isn't a single element).
    expect(react).toMatch(/return\s*\(\s*<>/)
  })
})

// =============================================================================
// Bug regressions
// =============================================================================

describe('Each-Loop — React filter + loop-var text resolution', () => {
  // Pre-2026-05-10 React's `.map()` had no `where`-filter and didn't
  // resolve `$t.title` text-content interpolation against the loop var.
  // Both wired now: filter runs as `.filter(t => …)` before the .map();
  // text content `"$t.title"` becomes `{t.title}` (bare loop-var
  // expression) instead of literal `"$t.title"`.
  it('where-filter compiles to `.filter()` before `.map()`', () => {
    const src = `tasks:\n  t1:\n    done: true\n\neach t in $tasks where t.done\n  Text "X"`
    const react = generateReact(parse(src))
    expect(react).toMatch(/\.filter\(\(t\)\s*=>\s*t\.done\)\.map\(/)
  })

  it('text-content `$t.title` resolves to loop-var expression', () => {
    const src = `tasks:\n  t1:\n    title: "A"\n\neach t in $tasks\n  Text "$t.title"`
    const react = generateReact(parse(src))
    expect(react).toContain('{t.title}')
    expect(react).not.toContain('"$t.title"')
  })

  it('loop-var lookup wins over token lookup for in-scope iterators', () => {
    // The loop variable shadows any (improbable) sibling token of the
    // same name — a child Text inside the each emits the bare loop-var
    // path, not a `tokens["t"]` lookup.
    const src = `t: "outer"\ntasks:\n  t1:\n    title: "A"\n\neach t in $tasks\n  Text "$t.title"`
    const react = generateReact(parse(src))
    expect(react).toContain('{t.title}')
    expect(react).not.toContain('tokens["t"]?.title')
  })
})

describe('Each-Loop — React loop-var values in styles', () => {
  // Pre-2026-05-10: a loop-var reference inside a style prop (like
  // `bg $project.color` or `w $project.progress + "%"`) emitted as
  // `backgroundColor: '$project.color'` (literal) or `width: [object Object]`.
  // React has no runtime for loop scope, so the safest fall-through is to
  // drop those properties silently rather than emit garbage.
  it('drops loop-var token reference in style props (no garbage)', () => {
    const src = `projects:\n  p1:\n    color: "#2271C1"\n\neach project in $projects\n  Frame bg $project.color, w 50, h 50`
    const react = generateReact(parse(src))
    expect(react).not.toContain("'$project.color'")
    expect(react).not.toContain('[object Object]')
  })

  it('drops computed expression (loop-var arithmetic) in style props', () => {
    const src = `projects:\n  p1:\n    progress: 50\n\neach project in $projects\n  Frame w $project.progress + "%", h 6`
    const react = generateReact(parse(src))
    expect(react).not.toContain('[object Object]')
  })
})

describe('Each-Loop — Deep loop-var resolution', () => {
  // PIN: pre-2026-05-10 the React backend's `detectLayoutContext` only
  // returned `{ type: 'grid' | 'flex' }` and dropped `loopVars` from
  // the parent context. So a slot four levels deep inside `each`
  // resolved `$position.name` against (missing) `tokens.position`
  // instead of the iterator. Result: literal `"$position.name"` strings
  // leaked into the JSX output for every `Table` row in real examples
  // (portfolio-advisor.mirror, address-manager.mirror).
  //
  // Now `ownLayoutContext` carries `loopVars` through unchanged so any
  // descendant — regardless of depth — sees the iterator.
  it('loop-var resolves through nested Frames inside each', () => {
    const src = `positions:
  p1:
    name: "Apple"

each position in $positions
  Frame
    Frame
      Frame
        Text "$position.name"`
    const react = generateReact(parse(src))
    expect(react).toContain('{position.name}')
    expect(react).not.toContain('"$position.name"')
  })

  it('loop-var resolves into custom-component slot positional content', () => {
    // The user-facing case from portfolio-advisor.mirror: `Name "$x"`
    // is a slot inside a multi-level component, all wrapped in `each`.
    const src = `Card: gap 4
  Title: col white

each item in [1, 2]
  Card
    Title "Row $item"`
    const react = generateReact(parse(src))
    // Loop-var path emerged from inside the slot.
    expect(react).toMatch(/\{["'`]Row \$\{["'`]?\}|Row.*\{item\}/)
    expect(react).not.toContain('"Row $item"')
  })
})

describe('Each-Loop — Bug regressions', () => {
  it('Bug #17 fixed: two parallel each-loops over same collection both render', () => {
    const src = `tasks:\n  t1:\n    title: "Alpha"\n  t2:\n    title: "Beta"\n\neach task in $tasks\n  Text "1: $task.title"\n\neach task in $tasks\n  Text "2: $task.title"`
    const dom = generateDOM(parse(src))
    // Both each-loops produce variable names that don't clash.
    // Without the fix, this would have `const tasksData` redeclared.
    expect(() => new Function(dom.replace(/^export\s+function/gm, 'function'))).not.toThrow()
  })

  it('Bug #20 fixed: $token reference inside each-loop body resolves', () => {
    const src = `accent.bg: #10b981\n\ntasks:\n  t1:\n    title: "A"\n\neach task in $tasks\n  Frame bg $accent`
    const dom = generateDOM(parse(src))
    // The token resolves to var(--accent-bg) inside the loop's renderItem
    expect(dom).toContain('var(--accent-bg)')
  })
})
