/**
 * Drag & Drop
 *
 * Handles file tree drag and drop.
 */

import { uiState } from './ui-state'

interface DragCallbacks {
  onMove: (sourcePath: string, targetFolder: string) => Promise<void>
}

let callbacks: DragCallbacks | null = null

export function setDragCallbacks(cbs: DragCallbacks): void {
  callbacks = cbs
}

export function attachDragEvents(container: HTMLElement): void {
  attachDraggables(container)
  attachDropTargets(container)
}

function attachDraggables(container: HTMLElement): void {
  const items = container.querySelectorAll<HTMLElement>('.file-tree-file, .file-tree-folder')
  items.forEach(el => {
    if (el.dataset.root === 'true') return
    attachDragStart(el)
    attachDragEnd(el, container)
  })
}

function attachDragStart(el: HTMLElement): void {
  el.addEventListener('dragstart', e => {
    uiState.setDraggedItem(el.dataset.path || null)
    el.classList.add('dragging')
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('text/plain', el.dataset.path || '')
  })
}

function attachDragEnd(el: HTMLElement, container: HTMLElement): void {
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging')
    uiState.setDraggedItem(null)
    clearDragOverStyles(container)
  })
}

function clearDragOverStyles(container: HTMLElement): void {
  container.querySelectorAll('.drag-over').forEach(el => {
    el.classList.remove('drag-over')
  })
}

function attachDropTargets(container: HTMLElement): void {
  container.querySelectorAll<HTMLElement>('.file-tree-folder').forEach(folder => {
    attachDragOver(folder)
    attachDragLeave(folder)
    attachDrop(folder)
  })
}

function attachDragOver(folder: HTMLElement): void {
  folder.addEventListener('dragover', e => {
    e.preventDefault()
    if (!canDropOnFolder(folder)) return

    folder.classList.add('drag-over')
    e.dataTransfer!.dropEffect = 'move'
  })
}

function canDropOnFolder(folder: HTMLElement): boolean {
  const draggedItem = uiState.draggedItem
  if (!draggedItem) return false
  if (draggedItem === folder.dataset.path) return false
  if (draggedItem.startsWith(folder.dataset.path + '/')) return false
  return true
}

function attachDragLeave(folder: HTMLElement): void {
  folder.addEventListener('dragleave', e => {
    const related = e.relatedTarget as HTMLElement | null
    if (!folder.contains(related)) {
      folder.classList.remove('drag-over')
    }
  })
}

function attachDrop(folder: HTMLElement): void {
  folder.addEventListener('drop', async e => {
    e.preventDefault()
    e.stopPropagation()
    folder.classList.remove('drag-over')

    const draggedItem = uiState.draggedItem
    if (!canDropOnFolder(folder)) return

    const targetFolder = folder.dataset.path === '.' ? '' : folder.dataset.path || ''
    await callbacks?.onMove(draggedItem!, targetFolder)
    uiState.setDraggedItem(null)
  })
}
