/**
 * Tauri Bridge for Mirror Studio
 *
 * Provides native desktop capabilities when running in Tauri.
 * Falls back gracefully when running in browser.
 */

// Check if running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
};

// Lazy load Tauri API
let tauriCore = null;
let tauriEvent = null;

async function getTauriCore() {
  if (!isTauri()) return null;
  if (!tauriCore) {
    tauriCore = await import('https://esm.sh/@tauri-apps/api@2/core');
  }
  return tauriCore;
}

async function getTauriEvent() {
  if (!isTauri()) return null;
  if (!tauriEvent) {
    tauriEvent = await import('https://esm.sh/@tauri-apps/api@2/event');
  }
  return tauriEvent;
}

/**
 * File System Operations
 */
export const TauriFS = {
  async readFile(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('read_file', { path });
  },

  async writeFile(path, content) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('write_file', { path, content });
  },

  async listDirectory(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('list_directory', { path });
  },

  async createDirectory(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('create_directory', { path });
  },

  async deletePath(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('delete_path', { path });
  },

  async renamePath(from, to) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('rename_path', { from, to });
  },

  async pathExists(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('path_exists', { path });
  },

  async getFileInfo(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('get_file_info', { path });
  }
};

/**
 * Project Operations
 */
export const TauriProject = {
  async openProject(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('open_project', { path });
  },

  async createProject(name, path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('create_project', { name, path });
  },

  async getRecentProjects() {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('get_recent_projects');
  },

  async openFolderInExplorer(path) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('open_folder_in_explorer', { path });
  },

  async openInBrowser(url) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('open_in_browser', { url });
  }
};

/**
 * Claude CLI Agent
 */
export const TauriAgent = {
  listeners: new Map(),

  async checkClaudeCli() {
    const core = await getTauriCore();
    if (!core) return false;
    try {
      return await core.invoke('check_claude_cli');
    } catch {
      return false;
    }
  },

  async runAgent(prompt, agentType, projectPath = '', sessionId = null) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('run_agent', {
      prompt,
      agentType,
      projectPath,
      sessionId
    });
  },

  async cancelAgent(sessionId) {
    const core = await getTauriCore();
    if (!core) throw new Error('Not running in Tauri');
    return core.invoke('cancel_agent', { sessionId });
  },

  async onAgentOutput(callback) {
    const event = await getTauriEvent();
    if (!event) return () => {};

    const unlisten = await event.listen('agent:output', (e) => {
      callback(e.payload);
    });

    return unlisten;
  }
};

/**
 * Menu Operations - Handle native desktop menu events
 */
export const TauriMenu = {
  /**
   * Listen for menu click events
   * @param {(menuId: string) => void} callback
   * @returns {Promise<() => void>} Unsubscribe function
   */
  async onMenuClick(callback) {
    const event = await getTauriEvent();
    if (!event) {
      console.warn('[TauriMenu] No event API available');
      return () => {};
    }

    console.log('[TauriMenu] Registering menu event listener...');
    const unlisten = await event.listen('menu', (e) => {
      console.log('[TauriMenu] Received event:', e.payload);
      callback(e.payload);
    });
    console.log('[TauriMenu] Menu event listener registered');

    return unlisten;
  },

  /**
   * Emit a menu action (for testing or programmatic triggering)
   */
  async emitMenuAction(menuId) {
    const event = await getTauriEvent();
    if (!event) return;
    // This is handled by the menu system, just emit for consistency
    console.log('[TauriMenu] Action:', menuId);
  }
};

/**
 * Window Operations
 */
export const TauriWindow = {
  async setTitle(title) {
    const core = await getTauriCore();
    if (!core) return;
    try {
      await core.invoke('set_window_title', { title });
    } catch {
      // Fallback: set document title
      document.title = title;
    }
  },

  async minimize() {
    const core = await getTauriCore();
    if (!core) return;
    // Use Tauri window API
    const { getCurrentWindow } = await import('https://esm.sh/@tauri-apps/api@2/window');
    await getCurrentWindow().minimize();
  },

  async maximize() {
    const core = await getTauriCore();
    if (!core) return;
    const { getCurrentWindow } = await import('https://esm.sh/@tauri-apps/api@2/window');
    await getCurrentWindow().toggleMaximize();
  },

  async close() {
    const core = await getTauriCore();
    if (!core) return;
    const { getCurrentWindow } = await import('https://esm.sh/@tauri-apps/api@2/window');
    await getCurrentWindow().close();
  }
};

/**
 * Dialog Operations - using Tauri invoke API directly
 */
export const TauriDialog = {
  async openFolder() {
    console.log('[TauriDialog] openFolder called');
    if (!isTauri()) throw new Error('Not running in Tauri');
    try {
      const core = await getTauriCore();
      console.log('[TauriDialog] core loaded:', !!core);
      // Use plugin command directly - options must be wrapped
      const result = await core.invoke('plugin:dialog|open', {
        options: {
          directory: true,
          multiple: false,
          title: 'Ordner auswählen'
        }
      });
      console.log('[TauriDialog] result:', result);
      return result;
    } catch (err) {
      console.error('[TauriDialog] openFolder error:', err);
      throw err;
    }
  },

  async openFile(filters = []) {
    if (!isTauri()) throw new Error('Not running in Tauri');
    const core = await getTauriCore();
    const result = await core.invoke('plugin:dialog|open', {
      options: {
        multiple: false,
        filters
      }
    });
    return result;
  },

  async saveFile(defaultPath = '') {
    if (!isTauri()) throw new Error('Not running in Tauri');
    const core = await getTauriCore();
    const result = await core.invoke('plugin:dialog|save', {
      options: {
        defaultPath
      }
    });
    return result;
  },

  async message(message, options = {}) {
    if (!isTauri()) {
      alert(message);
      return;
    }
    const core = await getTauriCore();
    return core.invoke('plugin:dialog|message', {
      message,
      ...options
    });
  },

  async confirm(message, options = {}) {
    if (!isTauri()) {
      return confirm(message);
    }
    const core = await getTauriCore();
    return core.invoke('plugin:dialog|confirm', {
      message,
      ...options
    });
  }
};

/**
 * Utility to check if running in Tauri
 */
export { isTauri };

// Expose globally for non-module scripts
if (typeof window !== 'undefined') {
  window.TauriBridge = {
    isTauri,
    fs: TauriFS,
    project: TauriProject,
    agent: TauriAgent,
    dialog: TauriDialog,
    menu: TauriMenu,
    window: TauriWindow
  };
}

console.log('[Tauri Bridge]', isTauri() ? 'Running in Tauri desktop app' : 'Running in browser');
