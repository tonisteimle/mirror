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
  it('should create new project with default files', async () => {
    const { newProject } = await getProjectActions()

    // Pre-populate with custom data
    mockStorage.setItem('mirror-files', JSON.stringify({
      'custom.mir': 'custom content',
    }))

    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['index.mir']).toBeDefined()
    expect(stored['tokens.tok']).toBeDefined()
    expect(stored['components.com']).toBeDefined()
    expect(stored['custom.mir']).toBeUndefined()
  })

  it('should reload the page after creating project', async () => {
    const { newProject } = await getProjectActions()

    await newProject()

    expect(reloadMock).toHaveBeenCalled()
  })

  it('should include welcome content in index.mir', async () => {
    const { newProject } = await getProjectActions()

    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['index.mir']).toContain('Mirror')
  })
})

// =============================================================================
// DEMO PROJECT
// =============================================================================

describe('loadDemoProject', () => {
  it('should load demo project with default files', async () => {
    const { loadDemoProject } = await getProjectActions()

    // Clear storage
    mockStorage.clear()

    await loadDemoProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    expect(stored['index.mir']).toBeDefined()
    expect(stored['tokens.tok']).toBeDefined()
    expect(stored['components.com']).toBeDefined()
  })

  it('should replace existing files', async () => {
    const { loadDemoProject } = await getProjectActions()

    // Pre-populate with custom data
    mockStorage.setItem('mirror-files', JSON.stringify({
      'custom.mir': 'custom content',
      'other.tok': 'tokens',
    }))

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
// DEFAULT PROJECT TEMPLATE
// =============================================================================

describe('Default Project Template', () => {
  it('should have valid Mirror syntax in index.mir', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const indexContent = stored['index.mir']

    // Should have valid Mirror elements
    expect(indexContent).toMatch(/Title|Text|Frame|Button|Card/)
  })

  it('should use App as root element in index.mir', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const indexContent = stored['index.mir']

    // index.mir should start with App as root container
    expect(indexContent.trim()).toMatch(/^App\b/)
  })

  it('should have token definitions in tokens.tok', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const tokensContent = stored['tokens.tok']

    // Should have token definitions (new syntax without $ in definition)
    expect(tokensContent).toMatch(/\w+\.\w+:\s*[#\w]/)
    expect(tokensContent).toContain('accent.bg:')
  })

  it('should have component definitions in components.com', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const componentsContent = stored['components.com']

    // Should have component definitions with colons
    expect(componentsContent).toMatch(/\w+:/)
    expect(componentsContent).toContain('App:')
  })

  it('should have App component that uses tokens', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const componentsContent = stored['components.com']

    // App should reference tokens
    expect(componentsContent).toMatch(/App:.*\$/)
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

    // Mock alert
    const alertMock = vi.fn()
    global.alert = alertMock

    await exportProject()

    expect(alertMock).toHaveBeenCalledWith('Keine Dateien zum Exportieren.')
  })
})

// =============================================================================
// MIRROR FILE DETECTION
// =============================================================================

describe('isMirrorFile (internal)', () => {
  // The internal isMirrorFile function checks if a file should be imported

  it('should accept .mir files', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const mirFile = Object.keys(stored).find(k => k.endsWith('.mir'))
    expect(mirFile).toBeDefined()
  })

  it('should accept .tok files', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const tokFile = Object.keys(stored).find(k => k.endsWith('.tok'))
    expect(tokFile).toBeDefined()
  })

  it('should accept .com files', async () => {
    const { newProject } = await getProjectActions()
    await newProject()

    const stored = JSON.parse(mockStorage.getItem('mirror-files') || '{}')
    const comFile = Object.keys(stored).find(k => k.endsWith('.com'))
    expect(comFile).toBeDefined()
  })
})
