/**
 * Tauri Bridge for Mirror Studio
 *
 * Provides native desktop capabilities when running in Tauri.
 * Falls back gracefully when running in browser.
 *
 * The Tauri runtime APIs (`@tauri-apps/api/core`, `/event`, `/window`)
 * are dynamically imported from esm.sh — they can't be resolved by
 * TypeScript at build time, so the relevant call shapes are declared
 * locally as minimal interfaces. The bridge stays untyped against the
 * upstream Tauri types deliberately: this keeps studio independent of
 * a specific Tauri SDK version.
 */

import { alert, confirm } from './dialog'

// =============================================================================
// Tauri runtime types (minimal, declared locally)
// =============================================================================

interface TauriCoreApi {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
}

interface TauriEventApi {
  listen: <T = unknown>(
    event: string,
    handler: (event: { payload: T }) => void
  ) => Promise<() => void>
}

// =============================================================================
// Tauri detection + lazy SDK loaders
// =============================================================================

const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined
  )
}

let tauriCore: TauriCoreApi | null = null
let tauriEvent: TauriEventApi | null = null

async function getTauriCore(): Promise<TauriCoreApi | null> {
  if (!isTauri()) return null
  if (!tauriCore) {
    // URL import resolved at runtime via the browser's module loader; TS
    // can't follow it.
    // @ts-expect-error - URL module import
    tauriCore = (await import('https://esm.sh/@tauri-apps/api@2/core')) as TauriCoreApi
  }
  return tauriCore
}

async function getTauriEvent(): Promise<TauriEventApi | null> {
  if (!isTauri()) return null
  if (!tauriEvent) {
    // @ts-expect-error - URL module import
    tauriEvent = (await import('https://esm.sh/@tauri-apps/api@2/event')) as TauriEventApi
  }
  return tauriEvent
}

// =============================================================================
// File System Operations
// =============================================================================

export const TauriFS = {
  async readFile(path: string): Promise<string> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke<string>('read_file', { path })
  },

  async writeFile(path: string, content: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('write_file', { path, content })
  },

  async listDirectory(path: string): Promise<unknown> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('list_directory', { path })
  },

  async createDirectory(path: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('create_directory', { path })
  },

  async deletePath(path: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('delete_path', { path })
  },

  async renamePath(from: string, to: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('rename_path', { from, to })
  },

  async pathExists(path: string): Promise<boolean> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke<boolean>('path_exists', { path })
  },

  async getFileInfo(path: string): Promise<unknown> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('get_file_info', { path })
  },
}

// =============================================================================
// Project Operations
// =============================================================================

export const TauriProject = {
  async openProject(path: string): Promise<unknown> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('open_project', { path })
  },

  async createProject(name: string, path: string): Promise<unknown> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('create_project', { name, path })
  },

  async getRecentProjects(): Promise<unknown> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('get_recent_projects')
  },

  async openFolderInExplorer(path: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('open_folder_in_explorer', { path })
  },

  async openInBrowser(url: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('open_in_browser', { url })
  },
}

// =============================================================================
// Claude CLI Agent
// =============================================================================

export interface AgentResult {
  session_id: string
  success: boolean
  output: string
  error: string | null
}

export const TauriAgent = {
  listeners: new Map<string, () => void>(),

  async checkClaudeCli(): Promise<boolean> {
    const core = await getTauriCore()
    if (!core) return false
    try {
      return await core.invoke<boolean>('check_claude_cli')
    } catch {
      return false
    }
  },

  async runAgent(
    prompt: string,
    agentType: string,
    projectPath = '',
    sessionId: string | null = null
  ): Promise<AgentResult> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke<AgentResult>('run_agent', {
      prompt,
      agentType,
      projectPath,
      sessionId,
    })
  },

  async cancelAgent(sessionId: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) throw new Error('Not running in Tauri')
    return core.invoke('cancel_agent', { sessionId })
  },

  async onAgentOutput(callback: (payload: unknown) => void): Promise<() => void> {
    const event = await getTauriEvent()
    if (!event) return () => {}

    const unlisten = await event.listen('agent:output', e => {
      callback(e.payload)
    })

    return unlisten
  },
}

// =============================================================================
// Menu Operations - Handle native desktop menu events
// =============================================================================

export const TauriMenu = {
  /**
   * Listen for menu click events. Returns an unsubscribe function.
   */
  async onMenuClick(callback: (menuId: string) => void): Promise<() => void> {
    const event = await getTauriEvent()
    if (!event) {
      console.warn('[TauriMenu] No event API available')
      return () => {}
    }

    console.log('[TauriMenu] Registering menu event listener...')
    const unlisten = await event.listen<string>('menu', e => {
      console.log('[TauriMenu] Received event:', e.payload)
      callback(e.payload)
    })
    console.log('[TauriMenu] Menu event listener registered')

    return unlisten
  },

  /**
   * Emit a menu action (for testing or programmatic triggering).
   * Currently only logs — the real menu system handles emit internally.
   */
  async emitMenuAction(menuId: string): Promise<void> {
    const event = await getTauriEvent()
    if (!event) return
    console.log('[TauriMenu] Action:', menuId)
  },
}

