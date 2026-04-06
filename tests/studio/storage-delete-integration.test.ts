/**
 * Delete Integration Test
 * 
 * Testet den kompletten Delete-Flow: Provider -> Service -> Event -> Tree
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageService } from '../../studio/storage/service'
import { DemoProvider } from '../../studio/storage/providers/demo'

describe('Delete Integration', () => {
  let service: StorageService
  let provider: DemoProvider

  beforeEach(async () => {
    provider = new DemoProvider()
    service = new StorageService()
    service.setProvider(provider)
    await service.refreshTree()
  })

  it('should delete file and update tree', async () => {
    // Setup: Datei existiert
    await service.writeFile('todelete.mir', 'content')
    let tree = service.getTree()
    expect(tree.some(f => f.path === 'todelete.mir')).toBe(true)

    // Delete
    await service.deleteFile('todelete.mir')

    // Tree sollte aktualisiert sein
    tree = service.getTree()
    expect(tree.some(f => f.path === 'todelete.mir')).toBe(false)
  })

  it('should emit file:deleted event AFTER tree is updated', async () => {
    await service.writeFile('test.mir', 'content')
    
    let treeAtEventTime: any[] = []
    
    service.events.on('file:deleted', () => {
      // Zum Zeitpunkt des Events sollte der Tree schon aktualisiert sein
      treeAtEventTime = service.getTree()
    })

    await service.deleteFile('test.mir')

    // Event wurde ausgelöst
    expect(treeAtEventTime).toBeDefined()
    // Tree enthält die Datei nicht mehr
    expect(treeAtEventTime.some(f => f.path === 'test.mir')).toBe(false)
  })

  it('should also emit tree:changed event', async () => {
    await service.writeFile('test.mir', 'content')
    
    const treeChangedCallback = vi.fn()
    service.events.on('tree:changed', treeChangedCallback)

    await service.deleteFile('test.mir')

    // tree:changed sollte VOR file:deleted gefeuert werden
    expect(treeChangedCallback).toHaveBeenCalled()
  })

  it('LocalStorage: should persist delete', async () => {
    // Mock localStorage
    const mockStorage: Record<string, string> = {
      'mirror-files': JSON.stringify({
        'index.mir': 'content',
        'todelete.mir': 'delete me'
      })
    }
    
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value },
      removeItem: (key: string) => { delete mockStorage[key] },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) },
      length: Object.keys(mockStorage).length,
      key: (i: number) => Object.keys(mockStorage)[i] ?? null
    })

    const { LocalStorageProvider } = await import('../../studio/storage/providers/localstorage')
    const lsProvider = new LocalStorageProvider()
    
    // Datei existiert
    const content = await lsProvider.readFile('todelete.mir')
    expect(content).toBe('delete me')

    // Delete
    await lsProvider.deleteFile('todelete.mir')

    // Datei ist weg
    await expect(lsProvider.readFile('todelete.mir')).rejects.toThrow()

    // Storage wurde aktualisiert
    const stored = JSON.parse(mockStorage['mirror-files'])
    expect(stored['todelete.mir']).toBeUndefined()
    expect(stored['index.mir']).toBe('content')

    vi.unstubAllGlobals()
  })
})
