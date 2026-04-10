/**
 * File Tree Initialization
 *
 * Entry point for the file tree module.
 * Wires up controller, view, and storage.
 */

import { storage, projectActions } from '../storage'
import { FileTreeController } from './controller'
import { FileTreeView } from './view'

// Custom dialog module (loaded globally)
declare const MirrorDialog: {
  confirm: (message: string, options?: { title?: string; danger?: boolean }) => Promise<boolean>
}

// =============================================================================
// Singleton Instances
// =============================================================================

let controller: FileTreeController | null = null
let view: FileTreeView | null = null
let initialized = false

// =============================================================================
// Project Menu (Hamburger)
// =============================================================================

const ICON_HAMBURGER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="4" y1="6" x2="20" y2="6"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
  <line x1="4" y1="18" x2="20" y2="18"/>
</svg>`

const ICON_NEW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <path d="M14 2v6h6"/>
  <line x1="12" y1="18" x2="12" y2="12"/>
  <line x1="9" y1="15" x2="15" y2="15"/>
</svg>`

const ICON_DEMO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polygon points="5 3 19 12 5 21 5 3"/>
</svg>`

const ICON_LOAD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`

const ICON_SAVE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`

let menuOpen = false

function initProjectToolbar(containerId: string): void {
  const container = document.getElementById(containerId)
  if (!container) return

  // Check if already has header
  if (container.querySelector('.fp-header')) return

  // Create header
  const header = document.createElement('div')
  header.className = 'fp-header'
  header.innerHTML = `
    <span class="fp-title">Files</span>
    <div class="fp-header-actions">
      <button class="fp-menu-btn" id="project-menu-btn" title="Menü">
        ${ICON_HAMBURGER}
      </button>
    </div>
  `

  // Create content wrapper
  const content = document.createElement('div')
  content.id = 'file-tree-content'
  content.className = 'file-tree-content'

  // Move existing content
  while (container.firstChild) {
    content.appendChild(container.firstChild)
  }

  container.appendChild(header)
  container.appendChild(content)

  // Menu button handler
  const menuBtn = document.getElementById('project-menu-btn')
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleProjectMenu(menuBtn)
  })
}

function toggleProjectMenu(anchorBtn: HTMLElement): void {
  const existingMenu = document.getElementById('project-menu')
  if (existingMenu) {
    existingMenu.remove()
    menuOpen = false
    return
  }

  const menu = document.createElement('div')
  menu.id = 'project-menu'
  menu.className = 'dropdown-menu'

  const menuItems = [
    { id: 'new', icon: ICON_NEW, label: 'Neues Projekt' },
    { id: 'demo', icon: ICON_DEMO, label: 'Demo-Projekt' },
    { type: 'separator' },
    { id: 'load', icon: ICON_LOAD, label: 'Projekt öffnen...' },
    { id: 'save', icon: ICON_SAVE, label: 'Projekt speichern...' },
  ]

  for (const item of menuItems) {
    if (item.type === 'separator') {
      const sep = document.createElement('div')
      sep.className = 'dropdown-menu-separator'
      menu.appendChild(sep)
    } else {
      const btn = document.createElement('button')
      btn.className = 'dropdown-menu-item'
      btn.innerHTML = `
        <span class="dropdown-menu-icon">${item.icon}</span>
        <span class="dropdown-menu-label">${item.label}</span>
      `
      btn.addEventListener('click', () => handleMenuAction(item.id!))
      menu.appendChild(btn)
    }
  }

  const rect = anchorBtn.getBoundingClientRect()
  menu.style.position = 'fixed'
  menu.style.top = `${rect.bottom + 4}px`
  menu.style.left = `${rect.right - 180}px`
  menu.style.zIndex = '9999'

  document.body.appendChild(menu)
  menuOpen = true

  const closeMenu = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node) && e.target !== anchorBtn) {
      menu.remove()
      menuOpen = false
      document.removeEventListener('click', closeMenu)
    }
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 0)
}

async function handleMenuAction(action: string): Promise<void> {
  const menu = document.getElementById('project-menu')
  if (menu) {
    menu.remove()
    menuOpen = false
  }

  switch (action) {
    case 'new':
      if (!await MirrorDialog.confirm('Alle aktuellen Änderungen gehen verloren.', { title: 'Neues Projekt erstellen?' })) return
      await projectActions.new()
      break
    case 'demo':
      if (!await MirrorDialog.confirm('Alle aktuellen Änderungen gehen verloren.', { title: 'Demo-Projekt laden?' })) return
      await projectActions.demo()
      break
    case 'load':
      await projectActions.import()
      break
    case 'save':
      await projectActions.export()
      break
  }
}

// =============================================================================
// Initialization
// =============================================================================

export interface FileTreeOptions {
  containerId?: string
  onFileSelect?: (path: string, content: string) => void
  onFileChange?: (path: string, content: string) => void
  onError?: (error: Error, operation: string) => void
}

/**
 * Initialize the file tree
 */
export async function initFileTree(options: FileTreeOptions = {}): Promise<FileTreeController> {
  const {
    containerId = 'file-tree-container',
    onFileSelect,
    onFileChange,
    onError
  } = options

  // Initialize storage if needed
  if (!storage.isInitialized) {
    await storage.init()
  }

  console.log(`[FileTree] Initialized with ${storage.providerType} provider`)

  // Create controller
  controller = new FileTreeController(storage)
  controller.init({
    onFileSelect,
    onFileChange,
    onError: (error, op) => {
      console.error(`[FileTree] Error in ${op}:`, error)
      onError?.(error, op)
    },
    onTreeChange: () => {
      view?.render()
    }
  })

  // Setup toolbar
  initProjectToolbar(containerId)

  // Create and mount view
  view = new FileTreeView(controller)
  view.mount('file-tree-content')

  // Auto-open project
  if (!storage.hasProject) {
    try {
      const projects = await storage.listProjects()
      if (projects.length > 0) {
        await storage.openProject(projects[0].id)
      }
    } catch (e) {
      console.error('[FileTree] Failed to open project:', e)
    }
  }

  // Select first file
  setTimeout(async () => {
    if (!controller?.currentFile) {
      const tree = storage.getTree()
      const { findFirstFile } = await import('./utils')
      const firstFile = findFirstFile(tree)
      if (firstFile) {
        await controller?.selectFile(firstFile)
      }
    }
  }, 100)

  initialized = true

  // Expose globally for compatibility
  ;(window as any).fileTree = {
    selectFile: (path: string) => controller?.selectFile(path),
    saveFile: (path: string, content: string) => controller?.saveFile(path, content),
    createFile: (name: string, parent?: string) => controller?.createFile(name, parent || null),
    createFolder: (name: string, parent?: string) => controller?.createFolder(name, parent || null),
    deleteItem: (path: string, isFolder?: boolean) => controller?.deleteItem(path, isFolder || false),
    getCurrentFile: () => controller?.currentFile,
    getFileContent: (path: string) => controller?.getFileContent(path),
    getFiles: () => controller?.filesCache || {},
    updateFileCache: (path: string, content: string) => controller?.updateFileCache(path, content)
  }

  return controller
}

/**
 * Get the controller instance
 */
export function getFileTreeController(): FileTreeController | null {
  return controller
}

/**
 * Get the view instance
 */
export function getFileTreeView(): FileTreeView | null {
  return view
}
