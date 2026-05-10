/**
 * Properties — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/properties-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const STATIC_CORPUS = [
  { name: 'P1: hex color', src: `Frame bg #2271C1, w 100, h 50` },
  { name: 'P3: gradient', src: `Frame bg grad #2271C1 #7c3aed, w 200, h 100` },
  { name: 'P4: typography', src: `Text "T", fs 24, weight bold` },
  { name: 'P6: shadow', src: `Frame w 100, h 50, shadow lg` },
  { name: 'P7: hidden', src: `Frame w 100, hidden` },
  { name: 'P9: radius', src: `Frame w 100, h 50, rad 8` },
]

describe('Properties — All 3 backends compile static corpus', () => {
  it.each(STATIC_CORPUS)('$name: compiles in DOM, React, Framework', ({ src }) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })
})

describe('Properties — DOM emits expected style values', () => {
  it('bg #2271C1 emits #2271C1 hex', () => {
    const dom = generateDOM(parse(`Frame bg #2271C1`))
    expect(dom).toMatch(/#2271C1|#2271c1/)
  })

  it('shadow md emits a box-shadow value', () => {
    const dom = generateDOM(parse(`Frame w 100, h 50, shadow md`))
    expect(dom).toContain('box-shadow')
  })

  it('grad emits linear-gradient', () => {
    const dom = generateDOM(parse(`Frame bg grad #2271C1 #7c3aed, w 200, h 100`))
    expect(dom).toContain('linear-gradient')
  })

  it('React emits linear-gradient for bg/col gradients (DOM-equivalent)', () => {
    // Pinned gap: pre-2026-05-10 the React backend just `String()`-joined
    // the gradient values into `backgroundColor: 'grad #… #…'` (invalid
    // CSS). Must produce a real `linear-gradient(...)`.
    const reactBg = generateReact(parse(`Frame bg grad #2271C1 #7c3aed, w 200, h 100`))
    expect(reactBg).toContain('linear-gradient(90deg, #2271C1, #7c3aed)')

    const reactVer = generateReact(parse(`Frame bg grad-ver #f59e0b #ef4444, w 200, h 100`))
    expect(reactVer).toContain('linear-gradient(180deg, #f59e0b, #ef4444)')

    const reactAngle = generateReact(parse(`Frame bg grad 45 #10b981 #2271C1, w 200, h 100`))
    expect(reactAngle).toContain('linear-gradient(45deg, #10b981, #2271C1)')
  })

  it('React resolves token references in gradient color stops', () => {
    // Pre-2026-05-10: token-typed gradient stops (`$primary`) leaked
    // `[object Object]` into the CSS string because the gradient code
    // path stringified them directly. Now resolves through `resolve()`.
    const src = `primary.bg: #2271C1\nsecondary.bg: #ec4899\n\nFrame bg grad 135 $primary $secondary, w 100, h 100`
    const react = generateReact(parse(src))
    expect(react).not.toContain('[object Object]')
    expect(react).toContain('linear-gradient(135deg,')
  })

  it('React emits text-gradient pattern for col grad', () => {
    // Text gradient = background + clip-to-text + transparent color.
    const react = generateReact(parse(`Text "Hi", col grad #2271C1 #7c3aed`))
    expect(react).toContain('linear-gradient(90deg, #2271C1, #7c3aed)')
    expect(react).toContain('WebkitBackgroundClip')
    expect(react).toMatch(/color:\s*['"]transparent['"]/)
  })

  it('truncate emits text-overflow + overflow + white-space', () => {
    const dom = generateDOM(parse(`Text "X", truncate, w 100`))
    expect(dom).toContain('text-overflow')
    expect(dom).toContain('ellipsis')
  })

  it('React emits rotate / scale as single transform property', () => {
    // Pre-2026-05-10: rotate/scale dropped silently in React.
    const rotate = generateReact(parse(`Frame rotate 45, w 100, h 100`))
    expect(rotate).toContain("transform: 'rotate(45deg)'")

    const scale = generateReact(parse(`Frame scale 1.2, w 100, h 100`))
    expect(scale).toContain("transform: 'scale(1.2)'")

    // Both at once → single transform with both parts joined.
    const both = generateReact(parse(`Frame rotate 45, scale 1.2, w 100, h 100`))
    expect(both).toContain("transform: 'rotate(45deg) scale(1.2)'")
  })

  it('React `hover-scale` reaches the state stylesheet', () => {
    const react = generateReact(parse(`Button "X", bg #333, hover-scale 1.05`))
    expect(react).toContain('transform: scale(1.05)')
  })

  it('React applies flex-defaults to semantic-HTML containers', () => {
    // Pre-2026-05-10 only `Frame`/`Box`/`Spacer` etc. (the explicit
    // `content: false` primitives) got Frame-style flex defaults in
    // React. Header / Section / Article / Aside / Main / Nav / Footer
    // are containers in DOM but were rendered without flex layout in
    // React, so children stacked as inline-blocks.
    const react = generateReact(parse(`Header bg #333\n  Text "Title"`))
    expect(react).toContain("display: 'flex'")
    expect(react).toContain("flexDirection: 'column'")
  })

  // Pre-2026-05-10 the React backend silently dropped a long tail of
  // common props (`italic`, `underline`, `uppercase`, `lowercase`,
  // `truncate`, `aspect`, `blur`, `backdrop-blur`, `shadow sm/md/lg`,
  // `z N`, `absolute`/`fixed`/`relative`, `grow`/`shrink`,
  // `text-align`, `scroll-hor`/`scroll-both`, `clip`, `visible`).
  // Now wired through `applyFlagProperty` (boolean flags) + main switch
  // (value-bearing). Pin a representative sample so regressions surface
  // in CI rather than visual-only noise.
  it.each([
    ['stacked', `Frame stacked, w 100`, /position:\s*'relative'/],
    ['device mobile', `Frame device mobile`, /width:\s*'375px'.*height:\s*'812px'/s],
    ['device tablet', `Frame device tablet`, /width:\s*'768px'.*height:\s*'1024px'/s],
    ['device desktop', `Frame device desktop`, /width:\s*'1440px'.*height:\s*'900px'/s],
    ['italic', `Text "Hi", italic`, /fontStyle:\s*'italic'/],
    ['underline', `Text "Hi", underline`, /textDecoration:\s*'underline'/],
    ['uppercase', `Text "Hi", uppercase`, /textTransform:\s*'uppercase'/],
    ['truncate', `Text "X", truncate, w 100`, /textOverflow:\s*'ellipsis'/],
    ['absolute', `Frame absolute, w 100`, /position:\s*'absolute'/],
    ['fixed', `Frame fixed, w 100`, /position:\s*'fixed'/],
    ['aspect square', `Frame aspect square, w 100`, /aspectRatio:\s*'1'/],
    ['blur 4', `Frame blur 4, w 100`, /filter:\s*'blur\(4px\)'/],
    ['backdrop-blur 8', `Frame backdrop-blur 8, w 100`, /backdropFilter:\s*'blur\(8px\)'/],
    ['shadow md', `Frame shadow md, w 100`, /boxShadow:\s*'0 4px 6px/],
    ['z 5', `Frame z 5, w 100`, /zIndex:\s*['"]?5/],
    ['scroll-hor', `Frame scroll-hor, w 100`, /overflowX:\s*'auto'/],
    ['grow', `Frame grow, bg red`, /flexGrow:\s*1/],
    ['text-align center', `Text "Hi", text-align center`, /textAlign:\s*'center'/],
  ])('React emits CSS for `%s`', (_name, src, expectedPattern) => {
    const react = generateReact(parse(src))
    expect(react).toMatch(expectedPattern as RegExp)
  })

  // Pre-2026-05-10 the React backend dropped every directional padding/
  // margin/border shortcut. Now wired in the main switch.
  it.each([
    ['pad-x 16', `Frame pad-x 16, w 100`, /paddingLeft:\s*'16px'.*paddingRight:\s*'16px'/s],
    ['pad-y 12', `Frame pad-y 12, w 100`, /paddingTop:\s*'12px'.*paddingBottom:\s*'12px'/s],
    ['pad-t 8', `Frame pad-t 8, w 100`, /paddingTop:\s*'8px'/],
    ['pad-r 16', `Frame pad-r 16, w 100`, /paddingRight:\s*'16px'/],
    ['pad-b 12', `Frame pad-b 12, w 100`, /paddingBottom:\s*'12px'/],
    ['pad-l 8', `Frame pad-l 8, w 100`, /paddingLeft:\s*'8px'/],
    ['mar-x 16', `Frame mar-x 16, w 100`, /marginLeft:\s*'16px'.*marginRight:\s*'16px'/s],
    ['mar-y 12', `Frame mar-y 12, w 100`, /marginTop:\s*'12px'.*marginBottom:\s*'12px'/s],
    ['mar-t 8', `Frame mar-t 8, w 100`, /marginTop:\s*'8px'/],
    ['bor-t 1', `Frame bor-t 1, w 100`, /borderTopWidth:\s*'1px'.*borderTopStyle:\s*'solid'/s],
    [
      'bor-b 2',
      `Frame bor-b 2, w 100`,
      /borderBottomWidth:\s*'2px'.*borderBottomStyle:\s*'solid'/s,
    ],
  ])('React emits CSS for directional `%s`', (_name, src, expectedPattern) => {
    const react = generateReact(parse(src))
    expect(react).toMatch(expectedPattern as RegExp)
  })

  // Framework backend reverse-mappings — pre-2026-05-10 these were silently
  // dropped because cssPropToMirrorProp had no branch for `aspect-ratio`,
  // `backdrop-filter`, or `filter`.
  it('Framework round-trips `aspect square` → aspect-ratio: 1 → aspect: square', () => {
    const fw = generateFramework(parse(`Frame aspect square, w 100`))
    expect(fw).toContain("aspect: 'square'")
  })

  it('Framework round-trips `aspect video`', () => {
    const fw = generateFramework(parse(`Frame aspect video, w 200`))
    expect(fw).toContain("aspect: 'video'")
  })

  it('Framework round-trips `backdrop-blur N` (drops the -webkit- prefix)', () => {
    const fw = generateFramework(parse(`Frame backdrop-blur 8, bg rgba(0,0,0,0.5), w 100`))
    expect(fw).toContain("'backdrop-blur': 8")
    // The duplicate `-webkit-backdrop-filter` companion the IR emits for
    // Safari is dropped from the M(...) bag.
    expect(fw).not.toContain('-webkit-backdrop-filter')
  })

  it('Framework round-trips `blur N`', () => {
    const fw = generateFramework(parse(`Frame blur 4, w 100`))
    expect(fw).toContain('blur: 4')
  })

  it('Framework round-trips `rotate N`', () => {
    const fw = generateFramework(parse(`Frame rotate 45, w 50`))
    expect(fw).toContain('rotate: 45')
  })

  it('Framework round-trips `scale N`', () => {
    const fw = generateFramework(parse(`Frame scale 1.2, w 50`))
    expect(fw).toContain('scale: 1.2')
  })

  it('Framework round-trips `fixed`', () => {
    const fw = generateFramework(parse(`Frame fixed, x 10, y 20, bg red`))
    expect(fw).toContain('fixed: true')
  })

  it('Framework round-trips directional `bor-l/r/t/b`', () => {
    const fw = generateFramework(parse(`Frame bor-l 1, bor-r 2, w 100, boc red`))
    expect(fw).toContain("'bor-l': 1")
    expect(fw).toContain("'bor-r': 2")
  })

  it.each([
    // [direction, value, expected style fragments]
    ['hor', 'top', /alignItems:\s*'flex-start'/],
    ['hor', 'bottom', /alignItems:\s*'flex-end'/],
    ['hor', 'center', /alignItems:\s*'center'.*justifyContent:\s*'center'/s],
    ['hor', 'left', /justifyContent:\s*'flex-start'/],
    ['hor', 'right', /justifyContent:\s*'flex-end'/],
    ['ver', 'top', /justifyContent:\s*'flex-start'/],
    ['ver', 'bottom', /justifyContent:\s*'flex-end'/],
    ['ver', 'right', /alignItems:\s*'flex-end'/],
  ])('React: direction-aware `align <value>` (%s, %s)', (dir, val, expected) => {
    // PIN: pre-2026-05-10 React dropped `align top|bottom|center|left|right`
    // entirely — the cross-axis defaulted to `flex-start`. DOM mapped
    // these correctly through its IR layout-transformer. React now
    // re-derives the same flex semantics.
    const src = `Frame ${dir}, align ${val}\n  Frame w 50, h 50\n  Frame w 50, h 100`
    const react = generateReact(parse(src))
    expect(react).toMatch(expected as RegExp)
  })

  it('React: `ver-baseline` emits alignItems baseline', () => {
    // PIN: pre-2026-05-10 the keyword fell through and React's default
    // `align-items: flex-start` clobbered the cross-axis baseline.
    const react = generateReact(parse(`Frame hor, ver-baseline\n  Text "A"\n  Text "B"`))
    expect(react).toContain("alignItems: 'baseline'")
  })

  it('React: numeric input min/max/step land as HTML attrs', () => {
    // PIN: pre-2026-05-10 these were silently dropped — the React
    // HTML_ATTR_PROPS map didn't list them. DOM emits them via setAttribute.
    const react = generateReact(parse(`Input type number, min 0, max 100, step 5`))
    expect(react).toContain('min="0"')
    expect(react).toContain('max="100"')
    expect(react).toContain('step="5"')
  })

  it('React: input mask surfaces as data-mask attribute', () => {
    // DOM applies a runtime mask handler; React has no runtime, so we
    // surface the pattern as `data-mask` for any future runtime layer.
    // Pre-fix the entire `mask "..."` value dropped silently.
    const react = generateReact(parse(`Input mask "###-###-####", w 200`))
    expect(react).toContain('data-mask="###-###-####"')
  })

  it('React: `tracking N` / `ls N` emits letterSpacing in em', () => {
    // PIN: pre-2026-05-10 `Text "X", tracking 0.05` dropped the
    // property entirely from React (no `letterSpacing` in style). DOM
    // emitted `letter-spacing: 0.05em` correctly via IR — only the
    // React switch was missing the case.
    const r1 = generateReact(parse(`Text "X", tracking 0.05`))
    expect(r1).toContain("letterSpacing: '0.05em'")

    const r2 = generateReact(parse(`Text "X", ls -0.02`))
    expect(r2).toContain("letterSpacing: '-0.02em'")
  })

  it('Framework round-trips `bor 0 0 1 0` (multi-value)', () => {
    // PIN: 4-value `bor` shorthand from `border-style: solid` +
    // `border-width: 0 0 1px 0`. The lone `border-style: solid` is
    // dropped to avoid noise.
    const fw = generateFramework(parse(`Frame bor 0 0 1 0, w 100, boc red`))
    expect(fw).toContain("bor: '0 0 1 0'")
    expect(fw).not.toContain("'border-style'")
  })
})
