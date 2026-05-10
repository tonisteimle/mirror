// @vitest-environment jsdom
/**
 * Project Actions Tests
 *
 * Tests for project-level operations (new, demo, import, export).
 * These tests mock browser APIs since they're not available in Node.js.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// =============================================================================
// MOCKS
// =============================================================================

// Mock localStorage
class MockLocalStorage {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null
  }
}

// =============================================================================
// TEST SETUP
// =============================================================================

let mockStorage: MockLocalStorage
let originalLocalStorage: Storage | undefined
let originalLocation: Location | undefined
let reloadMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  // Mock localStorage
  originalLocalStorage = global.localStorage
  mockStorage = new MockLocalStorage()
  global.localStorage = mockStorage as unknown as Storage

  // Mock window.location.reload AND .replace — project-actions calls
  // reloadFresh() which uses location.replace() to bypass cached HTML.
  reloadMock = vi.fn()
  originalLocation = global.window?.location

  const mockLocation = {
    reload: reloadMock,
    replace: reloadMock,
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
  } as unknown as Location

  // Set up window with location
  if (!global.window) {
    global.window = {} as Window & typeof globalThis
  }
  Object.defineProperty(global.window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true,
  })

  // Suppress console logs
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // Restore localStorage
  if (originalLocalStorage) {
    global.localStorage = originalLocalStorage
  }

  // Restore location
  if (originalLocation) {
    Object.defineProperty(global.window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  }

  vi.restoreAllMocks()
  vi.resetModules()
})

// =============================================================================
// HELPER TO IMPORT PROJECT ACTIONS
// =============================================================================

async function getProjectActions() {
  // Dynamic import to ensure mocks are in place
  const module = await import('../../studio/storage/project-actions')
  return module
}

// =============================================================================
// NEW PROJECT
// =============================================================================

describe('newProject', () => {
  it('should create empty project by default', async () => {
    const { newProject } = await getProjectActions()

    // Pre-populate with custom data
    mockStorage.setItem(
      'mirror-files',
      JSON.stringify({
        'custom.mir': 'custom content',
      })
    )

    await newProject() // defaults to 'empty'

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['app.mir']).toBeDefined()
    expect(stored['app.mir']).toBe('')
    expect(stored['custom.mir']).toBeUndefined()
  })

  it('should reload the page after creating project', async () => {
    const { newProject } = await getProjectActions()

    await newProject()

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should create demo project with content when type is demo', async () => {
    const { newProject } = await getProjectActions()

    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['app.mir']).toContain('canvas ')
  })
})

// =============================================================================
// DEMO PROJECT
// =============================================================================

describe('loadDemoProject', () => {
  it('should load demo project with all file types', async () => {
    const { loadDemoProject } = await getProjectActions()

    // Clear storage
    mockStorage.clear()

    await loadDemoProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['app.mir']).toBeDefined()
    expect(stored['tokens.mir']).toBeDefined()
    expect(stored['components.mir']).toBeDefined()
    expect(stored['data.mir']).toBeDefined()
  })

  it('should replace existing files', async () => {
    const { loadDemoProject } = await getProjectActions()

    // Pre-populate with custom data
    mockStorage.setItem(
      'mirror-files',
      JSON.stringify({
        'custom.mir': 'custom content',
        'other.tok': 'tokens',
      })
    )

    await loadDemoProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['custom.mir']).toBeUndefined()
    expect(stored['other.tok']).toBeUndefined()
  })

  it('should reload the page', async () => {
    const { loadDemoProject } = await getProjectActions()

    await loadDemoProject()

    expect(reloadMock).toHaveBeenCalled()
  })
})

// =============================================================================
// PROJECT ACTIONS OBJECT
// =============================================================================

describe('projectActions object', () => {
  it('should export new function', async () => {
    const { projectActions } = await getProjectActions()
    expect(typeof projectActions.new).toBe('function')
  })

  it('should export demo function', async () => {
    const { projectActions } = await getProjectActions()
    expect(typeof projectActions.demo).toBe('function')
  })

  it('should export import function', async () => {
    const { projectActions } = await getProjectActions()
    expect(typeof projectActions.import).toBe('function')
  })

  it('should export export function', async () => {
    const { projectActions } = await getProjectActions()
    expect(typeof projectActions.export).toBe('function')
  })
})

// =============================================================================
// EMPTY PROJECT (default)
// =============================================================================

describe('Empty Project (default)', () => {
  it('should create empty app.mir by default', async () => {
    const { newProject } = await getProjectActions()
    await newProject() // defaults to 'empty'

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['app.mir']).toBe('')
  })

  it('should seed the four-file project layout', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const files = Object.keys(stored).sort()

    expect(files).toEqual(['app.mir', 'components.mir', 'data.mir', 'tokens.mir'])
  })
})

// =============================================================================
// DEMO PROJECT TEMPLATE
// =============================================================================

describe('Demo Project Template', () => {
  it('should have all four file types', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(Object.keys(stored).length).toBe(4)
    expect(stored['app.mir']).toBeDefined()
    expect(stored['tokens.mir']).toBeDefined()
    expect(stored['components.mir']).toBeDefined()
    expect(stored['data.mir']).toBeDefined()
  })

  it('should have tokens that are used in components', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')

    // Tokens should define values
    expect(stored['tokens.mir']).toMatch(/\b(primary|accent|surface|card)\b/)
    expect(stored['tokens.mir']).toContain('#')

    // Components should use tokens
    expect(stored['components.mir']).toContain('$')
  })

  it('should have app.mir that uses components and data', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const appContent = stored['app.mir']

    expect(appContent).toContain('$')
    expect(appContent).toContain('Card')
    expect(appContent).toContain('each')
  })
})

// =============================================================================
// IMPORT PROJECT (Browser)
// =============================================================================

describe('importProject', () => {
  it('should be a function', async () => {
    const { importProject } = await getProjectActions()
    expect(typeof importProject).toBe('function')
  })

  it('imports Mirror files from a folder selection (full happy path)', async () => {
    // P2 coverage: the actual import path was previously only "is a function".
    // Mock document.createElement to return a fake file input, then drive
    // the onchange handler with simulated File objects.
    const fakeFiles = [
      makeFakeFile('myproj/app.mir', 'Frame "App"'),
      makeFakeFile('myproj/tokens.tok', 'primary.bg: #2271C1'),
      makeFakeFile('myproj/readme.md', '# ignored'), // not a Mirror file
    ]
    const fakeInput = makeFakeFileInput(fakeFiles)
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'input') return fakeInput
      return realCreateElement(tag)
    }) as typeof document.createElement)

    const { importProject } = await getProjectActions()
    const promise = importProject()
    // Trigger the input's onchange event after promise is awaiting.
    await fakeInput.triggerChange()
    const result = await promise

    expect(result).toBe(true)
    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['app.mir']).toBe('Frame "App"')
    expect(stored['tokens.tok']).toBe('primary.bg: #2271C1')
    // Non-Mirror file was filtered out:
    expect(stored['readme.md']).toBeUndefined()
  })

  it('returns false when user cancels (empty file list)', async () => {
    const fakeInput = makeFakeFileInput([])
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'input') return fakeInput
      return document.createElement.bind(document)(tag)
    }) as typeof document.createElement)

    const { importProject } = await getProjectActions()
    const promise = importProject()
    await fakeInput.triggerChange() // empty FileList
    const result = await promise
    expect(result).toBe(false)
  })

  it('shows alert and returns false when folder has no Mirror files', async () => {
    const fakeFiles = [
      makeFakeFile('myproj/readme.md', '# md'),
      makeFakeFile('myproj/style.css', '.x{}'),
    ]
    const fakeInput = makeFakeFileInput(fakeFiles)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'input') return fakeInput
      return document.createElement.bind(document)(tag)
    }) as typeof document.createElement)
    const alertMock = vi.fn().mockResolvedValue(undefined)
    ;(global as unknown as { MirrorDialog: unknown }).MirrorDialog = { alert: alertMock }

    const { importProject } = await getProjectActions()
    const promise = importProject()
    await fakeInput.triggerChange()
    const result = await promise

    expect(result).toBe(false)
    expect(alertMock).toHaveBeenCalled()
    // Locked: the alert text mentions Mirror file types so the user
    // knows what was expected.
    expect(alertMock.mock.calls[0][0]).toMatch(/Mirror-Dateien/)
  })

  it('strips the common root-folder prefix from imported paths', async () => {
    // User picks `myproj/`. The webkitRelativePath is `myproj/x/y.mir`.
    // After import, stored key should be `x/y.mir` (no `myproj/`).
    const fakeFiles = [
      makeFakeFile('rootfolder/sub/nested.mir', 'A'),
      makeFakeFile('rootfolder/top.mir', 'B'),
    ]
    const fakeInput = makeFakeFileInput(fakeFiles)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'input') return fakeInput
      return document.createElement.bind(document)(tag)
    }) as typeof document.createElement)

    const { importProject } = await getProjectActions()
    const promise = importProject()
    await fakeInput.triggerChange()
    await promise

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['sub/nested.mir']).toBe('A')
    expect(stored['top.mir']).toBe('B')
    // Old prefixed keys must NOT be present:
    expect(stored['rootfolder/top.mir']).toBeUndefined()
  })
})

// =============================================================================
// EXPORT PROJECT (Browser)
// =============================================================================

describe('exportProject', () => {
  it('should be a function', async () => {
    const { exportProject } = await getProjectActions()
    expect(typeof exportProject).toBe('function')
  })

  it('should handle empty project', async () => {
    const { exportProject } = await getProjectActions()

    // Clear storage
    mockStorage.clear()

    // Mock MirrorDialog.alert (custom dialog module)
    const alertMock = vi.fn().mockResolvedValue(undefined)
    ;(global as any).MirrorDialog = { alert: alertMock }

    await exportProject()

    expect(alertMock).toHaveBeenCalledWith('Keine Dateien zum Exportieren.', {
      title: 'Export fehlgeschlagen',
    })
  })

  it('zips files and triggers a download (full happy path)', async () => {
    // P2 coverage: the export path was previously only tested for the
    // empty case. Mock JSZip + URL.createObjectURL + the anchor click.
    mockStorage.setItem(
      'mirror-files',
      JSON.stringify({
        'app.mir': 'Frame "App"',
        'tokens.tok': 'primary.bg: #2271C1',
      })
    )

    const fileEntries: Record<string, string> = {}
    const generateAsyncMock = vi.fn().mockResolvedValue(new Blob(['zipped']))
    class FakeJSZip {
      file(path: string, content: string) {
        fileEntries[path] = content
      }
      generateAsync = generateAsyncMock
    }
    ;(global.window as unknown as { JSZip: typeof FakeJSZip }).JSZip = FakeJSZip

    const createObjUrlMock = vi.fn().mockReturnValue('blob:fake-url')
    const revokeObjUrlMock = vi.fn()
    // Patch only the methods, leave URL constructor intact (reloadFresh uses `new URL(...)`)
    URL.createObjectURL = createObjUrlMock as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjUrlMock as unknown as typeof URL.revokeObjectURL

    // Track anchor click + download attribute
    const anchorClick = vi.fn()
    const fakeAnchor: HTMLAnchorElement = {
      href: '',
      download: '',
      click: anchorClick,
    } as unknown as HTMLAnchorElement
    const realCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'a') return fakeAnchor
      return realCreateElement(tag)
    }) as typeof document.createElement)
    vi.spyOn(document.body, 'appendChild').mockImplementation(
      ((n: Node) => n) as typeof document.body.appendChild
    )
    vi.spyOn(document.body, 'removeChild').mockImplementation(
      ((n: Node) => n) as typeof document.body.removeChild
    )

    const { exportProject } = await getProjectActions()
    await exportProject()

    // Both files made it into the zip.
    expect(fileEntries['app.mir']).toBe('Frame "App"')
    expect(fileEntries['tokens.tok']).toBe('primary.bg: #2271C1')
    // Download triggered with sensible filename + URL housekeeping.
    expect(fakeAnchor.download).toBe('mirror-project.zip')
    expect(fakeAnchor.href).toBe('blob:fake-url')
    expect(anchorClick).toHaveBeenCalled()
    expect(revokeObjUrlMock).toHaveBeenCalledWith('blob:fake-url')
  })
})

// =============================================================================
// TAURI BRANCHES — pinning the not-yet-implemented stubs
// =============================================================================
//
// Production Tauri behaviour today: newProject / importProject /
// exportProject silently no-op (warning in the log); loadDemo writes
// the default project to the on-disk storage. The earlier tests that
// stubbed `window.__TAURI_BRIDGE__` were exercising a global the
// runtime never set — now removed. Real wiring to
// `TauriBridge.project.{open,create}Project` is tracked in
// docs/findings.md.

describe('Tauri branches — newProject / loadDemo / importProject / exportProject', () => {
  beforeEach(() => {
    // isTauri() reads __TAURI_INTERNALS__. Setting it makes isTauri() return true.
    ;(global.window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {}
  })

  afterEach(() => {
    delete (global.window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
  })

  it('newProject silently no-ops in Tauri (not implemented yet)', async () => {
    const { newProject } = await getProjectActions()
    await expect(newProject()).resolves.toBeUndefined()
    expect(mockStorage.getItem('mirror-files')).toBeNull()
  })

  // loadDemoProject's Tauri branch writes DEFAULT_PROJECT files via the
  // lazy-required storage singleton (require('./index').storage) — that
  // pattern works in browser/Tauri but vitest's ESM context can't resolve
  // the relative require() at runtime. Real coverage of the write side-
  // effects lives in the desktop-files integration suite, not here.

  it('importProject returns false in Tauri (not implemented yet)', async () => {
    const { importProject } = await getProjectActions()
    expect(await importProject()).toBe(false)
  })

  it('exportProject silently no-ops in Tauri (not implemented yet)', async () => {
    const { exportProject } = await getProjectActions()
    await expect(exportProject()).resolves.toBeUndefined()
  })
})

// =============================================================================
// HELPERS for new tests
// =============================================================================

interface FakeFileInput extends HTMLInputElement {
  triggerChange(): Promise<void>
  triggerCancel(): void
}

function makeFakeFileInput(files: File[]): FakeFileInput {
  const handlers: { onchange?: () => Promise<void> | void; oncancel?: () => void } = {}
  const fakeFileList = {
    length: files.length,
    item: (i: number) => files[i],
    [Symbol.iterator]: function* () {
      for (const f of files) yield f
    },
  } as unknown as FileList
  // Make Array.from work
  Object.defineProperty(fakeFileList, 'length', { value: files.length })
  for (let i = 0; i < files.length; i++) {
    ;(fakeFileList as unknown as Record<number, File>)[i] = files[i]
  }
  const input = {
    type: '',
    webkitdirectory: false,
    multiple: false,
    files: fakeFileList,
    set onchange(h: () => Promise<void> | void) {
      handlers.onchange = h
    },
    get onchange() {
      return handlers.onchange ?? (() => {})
    },
    set oncancel(h: () => void) {
      handlers.oncancel = h
    },
    get oncancel() {
      return handlers.oncancel ?? (() => {})
    },
    click: () => {},
    triggerChange: async () => {
      const r = handlers.onchange?.()
      if (r instanceof Promise) await r
    },
    triggerCancel: () => handlers.oncancel?.(),
  }
  return input as unknown as FakeFileInput
}

function makeFakeFile(webkitRelativePath: string, content: string): File {
  const name = webkitRelativePath.split('/').pop() ?? webkitRelativePath
  const f = new File([content], name)
  Object.defineProperty(f, 'webkitRelativePath', { value: webkitRelativePath })
  return f
}

// =============================================================================
// MIRROR FILE DETECTION
// =============================================================================

describe('isMirrorFile (internal)', () => {
  // Test the isMirrorFile function directly

  it('should accept .mir files', async () => {
    const { isMirrorFile } = await import('../../studio/storage/types')
    expect(isMirrorFile('index.mir')).toBe(true)
    expect(isMirrorFile('app.mirror')).toBe(true)
  })

  it('should accept .tok files', async () => {
    const { isMirrorFile } = await import('../../studio/storage/types')
    expect(isMirrorFile('tokens.tok')).toBe(true)
    expect(isMirrorFile('theme.tokens')).toBe(true)
  })

  it('should accept .com files', async () => {
    const { isMirrorFile } = await import('../../studio/storage/types')
    expect(isMirrorFile('components.com')).toBe(true)
    expect(isMirrorFile('ui.components')).toBe(true)
  })

  it('should accept .yaml and .yml files', async () => {
    const { isMirrorFile } = await import('../../studio/storage/types')
    expect(isMirrorFile('data.yaml')).toBe(true)
    expect(isMirrorFile('content.yml')).toBe(true)
  })

  it('should reject non-mirror files', async () => {
    const { isMirrorFile } = await import('../../studio/storage/types')
    expect(isMirrorFile('readme.md')).toBe(false)
    expect(isMirrorFile('script.js')).toBe(false)
    expect(isMirrorFile('style.css')).toBe(false)
  })
})
