/**
 * File Manager Initializer
 *
 * Sets up all file management modules.
 */

import type { TreeItem, FileCallbacks } from './types'
import { uiState } from './ui-state'
import { findFirstFile } from './utils'
import {
  setStorage,
  selectFile,
  saveFile,
  createFile,
  createFolder,
  renameItem,
  duplicateFile,
  deleteItem,
  moveItem,
} from './file-service'
import {
  setRenderCallbacks,
  renderFileTree,
  toggleFolder,
  initClickOutsideHandler,
} from './tree-renderer'
import { setContextCallbacks } from './context-menu'
import { setInlineCallbacks, startInlineRename, startInlineCreate } from './inline-editor'
import { setDragCallbacks } from './drag-drop'
import { setProjectActions, initProjectToolbar } from './toolbar'

interface Storage {
  isInitialized: boolean
  init: () => Promise<void>
  providerType: string
  hasProject: boolean
  currentProjectName: string | null
  getTree: () => TreeItem[]
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  deleteFolder: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  copyFile: (src: string, dest: string) => Promise<void>
  createFolder: (path: string) => Promise<void>
  moveItem: (src: string, dest: string) => Promise<void>
  listProjects: () => Promise<{ id: string; name: string }[]>
  openProject: (id: string) => Promise<void>
  createProject: (name: string) => Promise<{ id: string; name: string }>
  canOpenFolderDialog: () => boolean
  openFolderDialog: () => Promise<string | null>
  events: {
    on: (event: string, handler: (data: unknown) => void) => void
  }
}

interface ProjectActions {
  new: () => Promise<void>
  demo: () => Promise<void>
  import: () => Promise<void>
  export: () => Promise<void>
}

let storage: Storage | null = null

export async function initDesktopFiles(options: {
  storage: Storage
  projectActions: ProjectActions
  callbacks?: FileCallbacks
}): Promise<void> {
  storage = options.storage
  uiState.setCallbacks(options.callbacks || {})

  await initStorage()
  initModules(options.projectActions)
  subscribeToEvents()
  await openInitialProject()
  initUI()
}

async function initStorage(): Promise<void> {
  if (!storage!.isInitialized) {
    await storage!.init()
  }
  setStorage(storage!)
  console.log(`[Files] Initialized with ${storage!.providerType} provider`)
}

function initModules(projectActions: ProjectActions): void {
  setProjectActions(projectActions)
  setRenderCallbacks(createRenderCallbacks())
  setContextCallbacks(createContextCallbacks())
  setInlineCallbacks(createInlineCallbacks())
  setDragCallbacks({ onMove: moveItem })
}

function createRenderCallbacks() {
  return {
    onFileSelect: selectFile,
    onFolderToggle: toggleFolder,
    getTree: () => storage!.getTree(),
    getProjectName: () => storage!.currentProjectName || 'Project',
    hasProject: () => storage!.hasProject,
  }
}

function createContextCallbacks() {
  return {
    onRename: startInlineRename,
    onDuplicate: duplicateFile,
    onDelete: deleteItem,
    onNewFile: (parent: string | null) => startInlineCreate('file', parent),
    onNewFolder: (parent: string | null) => startInlineCreate('folder', parent),
  }
}

function createInlineCallbacks() {
  return {
    onRename: renameItem,
    onCreate: async (name: string, parent: string | null, isFile: boolean) => {
      if (isFile) {
        await createFile(name, parent)
      } else {
        await createFolder(name, parent)
      }
    },
    onRender: renderFileTree,
  }
}

function subscribeToEvents(): void {
  const events = storage!.events
  events.on('tree:changed', () => renderFileTree())
  events.on('file:created', handleFileCreated)
  events.on('file:changed', handleFileChanged)
  events.on('file:deleted', handleFileDeleted)
  events.on('file:renamed', handleFileRenamed)
  events.on('project:closed', handleProjectClosed)
  events.on('project:opened', handleProjectOpened)
  events.on('error', handleError)
}

async function handleFileCreated(data: unknown): Promise<void> {
  const { path } = data as { path: string }
  await cacheFile(path)
  await selectFile(path)
}

async function cacheFile(path: string): Promise<void> {
  try {
    const content = await storage!.readFile(path)
    uiState.updateCache(path, content)
    syncToWindow(path, content)
  } catch (e) {
    console.warn('[Files] Failed to cache:', path)
  }
}

