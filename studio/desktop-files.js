/**
 * Desktop File Management
 *
 * Handles file tree rendering and operations for Tauri desktop app.
 * Falls back to demo mode in browser for testing.
 */

// Check if running in Tauri
const isTauri = () => typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined

// State
let currentFolder = null  // Absolute path to open folder (or 'demo' in browser)
let fileTree = []         // Recursive file tree structure
let currentFile = null    // Currently selected file path
let files = {}            // filename → content cache
let contextMenu = null    // Current context menu state
let draggedItem = null    // Currently dragged item path

// Supported file extensions
const SUPPORTED_EXTENSIONS = ['.mir', '.tok', '.com', '.mirror']

// File Types with Icons and Colors
const FILE_TYPES = {
  layout: {
    extension: '.mir',
    color: '#3B82F6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
    </svg>`
  },
  tokens: {
    extension: '.tok',
    color: '#F59E0B',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="8" r="4"></circle>
      <circle cx="7" cy="17" r="3"></circle>
      <circle cx="17" cy="17" r="3"></circle>
    </svg>`
  },
  component: {
    extension: '.com',
    color: '#8B5CF6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="8" height="8" rx="1"></rect>
      <rect x="13" y="3" width="8" height="8" rx="1"></rect>
      <rect x="3" y="13" width="8" height="8" rx="1"></rect>
      <rect x="13" y="13" width="8" height="8" rx="1"></rect>
    </svg>`
  },
  legacy: {
    extension: '.mirror',
    color: '#3B82F6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
    </svg>`
  }
}

// Icons
const ICON_FOLDER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
const ICON_FOLDER_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v1"></path><path d="M5 12h16l-2 7H3l2-7z"></path></svg>`
const ICON_CHEVRON = `<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validate filename - returns error message or null if valid
 */
function validateFilename(name) {
  if (!name || !name.trim()) return 'Name cannot be empty'
  if (name.includes('/') || name.includes('\\')) return 'Name cannot contain / or \\'
  if (name.includes(':')) return 'Name cannot contain :'
  if (name.startsWith('.')) return 'Name cannot start with .'
  return null
}

// Demo files for browser testing
// NOTE: index.mir MUST start with "App" on line 1 due to appLockExtension in app.js
const DEMO_FILES = {
  'index.mir': `App bg #18181b, pad 24, gap 16
  // Demo Project - Browser Mode
  Text "Mirror Studio", font-size 24, weight bold, col white
  Text "Browser Demo Mode", col #888

  Card bg #27272a, pad 16, rad 8, gap 8
    Text "Edit this code to test", col #a1a1aa
    Button "Click Me"
      pad 12 24, bg #3b82f6, rad 6, col white
      hover bg #2563eb`,

  'components.com': `// Component Definitions

Button:
  pad 12 24, bg #3b82f6, rad 6, col white, cursor pointer
  hover bg #2563eb

Card:
  bg #27272a, pad 16, rad 8

Input:
  pad 12, bg #1f1f1f, rad 6, bor 1 #333
  col white
  focus bor 1 #3b82f6`,

  'tokens.tok': `// Design Tokens

// Colors
$primary: #3b82f6
$surface: #27272a
$background: #18181b
$text: #ffffff
$muted: #a1a1aa

// Spacing
$spacing-sm: 8
$spacing-md: 16
$spacing-lg: 24

// Radius
$radius: 8`
}

/**
 * Get file type from filename
 */
function getFileType(filename) {
  for (const [type, config] of Object.entries(FILE_TYPES)) {
    if (filename.endsWith(config.extension)) {
      return { type, ...config }
    }
  }
  // Default to layout for unknown
  return { type: 'layout', ...FILE_TYPES.layout }
}

/**
 * Initialize desktop file management
 */
export function initDesktopFiles(options = {}) {
  const { onFileSelect, onFileChange } = options

  // Store callbacks
  window._desktopFiles = {
    onFileSelect,
    onFileChange,
    files
  }

  // Browser mode: auto-load demo project
  if (!isTauri()) {
    console.log('[DesktopFiles] Browser mode - loading demo project')
    loadDemoProject()

    // Select first file after a short delay (wait for editor)
    setTimeout(() => {
      if (window._desktopFiles?.onFileSelect && currentFile) {
        window._desktopFiles.onFileSelect(currentFile, files[currentFile])
      }
    }, 100)
  } else {
    // Tauri mode: show empty state until folder is opened
    renderFileTree()
  }

  // Add global click handler to close context menu
  document.addEventListener('click', hideContextMenu)

  console.log('[DesktopFiles] Initialized', isTauri() ? '(Tauri)' : '(Browser Demo)')
}

