// @vitest-environment jsdom
/**
 * Tests for studio/file-tree/init.ts
 *
 * init.ts is the boot wiring for the file tree:
 *  - initProjectToolbar (private, exercised via initFileTree)
 *  - toggleProjectMenu (private, exercised via DOM click)
 *  - handleMenuAction (private, exercised via DOM click)
 *  - initFileTree (public — wires controller + view + toolbar + auto-open)
 *  - getFileTreeController / getFileTreeView (accessors)
 *
 * The file was 0% covered. We mock `storage` and `projectActions` so we
 * can run initFileTree end-to-end in jsdom without a real provider, and
 * exercise all the menu paths.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ------- Mock storage + projectActions BEFORE importing init.ts -------
// Use vi.hoisted so the mock factory can reference these.

const { mockStorage, mockProjectActions } = vi.hoisted(() => {
  return {
    mockStorage: {
      isInitialized: true,
      hasProject: false,
      providerType: 'demo',
      init: vi.fn().mockResolvedValue(undefined),
      listProjects: vi.fn().mockResolvedValue([]),
      openProject: vi.fn().mockResolvedValue(undefined),
      refreshTree: vi.fn().mockResolvedValue(undefined),
      getTree: vi.fn().mockReturnValue([]),
      events: {
        on: vi.fn(() => () => {}),
        off: vi.fn(),
      },
      readFile: vi.fn().mockResolvedValue(''),
      writeFile: vi.fn().mockResolvedValue(undefined),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      deleteFolder: vi.fn().mockResolvedValue(undefined),
      renameFile: vi.fn().mockResolvedValue(undefined),
      copyFile: vi.fn().mockResolvedValue(undefined),
      moveItem: vi.fn().mockResolvedValue(undefined),
      createFolder: vi.fn().mockResolvedValue(undefined),
      getProjectName: vi.fn().mockReturnValue('Test Project'),
    },
    mockProjectActions: {
      new: vi.fn().mockResolvedValue(undefined),
      demo: vi.fn().mockResolvedValue(undefined),
      import: vi.fn().mockResolvedValue(undefined),
      export: vi.fn().mockResolvedValue(undefined),
    },
  }
})

vi.mock('../../studio/storage', () => ({
  storage: mockStorage,
  projectActions: mockProjectActions,
}))

// Global MirrorDialog stub (used by handleMenuAction confirms)
;(globalThis as any).MirrorDialog = {
  confirm: vi.fn().mockResolvedValue(true),
}

import { initFileTree, getFileTreeController, getFileTreeView } from '../../studio/file-tree/init'

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as any).MirrorDialog.confirm.mockResolvedValue(true)

  // Reset DOM
  document.body.innerHTML = `
    <div id="file-tree-container"></div>
  `
})

afterEach(() => {
  // Clear globals set by initFileTree
  delete (window as any).fileTree
})

describe('initFileTree', () => {
  it('renders the project toolbar header inside the container', async () => {
    await initFileTree({ containerId: 'file-tree-container' })

    const header = document.querySelector('#file-tree-container .fp-header')
    expect(header).not.toBeNull()
    expect(header?.querySelector('.fp-title')?.textContent).toBe('Files')
    expect(header?.querySelector('#project-menu-btn')).not.toBeNull()
  })

  it('returns the controller', async () => {
    const ctrl = await initFileTree({ containerId: 'file-tree-container' })
    expect(ctrl).not.toBeNull()
    expect(typeof ctrl.selectFile).toBe('function')
  })

  it('exposes a singleton via getFileTreeController/getFileTreeView', async () => {
    const ctrl = await initFileTree({ containerId: 'file-tree-container' })
    expect(getFileTreeController()).toBe(ctrl)
    expect(getFileTreeView()).not.toBeNull()
  })

  it('attaches a `fileTree` API surface onto window', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    const api = (window as any).fileTree
    expect(api).toBeDefined()
    expect(typeof api.selectFile).toBe('function')
    expect(typeof api.saveFile).toBe('function')
    expect(typeof api.createFile).toBe('function')
    expect(typeof api.createFolder).toBe('function')
    expect(typeof api.deleteItem).toBe('function')
    expect(typeof api.getCurrentFile).toBe('function')
    expect(typeof api.getFileContent).toBe('function')
    expect(typeof api.getFiles).toBe('function')
    expect(typeof api.updateFileCache).toBe('function')
  })

  it('calls storage.init() when storage is not yet initialized', async () => {
    mockStorage.isInitialized = false
    await initFileTree({ containerId: 'file-tree-container' })
    expect(mockStorage.init).toHaveBeenCalledOnce()
    mockStorage.isInitialized = true
  })

  it('does NOT call storage.init() when already initialized', async () => {
    mockStorage.isInitialized = true
    await initFileTree({ containerId: 'file-tree-container' })
    expect(mockStorage.init).not.toHaveBeenCalled()
  })

  it('auto-opens the first listed project when none is open', async () => {
    mockStorage.hasProject = false
    mockStorage.listProjects.mockResolvedValueOnce([
      { id: 'p1', name: 'Project 1' },
      { id: 'p2', name: 'Project 2' },
    ])
    await initFileTree({ containerId: 'file-tree-container' })
    expect(mockStorage.openProject).toHaveBeenCalledWith('p1')
  })

  it('does NOT auto-open when a project is already open', async () => {
    mockStorage.hasProject = true
    await initFileTree({ containerId: 'file-tree-container' })
    expect(mockStorage.openProject).not.toHaveBeenCalled()
    mockStorage.hasProject = false
  })

  it('survives if listProjects throws', async () => {
    mockStorage.hasProject = false
    mockStorage.listProjects.mockRejectedValueOnce(new Error('disk fail'))
    await expect(initFileTree({ containerId: 'file-tree-container' })).resolves.toBeDefined()
  })

  it('returns early without re-creating the header on second call', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    const headersBefore = document.querySelectorAll('.fp-header').length
    await initFileTree({ containerId: 'file-tree-container' })
    const headersAfter = document.querySelectorAll('.fp-header').length
    // Header should NOT be duplicated.
    expect(headersAfter).toBe(headersBefore)
  })
})

describe('Project menu — toggleProjectMenu', () => {
  it('opens the dropdown when the hamburger button is clicked', async () => {
    await initFileTree({ containerId: 'file-tree-container' })

    expect(document.getElementById('project-menu')).toBeNull()

    const menuBtn = document.getElementById('project-menu-btn')!
    menuBtn.click()

    const menu = document.getElementById('project-menu')
    expect(menu).not.toBeNull()
    // 4 menu items + 1 separator = 5 children
    const items = menu?.querySelectorAll('.dropdown-menu-item')
    const seps = menu?.querySelectorAll('.dropdown-menu-separator')
    expect(items?.length).toBe(4) // new, demo, load, save
    expect(seps?.length).toBe(1)
  })

  it('closes the dropdown when the hamburger button is clicked AGAIN', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    const menuBtn = document.getElementById('project-menu-btn')!
    menuBtn.click()
    expect(document.getElementById('project-menu')).not.toBeNull()
    menuBtn.click()
    expect(document.getElementById('project-menu')).toBeNull()
  })

  it('positions the menu via fixed position + z-index 9999', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    const menuBtn = document.getElementById('project-menu-btn')!
    menuBtn.click()
    const menu = document.getElementById('project-menu') as HTMLElement
    expect(menu.style.position).toBe('fixed')
    expect(menu.style.zIndex).toBe('9999')
  })
})

describe('Project menu — handleMenuAction', () => {
  // Helper: open menu, click the Nth item.
  async function clickMenuAction(index: number) {
    const menuBtn = document.getElementById('project-menu-btn')!
    menuBtn.click()
    const items = document.querySelectorAll('#project-menu .dropdown-menu-item')
    ;(items[index] as HTMLElement).click()
    // Let async confirms resolve
    await Promise.resolve()
    await Promise.resolve()
  }

  it('"Neues Projekt" calls projectActions.new() after confirm=true', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    ;(globalThis as any).MirrorDialog.confirm.mockResolvedValueOnce(true)
    await clickMenuAction(0) // first item: 'new'
    expect(mockProjectActions.new).toHaveBeenCalled()
  })

  it('"Neues Projekt" SKIPS projectActions.new() when confirm=false', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    ;(globalThis as any).MirrorDialog.confirm.mockResolvedValueOnce(false)
    await clickMenuAction(0)
    expect(mockProjectActions.new).not.toHaveBeenCalled()
  })

  it('"Demo-Projekt" calls projectActions.demo() after confirm', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    ;(globalThis as any).MirrorDialog.confirm.mockResolvedValueOnce(true)
    await clickMenuAction(1) // second item: 'demo'
    expect(mockProjectActions.demo).toHaveBeenCalled()
  })

  it('"Projekt öffnen" calls projectActions.import() (no confirm needed)', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    await clickMenuAction(2) // third item: 'load' → import
    expect(mockProjectActions.import).toHaveBeenCalled()
  })

  it('"Projekt speichern" calls projectActions.export() (no confirm needed)', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    await clickMenuAction(3) // fourth item: 'save' → export
    expect(mockProjectActions.export).toHaveBeenCalled()
  })

  it('closes the menu after clicking any action', async () => {
    await initFileTree({ containerId: 'file-tree-container' })
    expect(document.getElementById('project-menu')).toBeNull()
    await clickMenuAction(2) // import
    expect(document.getElementById('project-menu')).toBeNull()
  })
})

describe('initFileTree — error tolerance', () => {
  it('returns early when containerId is missing', async () => {
    document.body.innerHTML = '<div id="other"></div>'
    // Should still resolve — initProjectToolbar bails silently.
    await expect(initFileTree({ containerId: 'file-tree-container' })).resolves.toBeDefined()
  })
})
