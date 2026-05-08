/**
 * Prose-Mode Parser Tests
 *
 * Covers the prose-body-parser feature: a Frame (or component
 * definition) carrying the `prose` property has its body parsed as a
 * Markdown subset (paragraphs, bullets, headings, numbered lists)
 * instead of normal Mirror syntax.
 *
 * See docs/domain-dsl-roadmap.md "Prosa-Mode" for the spec.
 */

import { describe, test, expect } from 'vitest'
import { parseWithDiagnostics } from '../../compiler/parser/parser'
import type { Instance, ComponentDefinition } from '../../compiler/parser/ast'

/** Find the first top-level Instance with a given component name. */
function findInstance(
  ast: ReturnType<typeof parseWithDiagnostics>['ast'],
  name: string
): Instance | undefined {
  return ast.instances.find(i => i.component === name) as Instance | undefined
}

/** Recursively find first descendant with the given component name. */
function findDescendant(node: Instance, name: string): Instance | undefined {
  if (node.component === name) return node
  for (const child of node.children) {
    if (child && (child as Instance).type === 'Instance') {
      const result = findDescendant(child as Instance, name)
      if (result) return result
    }
  }
  return undefined
}

/** Read the `content` property string of an Instance. */
function content(node: Instance): string | undefined {
  const prop = node.properties.find(p => p.name === 'content')
  return prop?.values[0] as string | undefined
}

/** Find a top-level component definition by name. */
function findComponent(
  ast: ReturnType<typeof parseWithDiagnostics>['ast'],
  name: string
): ComponentDefinition | undefined {
  return ast.components.find(c => c.name === name)
}

describe('Prose-Mode — Property recognition', () => {
  test('`, prose` is parsed as a boolean property on a Frame', () => {
    const { ast } = parseWithDiagnostics(`Frame, prose`)
    const frame = findInstance(ast, 'Frame')
    expect(frame).toBeDefined()
    const prose = frame!.properties.find(p => p.name === 'prose')
    expect(prose).toBeDefined()
    expect(prose!.values[0]).toBe(true)
  })

  test('`, prose` on component definition is preserved', () => {
    const { ast } = parseWithDiagnostics(`Article as Frame: gap 18, prose`)
    const def = findComponent(ast, 'Article')
    expect(def).toBeDefined()
    const prose = def!.properties.find(p => p.name === 'prose')
    expect(prose).toBeDefined()
    expect(prose!.values[0]).toBe(true)
  })
})

describe('Prose-Mode — Bare strings as paragraphs', () => {
  test('a single bare-string line becomes a BodyTxt instance', () => {
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

ProseBody
  Hello world.
`
    const { ast, lexerErrors } = parseWithDiagnostics(src)
    expect(lexerErrors).toHaveLength(0)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(1)
    const para = body.children[0] as Instance
    expect(para.component).toBe('BodyTxt')
    expect(content(para)).toBe('Hello world.')
  })

  test('lines wrapped across two source lines join into one paragraph', () => {
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

ProseBody
  This is a sentence
  that wraps to two source lines.
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(1)
    expect(content(body.children[0] as Instance)).toBe(
      'This is a sentence that wraps to two source lines.'
    )
  })

  test('blank line separates paragraphs', () => {
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

ProseBody
  First paragraph.

  Second paragraph.
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(2)
    expect(content(body.children[0] as Instance)).toBe('First paragraph.')
    expect(content(body.children[1] as Instance)).toBe('Second paragraph.')
  })
})

describe('Prose-Mode — Bullets', () => {
  test('`- text` lines become DashItem with BodyTxtCompact child', () => {
    const src = `BodyTxtCompact as Text: fs 17
DashItem: hor, gap 24

ProseBody as Frame: prose

ProseBody
  - First bullet
  - Second bullet
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(2)
    const first = body.children[0] as Instance
    expect(first.component).toBe('DashItem')
    expect(first.children).toHaveLength(1)
    const txt = first.children[0] as Instance
    expect(txt.component).toBe('BodyTxtCompact')
    expect(content(txt)).toBe('First bullet')
  })

  test('indent-nested bullets become nested DashItems', () => {
    const src = `BodyTxtCompact as Text: fs 17
DashItem: hor, gap 24

ProseBody as Frame: prose

ProseBody
  - Top level
    - Sub one
    - Sub two
  - Top again
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(2)

    const top1 = body.children[0] as Instance
    expect(top1.component).toBe('DashItem')
    // Children of top1: [text, sub1, sub2]
    expect(top1.children.length).toBe(3)
    expect((top1.children[0] as Instance).component).toBe('BodyTxtCompact')
    expect((top1.children[1] as Instance).component).toBe('DashItem')
    expect((top1.children[2] as Instance).component).toBe('DashItem')

    const sub1 = top1.children[1] as Instance
    expect(content(sub1.children[0] as Instance)).toBe('Sub one')
  })
})

describe('Prose-Mode — Headings', () => {
  test('# / ## / ### map to H2 / H3 / H4 by default', () => {
    const src = `H2 as Text: fs 44
H3 as Text: fs 28
H4 as Text: fs 19

ProseBody as Frame: prose

ProseBody
  # Top heading
  ## Section heading
  ### Subsection heading
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(3)
    expect((body.children[0] as Instance).component).toBe('H2')
    expect((body.children[1] as Instance).component).toBe('H3')
    expect((body.children[2] as Instance).component).toBe('H4')
    expect(content(body.children[0] as Instance)).toBe('Top heading')
  })
})

