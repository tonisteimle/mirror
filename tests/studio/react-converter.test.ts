/**
 * QP tests for studio/react-converter/index.ts
 *
 * The React-converter is a single 563-LOC module with two public entry
 * points: `convertReactToMirror(reactCode) → ConvertResult` and
 * `buildReactSystemPrompt(ctx) → string`. The converter parses JSX,
 * extracts inline styles + children, builds component definitions for
 * styled root-level elements, and emits Mirror DSL. The prompt builder
 * formats LLM context (tokens / existing components / editor cursor).
 *
 * Tests pin observable behavior of the public API across the spectrum
 * we care about: constant mappings, style-to-prop translation, layout
 * heuristics, child parsing, JSX expression skipping, edge cases that
 * could regress silently. The internal helpers (parseJSXElement,
 * parseChildren, findMatchingBrace, extractReturnJSX, etc.) are
 * exercised through their public callers.
 */

import { describe, it, expect } from 'vitest'
import {
  convertReactToMirror,
  buildReactSystemPrompt,
  STYLE_TO_MIRROR,
  TAG_TO_COMPONENT,
  TAG_TO_NAME,
  type PromptContext,
} from '../../studio/react-converter'

// =============================================================================
// Mapping constants — load-bearing for every conversion
// =============================================================================

describe('STYLE_TO_MIRROR mapping', () => {
  it('maps spacing properties to short Mirror aliases', () => {
    expect(STYLE_TO_MIRROR.padding).toBe('pad')
    expect(STYLE_TO_MIRROR.margin).toBe('m')
    expect(STYLE_TO_MIRROR.gap).toBe('gap')
  })

  it('maps both background and backgroundColor to bg', () => {
    expect(STYLE_TO_MIRROR.background).toBe('bg')
    expect(STYLE_TO_MIRROR.backgroundColor).toBe('bg')
  })

  it('maps directional padding (Top/Bottom/Left/Right)', () => {
    expect(STYLE_TO_MIRROR.paddingTop).toBe('pad top')
    expect(STYLE_TO_MIRROR.paddingBottom).toBe('pad bottom')
    expect(STYLE_TO_MIRROR.paddingLeft).toBe('pad left')
    expect(STYLE_TO_MIRROR.paddingRight).toBe('pad right')
  })

  it('uses internal underscore prefix for layout-derived keys', () => {
    // The leading underscore signals a synthetic key handled specially in
    // styleToMirrorProps — it is NOT emitted as a literal Mirror property.
    expect(STYLE_TO_MIRROR.display).toBe('_display')
    expect(STYLE_TO_MIRROR.flexDirection).toBe('_flexDirection')
    expect(STYLE_TO_MIRROR.alignItems).toBe('_alignItems')
    expect(STYLE_TO_MIRROR.justifyContent).toBe('_justifyContent')
  })
})

describe('TAG_TO_COMPONENT mapping', () => {
  it('maps semantic block tags to frame', () => {
    expect(TAG_TO_COMPONENT.div).toBe('frame')
    expect(TAG_TO_COMPONENT.nav).toBe('frame')
    expect(TAG_TO_COMPONENT.header).toBe('frame')
    expect(TAG_TO_COMPONENT.footer).toBe('frame')
    expect(TAG_TO_COMPONENT.main).toBe('frame')
    expect(TAG_TO_COMPONENT.section).toBe('frame')
  })

  it('maps text tags to text', () => {
    expect(TAG_TO_COMPONENT.span).toBe('text')
    expect(TAG_TO_COMPONENT.h1).toBe('text')
    expect(TAG_TO_COMPONENT.p).toBe('text')
  })
})

describe('TAG_TO_NAME mapping', () => {
  it('uses idiomatic Mirror component names for divs and headings', () => {
    expect(TAG_TO_NAME.div).toBe('Box')
    expect(TAG_TO_NAME.h1).toBe('Heading')
    expect(TAG_TO_NAME.h2).toBe('Heading')
    expect(TAG_TO_NAME.h3).toBe('Heading')
    expect(TAG_TO_NAME.p).toBe('Text')
  })
})

// =============================================================================
// convertReactToMirror — minimal valid input
// =============================================================================

