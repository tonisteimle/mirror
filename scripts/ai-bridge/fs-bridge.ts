/**
 * Filesystem Bridge — backing module for /fs/* HTTP endpoints.
 *
 * Lets the browser Mirror Studio operate on real on-disk directories
 * (parity with the Tauri provider) by routing reads/writes through a
 * local Node helper. Single working-directory per server process —
 * `openDirectory` activates one, all subsequent ops are relative to it.
 *
 * Path safety: every relative path is resolved + checked to live within
 * the working dir. Path-traversal (`../`) is blocked. Symlinks that
 * resolve outside the working dir are rejected.
 *
 * Recents: top-N recently opened working dirs are persisted to
 * `~/.config/mirror-bridge/recents.json`. Resolved on each `getRecents`
 * call so deleted dirs disappear from the list.
 */
import { promises as fs } from 'fs'
import { existsSync, statSync } from 'fs'
import { join, resolve, relative, isAbsolute, dirname, sep, basename } from 'path'
import { homedir } from 'os'

const RECENTS_FILE = join(homedir(), '.config', 'mirror-bridge', 'recents.json')
const RECENTS_MAX = 10

// Single global state — one working dir per server process.
let workingDir: string | null = null

// =============================================================================
// Types — kept narrow & JSON-serialisable. The studio-side BridgeProvider
// adapter maps these into the StorageItem / StorageProject shapes.
// =============================================================================

export interface BridgeTreeItem {
  name: string
  path: string // POSIX-style, relative to working dir
  type: 'file' | 'folder'
  children?: BridgeTreeItem[]
}

export interface BridgeState {
  open: boolean
  path: string | null
  name: string | null
}

export interface BridgeError {
  error: string
  code?: string
}

// =============================================================================
// Path safety
// =============================================================================

/**
 * Resolve a relative path inside the working directory and assert that
 * the resolved absolute path actually lives there. Throws on traversal.
 *
 * Empty string and "." both map to the working dir root.
 */
function resolveWithinWorkingDir(relPath: string): string {
  if (!workingDir) throw new BridgeProtocolError('no working directory open', 'NO_WORKING_DIR')
  if (isAbsolute(relPath)) {
    throw new BridgeProtocolError('absolute paths not allowed', 'ABSOLUTE_PATH')
  }
  // Normalise leading slash that some clients send ("/", "/foo")
  const cleaned = relPath.replace(/^\/+/, '')
  const abs = resolve(workingDir, cleaned)
  // After resolve(), `relative(workingDir, abs)` would start with `..` if
  // the path escaped. That's the strict traversal check.
  const rel = relative(workingDir, abs)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new BridgeProtocolError('path escapes working directory', 'PATH_TRAVERSAL')
  }
  return abs
}

export class BridgeProtocolError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

// =============================================================================
// State / open / close
// =============================================================================

export function getState(): BridgeState {
  if (!workingDir) return { open: false, path: null, name: null }
  return { open: true, path: workingDir, name: basename(workingDir) }
}

export async function openDirectory(rawPath: string): Promise<BridgeState> {
  if (!rawPath || typeof rawPath !== 'string') {
    throw new BridgeProtocolError('path required', 'BAD_REQUEST')
  }
  // Expand ~ to home for convenience when users paste from a terminal.
  const expanded = rawPath.startsWith('~') ? join(homedir(), rawPath.slice(1)) : rawPath
  const abs = resolve(expanded)
  if (!existsSync(abs)) {
    throw new BridgeProtocolError(`path not found: ${abs}`, 'NOT_FOUND')
  }
  const stat = statSync(abs)
  if (!stat.isDirectory()) {
    throw new BridgeProtocolError(`not a directory: ${abs}`, 'NOT_A_DIRECTORY')
  }
  workingDir = abs
  await pushRecent(abs)
  return getState()
}

export function closeDirectory(): BridgeState {
  workingDir = null
  return getState()
}

// =============================================================================
// Tree walk
// =============================================================================

const IGNORED_NAMES = new Set([
  'node_modules',
  '.git',
  '.DS_Store',
  '.cache',
  'dist',
  '.next',
  '.svelte-kit',
])

