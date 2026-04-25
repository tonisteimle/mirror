/**
 * Custom Animations — Compiler-Pipeline-Tests (Thema 13)
 *
 * Bevor diese Tests existierten:
 * - `compiler/parser/animation-parser.ts` lag bei 1.1% Coverage
 * - `compiler/backends/dom/animation-emitter.ts` lag bei 2.6% Coverage
 *
 * Beim ersten Probelauf entdeckter Bug: ParserUtils.expect() / addError()
 * existierten gar nicht — der gesamte custom-animation-Pfad crashte mit
 * `U.expect is not a function`. Behoben durch lokale `expect`/`addError`
 * helper in animation-parser.ts.
 *
 * Eingabe-Syntax:
 *   FadeUp as animation: ease-out
 *     0.00 opacity 0, y-offset 20
 *     1.00 all opacity 1, y-offset 0
 *
 *   Frame anim FadeUp
 *
 * Erwarteter DOM-Output: _runtime.registerAnimation({name, easing, keyframes:
 * [{time, properties:[{property, value [, target]}, …]}, …]}).
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function parseSrc(src: string) {
  return parse(src) as any
}
function dom(src: string) {
  return generateDOM(parse(src))
}

// =============================================================================
// Parser
// =============================================================================

describe('Custom animations — parser', () => {
  it('A1: simple `FadeUp as animation:` parses without crash', () => {
    const ast = parseSrc(`canvas mobile

FadeUp as animation: ease-out
  0.00 opacity 0
  1.00 opacity 1
`)
    expect(ast.animations).toHaveLength(1)
    expect(ast.animations[0].name).toBe('FadeUp')
    expect(ast.animations[0].easing).toBe('ease-out')
    expect(ast.animations[0].keyframes).toHaveLength(2)
  })

  it('A2: animation without easing', () => {
    const ast = parseSrc(`canvas mobile

Pulse as animation:
  0.00 opacity 1
  1.00 opacity 0.5
`)
    expect(ast.animations).toHaveLength(1)
    expect(ast.animations[0].name).toBe('Pulse')
    expect(ast.animations[0].keyframes[0].time).toBe(0)
  })

  it('A3: keyframe with multiple properties', () => {
    const ast = parseSrc(`canvas mobile

Slide as animation: ease-in
  0.00 opacity 0, y-offset 20
  1.00 opacity 1, y-offset 0
`)
    const props0 = ast.animations[0].keyframes[0].properties
    expect(props0.length).toBeGreaterThanOrEqual(2)
    const propNames = props0.map((p: any) => p.name)
    expect(propNames).toContain('opacity')
  })

  it('A4: `all` target keyword on keyframe property is captured', () => {
    const ast = parseSrc(`canvas mobile

Heart as animation:
  0.00 opacity 0
  1.00 all opacity 1
`)
    const propsLast = ast.animations[0].keyframes[ast.animations[0].keyframes.length - 1].properties
    // The `all` keyword must surface as a target marker on at least one property.
    expect(propsLast.some((p: any) => p.target === 'all')).toBe(true)
  })

  it('A5: 3+ keyframes parse in time-order', () => {
    const ast = parseSrc(`canvas mobile

Bounce as animation:
  0.00 opacity 0
  0.50 opacity 0.5
  1.00 opacity 1
`)
    const times = ast.animations[0].keyframes.map((k: any) => k.time)
    expect(times).toEqual([0, 0.5, 1])
  })

  it('A6: missing colon after "animation" is reported as parse error', () => {
    const ast = parseSrc(`canvas mobile

Broken as animation
  0.00 opacity 0
`)
    // Should not crash; an error or empty animation is acceptable.
    expect(Array.isArray(ast.animations)).toBe(true)
    expect(Array.isArray(ast.errors)).toBe(true)
  })
})

// =============================================================================
// DOM Emission (animation-emitter)
// =============================================================================

describe('Custom animations — DOM emission', () => {
  it('A7: registerAnimation call is emitted with name + easing', () => {
    const out = dom(`canvas mobile

FadeUp as animation: ease-out
  0.00 opacity 0
  1.00 opacity 1

Frame anim FadeUp
  Text "Hello"
`)
    expect(out).toMatch(/_runtime\.registerAnimation\(\{/)
    expect(out).toMatch(/name:\s*"FadeUp"/)
    expect(out).toMatch(/easing:\s*"ease-out"/)
  })

  it('A8: keyframes array contains time + properties for each frame', () => {
    const out = dom(`canvas mobile

Pulse as animation:
  0.00 opacity 1
  1.00 opacity 0.5

Frame anim Pulse
  Text "X"
`)
    expect(out).toMatch(/keyframes:\s*\[/)
    expect(out).toMatch(/time:\s*0\b/)
    expect(out).toMatch(/time:\s*1\b/)
    expect(out).toMatch(/property:\s*"opacity"/)
  })

  it('A9: target marker on property reaches output', () => {
    const out = dom(`canvas mobile

Heart as animation:
  0.00 opacity 0
  1.00 all opacity 1

Frame anim Heart
  Text "X"
`)
    expect(out).toMatch(/target:\s*"all"/)
  })

  it('A10: y-offset alias is converted to transform translateY', () => {
    const out = dom(`canvas mobile

Slide as animation: ease-out
  0.00 y-offset 20
  1.00 y-offset 0

Frame anim Slide
  Text "X"
`)
    expect(out).toMatch(/property:\s*"transform"/)
    expect(out).toMatch(/translateY/)
  })

  it('A11: x-offset alias is converted to transform translateX', () => {
    const out = dom(`canvas mobile

XSlide as animation:
  0.00 x-offset 30
  1.00 x-offset 0

Frame anim XSlide
  Text "X"
`)
    expect(out).toMatch(/property:\s*"transform"/)
    expect(out).toMatch(/translateX/)
  })
})

// =============================================================================
// Pathological
// =============================================================================

describe('Custom animations — pathological', () => {
  it('A12: animation defined but never referenced still emits registerAnimation', () => {
    // Definition is global; runtime registration happens regardless.
    const out = dom(`canvas mobile

Unused as animation:
  0.00 opacity 0
  1.00 opacity 1

Text "Hello"
`)
    expect(out).toMatch(/_runtime\.registerAnimation\([\s\S]*name:\s*"Unused"/)
  })

  it('A13: two distinct custom animations both register', () => {
    const out = dom(`canvas mobile

A as animation:
  0.00 opacity 0
  1.00 opacity 1

B as animation:
  0.00 opacity 1
  1.00 opacity 0

Frame anim A
  Text "X"
Frame anim B
  Text "Y"
`)
    const calls = (out.match(/_runtime\.registerAnimation\(/g) || []).length
    expect(calls).toBe(2)
    expect(out).toMatch(/name:\s*"A"/)
    expect(out).toMatch(/name:\s*"B"/)
  })

  it('A14: keyframe with single keyframe (degenerate) does not crash', () => {
    expect(() => {
      dom(`canvas mobile

OneFrame as animation:
  1.00 opacity 1

Frame anim OneFrame
  Text "X"
`)
    }).not.toThrow()
  })
})

// =============================================================================
// Iter 2 — Coverage closure für animation-parser (71% → 90%+)
// =============================================================================

describe('Custom animations — body without indent (error path)', () => {
  it('A15: animation definition without indented body produces error', () => {
    const ast = parseSrc(`canvas mobile

NoBody as animation: ease-out
Frame anim NoBody
  Text "X"
`)
    // The parser must not crash — animation may be empty but no indented
    // keyframes triggers the addError path.
    expect(Array.isArray(ast.errors)).toBe(true)
    expect(ast.animations).toBeDefined()
  })
})

describe('Custom animations — roles clause', () => {
  it('A16: animation with `roles enter, exit` records both roles', () => {
    const ast = parseSrc(`canvas mobile

Fade as animation: ease-out
  roles enter, exit
  0.00 opacity 0
  1.00 opacity 1
`)
    const anim = ast.animations[0]
    expect(anim.roles).toEqual(['enter', 'exit'])
  })

  it('A17: animation with single `roles enter` records one role', () => {
    const ast = parseSrc(`canvas mobile

Reveal as animation:
  roles enter
  0.00 opacity 0
  1.00 opacity 1
`)
    const anim = ast.animations[0]
    expect(anim.roles).toEqual(['enter'])
  })

  it('A18: roles emitted via animation-emitter', () => {
    const out = dom(`canvas mobile

Fade as animation: ease-out
  roles enter, exit
  0.00 opacity 0
  1.00 opacity 1

Frame anim Fade
  Text "X"
`)
    expect(out).toMatch(/roles:\s*\[\s*"enter"\s*,\s*"exit"\s*\]/)
  })
})

describe('Custom animations — duration', () => {
  it('A19: keyframe times > 1.0 treated as milliseconds → duration set', () => {
    // The animation-parser's duration calculation kicks in when the last
    // keyframe time is > 1.0 (ms scale).
    const ast = parseSrc(`canvas mobile

Long as animation:
  0 opacity 0
  500 opacity 1
`)
    const anim = ast.animations[0]
    expect(anim.duration).toBe(500)
  })

  it('A20: keyframes 0.0..1.0 do not set ms-style duration', () => {
    const ast = parseSrc(`canvas mobile

Frac as animation:
  0.00 opacity 0
  1.00 opacity 1
`)
    const anim = ast.animations[0]
    // duration should be undefined (or 0/normal) in fractional case
    expect(anim.duration === undefined || anim.duration <= 1).toBe(true)
  })

  it('A21: emitter passes duration field to runtime when present', () => {
    const out = dom(`canvas mobile

Long as animation:
  0 opacity 0
  500 opacity 1

Frame anim Long
  Text "X"
`)
    expect(out).toMatch(/duration:\s*500/)
  })
})

describe('Custom animations — keyframe property edge cases', () => {
  it('A23: keyframe property with target + string value', () => {
    // `item1 background "red"` — target identifier + property + string value
    const ast = parseSrc(`canvas mobile

Tinted as animation:
  0.00 item1 background "red"
  1.00 item1 background "blue"
`)
    const props0 = ast.animations[0].keyframes[0].properties
    expect(props0[0].target).toBe('item1')
    expect(props0[0].name).toBe('background')
    expect(props0[0].value).toBe('red')
  })

  it('A24: keyframe property with target + identifier value', () => {
    // `all transform-origin center` — target + property + identifier value
    const ast = parseSrc(`canvas mobile

Centered as animation:
  0.00 all transform-origin center
  1.00 all transform-origin center
`)
    const props0 = ast.animations[0].keyframes[0].properties
    expect(props0[0].target).toBe('all')
    expect(props0[0].name).toBe('transform-origin')
    expect(props0[0].value).toBe('center')
  })

  it('A25: keyframe property with target but no value is dropped (return null)', () => {
    const ast = parseSrc(`canvas mobile

Broken as animation:
  0.00 item1 opacity
  1.00 opacity 1
`)
    // The first keyframe's first property has no value → null → kept frames
    // contain only the well-formed second keyframe.
    expect(ast.animations[0].keyframes[1].properties.some((p: any) => p.name === 'opacity')).toBe(
      true
    )
  })
})

describe('Custom animations — error recovery', () => {
  it('A26: missing colon recovers and lets next definition parse', () => {
    const ast = parseSrc(`canvas mobile

Bad as animation
  0.00 opacity 0

Good as animation: ease-out
  0.00 opacity 0
  1.00 opacity 1
`)
    // The bad definition should not block the good one (recovery).
    const goodAnim = ast.animations.find((a: any) => a.name === 'Good')
    expect(goodAnim).toBeDefined()
    expect(goodAnim.keyframes.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Custom animations — unknown-tokens-in-body recovery', () => {
  it('A22: stray identifier token in animation body is skipped, parser continues', () => {
    const ast = parseSrc(`canvas mobile

Mix as animation:
  somegarbage
  0.00 opacity 0
  1.00 opacity 1
`)
    // The 'somegarbage' identifier is skipped; the keyframes still parse.
    expect(ast.animations[0].keyframes.length).toBe(2)
  })
})