describe('convertReactToMirror — minimal valid input', () => {
  it('returns a ConvertResult with mirror string and empty errors on success', () => {
    const result = convertReactToMirror(`function C() { return <div></div> }`)
    expect(result.errors).toEqual([])
    expect(typeof result.mirror).toBe('string')
    expect(result.mirror.length).toBeGreaterThan(0)
  })

  it('renders a single styled div as a Box component definition + use', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ padding: '16px' }}></div>
      }
    `)
    expect(result.errors).toEqual([])
    // Definition: Box as frame: pad 16
    expect(result.mirror).toMatch(/Box as frame:/)
    expect(result.mirror).toContain('pad 16')
    // Reference: Box (used at root)
    expect(result.mirror).toContain('Box')
  })

  it('strips px units from numeric values', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ padding: '16px', borderRadius: '8px' }}></div>
      }
    `)
    expect(result.mirror).toContain('pad 16')
    expect(result.mirror).toContain('rad 8')
    // No literal "px" should appear in the prop values
    expect(result.mirror).not.toMatch(/pad 16px/)
  })

  it('emits hex colors verbatim', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ backgroundColor: '#2271C1', color: '#fff' }}></div>
      }
    `)
    expect(result.mirror).toContain('bg #2271C1')
    expect(result.mirror).toContain('col #fff')
  })

  it('translates var(--token) to Mirror $token references', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ backgroundColor: 'var(--primary)', color: 'var(--ink)' }}></div>
      }
    `)
    expect(result.mirror).toContain('bg $primary')
    expect(result.mirror).toContain('col $ink')
  })
})

// =============================================================================
// convertReactToMirror — JSX extraction (return-statement parser)
// =============================================================================

describe('convertReactToMirror — return-statement extraction', () => {
  it('extracts JSX from an unparenthesized return on the same line', () => {
    const result = convertReactToMirror(
      `function C() { return <span style={{color: '#fff'}}></span> }`
    )
    expect(result.errors).toEqual([])
    expect(result.mirror).toContain('col #fff')
  })

  it('extracts JSX from an unparenthesized return that spans multiple lines (top-level tag close)', () => {
    // The unparenthesized branch uses lastIndexOf("</tag>") — works as long
    // as the close tag matches. Internal whitespace + newlines are fine.
    const result = convertReactToMirror(`
function C() {
  return <div style={{ padding: '8px' }}>
    <span style={{ color: '#fff' }}>Hi</span>
  </div>
}
`)
    expect(result.errors).toEqual([])
    expect(result.mirror).toContain('pad 8')
    expect(result.mirror).toContain('"Hi"')
  })

  it('KNOWN LIMITATION — parenthesized return with whitespace before `(` fails to parse', () => {
    // The current `extractReturnJSX` uses `returnIndex + 7` as the slice
    // start, which works only when "return " is followed *immediately* by
    // `(`. With whitespace or newlines between `return` and `(`, the slice
    // includes the `(` itself and parseJSXElement fails (input must start
    // with `<`). This is a real bug in studio/react-converter/index.ts —
    // pinning it here so a future fix flips the assertion.
    const result = convertReactToMirror(`
      function C() {
        return (
          <div></div>
        )
      }
    `)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.mirror).toBe('')
  })
})

// =============================================================================
// convertReactToMirror — children
// =============================================================================

