import { describe, it, expect } from 'vitest'
import { parseWithDiagnostics } from '../../compiler/parser'
import { validate } from '../../compiler/validator'
import { validateProject } from '../../compiler/loader/cross-file-validator'

const COMPONENTS_COM = `
Article as Frame: gap 18, prose
WarumBlock as Frame: maxw 920, gap 16, prose
NormalCard as Frame: bg #fff, pad 16

// Required by prose-body synthesis (BodyTxt for paragraphs, DashItem +
// BodyTxtCompact for "- bullet" lines, H3 for "## heading", etc.)
BodyTxt as Text: fs 17
BodyTxtCompact as Text: fs 17
DashItem as Frame: hor, gap 8
H2 as Text: fs 28
H3 as Text: fs 22
H4 as Text: fs 18
`

const APP_USING_PROSE = `
canvas mobile

WarumBlock
  ## Warum?
  **Bold** und *italic* sind erlaubt.

  - «Erste Frage?»
  - Zweite Frage — mit em-dash und Umlauten: ä ö ü
`

describe('prose-prelude — parser API', () => {
  it('without prelude, prose body of cross-file component is parsed as Mirror (lex errors)', () => {
    const { lexerErrors } = parseWithDiagnostics(APP_USING_PROSE)
    // Without prelude, the parser doesn't know WarumBlock is prose-mode.
    // The body's «»— and umlauts trigger lexer errors.
    expect(lexerErrors.length).toBeGreaterThan(0)
  })

  it('with prelude, prose body is parsed as prose (no lex errors)', () => {
    const proseComponentPrelude = new Set(['WarumBlock'])
    const { lexerErrors } = parseWithDiagnostics(APP_USING_PROSE, { proseComponentPrelude })
    // With prelude, parser switches to prose-body parsing — no lex errors.
    expect(lexerErrors.length).toBe(0)
  })

  it('local component definition still wins over prelude (regression)', () => {
    // If WarumBlock is locally defined as a regular Frame, prelude
    // shouldn't override that. (The local def has no `, prose`.)
    const sourceWithLocalDef = `
WarumBlock as Frame: bg #fff, pad 16

WarumBlock
  Text "regular"
`
    const proseComponentPrelude = new Set(['WarumBlock'])
    const { lexerErrors } = parseWithDiagnostics(sourceWithLocalDef, {
      proseComponentPrelude,
    })
    expect(lexerErrors.length).toBe(0)
  })
})

describe('prose-prelude — validator API', () => {
  it('without prelude, validate flags umlauts as lex errors', () => {
    const result = validate(APP_USING_PROSE)
    const lexErrors = result.errors.filter(e => e.code === 'E012')
    expect(lexErrors.length).toBeGreaterThan(0)
  })

  it('with prelude, validate accepts prose body', () => {
    const result = validate(APP_USING_PROSE, {
      proseComponentPrelude: new Set(['WarumBlock']),
    })
    const lexErrors = result.errors.filter(e => e.code === 'E012')
    expect(lexErrors.length).toBe(0)
  })
})

describe('prose-prelude — cross-file validator', () => {
  it('cross-file pass auto-discovers prose components and parses bodies as prose', () => {
    const errors = validateProject([
      { filename: 'components.com', content: COMPONENTS_COM },
      { filename: 'app.mir', content: APP_USING_PROSE },
    ])
    // Without auto-prose-prelude, this would emit 10+ undefined-component
    // errors for the German words inside the prose body. With auto-discovery,
    // the prose body is treated correctly and there are no spurious refs.
    const undefinedComps = errors.filter(e => e.code === 'undefined-component')
    expect(undefinedComps.length).toBe(0)
  })

  it('cross-file pass still detects real undefined components', () => {
    const errors = validateProject([
      { filename: 'components.com', content: COMPONENTS_COM },
      {
        filename: 'app.mir',
        content: `canvas mobile\nDoesNotExist`,
      },
    ])
    expect(errors.some(e => e.code === 'undefined-component')).toBe(true)
  })

  it('cross-file pass distinguishes prose components from non-prose ones', () => {
    const errors = validateProject([
      { filename: 'components.com', content: COMPONENTS_COM },
      {
        // NormalCard does NOT have `, prose` — its body is parsed as
        // regular Mirror, so umlauts SHOULD trigger errors.
        filename: 'app.mir',
        content: `canvas mobile\nNormalCard\n  Text "ok"`,
      },
    ])
    expect(errors.some(e => e.code === 'undefined-component')).toBe(false)
  })
})