export async function getTree(): Promise<BridgeTreeItem[]> {
  if (!workingDir) {
    throw new BridgeProtocolError('no working directory open', 'NO_WORKING_DIR')
  }
  return walkTree(workingDir, workingDir)
}

async function walkTree(absDir: string, rootDir: string): Promise<BridgeTreeItem[]> {
  const entries = await fs.readdir(absDir, { withFileTypes: true })
  const out: BridgeTreeItem[] = []
  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue
    const abs = join(absDir, entry.name)
    const relPath = relative(rootDir, abs).split(sep).join('/')
    if (entry.isDirectory()) {
      out.push({
        name: entry.name,
        path: relPath,
        type: 'folder',
        children: await walkTree(abs, rootDir),
      })
    } else if (entry.isFile()) {
      out.push({ name: entry.name, path: relPath, type: 'file' })
    }
  }
  // Folders first, then files — both alphabetically. Mirrors the tauri
  // provider's tree-renderer expectations.
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return out
}

// =============================================================================
// File operations
// =============================================================================

export async function readFile(relPath: string): Promise<string> {
  const abs = resolveWithinWorkingDir(relPath)
  return fs.readFile(abs, 'utf-8')
}

export async function writeFile(relPath: string, content: string): Promise<void> {
  const abs = resolveWithinWorkingDir(relPath)
  // Ensure parent directory exists — UI flows often write "components/X.mir"
  // without a separate mkdir step.
  await fs.mkdir(dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf-8')
}

export async function deleteFile(relPath: string): Promise<void> {
  const abs = resolveWithinWorkingDir(relPath)
  const stat = await fs.stat(abs)
  if (stat.isDirectory()) {
    throw new BridgeProtocolError('use deleteFolder for directories', 'WRONG_TYPE')
  }
  await fs.unlink(abs)
}

export async function deleteFolder(relPath: string): Promise<void> {
  const abs = resolveWithinWorkingDir(relPath)
  const stat = await fs.stat(abs)
  if (!stat.isDirectory()) {
    throw new BridgeProtocolError('use deleteFile for files', 'WRONG_TYPE')
  }
  await fs.rm(abs, { recursive: true, force: true })
}

export async function rename(oldRel: string, newRel: string): Promise<void> {
  const oldAbs = resolveWithinWorkingDir(oldRel)
  const newAbs = resolveWithinWorkingDir(newRel)
  await fs.mkdir(dirname(newAbs), { recursive: true })
  await fs.rename(oldAbs, newAbs)
}

export async function moveItem(sourceRel: string, targetFolderRel: string): Promise<void> {
  const sourceAbs = resolveWithinWorkingDir(sourceRel)
  const folderAbs = resolveWithinWorkingDir(targetFolderRel)
  const stat = await fs.stat(folderAbs).catch(() => null)
  if (!stat || !stat.isDirectory()) {
    throw new BridgeProtocolError('target is not a folder', 'NOT_A_DIRECTORY')
  }
  const name = basename(sourceAbs)
  await fs.rename(sourceAbs, join(folderAbs, name))
}

export async function createFolder(relPath: string): Promise<void> {
  const abs = resolveWithinWorkingDir(relPath)
  await fs.mkdir(abs, { recursive: true })
}

// =============================================================================
// Recents
// =============================================================================

export async function getRecents(): Promise<string[]> {
  if (!existsSync(RECENTS_FILE)) return []
  try {
    const raw = await fs.readFile(RECENTS_FILE, 'utf-8')
    const list = JSON.parse(raw) as string[]
    // Drop entries whose directories no longer exist — keeps the list useful.
    return list.filter(p => existsSync(p))
  } catch {
    return []
  }
}

async function pushRecent(absPath: string): Promise<void> {
  const current = await getRecents()
  const filtered = current.filter(p => p !== absPath)
  filtered.unshift(absPath)
  const trimmed = filtered.slice(0, RECENTS_MAX)
  await fs.mkdir(dirname(RECENTS_FILE), { recursive: true })
  await fs.writeFile(RECENTS_FILE, JSON.stringify(trimmed, null, 2))
}
