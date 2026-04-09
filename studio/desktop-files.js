/**
 * Desktop File Management
 *
 * Handles file tree rendering and operations.
 * Uses the abstracted storage service for all file operations.
 */

import { storage, projectActions } from './storage'

// =============================================================================
// Project Toolbar (Title Bar + Hamburger Menu)
// =============================================================================

let toolbarInitialized = false
let menuOpen = false

const ICON_HAMBURGER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="4" y1="6" x2="20" y2="6"/>
  <line x1="4" y1="12" x2="20" y2="12"/>
  <line x1="4" y1="18" x2="20" y2="18"/>
</svg>`

const ICON_NEW = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <path d="M14 2v6h6"/>
  <line x1="12" y1="18" x2="12" y2="12"/>
  <line x1="9" y1="15" x2="15" y2="15"/>
</svg>`

const ICON_DEMO = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polygon points="5 3 19 12 5 21 5 3"/>
</svg>`

const ICON_LOAD = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="17 8 12 3 7 8"/>
  <line x1="12" y1="3" x2="12" y2="15"/>
</svg>`

const ICON_SAVE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`

function initProjectToolbar() {
  if (toolbarInitialized) return

  // Render toolbar inside file-tree-container (not separate container)
  // because ExplorerPanel clears the parent container
  const container = document.getElementById('file-tree-container')
  if (!container) return

  // Check if already initialized (header exists)
  if (container.querySelector('.fp-header')) {
    toolbarInitialized = true
    return
  }

  // Create wrapper structure:
  // file-tree-container
  //   ├── fp-header (toolbar - stays fixed)
  //   └── file-tree-content (replaced by renderFileTree)

  // Create header element
  const header = document.createElement('div')
  header.className = 'fp-header'
  header.innerHTML = `
    <span class="fp-title">Files</span>
    <div class="fp-header-actions">
      <button class="fp-menu-btn" id="project-menu-btn" title="Menü">
        ${ICON_HAMBURGER}
      </button>
    </div>
  `

  // Create content wrapper for the file tree
  const content = document.createElement('div')
  content.id = 'file-tree-content'
  content.className = 'file-tree-content'

  // Move existing content to the new wrapper
  while (container.firstChild) {
    content.appendChild(container.firstChild)
  }

  // Build new structure
  container.appendChild(header)
  container.appendChild(content)

  // Menu button handler
  const menuBtn = document.getElementById('project-menu-btn')
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    toggleProjectMenu(menuBtn)
  })

  toolbarInitialized = true
}

function toggleProjectMenu(anchorBtn) {
  // Remove existing menu
  const existingMenu = document.getElementById('project-menu')
  if (existingMenu) {
    existingMenu.remove()
    menuOpen = false
    return
  }

  // Create menu
  const menu = document.createElement('div')
  menu.id = 'project-menu'
  menu.className = 'dropdown-menu'

  const menuItems = [
    { id: 'new', icon: ICON_NEW, label: 'Neues Projekt' },
    { id: 'demo', icon: ICON_DEMO, label: 'Demo-Projekt' },
    { type: 'separator' },
    { id: 'load', icon: ICON_LOAD, label: 'Projekt öffnen...' },
    { id: 'save', icon: ICON_SAVE, label: 'Projekt speichern...' },
  ]

  for (const item of menuItems) {
    if (item.type === 'separator') {
      const sep = document.createElement('div')
      sep.className = 'dropdown-menu-separator'
      menu.appendChild(sep)
    } else {
      const btn = document.createElement('button')
      btn.className = 'dropdown-menu-item'
      btn.innerHTML = `
        <span class="dropdown-menu-icon">${item.icon}</span>
        <span class="dropdown-menu-label">${item.label}</span>
      `
      btn.addEventListener('click', () => handleMenuAction(item.id))
      menu.appendChild(btn)
    }
  }

  // Position menu below button
  const rect = anchorBtn.getBoundingClientRect()
  menu.style.position = 'fixed'
  menu.style.top = `${rect.bottom + 4}px`
  menu.style.left = `${rect.right - 180}px` // Align right edge
  menu.style.zIndex = '9999'

  document.body.appendChild(menu)
  menuOpen = true

  // Close on click outside
  const closeMenu = (e) => {
    if (!menu.contains(e.target) && e.target !== anchorBtn) {
      menu.remove()
      menuOpen = false
      document.removeEventListener('click', closeMenu)
    }
  }
  setTimeout(() => document.addEventListener('click', closeMenu), 0)
}

async function handleMenuAction(action) {
  // Close menu
  const menu = document.getElementById('project-menu')
  if (menu) {
    menu.remove()
    menuOpen = false
  }

  switch (action) {
    case 'new':
      if (!confirm('Neues Projekt erstellen? Alle aktuellen Änderungen gehen verloren.')) return
      await projectActions.new()
      break
    case 'demo':
      if (!confirm('Demo-Projekt laden? Alle aktuellen Änderungen gehen verloren.')) return
      await projectActions.demo()
      break
    case 'load':
      await projectActions.import()
      break
    case 'save':
      await projectActions.export()
      break
  }
}

// Initialize toolbar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProjectToolbar)
} else {
  initProjectToolbar()
}

// =============================================================================
// State (UI only - file data comes from storage service)
// =============================================================================

let currentFile = null    // Currently selected file path
let contextMenu = null    // Current context menu state
let draggedItem = null    // Currently dragged item path
let expandedFolders = new Set()  // Track expanded folders (UI state)

// Synchronous file cache for app.js compatibility
// This is updated by storage events and provides sync access to file contents
let filesCache = {}

/**
 * Reset all UI state (called on project close/switch)
 */
function resetUIState() {
  currentFile = null
  contextMenu = null
  draggedItem = null
  expandedFolders.clear()
  filesCache = {}
  hideContextMenu()
}

// =============================================================================
// File Types with Icons and Colors
// =============================================================================

const FILE_TYPES = {
  layout: {
    extensions: ['.mir', '.mirror'],
    color: '#5BA8F5',
    // Lucide: LayoutDashboard
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
    </svg>`
  },
  tokens: {
    extensions: ['.tok', '.tokens'],
    color: '#F59E0B',
    // Lucide: Palette
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/>
    </svg>`
  },
  component: {
    extensions: ['.com', '.components'],
    color: '#8B5CF6',
    // Lucide: Package
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>`
  }
}

