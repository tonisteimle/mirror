/**
 * UI State Manager
 *
 * Manages the file tree UI state.
 */

import type { UIState, ContextMenuState, FileCallbacks } from './types'

class FileUIState {
  currentFile: string | null = null
  contextMenu: ContextMenuState | null = null
  draggedItem: string | null = null
  expandedFolders = new Set<string>()
  filesCache: Record<string, string> = {}
  callbacks: FileCallbacks = {}

  reset(): void {
    this.currentFile = null
    this.contextMenu = null
    this.draggedItem = null
    this.expandedFolders.clear()
    this.filesCache = {}
  }

  setCurrentFile(path: string | null): void {
    this.currentFile = path
  }

  setContextMenu(menu: ContextMenuState | null): void {
    this.contextMenu = menu
  }

  setDraggedItem(path: string | null): void {
    this.draggedItem = path
  }

  toggleFolder(path: string): void {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path)
    } else {
      this.expandedFolders.add(path)
    }
  }

  expandFolder(path: string): void {
    this.expandedFolders.add(path)
  }

  isFolderExpanded(path: string): boolean {
    return this.expandedFolders.has(path)
  }

  updateCache(path: string, content: string | undefined): void {
    if (content === undefined) {
      delete this.filesCache[path]
    } else {
      this.filesCache[path] = content
    }
  }

  renameInCache(oldPath: string, newPath: string): void {
    if (this.filesCache[oldPath] !== undefined) {
      this.filesCache[newPath] = this.filesCache[oldPath]
      delete this.filesCache[oldPath]
    }
  }

  getCache(): Record<string, string> {
    return this.filesCache
  }

  getCachedContent(path: string): string | undefined {
    return this.filesCache[path]
  }

  setCallbacks(callbacks: FileCallbacks): void {
    this.callbacks = callbacks
  }

  notifyFileSelect(path: string, content: string): void {
    this.callbacks.onFileSelect?.(path, content)
  }
}

export const uiState = new FileUIState()
