/**
 * File Panel Module
 *
 * Displays and manages project files.
 *
 * NOTE: This module is DEPRECATED - use desktop-files.js instead.
 * Kept for backwards compatibility only.
 */

// Local type definitions (previously imported from file-manager)
export type FileType = 'tokens' | 'component' | 'layout'

export interface FileMetadata {
  name: string
  type: FileType
  modified: Date
}

export interface FilePanelConfig {
  container: HTMLElement
  showIcons?: boolean
  groupByType?: boolean
  sortBy?: 'name' | 'type' | 'modified'
  showActions?: boolean
}

export interface FilePanelCallbacks {
  onSelect: (filename: string) => void
  onCreate?: (type: FileType) => void
  onDelete?: (filename: string) => void
  onRename?: (oldName: string, newName: string) => void
  onDuplicate?: (filename: string) => void
}

export class FilePanel {
  private container: HTMLElement
  private config: Required<FilePanelConfig>
  private callbacks: FilePanelCallbacks
  private files: FileMetadata[] = []
  private currentFile: string | null = null
  private contextMenuTarget: string | null = null

  constructor(config: FilePanelConfig, callbacks: FilePanelCallbacks) {
    this.container = config.container
    this.config = {
      showIcons: true,
      groupByType: true,
      sortBy: 'type',
      showActions: true,
      ...config,
    }
    this.callbacks = callbacks
    this.container.classList.add('file-panel')
  }

  render(files: FileMetadata[], currentFile: string | null): void {
    this.files = files
    this.currentFile = currentFile
    this.renderFiles()
  }

  refresh(): void {
    this.renderFiles()
  }

  selectFile(filename: string): void {
    this.currentFile = filename
    this.renderFiles()
  }

  getSelectedFile(): string | null {
    return this.currentFile
  }