// Icons
const ICON_FOLDER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
const ICON_FOLDER_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"></path><path d="M5 12h16l-2 7H3l2-7z"></path></svg>`
const ICON_CHEVRON = `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`

// =============================================================================
// Utilities
// =============================================================================

/**
 * Escape HTML entities to prevent XSS in text content
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Escape for use in HTML attributes (escapes quotes)
 */
function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Validate filename - returns error message or null if valid
 * Note: Only ASCII characters allowed (security requirement)
 */
function validateFilename(name) {
  if (!name || !name.trim()) return 'Name cannot be empty'
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain / or \\'
  if (name.includes(':')) return 'Name cannot contain :'
  if (name.startsWith('.')) return 'Name cannot start with .'
  // Only ASCII alphanumeric, -, _, and . allowed (matches server validation)
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return 'Name can only contain letters, numbers, hyphens, and underscores'
  }
  return null
}

/**
 * Get file type from filename
 */
function getFileType(filename) {
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.some(ext => filename.endsWith(ext))) {
      return { type, ...config }
    }
  }
  // Default to layout for unknown
  return { type: 'layout', ...FILE_TYPES.layout }
}

/**
 * Find first file in tree
 * Prioritizes index.mir over other files
 */
function findFirstFile(tree) {
  // First pass: look for index.mir
  for (const item of tree) {
    if (item.type === 'file' && item.path.endsWith('index.mir')) {
      return item.path
    }
    if (item.type === 'folder' && item.children) {
      const found = findFirstFile(item.children)
      if (found && found.endsWith('index.mir')) return found
    }
  }

  // Second pass: return any file
  for (const item of tree) {
    if (item.type === 'file') return item.path
    if (item.type === 'folder' && item.children) {
      const found = findFirstFile(item.children)
      if (found) return found
    }
  }
  return null
}

/**
 * Preload all files into cache for synchronous access
 * Uses batched loading with concurrency limit to prevent OOM
 */
