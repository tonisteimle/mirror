import { describe, it, expect } from 'vitest'
import { validate } from '../../compiler/validator'

function errorCodes(source: string): string[] {
  const r = validate(source)
  return r.errors.map(e => e.code)
}

function warningCodes(source: string): string[] {
  const r = validate(source)
  return r.warnings.map(e => e.code)
}

describe('strict typing — CSS length-with-unit suffixes', () => {
  it('accepts 60ch on max-width', () => {
    expect(errorCodes(`canvas mobile\nFrame maxw 60ch`)).not.toContain('E101')
  })

  it('accepts 1.5em on padding', () => {
    expect(errorCodes(`canvas mobile\nFrame pad 1.5em`)).not.toContain('E101')
  })

  it('accepts 100vh on height', () => {
    expect(errorCodes(`canvas mobile\nFrame h 100vh`)).not.toContain('E101')
  })

  it('accepts 10px (px suffix)', () => {
    expect(errorCodes(`canvas mobile\nFrame w 10px`)).not.toContain('E101')
  })

  it('accepts 50% (existing behavior preserved)', () => {
    expect(errorCodes(`canvas mobile\nFrame w 50%`)).not.toContain('E101')
  })

  it('accepts 1rem on font-size', () => {
    expect(errorCodes(`canvas mobile\nText "x", fs 1rem`)).not.toContain('E101')
  })

  it('rejects bogus unit suffix on numeric props', () => {
    // Garbage like `60xy` should still error — not a known length unit.
    expect(errorCodes(`canvas mobile\nFrame maxw 60xy`)).toContain('E101')
  })
})

describe('strict typing — auto keyword on spacing', () => {
  it('accepts mar 0 auto (centering pattern)', () => {
    expect(errorCodes(`canvas mobile\nFrame mar 0 auto`)).not.toContain('E101')
  })

  it('accepts pad auto', () => {
    expect(errorCodes(`canvas mobile\nFrame pad auto`)).not.toContain('E101')
  })

  it('still rejects auto on opacity (not spacing/sizing)', () => {
    expect(errorCodes(`canvas mobile\nFrame opacity auto`)).toContain('E101')
  })
})

describe('strict typing — ver-baseline alignment', () => {
  it('accepts ver-baseline as a property', () => {
    expect(errorCodes(`canvas mobile\nFrame hor, ver-baseline\n  Text "x"`)).not.toContain('E100')
  })
})

describe('strict typing — value ranges', () => {
  it('opacity > 1 fails E105', () => {
    expect(errorCodes(`canvas mobile\nFrame opacity 5`)).toContain('E105')
  })

  it('opacity < 0 fails E105', () => {
    expect(errorCodes(`canvas mobile\nFrame opacity -1`)).toContain('E105')
  })

  it('opacity 0.5 OK', () => {
    expect(errorCodes(`canvas mobile\nFrame opacity 0.5`)).not.toContain('E105')
  })

  it('weight > 1000 fails', () => {
    expect(errorCodes(`canvas mobile\nText "x", weight 9000`)).toContain('E105')
  })

  it('weight 600 OK', () => {
    expect(errorCodes(`canvas mobile\nText "x", weight 600`)).not.toContain('E105')
  })

  it('width negative fails', () => {
    expect(errorCodes(`canvas mobile\nFrame w -10`)).toContain('E105')
  })

  it('rad negative fails', () => {
    expect(errorCodes(`canvas mobile\nFrame rad -5`)).toContain('E105')
  })

  it('fs zero is allowed', () => {
    expect(errorCodes(`canvas mobile\nText "x", fs 0`)).not.toContain('E105')
  })

  it('threshold > 1 fails', () => {
    expect(errorCodes(`canvas mobile\nFrame anim fade-in, threshold 5`)).toContain('E105')
  })
})

describe('strict typing — layout conflicts', () => {
  it('hidden + visible conflict', () => {
    expect(errorCodes(`canvas mobile\nFrame hidden, visible`)).toContain('E110')
  })

  it('clip + scroll conflict', () => {
    expect(errorCodes(`canvas mobile\nFrame clip, scroll`)).toContain('E110')
  })

  it('clip + scroll-hor conflict', () => {
    expect(errorCodes(`canvas mobile\nFrame clip, scroll-hor`)).toContain('E110')
  })

  it('hor + ver still flagged (preserved)', () => {
    expect(errorCodes(`canvas mobile\nFrame hor, ver`)).toContain('E110')
  })

  it('hidden alone is OK', () => {
    expect(errorCodes(`canvas mobile\nFrame hidden`)).not.toContain('E110')
  })

  it('scroll alone is OK', () => {
    expect(errorCodes(`canvas mobile\nFrame scroll`)).not.toContain('E110')
  })
})

describe('strict typing — required properties', () => {
  it('Image without src reports MISSING_REQUIRED', () => {
    expect(errorCodes(`canvas mobile\nImage`)).toContain('E120')
  })

  it('Link without href reports MISSING_REQUIRED', () => {
    expect(errorCodes(`canvas mobile\nLink "click"`)).toContain('E120')
  })

  it('Image with src is OK', () => {
    expect(errorCodes(`canvas mobile\nImage src "foo.png"`)).not.toContain('E120')
  })

  it('Link with href is OK', () => {
    expect(errorCodes(`canvas mobile\nLink "click", href "/page"`)).not.toContain('E120')
  })
})

describe('strict typing — did-you-mean for unknown properties', () => {
  it('typo in property name surfaces a suggestion', () => {
    const result = validate(`canvas mobile\nFrame pading 16`)
    const e = result.errors.find(e => e.code === 'E100')
    expect(e).toBeDefined()
    expect(e!.suggestion).toContain('padding')
  })

  it('typo in primitive name surfaces a suggestion', () => {
    const result = validate(`canvas mobile\nFrane`)
    // Capitalized typo flows through the component-resolution path
    // (E002), with a Levenshtein suggestion pointing at the primitive.
    const e = result.errors.find(e => e.code === 'E002')
    expect(e).toBeDefined()
    expect(e!.suggestion?.toLowerCase()).toContain('frame')
  })
})

describe('strict typing — duplicate property warning still fires', () => {
  it('duplicate bg flagged W110', () => {
    expect(warningCodes(`canvas mobile\nFrame bg #fff, bg #000`)).toContain('W110')
  })
})
