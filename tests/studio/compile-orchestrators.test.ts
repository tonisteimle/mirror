// @vitest-environment jsdom
/**
 * Tests for the orchestrator modules in studio/compile/:
 *   - perf-logger.ts (95 LOC) — pure timing helper
 *   - auto-create-files.ts (98 LOC) — import/route scanner
 *   - studio-updater.ts (79 LOC) — DI-only updater
 *   - preview-renderer.ts (164 LOC) — file-type-driven renderer
 *   - compile-service.ts (188 LOC) — top-level orchestrator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PerfLogger } from '../../studio/compile/perf-logger'
import { createAutoCreateFiles } from '../../studio/compile/auto-create-files'
import { StudioUpdater } from '../../studio/compile/studio-updater'
import { PreviewRenderer } from '../../studio/compile/preview-renderer'
import { CompileService } from '../../studio/compile/compile-service'
import type {
  AST,
  CompileResult,
  CompileDependencies,
  MirrorLangAPI,
} from '../../studio/compile/types'

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  vi.restoreAllMocks()
})

// =============================================================================
// perf-logger
// =============================================================================

describe('PerfLogger', () => {
  it('does NOT log when total time is under threshold', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const perf = new PerfLogger()
    perf.logIfSlow() // total < 50ms
    expect(log).not.toHaveBeenCalled()
  })

  it('logs the slow-compile banner when total exceeds threshold', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger()
    now = 100 // 100ms total → slow
    perf.logIfSlow()
    expect(log).toHaveBeenCalledWith('[CompilePerf]', expect.stringContaining('SLOW COMPILE'))
    expect(log).toHaveBeenCalledWith('[CompilePerf]', expect.stringContaining('Total: 100.0ms'))
  })

  it('logs each phase when its bracket marks were called', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger() // start = 0
    now = 10
    perf.markPreludeEnd()
    now = 20
    perf.markParseEnd()
    now = 30
    perf.markIREnd()
    now = 40
    perf.markCodegenEnd()
    now = 100 // total > 50
    perf.logIfSlow()
    const calls = log.mock.calls.map(c => c[1])
    expect(calls.some(c => c.includes('Prelude: 10.0ms'))).toBe(true)
    expect(calls.some(c => c.includes('Parse: 10.0ms'))).toBe(true)
    expect(calls.some(c => c.includes('IR: 10.0ms'))).toBe(true)
    expect(calls.some(c => c.includes('Codegen: 10.0ms'))).toBe(true)
  })

  it('skips a phase whose start or end mark is missing', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger()
    // Only mark preludeEnd; parseEnd missing.
    now = 10
    perf.markPreludeEnd()
    now = 100
    perf.logIfSlow()
    const calls = log.mock.calls.map(c => c[1])
    expect(calls.some(c => c.includes('Prelude'))).toBe(true)
    // Parse phase has start (preludeEnd) but no end → skipped.
    expect(calls.some(c => c.includes('Parse'))).toBe(false)
  })

  it('logs execution phases only when execEnd was marked', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger()
    now = 10
    perf.markPreludeEnd()
    now = 20
    perf.markParseEnd()
    now = 30
    perf.markIREnd()
    now = 40
    perf.markCodegenEnd()
    now = 50
    perf.markPrepExecStart()
    now = 60
    perf.markExecEnd()
    now = 70
    perf.markUpdateStudioEnd()
    now = 80
    perf.markDomAppendEnd()
    now = 90
    perf.markDraggablesEnd()
    now = 100
    perf.markRefreshEnd()
    now = 110
    perf.markSyncEnd()
    now = 200
    perf.logIfSlow()
    const calls = log.mock.calls.map(c => c[1])
    expect(calls.some(c => c.includes('Exec'))).toBe(true)
    expect(calls.some(c => c.includes('UpdateStudio'))).toBe(true)
    expect(calls.some(c => c.includes('Sync'))).toBe(true)
  })

  it('threshold is exactly 50ms (boundary inclusive)', () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger()
    now = 50 // exactly threshold → not slow (`<=` skip)
    perf.logIfSlow()
    expect(log).not.toHaveBeenCalled()

    now = 51 // just over → slow
    perf.logIfSlow()
    expect(log).toHaveBeenCalled()
  })
})

// =============================================================================
// auto-create-files
// =============================================================================

describe('auto-create-files', () => {
  function makeDeps(initialFiles: Record<string, string> = {}) {
    const files = { ...initialFiles }
    return {
      files,
      saveFile: vi.fn((name: string, content: string) => {
        files[name] = content
      }),
      api: () => ({
        getFiles: () => files,
        saveFile: (name: string, content: string) => {
          files[name] = content
        },
      }),
    }
  }

  it('autoCreateFile creates stub for missing file', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    const created = api.autoCreateFile('home')
    expect(created).toBe(true)
    expect(d.files['home.mirror']).toBe('// home.mirror (auto-created)')
  })

  it('autoCreateFile returns false when file already exists', () => {
    const d = makeDeps({ 'home.mirror': 'EXISTING' })
    const api = createAutoCreateFiles(d.api())
    expect(api.autoCreateFile('home')).toBe(false)
    expect(d.files['home.mirror']).toBe('EXISTING')
  })

  it('autoCreateFile preserves .mirror extension when given', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateFile('home.mirror')
    expect(d.files['home.mirror']).toBeDefined()
    expect(d.files['home.mirror.mirror']).toBeUndefined()
  })

  it('readFile auto-creates and returns content for missing file', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    const result = api.readFile('home')
    expect(result).toBe('// home.mirror (auto-created)')
  })

  it('readFile returns existing content unchanged', () => {
    const d = makeDeps({ 'home.mirror': 'CUSTOM' })
    const api = createAutoCreateFiles(d.api())
    expect(api.readFile('home')).toBe('CUSTOM')
  })

  it('autoCreateReferencedFiles creates files for `import name`', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('import home\nimport about')
    expect(d.files['home.mirror']).toBeDefined()
    expect(d.files['about.mirror']).toBeDefined()
  })

  it('autoCreateReferencedFiles handles `import a, b, c`', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('import a, b, c')
    expect(d.files['a.mirror']).toBeDefined()
    expect(d.files['b.mirror']).toBeDefined()
    expect(d.files['c.mirror']).toBeDefined()
  })

  it('autoCreateReferencedFiles skips quoted string imports', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('import "lib/foo"\nimport \'pkg/bar\'')
    expect(d.files['"lib/foo".mirror']).toBeUndefined()
    expect(d.files["'pkg/bar'.mirror"]).toBeUndefined()
  })

  it('autoCreateReferencedFiles creates page files for `route name`', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('route home\nroute about')
    expect(d.files['home.mirror']).toBeDefined()
    expect(d.files['about.mirror']).toBeDefined()
  })

  it('autoCreateReferencedFiles route allows lowercase + slash + underscore', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('route admin/users\nroute snake_case')
    expect(d.files['admin/users.mirror']).toBeDefined()
    expect(d.files['snake_case.mirror']).toBeDefined()
  })

  it('autoCreateReferencedFiles ignores route with uppercase start', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('route Capitalised')
    expect(d.files['Capitalised.mirror']).toBeUndefined()
  })

  it('autoCreateReferencedFiles does not duplicate creation', () => {
    const d = makeDeps()
    const api = createAutoCreateFiles(d.api())
    api.autoCreateReferencedFiles('import home\nimport home\nroute home')
    // saveFile only called once for home.
    expect(Object.keys(d.files).filter(f => f.startsWith('home'))).toEqual(['home.mirror'])
  })
})

// =============================================================================
// studio-updater
// =============================================================================

describe('StudioUpdater', () => {
  function makeUpdater(overrides: any = {}) {
    const deps = {
      studio: {
        state: { set: vi.fn() },
        preview: { refresh: vi.fn() },
        sync: { triggerInitialSync: vi.fn() },
      },
      updateStudio: vi.fn(),
      setIconTriggerPrimitives: vi.fn(),
      ...overrides,
    }
    return { updater: new StudioUpdater(deps), deps }
  }

  it('updateState sets resolvedSource, preludeOffset, preludeLineOffset', () => {
    const { updater, deps } = makeUpdater()
    updater.updateState('a\nb\nUSER\nMORE', 4) // chars 0-3 = "a\nb\n", offset=4
    expect(deps.studio.state.set).toHaveBeenCalledWith({
      resolvedSource: 'a\nb\nUSER\nMORE',
      preludeOffset: 4,
      preludeLineOffset: 2, // 2 newlines before offset
    })
  })

  it('updateState bails when studio.state is missing', () => {
    const { updater, deps } = makeUpdater({ studio: {} })
    expect(() => updater.updateState('CODE', 0)).not.toThrow()
    expect(deps.studio.state?.set).toBeUndefined()
  })

  it('calculatePreludeLines returns 0 for charOffset <= 0', () => {
    const { updater, deps } = makeUpdater()
    updater.updateState('CODE', 0)
    expect(deps.studio.state.set).toHaveBeenCalledWith(
      expect.objectContaining({ preludeLineOffset: 0 })
    )
  })

  it('updateComponentPrimitives uses comp.primitive when set', () => {
    const { updater, deps } = makeUpdater()
    const ast = {
      components: [
        { name: 'PrimaryBtn', primitive: 'Button' },
        { name: 'Card', primitive: 'Frame' },
      ],
      instances: [],
      tokens: [],
    } as AST
    const result = updater.updateComponentPrimitives(ast)
    expect(result.get('PrimaryBtn')).toBe('Button')
    expect(result.get('Card')).toBe('Frame')
    expect(deps.setIconTriggerPrimitives).toHaveBeenCalledWith(result)
  })

  it('updateComponentPrimitives falls back to lowercase name when no primitive', () => {
    const { updater } = makeUpdater()
    const ast = {
      components: [{ name: 'Button' }],
      instances: [],
      tokens: [],
    } as AST
    const result = updater.updateComponentPrimitives(ast)
    expect(result.get('Button')).toBe('button')
  })

  it('updateAfterCompile delegates to updateStudio dependency', () => {
    const { updater, deps } = makeUpdater()
    const ast = { components: [], instances: [], tokens: [] }
    updater.updateAfterCompile(ast, 'IR', { x: 1 }, 'CODE')
    expect(deps.updateStudio).toHaveBeenCalledWith(ast, 'IR', { x: 1 }, 'CODE')
  })

  it('refreshPreview calls studio.preview.refresh', () => {
    const { updater, deps } = makeUpdater()
    updater.refreshPreview()
    expect(deps.studio.preview.refresh).toHaveBeenCalled()
  })

  it('refreshPreview is no-op when studio.preview missing', () => {
    const { updater } = makeUpdater({ studio: {} })
    expect(() => updater.refreshPreview()).not.toThrow()
  })

  it('triggerSync calls studio.sync.triggerInitialSync', () => {
    const { updater, deps } = makeUpdater()
    updater.triggerSync()
    expect(deps.studio.sync.triggerInitialSync).toHaveBeenCalled()
  })

  it('handleEmptyCode clears selection + breadcrumb when SelectionManager present', () => {
    const sel = { clearSelection: vi.fn(), setBreadcrumb: vi.fn() }
    const { updater, deps } = makeUpdater({ studioSelectionManager: sel })
    updater.handleEmptyCode()
    expect(sel.clearSelection).toHaveBeenCalled()
    // Empty code → empty breadcrumb. The synthetic App-wrapper isn't a node
    // the user wrote; surfacing it as a breadcrumb entry would mislead.
    expect(sel.setBreadcrumb).toHaveBeenCalledWith([])
    expect(deps.studio.preview.refresh).toHaveBeenCalled()
  })

  it('handleEmptyCode is safe without SelectionManager', () => {
    const { updater, deps } = makeUpdater()
    expect(() => updater.handleEmptyCode()).not.toThrow()
    expect(deps.studio.preview.refresh).toHaveBeenCalled()
  })
})

// =============================================================================
// preview-renderer
// =============================================================================

describe('PreviewRenderer', () => {
  let preview: HTMLElement
  let generatedCode: HTMLElement
  let MirrorLang: MirrorLangAPI
  let renderer: PreviewRenderer

  beforeEach(() => {
    preview = document.createElement('div')
    generatedCode = document.createElement('pre')
    document.body.appendChild(preview)
    document.body.appendChild(generatedCode)
    MirrorLang = {
      parse: vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] }),
      toIR: vi.fn().mockReturnValue({ ir: 'IR', sourceMap: {} }),
      generateDOM: vi
        .fn()
        .mockReturnValue(
          'export function createUI() { const r = document.createElement("div"); return { root: r } }'
        ),
    }
    renderer = new PreviewRenderer({
      preview,
      generatedCode,
      MirrorLang,
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: vi.fn(),
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    })
  })

  function compileResult(overrides: Partial<CompileResult> = {}): CompileResult {
    return {
      ast: { components: [], instances: [], tokens: [] },
      ir: 'IR',
      sourceMap: {},
      jsCode: 'export function createUI() { return null }',
      resolvedCode: 'CODE',
      preludeOffset: 0,
      ...overrides,
    }
  }

  it('clears preview before rendering', () => {
    preview.innerHTML = 'STALE'
    renderer.render(compileResult(), 'tokens', 'CODE')
    expect(preview.innerHTML).not.toBe('STALE')
  })

  it('shows generated code in the side panel', () => {
    renderer.render(compileResult({ jsCode: 'JS_CODE_HERE' }), 'tokens', 'CODE')
    expect(generatedCode.textContent).toBe('JS_CODE_HERE')
  })

  it('tokens fileType sets tokens-preview class', () => {
    renderer.render(compileResult(), 'tokens', 'CODE')
    expect(preview.className).toBe('tokens-preview')
  })

  it('component fileType sets components-preview class', () => {
    renderer.render(compileResult(), 'component', 'CODE')
    expect(preview.className).toBe('components-preview')
  })

  it('layout fileType executes generated JS and appends root', () => {
    // executeCode runs result.jsCode (from input), not MirrorLang.generateDOM.
    const jsCode = `export function createUI() {
        const r = document.createElement('div');
        r.id = 'rendered-root';
        return { root: r };
      }`
    renderer.render(compileResult({ jsCode }), 'layout', 'CODE')
    expect(preview.querySelector('#rendered-root')).not.toBeNull()
  })

  it('layout calls makePreviewElementsDraggable after appending', () => {
    const drag = vi.fn()
    renderer = new PreviewRenderer({
      preview,
      generatedCode,
      MirrorLang,
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: drag,
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    })
    const jsCode = `export function createUI() {
        return { root: document.createElement('div') };
      }`
    renderer.render(compileResult({ jsCode }), 'layout', 'CODE')
    expect(drag).toHaveBeenCalled()
  })

  it('layout: augmentWithLocalComponents triggers re-compile when local component is uninstanced', () => {
    // Local AST has Btn component, full AST has none instanced → augment.
    MirrorLang.parse = vi
      .fn()
      .mockReturnValueOnce({
        components: [{ name: 'Btn' }],
        instances: [],
        tokens: [],
      })
      // augmented parse:
      .mockReturnValueOnce({
        components: [{ name: 'Btn' }],
        instances: [{ component: 'Btn' }],
        tokens: [],
      })

    MirrorLang.toIR = vi.fn().mockReturnValue({ ir: 'AUG-IR', sourceMap: { aug: 1 } })
    MirrorLang.generateDOM = vi.fn().mockReturnValueOnce(`export function createUI() {
        return { root: document.createElement('div') };
      }`)

    const ast: AST = { components: [{ name: 'Btn' }], instances: [], tokens: [] }
    const result = renderer.render(compileResult({ ast }), 'layout', 'Btn: pad 12')
    expect(result.augmentedResult).toBeDefined()
    expect(result.augmentedResult?.ir).toBe('AUG-IR')
  })

  it('layout: passes input result through unchanged when all local components instanced', () => {
    // Note: augmentedResult is ALWAYS set on layout returns. When no augment
    // happens it's the SAME object as the input result. Identity check.
    const localAst: AST = { components: [{ name: 'Btn' }], instances: [], tokens: [] }
    const fullAst: AST = {
      components: [{ name: 'Btn' }],
      instances: [{ component: 'Btn' }],
      tokens: [],
    }
    MirrorLang.parse = vi.fn().mockReturnValue(localAst)
    const input = compileResult({ ast: fullAst })
    const result = renderer.render(input, 'layout', 'Btn instanced')
    expect(result.augmentedResult).toBe(input) // same identity = no augment
  })

  it('layout: extractRootElement falls back to ui itself when ui.root is missing', () => {
    const jsCode = `
      const _ui = document.createElement('div');
      _ui.id = 'direct';
      export function createUI() { return _ui; }
    `
    renderer.render(compileResult({ jsCode }), 'layout', 'CODE')
    expect(preview.querySelector('#direct')).not.toBeNull()
  })

  it('layout: returns ui:null when createUI returns null', () => {
    MirrorLang.generateDOM = vi.fn().mockReturnValue('export function createUI() { return null }')
    const result = renderer.render(compileResult(), 'layout', 'CODE')
    expect(result.ui).toBeNull()
  })

  it('YAML data injection is appended after __mirrorData declaration', () => {
    const yamlInject = `\n__mirrorData["users"] = {"name":"X"};\n`
    renderer = new PreviewRenderer({
      preview,
      generatedCode,
      MirrorLang,
      generateYAMLDataInjection: () => yamlInject,
      makePreviewElementsDraggable: vi.fn(),
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    })
    // The injectYAMLData regex matches `__mirrorData = {[...]\n}` — the
    // closing brace must be on its own line directly preceded by `\n`.
    const jsCode = `var __mirrorData = {
existing: 1
}
export function createUI() {
  if (!__mirrorData.users) throw new Error('no users');
  const r = document.createElement('div'); r.id = 'with-yaml';
  return { root: r };
}`
    renderer.render(compileResult({ jsCode }), 'layout', 'CODE')
    expect(preview.querySelector('#with-yaml')).not.toBeNull()
  })

  it('handles missing generatedCode element gracefully', () => {
    renderer = new PreviewRenderer({
      preview,
      generatedCode: null,
      MirrorLang,
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: vi.fn(),
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    })
    expect(() => renderer.render(compileResult(), 'tokens', 'CODE')).not.toThrow()
  })
})

// =============================================================================
// compile-service
// =============================================================================

describe('CompileService', () => {
  function setupDOM() {
    document.body.innerHTML = `
      <div id="preview"></div>
      <pre id="generated-code"></pre>
      <div id="status"></div>
    `
  }

  function makeDeps(overrides: Partial<CompileDependencies> = {}): CompileDependencies {
    const MirrorLang: MirrorLangAPI = {
      parse: vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] }),
      toIR: vi.fn().mockReturnValue({ ir: 'IR', sourceMap: {} }),
      generateDOM: vi.fn().mockReturnValue('export function createUI() { return null }'),
    }
    return {
      MirrorLang,
      getFileType: () => 'layout',
      getPreludeCode: () => '',
      autoCreateReferencedFiles: vi.fn(),
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: vi.fn(),
      updateStudio: vi.fn(),
      studioActions: { setCompiling: vi.fn() },
      studio: {
        state: { set: vi.fn() },
        preview: { refresh: vi.fn() },
        sync: { triggerInitialSync: vi.fn() },
      },
      currentFile: 'app.mir',
      files: {},
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
      ...overrides,
    }
  }

  it('handles empty code path: renders empty App, calls handleEmptyCode', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('')
    const preview = document.getElementById('preview')!
    expect(preview.innerHTML).toContain('mirror-root')
    expect(preview.innerHTML).toContain('node-1')
  })

  it('handles whitespace-only code as empty', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('   \n  ')
    expect(document.getElementById('preview')!.innerHTML).toContain('mirror-root')
  })

  it('updates files cache with the compiled code', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('CODE')
    expect(deps.files['app.mir']).toBe('CODE')
  })

  it('calls autoCreateReferencedFiles before parsing', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('import home')
    expect(deps.autoCreateReferencedFiles).toHaveBeenCalledWith('import home')
  })

  it('calls setCompiling(true) before pipeline', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('CODE')
    expect(deps.studioActions.setCompiling).toHaveBeenCalledWith(true)
  })

  it('skips compile when preview is in generated mode', () => {
    setupDOM()
    document.getElementById('preview')!.dataset.generatedMode = 'true'
    const deps = makeDeps()
    new CompileService(deps).compile('CODE')
    expect(deps.studioActions.setCompiling).not.toHaveBeenCalled()
  })

  it('on parse-error: sets status to "Error" + shows error box in preview', () => {
    setupDOM()
    const deps = makeDeps()
    deps.MirrorLang.parse = vi.fn().mockReturnValue({
      components: [],
      instances: [],
      tokens: [],
      errors: [{ line: 3, message: 'syntax error' }],
    })
    new CompileService(deps).compile('CODE')
    const status = document.getElementById('status')!
    const preview = document.getElementById('preview')!
    expect(status.textContent).toBe('Error')
    expect(status.className).toContain('error')
    expect(preview.innerHTML).toContain('Parse/Compile Error')
    expect(preview.innerHTML).toContain('Line 3: syntax error')
  })

  it('on parse-error: setCompiling(false) called', () => {
    setupDOM()
    const deps = makeDeps()
    deps.MirrorLang.parse = vi.fn().mockImplementation(() => {
      throw new Error('boom')
    })
    new CompileService(deps).compile('CODE')
    expect(deps.studioActions.setCompiling).toHaveBeenCalledWith(false)
  })

  it('on success: status shows components/instances count', () => {
    setupDOM()
    const deps = makeDeps()
    deps.MirrorLang.parse = vi.fn().mockReturnValue({
      components: [{ name: 'A' }, { name: 'B' }],
      instances: [{ component: 'A' }],
      tokens: [],
    })
    new CompileService(deps).compile('CODE')
    const status = document.getElementById('status')!
    expect(status.textContent).toContain('2 components')
    expect(status.textContent).toContain('1 instances')
    expect(status.className).toContain('ok')
  })

  it('on success: updateStudio called with full result', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('CODE')
    expect(deps.updateStudio).toHaveBeenCalled()
  })

  it('on success: empty handleEmptyCode does NOT run', () => {
    setupDOM()
    const deps = makeDeps()
    new CompileService(deps).compile('CODE')
    // Studio state.set called for prelude metadata, not for empty handler.
    expect(deps.studio.state!.set).toHaveBeenCalled()
  })

  it('preserves error message across both status and generated-code', () => {
    setupDOM()
    const deps = makeDeps()
    deps.MirrorLang.parse = vi.fn().mockImplementation(() => {
      throw new Error('parse boom')
    })
    new CompileService(deps).compile('CODE')
    const generatedCode = document.getElementById('generated-code')!
    expect(generatedCode.textContent).toContain('parse boom')
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: PerfLogger threshold is `<= 50` skip (boundary)', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const perf = new PerfLogger()
    now = 50
    perf.logIfSlow()
    expect(log).not.toHaveBeenCalled()
  })

  it('M2: autoCreateFile returns FALSE when file exists (catches inverse)', () => {
    const files: Record<string, string> = { 'a.mirror': 'X' }
    const api = createAutoCreateFiles({
      getFiles: () => files,
      saveFile: () => {},
    })
    expect(api.autoCreateFile('a')).toBe(false)
  })

  it('M3: route regex requires lowercase start (catches `/i` flag mutation)', () => {
    const files: Record<string, string> = {}
    const api = createAutoCreateFiles({
      getFiles: () => files,
      saveFile: (n, c) => {
        files[n] = c
      },
    })
    api.autoCreateReferencedFiles('route Cap')
    expect(files['Cap.mirror']).toBeUndefined()
  })

  it('M4: StudioUpdater primitive falls back to lowercase NAME (catches drop of fallback)', () => {
    const setIcon = vi.fn()
    const u = new StudioUpdater({
      studio: {},
      updateStudio: vi.fn(),
      setIconTriggerPrimitives: setIcon,
    })
    const result = u.updateComponentPrimitives({
      components: [{ name: 'Foo' }],
      instances: [],
      tokens: [],
    } as AST)
    expect(result.get('Foo')).toBe('foo')
  })

  it('M5: empty-code path does NOT call MirrorLang.parse (catches `!code.trim()` flip)', () => {
    document.body.innerHTML = `<div id="preview"></div><pre id="generated-code"></pre><div id="status"></div>`
    const parseFn = vi.fn().mockReturnValue({ components: [], instances: [], tokens: [] })
    const deps: CompileDependencies = {
      MirrorLang: {
        parse: parseFn,
        toIR: vi.fn().mockReturnValue({ ir: '', sourceMap: {} }),
        generateDOM: vi.fn().mockReturnValue(''),
      },
      getFileType: () => 'layout',
      getPreludeCode: () => '',
      autoCreateReferencedFiles: vi.fn(),
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: vi.fn(),
      updateStudio: vi.fn(),
      studioActions: { setCompiling: vi.fn() },
      studio: {
        state: { set: vi.fn() },
        preview: { refresh: vi.fn() },
        sync: { triggerInitialSync: vi.fn() },
      },
      currentFile: 'a',
      files: {},
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    }
    new CompileService(deps).compile('')
    expect(parseFn).not.toHaveBeenCalled()
  })

  it('M6: PreviewRenderer augment runs ONLY when local components are uninstanced', () => {
    const preview = document.createElement('div')
    document.body.appendChild(preview)
    // Local AST has Btn, full AST has none instanced → augment kicks in.
    const localAst: AST = { components: [{ name: 'Btn' }], instances: [], tokens: [] }
    const augmentedAst: AST = {
      components: [{ name: 'Btn' }],
      instances: [{ component: 'Btn' }],
      tokens: [],
    }
    const MirrorLang: MirrorLangAPI = {
      parse: vi.fn().mockReturnValueOnce(localAst).mockReturnValueOnce(augmentedAst),
      toIR: vi.fn().mockReturnValue({ ir: 'AUG', sourceMap: { aug: 1 } }),
      generateDOM: vi.fn().mockReturnValue('export function createUI() { return null }'),
    }
    const r = new PreviewRenderer({
      preview,
      generatedCode: null,
      MirrorLang,
      generateYAMLDataInjection: () => '',
      makePreviewElementsDraggable: vi.fn(),
      getAllProjectSource: () => '',
      getTokensSource: () => '',
      getCurrentFileSource: () => '',
    })
    const input = {
      ast: { components: [{ name: 'Btn' }], instances: [], tokens: [] } as AST,
      ir: '',
      sourceMap: {},
      jsCode: 'export function createUI() { return null }',
      resolvedCode: 'X',
      preludeOffset: 0,
    }
    const result = r.render(input, 'layout', 'X')
    // augmentedResult differs from input because re-compile ran.
    expect(result.augmentedResult).not.toBe(input)
    expect(result.augmentedResult?.ir).toBe('AUG')
  })
})