async function preloadAllFiles() {
  const tree = storage.getTree()
  const MAX_CONCURRENT = 5
  const LARGE_PROJECT_WARNING = 100

  // Collect all file paths
  const filePaths = []
  function collectFiles(items) {
    for (const item of items) {
      if (item.type === 'file') {
        filePaths.push(item.path)
      } else if (item.type === 'folder' && item.children) {
        collectFiles(item.children)
      }
    }
  }
  collectFiles(tree)

  // Warn about large projects
  if (filePaths.length > LARGE_PROJECT_WARNING) {
    console.warn(`[DesktopFiles] Large project: ${filePaths.length} files. Loading may take a moment.`)
  }

  // Load files in batches with concurrency limit
  let loaded = 0
  for (let i = 0; i < filePaths.length; i += MAX_CONCURRENT) {
    const batch = filePaths.slice(i, i + MAX_CONCURRENT)
    const results = await Promise.allSettled(
      batch.map(async (path) => {
        const content = await storage.readFile(path)
        return { path, content }
      })
    )

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        filesCache[result.value.path] = result.value.content
        loaded++
      } else {
        console.warn('[DesktopFiles] Failed to preload:', result.reason)
      }
    }
  }
  console.log('[DesktopFiles] Preloaded', Object.keys(filesCache).length, 'files')
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize desktop file management
 */
export async function initDesktopFiles(options = {}) {
  const { onFileSelect, onFileChange } = options

  // Store callbacks
  window._desktopFiles = {
    onFileSelect,
    onFileChange
  }

  // Initialize storage service
  if (!storage.isInitialized) {
    await storage.init()
  }

  console.log(`[DesktopFiles] Initialized with ${storage.providerType} provider`)

  // Subscribe to storage events
  storage.events.on('tree:changed', ({ tree }) => {
    renderFileTree()
  })

  storage.events.on('file:created', async ({ path }) => {
    // Load content into cache
    try {
      filesCache[path] = await storage.readFile(path)
    } catch (e) {
      console.warn('[DesktopFiles] Failed to cache new file:', path)
    }
    // Auto-select new file
    selectFile(path)
  })

  storage.events.on('file:changed', ({ path, content }) => {
    // Update cache
    filesCache[path] = content
  })

  storage.events.on('file:deleted', ({ path }) => {
    // Remove from cache
    delete filesCache[path]

    if (currentFile === path) {
      currentFile = null
      const tree = storage.getTree()
      const nextFile = findFirstFile(tree)
      if (nextFile) {
        selectFile(nextFile)
      }
    }
    renderFileTree()
  })

  storage.events.on('file:renamed', ({ oldPath, newPath }) => {
    // Update cache
    if (filesCache[oldPath] !== undefined) {
      filesCache[newPath] = filesCache[oldPath]
      delete filesCache[oldPath]
    }

    if (currentFile === oldPath) {
      currentFile = newPath
    }
    renderFileTree()
  })

  storage.events.on('project:closed', () => {
    console.log('[DesktopFiles] Project closed')
    resetUIState()
    renderFileTree()
  })

  storage.events.on('project:opened', async ({ project }) => {
    console.log('[DesktopFiles] Project opened:', project.name)

    // Reset UI state before loading new project
    resetUIState()

    // Preload all files
    await preloadAllFiles()

    // Auto-select first file
    const tree = storage.getTree()
    const firstFile = findFirstFile(tree)
    if (firstFile) {
      await selectFile(firstFile)
    }

    renderFileTree()
  })

  storage.events.on('error', ({ error, operation }) => {
    console.error(`[DesktopFiles] Error in ${operation}:`, error)
  })

  // Auto-open first available project if no project is open
  if (!storage.hasProject) {
    try {
      // Try to get list of projects
      const projects = await storage.listProjects()

      if (projects.length > 0) {
        // Open existing project
        await storage.openProject(projects[0].id)
        console.log('[DesktopFiles] Opened existing project:', projects[0].name)
      } else if (storage.providerType === 'server') {
        // No projects exist on server - create one automatically
        // PHP API creates default files (index.mir, tokens.tok, components.com)
        console.log('[DesktopFiles] No server projects, creating default project...')
        const newProject = await storage.createProject('My Project')
        await storage.openProject(newProject.id)
        console.log('[DesktopFiles] Created and opened new project:', newProject.name)
      } else {
        // Non-server provider - this shouldn't happen in browser mode
        console.error('[DesktopFiles] Unexpected provider type:', storage.providerType)
      }
    } catch (e) {
      // Server error - show error
      console.error('[DesktopFiles] Server error:', e.message)
      // Don't fallback to DemoProvider - just show the error
    }
  }

  // Add global click handler to close context menu
  document.addEventListener('click', hideContextMenu)

  // Initial render
  renderFileTree()

  // Select first file after a short delay
  setTimeout(async () => {
    const tree = storage.getTree()
    const firstFile = findFirstFile(tree)
    if (firstFile && !currentFile) {
      await selectFile(firstFile)
    }
  }, 100)
}