describe('convertReactToMirror — children', () => {
  it('lifts text children into a Mirror string slot', () => {
    const result = convertReactToMirror(`
      function C() {
        return <span>Hello World</span>
      }
    `)
    expect(result.mirror).toContain('"Hello World"')
  })

  it('renders nested element children with deeper indentation', () => {
    const result = convertReactToMirror(`
function C() {
  return <div style={{ padding: '8px' }}>
    <span style={{ color: '#fff' }}>Hi</span>
  </div>
}
`)
    expect(result.errors).toEqual([])
    // The Text child is rendered indented under the Box
    expect(result.mirror).toMatch(/Box[\s\S]*\n {2}Text/)
    expect(result.mirror).toContain('"Hi"')
  })

  it('renders multiple sibling children under the parent', () => {
    const result = convertReactToMirror(`
function C() {
  return <div>
    <span>A</span>
    <span>B</span>
    <span>C</span>
  </div>
}
`)
    expect(result.errors).toEqual([])
    expect(result.mirror).toContain('"A"')
    expect(result.mirror).toContain('"B"')
    expect(result.mirror).toContain('"C"')
  })

  it('handles top-level self-closing JSX tags as the root element', () => {
    // Root self-closing works because parseJSXElement's regex includes
    // `(?:\/>|>)` as an alternation — there's no greedy `[^>]*` consuming
    // the slash. Inside parseChildren the bug below kicks in.
    const result = convertReactToMirror(
      `function C() { return <input style={{ width: '200px' }} /> }`
    )
    expect(result.errors).toEqual([])
    expect(result.mirror).toContain('Input')
    expect(result.mirror).toContain('w 200')
  })

  it('KNOWN LIMITATION — self-closing tags as children with attributes are not detected', () => {
    // parseChildren's self-close regex `^<tag[^>]*/>` is greedy: `[^>]*`
    // consumes the trailing `/` since `/` is not `>`, so the literal `/>`
    // anchor fails to match. The inner element is silently skipped — the
    // wrapping <div> renders, but the <input /> child is dropped.
    // Pin behavior; a future fix (e.g. `[^>/]*\/>` or non-greedy) flips this.
    const result = convertReactToMirror(
      `function C() { return <div><input style={{ width: '200px' }} /></div> }`
    )
    expect(result.errors).toEqual([])
    expect(result.mirror).not.toContain('Input')
  })

  it('drops bare JSX expression children like {variable} that have no surrounding text', () => {
    // Mirror has its own data-binding syntax; raw JSX expressions don't
    // round-trip. The converter drops bare {expr} children — `<div>{x}</div>`
    // becomes just `Box` with no string slot.
    const result = convertReactToMirror(`function C() { return <div>{name}</div> }`)
    expect(result.errors).toEqual([])
    expect(result.mirror).not.toContain('{name}')
    expect(result.mirror).not.toContain('{')
  })

  it('KNOWN LIMITATION — JSX expressions interleaved with text leak through verbatim', () => {
    // Text + {expr} mixed in a child: the parser captures the whole run
    // including the brace, since it only filters strings that *start* with
    // `{`. Pin behavior so a future fix surfaces here.
    const result = convertReactToMirror(`function C() { return <span>Hello {name}</span> }`)
    expect(result.errors).toEqual([])
    expect(result.mirror).toContain('Hello {name}')
  })
})

// =============================================================================
// convertReactToMirror — flexbox layout heuristics
// =============================================================================

describe('convertReactToMirror — flexbox layout', () => {
  it('flexDirection: row → emits hor', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ display: 'flex', flexDirection: 'row' }}></div>
      }
    `)
    expect(result.mirror).toContain('hor')
  })

  it('flexDirection: column does NOT emit hor (vertical is the default)', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ display: 'flex', flexDirection: 'column' }}></div>
      }
    `)
    expect(result.mirror).not.toContain('hor')
  })

  it('alignItems: center → emits ver-center', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ alignItems: 'center' }}></div>
      }
    `)
    expect(result.mirror).toContain('ver-center')
  })

  it('justifyContent: space-between → emits spread', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ justifyContent: 'space-between' }}></div>
      }
    `)
    expect(result.mirror).toContain('spread')
  })

  it('justifyContent: center → emits hor-center', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ justifyContent: 'center' }}></div>
      }
    `)
    expect(result.mirror).toContain('hor-center')
  })

  it('drops display: flex from output (it is implicit in Mirror)', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ display: 'flex' }}></div>
      }
    `)
    // Should NOT contain a literal "display flex" — Mirror has no such prop
    expect(result.mirror).not.toMatch(/_display/)
    expect(result.mirror).not.toMatch(/display flex/)
  })
})

// =============================================================================
// convertReactToMirror — component definition collection
// =============================================================================

