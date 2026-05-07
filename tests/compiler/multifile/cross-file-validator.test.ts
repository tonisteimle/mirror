/**
 * Cross-File Validator Tests
 *
 * Validates the four error classes the validator emits across files.
 */

import { describe, it, expect } from 'vitest'
import { validateProject } from '../../../compiler/loader/cross-file-validator'

describe('validateProject(): undefined tokens', () => {
  it('passes when all token references resolve', () => {
    const errors = validateProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1\nprimary.col: white' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame bg $primary, col $primary' },
    ])
    expect(errors.filter(e => e.code === 'undefined-token')).toHaveLength(0)
  })

  it('flags an unresolved token reference with file + line', () => {
    const errors = validateProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame bg $secondary' },
    ])
    const undefinedErrors = errors.filter(e => e.code === 'undefined-token')
    expect(undefinedErrors).toHaveLength(1)
    expect(undefinedErrors[0].filename).toBe('app.mir')
    expect(undefinedErrors[0].message).toContain('secondary')
  })

  it('suggests a similar token name for a typo', () => {
    const errors = validateProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame bg $primry' },
    ])
    const undefinedErrors = errors.filter(e => e.code === 'undefined-token')
    expect(undefinedErrors).toHaveLength(1)
    expect(undefinedErrors[0].suggestion).toBe('primary')
  })

  it('accepts base-name token refs (`$primary` for `primary.bg`)', () => {
    const errors = validateProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1\nprimary.col: white' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame bg $primary' },
    ])
    expect(errors.filter(e => e.code === 'undefined-token')).toHaveLength(0)
  })

  it('accepts exact token refs with suffix (`$primary.col`)', () => {
    const errors = validateProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1\nprimary.col: white' },
      { filename: 'app.mir', content: 'canvas mobile\n\nText col $primary.col' },
    ])
    expect(errors.filter(e => e.code === 'undefined-token')).toHaveLength(0)
  })
})

describe('validateProject(): undefined components', () => {
  it('passes when all component references resolve', () => {
    const errors = validateProject([
      { filename: 'components.mir', content: 'Btn: pad 12, bg #2271C1' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Btn "Click"' },
    ])
    expect(errors.filter(e => e.code === 'undefined-component')).toHaveLength(0)
  })

  it('flags an unresolved component', () => {
    const errors = validateProject([
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  MyBtn "Click"' },
    ])
    const undefinedErrors = errors.filter(e => e.code === 'undefined-component')
    expect(undefinedErrors).toHaveLength(1)
    expect(undefinedErrors[0].message).toContain('MyBtn')
  })

  it('does not flag built-in primitives (Frame, Button, Text, etc.)', () => {
    const errors = validateProject([
      {
        filename: 'app.mir',
        content: `canvas mobile

Frame
  Text "Hi"
  Button "Click"
  Icon "check"
  Image src "x.jpg"`,
      },
    ])
    expect(errors.filter(e => e.code === 'undefined-component')).toHaveLength(0)
  })

  it('suggests a similar component name for a typo', () => {
    const errors = validateProject([
      { filename: 'components.mir', content: 'PrimaryBtn: pad 12 24, bg #2271C1' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  PrimryBtn "Click"' },
    ])
    const undefinedErrors = errors.filter(e => e.code === 'undefined-component')
    expect(undefinedErrors).toHaveLength(1)
    expect(undefinedErrors[0].suggestion).toBe('PrimaryBtn')
  })
})

describe('validateProject(): duplicate tokens', () => {
  it('flags a token defined in two files with different values', () => {
    const errors = validateProject([
      { filename: 'tokens-a.mir', content: 'primary.bg: #2271C1' },
      { filename: 'tokens-b.mir', content: 'primary.bg: #1E5BA8' },
    ])
    const dupErrors = errors.filter(e => e.code === 'duplicate-token')
    expect(dupErrors).toHaveLength(1)
    expect(dupErrors[0].message).toContain('primary.bg')
    expect(dupErrors[0].otherFile).toBe('tokens-a.mir')
  })

  it('does not flag the same token defined twice with the SAME value', () => {
    // Identical re-definitions are a no-op (effectively redundant but
    // not incorrect). Only divergent values are flagged.
    const errors = validateProject([
      { filename: 'tokens-a.mir', content: 'primary.bg: #2271C1' },
      { filename: 'tokens-b.mir', content: 'primary.bg: #2271C1' },
    ])
    expect(errors.filter(e => e.code === 'duplicate-token')).toHaveLength(0)
  })
})

describe('validateProject(): no false positives in normal demos', () => {
  it('passes a typical multi-file demo without errors', () => {
    const errors = validateProject([
      {
        filename: 'tokens.mir',
        content: `primary.bg: #2271C1
primary.col: white
card.bg: #1a1a1a
card.rad: 8`,
      },
      {
        filename: 'components.mir',
        content: `Btn: pad 12 24, rad 6, bg $primary, col $primary
Card: bg $card, rad $card, gap 8, pad 16`,
      },
      {
        filename: 'app.mir',
        content: `canvas mobile

Frame gap 12
  Card
    Text "Title", col $primary
    Btn "Save"`,
      },
    ])
    expect(errors).toEqual([])
  })

  it('passes an empty project', () => {
    expect(validateProject([])).toEqual([])
  })
})
