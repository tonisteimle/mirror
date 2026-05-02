/**
 * File Service
 *
 * Handles all file CRUD operations.
 */

import { uiState } from './ui-state'
import {
  validateFilename,
  buildTargetPath,
  ensureExtension,
  getDirectory,
  getFilename,
  getBasename,
  getExtension,
} from './utils'
import { alert, confirmDelete } from '../dialog'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('FileService')

interface StorageService {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  deleteFolder: (path: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  copyFile: (src: string, dest: string) => Promise<void>
  createFolder: (path: string) => Promise<void>
  moveItem: (src: string, dest: string) => Promise<void>
  getTree: () => { type: string; name: string; path: string; children?: unknown[] }[]
}

let storage: StorageService | null = null

export function setStorage(s: StorageService): void {
  storage = s
}

export async function selectFile(path: string): Promise<void> {
  if (!storage) return

  try {
    const content = await storage.readFile(path)
    uiState.setCurrentFile(path)
    uiState.updateCache(path, content)
    uiState.notifyFileSelect(path, content)
  } catch (e) {
    log.error('[FileService] Select failed:', e)
  }
}

export async function saveFile(path: string, content: string): Promise<void> {
  uiState.updateCache(path, content)
  try {
    await storage?.writeFile(path, content)
  } catch (e) {
    log.error('[FileService] Save failed:', e)
  }
}

export async function createFile(fileName: string, parentFolder: string | null): Promise<void> {
  const error = validateFilename(fileName)
  if (error) {
    await alert(error, { title: 'Ungültiger Dateiname' })
    return
  }
  const targetPath = buildTargetPath(ensureExtension(fileName), parentFolder)
  try {
    await storage?.writeFile(targetPath, createFileContent(fileName))
    await selectFile(targetPath)
  } catch (e) {
    log.error('[FileService] Create file failed:', e)
  }
}

function createFileContent(fileName: string): string {
  return `// ${fileName}\n\nBox w 100, h 100, bg #333\n`
}

export async function createFolder(folderName: string, parentFolder: string | null): Promise<void> {
  const targetPath = buildTargetPath(folderName, parentFolder)

  try {
    await storage?.createFolder(targetPath)
  } catch (e) {
    log.error('[FileService] Create folder failed:', e)
    await alert('Ordner erstellen fehlgeschlagen', { title: 'Fehler' })
  }
}

export async function renameItem(oldPath: string, newName: string): Promise<void> {
  const dir = getDirectory(oldPath)
  const newPath = dir ? `${dir}/${newName}` : newName

  try {
    await storage?.renameFile(oldPath, newPath)
  } catch (e) {
    log.error('[FileService] Rename failed:', e)
  }
}

export async function duplicateFile(path: string): Promise<void> {
  if (!storage) return

  const newPath = generateCopyPath(path)
  try {
    await storage.copyFile(path, newPath)
  } catch (e) {
    log.error('[FileService] Duplicate failed:', e)
  }
}

function generateCopyPath(path: string): string {
  const filename = getFilename(path)
  const ext = getExtension(filename)
  const base = getBasename(filename)
  const dir = getDirectory(path)
  const existing = collectExistingPaths()

  return findUniqueCopyPath(dir, base, ext, existing)
}

function collectExistingPaths(): Set<string> {
  if (!storage) return new Set()

  const paths = new Set<string>()
  const collect = (items: { type: string; path: string; children?: unknown[] }[]) => {
    for (const item of items) {
      if (item.type === 'file') paths.add(item.path)
      if (item.type === 'folder' && item.children) {
        collect(item.children as typeof items)
      }
    }
  }
  collect(storage.getTree())
  return paths
}

function findUniqueCopyPath(dir: string, base: string, ext: string, existing: Set<string>): string {
  let newName = `${base}-copy${ext}`
  let newPath = dir ? `${dir}/${newName}` : newName
  let counter = 1

  while (existing.has(newPath)) {
    newName = `${base}-copy-${counter}${ext}`
    newPath = dir ? `${dir}/${newName}` : newName
    counter++
  }

  return newPath
}

export async function deleteItem(path: string, isFolder: boolean): Promise<void> {
  const name = getFilename(path)
  const message = isFolder ? `Ordner "${name}" und alle Inhalte löschen?` : `"${name}" löschen?`
  if (!(await confirmDelete(name, { message }))) return
  try {
    isFolder ? await storage?.deleteFolder(path) : await storage?.deleteFile(path)
  } catch (e) {
    log.error('[FileService] Delete failed:', e)
  }
}

export async function moveItem(sourcePath: string, targetFolder: string): Promise<void> {
  const name = getFilename(sourcePath)
  const newPath = `${targetFolder}/${name}`

  if (!isValidMove(sourcePath, newPath, targetFolder)) return

  try {
    await storage?.moveItem(sourcePath, targetFolder)
  } catch (e) {
    log.error('[FileService] Move failed:', e)
  }
}

function isValidMove(source: string, dest: string, targetFolder: string): boolean {
  if (source === dest) return false
  if (dest.startsWith(source + '/')) {
    log.warn('[FileService] Cannot move folder into itself')
    return false
  }
  return true
}

export function getCurrentFile(): string | null {
  return uiState.currentFile
}

export function getFiles(): Record<string, string> {
  return uiState.getCache()
}

export function getFileContent(path: string): string | undefined {
  return uiState.getCachedContent(path)
}

export function updateFileCache(path: string, content: string | undefined): void {
  uiState.updateCache(path, content)
}
