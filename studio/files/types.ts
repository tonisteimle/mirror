/**
 * File Management Types
 */

export interface FileType {
  type: string
  extensions: string[]
  color: string
  icon: string
}

export interface TreeItem {
  type: 'file' | 'folder'
  name: string
  path: string
  children?: TreeItem[]
}

export interface ContextMenuState {
  element: HTMLElement
  path: string | null
  isFile: boolean
  isFolder: boolean
}

export interface MenuItem {
  id?: string
  type?: 'separator'
  icon?: string
  label?: string
}

export interface FileCallbacks {
  onFileSelect?: (path: string, content: string) => void
  onFileChange?: (path: string, content: string) => void
}

export interface UIState {
  currentFile: string | null
  contextMenu: ContextMenuState | null
  draggedItem: string | null
  expandedFolders: Set<string>
  filesCache: Record<string, string>
}