function handleFileChanged(data: unknown): void {
  const { path, content } = data as { path: string; content: string }
  uiState.updateCache(path, content)
  syncToWindow(path, content)
}

function handleFileDeleted(data: unknown): void {
  const { path } = data as { path: string }
  uiState.updateCache(path, undefined)
  syncToWindow(path, undefined)

  if (uiState.currentFile === path) {
    selectNextFile()
  }
  renderFileTree()
}

function selectNextFile(): void {
  uiState.setCurrentFile(null)
  const tree = storage!.getTree()
  const next = findFirstFile(tree)
  if (next) selectFile(next)
}

function handleFileRenamed(data: unknown): void {
  const { oldPath, newPath } = data as { oldPath: string; newPath: string }
  uiState.renameInCache(oldPath, newPath)
  syncRename(oldPath, newPath)

  if (uiState.currentFile === oldPath) {
    uiState.setCurrentFile(newPath)
  }
  renderFileTree()
}

function handleProjectClosed(): void {
  console.log('[Files] Project closed')
  uiState.reset()
  renderFileTree()
}

async function handleProjectOpened(data: unknown): Promise<void> {
  const { project } = data as { project: { name: string } }
  console.log('[Files] Project opened:', project.name)

  uiState.reset()
  await preloadAllFiles()
  await selectFirstFile()
  renderFileTree()
}

function handleError(data: unknown): void {
  const { error, operation } = data as { error: Error; operation: string }
  console.error(`[Files] Error in ${operation}:`, error)
}

async function preloadAllFiles(): Promise<void> {
  const tree = storage!.getTree()
  const paths = collectFilePaths(tree)

  if (paths.length > 100) {
    console.warn(`[Files] Large project: ${paths.length} files`)
  }

  await loadFilesInBatches(paths)
  console.log('[Files] Preloaded', Object.keys(uiState.getCache()).length, 'files')
}

function collectFilePaths(items: TreeItem[]): string[] {
  const paths: string[] = []
  for (const item of items) {
    if (item.type === 'file') {
      paths.push(item.path)
    } else if (item.type === 'folder' && item.children) {
      paths.push(...collectFilePaths(item.children))
    }
  }
  return paths
}

async function loadFilesInBatches(paths: string[]): Promise<void> {
  const BATCH_SIZE = 5

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(batch.map(loadAndCacheFile))
  }
}

async function loadAndCacheFile(path: string): Promise<void> {
  const content = await storage!.readFile(path)
  uiState.updateCache(path, content)
  syncToWindow(path, content)
}

async function selectFirstFile(): Promise<void> {
  const tree = storage!.getTree()
  const first = findFirstFile(tree)
  if (first) await selectFile(first)
}

async function openInitialProject(): Promise<void> {
  if (storage!.hasProject) return

  try {
    const projects = await storage!.listProjects()
    if (projects.length > 0) {
      await storage!.openProject(projects[0].id)
    } else if (storage!.providerType === 'server') {
      await createDefaultProject()
    }
  } catch (e) {
    console.error('[Files] Server error:', e)
  }
}

async function createDefaultProject(): Promise<void> {
  console.log('[Files] Creating default project...')
  const project = await storage!.createProject('My Project')
  await storage!.openProject(project.id)
}

function initUI(): void {
  initClickOutsideHandler()
  initProjectToolbar()
  renderFileTree()

  setTimeout(async () => {
    if (!uiState.currentFile) {
      await selectFirstFile()
    }
  }, 100)
}

function syncToWindow(path: string, content: string | undefined): void {
  const win = window as {
    desktopFiles?: { updateFileCache?: (p: string, c: string | undefined) => void }
  }
  win.desktopFiles?.updateFileCache?.(path, content)
}

function syncRename(oldPath: string, newPath: string): void {
  const content = uiState.getCachedContent(newPath)
  syncToWindow(newPath, content)
  syncToWindow(oldPath, undefined)
}

// Project operations
export async function openFolder(): Promise<string | null> {
  if (!storage!.canOpenFolderDialog()) {
    console.log('[Files] Folder dialog not available')
    return null
  }

  try {
    const path = await storage!.openFolderDialog()
    if (path) await storage!.openProject(path)
    return path
  } catch (e) {
    console.error('[Files] Open folder failed:', e)
    return null
  }
}

export async function loadFolder(path: string): Promise<void> {
  await storage!.openProject(path)
}

export function getCurrentFolder(): string | null {
  return storage!.hasProject ? storage!.currentProjectName : null
}