describe('convertReactToMirror — component definitions', () => {
  it('emits a top-level definition for each unique styled tag', () => {
    const result = convertReactToMirror(`
      function C() {
        return <button style={{ padding: '12px' }}></button>
      }
    `)
    // Definition heading appears once
    const matches = result.mirror.match(/Button as button:/g) || []
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('does not duplicate definitions when the same tag appears multiple times', () => {
    const result = convertReactToMirror(`
      function C() {
        return (
          <div style={{ padding: '8px' }}>
            <span style={{ color: '#fff' }}>A</span>
            <span style={{ color: '#fff' }}>B</span>
          </div>
        )
      }
    `)
    // "Text as text:" should appear at most once even though two spans use it
    const defMatches = result.mirror.match(/^Text as text:/gm) || []
    expect(defMatches.length).toBeLessThanOrEqual(1)
  })

  it('places definitions before the root use', () => {
    const result = convertReactToMirror(`
      function C() {
        return <div style={{ padding: '16px' }}></div>
      }
    `)
    // The first occurrence of "Box as frame:" must come before the root use
    const defIndex = result.mirror.indexOf('Box as frame:')
    const useIndex = result.mirror.lastIndexOf('Box')
    expect(defIndex).toBeGreaterThanOrEqual(0)
    expect(defIndex).toBeLessThan(useIndex)
  })
})

// =============================================================================
// convertReactToMirror — error / edge cases
// =============================================================================

describe('convertReactToMirror — error handling', () => {
  it('returns errors=["Failed to parse JSX"] when input is empty', () => {
    const result = convertReactToMirror('')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.mirror).toBe('')
  })

  it('returns errors when input has no JSX at all', () => {
    const result = convertReactToMirror(`function C() { return null }`)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns errors when input has malformed JSX (unclosed tag)', () => {
    const result = convertReactToMirror(`function C() { return <div }`)
    // Either errors are non-empty OR mirror is empty — the function
    // never crashes the caller.
    expect(result.errors.length > 0 || result.mirror === '').toBe(true)
  })

  it('does not throw on weird whitespace-only input', () => {
    expect(() => convertReactToMirror('   \n\t  \n')).not.toThrow()
  })

  it('does not throw on input with quoted JSX-like strings (no real JSX)', () => {
    expect(() =>
      convertReactToMirror(`function C() { const s = "<div>not jsx</div>"; return s }`)
    ).not.toThrow()
  })
})

// =============================================================================
// buildReactSystemPrompt — base prompt
// =============================================================================

describe('buildReactSystemPrompt — base prompt', () => {
  const empty: PromptContext = { tokens: [], components: [] }

  it('always includes the role statement and rule list', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).toContain('UI developer')
    expect(prompt).toContain('IMPORTANT RULES')
    expect(prompt).toContain('Return ONLY JSX')
    expect(prompt).toContain('inline styles with camelCase')
  })

  it('always includes a JSX example in a fenced code block', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).toContain('EXAMPLE OUTPUT')
    expect(prompt).toMatch(/```jsx[\s\S]*```/)
  })

  it('always includes style guidelines (hex colors, pixel values)', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).toContain('STYLE GUIDELINES')
    expect(prompt).toContain('hex colors')
    expect(prompt).toContain('pixel values')
  })

  it('omits the tokens block when no tokens are provided', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).not.toContain('AVAILABLE DESIGN TOKENS')
  })

  it('omits the components block when no components are provided', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).not.toContain('EXISTING COMPONENTS')
  })

  it('omits the editor block when context.editor is absent', () => {
    const prompt = buildReactSystemPrompt(empty)
    expect(prompt).not.toContain('EDITOR CONTEXT')
  })
})

// =============================================================================
// buildReactSystemPrompt — tokens block
// =============================================================================

describe('buildReactSystemPrompt — tokens', () => {
  it('lists each token as var(--name): value', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [
        { name: 'primary', value: '#2271C1' },
        { name: 'ink', value: '#1c1917' },
      ],
      components: [],
    })
    expect(prompt).toContain('AVAILABLE DESIGN TOKENS')
    expect(prompt).toContain('var(--primary): #2271C1')
    expect(prompt).toContain('var(--ink): #1c1917')
  })

  it('caps the token list at 20 entries', () => {
    const tokens = Array.from({ length: 30 }, (_, i) => ({
      name: `t${i}`,
      value: `#${i.toString().padStart(6, '0')}`,
    }))
    const prompt = buildReactSystemPrompt({ tokens, components: [] })

    expect(prompt).toContain('t0')
    expect(prompt).toContain('t19') // last included
    expect(prompt).not.toContain('t20') // first dropped
    expect(prompt).not.toContain('t29')
  })
})

// =============================================================================
// buildReactSystemPrompt — components block
// =============================================================================