// =============================================================================
// Project Operations
// =============================================================================

/**
 * Open a folder via dialog
 */
export async function openFolder() {
  try {
    if (storage.canOpenFolderDialog()) {
      const path = await storage.openFolderDialog()
      if (path) {
        await storage.openProject(path)
        return path
      }
    } else {
      // No native dialogs available - browser mode doesn't support this
      console.log('[DesktopFiles] Native folder dialog not available in browser mode')
      return null
    }
  } catch (e) {
    console.error('[DesktopFiles] Open folder failed:', e)
  }
  return null
}

/**
 * Load a folder (for external calls)
 */
export async function loadFolder(folderPath) {
  await storage.openProject(folderPath)
}

// =============================================================================
// File Operations
// =============================================================================

/**
 * Select and load a file
 */
export async function selectFile(filePath) {
  try {
    const content = await storage.readFile(filePath)
    currentFile = filePath

    // Update cache (in case it wasn't preloaded)
    filesCache[filePath] = content

    // Update UI
    renderFileTree()

    // Callback to editor
    if (window._desktopFiles?.onFileSelect) {
      window._desktopFiles.onFileSelect(filePath, content)
    }
  } catch (e) {
    console.error('[DesktopFiles] Select file failed:', e)
  }
}

/**
 * Save file content
 */
export async function saveFile(filePath, content) {
  // Update cache immediately for sync access
  filesCache[filePath] = content

  try {
    await storage.writeFile(filePath, content)
  } catch (e) {
    console.error('[DesktopFiles] Save failed:', e)
  }
}

/**
 * Create a new file
 */
export async function createFile(fileName, parentFolder = null) {
  // Determine target folder
  let targetPath = fileName

  // Only prepend parent folder if it's a real path (not root "." or "demo")
  if (parentFolder && parentFolder !== 'demo' && parentFolder !== '.') {
    targetPath = `${parentFolder}/${fileName}`
  }

  // Ensure valid extension
  const SUPPORTED_EXTENSIONS = ['.mir', '.tok', '.com', '.mirror', '.tokens', '.components']
  if (!SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
    targetPath = targetPath.endsWith('.mir') ? targetPath : `${targetPath}.mir`
  }

  // Validate filename
  const validationError = validateFilename(fileName)
  if (validationError) {
    alert(validationError)
    return
  }

  const content = `// ${fileName}\n\nBox w 100, h 100, bg #333\n`

  try {
    await storage.writeFile(targetPath, content)
    await selectFile(targetPath)
  } catch (e) {
    console.error('[DesktopFiles] Create file failed:', e)
  }
}

/**
 * Create a new folder
 */
export async function createFolder(folderName, parentFolder = null) {
  let targetPath = folderName

  // Only prepend parent folder if it's a real path (not root "." or "demo")
  if (parentFolder && parentFolder !== 'demo' && parentFolder !== '.') {
    targetPath = `${parentFolder}/${folderName}`
  }

  try {
    await storage.createFolder(targetPath)
  } catch (e) {
    console.error('[DesktopFiles] Create folder failed:', e)
    alert('Ordner erstellen fehlgeschlagen')
  }
}

/**
 * Rename a file or folder
 */