// =============================================================================
// Window Operations
// =============================================================================

interface TauriWindowApi {
  getCurrentWindow: () => {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
  }
}

export const TauriWindow = {
  async setTitle(title: string): Promise<void> {
    const core = await getTauriCore()
    if (!core) return
    try {
      await core.invoke('set_window_title', { title })
    } catch {
      document.title = title
    }
  },

  async minimize(): Promise<void> {
    const core = await getTauriCore()
    if (!core) return
    // @ts-expect-error - URL module import
    const win = (await import('https://esm.sh/@tauri-apps/api@2/window')) as TauriWindowApi
    await win.getCurrentWindow().minimize()
  },

  async maximize(): Promise<void> {
    const core = await getTauriCore()
    if (!core) return
    // @ts-expect-error - URL module import
    const win = (await import('https://esm.sh/@tauri-apps/api@2/window')) as TauriWindowApi
    await win.getCurrentWindow().toggleMaximize()
  },

  async close(): Promise<void> {
    const core = await getTauriCore()
    if (!core) return
    // @ts-expect-error - URL module import
    const win = (await import('https://esm.sh/@tauri-apps/api@2/window')) as TauriWindowApi
    await win.getCurrentWindow().close()
  },
}

// =============================================================================
// Dialog Operations - using Tauri invoke API directly
// =============================================================================

export interface TauriDialogMessageOptions {
  title?: string
  kind?: 'info' | 'warning' | 'error'
}

export interface TauriDialogConfirmOptions {
  title?: string
  kind?: 'info' | 'warning' | 'error'
}

export interface TauriDialogFileFilter {
  name: string
  extensions: string[]
}

export const TauriDialog = {
  async openFolder(): Promise<string | null> {
    console.log('[TauriDialog] openFolder called')
    if (!isTauri()) throw new Error('Not running in Tauri')
    try {
      const core = await getTauriCore()
      if (!core) throw new Error('Tauri core not available')
      console.log('[TauriDialog] core loaded:', !!core)
      // Use plugin command directly - options must be wrapped
      const result = await core.invoke<string | null>('plugin:dialog|open', {
        options: {
          directory: true,
          multiple: false,
          title: 'Ordner auswählen',
        },
      })
      console.log('[TauriDialog] result:', result)
      return result
    } catch (err) {
      console.error('[TauriDialog] openFolder error:', err)
      throw err
    }
  },

  async openFile(filters: TauriDialogFileFilter[] = []): Promise<string | null> {
    if (!isTauri()) throw new Error('Not running in Tauri')
    const core = await getTauriCore()
    if (!core) throw new Error('Tauri core not available')
    return core.invoke<string | null>('plugin:dialog|open', {
      options: {
        multiple: false,
        filters,
      },
    })
  },

  async saveFile(defaultPath = ''): Promise<string | null> {
    if (!isTauri()) throw new Error('Not running in Tauri')
    const core = await getTauriCore()
    if (!core) throw new Error('Tauri core not available')
    return core.invoke<string | null>('plugin:dialog|save', {
      options: {
        defaultPath,
      },
    })
  },

  async message(message: string, options: TauriDialogMessageOptions = {}): Promise<unknown> {
    if (!isTauri()) {
      await alert(message, { title: options.title })
      return
    }
    const core = await getTauriCore()
    if (!core) throw new Error('Tauri core not available')
    return core.invoke('plugin:dialog|message', {
      message,
      ...options,
    })
  },

  async confirm(message: string, options: TauriDialogConfirmOptions = {}): Promise<boolean> {
    if (!isTauri()) {
      return confirm(message, { title: options.title })
    }
    const core = await getTauriCore()
    if (!core) throw new Error('Tauri core not available')
    return core.invoke<boolean>('plugin:dialog|confirm', {
      message,
      ...options,
    })
  },
}

/**
 * Utility to check if running in Tauri.
 */
export { isTauri }

// =============================================================================
// Window global setup
// =============================================================================
//
// `window.TauriBridge` is also typed in studio/agent/fixer.ts (a narrower
// shape used only by the agent flow). We deliberately don't widen the
// global type here — instead we cast to a one-off shape so consumers
// keep using the narrow Window.TauriBridge declaration that already
// exists, while this module exports its full surface via named exports.
interface TauriBridgeGlobal {
  isTauri: typeof isTauri
  fs: typeof TauriFS
  project: typeof TauriProject
  agent: typeof TauriAgent
  dialog: typeof TauriDialog
  menu: typeof TauriMenu
  window: typeof TauriWindow
}

if (typeof window !== 'undefined') {
  ;(window as unknown as { TauriBridge?: TauriBridgeGlobal }).TauriBridge = {
    isTauri,
    fs: TauriFS,
    project: TauriProject,
    agent: TauriAgent,
    dialog: TauriDialog,
    menu: TauriMenu,
    window: TauriWindow,
  }
}

console.log('[Tauri Bridge]', isTauri() ? 'Running in Tauri desktop app' : 'Running in browser')