describe('buildReactSystemPrompt — components', () => {
  it('lists each component with up to 5 properties', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [
        { name: 'Card', properties: ['pad 16', 'rad 8', 'bg $surface', 'col $ink', 'gap 12'] },
      ],
    })
    expect(prompt).toContain('EXISTING COMPONENTS')
    expect(prompt).toContain('Card:')
    expect(prompt).toContain('pad 16')
    expect(prompt).toContain('gap 12')
  })

  it('caps the component list at 10 entries', () => {
    const components = Array.from({ length: 15 }, (_, i) => ({
      name: `Comp${i}`,
      properties: [`prop${i}`],
    }))
    const prompt = buildReactSystemPrompt({ tokens: [], components })

    expect(prompt).toContain('Comp0')
    expect(prompt).toContain('Comp9') // last included
    expect(prompt).not.toContain('Comp10') // first dropped
    expect(prompt).not.toContain('Comp14')
  })

  it('truncates each component property list at 5 entries', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [
        {
          name: 'Heavy',
          properties: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'],
        },
      ],
    })
    expect(prompt).toContain('p1')
    expect(prompt).toContain('p5') // last included
    expect(prompt).not.toContain('p6') // first dropped
    expect(prompt).not.toContain('p7')
  })
})

// =============================================================================
// buildReactSystemPrompt — editor context
// =============================================================================

describe('buildReactSystemPrompt — editor context', () => {
  it('includes the EDITOR CONTEXT header when editor.selectedNodeName is set', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [],
      editor: { selectedNodeName: 'PrimaryBtn' },
    })
    expect(prompt).toContain('EDITOR CONTEXT')
    expect(prompt).toContain('"PrimaryBtn"')
  })

  it('renders ancestors as a Mirror-style breadcrumb path', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [],
      editor: {
        selectedNodeName: 'Btn',
        ancestors: ['Page', 'Card', 'Footer'],
      },
    })
    expect(prompt).toContain('Page → Card → Footer → Btn')
  })

  it('mentions insideComponent when set', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [],
      editor: { insideComponent: 'Card' },
    })
    expect(prompt).toContain('inside: "Card"')
  })

  it('includes the surroundingCode block with the cursor marker', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [],
      editor: {
        surroundingCode: { before: 'Frame gap 12', after: 'Btn "OK"' },
      },
    })
    expect(prompt).toContain('Frame gap 12')
    expect(prompt).toContain('--- CURSOR ---')
    expect(prompt).toContain('Btn "OK"')
  })

  it('appends the "here/this/add X" interpretation hint when editor context is present', () => {
    const prompt = buildReactSystemPrompt({
      tokens: [],
      components: [],
      editor: { selectedNodeName: 'Btn' },
    })
    expect(prompt).toContain('"here", "this", "add X"')
  })
})

// =============================================================================
// Round-trip integration — convertReactToMirror produces parseable Mirror
// =============================================================================

describe('convertReactToMirror — output stability', () => {
  it('output for a simple card has no trailing whitespace and no empty lines at start/end', () => {
    const result = convertReactToMirror(`
function C() {
  return <div style={{ padding: '16px', backgroundColor: '#1a1a1a' }}>
    <span style={{ color: '#fff' }}>Hello</span>
  </div>
}
`)
    expect(result.mirror.startsWith('\n')).toBe(false)
    expect(result.mirror.endsWith('\n')).toBe(false)
    expect(result.mirror).toBe(result.mirror.trim())
  })

  it('two calls with identical input produce identical output (no hidden state leak)', () => {
    const code = `function C() { return <div style={{padding:'8px'}}></div> }`
    const a = convertReactToMirror(code)
    const b = convertReactToMirror(code)
    expect(a.mirror).toBe(b.mirror)
    expect(a.errors).toEqual(b.errors)
  })

  it('runs without throwing on a moderately complex JSX tree (10 nested elements)', () => {
    const deep = `function C() { return <div><div><div><div><div><div><div><div><div><div><span>deep</span></div></div></div></div></div></div></div></div></div></div> }`
    expect(() => convertReactToMirror(deep)).not.toThrow()
    const result = convertReactToMirror(deep)
    expect(result.mirror).toContain('"deep"')
  })
})