export async function renameItem(oldPath, newName) {
  const dir = oldPath.substring(0, oldPath.lastIndexOf('/'))
  const newPath = dir ? `${dir}/${newName}` : newName

  try {
    await storage.renameFile(oldPath, newPath)
  } catch (e) {
    console.error('[DesktopFiles] Rename failed:', e)
  }
}

/**
 * Duplicate a file
 */
export async function duplicateFile(path) {
  const name = path.split('/').pop()
  const ext = name.substring(name.lastIndexOf('.'))
  const baseName = name.substring(0, name.lastIndexOf('.'))
  const dir = path.substring(0, path.lastIndexOf('/'))

  // Find unique name
  const tree = storage.getTree()
  const existingNames = new Set()

  function collectNames(items) {
    for (const item of items) {
      if (item.type === 'file') {
        existingNames.add(item.path)
      } else if (item.type === 'folder' && item.children) {
        collectNames(item.children)
      }
    }
  }
  collectNames(tree)

  let newName = `${baseName}-copy${ext}`
  let newPath = dir ? `${dir}/${newName}` : newName
  let counter = 1

  while (existingNames.has(newPath)) {
    newName = `${baseName}-copy-${counter}${ext}`
    newPath = dir ? `${dir}/${newName}` : newName
    counter++
  }

  try {
    await storage.copyFile(path, newPath)
  } catch (e) {
    console.error('[DesktopFiles] Duplicate failed:', e)
  }
}

/**
 * Delete a file or folder
 */
export async function deleteItem(path, isFolder = false) {
  const name = path.split('/').pop()
  const confirmMsg = isFolder
    ? `Delete folder "${name}" and all contents?`
    : `Delete "${name}"?`

  if (!confirm(confirmMsg)) return

  try {
    if (isFolder) {
      await storage.deleteFolder(path)
    } else {
      await storage.deleteFile(path)
    }
  } catch (e) {
    console.error('[DesktopFiles] Delete failed:', e)
  }
}

/**
 * Move an item to a new folder
 */
export async function moveItem(sourcePath, targetFolder) {
  const name = sourcePath.split('/').pop()
  const newPath = `${targetFolder}/${name}`

  if (sourcePath === newPath) return
  if (newPath.startsWith(sourcePath + '/')) {
    console.warn('[DesktopFiles] Cannot move folder into itself')
    return
  }

  try {
    await storage.moveItem(sourcePath, targetFolder)
  } catch (e) {
    console.error('[DesktopFiles] Move failed:', e)
  }
}

// =============================================================================
// Context Menu
// =============================================================================

function showContextMenu(e, target) {
  e.preventDefault()
  e.stopPropagation()
  hideContextMenu()

  const isFile = target?.classList.contains('file-tree-file')
  const folderElement = target?.classList.contains('file-tree-folder') ? target : target?.closest('.file-tree-folder')
  const isFolder = !!folderElement
  const isRoot = folderElement?.dataset?.root === 'true'
  const path = target?.dataset?.path || target?.closest('[data-path]')?.dataset?.path

  const menu = document.createElement('div')
  menu.className = 'context-menu'

  if (isFile) {
    menu.innerHTML = `
      <div class="context-menu-item" data-action="rename">Rename</div>
      <div class="context-menu-item" data-action="duplicate">Duplicate</div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item danger" data-action="delete">Delete</div>
    `
  } else if (isFolder) {
    if (isRoot) {
      menu.innerHTML = `
        <div class="context-menu-item" data-action="new-file">New File</div>
        <div class="context-menu-item" data-action="new-folder">New Folder</div>
      `
    } else {
      menu.innerHTML = `
        <div class="context-menu-item" data-action="new-file">New File</div>
        <div class="context-menu-item" data-action="new-folder">New Folder</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" data-action="rename">Rename</div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item danger" data-action="delete">Delete</div>
      `
    }
  } else {
    menu.innerHTML = `
      <div class="context-menu-item" data-action="new-file">New File</div>
      <div class="context-menu-item" data-action="new-folder">New Folder</div>
    `
  }

  document.body.appendChild(menu)

  // Position menu
  const menuRect = menu.getBoundingClientRect()
  let x = e.clientX
  let y = e.clientY

  if (x + menuRect.width > window.innerWidth) {
    x = window.innerWidth - menuRect.width - 8
  }
  if (y + menuRect.height > window.innerHeight) {
    y = window.innerHeight - menuRect.height - 8
  }

  menu.style.left = `${Math.max(8, x)}px`
  menu.style.top = `${Math.max(8, y)}px`

  contextMenu = { element: menu, path, isFile, isFolder }

  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      handleContextAction(item.dataset.action)
    })
  })
}

