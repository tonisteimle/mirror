/**
 * Tests for studio/storage/index.ts (singleton + barrel) and
 * studio/storage/providers/index.ts (provider factory + auto-detection).
 *
 * Previously zero coverage on either file. The factories are not pure —
 * they branch on `isTauri()` and `isLocalStorageAvailable()` — so tests
 * mock those globals where needed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub a minimal TauriBridge BEFORE importing modules — TauriProvider's
// constructor reads window.TauriBridge eagerly, so we can't construct one
// in jsdom unless we provide one.
;(globalThis as unknown as { window: { TauriBridge: unknown } }).window =
  (globalThis as unknown as { window?: { TauriBridge?: unknown } }).window ?? ({} as never)
;(globalThis as unknown as { window: { TauriBridge: unknown } }).window.TauriBridge = {
  fs: {
    readFile: async () => '',
    writeFile: async () => {},
    listDirectory: async () => ({ path: '', files: [] }),
    createDirectory: async () => {},
    deletePath: async () => {},
    renamePath: async () => {},
    pathExists: async () => false,
  },
  dialog: { openFolder: async () => null, openFile: async () => null },
  project: { getRecentProjects: async () => [] },
  window: { setTitle: async () => {} },
}

import {
  detectProvider,
  createProvider,
  TauriProvider,
  LocalStorageProvider,
  DemoProvider,
} from '../../studio/storage/providers'
import { storage, StorageService, StorageEventEmitter } from '../../studio/storage'

describe('storage/index.ts — public API barrel', () => {
  it('exports a singleton `storage` of type StorageService', () => {
    expect(storage).toBeInstanceOf(StorageService)
  })

  it('the singleton is the SAME instance on repeated imports (no re-construction)', async () => {
    const { storage: s2 } = await import('../../studio/storage')
    expect(s2).toBe(storage)
  })

  it('re-exports StorageEventEmitter type', () => {
    // Sanity: StorageEventEmitter is a class we can instantiate.
    const ev = new StorageEventEmitter()
    expect(ev).toBeInstanceOf(StorageEventEmitter)
  })

  it('re-exports getMirrorFileType / isMirrorProjectFile / FILE_EXTENSIONS', async () => {
    const mod = await import('../../studio/storage')
    expect(typeof mod.getMirrorFileType).toBe('function')
    expect(typeof mod.isMirrorProjectFile).toBe('function')
    expect(mod.FILE_EXTENSIONS.layout).toContain('.mir')
  })

  it('re-exports project-actions surface (newProject, loadDemoProject, etc.)', async () => {
    const mod = await import('../../studio/storage')
    expect(typeof mod.newProject).toBe('function')
    expect(typeof mod.loadDemoProject).toBe('function')
    expect(typeof mod.importProject).toBe('function')
    expect(typeof mod.exportProject).toBe('function')
    expect(mod.projectActions).toBeDefined()
    expect(mod.DEFAULT_PROJECT).toBeDefined()
  })
})

// Hoist mock so vi.mock('./tauri') gets picked up by Vitest before imports resolve
vi.mock('../../studio/storage/providers/tauri', async importOriginal => {
  const actual = (await importOriginal()) as { TauriProvider: unknown; isTauri: () => boolean }
  return { ...actual, isTauri: vi.fn(() => false) }
})

vi.mock('../../studio/storage/providers/localstorage', async importOriginal => {
  const actual = (await importOriginal()) as {
    LocalStorageProvider: unknown
    isLocalStorageAvailable: () => boolean
  }
  return { ...actual, isLocalStorageAvailable: vi.fn(() => true) }
})

describe('providers/index.ts — createProvider', () => {
  it('returns a TauriProvider for type "tauri"', () => {
    const p = createProvider('tauri')
    expect(p).toBeInstanceOf(TauriProvider)
    expect(p.type).toBe('tauri')
  })

  it('returns a LocalStorageProvider for type "localstorage"', () => {
    const p = createProvider('localstorage')
    expect(p).toBeInstanceOf(LocalStorageProvider)
    expect(p.type).toBe('localstorage')
  })

  it('returns a DemoProvider for type "demo"', () => {
    const p = createProvider('demo')
    expect(p).toBeInstanceOf(DemoProvider)
    expect(p.type).toBe('demo')
  })

  it('throws with informative message for unknown provider types', () => {
    expect(() => createProvider('totally-fake' as never)).toThrow(/Unknown provider type/)
    expect(() => createProvider('totally-fake' as never)).toThrow(/totally-fake/)
  })
})

describe('providers/index.ts — detectProvider', () => {
  let isTauriMock: ReturnType<typeof vi.fn>
  let isLocalStorageMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const tauriMod = await import('../../studio/storage/providers/tauri')
    isTauriMock = tauriMod.isTauri as unknown as ReturnType<typeof vi.fn>
    const lsMod = await import('../../studio/storage/providers/localstorage')
    isLocalStorageMock = lsMod.isLocalStorageAvailable as unknown as ReturnType<typeof vi.fn>
    isTauriMock.mockClear()
    isLocalStorageMock.mockClear()
  })

  afterEach(() => {
    // Reset to default behavior for next test
    isTauriMock.mockReturnValue(false)
    isLocalStorageMock.mockReturnValue(true)
  })

  it('prefers Tauri when isTauri() returns true', async () => {
    isTauriMock.mockReturnValue(true)
    const p = await detectProvider()
    expect(p).toBeInstanceOf(TauriProvider)
    expect(p.type).toBe('tauri')
  })

  it('falls back to LocalStorage when Tauri is unavailable', async () => {
    isTauriMock.mockReturnValue(false)
    isLocalStorageMock.mockReturnValue(true)
    const p = await detectProvider()
    expect(p).toBeInstanceOf(LocalStorageProvider)
    expect(p.type).toBe('localstorage')
  })

  it('throws when neither Tauri nor LocalStorage are available', async () => {
    isTauriMock.mockReturnValue(false)
    isLocalStorageMock.mockReturnValue(false)
    await expect(detectProvider()).rejects.toThrow(/No storage provider available/)
  })

  it('does NOT consult isLocalStorageAvailable when Tauri is detected (short-circuit)', async () => {
    isTauriMock.mockReturnValue(true)
    isLocalStorageMock.mockClear()
    await detectProvider()
    expect(isLocalStorageMock).not.toHaveBeenCalled()
  })

  it('priority order is locked: Tauri > LocalStorage (NOT alphabetical or otherwise)', async () => {
    // Both available — Tauri wins because it's checked first.
    isTauriMock.mockReturnValue(true)
    isLocalStorageMock.mockReturnValue(true)
    const p = await detectProvider()
    expect(p.type).toBe('tauri')
  })
})
