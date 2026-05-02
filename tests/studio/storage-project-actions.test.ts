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

  // Mock window.location.reload
  reloadMock = vi.fn()
  originalLocation = global.window?.location

  // Create a mock location
  const mockLocation = {
    reload: reloadMock,
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
    expect(stored['index.mir']).toBeDefined()
    expect(stored['index.mir']).toBe('')
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
    expect(stored['index.mir']).toContain('Frame')
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
    expect(stored['index.mir']).toBeDefined()
    expect(stored['tokens.tok']).toBeDefined()
    expect(stored['components.com']).toBeDefined()
    expect(stored['data.yaml']).toBeDefined()
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
  it('should create empty index.mir by default', async () => {
    const { newProject } = await getProjectActions()
    await newProject() // defaults to 'empty'

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const indexContent = stored['index.mir']

    // Empty project has just an empty index.mir
    expect(indexContent).toBe('')
  })

  it('should only have index.mir file', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const files = Object.keys(stored)

    expect(files).toEqual(['index.mir'])
  })
})

// =============================================================================
// DEMO PROJECT TEMPLATE
// =============================================================================

describe('Demo Project Template', () => {
  it('should have all five file types', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(Object.keys(stored).length).toBe(5)
    expect(stored['index.mir']).toBeDefined()
    expect(stored['tokens.tok']).toBeDefined()
    expect(stored['components.com']).toBeDefined()
    expect(stored['data.yaml']).toBeDefined()
    expect(stored['data.data']).toBeDefined()
  })

  it('should have tokens that are used in components', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')

    // Tokens should define values
    expect(stored['tokens.tok']).toContain('primary')
    expect(stored['tokens.tok']).toContain('#')

    // Components should use tokens
    expect(stored['components.com']).toContain('$')
  })

  it('should have index.mir that uses components and data', async () => {
    const { newProject } = await getProjectActions()
    await newProject('demo')

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const indexContent = stored['index.mir']

    // Should use tokens
    expect(indexContent).toContain('$')
    // Should use components
    expect(indexContent).toContain('Card')
    // Should use data with each loop
    expect(indexContent).toContain('each')
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

  // Note: Full import testing requires mocking file input and FileReader
  // which is complex in Node.js environment. The function creates a hidden
  // file input, triggers click, and reads the selected files.
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
})

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
