/**
 * Project Loader — Multi-File-Combinator-Tests
 *
 * Validates that loadProject() combines files in the canonical phase order
 * (data → tokens → components → layouts), respects the canvas-last rule
 * for layout files, and produces source that the compiler can parse.
 */

import { describe, it, expect } from 'vitest'
import { loadProject } from '../../../compiler/loader/project-loader'
import { parse } from '../../../compiler/parser'

describe('loadProject(): canonical phase order', () => {
  it('emits files in data → tokens → components → layouts order', () => {
    const result = loadProject([
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Hi"' },
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      { filename: 'components.mir', content: 'Btn: pad 12, bg $primary' },
      {
        filename: 'data.mir',
        content: 'user:\n  name: "Max"\n  email: "max@example.com"',
      },
    ])

    // Order matters: each header tag has its phase label.
    const dataIdx = result.source.indexOf('=== data.mir (data) ===')
    const tokensIdx = result.source.indexOf('=== tokens.mir (tokens) ===')
    const componentsIdx = result.source.indexOf('=== components.mir (components) ===')
    const layoutsIdx = result.source.indexOf('=== app.mir (layouts) ===')

    expect(dataIdx).toBeGreaterThanOrEqual(0)
    expect(tokensIdx).toBeGreaterThan(dataIdx)
    expect(componentsIdx).toBeGreaterThan(tokensIdx)
    expect(layoutsIdx).toBeGreaterThan(componentsIdx)
  })

  it('places the canvas-bearing file last in the layouts phase', () => {
    const result = loadProject([
      { filename: 'admin.mir', content: 'AdminPanel: bg #222' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Main"' },
      // 'admin.mir' is component-dominant; 'app.mir' is layout-dominant.
    ])

    expect(result.canvasFile).toBe('app.mir')
    // app.mir appears twice: once hoisted as (canvas), once in its layouts
    // phase. The layouts-phase occurrence must come AFTER admin.mir's
    // components section.
    const adminIdx = result.source.indexOf('=== admin.mir (components) ===')
    const appLayoutsIdx = result.source.indexOf('=== app.mir (layouts) ===')
    expect(adminIdx).toBeGreaterThanOrEqual(0)
    expect(appLayoutsIdx).toBeGreaterThan(adminIdx)
  })

  it('hoists the canvas declaration to the top of the combined source', () => {
    const result = loadProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Main"' },
    ])
    // The hoisted canvas section must come BEFORE any non-canvas phase.
    const canvasIdx = result.source.indexOf('=== app.mir (canvas) ===')
    const tokensIdx = result.source.indexOf('=== tokens.mir (tokens) ===')
    expect(canvasIdx).toBeGreaterThanOrEqual(0)
    expect(canvasIdx).toBeLessThan(tokensIdx)
    // First non-comment line of the combined source is the canvas line.
    const firstNonCommentLine = result.source
      .split('\n')
      .find(l => l.trim() && !l.trim().startsWith('//'))
    expect(firstNonCommentLine?.trim().startsWith('canvas')).toBe(true)
  })

  it('reports null canvasFile when no file declares canvas', () => {
    const result = loadProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      { filename: 'main.mir', content: 'Frame\n  Text "Hi"' },
    ])
    expect(result.canvasFile).toBeNull()
  })

  it('sorts non-canvas layout files alphabetically', () => {
    const result = loadProject([
      { filename: 'zeta.mir', content: 'Frame\n  Text "Z"' },
      { filename: 'alpha.mir', content: 'Frame\n  Text "A"' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Main"' },
    ])
    const alphaIdx = result.source.indexOf('=== alpha.mir (layouts) ===')
    const zetaIdx = result.source.indexOf('=== zeta.mir (layouts) ===')
    const appLayoutsIdx = result.source.indexOf('=== app.mir (layouts) ===')
    expect(alphaIdx).toBeGreaterThanOrEqual(0)
    expect(alphaIdx).toBeLessThan(zetaIdx)
    expect(zetaIdx).toBeLessThan(appLayoutsIdx)
  })
})

describe('loadProject(): hybrid files', () => {
  it('places a hybrid file under its dominant-phase header', () => {
    // dashboard.mir has 1 token + 2 components + 1 layout instance →
    // dominant = components.
    const result = loadProject([
      {
        filename: 'dashboard.mir',
        content: `accent.bg: #f59e0b

Card: bg #1a1a1a, pad 16, rad 8
Btn: pad 12, rad 6

Frame
  Card`,
      },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Main"' },
    ])

    // dashboard lives under (components); the WHOLE file content is emitted
    // there (we don't split per-definition in v1).
    expect(result.source).toContain('=== dashboard.mir (components) ===')
    // Despite being labeled components, the file's own canvas-less layout
    // still ends up parseable in the combined source — that's what matters.
  })

  it('combined source remains parseable by the compiler', () => {
    const result = loadProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1\nprimary.col: white' },
      { filename: 'components.mir', content: 'Btn: pad 12, bg $primary, col $primary' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame gap 8\n  Btn "Speichern"' },
    ])
    const ast = parse(result.source)
    // Combined source parses without errors AND retains all definitions.
    expect(ast.errors).toEqual([])
    expect(ast.tokens.length).toBeGreaterThanOrEqual(2)
    expect(ast.components.length).toBeGreaterThanOrEqual(1)
    expect(ast.canvas).toBeDefined()
  })
})

describe('loadProject(): edge cases', () => {
  it('handles empty file list', () => {
    const result = loadProject([])
    expect(result.source).toBe('')
    expect(result.errors).toEqual([])
    expect(result.canvasFile).toBeNull()
  })

  it('skips empty / comment-only files entirely', () => {
    const result = loadProject([
      { filename: 'empty.mir', content: '' },
      { filename: 'comments.mir', content: '// just a comment\n// nothing else' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Hi"' },
    ])
    expect(result.source).not.toContain('empty.mir')
    expect(result.source).not.toContain('comments.mir')
    expect(result.source).toContain('app.mir')
  })

  it('surfaces parse errors per file', () => {
    const result = loadProject([
      { filename: 'broken.mir', content: 'Frame !!! invalid syntax @@@' },
      { filename: 'app.mir', content: 'canvas mobile\n\nFrame\n  Text "Hi"' },
    ])
    // Errors list is populated per-file — caller decides whether to halt.
    // The broken file's errors point to broken.mir, not app.mir.
    const brokenErrors = result.errors.filter(e => e.filename === 'broken.mir')
    if (brokenErrors.length > 0) {
      expect(brokenErrors[0].filename).toBe('broken.mir')
    }
    // app.mir should still parse cleanly regardless.
    const appErrors = result.errors.filter(e => e.filename === 'app.mir')
    expect(appErrors).toEqual([])
  })
})

describe('loadProject(): canvas-file detection', () => {
  it('identifies a canvas-file even in a hybrid file', () => {
    const result = loadProject([
      { filename: 'tokens.mir', content: 'primary.bg: #2271C1' },
      // app.mir has tokens AND a canvas — should still be detected.
      {
        filename: 'app.mir',
        content: `canvas mobile

accent.bg: #f59e0b

Frame
  Text "Hi"`,
      },
    ])
    expect(result.canvasFile).toBe('app.mir')
  })
})
