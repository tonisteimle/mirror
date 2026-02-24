/**
 * Parser Tests: Token Suffix Inference
 *
 * Token names with specific suffixes automatically infer the property type.
 * - -color → background
 * - -size → text-size
 * - -padding/-spacing → padding
 * - -radius → border-radius
 * - -gap → gap (g)
 * - -border → border-width
 *
 * NOTE: Component-aware inference (e.g., -color → col for Text) is NOT yet implemented.
 * Those tests remain skipped.
 */

import { describe, it, expect } from 'vitest'
import { props, parse } from '../../test-utils'

describe('Color Suffix Inference', () => {
  const colorCases: [string, string, string][] = [
    ['$bg-color: #333', 'Box $bg-color', 'bg'],
    ['$primary-color: #3B82F6', 'Button $primary-color', 'bg'],
    ['$surface-color: #1E1E2E', 'Card $surface-color', 'bg'],
  ]

  it.each(colorCases)(
    '%s applied to %s infers %s',
    (tokenDef, usage, expectedProp) => {
      const code = `${tokenDef}\n${usage}`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes[0].properties[expectedProp]).toBeDefined()
    }
  )

  it('$bg-color applies as background', () => {
    const p = props(`$bg-color: #333
Box $bg-color`)
    expect(p.bg).toBe('#333')
  })
})

describe('Size Suffix Inference', () => {
  it('$title-size infers text-size', () => {
    const p = props(`$title-size: 24
Text $title-size`)
    expect(p['text-size']).toBe(24)
  })

  it('$heading-size infers text-size', () => {
    const p = props(`$heading-size: 32
Text $heading-size`)
    expect(p['text-size']).toBe(32)
  })
})

describe('Padding/Spacing Suffix Inference', () => {
  it('$card-padding infers pad', () => {
    const p = props(`$card-padding: 16
Card $card-padding`)
    expect(p.pad).toBe(16)
  })

  it('$section-spacing infers pad', () => {
    const p = props(`$section-spacing: 24
Box $section-spacing`)
    expect(p.pad).toBe(24)
  })

  it('$content-padding infers pad', () => {
    const p = props(`$content-padding: 12
Container $content-padding`)
    expect(p.pad).toBe(12)
  })
})

describe('Radius Suffix Inference', () => {
  it('$btn-radius infers rad', () => {
    const p = props(`$btn-radius: 8
Button $btn-radius`)
    expect(p.rad).toBe(8)
  })

  it('$card-radius infers rad', () => {
    const p = props(`$card-radius: 12
Card $card-radius`)
    expect(p.rad).toBe(12)
  })
})

describe('Gap Suffix Inference', () => {
  it('$list-gap infers gap', () => {
    const p = props(`$list-gap: 12
Box $list-gap`)
    expect(p.g).toBe(12)
  })

  it('$content-gap infers gap', () => {
    const p = props(`$content-gap: 8
Container $content-gap`)
    expect(p.g).toBe(8)
  })
})

describe('Border Suffix Inference', () => {
  it('$frame-border infers border width', () => {
    const p = props(`$frame-border: 2
Box $frame-border`)
    expect(p.bor).toBe(2)
  })

  it('$input-border infers border width', () => {
    const p = props(`$input-border: 1
Input $input-border`)
    expect(p.bor).toBe(1)
  })
})

describe('No Inference for Regular Tokens', () => {
  it('token without suffix requires explicit property', () => {
    const p = props(`$primary: #3B82F6
Box bg $primary`)
    expect(p.bg).toBe('#3B82F6')
  })

  it('token with unknown suffix requires explicit property', () => {
    const p = props(`$main-value: 16
Box pad $main-value`)
    expect(p.pad).toBe(16)
  })
})

describe('Multiple Inferred Tokens', () => {
  it('uses multiple inferred tokens', () => {
    const code = `$bg-color: #1E1E2E
$card-padding: 16
$card-radius: 8
Card $bg-color, $card-padding, $card-radius`
    const p = props(code)
    expect(p.bg).toBe('#1E1E2E')
    expect(p.pad).toBe(16)
    expect(p.rad).toBe(8)
  })
})
