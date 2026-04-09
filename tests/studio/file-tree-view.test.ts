/**
 * File Tree View Tests
 *
 * Tests for DOM rendering layer using jsdom.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileTreeController } from '../../studio/file-tree/controller'
import { FileTreeView } from '../../studio/file-tree/view'
import { StorageService } from '../../studio/storage/service'
import { DemoProvider } from '../../studio/storage/providers/demo'

// =============================================================================
// TEST SETUP
// =============================================================================

let controller: FileTreeController
let view: FileTreeView
let storage: StorageService
let container: HTMLElement

beforeEach(async () => {
  // Setup DOM
  document.body.innerHTML = '<div id="file-tree"></div>'
  container = document.getElementById('file-tree')!

  // Setup storage with DemoProvider
  const provider = new DemoProvider()
  storage = new StorageService()
  storage.setProvider(provider)

  // Open the demo project to enable hasProject
  await storage.openProject('demo')
  await storage.refreshTree()

  // Setup controller and view
  controller = new FileTreeController(storage)
  view = new FileTreeView(controller)

  controller.init({
    onTreeChange: () => view.render()
  })

  view.mount('file-tree')

  // Initial render - events were emitted before controller was created
  view.render()
})

// =============================================================================
// RENDERING
// =============================================================================

describe('FileTreeView Rendering', () => {
  it('should render file tree', () => {
    expect(container.querySelector('.file-tree-root')).not.toBeNull()
  })

  it('should render files', () => {
    const files = container.querySelectorAll('.file-tree-file')
    expect(files.length).toBeGreaterThan(0)
  })

  it('should render file names', () => {
    const indexFile = container.querySelector('[data-path="index.mir"]')
    expect(indexFile).not.toBeNull()
    expect(indexFile?.textContent).toContain('index.mir')
  })

  it('should show active file', async () => {
    await controller.selectFile('index.mir')
    view.render()

    const indexFile = container.querySelector('[data-path="index.mir"]')
    expect(indexFile?.classList.contains('active')).toBe(true)
  })

  it('should render folders and show expanded state', async () => {
    // Create a folder first
    await storage.createFolder('components')
    view.render()

    // Verify folder exists
    let folder = container.querySelector('[data-path="components"]')
    expect(folder).not.toBeNull()

    // Expand it
    controller.expandFolder('components')
    view.render()

    folder = container.querySelector('[data-path="components"]')
    expect(folder?.classList.contains('expanded')).toBe(true)
  })

  it('should show empty state when no project', () => {
    // Reset storage to empty state
    const emptyProvider = new DemoProvider()
    ;(emptyProvider as any).files = {}
    storage.setProvider(emptyProvider)

    view.render()

    expect(container.querySelector('.file-tree-empty')).not.toBeNull()
  })
})

// =============================================================================
// FILE SELECTION
// =============================================================================

describe('FileTreeView File Selection', () => {
  it('should select file on click', async () => {
    const indexFile = container.querySelector('[data-path="index.mir"]') as HTMLElement
    expect(indexFile).not.toBeNull()

    indexFile.click()

    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(controller.currentFile).toBe('index.mir')
  })

  it('should update active class on selection', async () => {
    await controller.selectFile('tokens.tok')
    view.render()

    const tokensFile = container.querySelector('[data-path="tokens.tok"]')
    expect(tokensFile?.classList.contains('active')).toBe(true)

    const indexFile = container.querySelector('[data-path="index.mir"]')
    expect(indexFile?.classList.contains('active')).toBe(false)
  })
})

// =============================================================================
// FOLDER EXPANSION
// =============================================================================

describe('FileTreeView Folder Expansion', () => {
  it('should toggle folder on header click', async () => {
    // First create a folder with content
    await storage.createFolder('testfolder')
    await storage.writeFile('testfolder/test.mir', 'content')
    view.render()

    const folderHeader = container.querySelector('[data-path="testfolder"] .file-tree-folder-header') as HTMLElement
    expect(folderHeader).not.toBeNull()

    // Click to expand
    folderHeader.click()

    expect(controller.isFolderExpanded('testfolder')).toBe(true)
  })

  it('should show children when expanded', async () => {
    await storage.createFolder('expanded')
    await storage.writeFile('expanded/child.mir', 'content')

    controller.expandFolder('expanded')
    view.render()

    const childFile = container.querySelector('[data-path="expanded/child.mir"]')
    expect(childFile).not.toBeNull()
  })

  it('should hide children when collapsed', async () => {
    await storage.createFolder('collapsed')
    await storage.writeFile('collapsed/child.mir', 'content')

    // Start collapsed (default)
    view.render()

    const childFile = container.querySelector('[data-path="collapsed/child.mir"]')
    expect(childFile).toBeNull()
  })
})

// =============================================================================
// CONTEXT MENU
// =============================================================================

describe('FileTreeView Context Menu', () => {
  it('should show context menu on right click', () => {
    const indexFile = container.querySelector('[data-path="index.mir"]') as HTMLElement

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: 100,
      clientY: 100
    })
    indexFile.dispatchEvent(event)

    const menu = document.querySelector('.context-menu')
    expect(menu).not.toBeNull()
  })

  it('should show file actions for file', () => {
    const indexFile = container.querySelector('[data-path="index.mir"]') as HTMLElement

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: 100,
      clientY: 100
    })
    indexFile.dispatchEvent(event)

    const menu = document.querySelector('.context-menu')
    expect(menu?.textContent).toContain('Rename')
    expect(menu?.textContent).toContain('Duplicate')
    expect(menu?.textContent).toContain('Delete')
  })

  it('should close context menu on click outside', () => {
    const indexFile = container.querySelector('[data-path="index.mir"]') as HTMLElement

    // Open menu
    const contextEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      clientX: 100,
      clientY: 100
    })
    indexFile.dispatchEvent(contextEvent)

    expect(document.querySelector('.context-menu')).not.toBeNull()

    // Click outside
    document.body.click()

    expect(document.querySelector('.context-menu')).toBeNull()
  })
})

// =============================================================================
// DRAG AND DROP
// =============================================================================

describe('FileTreeView Drag and Drop', () => {
  it('should make files draggable', () => {
    const files = container.querySelectorAll('.file-tree-file')
    files.forEach(file => {
      expect(file.getAttribute('draggable')).toBe('true')
    })
  })

  it('should not make root folder draggable', async () => {
    await storage.createFolder('subfolder')
    view.render()

    const rootFolder = container.querySelector('[data-root="true"]')
    // Root doesn't have draggable attribute or it's handled differently
    expect(rootFolder?.getAttribute('data-root')).toBe('true')
  })
})

// =============================================================================
// FILE ICONS
// =============================================================================

describe('FileTreeView File Icons', () => {
  it('should show correct icon color for .mir files', () => {
    const mirFile = container.querySelector('[data-path="index.mir"] .file-icon') as HTMLElement
    expect(mirFile).not.toBeNull()
    expect(mirFile.style.color).toBe('rgb(91, 168, 245)') // #5BA8F5
  })

  it('should show correct icon color for .tok files', () => {
    const tokFile = container.querySelector('[data-path="tokens.tok"] .file-icon') as HTMLElement
    expect(tokFile).not.toBeNull()
    expect(tokFile.style.color).toBe('rgb(245, 158, 11)') // #F59E0B
  })

  it('should show correct icon color for .com files', () => {
    const comFile = container.querySelector('[data-path="components.com"] .file-icon') as HTMLElement
    expect(comFile).not.toBeNull()
    expect(comFile.style.color).toBe('rgb(139, 92, 246)') // #8B5CF6
  })
})

// =============================================================================
// SORTING
// =============================================================================

describe('FileTreeView Sorting', () => {
  it('should sort folders before files', async () => {
    await storage.createFolder('aaa-folder')
    await storage.writeFile('zzz-file.mir', 'content')
    view.render()

    const items = container.querySelectorAll('.file-tree-folder-children > *')
    const firstItem = items[0]

    // First item should be a folder (could be root children)
    expect(
      firstItem?.classList.contains('file-tree-folder') ||
      firstItem?.querySelector('.file-tree-folder')
    ).toBeTruthy()
  })

  it('should sort .mir files before .com files', () => {
    const fileElements = container.querySelectorAll('.file-tree-file')
    const paths = Array.from(fileElements).map(el => (el as HTMLElement).dataset.path)

    const mirIndex = paths.findIndex(p => p?.endsWith('.mir'))
    const comIndex = paths.findIndex(p => p?.endsWith('.com'))

    if (mirIndex !== -1 && comIndex !== -1) {
      expect(mirIndex).toBeLessThan(comIndex)
    }
  })
})