/**
 * Load demo project for browser testing
 */
function loadDemoProject() {
  currentFolder = 'demo'
  files = { ...DEMO_FILES }

  // Build file tree from demo files
  fileTree = Object.keys(DEMO_FILES).map(name => ({
    type: 'file',
    name,
    path: name
  }))

  // Select first file
  currentFile = Object.keys(DEMO_FILES)[0]

  renderFileTree()
}

/**
 * Open a folder via Tauri dialog
 */
export async function openFolder() {
  // Browser mode: just reload demo
  if (!isTauri()) {
    console.log('[DesktopFiles] Browser mode - reloading demo project')
    loadDemoProject()
    if (window._desktopFiles?.onFileSelect && currentFile) {
      window._desktopFiles.onFileSelect(currentFile, files[currentFile])
    }
    return 'demo'
  }

  console.log('[DesktopFiles] openFolder called')
  const bridge = window.TauriBridge
  if (!bridge?.dialog) {
    console.error('[DesktopFiles] TauriBridge not available')
    return null
  }

  try {
    const path = await bridge.dialog.openFolder()
    if (path) {
      await loadFolder(path)
      return path
    }
  } catch (e) {
    console.error('[DesktopFiles] Open folder failed:', e)
  }
  return null
}

/**
 * Load a folder and its contents
 */
export async function loadFolder(folderPath) {
  const bridge = window.TauriBridge
  if (!bridge?.fs) return

  currentFolder = folderPath
  files = {}

  try {
    // Load recursive file tree
    fileTree = await loadFolderRecursive(folderPath)

    // Preload all token and component files for prelude support
    await preloadPreludeFiles(fileTree)

    // Render tree
    renderFileTree()

    // Auto-select first file
    const firstFile = findFirstFile(fileTree)
    if (firstFile) {
      await selectFile(firstFile)
    }

    // Update window title
    if (bridge.window?.setTitle) {
      const folderName = folderPath.split('/').pop()
      bridge.window.setTitle(`${folderName} - Mirror IDE`)
    }

    console.log('[DesktopFiles] Loaded folder:', folderPath)
  } catch (e) {
    console.error('[DesktopFiles] Load folder failed:', e)
  }
}

/**
 * Preload all token (.tok) and component (.com) files for prelude
 * This ensures tokens and components are available when compiling layouts
 */
async function preloadPreludeFiles(tree) {
  const bridge = window.TauriBridge
  if (!bridge?.fs) return

  const preludeFiles = []

  // Collect all .tok and .com files from tree
  function collectPreludeFiles(items) {
    for (const item of items) {
      if (item.type === 'file') {
        const ext = item.name.substring(item.name.lastIndexOf('.')).toLowerCase()
        if (ext === '.tok' || ext === '.com') {
          preludeFiles.push(item.path)
        }
      } else if (item.type === 'folder' && item.children) {
        collectPreludeFiles(item.children)
      }
    }
  }

  collectPreludeFiles(tree)

  // Load all prelude files in parallel
  if (preludeFiles.length > 0) {
    console.log('[DesktopFiles] Preloading', preludeFiles.length, 'prelude files (tokens/components)')
    await Promise.all(preludeFiles.map(async (filePath) => {
      try {
        files[filePath] = await bridge.fs.readFile(filePath)
      } catch (e) {
        console.warn('[DesktopFiles] Failed to preload:', filePath, e)
      }
    }))
  }
}

/**
 * Recursively load folder structure
 */
