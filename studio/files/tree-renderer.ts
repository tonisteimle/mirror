/**
 * Tree Renderer
 *
 * Renders the file tree UI.
 */

import type { TreeItem } from './types'
import { uiState } from './ui-state'
import { escapeHtml, escapeAttr, getFileType, sortTreeItems } from './utils'
import { ICON_CHEVRON, ICON_FOLDER } from './icons'
import { showContextMenu, hideContextMenu } from './context-menu'
import { attachDragEvents } from './drag-drop'

interface RenderCallbacks {
  onFileSelect: (path: string) => void
  onFolderToggle: (path: string) => void
  getTree: () => TreeItem[]
  getProjectName: () => string
  hasProject: () => boolean
}

let callbacks: RenderCallbacks | null = null

export function setRenderCallbacks(cbs: RenderCallbacks): void {
  callbacks = cbs
}

export function renderFileTree(): void {
  const container = getContainer()
  if (!container || !callbacks) return

  const tree = callbacks.getTree()
  const projectName = callbacks.getProjectName()

  if (!callbacks.hasProject() || tree.length === 0) {
    renderEmptyState(container)
    return
  }

  renderTree(container, tree, projectName)
  attachTreeEvents(container)
}

function getContainer(): HTMLElement | null {
  return (
    document.getElementById('file-tree-content') ||
    document.getElementById('file-tree-container') ||
    document.getElementById('file-tree')
  )
}

function renderEmptyState(container: HTMLElement): void {
  container.innerHTML = `
    <div class="file-tree-empty">
      <div class="file-tree-empty-icon">${ICON_FOLDER}</div>
      <div class="file-tree-empty-text">No folder open</div>
      <div class="file-tree-empty-hint">File → Open Folder (⌘O)</div>
    </div>
  `
}

function renderTree(container: HTMLElement, tree: TreeItem[], projectName: string): void {
  const escapedName = escapeHtml(projectName)
  const itemsHTML = renderTreeItems(tree, 1)

  container.innerHTML = `
    <div class="file-tree-root">
      <div class="file-tree-items">
        <div class="file-tree-folder expanded" data-path="." data-root="true">
          <div class="file-tree-folder-header" style="padding-left: 8px">
            ${ICON_CHEVRON}
            <span>${escapedName}</span>
          </div>
          <div class="file-tree-folder-children">
            ${itemsHTML}
          </div>
        </div>
      </div>
    </div>
  `
}

function renderTreeItems(items: TreeItem[], depth: number): string {
  return sortTreeItems(items)
    .map(item => renderItem(item, depth))
    .join('')
}

function renderItem(item: TreeItem, depth: number): string {
  if (item.type === 'folder') {
    return renderFolder(item, depth)
  }
  return renderFile(item, depth)
}

function renderFolder(item: TreeItem, depth: number): string {
  const isExpanded = uiState.isFolderExpanded(item.path)
  const escapedName = escapeHtml(item.name)
  const escapedPath = escapeAttr(item.path)
  const childrenHTML = isExpanded ? renderTreeItems(item.children || [], depth + 1) : ''

  return `
    <div class="file-tree-folder ${isExpanded ? 'expanded' : ''}" data-path="${escapedPath}" draggable="true">
      <div class="file-tree-folder-header" style="padding-left: ${8 + depth * 12}px">
        ${ICON_CHEVRON}
        <span>${escapedName}</span>
      </div>
      <div class="file-tree-folder-children">
        ${childrenHTML}
      </div>
    </div>
  `
}

function renderFile(item: TreeItem, depth: number): string {
  const fileType = getFileType(item.name),
    isActive = uiState.currentFile === item.path
  const escapedName = escapeHtml(item.name),
    escapedPath = escapeAttr(item.path)
  return `<div class="file-tree-file ${isActive ? 'active' : ''}" data-path="${escapedPath}" draggable="true" style="padding-left: ${16 + depth * 12}px">
      <span class="file-icon" style="color: ${fileType.color}">${fileType.icon}</span><span>${escapedName}</span></div>`
}

function attachTreeEvents(container: HTMLElement): void {
  attachFileClicks(container)
  attachFolderClicks(container)
  attachEmptyAreaMenu(container)
  attachDragEvents(container)
}

function attachFileClicks(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.file-tree-file').forEach(el => {
    el.addEventListener('click', e => {
      if (isRenameInput(e.target)) return
      callbacks?.onFileSelect(el.dataset.path!)
    })
    el.addEventListener('contextmenu', e => showContextMenu(e, el))
  })
}

function attachFolderClicks(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.file-tree-folder-header').forEach(el => {
    el.addEventListener('click', e => {
      if (isRenameInput(e.target)) return
      const folder = el.closest('.file-tree-folder') as HTMLElement
      const path = folder.dataset.path
      if (path !== '.') callbacks?.onFolderToggle(path!)
    })
    el.addEventListener('contextmenu', e => {
      const folder = el.closest('.file-tree-folder') as HTMLElement
      showContextMenu(e, folder)
    })
  })
}

function attachEmptyAreaMenu(container: HTMLElement): void {
  container.addEventListener('contextmenu', e => {
    const target = e.target as HTMLElement
    if (target === container || target.classList.contains('file-tree-items')) {
      showContextMenu(e, null)
    }
  })
}

function isRenameInput(target: EventTarget | null): boolean {
  return (target as HTMLElement)?.closest('.file-tree-rename-input') !== null
}

export function toggleFolder(path: string): void {
  uiState.toggleFolder(path)
  renderFileTree()
}

export function initClickOutsideHandler(): void {
  document.addEventListener('click', hideContextMenu)
}