  showContextMenu(filename: string, position: { x: number; y: number }): void {
    this.hideContextMenu()
    this.contextMenuTarget = filename

    const menu = document.createElement('div')
    menu.className = 'file-panel-context-menu'
    menu.style.left = `${position.x}px`
    menu.style.top = `${position.y}px`

    const actions = [
      { label: 'Rename', action: () => this.startRename(filename) },
      { label: 'Duplicate', action: () => this.callbacks.onDuplicate?.(filename) },
      { label: 'Delete', action: () => this.callbacks.onDelete?.(filename), danger: true },
    ]

    for (const item of actions) {
      const btn = document.createElement('button')
      btn.className = `file-panel-context-item ${item.danger ? 'danger' : ''}`
      btn.textContent = item.label
      btn.onclick = () => {
        this.hideContextMenu()
        item.action()
      }
      menu.appendChild(btn)
    }

    document.body.appendChild(menu)

    // Close on click outside
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.hideContextMenu()
        document.removeEventListener('mousedown', closeHandler)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 0)
  }

  hideContextMenu(): void {
    const menu = document.querySelector('.file-panel-context-menu')
    menu?.remove()
    this.contextMenuTarget = null
  }

  private renderFiles(): void {
    this.container.innerHTML = ''

    // Header with add button
    if (this.config.showActions) {
      this.container.appendChild(this.renderHeader())
    }

    // File list
    const list = document.createElement('div')
    list.className = 'file-panel-list'

    if (this.config.groupByType) {
      this.renderGroupedFiles(list)
    } else {
      this.renderFlatFiles(list)
    }

    this.container.appendChild(list)
  }

  private renderHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'file-panel-header'

    const title = document.createElement('span')
    title.className = 'file-panel-title'
    title.textContent = 'Files'
    header.appendChild(title)

    const addBtn = document.createElement('button')
    addBtn.className = 'file-panel-add-btn'
    addBtn.textContent = '+'
    addBtn.title = 'New file'
    addBtn.onclick = () => this.showNewFileMenu(addBtn)
    header.appendChild(addBtn)

    return header
  }

  private renderGroupedFiles(container: HTMLElement): void {
    const groups = this.groupByType()

    const typeOrder: FileType[] = ['tokens', 'component', 'layout']

    for (const type of typeOrder) {
      const files = groups[type]
      if (!files || files.length === 0) continue

      const group = document.createElement('div')
      group.className = 'file-panel-group'

      const groupHeader = document.createElement('div')
      groupHeader.className = 'file-panel-group-header'
      groupHeader.textContent = this.getTypeLabel(type)
      group.appendChild(groupHeader)

      const groupList = document.createElement('div')
      groupList.className = 'file-panel-group-list'

      for (const file of files) {
        groupList.appendChild(this.renderFile(file))
      }

      group.appendChild(groupList)
      container.appendChild(group)
    }
  }

  private renderFlatFiles(container: HTMLElement): void {
    const sorted = this.sortFiles(this.files)

    for (const file of sorted) {
      container.appendChild(this.renderFile(file))
    }
  }

  private renderFile(file: FileMetadata): HTMLElement {
    const item = document.createElement('div')
    item.className = `file-panel-item ${file.name === this.currentFile ? 'selected' : ''}`
    item.setAttribute('data-file', file.name)

    // Icon
    if (this.config.showIcons) {
      const icon = document.createElement('span')
      icon.className = `file-panel-icon icon-${file.type}`
      item.appendChild(icon)
    }

    // Name
    const name = document.createElement('span')
    name.className = 'file-panel-name'
    name.textContent = file.name
    item.appendChild(name)

    // Click to select
    item.onclick = () => {
      this.currentFile = file.name
      this.callbacks.onSelect(file.name)
      this.renderFiles()
    }

    // Right-click for context menu
    item.oncontextmenu = (e) => {
      e.preventDefault()
      this.showContextMenu(file.name, { x: e.clientX, y: e.clientY })
    }

    return item
  }

  private showNewFileMenu(anchor: HTMLElement): void {
    const menu = document.createElement('div')
    menu.className = 'file-panel-new-menu'

    const rect = anchor.getBoundingClientRect()
    menu.style.left = `${rect.left}px`
    menu.style.top = `${rect.bottom + 4}px`

    const types: { type: FileType; label: string }[] = [
      { type: 'tokens', label: 'Tokens File' },
      { type: 'component', label: 'Component File' },
      { type: 'layout', label: 'Layout File' },
    ]

    for (const { type, label } of types) {
      const btn = document.createElement('button')
      btn.className = 'file-panel-new-item'
      btn.textContent = label
      btn.onclick = () => {
        menu.remove()
        this.callbacks.onCreate?.(type)
      }
      menu.appendChild(btn)
    }

    document.body.appendChild(menu)

    // Close on click outside
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== anchor) {
        menu.remove()
        document.removeEventListener('mousedown', closeHandler)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', closeHandler), 0)
  }

  private startRename(filename: string): void {
    const item = this.container.querySelector(`[data-file="${filename}"]`)
    if (!item) return

    const nameEl = item.querySelector('.file-panel-name')
    if (!nameEl) return

    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'file-panel-rename-input'
    input.value = filename

    const originalContent = nameEl.textContent
    nameEl.textContent = ''
    nameEl.appendChild(input)
    input.focus()
    input.select()

    const finishRename = () => {
      const newName = input.value.trim()
      if (newName && newName !== filename) {
        this.callbacks.onRename?.(filename, newName)
      } else {
        nameEl.textContent = originalContent
      }
    }

    input.onblur = finishRename
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        input.blur()
      }
      if (e.key === 'Escape') {
        input.value = filename
        input.blur()
      }
    }
  }

  private groupByType(): Record<FileType, FileMetadata[]> {
    const groups: Record<FileType, FileMetadata[]> = {
      tokens: [],
      component: [],
      layout: [],
    }

    for (const file of this.files) {
      groups[file.type].push(file)
    }

    // Sort within groups
    for (const type of Object.keys(groups) as FileType[]) {
      groups[type] = this.sortFiles(groups[type])
    }

    return groups
  }

  private sortFiles(files: FileMetadata[]): FileMetadata[] {
    return [...files].sort((a, b) => {
      switch (this.config.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          return a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
        case 'modified':
          return b.modified.getTime() - a.modified.getTime()
        default:
          return 0
      }
    })
  }

  private getTypeLabel(type: FileType): string {
    switch (type) {
      case 'tokens': return 'Tokens'
      case 'component': return 'Components'
      case 'layout': return 'Layouts'
    }
  }
}

/**
 * Factory function
 */
export function createFilePanel(
  config: FilePanelConfig,
  callbacks: FilePanelCallbacks
): FilePanel {
  return new FilePanel(config, callbacks)
}