function hideContextMenu() {
  if (contextMenu?.element) {
    contextMenu.element.remove()
    contextMenu = null
  }
}

async function handleContextAction(action) {
  const { path, isFile, isFolder } = contextMenu || {}
  hideContextMenu()

  switch (action) {
    case 'rename':
      if (path) startInlineRename(path)
      break
    case 'duplicate':
      if (path && isFile) await duplicateFile(path)
      break
    case 'delete':
      if (path) await deleteItem(path, isFolder)
      break
    case 'new-file':
      startInlineCreate('file', isFolder ? path : null)
      break
    case 'new-folder':
      startInlineCreate('folder', isFolder ? path : null)
      break
  }
}

// =============================================================================
// Inline Rename
// =============================================================================

function startInlineRename(path) {
  const element = document.querySelector(`[data-path="${path}"]`)
  if (!element) return

  const nameSpan = element.querySelector('span:last-child')
  if (!nameSpan) return

  const oldName = nameSpan.textContent

  const input = document.createElement('input')
  input.type = 'text'
  input.className = 'file-tree-rename-input'
  input.value = oldName

  nameSpan.replaceWith(input)
  input.focus()

  const dotIndex = oldName.lastIndexOf('.')
  if (dotIndex > 0) {
    input.setSelectionRange(0, dotIndex)
  } else {
    input.select()
  }

  const finishRename = async () => {
    const newName = input.value.trim()
    if (newName && newName !== oldName) {
      const validationError = validateFilename(newName)
      if (validationError) {
        alert(validationError)
        const span = document.createElement('span')
        span.textContent = oldName
        input.replaceWith(span)
        return
      }
      await renameItem(path, newName)
    } else {
      const span = document.createElement('span')
      span.textContent = oldName
      input.replaceWith(span)
    }
  }

  input.addEventListener('blur', finishRename)
  input.addEventListener('keydown', (e) => {
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

/**
 * Start inline creation of a new file or folder
 */
function startInlineCreate(type, parentPath) {
  // Find the container where to insert the new element
  let container
  if (parentPath && parentPath !== '.') {
    // Find parent folder and expand it
    const parentFolder = document.querySelector(`[data-path="${parentPath}"]`)
    if (parentFolder) {
      expandedFolders.add(parentPath)
      parentFolder.classList.add('expanded')
      container = parentFolder.querySelector('.file-tree-folder-children')
    }
  }

  // Fallback to root folder children
  if (!container) {
    container = document.querySelector('[data-root="true"] .file-tree-folder-children')
  }

  if (!container) return

  // Create temporary element
  const tempElement = document.createElement('div')
  const isFile = type === 'file'
  const defaultName = isFile ? 'new-file.mir' : 'new-folder'
  const depth = parentPath && parentPath !== '.' ? parentPath.split('/').length + 1 : 1

  if (isFile) {
    const fileType = getFileType(defaultName)
    tempElement.className = 'file-tree-file creating'
    tempElement.style.paddingLeft = `${16 + depth * 12}px`
    tempElement.innerHTML = `
      <span class="file-icon" style="color: ${fileType.color}">${fileType.icon}</span>
      <input type="text" class="file-tree-rename-input" value="${defaultName}" />
    `
  } else {
    tempElement.className = 'file-tree-folder creating'
    tempElement.style.paddingLeft = `${8 + depth * 12}px`
    tempElement.innerHTML = `
      <div class="file-tree-folder-header" style="padding-left: 0">
        ${ICON_CHEVRON}
        <input type="text" class="file-tree-rename-input" value="${defaultName}" />
      </div>
    `
  }

  // Insert at the beginning of the container
  container.insertBefore(tempElement, container.firstChild)

  const input = tempElement.querySelector('input')
  input.focus()

  // Select name without extension for files
  if (isFile) {
    const dotIndex = defaultName.lastIndexOf('.')
    if (dotIndex > 0) {
      input.setSelectionRange(0, dotIndex)
    } else {
      input.select()
    }
  } else {
    input.select()
  }

  const finishCreate = async () => {
    const name = input.value.trim()

    if (!name) {
      tempElement.remove()
      return
    }

    const validationError = validateFilename(name)
    if (validationError) {
      alert(validationError)
      tempElement.remove()
      return
    }

    // Remove temp element before creating real one
    tempElement.remove()

    if (isFile) {
      await createFile(name, parentPath)
    } else {
      await createFolder(name, parentPath)
    }
  }

  let finished = false

  input.addEventListener('blur', () => {
    if (!finished) {
      finished = true
      finishCreate()
    }
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      finished = true
      finishCreate()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      finished = true
      tempElement.remove()
    }
  })
}

// =============================================================================
// Render File Tree
// =============================================================================

function renderFileTree() {
  // Ensure toolbar is initialized first (creates file-tree-content)
  initProjectToolbar()

  // Render into file-tree-content (inside file-tree-container)
  const container = document.getElementById('file-tree-content')
    || document.getElementById('file-tree-container')
    || document.getElementById('file-tree')
  if (!container) return

  const tree = storage.getTree()
  const projectName = storage.currentProjectName || 'Project'

  if (!storage.hasProject || tree.length === 0) {
    container.innerHTML = `
      <div class="file-tree-empty">
        <div class="file-tree-empty-icon">${ICON_FOLDER}</div>
        <div class="file-tree-empty-text">No folder open</div>
        <div class="file-tree-empty-hint">File → Open Folder (⌘O)</div>
      </div>
    `
    return
  }

  const escapedProjectName = escapeHtml(projectName)

  container.innerHTML = `
    <div class="file-tree-root">
      <div class="file-tree-items">
        <div class="file-tree-folder expanded" data-path="." data-root="true">
          <div class="file-tree-folder-header" style="padding-left: 8px">
            ${ICON_CHEVRON}
            <span>${escapedProjectName}</span>
          </div>
          <div class="file-tree-folder-children">
            ${renderTreeItems(tree)}
          </div>
        </div>
      </div>
    </div>
  `

  attachTreeEvents(container)
}

/**
 * Get sort priority for file extension
 * .mir = 0, .com = 1, .tok = 2, others = 3
 */
function getExtensionPriority(name) {
  if (name.endsWith('.mir') || name.endsWith('.mirror')) return 0
  if (name.endsWith('.com') || name.endsWith('.components')) return 1
  if (name.endsWith('.tok') || name.endsWith('.tokens')) return 2
  return 3
}

/**
 * Sort items: folders first, then files by extension priority, then alphabetically
 */
function sortTreeItems(items) {
  return [...items].sort((a, b) => {
    // Folders first
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    // Files: sort by extension priority
    if (a.type === 'file') {
      const priorityA = getExtensionPriority(a.name)
      const priorityB = getExtensionPriority(b.name)
      if (priorityA !== priorityB) return priorityA - priorityB
    }
    // Then alphabetically
    return a.name.localeCompare(b.name)
  })
}

function renderTreeItems(items, depth = 1) {
  const sortedItems = sortTreeItems(items)
  return sortedItems.map(item => {
    if (item.type === 'folder') {
      const isExpanded = expandedFolders.has(item.path)
      const escapedName = escapeHtml(item.name)
      const escapedPath = escapeAttr(item.path)  // Use escapeAttr for data attributes
      return `
        <div class="file-tree-folder ${isExpanded ? 'expanded' : ''}" data-path="${escapedPath}" draggable="true">
          <div class="file-tree-folder-header" style="padding-left: ${8 + depth * 12}px">
            ${ICON_CHEVRON}
            <span>${escapedName}</span>
          </div>
          <div class="file-tree-folder-children">
            ${isExpanded ? renderTreeItems(item.children || [], depth + 1) : ''}
          </div>
        </div>
      `
    } else {
      const fileType = getFileType(item.name)
      const isActive = currentFile === item.path
      const escapedName = escapeHtml(item.name)
      const escapedPath = escapeAttr(item.path)  // Use escapeAttr for data attributes
      return `
        <div class="file-tree-file ${isActive ? 'active' : ''}"
             data-path="${escapedPath}"
             draggable="true"
             style="padding-left: ${16 + depth * 12}px">
          <span class="file-icon" style="color: ${fileType.color}">${fileType.icon}</span>
          <span>${escapedName}</span>
        </div>
      `
    }
  }).join('')
}

function attachTreeEvents(container) {
  // File clicks
  container.querySelectorAll('.file-tree-file').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.file-tree-rename-input')) return
      selectFile(el.dataset.path)
    })
    el.addEventListener('contextmenu', (e) => showContextMenu(e, el))
  })

  // Folder toggle
  container.querySelectorAll('.file-tree-folder-header').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.file-tree-rename-input')) return
      const folder = el.closest('.file-tree-folder')
      const path = folder.dataset.path
      if (path !== '.') {
        toggleFolder(path)
      }
    })
    el.addEventListener('contextmenu', (e) => {
      const folder = el.closest('.file-tree-folder')
      showContextMenu(e, folder)
    })
  })

  // Empty area context menu
  container.addEventListener('contextmenu', (e) => {
    if (e.target === container || e.target.classList.contains('file-tree-items')) {
      showContextMenu(e, null)
    }
  })

  // Drag & Drop
  attachDragEvents(container)
}