async function loadFolderRecursive(folderPath, depth = 0) {
  if (depth > 5) return [] // Max depth limit

  const bridge = window.TauriBridge
  const result = await bridge.fs.listDirectory(folderPath)

  // Rust returns { path, files } - extract the files array
  const entries = result.files || []

  const items = []

  for (const entry of entries) {
    // Skip hidden files
    if (entry.name.startsWith('.')) continue

    const fullPath = `${folderPath}/${entry.name}`

    if (entry.is_dir) {
      const children = await loadFolderRecursive(fullPath, depth + 1)
      items.push({
        type: 'folder',
        name: entry.name,
        path: fullPath,
        children,
        expanded: depth === 0 // Auto-expand root level
      })
    } else if (SUPPORTED_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      items.push({
        type: 'file',
        name: entry.name,
        path: fullPath
      })
    }
  }

  // Sort: folders first, then files, alphabetically
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return items
}

/**
 * Find first file in tree
 */
function findFirstFile(tree) {
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
 * Select and load a file
 */
export async function selectFile(filePath) {
  // Browser mode: files already in memory
  if (!isTauri()) {
    currentFile = filePath
    renderFileTree()
    if (window._desktopFiles?.onFileSelect) {
      window._desktopFiles.onFileSelect(filePath, files[filePath] || '')
    }
    return
  }

  // Tauri mode: load from disk
  const bridge = window.TauriBridge
  if (!bridge?.fs) return

  try {
    // Load content if not cached
    if (!files[filePath]) {
      files[filePath] = await bridge.fs.readFile(filePath)
    }

    currentFile = filePath

    // Update UI
    renderFileTree()

    // Callback
    if (window._desktopFiles?.onFileSelect) {
      window._desktopFiles.onFileSelect(filePath, files[filePath])
    }

  } catch (e) {
    console.error('[DesktopFiles] Select file failed:', e)
  }
}

/**
 * Save current file
 */
export async function saveFile(filePath, content) {
  // Always update in-memory cache
  files[filePath] = content

  // Browser mode: just keep in memory (no persistence)
  if (!isTauri()) {
    console.log('[DesktopFiles] Browser mode - saved in memory:', filePath)
    return
  }

  // Tauri mode: write to disk
  const bridge = window.TauriBridge
  if (!bridge?.fs) return

  try {
    await bridge.fs.writeFile(filePath, content)
    console.log('[DesktopFiles] Saved:', filePath)
  } catch (e) {
    console.error('[DesktopFiles] Save failed:', e)
  }
}

/**
 * Create a new file
 */
export async function createFile(fileName, parentFolder = null) {
  const targetFolder = parentFolder || currentFolder
  console.log('[DesktopFiles] createFile called:', fileName, 'in:', targetFolder)

  if (!targetFolder) {
    console.warn('[DesktopFiles] No folder open')
    return
  }

  // Ensure valid extension
  if (!SUPPORTED_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
    fileName = `${fileName}.mir`
  }

  const content = `// ${fileName}\n\nBox w 100, h 100, bg #333\n`

  // Validate filename
  const validationError = validateFilename(fileName)
  if (validationError) {
    alert(validationError)
    return
  }

  // Browser mode: add to in-memory files
  if (!isTauri()) {
    const filePath = targetFolder === 'demo' ? fileName : `${targetFolder}/${fileName}`
    files[filePath] = content

    // Add to correct location in tree
    if (targetFolder === 'demo' || targetFolder === currentFolder) {
      fileTree.push({ type: 'file', name: fileName, path: filePath })
      fileTree.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      // Find parent folder in tree and add there
      addFileToTree(fileTree, targetFolder, { type: 'file', name: fileName, path: filePath })
    }

    currentFile = filePath
    renderFileTree()
    if (window._desktopFiles?.onFileSelect) {
      window._desktopFiles.onFileSelect(filePath, content)
    }
    console.log('[DesktopFiles] Browser mode - created file:', filePath)
    return
  }

  // Tauri mode: write to disk
  const bridge = window.TauriBridge
  console.log('[DesktopFiles] Tauri mode - bridge:', !!bridge, 'fs:', !!bridge?.fs)
  if (!bridge?.fs) {
    console.error('[DesktopFiles] No TauriBridge.fs available')
    return
  }

  const filePath = `${targetFolder}/${fileName}`
  console.log('[DesktopFiles] Writing to:', filePath)

  try {
    await bridge.fs.writeFile(filePath, content)
    console.log('[DesktopFiles] File written, reloading folder...')

    // Reload tree
    await loadFolder(currentFolder)

    // Select new file
    await selectFile(filePath)
    console.log('[DesktopFiles] File created and selected:', filePath)

  } catch (e) {
    console.error('[DesktopFiles] Create file failed:', e)
  }
}

/**
 * Create a new folder
 */
export async function createFolder(folderName, parentFolder = null) {
  const targetFolder = parentFolder || currentFolder

  if (!targetFolder) {
    console.warn('[DesktopFiles] No folder open')
    return
  }

  // Browser mode: not supported (flat file list)
  if (!isTauri()) {
    console.log('[DesktopFiles] Browser mode - folders not supported')
    alert('Ordner werden im Browser-Modus nicht unterstützt')
    return
  }

  // Tauri mode: create on disk
  const bridge = window.TauriBridge
  if (!bridge?.fs) return

  const folderPath = `${targetFolder}/${folderName}`

  try {
    await bridge.fs.createDirectory(folderPath)

    // Reload tree
    await loadFolder(currentFolder)

  } catch (e) {
    console.error('[DesktopFiles] Create folder failed:', e)
  }
}

/**
 * Rename a file or folder
 */
export async function renameItem(oldPath, newName) {
  const dir = oldPath.substring(0, oldPath.lastIndexOf('/'))
  const newPath = dir ? `${dir}/${newName}` : newName

  if (!isTauri()) {
    // Browser mode: rename in memory
    const content = files[oldPath]
    delete files[oldPath]
    files[newPath] = content
    if (currentFile === oldPath) currentFile = newPath

    // Update fileTree
    updateTreeItemPath(fileTree, oldPath, newPath, newName)
    renderFileTree()

    if (window._desktopFiles?.onFileSelect && currentFile === newPath) {
      window._desktopFiles.onFileSelect(newPath, files[newPath])
    }
    return
  }

  // Tauri mode
  const bridge = window.TauriBridge
  try {
    await bridge.fs.renamePath(oldPath, newPath)
    delete files[oldPath]
    await loadFolder(currentFolder)
    if (currentFile === oldPath) {
      await selectFile(newPath)
    }
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

  if (!isTauri()) {
    // Browser mode: check memory
    const existingFiles = new Set(Object.keys(files))
    let newName = `${baseName}-copy${ext}`
    let counter = 1

    while (existingFiles.has(dir ? `${dir}/${newName}` : newName)) {
      newName = `${baseName}-copy-${counter}${ext}`
      counter++
    }

    const newPath = dir ? `${dir}/${newName}` : newName
    const content = files[path] || ''

    files[newPath] = content
    fileTree.push({ type: 'file', name: newName, path: newPath })
    fileTree.sort((a, b) => a.name.localeCompare(b.name))
    renderFileTree()
    return
  }

  // Tauri mode: check filesystem
  const bridge = window.TauriBridge
  try {
    let newName = `${baseName}-copy${ext}`
    let newPath = `${dir}/${newName}`
    let counter = 1

    // Check if file exists on disk
    while (await bridge.fs.pathExists(newPath)) {
      newName = `${baseName}-copy-${counter}${ext}`
      newPath = `${dir}/${newName}`
      counter++
    }

    // Read original content
    let fileContent = files[path]
    if (!fileContent) {
      fileContent = await bridge.fs.readFile(path)
    }

    await bridge.fs.writeFile(newPath, fileContent)
    await loadFolder(currentFolder)
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

  if (!isTauri()) {
    // Browser mode
    if (isFolder) {
      // Remove all files in folder
      Object.keys(files).forEach(f => {
        if (f.startsWith(path + '/')) delete files[f]
      })
    } else {
      delete files[path]
    }
    removeFromTree(fileTree, path)
    if (currentFile === path) {
      currentFile = null
      // Select next available file
      const nextFile = findFirstFile(fileTree)
      if (nextFile) {
        await selectFile(nextFile)
      }
    }
    renderFileTree()
    return
  }

  // Tauri mode
  const bridge = window.TauriBridge
  try {
    await bridge.fs.deletePath(path)
    delete files[path]
    await loadFolder(currentFolder)

    if (currentFile === path) {
      currentFile = null
      const nextFile = findFirstFile(fileTree)
      if (nextFile) {
        await selectFile(nextFile)
      }
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
    // Prevent moving folder into itself
    console.warn('[DesktopFiles] Cannot move folder into itself')
    return
  }

  if (!isTauri()) {
    // Browser mode: move in memory
    const content = files[sourcePath]
    delete files[sourcePath]
    files[newPath] = content
    if (currentFile === sourcePath) currentFile = newPath

    // Update tree structure
    moveInTree(fileTree, sourcePath, targetFolder)
    renderFileTree()
    return
  }

  // Tauri mode
  const bridge = window.TauriBridge
  try {
    await bridge.fs.renamePath(sourcePath, newPath)
    delete files[sourcePath]
    await loadFolder(currentFolder)
    if (currentFile === sourcePath) {
      await selectFile(newPath)
    }
  } catch (e) {
    console.error('[DesktopFiles] Move failed:', e)
  }
}

// === Tree manipulation helpers ===

function updateTreeItemPath(items, oldPath, newPath, newName) {
  for (const item of items) {
    if (item.path === oldPath) {
      item.path = newPath
      item.name = newName
      return true
    }
    if (item.children && updateTreeItemPath(item.children, oldPath, newPath, newName)) {
      return true
    }
  }
  return false
}

function removeFromTree(items, path) {
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].path === path) {
      items.splice(i, 1)
      return true
    }
    if (items[i].children && removeFromTree(items[i].children, path)) {
      return true
    }
  }
  return false
}

function moveInTree(items, sourcePath, targetFolder) {
  let sourceItem = null

  // Find and remove source item
  function findAndRemove(items) {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].path === sourcePath) {
        sourceItem = items.splice(i, 1)[0]
        return true
      }
      if (items[i].children && findAndRemove(items[i].children)) {
        return true
      }
    }
    return false
  }

  // Find target folder and add item
  function addToFolder(items) {
    for (const item of items) {
      if (item.path === targetFolder && item.type === 'folder') {
        const newPath = `${targetFolder}/${sourceItem.name}`
        sourceItem.path = newPath
        item.children = item.children || []
        item.children.push(sourceItem)
        item.children.sort((a, b) => a.name.localeCompare(b.name))
        return true
      }
      if (item.children && addToFolder(item.children)) {
        return true
      }
    }
    return false
  }

  findAndRemove(items)
  if (sourceItem) {
    addToFolder(items)
  }
}