describe('Prose-Mode — Numbered lists', () => {
  test('`1. text` becomes OffenePunkt with zero-padded OffeneNum', () => {
    const src = `OffenePunkt as Frame: hor, gap 24
OffeneNum as Text: fs 14
BodyTxtCompact as Text: fs 17

ProseBody as Frame: prose

ProseBody
  1. First item.
  2. Second item.
  10. Tenth item.
`
    const { ast } = parseWithDiagnostics(src)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(3)

    const first = body.children[0] as Instance
    expect(first.component).toBe('OffenePunkt')
    expect(first.children).toHaveLength(2)
    const num = first.children[0] as Instance
    expect(num.component).toBe('OffeneNum')
    expect(content(num)).toBe('01')
    const txt = first.children[1] as Instance
    expect(txt.component).toBe('BodyTxtCompact')
    expect(content(txt)).toBe('First item.')

    // 10 → "10" not "010" (only single-digit gets zero-padded to width 2)
    expect(content(body.children[2]!.children?.[0] as Instance)).toBe('10')
  })
})

describe('Prose-Mode — Component-definition propagation', () => {
  test('Use-site of a `prose`-marked component inherits prose mode', () => {
    const src = `BodyTxt as Text: fs 17

Article as Frame: gap 18, prose

Article
  Implicit prose body via component definition.
`
    const { ast, lexerErrors } = parseWithDiagnostics(src)
    expect(lexerErrors).toHaveLength(0)
    const article = findInstance(ast, 'Article')!
    // Even though the use-site doesn't write `, prose`, the body
    // is parsed as prose because the definition has it.
    expect(article.children).toHaveLength(1)
    expect((article.children[0] as Instance).component).toBe('BodyTxt')
  })
})

describe('Prose-Mode — Lex-error filtering', () => {
  test('umlauts, em-dashes, guillemets in prose body do not surface as errors', () => {
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

ProseBody
  Lukas verkörpert das Segment der **hochkompetenten** Maturand:innen — die
  FH und Universität ernsthaft gegeneinander abwägen.

  «Schaffe ich das?» fragen sie sich.
`
    const { ast, lexerErrors } = parseWithDiagnostics(src)
    // Without prose-mode, all the unicode chars (ö, —, «, ») would
    // have generated unknown-character errors. The filter removes them.
    expect(lexerErrors).toHaveLength(0)
    const body = findInstance(ast, 'ProseBody')!
    expect(body.children).toHaveLength(2)
    expect(content(body.children[0] as Instance)).toContain('verkörpert')
    expect(content(body.children[0] as Instance)).toContain('—')
    expect(content(body.children[1] as Instance)).toContain('«Schaffe')
  })

  test('lex errors OUTSIDE prose body are still reported', () => {
    // `«` and `—` are unknown chars (not unicode letters) for the
    // Mirror lexer; ö/ü/ä are accepted as identifier chars.
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

ProseBody
  Inside prose: «fine here, even with em-dash —».

NonProse «not okay»
`
    const { lexerErrors } = parseWithDiagnostics(src)
    expect(lexerErrors.length).toBeGreaterThan(0)
    // Prose body sits on lines 5–6; errors on line 8 should remain.
    for (const e of lexerErrors) {
      expect(e.line).toBeGreaterThanOrEqual(8)
    }
  })
})

describe('Prose-Mode — Mixed with normal Mirror', () => {
  test('non-prose siblings of a prose block are unaffected', () => {
    const src = `BodyTxt as Text: fs 17

ProseBody as Frame: prose

Frame
  ProseBody
    A paragraph.
  Button "Click me", bg #2271C1
`
    const { ast } = parseWithDiagnostics(src)
    const frame = findInstance(ast, 'Frame')!
    expect(frame.children).toHaveLength(2)
    const body = frame.children[0] as Instance
    expect(body.component).toBe('ProseBody')
    expect(body.children).toHaveLength(1)
    const button = frame.children[1] as Instance
    expect(button.component).toBe('Button')
    expect(content(button)).toBe('Click me')
  })

  test('variable interpolation works inside prose paragraphs', () => {
    const src = `BodyTxt as Text: fs 17

person:
  name: "Lukas"

Article as Frame: prose

Article
  Hello $person.name, welcome.
`
    const { ast } = parseWithDiagnostics(src)
    const article = findInstance(ast, 'Article')!
    const para = article.children[0] as Instance
    // The text is captured as-is; runtime resolves $person.name.
    expect(content(para)).toContain('$person.name')
  })
})