function toggleFolder(folderPath) {
  if (expandedFolders.has(folderPath)) {
    expandedFolders.delete(folderPath)
  } else {
    expandedFolders.add(folderPath)
  }
  renderFileTree()
}

// =============================================================================
// Drag & Drop
// =============================================================================

function attachDragEvents(container) {
  container.querySelectorAll('.file-tree-file, .file-tree-folder').forEach(el => {
    if (el.dataset.root === 'true') return

    el.addEventListener('dragstart', (e) => {
      draggedItem = el.dataset.path
      el.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', el.dataset.path)
    })

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging')
      draggedItem = null
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
    })
  })

  container.querySelectorAll('.file-tree-folder').forEach(folder => {
    folder.addEventListener('dragover', (e) => {
      e.preventDefault()
      if (draggedItem && draggedItem !== folder.dataset.path) {
        if (!draggedItem.startsWith(folder.dataset.path + '/')) {
          folder.classList.add('drag-over')
          e.dataTransfer.dropEffect = 'move'
        }
      }
    })

    folder.addEventListener('dragleave', (e) => {
      if (!folder.contains(e.relatedTarget)) {
        folder.classList.remove('drag-over')
      }
    })

    folder.addEventListener('drop', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      folder.classList.remove('drag-over')

      if (!draggedItem || draggedItem === folder.dataset.path) return
      if (draggedItem.startsWith(folder.dataset.path + '/')) return

      const targetFolder = folder.dataset.path === '.' ? '' : folder.dataset.path
      await moveItem(draggedItem, targetFolder)
      draggedItem = null
    })
  })
}

// =============================================================================
// Exports
// =============================================================================

export function getCurrentFolder() {
  return storage.hasProject ? storage.currentProjectName : null
}

export function getCurrentFile() {
  return currentFile
}

/**
 * Get all files (synchronous - returns cached content)
 * Used by app.js for prelude building
 */
export function getFiles() {
  return filesCache
}

/**
 * Get file content (synchronous - returns cached content)
 */
export function getFileContent(path) {
  return filesCache[path]
}

/**
 * Update file in cache (called by app.js when editor content changes)
 */
export function updateFileCache(path, content) {
  filesCache[path] = content
}

// Expose globally for menu handlers
window.desktopFiles = {
  openFolder,
  loadFolder,
  selectFile,
  saveFile,
  createFile,
  createFolder,
  renameItem,
  duplicateFile,
  deleteItem,
  moveItem,
  getCurrentFolder,
  getCurrentFile,
  getFiles,
  getFileContent,
  updateFileCache
}

// Also export for testing
export { getFileType }
