/**
 * Context Menu
 *
 * Handles right-click context menus in file tree.
 */

import { uiState } from './ui-state'

type ContextAction = 'rename' | 'duplicate' | 'delete' | 'new-file' | 'new-folder'

interface ContextCallbacks {
  onRename: (path: string) => void
  onDuplicate: (path: string) => void
  onDelete: (path: string, isFolder: boolean) => void
  onNewFile: (parentPath: string | null) => void
  onNewFolder: (parentPath: string | null) => void
}

let callbacks: ContextCallbacks | null = null

export function setContextCallbacks(cbs: ContextCallbacks): void {
  callbacks = cbs
}

export function showContextMenu(e: MouseEvent, target: HTMLElement | null): void {
  e.preventDefault()
  e.stopPropagation()
  hideContextMenu()

  const context = detectContext(target)
  const menu = createMenu(context)

  positionMenu(menu, e.clientX, e.clientY)
  document.body.appendChild(menu)

  uiState.setContextMenu({
    element: menu,
    path: context.path,
    isFile: context.isFile,
    isFolder: context.isFolder,
  })

  attachMenuListeners(menu)
}

export function hideContextMenu(): void {
  const ctx = uiState.contextMenu
  if (ctx?.element) {
    ctx.element.remove()
    uiState.setContextMenu(null)
  }
}

interface ContextInfo {
  isFile: boolean
  isFolder: boolean
  isRoot: boolean
  path: string | null
}

function detectContext(target: HTMLElement | null): ContextInfo {
  const isFile = target?.classList.contains('file-tree-file') ?? false
  const folderEl = !isFile ? findFolderElement(target) : null
  const isFolder = !!folderEl
  const isRoot = folderEl?.dataset?.root === 'true'
  const path = extractPath(target)

  return { isFile, isFolder, isRoot, path }
}

function findFolderElement(target: HTMLElement | null): HTMLElement | null {
  if (!target) return null
  if (target.classList.contains('file-tree-folder')) return target
  return target.closest('.file-tree-folder')
}

function extractPath(target: HTMLElement | null): string | null {
  if (!target) return null
  if (target.dataset?.path) return target.dataset.path
  const ancestor = target.closest('[data-path]') as HTMLElement | null
  return ancestor?.dataset?.path ?? null
}

function createMenu(context: ContextInfo): HTMLElement {
  const menu = document.createElement('div')
  menu.className = 'context-menu'
  menu.innerHTML = getMenuHTML(context)
  return menu
}

function getMenuHTML(context: ContextInfo): string {
  if (context.isFile) return getFileMenuHTML()
  if (context.isFolder && context.isRoot) return getRootFolderMenuHTML()
  if (context.isFolder) return getFolderMenuHTML()
  return getEmptyAreaMenuHTML()
}

function getFileMenuHTML(): string {
  return `
    <div class="context-menu-item" data-action="rename">Rename</div>
    <div class="context-menu-item" data-action="duplicate">Duplicate</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">Delete</div>
  `
}

function getRootFolderMenuHTML(): string {
  return `
    <div class="context-menu-item" data-action="new-file">New File</div>
    <div class="context-menu-item" data-action="new-folder">New Folder</div>
  `
}

function getFolderMenuHTML(): string {
  return `
    <div class="context-menu-item" data-action="new-file">New File</div>
    <div class="context-menu-item" data-action="new-folder">New Folder</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="rename">Rename</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item danger" data-action="delete">Delete</div>
  `
}

function getEmptyAreaMenuHTML(): string {
  return `
    <div class="context-menu-item" data-action="new-file">New File</div>
    <div class="context-menu-item" data-action="new-folder">New Folder</div>
  `
}

function positionMenu(menu: HTMLElement, x: number, y: number): void {
  document.body.appendChild(menu)
  const rect = menu.getBoundingClientRect()
  document.body.removeChild(menu)

  const finalX = clampPosition(x, rect.width, window.innerWidth)
  const finalY = clampPosition(y, rect.height, window.innerHeight)

  menu.style.left = `${finalX}px`
  menu.style.top = `${finalY}px`
}

function clampPosition(pos: number, size: number, max: number): number {
  const overflow = pos + size - max
  if (overflow > 0) return Math.max(8, pos - overflow - 8)
  return Math.max(8, pos)
}

function attachMenuListeners(menu: HTMLElement): void {
  menu.querySelectorAll<HTMLElement>('.context-menu-item').forEach(item => {
    item.addEventListener('click', e => {
      e.stopPropagation()
      handleAction(item.dataset.action as ContextAction)
    })
  })
}

function handleAction(action: ContextAction): void {
  const ctx = uiState.contextMenu
  hideContextMenu()

  if (!callbacks) return

  switch (action) {
    case 'rename':
      if (ctx?.path) callbacks.onRename(ctx.path)
      break
    case 'duplicate':
      if (ctx?.path && ctx.isFile) callbacks.onDuplicate(ctx.path)
      break
    case 'delete':
      if (ctx?.path) callbacks.onDelete(ctx.path, ctx.isFolder)
      break
    case 'new-file':
      callbacks.onNewFile(ctx?.isFolder ? ctx.path : null)
      break
    case 'new-folder':
      callbacks.onNewFolder(ctx?.isFolder ? ctx.path : null)
      break
  }
}
