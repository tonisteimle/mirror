/**
 * Inline Editor
 *
 * Handles inline rename and create operations.
 */

import { uiState } from './ui-state'
import { validateFilename, getFileType } from './utils'
import { ICON_CHEVRON } from './icons'
import { alert } from '../dialog.js'

interface InlineCallbacks {
  onRename: (oldPath: string, newName: string) => Promise<void>
  onCreate: (name: string, parentPath: string | null, isFile: boolean) => Promise<void>
  onRender: () => void
}

let callbacks: InlineCallbacks | null = null

export function setInlineCallbacks(cbs: InlineCallbacks): void {
  callbacks = cbs
}

export function startInlineRename(path: string): void {
  const element = document.querySelector<HTMLElement>(`[data-path="${path}"]`)
  if (!element) return

  const nameSpan = element.querySelector('span:last-child')
  if (!nameSpan) return

  const oldName = nameSpan.textContent || ''
  const input = createRenameInput(oldName)

  nameSpan.replaceWith(input)
  focusAndSelectName(input, oldName)
  attachRenameListeners(input, path, oldName)
}

function createRenameInput(value: string): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'file-tree-rename-input'
  input.value = value
  return input
}

function focusAndSelectName(input: HTMLInputElement, name: string): void {
  input.focus()
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex > 0) {
    input.setSelectionRange(0, dotIndex)
  } else {
    input.select()
  }
}

function attachRenameListeners(input: HTMLInputElement, path: string, oldName: string): void {
  const finish = () => finishRename(input, path, oldName)

  input.addEventListener('blur', finish)
  input.addEventListener('keydown', e => {
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

async function finishRename(input: HTMLInputElement, path: string, oldName: string): Promise<void> {
  const newName = input.value.trim()
  if (!newName || newName === oldName) {
    restoreSpan(input, oldName)
    return
  }
  const error = validateFilename(newName)
  if (error) {
    await alert(error, { title: 'Ungültiger Name' })
    restoreSpan(input, oldName)
    return
  }
  await callbacks?.onRename(path, newName)
}

function restoreSpan(input: HTMLInputElement, text: string): void {
  const span = document.createElement('span')
  span.textContent = text
  input.replaceWith(span)
}

export function startInlineCreate(type: 'file' | 'folder', parentPath: string | null): void {
  const container = findContainer(parentPath)
  if (!container) return

  if (parentPath && parentPath !== '.') {
    expandParentFolder(parentPath)
  }

  const tempElement = createTempElement(type, parentPath)
  container.insertBefore(tempElement, container.firstChild)

  const input = tempElement.querySelector('input') as HTMLInputElement
  focusNewInput(input, type)
  attachCreateListeners(input, tempElement, type, parentPath)
}

function findContainer(parentPath: string | null): HTMLElement | null {
  if (parentPath && parentPath !== '.') {
    const parent = document.querySelector<HTMLElement>(`[data-path="${parentPath}"]`)
    if (parent) {
      return parent.querySelector('.file-tree-folder-children')
    }
  }
  return document.querySelector('[data-root="true"] .file-tree-folder-children')
}

function expandParentFolder(path: string): void {
  const folder = document.querySelector<HTMLElement>(`[data-path="${path}"]`)
  if (folder) {
    uiState.expandFolder(path)
    folder.classList.add('expanded')
  }
}

function createTempElement(type: 'file' | 'folder', parentPath: string | null): HTMLElement {
  const element = document.createElement('div')
  const depth = calculateDepth(parentPath)
  const defaultName = type === 'file' ? 'new-file.mir' : 'new-folder'

  if (type === 'file') {
    configureFileElement(element, depth, defaultName)
  } else {
    configureFolderElement(element, depth, defaultName)
  }

  return element
}

function calculateDepth(parentPath: string | null): number {
  if (!parentPath || parentPath === '.') return 1
  return parentPath.split('/').length + 1
}

function configureFileElement(el: HTMLElement, depth: number, name: string): void {
  const fileType = getFileType(name)
  el.className = 'file-tree-file creating'
  el.style.paddingLeft = `${16 + depth * 12}px`
  el.innerHTML = `
    <span class="file-icon" style="color: ${fileType.color}">${fileType.icon}</span>
    <input type="text" class="file-tree-rename-input" value="${name}" />
  `
}

function configureFolderElement(el: HTMLElement, depth: number, name: string): void {
  el.className = 'file-tree-folder creating'
  el.style.paddingLeft = `${8 + depth * 12}px`
  el.innerHTML = `
    <div class="file-tree-folder-header" style="padding-left: 0">
      ${ICON_CHEVRON}
      <input type="text" class="file-tree-rename-input" value="${name}" />
    </div>
  `
}

function focusNewInput(input: HTMLInputElement, type: 'file' | 'folder'): void {
  input.focus()
  const defaultName = type === 'file' ? 'new-file.mir' : 'new-folder'
  const dotIndex = defaultName.lastIndexOf('.')

  if (type === 'file' && dotIndex > 0) {
    input.setSelectionRange(0, dotIndex)
  } else {
    input.select()
  }
}

function attachCreateListeners(
  input: HTMLInputElement,
  tempElement: HTMLElement,
  type: 'file' | 'folder',
  parentPath: string | null
): void {
  let finished = false

  const finish = async () => {
    if (finished) return
    finished = true
    await finishCreate(input, tempElement, type, parentPath)
  }

  input.addEventListener('blur', finish)
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finish()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      finished = true
      tempElement.remove()
    }
  })
}

async function finishCreate(
  input: HTMLInputElement,
  tempElement: HTMLElement,
  type: 'file' | 'folder',
  parentPath: string | null
): Promise<void> {
  const name = input.value.trim()

  if (!name) {
    tempElement.remove()
    return
  }

  const error = validateFilename(name)
  if (error) {
    await alert(error, { title: 'Ungültiger Name' })
    tempElement.remove()
    return
  }

  tempElement.remove()
  await callbacks?.onCreate(name, parentPath, type === 'file')
}
