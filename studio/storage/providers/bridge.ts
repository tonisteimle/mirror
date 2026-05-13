/**
 * Bridge Storage Provider
 *
 * Routes all file/folder operations through the local Node helper
 * (`scripts/ai-bridge-server.ts`, `npm run ai-bridge`, port 3456).
 * Gives the browser Studio parity with the Tauri provider — real
 * on-disk directories instead of localStorage.
 *
 * Server contract: studio sends RELATIVE paths within the working
 * directory. The server resolves them under the working dir and
 * rejects traversal. See scripts/ai-bridge/fs-bridge.ts.
 *
 * Lifecycle:
 *   - constructor() only stores config; no network call.
 *   - openProject(absPath) activates the working dir on the server.
 *   - getTree/readFile/writeFile/… work once a project is open.
 */

import type { StorageProvider, StorageProject, StorageItem } from '../types'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('BridgeProvider')

const DEFAULT_BRIDGE_URL = 'http://localhost:3456'

interface BridgeTreeItem {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: BridgeTreeItem[]
}

interface BridgeStateResponse {
  open: boolean
  path: string | null
  name: string | null
}

interface BridgeError {
  error: string
  code?: string
}

/**
 * Bridge HTTP client — small wrapper around fetch() with typed errors.
 * Kept inside the provider module because it's not used anywhere else.
 */
class BridgeClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`)
    return this.parse<T>(res)
  }

  async post<T>(path: string, body: unknown = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return this.parse<T>(res)
  }

  private async parse<T>(res: Response): Promise<T> {
    const text = await res.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(`Bridge: non-JSON response (${res.status}): ${text.slice(0, 100)}`)
    }
    if (!res.ok) {
      const err = data as BridgeError
      throw new Error(`Bridge: ${err.error || res.statusText} (${err.code || res.status})`)
    }
    return data as T
  }
}

// =============================================================================
// Bridge availability probe
// =============================================================================

/**
 * Quick health check — does the bridge server respond on /fs/state?
 * Times out fast (default 800ms) so a missing bridge doesn't block
 * the studio bootstrap. Used by provider-factory detection.
 */
export async function isBridgeAvailable(
  baseUrl = DEFAULT_BRIDGE_URL,
  timeoutMs = 300
): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(`${baseUrl}/fs/state`, { signal: ctrl.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

// =============================================================================
// Provider
// =============================================================================

export class BridgeProvider implements StorageProvider {
  readonly type = 'bridge' as const
  readonly supportsNativeDialogs = false

  private client: BridgeClient
  private basePath: string | null = null

  constructor(baseUrl: string = DEFAULT_BRIDGE_URL) {
    this.client = new BridgeClient(baseUrl)
  }

  // ───────────────────────────────────────────────────────────────────────
  // Projects
  //
  // The bridge has no notion of "named projects" — it has a single
  // working directory at a time, plus a recents list of dirs the user
  // has opened before. We map that 1:1 onto the StorageProject shape:
  //   id   = absolute filesystem path
  //   name = directory basename
  // ───────────────────────────────────────────────────────────────────────

  async listProjects(): Promise<StorageProject[]> {
    try {
      const { recents } = await this.client.get<{ recents: string[] }>('/fs/recents')
      return recents.map(p => ({ id: p, name: basename(p) }))
    } catch (err) {
      log.warn('listProjects failed:', err)
      return []
    }
  }

  async createProject(name: string): Promise<StorageProject> {
    // No native folder dialog in the browser. The user has to
    // provide a parent directory path explicitly. Caller (UI) is
    // expected to have already created the folder — bridge has no
    // "create at parent + subfolder" primitive. For now we accept
    // `name` as the FULL absolute path to the new project folder.
    if (!name.startsWith('/')) {
      throw new Error('Bridge: createProject expects an absolute path as `name`')
    }
    // Open it — `/fs/open` will fail if it doesn't exist. The studio
    // UI flow should run a mkdir helper before calling this.
    const state = await this.client.post<BridgeStateResponse>('/fs/open', { path: name })
    this.basePath = state.path
    return { id: state.path ?? name, name: state.name ?? basename(name) }
  }

  async deleteProject(_id: string): Promise<void> {
    log.warn('deleteProject is intentionally not implemented on the bridge')
    throw new Error('Project deletion is disabled for safety')
  }

  async openProject(id: string): Promise<void> {
    const state = await this.client.post<BridgeStateResponse>('/fs/open', { path: id })
    this.basePath = state.path
  }

  async closeProject(): Promise<void> {
    await this.client.post<BridgeStateResponse>('/fs/close')
    this.basePath = null
  }

  // ───────────────────────────────────────────────────────────────────────
  // Tree
  // ───────────────────────────────────────────────────────────────────────

  async getTree(): Promise<StorageItem[]> {
    if (!this.basePath) return []
    const { tree } = await this.client.get<{ tree: BridgeTreeItem[] }>('/fs/tree')
    return tree.map(adaptTree)
  }

  // ───────────────────────────────────────────────────────────────────────
  // File operations
  // ───────────────────────────────────────────────────────────────────────

  async readFile(path: string): Promise<string> {
    const { content } = await this.client.get<{ content: string }>(
      `/fs/read?path=${encodeURIComponent(path)}`
    )
    return content
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.client.post('/fs/write', { path, content })
  }

  async deleteFile(path: string): Promise<void> {
    await this.client.post('/fs/delete', { path, type: 'file' })
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    await this.client.post('/fs/rename', { oldPath, newPath })
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<void> {
    // The bridge doesn't have a server-side copy primitive; read+write
    // is fine for the file sizes the studio deals with.
    const content = await this.readFile(sourcePath)
    await this.writeFile(targetPath, content)
  }

  // ───────────────────────────────────────────────────────────────────────
  // Folder operations
  // ───────────────────────────────────────────────────────────────────────

  async createFolder(path: string): Promise<void> {
    await this.client.post('/fs/mkdir', { path })
  }

  async deleteFolder(path: string): Promise<void> {
    await this.client.post('/fs/delete', { path, type: 'folder' })
  }

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    await this.client.post('/fs/rename', { oldPath, newPath })
  }

  // ───────────────────────────────────────────────────────────────────────
  // Move
  // ───────────────────────────────────────────────────────────────────────

  async moveItem(sourcePath: string, targetFolder: string): Promise<void> {
    await this.client.post('/fs/move', { sourcePath, targetFolder })
  }

  // ───────────────────────────────────────────────────────────────────────
  // No native dialogs — leave the optional methods unimplemented on
  // purpose. The studio shell checks `supportsNativeDialogs` before
  // calling them, so absence is fine.
  // ───────────────────────────────────────────────────────────────────────

  getBasePath(): string | null {
    return this.basePath
  }
}

// =============================================================================
// Helpers
// =============================================================================

function basename(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? p
}

/**
 * Map a BridgeTreeItem onto the StorageItem discriminated union. The
 * shapes are nearly identical but StorageFile / StorageFolder have
 * conditional fields, so we narrow explicitly.
 */
function adaptTree(node: BridgeTreeItem): StorageItem {
  if (node.type === 'folder') {
    return {
      type: 'folder',
      name: node.name,
      path: node.path,
      children: (node.children ?? []).map(adaptTree),
    }
  }
  return { type: 'file', name: node.name, path: node.path }
}