function addFileToTree(items, parentPath, newItem) {
  for (const item of items) {
    if (item.path === parentPath && item.type === 'folder') {
      item.children = item.children || []
      item.children.push(newItem)
      item.children.sort((a, b) => a.name.localeCompare(b.name))
      return true
    }
    if (item.children && addFileToTree(item.children, parentPath, newItem)) {
      return true
    }
  }
  return false
}

// === Context Menu ===

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
    // Root folder: only New File/Folder, no rename/delete
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
    // Empty area
    menu.innerHTML = `
      <div class="context-menu-item" data-action="new-file">New File</div>
      <div class="context-menu-item" data-action="new-folder">New Folder</div>
    `
  }

  document.body.appendChild(menu)

  // Position menu, checking viewport bounds
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

  // Event handlers
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
      const fileName = prompt('File name:', 'new-file.mir')
      if (fileName) {
        await createFile(fileName, isFolder ? path : currentFolder)
      }
      break
    case 'new-folder':
      const folderName = prompt('Folder name:', 'new-folder')
      if (folderName) {
        await createFolder(folderName, isFolder ? path : currentFolder)
      }
      break
  }
}

// === Inline Rename ===

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

  // Select filename without extension
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
        // Restore original
        const span = document.createElement('span')
        span.textContent = oldName
        input.replaceWith(span)
        return
      }
      await renameItem(path, newName)
    } else {
      // Restore original
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

// === Render File Tree ===

function renderFileTree() {
  const container = document.getElementById('file-tree')
  if (!container) return

  if (!currentFolder) {
    // Empty state
    container.innerHTML = `
      <div class="file-tree-empty">
        <div class="file-tree-empty-icon">${ICON_FOLDER}</div>
        <div class="file-tree-empty-text">No folder open</div>
        <div class="file-tree-empty-hint">File → Open Folder (⌘O)</div>
      </div>
    `
    return
  }

  const folderName = currentFolder === 'demo' ? 'Demo Project' : currentFolder.split('/').pop()
  const escapedFolderName = escapeHtml(folderName)
  const escapedCurrentFolder = escapeHtml(currentFolder)

  container.innerHTML = `
    <div class="file-tree-root">
      <div class="file-tree-header">EXPLORER</div>
      <div class="file-tree-items">
        <div class="file-tree-folder expanded" data-path="${escapedCurrentFolder}" data-root="true">
          <div class="file-tree-folder-header" style="padding-left: 12px">
            ${ICON_CHEVRON}
            ${ICON_FOLDER_OPEN}
            <span>${escapedFolderName}</span>
          </div>
          <div class="file-tree-folder-children">
            ${renderTreeItems(fileTree)}
          </div>
        </div>
      </div>
    </div>
  `

  // Attach event listeners
  attachTreeEvents(container)
}

/**
 * Render tree items recursively
 */
function renderTreeItems(items, depth = 1) {
  return items.map(item => {
    if (item.type === 'folder') {
      const folderIcon = item.expanded ? ICON_FOLDER_OPEN : ICON_FOLDER
      const escapedName = escapeHtml(item.name)
      const escapedPath = escapeHtml(item.path)
      return `
        <div class="file-tree-folder ${item.expanded ? 'expanded' : ''}" data-path="${escapedPath}" draggable="true">
          <div class="file-tree-folder-header" style="padding-left: ${12 + depth * 12}px">
            ${ICON_CHEVRON}
            ${folderIcon}
            <span>${escapedName}</span>
          </div>
          <div class="file-tree-folder-children">
            ${item.expanded ? renderTreeItems(item.children || [], depth + 1) : ''}
          </div>
        </div>
      `
    } else {
      const fileType = getFileType(item.name)
      const isActive = currentFile === item.path
      const escapedName = escapeHtml(item.name)
      const escapedPath = escapeHtml(item.path)
      return `
        <div class="file-tree-file ${isActive ? 'active' : ''}"
             data-path="${escapedPath}"
             draggable="true"
             style="padding-left: ${12 + depth * 12}px">
          <span class="file-icon" style="color: ${fileType.color}">${fileType.icon}</span>
          <span>${escapedName}</span>
        </div>
      `
    }
  }).join('')
}

/**
 * Attach events to tree
 */
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
      if (path !== currentFolder) {
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

/**
 * Toggle folder expanded state
 */
function toggleFolder(folderPath) {
  function toggle(items) {
    for (const item of items) {
      if (item.path === folderPath) {
        item.expanded = !item.expanded
        return true
      }
      if (item.children && toggle(item.children)) {
        return true
      }
    }
    return false
  }

  toggle(fileTree)
  renderFileTree()
}

// === Drag & Drop ===

function attachDragEvents(container) {
  container.querySelectorAll('.file-tree-file, .file-tree-folder').forEach(el => {
    // Skip root folder
    if (el.dataset.path === currentFolder) return

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

  // Drop targets (folders only)
  container.querySelectorAll('.file-tree-folder').forEach(folder => {
    folder.addEventListener('dragover', (e) => {
      e.preventDefault()
      if (draggedItem && draggedItem !== folder.dataset.path) {
        // Don't allow dropping into self or children
        if (!draggedItem.startsWith(folder.dataset.path + '/')) {
          folder.classList.add('drag-over')
          e.dataTransfer.dropEffect = 'move'
        }
      }
    })

    folder.addEventListener('dragleave', (e) => {
      // Only remove if actually leaving the folder (not entering a child)
      if (!folder.contains(e.relatedTarget)) {
        folder.classList.remove('drag-over')
      }
    })

    folder.addEventListener('drop', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      folder.classList.remove('drag-over')

      if (!draggedItem || draggedItem === folder.dataset.path) return
      if (draggedItem.startsWith(folder.dataset.path + '/')) return // Can't drop into children

      const targetFolder = folder.dataset.path
      await moveItem(draggedItem, targetFolder)
      draggedItem = null
    })
  })
}

// Export state getters
export function getCurrentFolder() { return currentFolder }
export function getCurrentFile() { return currentFile }
export function getFiles() { return files }
export function getFileContent(path) { return files[path] }

// Export for testing
export { getFileType, updateTreeItemPath, removeFromTree, moveInTree }

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
  getFileContent
}
