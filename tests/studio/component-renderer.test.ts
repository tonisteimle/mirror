// @vitest-environment jsdom
/**
 * Tests for studio/compile/component-renderer.ts (452 LOC, 0%)
 *
 * Renders the .com preview panel: section headers (--- Name ---), per-
 * component default + state rows (hover/active/focus/...), and injects
 * a :root { --token: value; } stylesheet for the live render. Uses a
 * MirrorLangAPI dependency to compile component source per cell.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComponentRenderer } from '../../studio/compile/component-renderer'
import type { AST, Component, MirrorLangAPI } from '../../studio/compile/types'

let preview: HTMLElement
let MirrorLang: MirrorLangAPI
let getTokensSource: ReturnType<typeof vi.fn>
let getCurrentFileSource: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  preview = document.createElement('div')
  document.body.appendChild(preview)

  // Default MirrorLang stub: parse returns empty AST, generateDOM returns
  // a no-op exported createUI. Each test can override.
  MirrorLang = {
    parse: vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] }),
    toIR: vi.fn().mockReturnValue({ ir: {}, sourceMap: {} }),
    generateDOM: vi.fn().mockReturnValue('export function createUI() { return null }'),
  }
  getTokensSource = vi.fn().mockReturnValue('')
  getCurrentFileSource = vi.fn().mockReturnValue('')
})

function createRenderer(): ComponentRenderer {
  return new ComponentRenderer({
    preview,
    MirrorLang,
    getTokensSource,
    getCurrentFileSource,
  })
}

function ast(components: Component[]): AST {
  return { components, instances: [], tokens: [] }
}

// =============================================================================
// Empty / no components
// =============================================================================

describe('ComponentRenderer — empty', () => {
  it('renders empty message when ast.components is missing', () => {
    createRenderer().render({ instances: [], tokens: [] } as unknown as AST)
    expect(preview.innerHTML).toContain('Keine Komponenten definiert')
  })

  it('renders empty message when components is []', () => {
    createRenderer().render(ast([]))
    expect(preview.innerHTML).toContain('Keine Komponenten definiert')
  })

  it('empty message includes example DSL syntax', () => {
    createRenderer().render(ast([]))
    expect(preview.innerHTML).toContain('Button: pad 12, bg #5BA8F5')
  })
})

// =============================================================================
// Section extraction
// =============================================================================

describe('ComponentRenderer — section extraction', () => {
  it('renders a single section without header when source has no --- markers', () => {
    getCurrentFileSource.mockReturnValue('Button: pad 12\nLabel: col white')
    createRenderer().render(ast([{ name: 'Button' }, { name: 'Label' }]))
    expect(preview.querySelectorAll('.components-preview-section').length).toBe(1)
    expect(preview.querySelector('.components-preview-section-header')).toBeNull()
  })

  it('extracts section names from --- Name --- markers', () => {
    getCurrentFileSource.mockReturnValue(`--- Buttons ---
Btn1: pad 12
Btn2: pad 16
--- Labels ---
Lbl: col white`)
    createRenderer().render(
      ast([
        { name: 'Btn1', line: 2 } as Component,
        { name: 'Btn2', line: 3 } as Component,
        { name: 'Lbl', line: 5 } as Component,
      ])
    )
    const headers = Array.from(preview.querySelectorAll('.components-preview-section-header')).map(
      h => h.textContent
    )
    expect(headers).toEqual(['Buttons', 'Labels'])
  })

  it('skips components whose name matches a section header', () => {
    getCurrentFileSource.mockReturnValue(`--- Buttons ---
Btn1: pad 12`)
    createRenderer().render(
      ast([
        { name: 'Buttons', line: 1 } as Component, // section-named, should be skipped
        { name: 'Btn1', line: 2 } as Component,
      ])
    )
    const componentRows = preview.querySelectorAll('.components-preview-component')
    expect(componentRows.length).toBe(1)
  })

  it('puts unsorted (line=0) components into the first section', () => {
    getCurrentFileSource.mockReturnValue(`--- Buttons ---
Btn1: pad 12`)
    createRenderer().render(
      ast([
        { name: 'NoLine' } as Component, // no line property
        { name: 'Btn1', line: 2 } as Component,
      ])
    )
    const componentRows = preview.querySelectorAll(
      '.components-preview-section .components-preview-component'
    )
    expect(componentRows.length).toBe(2) // both end up in Buttons
  })

  it('drops sections with no components', () => {
    getCurrentFileSource.mockReturnValue(`--- Empty ---
--- Filled ---
Btn: pad 12`)
    createRenderer().render(ast([{ name: 'Btn', line: 3 } as Component]))
    expect(preview.querySelectorAll('.components-preview-section').length).toBe(1)
  })
})

// =============================================================================
// State rendering
// =============================================================================

describe('ComponentRenderer — state rendering', () => {
  it('renders only the "default" state when component has no states', () => {
    createRenderer().render(ast([{ name: 'Btn' }]))
    const rows = preview.querySelectorAll('.components-preview-row')
    expect(rows.length).toBe(1)
    expect(rows[0].querySelector('.components-preview-state')?.textContent).toBe('default')
  })

  it('renders default + each behavior state from component.states', () => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'hover' }, { name: 'active' }],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states).toEqual(['default', 'hover', 'active'])
  })

  it('ignores unknown state names (not in BEHAVIOR_STATES)', () => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'unknown' }, { name: 'hover' }],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states).toEqual(['default', 'hover'])
  })

  it('collects states recursively from children', () => {
    createRenderer().render(
      ast([
        {
          name: 'Card',
          children: [
            { name: 'Btn', states: [{ name: 'hover' }] },
            {
              name: 'Inner',
              children: [{ name: 'Deep', states: [{ name: 'active' }] }],
            },
          ],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states).toEqual(['default', 'hover', 'active'])
  })

  it('shows component name only on first row', () => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'hover' }],
        } as unknown as Component,
      ])
    )
    const names = Array.from(preview.querySelectorAll('.components-preview-name')).map(
      n => n.textContent
    )
    expect(names).toEqual(['Btn', ''])
  })

  it.each([
    'hover',
    'active',
    'focus',
    'disabled',
    'selected',
    'highlighted',
    'expanded',
    'collapsed',
    'on',
    'off',
    'valid',
    'invalid',
  ])('accepts behavior state "%s"', stateName => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: stateName }],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states).toContain(stateName)
  })
})

// =============================================================================
// Live render (executeCode + extractElement)
// =============================================================================

describe('ComponentRenderer — live render', () => {
  it('calls MirrorLang.parse with combined tokens + source + component-name', () => {
    getTokensSource.mockReturnValue('primary: #2271C1')
    getCurrentFileSource.mockReturnValue('Btn: pad 12')
    createRenderer().render(ast([{ name: 'Btn' }]))

    // The renderState pass passes "tokens\n + current\n + name" to parse.
    const calls = (MirrorLang.parse as any).mock.calls
    const buildCall = calls.find((c: any[]) => c[0]?.includes('Btn: pad 12'))
    expect(buildCall?.[0]).toContain('primary: #2271C1')
    expect(buildCall?.[0].endsWith('Btn')).toBe(true)
  })

  it('shows error message inline when execution throws', () => {
    MirrorLang.parse = vi.fn().mockImplementation(() => {
      throw new Error('parse failed')
    })
    createRenderer().render(ast([{ name: 'Btn' }]))
    const renders = preview.querySelectorAll('.components-preview-render')
    // First row gets an error inserted (default state). Both attempts run
    // through the same try/catch.
    const errorTexts = Array.from(renders).map(r => r.textContent)
    expect(errorTexts.some(t => t?.includes('Error: parse failed'))).toBe(true)
  })

  it('appends rendered element to the per-state container', () => {
    // Build a fake createUI returning a mock root.
    const mockEl = document.createElement('button')
    mockEl.textContent = 'X'
    const mockRoot = document.createElement('div')
    mockRoot.appendChild(mockEl)
    MirrorLang.generateDOM = vi.fn().mockReturnValue(`export function createUI() {
        const root = document.createElement('div');
        const btn = document.createElement('button');
        btn.textContent = 'X';
        root.appendChild(btn);
        return { root };
      }`)
    createRenderer().render(ast([{ name: 'Btn' }]))

    const wrappers = preview.querySelectorAll('.components-preview-wrapper button')
    expect(wrappers.length).toBeGreaterThan(0)
    expect(wrappers[0].textContent).toBe('X')
  })

  it('adds state-{name} class to non-default state element', () => {
    MirrorLang.generateDOM = vi.fn().mockReturnValue(`export function createUI() {
        const root = document.createElement('div');
        const btn = document.createElement('button');
        root.appendChild(btn);
        return { root };
      }`)
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'hover' }],
        } as unknown as Component,
      ])
    )
    const hoverWrapper = preview.querySelector('#comp-render-Btn-hover button') as HTMLElement
    expect(hoverWrapper?.classList.contains('state-hover')).toBe(true)
    expect(hoverWrapper?.getAttribute('data-state')).toBe('hover')
  })

  it('does NOT add state class to default-state element', () => {
    MirrorLang.generateDOM = vi.fn().mockReturnValue(`export function createUI() {
        const root = document.createElement('div');
        const btn = document.createElement('button');
        root.appendChild(btn);
        return { root };
      }`)
    createRenderer().render(ast([{ name: 'Btn' }]))
    const defaultWrapper = preview.querySelector('#comp-render-Btn-default button') as HTMLElement
    expect(defaultWrapper?.classList.contains('state-default')).toBe(false)
    expect(defaultWrapper?.getAttribute('data-state')).toBeNull()
  })

  it('renders nothing in the cell when ui is empty/null', () => {
    MirrorLang.generateDOM = vi.fn().mockReturnValue(`export function createUI() { return null }`)
    createRenderer().render(ast([{ name: 'Btn' }]))
    const cell = preview.querySelector('#comp-render-Btn-default')
    expect(cell?.children.length).toBe(0)
  })
})

// =============================================================================
// Token CSS injection
// =============================================================================

describe('ComponentRenderer — token CSS injection', () => {
  it('injects a <style id="component-preview-tokens"> when tokens are present', () => {
    getTokensSource.mockReturnValue('primary: #2271C1\ncard.pad: 16')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      // Tokens path: the source is the tokens-only source.
      if (source === 'primary: #2271C1\ncard.pad: 16') {
        return {
          components: [],
          instances: [],
          tokens: [
            { name: 'primary', value: '#2271C1' },
            { name: 'card.pad', value: 16 },
          ],
        }
      }
      // Live render path: minimal AST.
      return { components: [], instances: [], tokens: [] }
    })
    createRenderer().render(ast([{ name: 'Btn' }]))
    const style = document.getElementById('component-preview-tokens')
    expect(style).not.toBeNull()
    expect(style?.textContent).toContain('--primary: #2271C1')
    expect(style?.textContent).toContain('--card-pad: 16px') // px suffix added
  })

  it('skips style injection when tokens source is empty', () => {
    getTokensSource.mockReturnValue('')
    createRenderer().render(ast([{ name: 'Btn' }]))
    expect(document.getElementById('component-preview-tokens')).toBeNull()
  })

  it('skips parse() call entirely when tokens source is empty (catches drop of !source.trim() guard)', () => {
    getTokensSource.mockReturnValue('')
    createRenderer().render(ast([{ name: 'Btn' }]))
    // parse is still called for the live-render code path. We assert the
    // tokens-only call (empty string) never happens.
    const emptyParseCalls = (MirrorLang.parse as any).mock.calls.filter((c: any[]) => c[0] === '')
    expect(emptyParseCalls.length).toBe(0)
  })

  it('skips style injection when ast.tokens is empty', () => {
    getTokensSource.mockReturnValue('# comment only')
    MirrorLang.parse = vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] })
    createRenderer().render(ast([{ name: 'Btn' }]))
    expect(document.getElementById('component-preview-tokens')).toBeNull()
  })

  it('replaces previous <style> when re-rendering with different tokens', () => {
    getTokensSource.mockReturnValueOnce('a: #fff')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      if (source.startsWith('a:')) {
        return {
          components: [],
          instances: [],
          tokens: [{ name: 'a', value: '#fff' }],
        }
      }
      if (source.startsWith('b:')) {
        return {
          components: [],
          instances: [],
          tokens: [{ name: 'b', value: '#000' }],
        }
      }
      return { components: [], instances: [], tokens: [] }
    })

    const r1 = createRenderer()
    r1.render(ast([{ name: 'Btn' }]))
    expect(document.getElementById('component-preview-tokens')?.textContent).toContain('--a: #fff')

    // New renderer with new source bypasses tokensHash short-circuit.
    getTokensSource.mockReturnValue('b: #000')
    const r2 = createRenderer()
    r2.render(ast([{ name: 'Btn' }]))
    const styles = document.querySelectorAll('style#component-preview-tokens')
    expect(styles.length).toBe(1) // exactly one (old removed)
    expect(styles[0].textContent).toContain('--b: #000')
  })

  it('caches styles via tokensHash — same source skips re-inject', () => {
    getTokensSource.mockReturnValue('a: #fff')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      if (source === 'a: #fff') {
        return {
          components: [],
          instances: [],
          tokens: [{ name: 'a', value: '#fff' }],
        }
      }
      return { components: [], instances: [], tokens: [] }
    })
    const r = createRenderer()
    r.render(ast([{ name: 'Btn' }]))
    r.render(ast([{ name: 'Btn' }])) // second render — hash is cached
    // The tokens-only parse (exact match) should happen exactly once.
    // Live-render parse (combined source) is separate and runs every render.
    const tokenOnlyCalls = (MirrorLang.parse as any).mock.calls.filter(
      (c: any[]) => c[0] === 'a: #fff'
    )
    expect(tokenOnlyCalls.length).toBe(1)
  })

  it('warns but does not throw when token-source parse fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    getTokensSource.mockReturnValue('garbage')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      if (source.startsWith('garbage')) throw new Error('boom')
      return { components: [], instances: [], tokens: [] }
    })

    expect(() => createRenderer().render(ast([{ name: 'Btn' }]))).not.toThrow()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

// =============================================================================
// CSS value formatting
// =============================================================================

describe('ComponentRenderer — formatCSSValue (via injectStyles)', () => {
  function injectAndExtract(tokens: { name: string; value: any }[]): string {
    getTokensSource.mockReturnValue('source')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      if (source === 'source') return { components: [], instances: [], tokens }
      return { components: [], instances: [], tokens: [] }
    })
    createRenderer().render(ast([{ name: 'Btn' }]))
    return document.getElementById('component-preview-tokens')?.textContent || ''
  }

  it('adds px to spacing/sizing properties', () => {
    const css = injectAndExtract([
      { name: 'card.pad', value: 16 },
      { name: 'l.gap', value: 8 },
      { name: 'btn.rad', value: 4 },
      { name: 'h.fs', value: 24 },
      { name: 'b.bor', value: 1 },
    ])
    expect(css).toContain('--card-pad: 16px')
    expect(css).toContain('--l-gap: 8px')
    expect(css).toContain('--btn-rad: 4px')
    expect(css).toContain('--h-fs: 24px')
    expect(css).toContain('--b-bor: 1px')
  })

  it('does NOT add px to color properties', () => {
    const css = injectAndExtract([
      { name: 'primary.bg', value: '#2271C1' },
      { name: 'card.col', value: 'white' },
    ])
    expect(css).toContain('--primary-bg: #2271C1')
    expect(css).toContain('--card-col: white')
    expect(css).not.toContain('px')
  })

  it('handles numeric strings for px properties', () => {
    const css = injectAndExtract([{ name: 'card.pad', value: '16' }])
    expect(css).toContain('--card-pad: 16px')
  })

  it('strips $ prefix in CSS variable name', () => {
    const css = injectAndExtract([{ name: '$primary', value: '#2271C1' }])
    expect(css).toContain('--primary: #2271C1')
    expect(css).not.toContain('--$primary')
  })

  it('replaces dots with hyphens in variable name', () => {
    const css = injectAndExtract([{ name: 'a.b.c', value: '#fff' }])
    expect(css).toContain('--a-b-c: #fff')
  })

  it('Q5: $ref values do NOT resolve in CSS — same key/value format mismatch as token-renderer', () => {
    const css = injectAndExtract([
      { name: 'primary', value: '#2271C1' },
      { name: 'theme.bg', value: '$primary' },
    ])
    // tokenMap key is 'primary', resolveValue looks up '$primary' → miss.
    // CSS variable falls back to the raw $primary string.
    expect(css).toContain('--theme-bg: $primary')
    expect(css).not.toContain('--theme-bg: #2271C1')
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: BEHAVIOR_STATES whitelist filters unknown states', () => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'lol-not-real' }],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states).toEqual(['default']) // only default — lol-not-real filtered
  })

  it('M2: section grouping uses line range — components on lineStart inclusive', () => {
    getCurrentFileSource.mockReturnValue(`--- A ---
Btn: pad`)
    createRenderer().render(ast([{ name: 'Btn', line: 2 } as Component]))
    const sections = preview.querySelectorAll('.components-preview-section')
    expect(sections.length).toBe(1)
  })

  it('M3: state class only added when state !== "default" (catches drop of !== guard)', () => {
    MirrorLang.generateDOM = vi.fn().mockReturnValue(`export function createUI() {
        const root = document.createElement('div');
        const btn = document.createElement('button');
        root.appendChild(btn);
        return { root };
      }`)
    createRenderer().render(ast([{ name: 'Btn' }]))
    const el = preview.querySelector('#comp-render-Btn-default button') as HTMLElement
    expect(el?.classList.length).toBe(0)
  })

  it('M4: tokensHash cache only short-circuits on EQUAL hash (not always)', () => {
    getTokensSource.mockReturnValueOnce('a: #fff')
    MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
      if (source.startsWith('a:')) {
        return { components: [], instances: [], tokens: [{ name: 'a', value: '#fff' }] }
      }
      return { components: [], instances: [], tokens: [] }
    })
    const r = createRenderer()
    r.render(ast([{ name: 'Btn' }]))
    expect(document.getElementById('component-preview-tokens')).not.toBeNull()
  })

  it('M5: pxProperties suffix lookup uses last-dot segment', () => {
    // Token "card.pad" → suffix "pad" → +px.
    // Token "card.bg" → suffix "bg" → no px.
    const css = (() => {
      getTokensSource.mockReturnValue('source')
      MirrorLang.parse = vi.fn().mockImplementation((source: string) => {
        if (source === 'source') {
          return {
            components: [],
            instances: [],
            tokens: [
              { name: 'card.pad', value: 8 },
              { name: 'card.bg', value: 'white' },
            ],
          }
        }
        return { components: [], instances: [], tokens: [] }
      })
      createRenderer().render(ast([{ name: 'Btn' }]))
      return document.getElementById('component-preview-tokens')?.textContent || ''
    })()
    expect(css).toContain('--card-pad: 8px')
    expect(css).toContain('--card-bg: white')
  })

  it('M6: default state is ALWAYS prepended to state list', () => {
    createRenderer().render(
      ast([
        {
          name: 'Btn',
          states: [{ name: 'hover' }],
        } as unknown as Component,
      ])
    )
    const states = Array.from(preview.querySelectorAll('.components-preview-state')).map(
      s => s.textContent
    )
    expect(states[0]).toBe('default') // catches drop of `'default'` literal
  })
})
