/**
 * File Tree View
 *
 * Thin DOM rendering layer.
 * All logic delegated to FileTreeController.
 */

import type { StorageItem, StorageFolder } from '../storage/types'
import { FileTreeController, type ContextMenuTarget } from './controller'
import { getFileType, sortTreeItems } from './utils'

// Custom dialog module (loaded globally)
declare const MirrorDialog: {
  confirmDelete: (itemName: string, options?: { message?: string }) => Promise<boolean>
}

// =============================================================================
// Icons
// =============================================================================

const ICONS = {
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
  folderOpen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"></path><path d="M5 12h16l-2 7H3l2-7z"></path></svg>`,
  chevron: `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  layout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  tokens: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>`,
  component: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`
}

const FILE_ICONS: Record<string, string> = {
  layout: ICONS.layout,
  tokens: ICONS.tokens,
  component: ICONS.component,
  unknown: ICONS.layout
}

// =============================================================================
// HTML Escaping
// =============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function escapeAttr(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// =============================================================================
// File Tree View
// =============================================================================

export class FileTreeView {
  private container: HTMLElement | null = null
  private contextMenu: { element: HTMLElement; target: ContextMenuTarget } | null = null
  private draggedItem: string | null = null

  constructor(private controller: FileTreeController) {}

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Mount view to container element
   */
  mount(containerId: string): void {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      console.error(`[FileTreeView] Container not found: ${containerId}`)
      return
    }

    // Setup global click handler to close context menu
    document.addEventListener('click', () => this.hideContextMenu())

    // Initial render
    this.render()
  }

  /**
   * Render the file tree
   */
  render(): void {
    if (!this.container) return

    const tree = this.controller.getTree()
    const projectName = this.controller.getProjectName() || 'Project'

    if (!this.controller.hasProject() || tree.length === 0) {
      this.container.innerHTML = `
        <div class="file-tree-empty">
          <div class="file-tree-empty-icon">${ICONS.folder}</div>
          <div class="file-tree-empty-text">No folder open</div>
        </div>
      `
      return
    }

    this.container.innerHTML = `
      <div class="file-tree-root">
        <div class="file-tree-items">
          <div class="file-tree-folder expanded" data-path="." data-root="true">
            <div class="file-tree-folder-header" style="padding-left: 8px">
              ${ICONS.chevron}
              <span>${escapeHtml(projectName)}</span>
            </div>
            <div class="file-tree-folder-children">
              ${this.renderItems(tree)}
            </div>
          </div>
        </div>
      </div>
    `

    this.attachEvents()
  }

  // ===========================================================================
  // Rendering
  // ===========================================================================

  private renderItems(items: StorageItem[], depth: number = 1): string {
    const sorted = sortTreeItems(items)
    return sorted.map(item => {
      if (item.type === 'folder') {
        return this.renderFolder(item as StorageFolder, depth)
      } else {
        return this.renderFile(item, depth)
      }
    }).join('')
  }

  private renderFolder(folder: StorageFolder, depth: number): string {
    const isExpanded = this.controller.isFolderExpanded(folder.path)
    const escapedName = escapeHtml(folder.name)
    const escapedPath = escapeAttr(folder.path)

    return `
      <div class="file-tree-folder ${isExpanded ? 'expanded' : ''}"
           data-path="${escapedPath}"
           draggable="true">
        <div class="file-tree-folder-header" style="padding-left: ${8 + depth * 12}px">
          ${ICONS.chevron}
          <span>${escapedName}</span>
        </div>
        <div class="file-tree-folder-children">
          ${isExpanded ? this.renderItems(folder.children || [], depth + 1) : ''}
        </div>
      </div>
    `
  }

  private renderFile(file: StorageItem, depth: number): string {
    const fileType = getFileType(file.name)
    const isActive = this.controller.currentFile === file.path
    const escapedName = escapeHtml(file.name)
    const escapedPath = escapeAttr(file.path)
    const icon = FILE_ICONS[fileType.type] || FILE_ICONS.unknown

    return `
      <div class="file-tree-file ${isActive ? 'active' : ''}"
           data-path="${escapedPath}"
           draggable="true"
           style="padding-left: ${16 + depth * 12}px">
        <span class="file-icon" style="color: ${fileType.color}">${icon}</span>
        <span>${escapedName}</span>
      </div>
    `
  }

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  private attachEvents(): void {
    if (!this.container) return

    // File clicks
    this.container.querySelectorAll('.file-tree-file').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.file-tree-rename-input')) return
        const path = (el as HTMLElement).dataset.path
        if (path) this.controller.selectFile(path)
      })
      el.addEventListener('contextmenu', (e) => this.showContextMenu(e as MouseEvent, el as HTMLElement))
    })

    // Folder toggle
    this.container.querySelectorAll('.file-tree-folder-header').forEach(el => {
      el.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.file-tree-rename-input')) return
        const folder = (el as HTMLElement).closest('.file-tree-folder') as HTMLElement
        const path = folder?.dataset.path
        if (path && path !== '.') {
          this.controller.toggleFolder(path)
        }
      })
      el.addEventListener('contextmenu', (e) => {
        const folder = (el as HTMLElement).closest('.file-tree-folder') as HTMLElement
        this.showContextMenu(e as MouseEvent, folder)
      })
    })

    // Empty area context menu
    this.container.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement
      if (target === this.container || target.classList.contains('file-tree-items')) {
        this.showContextMenu(e as MouseEvent, null)
      }
    })

    // Drag & Drop
    this.attachDragEvents()
  }

  private attachDragEvents(): void {
    if (!this.container) return

    this.container.querySelectorAll('.file-tree-file, .file-tree-folder').forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.root === 'true') return

      element.addEventListener('dragstart', (e) => {
        this.draggedItem = element.dataset.path || null
        element.classList.add('dragging')
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', element.dataset.path || '')
        }
      })

      element.addEventListener('dragend', () => {
        element.classList.remove('dragging')
        this.draggedItem = null
        this.container?.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
      })
    })

    this.container.querySelectorAll('.file-tree-folder').forEach(folder => {
      const folderEl = folder as HTMLElement

      folderEl.addEventListener('dragover', (e) => {
        e.preventDefault()
        if (this.draggedItem && this.draggedItem !== folderEl.dataset.path) {
          if (!this.draggedItem.startsWith(folderEl.dataset.path + '/')) {
            folderEl.classList.add('drag-over')
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
          }
        }
      })

      folderEl.addEventListener('dragleave', (e) => {
        if (!folderEl.contains(e.relatedTarget as Node)) {
          folderEl.classList.remove('drag-over')
        }
      })

      folderEl.addEventListener('drop', async (e) => {
        e.preventDefault()
        e.stopPropagation()
        folderEl.classList.remove('drag-over')

        if (!this.draggedItem || this.draggedItem === folderEl.dataset.path) return
        if (this.draggedItem.startsWith(folderEl.dataset.path + '/')) return

        const targetFolder = folderEl.dataset.path === '.' ? '' : folderEl.dataset.path || ''
        await this.controller.moveItem(this.draggedItem, targetFolder)
        this.draggedItem = null
      })
    })
  }

  // ===========================================================================
  // Context Menu
  // ===========================================================================

  private showContextMenu(e: MouseEvent, targetEl: HTMLElement | null): void {
    e.preventDefault()
    e.stopPropagation()
    this.hideContextMenu()

    const isFile = targetEl?.classList.contains('file-tree-file') || false
    const isFolder = targetEl?.classList.contains('file-tree-folder') || false
    const isRoot = targetEl?.dataset.root === 'true'
    const path = targetEl?.dataset.path || null

    const target: ContextMenuTarget = { path, isFile, isFolder, isRoot }
    const actions = this.controller.getContextMenuActions(target)

    const menu = document.createElement('div')
    menu.className = 'context-menu'

    for (const action of actions) {
      if (action === 'divider') {
        menu.innerHTML += `<div class="context-menu-divider"></div>`
      } else {
        const label = this.getActionLabel(action)
        const danger = action === 'delete' ? 'danger' : ''
        menu.innerHTML += `<div class="context-menu-item ${danger}" data-action="${action}">${label}</div>`
      }
    }

    // Position menu
    let x = e.clientX
    let y = e.clientY

    document.body.appendChild(menu)
    const rect = menu.getBoundingClientRect()

    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 8
    }
    if (y + rect.height > window.innerHeight) {
      y = window.innerHeight - rect.height - 8
    }

    menu.style.left = `${Math.max(8, x)}px`
    menu.style.top = `${Math.max(8, y)}px`

    this.contextMenu = { element: menu, target }

    // Action handlers
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation()
        const action = (item as HTMLElement).dataset.action
        if (action) this.handleContextAction(action)
      })
    })
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.element.remove()
      this.contextMenu = null
    }
  }

  private getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'rename': 'Rename',
      'duplicate': 'Duplicate',
      'delete': 'Delete',
      'new-file': 'New File',
      'new-folder': 'New Folder'
    }
    return labels[action] || action
  }

  private async handleContextAction(action: string): Promise<void> {
    const target = this.contextMenu?.target
    this.hideContextMenu()

    if (!target) return

    switch (action) {
      case 'rename':
        if (target.path) this.startInlineRename(target.path)
        break
      case 'duplicate':
        if (target.path && target.isFile) {
          await this.controller.duplicateFile(target.path)
        }
        break
      case 'delete':
        if (target.path) {
          const name = target.path.split('/').pop() || ''
          const msg = target.isFolder
            ? `Ordner "${name}" und alle Inhalte löschen?`
            : `"${name}" löschen?`
          if (await MirrorDialog.confirmDelete(name, { message: msg })) {
            await this.controller.deleteItem(target.path, target.isFolder)
          }
        }
        break
      case 'new-file':
        this.startInlineCreate('file', target.isFolder ? target.path : null)
        break
      case 'new-folder':
        this.startInlineCreate('folder', target.isFolder ? target.path : null)
        break
    }
  }

  // ===========================================================================
  // Inline Editing
  // ===========================================================================

  private startInlineRename(path: string): void {
    const element = this.container?.querySelector(`[data-path="${path}"]`) as HTMLElement
    if (!element) return

    const nameSpan = element.querySelector('span:last-child') as HTMLElement
    if (!nameSpan) return

    const oldName = nameSpan.textContent || ''

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'file-tree-rename-input'
    input.value = oldName

    nameSpan.replaceWith(input)
    input.focus()

    // Select name without extension
    const dotIndex = oldName.lastIndexOf('.')
    if (dotIndex > 0) {
      input.setSelectionRange(0, dotIndex)
    } else {
      input.select()
    }

    const finishRename = async () => {
      const newName = input.value.trim()
      if (newName && newName !== oldName) {
        const success = await this.controller.renameItem(path, newName)
        if (!success) {
          // Revert on failure
          const span = document.createElement('span')
          span.textContent = oldName
          input.replaceWith(span)
        }
      } else {
        const span = document.createElement('span')
        span.textContent = oldName
        input.replaceWith(span)
      }
    }

    input.addEventListener('blur', finishRename)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        input.blur()
      }
      if (e.key === 'Escape') {
        input.value = oldName
        input.blur()
      }
    })
  }

  private startInlineCreate(type: 'file' | 'folder', parentPath: string | null): void {
    // Find container
    let container: HTMLElement | null = null
    if (parentPath && parentPath !== '.') {
      const parentFolder = this.container?.querySelector(`[data-path="${parentPath}"]`) as HTMLElement
      if (parentFolder) {
        this.controller.expandFolder(parentPath)
        parentFolder.classList.add('expanded')
        container = parentFolder.querySelector('.file-tree-folder-children')
      }
    }

    if (!container) {
      container = this.container?.querySelector('[data-root="true"] .file-tree-folder-children') || null
    }

    if (!container) return

    const isFile = type === 'file'
    const defaultName = isFile ? 'new-file.mir' : 'new-folder'
    const depth = parentPath && parentPath !== '.' ? parentPath.split('/').length + 1 : 1

    const tempElement = document.createElement('div')

    if (isFile) {
      const fileType = getFileType(defaultName)
      const icon = FILE_ICONS[fileType.type] || FILE_ICONS.unknown
      tempElement.className = 'file-tree-file creating'
      tempElement.style.paddingLeft = `${16 + depth * 12}px`
      tempElement.innerHTML = `
        <span class="file-icon" style="color: ${fileType.color}">${icon}</span>
        <input type="text" class="file-tree-rename-input" value="${defaultName}" />
      `
    } else {
      tempElement.className = 'file-tree-folder creating'
      tempElement.style.paddingLeft = `${8 + depth * 12}px`
      tempElement.innerHTML = `
        <div class="file-tree-folder-header" style="padding-left: 0">
          ${ICONS.chevron}
          <input type="text" class="file-tree-rename-input" value="${defaultName}" />
        </div>
      `
    }

    container.insertBefore(tempElement, container.firstChild)

    const input = tempElement.querySelector('input') as HTMLInputElement
    input.focus()

    if (isFile) {
      const dotIndex = defaultName.lastIndexOf('.')
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex)
      } else {
        input.select()
      }
    } else {
      input.select()
    }

    let finished = false

    const finishCreate = async () => {
      if (finished) return
      finished = true

      const name = input.value.trim()
      tempElement.remove()

      if (!name) return

      if (isFile) {
        await this.controller.createFile(name, parentPath)
      } else {
        await this.controller.createFolder(name, parentPath)
      }
    }

    input.addEventListener('blur', finishCreate)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        finishCreate()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        finished = true
        tempElement.remove()
      }
    })
  }
}
