import { EditorState, RangeSetBuilder, Prec, Annotation } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, Decoration, ViewPlugin } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, completionKeymap, startCompletion, closeCompletion } from '@codemirror/autocomplete'

// Annotation to mark changes from property panel (for skipping debounce)
const propertyPanelChangeAnnotation = Annotation.define()

// ============================================
// API Client & Auth State
// ============================================

const API_BASE = 'api'  // Relative path for deployment flexibility
const STORAGE_PREFIX = 'mirror-file-'
const FILE_TYPES_KEY = 'mirror-file-types'
const PROJECT_KEY = 'mirror-current-project'
const AUTH_KEY = 'mirror-auth-state'

// App State
// DEV MODE: Always logged in for testing
const DEV_MODE = true
let authState = {
  isLoggedIn: DEV_MODE,
  userId: DEV_MODE ? 'dev_user' : null,
  email: DEV_MODE ? 'dev@test.local' : null
}
let currentProject = null
let projects = []
const files = {}
const fileTypes = {} // Stores explicit file types: { 'filename.mirror': 'component' }
let currentFile = 'index.mirror'

// Default files for demo mode
const defaultFiles = {
  'index.mirror': `// Design Tokens (inline for demo)
$sm.pad: 4
$md.pad: 8
$lg.pad: 16
$sm.rad: 4
$md.rad: 8
$lg.rad: 16
$sm.gap: 4
$md.gap: 8
$lg.gap: 16

App
  rect w 100, h 200, bg #FCC419`,
  'tokens.mirror': `// Design Tokens
// Farben, Abstände und Typografie

// Farb-Palette
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46

// Semantische Farben
$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$surface.bg: $grey-800
$elevated.bg: $grey-700

// Text-Farben
$text.col: #E4E4E7
$muted.col: #A1A1AA
$subtle.col: #71717A

// Abstände
$sm.pad: 4
$md.pad: 8
$lg.pad: 16

// Gap
$sm.gap: 4
$md.gap: 8
$lg.gap: 16

// Radien
$sm.rad: 4
$md.rad: 8
$lg.rad: 16`,
  'components.mirror': `// Komponenten-Definitionen

--- Buttons ---

Button: pad 12 24, bg $primary.bg, rad $md.rad, cursor pointer
  state hover bg $primary.hover.bg

GhostButton: pad 12 24, bg transparent, bor 1 $primary.bg, col $primary.bg, rad $md.rad
  state hover bg $primary.bg, col white

--- Cards ---

Card: pad 16, bg $grey-800, rad $lg.rad
  state hover bg $grey-700`
}

// API Helper
async function api(endpoint, options = {}) {
  const url = API_BASE + endpoint
  const config = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options
  }
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body)
  }
  const response = await fetch(url, config)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'API error')
  }
  return data
}

// Auth Functions
async function checkAuth() {
  // DEV MODE: Skip API call, use mock auth
  if (DEV_MODE) {
    updateAuthUI()
    return true
  }
  try {
    const data = await api('/auth/me')
    authState = { isLoggedIn: true, userId: data.user_id, email: data.email }
    updateAuthUI()
    return true
  } catch {
    authState = { isLoggedIn: false, userId: null, email: null }
    updateAuthUI()
    return false
  }
}

async function login(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { email, password }
  })
  authState = { isLoggedIn: true, userId: data.user_id, email }
  updateAuthUI()
  await loadProjects()
}

async function register(email, password) {
  const data = await api('/auth/register', {
    method: 'POST',
    body: { email, password }
  })
  authState = { isLoggedIn: true, userId: data.user_id, email }
  updateAuthUI()
  await loadProjects()
}

async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' })
  } catch {}
  authState = { isLoggedIn: false, userId: null, email: null }
  currentProject = null
  projects = []
  updateAuthUI()
  await loadDemoProject()
}

function updateAuthUI() {
  const userLabel = document.getElementById('user-label')
  const loginBtn = document.getElementById('user-login-btn')
  const logoutBtn = document.getElementById('user-logout-btn')
  const headerProject = document.getElementById('header-project')

  if (authState.isLoggedIn) {
    userLabel.textContent = authState.email.split('@')[0]
    loginBtn.style.display = 'none'
    logoutBtn.style.display = 'flex'
    headerProject.style.cursor = 'pointer'
    headerProject.style.opacity = '1'
  } else {
    userLabel.textContent = 'Demo'
    loginBtn.style.display = 'flex'
    logoutBtn.style.display = 'none'
    headerProject.style.cursor = 'default'
    headerProject.style.opacity = '0.5'
  }
}

// Project Functions
async function loadProjects() {
  if (!authState.isLoggedIn) return

  // DEV MODE: Use localStorage like demo mode
  if (DEV_MODE) {
    await loadDemoProject()
    return
  }

  try {
    projects = await api('/projects')
    renderProjectList()
    // Auto-select first project or create one
    if (projects.length > 0) {
      const savedProjectId = localStorage.getItem(PROJECT_KEY)
      const project = projects.find(p => p.id === savedProjectId) || projects[0]
      await selectProject(project.id)
    } else {
      await createProject('Projekt')
    }
  } catch (e) {
    console.error('Failed to load projects:', e)
  }
}

async function createProject(name) {
  if (!authState.isLoggedIn) return
  const project = await api('/projects', {
    method: 'POST',
    body: { name }
  })
  projects.unshift(project)
  renderProjectList()
  await selectProject(project.id)
}

// File tree structure from API (recursive)
let fileTree = []

// Flatten file tree to load all file contents
function flattenFileTree(items, result = []) {
  for (const item of items) {
    if (item.type === 'file') {
      result.push(item.path)
    } else if (item.type === 'folder' && item.children) {
      flattenFileTree(item.children, result)
    }
  }
  return result
}

async function selectProject(projectId) {
  if (!authState.isLoggedIn) return
  currentProject = projects.find(p => p.id === projectId)
  if (!currentProject) return

  localStorage.setItem(PROJECT_KEY, projectId)
  document.getElementById('header-project-name').textContent = currentProject.name
  document.getElementById('sidebar-project-name').textContent = currentProject.name

  // Load file tree from server (recursive structure)
  fileTree = await api(`/projects/${projectId}/files`)
  Object.keys(files).forEach(k => delete files[k])

  // Flatten tree and load all file contents
  const filePaths = flattenFileTree(fileTree)
  for (const filePath of filePaths) {
    const fileData = await api(`/projects/${projectId}/files/${encodeURIComponent(filePath)}`)
    files[filePath] = fileData.content
  }

  // Ensure at least index.mirror exists
  if (!files['index.mirror']) {
    files['index.mirror'] = defaultFiles['index.mirror']
  }

  currentFile = 'index.mirror'
  renderFileList()
  if (typeof editor !== 'undefined') {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] }
    })
    compile(files[currentFile])
  }
}

function renderProjectList() {
  const list = document.getElementById('project-dropdown-list')
  list.innerHTML = projects.map(p => `
    <div class="project-dropdown-item ${p.id === currentProject?.id ? 'active' : ''}" data-project-id="${p.id}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <div class="project-dropdown-item-name" data-name="${p.name}">${p.name}</div>
      <div class="project-dropdown-item-actions">
        <button class="rename-project-btn" data-project-id="${p.id}" title="Umbenennen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="delete-project-btn danger" data-project-id="${p.id}" title="Löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('')

  // Add click handlers
  list.querySelectorAll('.project-dropdown-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return
      selectProject(el.dataset.projectId)
      closeProjectDropdown()
    })
  })

  list.querySelectorAll('.rename-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      startRenameProject(btn.dataset.projectId)
    })
  })

  list.querySelectorAll('.delete-project-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteProjectWithConfirm(btn.dataset.projectId)
    })
  })
}

// Project Dropdown Functions
const projectDropdown = document.getElementById('project-dropdown')

function toggleProjectDropdown() {
  if (!authState.isLoggedIn) return
  renderProjectList()
  projectDropdown.classList.toggle('visible')
}

function closeProjectDropdown() {
  projectDropdown.classList.remove('visible')
}

function startRenameProject(projectId) {
  const item = document.querySelector(`.project-dropdown-item[data-project-id="${projectId}"]`)
  if (!item) return

  const nameEl = item.querySelector('.project-dropdown-item-name')
  const actionsEl = item.querySelector('.project-dropdown-item-actions')
  const currentName = nameEl.dataset.name

  // Hide actions and show input with confirm button
  actionsEl.style.display = 'none'
  nameEl.innerHTML = `
    <input type="text" value="${currentName}" class="project-dropdown-input" style="flex: 1;">
    <button class="confirm-btn" title="Bestätigen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `
  nameEl.style.display = 'flex'
  nameEl.style.gap = '6px'
  nameEl.style.alignItems = 'center'

  const input = nameEl.querySelector('input')
  const confirmBtn = nameEl.querySelector('.confirm-btn')
  input.focus()
  input.select()

  let cancelled = false

  const finishRename = async () => {
    if (cancelled) return
    const newName = input.value.trim()
    actionsEl.style.display = ''
    nameEl.style.display = ''
    nameEl.style.gap = ''
    nameEl.style.alignItems = ''
    if (newName && newName !== currentName) {
      await renameProject(projectId, newName)
    } else {
      nameEl.innerHTML = currentName
      nameEl.dataset.name = currentName
    }
  }

  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    input.blur()
  })

  input.addEventListener('blur', finishRename)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur()
    } else if (e.key === 'Escape') {
      cancelled = true
      actionsEl.style.display = ''
      nameEl.style.display = ''
      nameEl.style.gap = ''
      nameEl.style.alignItems = ''
      nameEl.innerHTML = currentName
      nameEl.dataset.name = currentName
    }
  })
}

async function renameProject(projectId, newName) {
  try {
    await api(`/projects/${projectId}`, {
      method: 'PUT',
      body: { name: newName }
    })

    const project = projects.find(p => p.id === projectId)
    if (project) {
      project.name = newName
    }

    if (currentProject?.id === projectId) {
      currentProject.name = newName
      document.getElementById('header-project-name').textContent = newName
      document.getElementById('sidebar-project-name').textContent = newName
    }

    renderProjectList()
  } catch (e) {
    console.error('Failed to rename project:', e)
    alert('Fehler beim Umbenennen')
    renderProjectList()
  }
}

async function deleteProjectWithConfirm(projectId) {
  const project = projects.find(p => p.id === projectId)
  if (!project) return

  if (projects.length <= 1) {
    alert('Das letzte Projekt kann nicht gelöscht werden.')
    return
  }

  if (!confirm(`Projekt "${project.name}" wirklich löschen? Alle Dateien werden unwiderruflich gelöscht.`)) {
    return
  }

  try {
    await api(`/projects/${projectId}`, { method: 'DELETE' })

    projects = projects.filter(p => p.id !== projectId)

    if (currentProject?.id === projectId) {
      await selectProject(projects[0]?.id)
    }

    renderProjectList()
  } catch (e) {
    console.error('Failed to delete project:', e)
    alert('Fehler beim Löschen')
  }
}

// Demo Mode (localStorage-based)
async function loadDemoProject() {
  document.getElementById('header-project-name').textContent = 'Demo Project'
  document.getElementById('sidebar-project-name').textContent = 'Demo Project'
  Object.keys(files).forEach(k => delete files[k])

  for (const [name, content] of Object.entries(defaultFiles)) {
    const saved = localStorage.getItem(STORAGE_PREFIX + name)
    files[name] = saved !== null ? saved : content
  }

  // Also load any other files from localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith(STORAGE_PREFIX)) {
      const filename = key.replace(STORAGE_PREFIX, '')
      if (!files[filename]) {
        files[filename] = localStorage.getItem(key)
      }
    }
  }

  // Load stored file types
  loadFileTypes()

  currentFile = 'index.mirror'
  renderFileList()
  if (typeof editor !== 'undefined') {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] }
    })
    compile(files[currentFile])
  }
}

// Load Starter Template (fresh, ignoring localStorage)
async function loadStarterTemplate() {
  // Clear localStorage for demo files
  for (const name of Object.keys(defaultFiles)) {
    localStorage.removeItem(STORAGE_PREFIX + name)
  }

  // Clear current files and file types
  Object.keys(files).forEach(k => {
    localStorage.removeItem(STORAGE_PREFIX + k)
    delete files[k]
  })
  Object.keys(fileTypes).forEach(k => delete fileTypes[k])
  localStorage.removeItem(FILE_TYPES_KEY)

  // Load fresh from defaultFiles
  for (const [name, content] of Object.entries(defaultFiles)) {
    files[name] = content
    localStorage.setItem(STORAGE_PREFIX + name, content)
  }

  document.getElementById('header-project-name').textContent = 'Starter Template'
  document.getElementById('sidebar-project-name').textContent = 'Starter Template'

  currentFile = 'index.mirror'
  renderFileList()
  if (typeof editor !== 'undefined') {
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] }
    })
    compile(files[currentFile])
  }

  // Close dropdown
  document.getElementById('project-dropdown').classList.remove('show')
}

// Track collapsed folders
const collapsedFolders = new Set()

// Render a single file item
function renderFileItem(item, fileCount) {
  const filePath = item.path
  const displayName = item.filename.replace('.mirror', '')
  const canDelete = fileCount > 1
  const fileIcon = getFileIcon(filePath)

  return `
    <div class="file ${filePath === currentFile ? 'active' : ''}" data-file="${filePath}">
      ${fileIcon}
      <span class="file-name" data-filename="${filePath}">${displayName}</span>
      <button class="file-rename" data-file="${filePath}" title="Umbenennen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      ${canDelete ? `
        <button class="file-delete" data-file="${filePath}" title="Löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ` : ''}
    </div>
  `
}

// Render a folder item with children
function renderFolderItem(item) {
  const folderPath = item.path
  const isCollapsed = collapsedFolders.has(folderPath)
  const displayName = item.filename

  const childrenHtml = item.children ? item.children.map(child => {
    if (child.type === 'folder') {
      return renderFolderItem(child)
    } else {
      return renderFileItem(child, Object.keys(files).length)
    }
  }).join('') : ''

  return `
    <div class="folder-item ${isCollapsed ? 'collapsed' : ''}" data-folder="${folderPath}">
      <div class="folder-header">
        <svg class="folder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <svg class="folder-icon" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="folder-name">${displayName}</span>
        <button class="folder-delete" data-folder="${folderPath}" title="Ordner löschen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="folder-children">
        ${childrenHtml}
      </div>
    </div>
  `
}

// Render file tree (recursive)
function renderFileTreeItems(items) {
  const fileCount = Object.keys(files).length
  return items.map(item => {
    if (item.type === 'folder') {
      return renderFolderItem(item)
    } else {
      return renderFileItem(item, fileCount)
    }
  }).join('')
}

function renderFileList() {
  const container = document.getElementById('file-list')

  // Use fileTree if available (logged in), otherwise build from files object
  let itemsHtml = ''
  if (authState.isLoggedIn && fileTree.length > 0) {
    itemsHtml = renderFileTreeItems(fileTree)
  } else {
    // Fallback for demo mode - flat list
    const fileCount = Object.keys(files).length

    itemsHtml = Object.keys(files).map(filename => {
      const displayName = filename.replace(/\.mirror$/, '')
      const canDelete = fileCount > 1
      const fileIcon = getFileIcon(filename)
      return `
        <div class="file ${filename === currentFile ? 'active' : ''}" data-file="${filename}">
          ${fileIcon}
          <span class="file-name" data-filename="${filename}">${displayName}</span>
          <button class="file-rename" data-file="${filename}" title="Umbenennen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          ${canDelete ? `
            <button class="file-delete" data-file="${filename}" title="Löschen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ` : ''}
        </div>
      `
    }).join('')
  }

  // Add new page button with dropdown
  const buttonsHtml = `
    <div class="add-new-container">
      <button class="add-new-btn" id="add-file-btn">
        <span class="add-new-btn-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New...
        </span>
        <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="add-new-dropdown" id="add-new-dropdown">
        ${Object.entries(FILE_TYPES).map(([type, config]) => `
          <button class="add-new-dropdown-item" data-type="${type}">
            ${config.icon.replace('stroke="currentColor"', `stroke="${config.color}"`)}
            ${config.label}
          </button>
        `).join('')}
        <div class="add-new-dropdown-divider"></div>
        <button class="add-new-dropdown-item" data-type="folder">
          <svg viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          Folder
        </button>
      </div>
    </div>
  `

  container.innerHTML = itemsHtml + buttonsHtml

  // File click handlers
  container.querySelectorAll('.file').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.file-delete') || e.target.closest('.file-rename')) return
      switchFile(el.dataset.file)
    })
  })

  // Folder header click handlers (expand/collapse)
  container.querySelectorAll('.folder-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.folder-delete')) return
      const folderItem = header.closest('.folder-item')
      const folderPath = folderItem.dataset.folder
      if (collapsedFolders.has(folderPath)) {
        collapsedFolders.delete(folderPath)
        folderItem.classList.remove('collapsed')
      } else {
        collapsedFolders.add(folderPath)
        folderItem.classList.add('collapsed')
      }
    })
  })

  // Rename button handlers
  container.querySelectorAll('.file-rename').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      startRenameFile(btn.dataset.file)
    })
  })

  // Delete button handlers
  container.querySelectorAll('.file-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteFile(btn.dataset.file)
    })
  })

  // Folder delete button handlers
  container.querySelectorAll('.folder-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      deleteFolder(btn.dataset.folder)
    })
  })

  // Add file button handler - toggle dropdown
  document.getElementById('add-file-btn')?.addEventListener('click', (e) => {
    e.stopPropagation()
    const btn = e.currentTarget
    const dropdown = document.getElementById('add-new-dropdown')
    const isVisible = dropdown.classList.toggle('visible')
    if (isVisible) {
      // Position dropdown below button
      const rect = btn.getBoundingClientRect()
      dropdown.style.left = rect.left + 'px'
      dropdown.style.top = (rect.bottom + 4) + 'px'
    }
  })

  // Dropdown item handlers
  document.querySelectorAll('.add-new-dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation()
      const type = item.dataset.type
      document.getElementById('add-new-dropdown').classList.remove('visible')
      if (type === 'folder') {
        createNewFolder()
      } else {
        createNewFile(type)
      }
    })
  })

}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('add-new-dropdown')
  const btn = document.getElementById('add-file-btn')
  if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
    dropdown.classList.remove('visible')
  }
})

// File rename functions
function startRenameFile(filePath) {
  const fileEl = document.querySelector(`.file[data-file="${filePath}"]`)
  if (!fileEl) return

  const nameEl = fileEl.querySelector('.file-name')
  // Extract just the filename (without folder path and extension)
  const fileName = filePath.split('/').pop()
  const currentName = fileName.replace('.mirror', '')
  // Get folder path (if any)
  const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/') + 1) : ''

  nameEl.innerHTML = `<input type="text" class="file-name-input" value="${currentName}">`
  const input = nameEl.querySelector('input')
  input.focus()
  input.select()

  const finishRename = async () => {
    const newName = input.value.trim().toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (newName && newName !== currentName) {
      const newPath = folderPath + newName + '.mirror'
      await renameFile(filePath, newPath)
    } else {
      nameEl.textContent = currentName
    }
  }

  input.addEventListener('blur', finishRename)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur()
    } else if (e.key === 'Escape') {
      nameEl.textContent = displayName
    }
  })
}

async function renameFile(oldPath, newPath) {
  if (files[newPath]) {
    alert('Eine Datei mit diesem Namen existiert bereits.')
    renderFileList()
    return
  }

  const content = files[oldPath]

  // Save new file
  await saveFile(newPath, content)

  // Delete old file
  if (authState.isLoggedIn && currentProject) {
    try {
      await api(`/projects/${currentProject.id}/files/${encodeURIComponent(oldPath)}`, { method: 'DELETE' })
      // Reload file tree
      fileTree = await api(`/projects/${currentProject.id}/files`)
    } catch (e) {
      console.error('Failed to delete old file:', e)
    }
  } else {
    localStorage.removeItem(STORAGE_PREFIX + oldPath)
  }

  delete files[oldPath]

  // Transfer file type to new path
  if (fileTypes[oldPath]) {
    fileTypes[newPath] = fileTypes[oldPath]
    delete fileTypes[oldPath]
    localStorage.setItem(FILE_TYPES_KEY, JSON.stringify(fileTypes))
  }

  // Update current file if needed
  if (currentFile === oldPath) {
    currentFile = newPath
  }

  renderFileList()
}

// ===========================================
// FILE TYPES - Single Source of Truth
// ===========================================
const FILE_TYPES = {
  layout: {
    label: 'Layout',
    placeholder: 'home',
    color: '#3B82F6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18"/>
      <path d="M9 21V9"/>
    </svg>`,
    template: (name) => `// ${name} Layout
// UI Layout Seite

Box pad 24, gap 16, bg #0a0a0f
  Text "${name}", font-size 24, weight bold
  Text "Layout content here..."
`,
    detect: (content) => {
      // Default type - only if nothing else matches
      return false
    }
  },
  component: {
    label: 'Components',
    placeholder: 'buttons',
    color: '#8B5CF6',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>`,
    template: (name) => `// ${name} Components
// Komponenten-Definitionen

// Button Komponente
Button: pad 12 24, bg #3B82F6, rad 8, cursor pointer
  state hover bg #2563EB

// Card Komponente
Card: pad 16, bg #1a1a23, rad 8
  Title:
  Content:
`,
    detect: (lines) => {
      // Component definitions: Name: (uppercase, ends with colon)
      let hasDefinitions = false
      let hasInstances = false
      for (const line of lines) {
        if (/^[A-Z][a-zA-Z0-9]*\s*(as\s+[a-zA-Z]+\s*)?:/.test(line)) {
          hasDefinitions = true
        } else if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
          hasInstances = true
        }
      }
      return hasDefinitions && !hasInstances
    }
  },
  tokens: {
    label: 'Tokens',
    placeholder: 'theme',
    color: '#F59E0B',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="7" r="4"/>
      <circle cx="7" cy="15" r="4"/>
      <circle cx="17" cy="15" r="4"/>
    </svg>`,
    template: (name) => `// ${name} Design Tokens
// Farben, Abstände und Typografie

// Farb-Palette
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46

// Semantische Farben
$primary.bg: #3B82F6
$primary.hover.bg: #2563EB
$surface.bg: $grey-800

// Abstände
$sm.pad: 4
$md.pad: 8
$lg.pad: 16

// Radien
$sm.rad: 4
$md.rad: 8
`,
    detect: (lines) => {
      // Token definitions: $name: value or lowercase: value
      // BUT only if there are NO component instances (those make it a layout)
      let hasTokens = false
      let hasInstances = false
      for (const line of lines) {
        if (/^\$?[a-z][a-zA-Z0-9.-]*:\s*(#[0-9A-Fa-f]+|\d+|"[^"]*"|\$)/.test(line)) {
          hasTokens = true
        }
        // Check for component instances (PascalCase without colon = instance)
        if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
          hasInstances = true
        }
      }
      // Only tokens file if has tokens but NO instances
      return hasTokens && !hasInstances
    }
  },
  data: {
    label: 'Data',
    placeholder: 'users',
    color: '#22C55E',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
    </svg>`,
    template: (name) => `// ${name} Data
// Daten und Collections

$users:
  - id 1, name "Max", role "admin"
  - id 2, name "Anna", role "user"
  - id 3, name "Tom", role "user"

$tasks:
  - id 1, title "Task 1", done false
  - id 2, title "Task 2", done true
`,
    detect: (lines) => {
      // Data: $name: followed by - items
      for (const line of lines) {
        if (/^\s*-\s+\w+/.test(line)) {
          return true
        }
      }
      return false
    }
  },
  javascript: {
    label: 'JavaScript',
    placeholder: 'utils',
    color: '#EC4899',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16 18l6-6-6-6"/>
      <path d="M8 6l-6 6 6 6"/>
    </svg>`,
    template: (name) => `// ${name} JavaScript
// Custom JavaScript Code

javascript
  function handle${name.replace(/[^a-zA-Z]/g, '')}() {
console.log('${name} loaded')
  }

  // Export für Mirror
  window.${name.replace(/[^a-zA-Z]/g, '')} = {
init: handle${name.replace(/[^a-zA-Z]/g, '')}
  }
end
`,
    detect: (lines, content) => {
      return content.includes('javascript') && content.includes('end')
    }
  },
  theme: {
    label: 'Theme',
    placeholder: 'theme',
    color: '#F59E0B',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>`,
    template: () => '',
    detect: () => false
  },
  css: {
    label: 'CSS',
    placeholder: 'styles',
    color: '#38BDF8',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 3h16l-1.5 15-6.5 3-6.5-3z"/>
      <path d="M8 8h8l-.5 5-3.5 1.5-3.5-1.5"/>
    </svg>`,
    template: () => '',
    detect: () => false
  }
}

// Detect file type from content
function detectFileType(content) {
  if (!content || !content.trim()) return 'layout'

  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//') && !l.startsWith('import'))

  if (lines.length === 0) return 'layout'

  // Check each type's detect function (order matters: more specific first)
  const checkOrder = ['javascript', 'data', 'tokens', 'component']
  for (const type of checkOrder) {
    if (FILE_TYPES[type].detect(lines, content)) {
      return type
    }
  }

  return 'layout'
}

// Get icon SVG for file (with color)
function getFileIcon(filename, withColor = true) {
  const type = getFileType(filename)
  const fileType = FILE_TYPES[type]
  if (withColor) {
    return fileType.icon.replace('stroke="currentColor"', `stroke="${fileType.color}"`)
  }
  return fileType.icon
}

// Get file type color
function getFileTypeColor(filename) {
  const type = getFileType(filename)
  return FILE_TYPES[type].color
}

// Create new file
function createNewFile(type = 'layout') {
  // Check if input row already exists
  if (document.querySelector('.file-input-row')) return

  const container = document.getElementById('file-list')
  const addContainer = document.querySelector('.add-new-container')
  const fileType = FILE_TYPES[type] || FILE_TYPES.layout

  // Create inline input row
  const inputRow = document.createElement('div')
  inputRow.className = 'file-input-row'
  inputRow.innerHTML = `
    <input type="text" class="file-name-input" placeholder="${fileType.placeholder}" autofocus>
    <button class="file-confirm-btn" title="Erstellen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `

  // Insert before the add container
  container.insertBefore(inputRow, addContainer)

  const input = inputRow.querySelector('input')
  const confirmBtn = inputRow.querySelector('.file-confirm-btn')

  input.focus()

  const confirmCreate = async () => {
    const name = input.value.trim() || fileType.placeholder

    // Sanitize filename
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!sanitized) {
      cancelCreate()
      return
    }

    const filename = sanitized + '.mirror'

    // Check if exists
    if (files[filename]) {
      input.style.borderColor = '#ef4444'
      input.focus()
      return
    }

    // Create file with template from FILE_TYPES
    const content = fileType.template(sanitized)
    await saveFile(filename, content)

    // Save the explicit file type
    saveFileType(filename, type)

    // Reload file tree if logged in
    if (authState.isLoggedIn && currentProject) {
      fileTree = await api(`/projects/${currentProject.id}/files`)
    }

    // Re-render and switch to new file
    renderFileList()
    switchFile(filename)
  }

  const cancelCreate = () => {
    inputRow.remove()
  }

  // Event handlers
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmCreate()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelCreate()
    }
  })

  input.addEventListener('blur', (e) => {
    // Small delay to allow clicking confirm button
    setTimeout(() => {
      if (document.activeElement !== confirmBtn && inputRow.parentElement) {
        cancelCreate()
      }
    }, 150)
  })

  confirmBtn.addEventListener('click', (e) => {
    e.preventDefault()
    confirmCreate()
  })
}

// Create new folder
function createNewFolder() {
  // Check if input row already exists
  if (document.querySelector('.file-input-row')) return

  const container = document.getElementById('file-list')
  const addContainer = document.querySelector('.add-new-container')

  // Create inline input row
  const inputRow = document.createElement('div')
  inputRow.className = 'file-input-row'
  inputRow.innerHTML = `
    <input type="text" class="file-name-input" placeholder="ordner-name" autofocus>
    <button class="file-confirm-btn" title="Erstellen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `

  // Insert before the add container
  container.insertBefore(inputRow, addContainer)

  const input = inputRow.querySelector('input')
  const confirmBtn = inputRow.querySelector('.file-confirm-btn')

  input.focus()

  const confirmCreate = async () => {
    const name = input.value.trim() || 'ordner'

    // Sanitize folder name
    const sanitized = name.toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    if (!sanitized) {
      cancelCreate()
      return
    }

    const folderPath = sanitized + '/'
    const filename = folderPath + 'index.mirror'

    // Check if folder exists
    if (Object.keys(files).some(f => f.startsWith(folderPath))) {
      input.style.borderColor = '#ef4444'
      input.focus()
      return
    }

    // Create index file in folder
    const content = `// ${sanitized}\n// Ordner Index\n`
    await saveFile(filename, content)

    // Reload file tree if logged in
    if (authState.isLoggedIn && currentProject) {
      fileTree = await api(`/projects/${currentProject.id}/files`)
    }

    // Re-render and switch to new file
    renderFileList()
    switchFile(filename)
  }

  const cancelCreate = () => {
    inputRow.remove()
  }

  // Event handlers
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmCreate()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelCreate()
    }
  })

  input.addEventListener('blur', (e) => {
    // Small delay to allow clicking confirm button
    setTimeout(() => {
      if (document.activeElement !== confirmBtn && inputRow.parentElement) {
        cancelCreate()
      }
    }, 150)
  })

  confirmBtn.addEventListener('click', (e) => {
    e.preventDefault()
    confirmCreate()
  })
}

// Delete file
async function deleteFile(filePath) {
  if (Object.keys(files).length <= 1) {
    alert('Mindestens eine Datei muss existieren')
    return
  }

  // Delete from storage
  if (authState.isLoggedIn && currentProject) {
    try {
      await api(`/projects/${currentProject.id}/files/${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      })
      // Reload file tree
      fileTree = await api(`/projects/${currentProject.id}/files`)
    } catch (e) {
      console.error('Failed to delete from server:', e)
    }
  } else {
    localStorage.removeItem(STORAGE_PREFIX + filePath)
  }

  // Remove from files object and file types
  delete files[filePath]
  deleteFileType(filePath)

  // Switch to another file if we deleted the current one
  if (currentFile === filePath) {
    currentFile = Object.keys(files)[0] || 'index.mirror'
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] || '' }
    })
    compile(files[currentFile] || '')
  }

  renderFileList()
}

// Delete folder
async function deleteFolder(folderPath) {
  if (!authState.isLoggedIn || !currentProject) return

  try {
    await api(`/projects/${currentProject.id}/folders/${encodeURIComponent(folderPath)}?force=true`, {
      method: 'DELETE'
    })

    // Remove all files in this folder from the files object
    Object.keys(files).forEach(filePath => {
      if (filePath.startsWith(folderPath + '/')) {
        delete files[filePath]
      }
    })

    // Switch to another file if current file was in deleted folder
    if (currentFile.startsWith(folderPath + '/')) {
      currentFile = Object.keys(files)[0] || 'index.mirror'
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] || '' }
      })
      compile(files[currentFile] || '')
    }

    // Reload file tree
    fileTree = await api(`/projects/${currentProject.id}/files`)
    renderFileList()
  } catch (e) {
    console.error('Failed to delete folder:', e)
    alert('Fehler beim Löschen des Ordners')
  }
}

// Save file (to localStorage or server)
async function saveFile(filePath, content) {
  files[filePath] = content
  if (authState.isLoggedIn && currentProject) {
    try {
      await api(`/projects/${currentProject.id}/files/${encodeURIComponent(filePath)}`, {
        method: 'PUT',
        body: { content }
      })
    } catch (e) {
      console.error('Failed to save to server:', e)
    }
  } else {
    localStorage.setItem(STORAGE_PREFIX + filePath, content)
  }
}

// Save file type (explicit user-selected type)
function saveFileType(filename, type) {
  fileTypes[filename] = type
  localStorage.setItem(FILE_TYPES_KEY, JSON.stringify(fileTypes))
}

// Load file types from localStorage
function loadFileTypes() {
  try {
    const stored = localStorage.getItem(FILE_TYPES_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      Object.assign(fileTypes, parsed)
    }
  } catch (e) {
    console.error('Failed to load file types:', e)
  }
}

// Delete file type when file is deleted
function deleteFileType(filename) {
  delete fileTypes[filename]
  localStorage.setItem(FILE_TYPES_KEY, JSON.stringify(fileTypes))
}

// Get file type (stored or detected)
function getFileType(filename) {
  // First check for explicit stored type
  if (fileTypes[filename]) {
    return fileTypes[filename]
  }
  // Fall back to detection from content
  const content = files[filename] || ''
  return detectFileType(content)
}

// File switching
function switchFile(filename) {
  if (typeof editor === 'undefined') return

  // Save current file
  const currentContent = editor.state.doc.toString()
  saveFile(currentFile, currentContent)

  // Switch to new file
  currentFile = filename
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: files[filename] || '' }
  })

  // Update active state in UI
  document.querySelectorAll('.file').forEach(f => f.classList.remove('active'))
  document.querySelector(`[data-file="${filename}"]`)?.classList.add('active')

  // Compile
  compile(files[filename])
}

// Auth Modal Handling
const authOverlay = document.getElementById('auth-overlay')
const authForm = document.getElementById('auth-form')
const authError = document.getElementById('auth-error')
const authTabs = document.querySelectorAll('.auth-tab')
const authSubmit = document.getElementById('auth-submit')
const authTitle = document.querySelector('.auth-title')
let authMode = 'login'

function showAuthModal() {
  authOverlay.classList.add('visible')
  authError.classList.remove('visible')
  document.getElementById('auth-email').focus()
}

function hideAuthModal() {
  authOverlay.classList.remove('visible')
  authForm.reset()
  authError.classList.remove('visible')
}

authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.tab
    authTabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    authSubmit.textContent = authMode === 'login' ? 'Anmelden' : 'Registrieren'
    authTitle.textContent = authMode === 'login' ? 'Anmelden' : 'Registrieren'
  })
})

authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('auth-email').value
  const password = document.getElementById('auth-password').value

  authSubmit.disabled = true
  authError.classList.remove('visible')

  try {
    if (authMode === 'login') {
      await login(email, password)
    } else {
      await register(email, password)
    }
    hideAuthModal()
  } catch (err) {
    authError.textContent = err.message
    authError.classList.add('visible')
  } finally {
    authSubmit.disabled = false
  }
})

document.getElementById('auth-close').addEventListener('click', hideAuthModal)
document.getElementById('auth-demo-btn').addEventListener('click', () => {
  hideAuthModal()
  loadDemoProject()
})

// User Menu
const userButton = document.getElementById('user-button')
const userMenu = document.getElementById('user-menu')

userButton.addEventListener('click', () => {
  userMenu.classList.toggle('visible')
})

document.getElementById('user-login-btn').addEventListener('click', () => {
  userMenu.classList.remove('visible')
  showAuthModal()
})

document.getElementById('user-logout-btn').addEventListener('click', () => {
  userMenu.classList.remove('visible')
  logout()
})

// Project Dropdown
const headerProject = document.getElementById('header-project')
headerProject.addEventListener('click', (e) => {
  // Don't toggle if clicking inside dropdown
  if (e.target.closest('.project-dropdown')) return
  if (!authState.isLoggedIn) {
    showAuthModal()
    return
  }
  toggleProjectDropdown()
})

// Sidebar project folder click (opens dropdown to switch projects)
document.getElementById('sidebar-project').addEventListener('click', (e) => {
  // Don't trigger if clicking action buttons
  if (e.target.closest('.folder-actions')) return
  if (!authState.isLoggedIn) {
    showAuthModal()
    return
  }
  toggleProjectDropdown()
})

// Sidebar project rename
document.getElementById('sidebar-project-rename').addEventListener('click', (e) => {
  e.stopPropagation()
  if (!authState.isLoggedIn || !currentProject) return

  const nameEl = document.getElementById('sidebar-project-name')
  const currentName = currentProject.name

  nameEl.innerHTML = `<input type="text" class="file-name-input" value="${currentName}" style="width: 100%;">`
  const input = nameEl.querySelector('input')
  input.focus()
  input.select()

  const finishRename = async () => {
    const newName = input.value.trim()
    if (newName && newName !== currentName) {
      await renameProject(currentProject.id, newName)
    }
    nameEl.textContent = currentProject.name
  }

  input.addEventListener('blur', finishRename)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur()
    } else if (e.key === 'Escape') {
      nameEl.textContent = currentName
    }
  })
})

// Sidebar project delete
document.getElementById('sidebar-project-delete').addEventListener('click', (e) => {
  e.stopPropagation()
  if (!authState.isLoggedIn || !currentProject) return
  deleteProjectWithConfirm(currentProject.id)
})

document.getElementById('project-dropdown-new').addEventListener('click', () => {
  // Add inline input for new project name
  const list = document.getElementById('project-dropdown-list')
  const existingInput = list.querySelector('.new-project-input-row')
  if (existingInput) return // Already showing input

  const inputRow = document.createElement('div')
  inputRow.className = 'project-dropdown-item new-project-input-row'
  inputRow.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
    <input type="text" class="project-dropdown-input" value="Neues Projekt" placeholder="Projektname">
    <button class="confirm-btn" title="Bestätigen">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `
  list.insertBefore(inputRow, list.firstChild)

  const input = inputRow.querySelector('input')
  const confirmBtn = inputRow.querySelector('.confirm-btn')
  input.focus()
  input.select()

  let cancelled = false

  const finishCreate = async () => {
    if (cancelled) return
    const name = input.value.trim()
    if (name) {
      await createProject(name)
      closeProjectDropdown()
    } else {
      inputRow.remove()
    }
  }

  confirmBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    input.blur()
  })

  input.addEventListener('blur', finishCreate)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      input.blur()
    } else if (e.key === 'Escape') {
      cancelled = true
      inputRow.remove()
    }
  })
})

// Load Starter Template button
document.getElementById('project-dropdown-template').addEventListener('click', () => {
  loadStarterTemplate()
})

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!userButton.contains(e.target) && !userMenu.contains(e.target)) {
    userMenu.classList.remove('visible')
  }
  // Close project dropdown when clicking outside
  const headerProject = document.getElementById('header-project')
  if (headerProject && !headerProject.contains(e.target)) {
    closeProjectDropdown()
  }
})

// Initialize: Check auth status
async function initApp() {
  const loggedIn = await checkAuth()
  if (loggedIn) {
    await loadProjects()
  } else {
    await loadDemoProject()
  }
}

// Start initialization (will complete after editor is set up)
let editorReady = false
const initPromise = initApp()

// ============================================
// End of API Client & Auth
// ============================================

const initialCode = files[currentFile] || defaultFiles['index.mirror']

// Token patterns
const patterns = [
  { regex: /\/\/.*$/gm, class: 'mir-comment' },
  { regex: /"[^"]*"/g, class: 'mir-string' },
  { regex: /#[0-9A-Fa-f]{3,8}\b/g, class: 'mir-hex' },
  { regex: /\b\d+(\.\d+)?(%|px|rem|em)?\b/g, class: 'mir-number' },
  { regex: /\b(as|extends|named|each|in|if|else|where|then|data)\b/g, class: 'mir-keyword' },
  { regex: /\b(hover|focus|active|disabled|filled|state|selected|highlighted|on|off)\b/g, class: 'mir-state' },
  { regex: /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|keys)\b/g, class: 'mir-event' },
  { regex: /\b(pad|padding|bg|background|col|color|gap|rad|radius|bor|border|width|height|size|font|weight|center|hor|ver|spread|wrap|hidden|visible|opacity|shadow|cursor|grid|scroll|clip|truncate|italic|underline|uppercase|lowercase|left|right|top|bottom|margin|min|max|animate|font-size)\b/g, class: 'mir-property' },
  { regex: /\b(show|hide|toggle|select|highlight|activate|deactivate|call|open|close|page)\b/g, class: 'mir-action' },
  { regex: /\b[A-Z][a-zA-Z0-9]*\b/g, class: 'mir-component' },
  { regex: /\$[a-zA-Z][a-zA-Z0-9.-]*/g, class: 'mir-binding' },
]

// Create decoration marks
const decorations = {}
patterns.forEach(p => {
  decorations[p.class] = Decoration.mark({ class: p.class })
})

// Tokenize text and build decorations
function tokenize(view) {
  const builder = new RangeSetBuilder()
  const text = view.state.doc.toString()
  const matches = []

  // Collect all matches with positions
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(text)) !== null) {
      matches.push({
        from: match.index,
        to: match.index + match[0].length,
        class: pattern.class
      })
    }
  }

  // Sort by position and filter overlaps (first match wins)
  matches.sort((a, b) => a.from - b.from)
  const filtered = []
  let lastEnd = 0
  for (const m of matches) {
    if (m.from >= lastEnd) {
      filtered.push(m)
      lastEnd = m.to
    }
  }

  // Build range set
  for (const m of filtered) {
    builder.add(m.from, m.to, decorations[m.class])
  }

  return builder.finish()
}

// ViewPlugin for syntax highlighting
const mirrorHighlight = ViewPlugin.fromClass(class {
  constructor(view) {
    this.decorations = tokenize(view)
  }
  update(update) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = tokenize(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})

// Autocomplete - All Mirror properties
const mirrorProperties = [
  // Layout
  { label: 'hor', detail: 'horizontal layout', type: 'property' },
  { label: 'horizontal', detail: 'horizontal layout', type: 'property' },
  { label: 'ver', detail: 'vertical layout', type: 'property' },
  { label: 'vertical', detail: 'vertical layout', type: 'property' },
  { label: 'center', detail: 'center both axes', type: 'property' },
  { label: 'cen', detail: 'center both axes', type: 'property' },
  { label: 'spread', detail: 'space-between', type: 'property' },
  { label: 'wrap', detail: 'allow wrapping', type: 'property' },
  { label: 'stacked', detail: 'z-layers', type: 'property' },
  { label: 'grid', detail: 'grid layout', type: 'property' },
  // Alignment
  { label: 'left', detail: 'align left', type: 'property' },
  { label: 'right', detail: 'align right', type: 'property' },
  { label: 'top', detail: 'align top', type: 'property' },
  { label: 'bottom', detail: 'align bottom', type: 'property' },
  { label: 'hor-center', detail: 'center horizontal', type: 'property' },
  { label: 'ver-center', detail: 'center vertical', type: 'property' },
  // Spacing
  { label: 'pad', detail: 'padding', type: 'property' },
  { label: 'padding', detail: 'padding', type: 'property' },
  { label: 'p', detail: 'padding', type: 'property' },
  { label: 'margin', detail: 'margin', type: 'property' },
  { label: 'm', detail: 'margin', type: 'property' },
  { label: 'gap', detail: 'gap between children', type: 'property' },
  { label: 'g', detail: 'gap between children', type: 'property' },
  // Sizing
  { label: 'width', detail: 'width (hug/full/px)', type: 'property' },
  { label: 'w', detail: 'width (hug/full/px)', type: 'property' },
  { label: 'height', detail: 'height (hug/full/px)', type: 'property' },
  { label: 'h', detail: 'height (hug/full/px)', type: 'property' },
  { label: 'size', detail: 'width + height', type: 'property' },
  { label: 'min-width', detail: 'minimum width', type: 'property' },
  { label: 'minw', detail: 'minimum width', type: 'property' },
  { label: 'max-width', detail: 'maximum width', type: 'property' },
  { label: 'maxw', detail: 'maximum width', type: 'property' },
  { label: 'min-height', detail: 'minimum height', type: 'property' },
  { label: 'minh', detail: 'minimum height', type: 'property' },
  { label: 'max-height', detail: 'maximum height', type: 'property' },
  { label: 'maxh', detail: 'maximum height', type: 'property' },
  { label: 'hug', detail: 'fit content', type: 'property' },
  { label: 'full', detail: '100% + flex-grow', type: 'property' },
  // Colors
  { label: 'bg', detail: 'background color', type: 'property' },
  { label: 'background', detail: 'background color', type: 'property' },
  { label: 'col', detail: 'text color', type: 'property' },
  { label: 'color', detail: 'text color', type: 'property' },
  { label: 'c', detail: 'text color', type: 'property' },
  { label: 'boc', detail: 'border color', type: 'property' },
  { label: 'border-color', detail: 'border color', type: 'property' },
  // Border & Radius
  { label: 'bor', detail: 'border', type: 'property' },
  { label: 'border', detail: 'border', type: 'property' },
  { label: 'rad', detail: 'border radius', type: 'property' },
  { label: 'radius', detail: 'border radius', type: 'property' },
  // Typography
  { label: 'font-size', detail: 'font size', type: 'property' },
  { label: 'fs', detail: 'font size', type: 'property' },
  { label: 'weight', detail: 'font weight', type: 'property' },
  { label: 'line', detail: 'line height', type: 'property' },
  { label: 'font', detail: 'font family', type: 'property' },
  { label: 'align', detail: 'text alignment', type: 'property' },
  { label: 'italic', detail: 'italic text', type: 'property' },
  { label: 'underline', detail: 'underlined text', type: 'property' },
  { label: 'truncate', detail: 'truncate with ellipsis', type: 'property' },
  { label: 'uppercase', detail: 'uppercase text', type: 'property' },
  { label: 'lowercase', detail: 'lowercase text', type: 'property' },
  // Icons
  { label: 'icon-size', detail: 'icon size', type: 'property' },
  { label: 'is', detail: 'icon size', type: 'property' },
  { label: 'icon-weight', detail: 'icon stroke weight', type: 'property' },
  { label: 'iw', detail: 'icon stroke weight', type: 'property' },
  { label: 'icon-color', detail: 'icon color', type: 'property' },
  { label: 'ic', detail: 'icon color', type: 'property' },
  { label: 'fill', detail: 'filled icon', type: 'property' },
  // Visuals
  { label: 'opacity', detail: 'opacity 0-1', type: 'property' },
  { label: 'o', detail: 'opacity 0-1', type: 'property' },
  { label: 'shadow', detail: 'box shadow', type: 'property' },
  { label: 'cursor', detail: 'cursor style', type: 'property' },
  { label: 'z', detail: 'z-index', type: 'property' },
  { label: 'hidden', detail: 'start hidden', type: 'property' },
  { label: 'visible', detail: 'visibility', type: 'property' },
  { label: 'disabled', detail: 'disabled state', type: 'property' },
  { label: 'rotate', detail: 'rotation', type: 'property' },
  { label: 'rot', detail: 'rotation', type: 'property' },
  { label: 'translate', detail: 'translate X Y', type: 'property' },
  // Scroll
  { label: 'scroll', detail: 'vertical scroll', type: 'property' },
  { label: 'scroll-ver', detail: 'vertical scroll', type: 'property' },
  { label: 'scroll-hor', detail: 'horizontal scroll', type: 'property' },
  { label: 'scroll-both', detail: 'both directions', type: 'property' },
  { label: 'clip', detail: 'overflow hidden', type: 'property' },
  // Hover
  { label: 'hover-bg', detail: 'hover background', type: 'property' },
  { label: 'hover-background', detail: 'hover background', type: 'property' },
  { label: 'hover-col', detail: 'hover color', type: 'property' },
  { label: 'hover-color', detail: 'hover color', type: 'property' },
  { label: 'hover-opacity', detail: 'hover opacity', type: 'property' },
  { label: 'hover-opa', detail: 'hover opacity', type: 'property' },
  { label: 'hover-scale', detail: 'hover scale', type: 'property' },
  { label: 'hover-bor', detail: 'hover border', type: 'property' },
  { label: 'hover-border', detail: 'hover border', type: 'property' },
  { label: 'hover-boc', detail: 'hover border color', type: 'property' },
  { label: 'hover-border-color', detail: 'hover border color', type: 'property' },
  { label: 'hover-rad', detail: 'hover radius', type: 'property' },
  { label: 'hover-radius', detail: 'hover radius', type: 'property' },
  // Animation
  { label: 'show', detail: 'show animation', type: 'property' },
  { label: 'hide', detail: 'hide animation', type: 'property' },
  { label: 'animate', detail: 'continuous animation', type: 'property' },
  // Special
  { label: 'focusable', detail: 'keyboard focusable', type: 'property' },
]

const mirrorKeywords = [
  // Primitives
  { label: 'frame', detail: 'div container', type: 'keyword' },
  { label: 'box', detail: 'div container', type: 'keyword' },
  { label: 'text', detail: 'span element', type: 'keyword' },
  { label: 'button', detail: 'button element', type: 'keyword' },
  { label: 'input', detail: 'input element', type: 'keyword' },
  { label: 'textarea', detail: 'textarea element', type: 'keyword' },
  { label: 'image', detail: 'img element', type: 'keyword' },
  { label: 'link', detail: 'anchor element', type: 'keyword' },
  { label: 'icon', detail: 'icon element', type: 'keyword' },
  { label: 'material', detail: 'material icon type', type: 'keyword' },
  // Structure
  { label: 'as', detail: 'inherit from', type: 'keyword' },
  { label: 'extends', detail: 'inherit from', type: 'keyword' },
  { label: 'named', detail: 'named instance', type: 'keyword' },
  { label: 'import', detail: 'import file', type: 'keyword' },
  // Conditionals
  { label: 'if', detail: 'condition', type: 'keyword' },
  { label: 'else', detail: 'else branch', type: 'keyword' },
  { label: 'then', detail: 'then value', type: 'keyword' },
  // Data
  { label: 'each', detail: 'iterate', type: 'keyword' },
  { label: 'in', detail: 'in collection', type: 'keyword' },
  { label: 'where', detail: 'filter', type: 'keyword' },
  { label: 'data', detail: 'data binding', type: 'keyword' },
  { label: 'selection', detail: 'selection binding', type: 'keyword' },
  // States
  { label: 'hover', detail: 'hover state', type: 'keyword' },
  { label: 'focus', detail: 'focus state', type: 'keyword' },
  { label: 'active', detail: 'active state', type: 'keyword' },
  { label: 'disabled', detail: 'disabled state', type: 'keyword' },
  { label: 'filled', detail: 'input has value', type: 'keyword' },
  { label: 'state', detail: 'custom state', type: 'keyword' },
  { label: 'selected', detail: 'selected state', type: 'keyword' },
  { label: 'highlighted', detail: 'highlighted state', type: 'keyword' },
  { label: 'expanded', detail: 'expanded state', type: 'keyword' },
  { label: 'collapsed', detail: 'collapsed state', type: 'keyword' },
  { label: 'valid', detail: 'valid state', type: 'keyword' },
  { label: 'invalid', detail: 'invalid state', type: 'keyword' },
  { label: 'default', detail: 'default state', type: 'keyword' },
  { label: 'inactive', detail: 'inactive state', type: 'keyword' },
  { label: 'on', detail: 'toggle on', type: 'keyword' },
  { label: 'off', detail: 'toggle off', type: 'keyword' },
  { label: 'closed', detail: 'initial closed', type: 'keyword' },
  { label: 'open', detail: 'initial open', type: 'keyword' },
  // Events
  { label: 'onclick', detail: 'click event', type: 'keyword' },
  { label: 'onclick-outside', detail: 'click outside event', type: 'keyword' },
  { label: 'onhover', detail: 'hover event', type: 'keyword' },
  { label: 'onfocus', detail: 'focus event', type: 'keyword' },
  { label: 'onblur', detail: 'blur event', type: 'keyword' },
  { label: 'onchange', detail: 'change event', type: 'keyword' },
  { label: 'oninput', detail: 'input event', type: 'keyword' },
  { label: 'onload', detail: 'load event', type: 'keyword' },
  { label: 'onkeydown', detail: 'keydown event', type: 'keyword' },
  { label: 'onkeyup', detail: 'keyup event', type: 'keyword' },
  { label: 'keys', detail: 'keyboard shortcuts', type: 'keyword' },
  // Timing
  { label: 'debounce', detail: 'delay until idle', type: 'keyword' },
  { label: 'delay', detail: 'delay action', type: 'keyword' },
  // Actions
  { label: 'toggle', detail: 'toggle visibility', type: 'keyword' },
  { label: 'show', detail: 'show element', type: 'keyword' },
  { label: 'hide', detail: 'hide element', type: 'keyword' },
  { label: 'open', detail: 'open overlay', type: 'keyword' },
  { label: 'close', detail: 'close overlay', type: 'keyword' },
  { label: 'page', detail: 'navigate to page', type: 'keyword' },
  { label: 'select', detail: 'select item', type: 'keyword' },
  { label: 'deselect', detail: 'deselect item', type: 'keyword' },
  { label: 'clear-selection', detail: 'clear all selections', type: 'keyword' },
  { label: 'highlight', detail: 'highlight item', type: 'keyword' },
  { label: 'filter', detail: 'filter list', type: 'keyword' },
  { label: 'change', detail: 'change state', type: 'keyword' },
  { label: 'activate', detail: 'activate element', type: 'keyword' },
  { label: 'deactivate', detail: 'deactivate element', type: 'keyword' },
  { label: 'deactivate-siblings', detail: 'deactivate siblings', type: 'keyword' },
  { label: 'toggle-state', detail: 'toggle state', type: 'keyword' },
  { label: 'assign', detail: 'assign variable', type: 'keyword' },
  { label: 'validate', detail: 'validate form', type: 'keyword' },
  { label: 'reset', detail: 'reset form', type: 'keyword' },
  { label: 'focus', detail: 'focus element', type: 'keyword' },
  { label: 'alert', detail: 'show alert', type: 'keyword' },
  { label: 'call', detail: 'call JS function', type: 'keyword' },
  // Targets
  { label: 'self', detail: 'current element', type: 'keyword' },
  { label: 'next', detail: 'next element', type: 'keyword' },
  { label: 'prev', detail: 'previous element', type: 'keyword' },
  { label: 'first', detail: 'first element', type: 'keyword' },
  { label: 'last', detail: 'last element', type: 'keyword' },
  { label: 'first-empty', detail: 'first empty element', type: 'keyword' },
  { label: 'highlighted', detail: 'highlighted element', type: 'keyword' },
  { label: 'selected', detail: 'selected element', type: 'keyword' },
  { label: 'self-and-before', detail: 'self and all before', type: 'keyword' },
  { label: 'all', detail: 'all elements', type: 'keyword' },
  { label: 'none', detail: 'no element', type: 'keyword' },
  // Animation keywords
  { label: 'fade', detail: 'fade animation', type: 'keyword' },
  { label: 'scale', detail: 'scale animation', type: 'keyword' },
  { label: 'slide-up', detail: 'slide up', type: 'keyword' },
  { label: 'slide-down', detail: 'slide down', type: 'keyword' },
  { label: 'slide-left', detail: 'slide left', type: 'keyword' },
  { label: 'slide-right', detail: 'slide right', type: 'keyword' },
  { label: 'spin', detail: 'spin animation', type: 'keyword' },
  { label: 'pulse', detail: 'pulse animation', type: 'keyword' },
  { label: 'bounce', detail: 'bounce animation', type: 'keyword' },
  // Overlay positions
  { label: 'below', detail: 'position below', type: 'keyword' },
  { label: 'above', detail: 'position above', type: 'keyword' },
]

const allCompletions = [...mirrorProperties, ...mirrorKeywords]

// Property values - suggestions for specific properties
const propertyValues = {
  // Sizing
  'width': [
    { label: 'hug', detail: 'fit-content' },
    { label: 'full', detail: '100% + flex-grow' },
  ],
  'w': [
    { label: 'hug', detail: 'fit-content' },
    { label: 'full', detail: '100% + flex-grow' },
  ],
  'height': [
    { label: 'hug', detail: 'fit-content' },
    { label: 'full', detail: '100% + flex-grow' },
  ],
  'h': [
    { label: 'hug', detail: 'fit-content' },
    { label: 'full', detail: '100% + flex-grow' },
  ],
  'size': [
    { label: 'hug', detail: 'fit-content' },
    { label: 'full', detail: '100% + flex-grow' },
  ],
  // Text alignment
  'text-align': [
    { label: 'left', detail: 'align left' },
    { label: 'center', detail: 'align center' },
    { label: 'right', detail: 'align right' },
  ],
  // Flex alignment
  'align': [
    { label: 'top', detail: 'align top' },
    { label: 'bottom', detail: 'align bottom' },
    { label: 'left', detail: 'align left' },
    { label: 'right', detail: 'align right' },
    { label: 'center', detail: 'align center' },
    { label: 'ver-center', detail: 'vertical center' },
    { label: 'hor-center', detail: 'horizontal center' },
  ],
  // Shadow
  'shadow': [
    { label: 'sm', detail: 'small shadow' },
    { label: 'md', detail: 'medium shadow' },
    { label: 'lg', detail: 'large shadow' },
  ],
  // Cursor
  'cursor': [
    { label: 'pointer', detail: 'hand cursor' },
    { label: 'default', detail: 'default cursor' },
    { label: 'text', detail: 'text cursor' },
    { label: 'move', detail: 'move cursor' },
    { label: 'not-allowed', detail: 'not allowed' },
    { label: 'grab', detail: 'grab cursor' },
    { label: 'grabbing', detail: 'grabbing cursor' },
  ],
  // Weight
  'weight': [
    { label: '400', detail: 'normal' },
    { label: '500', detail: 'medium' },
    { label: '600', detail: 'semi-bold' },
    { label: '700', detail: 'bold' },
    { label: 'bold', detail: 'bold' },
  ],
  // Font
  'font': [
    { label: 'monospace', detail: 'monospace font' },
    { label: 'sans-serif', detail: 'sans-serif font' },
    { label: 'serif', detail: 'serif font' },
  ],
  // Border style
  'bor': [
    { label: 'solid', detail: 'solid line' },
    { label: 'dashed', detail: 'dashed line' },
    { label: 'dotted', detail: 'dotted line' },
  ],
  'border': [
    { label: 'solid', detail: 'solid line' },
    { label: 'dashed', detail: 'dashed line' },
    { label: 'dotted', detail: 'dotted line' },
  ],
}

function mirrorCompletions(context) {
  const word = context.matchBefore(/[\w-]*/)
  const from = word ? word.from : context.pos
  const typed = word ? word.text.toLowerCase() : ''

  // Get text before the current word
  const line = context.state.doc.lineAt(context.pos)
  const textBefore = line.text.slice(0, from - line.from)

  // Check if we're after "state " - show state names
  const stateMatch = textBefore.match(/\bstate\s+$/)
  if (stateMatch) {
    const stateNames = [
      { label: 'hover', info: 'Mouse over element' },
      { label: 'focus', info: 'Element has focus' },
      { label: 'active', info: 'Element is active/pressed' },
      { label: 'disabled', info: 'Element is disabled' },
      { label: 'filled', info: 'Input has value' },
      { label: 'highlighted', info: 'Element is highlighted' },
      { label: 'selected', info: 'Element is selected' },
      { label: 'expanded', info: 'Element is expanded' },
      { label: 'collapsed', info: 'Element is collapsed' },
      { label: 'valid', info: 'Input is valid' },
      { label: 'invalid', info: 'Input is invalid' },
      { label: 'on', info: 'Toggle is on' },
      { label: 'off', info: 'Toggle is off' },
      { label: 'default', info: 'Default state' },
      { label: 'inactive', info: 'Element is inactive' },
    ]
    let options = stateNames.map(s => ({ ...s, type: 'keyword' }))
    if (typed) {
      options = options.filter(s => s.label.startsWith(typed))
    }
    return {
      from,
      options,
      validFor: /^[\w-]*$/
    }
  }

  // Check if we're typing a slot name (indented, starts with capital letter)
  // Example: under "Card" instance, typing "Ti" should suggest "Title" slot
  const slotMatch = textBefore.match(/^\s+$/) && typed.match(/^[A-Z]/)
  if (slotMatch) {
    const parentComponent = findParentComponent(context.state.doc, context.pos)
    if (parentComponent) {
      const componentSlots = extractComponentSlots(context.state.doc)
      const slots = componentSlots[parentComponent] || []
      if (slots.length > 0) {
        let options = slots.map(s => ({
          label: s,
          type: 'class',
          info: `Slot of ${parentComponent}`
        }))
        if (typed) {
          options = options.filter(s => s.label.toLowerCase().startsWith(typed.toLowerCase()))
        }
        if (options.length > 0) {
          return {
            from,
            options,
            validFor: /^[A-Za-z0-9]*$/
          }
        }
      }
    }
  }

  // Check if we're in a value context (after a property name)
  const valueMatch = textBefore.match(/\b([\w-]+)\s+$/)
  if (valueMatch) {
    const propName = valueMatch[1].toLowerCase()
    const values = propertyValues[propName]
    if (values) {
      let options = values.map(v => ({ ...v, type: 'constant' }))
      if (typed) {
        options = options.filter(v => v.label.toLowerCase().startsWith(typed))
      }
      if (options.length > 0) {
        return {
          from,
          options,
          validFor: /^[\w-]*$/
        }
      }
    }
  }

  // Smart triggering: only complete in property context
  // Property autocomplete ONLY after:
  // - Comma (with optional space): "bg #fff, " → new property
  // - Component name (first property): "Box " → first property
  // - Colon (definition start): "Button: " → first property in definition
  // - Indented line start: "  " → nested property
  // NOT after "property space" - that's value context!
  const isAfterComma = textBefore.match(/,\s*$/)
  const isAfterColon = textBefore.match(/:\s*$/)
  const isIndentedStart = textBefore.match(/^\s+$/)
  const isAfterComponentName = textBefore.match(/^[A-Z]\w*\s+$/) || textBefore.match(/^\s+[A-Z]\w*\s+$/)

  const isPropertyContext = isAfterComma || isAfterColon || isIndentedStart || isAfterComponentName

  // If not in property context, don't show property completions
  // (unless explicitly triggered with Ctrl+Space)
  if (!isPropertyContext && !context.explicit) {
    return null
  }

  // Filter completions based on what's typed
  let options = allCompletions
  if (typed) {
    // Match prefix or fuzzy match for longer typed strings
    options = allCompletions.filter(c => {
      const label = c.label.toLowerCase()
      return label.startsWith(typed) || label.includes(typed)
    })
    // Prioritize prefix matches
    options.sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(typed)
      const bStarts = b.label.toLowerCase().startsWith(typed)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })
  }

  // Don't show empty completion list
  if (options.length === 0) {
    return null
  }

  return {
    from,
    options: options.slice(0, 25),
    validFor: /^[\w-]*$/
  }
}

// ==========================================
// Color Picker Setup (before editor)
// ==========================================

// Open Color - cleaner palette with single gray scale
const OPEN_COLORS = [
  { name: 'gray', shades: ['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529'] },
  { name: 'red', shades: ['#fff5f5', '#ffe3e3', '#ffc9c9', '#ffa8a8', '#ff8787', '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a'] },
  { name: 'pink', shades: ['#fff0f6', '#ffdeeb', '#fcc2d7', '#faa2c1', '#f783ac', '#f06595', '#e64980', '#d6336c', '#c2255c', '#a61e4d'] },
  { name: 'grape', shades: ['#f8f0fc', '#f3d9fa', '#eebefa', '#e599f7', '#da77f2', '#cc5de8', '#be4bdb', '#ae3ec9', '#9c36b5', '#862e9c'] },
  { name: 'violet', shades: ['#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4'] },
  { name: 'indigo', shades: ['#edf2ff', '#dbe4ff', '#bac8ff', '#91a7ff', '#748ffc', '#5c7cfa', '#4c6ef5', '#4263eb', '#3b5bdb', '#364fc7'] },
  { name: 'blue', shades: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab'] },
  { name: 'cyan', shades: ['#e3fafc', '#c5f6fa', '#99e9f2', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#1098ad', '#0c8599', '#0b7285'] },
  { name: 'teal', shades: ['#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9', '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b'] },
  { name: 'green', shades: ['#ebfbee', '#d3f9d8', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e'] },
  { name: 'lime', shades: ['#f4fce3', '#e9fac8', '#d8f5a2', '#c0eb75', '#a9e34b', '#94d82d', '#82c91e', '#74b816', '#66a80f', '#5c940d'] },
  { name: 'yellow', shades: ['#fff9db', '#fff3bf', '#ffec99', '#ffe066', '#ffd43b', '#fcc419', '#fab005', '#f59f00', '#f08c00', '#e67700'] },
  { name: 'orange', shades: ['#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', '#ffa94d', '#ff922b', '#fd7e14', '#f76707', '#e8590c', '#d9480f'] },
]

const colorPicker = document.getElementById('color-picker')
const colorPickerGrid = document.getElementById('color-picker-grid')
const colorPreview = document.getElementById('color-preview')
const colorHex = document.getElementById('color-hex')
let colorPickerVisible = false
let colorPickerInsertPos = null
let colorPickerReplaceRange = null // { from, to } for replacing existing colors

// Hash trigger state (for typing # to open color picker)
let hashTriggerActive = false
let hashTriggerStartPos = null
let selectedSwatchIndex = 0
let colorSwatchElements = []
const SWATCH_COLUMNS = 13  // Number of color columns in grid
const SWATCH_ROWS = 10    // Number of shades per color

// Build the color grid
function buildColorGrid() {
  colorPickerGrid.innerHTML = ''
  colorSwatchElements = []
  let swatchIndex = 0
  OPEN_COLORS.forEach((scale, colIndex) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex, rowIndex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.dataset.index = swatchIndex
      btn.dataset.col = colIndex
      btn.dataset.row = rowIndex
      colorSwatchElements.push(btn)
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
        if (hashTriggerActive) {
          selectedSwatchIndex = parseInt(btn.dataset.index)
          updateSelectedSwatch()
        }
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
      swatchIndex++
    })
    colorPickerGrid.appendChild(col)
  })
}
buildColorGrid()

function showColorPicker(x, y, insertPos, replaceRange = null, initialColor = null, isHashTrigger = false, hashStartPos = null) {
  colorPickerInsertPos = insertPos
  colorPickerReplaceRange = replaceRange
  hashTriggerActive = isHashTrigger
  hashTriggerStartPos = hashStartPos
  colorPicker.style.left = x + 'px'
  colorPicker.style.top = y + 'px'
  colorPicker.classList.add('visible')
  colorPickerVisible = true
  const displayColor = initialColor || '#3b82f6'
  colorPreview.style.backgroundColor = displayColor
  colorHex.textContent = displayColor.toUpperCase()

  // Reset and show selection for hash trigger mode
  if (isHashTrigger) {
    // Start selection at blue-500 (#3b82f6) which is column 4 (blue), row 5 (500)
    selectedSwatchIndex = 4 * SWATCH_ROWS + 5
    updateSelectedSwatch()
  } else {
    // Clear selection for non-hash mode
    colorSwatchElements.forEach(el => el.classList.remove('selected'))
  }
}

function hideColorPicker() {
  colorPicker.classList.remove('visible')
  colorPickerVisible = false
  colorPickerInsertPos = null
  colorPickerReplaceRange = null
  hashTriggerActive = false
  hashTriggerStartPos = null
  colorSwatchElements.forEach(el => el.classList.remove('selected'))
}

// Update selected swatch highlight
function updateSelectedSwatch() {
  colorSwatchElements.forEach((el, i) => {
    el.classList.toggle('selected', i === selectedSwatchIndex)
  })

  const selected = colorSwatchElements[selectedSwatchIndex]
  if (selected) {
    const hex = selected.dataset.color
    colorPreview.style.backgroundColor = hex
    colorHex.textContent = hex.toUpperCase()
  }
}

// Navigate through swatches with arrow keys
function navigateSwatches(direction) {
  const currentCol = Math.floor(selectedSwatchIndex / SWATCH_ROWS)
  const currentRow = selectedSwatchIndex % SWATCH_ROWS

  let newCol = currentCol
  let newRow = currentRow

  switch (direction) {
    case 'left':
      newCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      newCol = Math.min(SWATCH_COLUMNS - 1, currentCol + 1)
      break
    case 'up':
      newRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      newRow = Math.min(SWATCH_ROWS - 1, currentRow + 1)
      break
  }

  selectedSwatchIndex = newCol * SWATCH_ROWS + newRow
  updateSelectedSwatch()
}

function selectColor(hex) {
  if (window.editor) {
    if (hashTriggerActive && hashTriggerStartPos !== null) {
      // Hash trigger mode: replace from # position to current cursor
      const cursorPos = window.editor.state.selection.main.head
      const newCursorPos = hashTriggerStartPos + hex.length
      window.editor.dispatch({
        changes: { from: hashTriggerStartPos, to: cursorPos, insert: hex },
        selection: { anchor: newCursorPos }
      })
    } else if (colorPickerReplaceRange) {
      // Replace existing color
      const newCursorPos = colorPickerReplaceRange.from + hex.length
      window.editor.dispatch({
        changes: { from: colorPickerReplaceRange.from, to: colorPickerReplaceRange.to, insert: hex },
        selection: { anchor: newCursorPos }
      })
    } else if (colorPickerInsertPos !== null) {
      // Insert new color
      const newCursorPos = colorPickerInsertPos + hex.length
      window.editor.dispatch({
        changes: { from: colorPickerInsertPos, to: colorPickerInsertPos, insert: hex },
        selection: { anchor: newCursorPos }
      })
    }
    window.editor.focus()
  }
  hideColorPicker()
}

// Close on escape or click outside
// Note: Hash trigger mode handles Escape in hashColorKeyboardExtension (removes # char)
document.addEventListener('keydown', (e) => {
  if (colorPickerVisible && e.key === 'Escape' && !hashTriggerActive) {
    hideColorPicker()
    if (window.editor) window.editor.focus()
  }
})

document.addEventListener('mousedown', (e) => {
  if (colorPickerVisible && !colorPicker.contains(e.target)) {
    hideColorPicker()
  }
})

// ==========================================
// Token Panel Setup
// ==========================================

const tokenPanel = document.getElementById('token-panel')
const tokenPanelTokens = document.getElementById('token-panel-tokens')
const tokenPanelPicker = document.getElementById('token-panel-picker')
const tokenList = document.getElementById('token-list')
const tokenColorGrid = document.getElementById('token-color-grid')

let tokenPanelVisible = false
let tokenPanelInsertPos = null
let tokenPanelProperty = null
let selectedTokenIndex = 0
let currentTokens = []
let dollarTriggerActive = false  // True when triggered by $ (token already has $ prefix typed)

// Property → suffix mapping
const PROPERTY_SUFFIXES = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  pad: '.pad',
  padding: '.pad',
  gap: '.gap',
  margin: '.margin',
  rad: '.rad',
  radius: '.rad',
}

// Property → panel type mapping
const PROPERTY_PANELS = {
  bg: 'color',
  background: 'color',
  col: 'color',
  color: 'color',
  boc: 'color',
  'border-color': 'color',
  'hover-bg': 'color',
  'hover-col': 'color',
  'hover-boc': 'color',
  pad: 'spacing',
  padding: 'spacing',
  gap: 'spacing',
  margin: 'spacing',
  rad: 'spacing',
  radius: 'spacing',
}

// Extract tokens from document
function extractTokensFromDoc(doc) {
  const text = doc.toString()
  const tokens = []
  const lines = text.split('\n')

  for (const line of lines) {
    // Match: name: value (token definition)
    // Examples: primary: #3B82F6, sm.pad: 4, surface.bg: #1a1a23
    const match = line.match(/^\s*([a-zA-Z][a-zA-Z0-9.-]*):\s*(#[0-9A-Fa-f]{3,8}|\d+)/)
    if (match) {
      const name = match[1]
      const value = match[2]
      const isColor = value.startsWith('#')
      tokens.push({
        name,
        value,
        type: isColor ? 'color' : 'spacing'
      })
    }
  }

  return tokens
}

// Extract component definitions and their slots from document
// Returns: { ComponentName: ['Slot1', 'Slot2'], ... }
function extractComponentSlots(doc) {
  const text = doc.toString()
  const lines = text.split('\n')
  const components = {}
  let currentComponent = null
  let currentIndent = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Component definition: "Name:" or "Name: props" at start of line
    const defMatch = line.match(/^([A-Z][a-zA-Z0-9]*)\s*:/)
    if (defMatch) {
      currentComponent = defMatch[1]
      currentIndent = 0
      if (!components[currentComponent]) {
        components[currentComponent] = []
      }
      continue
    }

    // Slot definition: indented "SlotName:" under a component
    if (currentComponent) {
      const slotMatch = line.match(/^(\s+)([A-Z][a-zA-Z0-9]*)\s*:/)
      if (slotMatch) {
        const indent = slotMatch[1].length
        const slotName = slotMatch[2]
        // Only add direct children (same or lower indent level resets)
        if (indent > 0) {
          if (!components[currentComponent].includes(slotName)) {
            components[currentComponent].push(slotName)
          }
        }
      }
      // Reset component context if we hit a non-indented line
      if (line.match(/^\S/) && !defMatch) {
        currentComponent = null
      }
    }
  }

  return components
}

// Find parent component for current cursor position
function findParentComponent(doc, pos) {
  const lines = doc.toString().split('\n')
  const lineInfo = doc.lineAt(pos)
  const currentLineNum = lineInfo.number - 1  // 0-indexed
  const currentLine = lineInfo.text

  // Get current indentation
  const currentIndent = currentLine.match(/^(\s*)/)[1].length

  // If not indented, no parent
  if (currentIndent === 0) return null

  // Search backwards for parent component instance
  for (let i = currentLineNum - 1; i >= 0; i--) {
    const line = lines[i]
    const lineIndent = line.match(/^(\s*)/)[1].length

    // Found a less indented line - check if it's a component instance
    if (lineIndent < currentIndent) {
      // Component instance: "ComponentName" or "ComponentName props"
      const instanceMatch = line.match(/^\s*([A-Z][a-zA-Z0-9]*)(?:\s|$)/)
      if (instanceMatch) {
        return instanceMatch[1]
      }
      // If it's a definition (has :), keep searching
      if (!line.includes(':')) {
        return null
      }
    }
  }

  return null
}

// Filter tokens by suffix
function filterTokensBySuffix(tokens, suffix) {
  if (!suffix) return tokens
  return tokens.filter(t => t.name.endsWith(suffix))
}

// Filter tokens by type
function filterTokensByType(tokens, type) {
  return tokens.filter(t => t.type === type)
}

// Build token color grid
function buildTokenColorGrid() {
  tokenColorGrid.innerHTML = ''
  OPEN_COLORS.forEach(scale => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach(hex => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectTokenValue(hex.toUpperCase())
      })
      col.appendChild(btn)
    })
    tokenColorGrid.appendChild(col)
  })
}
buildTokenColorGrid()

// Render token list
function renderTokenList(tokens) {
  currentTokens = tokens
  tokenList.innerHTML = ''

  if (tokens.length === 0) {
    tokenPanelTokens.style.display = 'none'
    return
  }

  tokenPanelTokens.style.display = 'block'

  tokens.forEach((token, index) => {
    const item = document.createElement('div')
    item.className = 'token-item'
    if (index === selectedTokenIndex) item.classList.add('selected')
    item.dataset.index = index

    // Color swatch for color tokens
    if (token.type === 'color') {
      const swatch = document.createElement('div')
      swatch.className = 'token-swatch'
      swatch.style.backgroundColor = token.value
      item.appendChild(swatch)
    }

    const name = document.createElement('span')
    name.className = 'token-name'
    name.textContent = '$' + token.name
    item.appendChild(name)

    const value = document.createElement('span')
    value.className = 'token-value'
    value.textContent = token.value
    item.appendChild(value)

    item.addEventListener('click', () => {
      selectTokenValue('$' + token.name)
    })

    item.addEventListener('mouseenter', () => {
      selectedTokenIndex = index
      updateSelectedToken()
    })

    tokenList.appendChild(item)
  })
}

// Update selected token highlight
function updateSelectedToken() {
  const items = tokenList.querySelectorAll('.token-item')
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === selectedTokenIndex)
  })

  const selected = items[selectedTokenIndex]
  if (selected) {
    selected.scrollIntoView({ block: 'nearest' })
  }
}

// Show token panel
// isDollarTrigger: true when user typed $ (so we insert token name without $ prefix)
function showTokenPanel(x, y, insertPos, property, isDollarTrigger = false) {
  tokenPanelInsertPos = insertPos
  tokenPanelProperty = property
  dollarTriggerActive = isDollarTrigger
  selectedTokenIndex = 0

  // Get tokens from document
  const allTokens = extractTokensFromDoc(window.editor.state.doc)

  let filteredTokens
  if (property) {
    // Filter by suffix first
    const suffix = PROPERTY_SUFFIXES[property]
    filteredTokens = filterTokensBySuffix(allTokens, suffix)

    // If no suffix matches, filter by type
    if (filteredTokens.length === 0) {
      const panelType = PROPERTY_PANELS[property]
      filteredTokens = filterTokensByType(allTokens, panelType)
    }
  } else {
    // No property context (e.g., $name: $) - show all tokens
    filteredTokens = allTokens
  }

  renderTokenList(filteredTokens)

  // Show/hide color picker section based on property type
  const panelType = PROPERTY_PANELS[property]
  if (panelType === 'color' && !isDollarTrigger) {
    // Only show color picker for space trigger, not $ trigger
    tokenPanelPicker.style.display = 'block'
  } else {
    tokenPanelPicker.style.display = 'none'
  }

  // Position and show panel
  tokenPanel.style.left = x + 'px'
  tokenPanel.style.top = y + 'px'
  tokenPanel.classList.add('visible')
  tokenPanelVisible = true
}

// Hide token panel
function hideTokenPanel() {
  tokenPanel.classList.remove('visible')
  tokenPanelVisible = false
  tokenPanelInsertPos = null
  tokenPanelProperty = null
  dollarTriggerActive = false
}

// Select a token or color value
function selectTokenValue(value) {
  if (window.editor && tokenPanelInsertPos !== null) {
    // If dollar trigger is active, value already starts with $
    // and user has already typed $, so we insert without the $ prefix
    let insertValue = value
    if (dollarTriggerActive && value.startsWith('$')) {
      insertValue = value.slice(1)  // Remove $ prefix since user already typed it
    }
    const newCursorPos = tokenPanelInsertPos + insertValue.length
    window.editor.dispatch({
      changes: { from: tokenPanelInsertPos, to: tokenPanelInsertPos, insert: insertValue },
      selection: { anchor: newCursorPos }
    })
    window.editor.focus()
  }
  hideTokenPanel()
}

// Keyboard navigation for token panel
const tokenPanelKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (!tokenPanelVisible) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (currentTokens.length > 0) {
          selectedTokenIndex = Math.min(selectedTokenIndex + 1, currentTokens.length - 1)
          updateSelectedToken()
        }
        return true
      case 'ArrowUp':
        event.preventDefault()
        if (currentTokens.length > 0) {
          selectedTokenIndex = Math.max(selectedTokenIndex - 1, 0)
          updateSelectedToken()
        }
        return true
      case 'Enter':
        event.preventDefault()
        if (currentTokens[selectedTokenIndex]) {
          selectTokenValue('$' + currentTokens[selectedTokenIndex].name)
        }
        return true
      case 'Escape':
        event.preventDefault()
        hideTokenPanel()
        return true
    }
    return false
  }
})

// Close token panel on click outside
document.addEventListener('mousedown', (e) => {
  if (tokenPanelVisible && !tokenPanel.contains(e.target)) {
    hideTokenPanel()
  }
})

// Close token panel on escape
document.addEventListener('keydown', (e) => {
  if (tokenPanelVisible && e.key === 'Escape') {
    hideTokenPanel()
    if (window.editor) window.editor.focus()
  }
})

// Token panel trigger extension
// Triggers on:
// 1. Space after spacing properties (pad, gap, etc.) - shows token panel
// 2. $ after any property (bg, col, pad, etc.) - shows token panel with $ prefix
// 3. $ after token definition ($name: $) - shows all tokens
const tokenPanelTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // Close panel if typing (not navigation keys, not $ which we handle)
    if (tokenPanelVisible && insertedText.length > 0 && insertedText !== ' ' && insertedText !== '$') {
      hideTokenPanel()
      return
    }

    const line = update.view.state.doc.lineAt(fromB)
    const textBefore = line.text.slice(0, fromB - line.from)

    // Trigger 1: Space after spacing properties
    if (insertedText === ' ') {
      // Match ONLY spacing properties (color properties use # trigger)
      const propertyMatch = textBefore.match(/\b(pad|padding|gap|margin|rad|radius)$/)
      if (propertyMatch) {
        const property = propertyMatch[1]
        const coords = update.view.coordsAtPos(fromB)
        if (coords) {
          showTokenPanel(coords.left, coords.bottom + 4, fromB + 1, property)
        }
      }
    }

    // Trigger 2: $ after property (includes color properties)
    if (insertedText === '$') {
      // Match any property that accepts tokens
      const propertyMatch = textBefore.match(/\b(bg|background|col|color|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)\s+$/)

      // Match token definition: $name: $
      const tokenDefMatch = textBefore.match(/\$[\w.-]+:\s*$/)

      if (propertyMatch || tokenDefMatch) {
        // Close color picker if open
        if (colorPickerVisible) {
          hideColorPicker()
        }
        const property = propertyMatch ? propertyMatch[1] : null
        const coords = update.view.coordsAtPos(fromB)
        if (coords) {
          // Insert position is after the $
          showTokenPanel(coords.left, coords.bottom + 4, fromB, property, true)
        }
      }
    }
  })
})

// Double-click on color extension (standalone color picker for editing existing colors)
const colorDoubleClickExtension = EditorView.domEventHandlers({
  dblclick: (event, view) => {
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false

    const line = view.state.doc.lineAt(pos)
    const lineText = line.text

    // Find all hex colors in the line
    const hexRegex = /#[0-9A-Fa-f]{3,8}\b/g
    let match
    while ((match = hexRegex.exec(lineText)) !== null) {
      const colorStart = line.from + match.index
      const colorEnd = colorStart + match[0].length

      // Check if click position is within this color
      if (pos >= colorStart && pos <= colorEnd) {
        const coords = view.coordsAtPos(colorStart)
        if (coords) {
          event.preventDefault()
          showColorPicker(
            coords.left,
            coords.bottom + 4,
            null,
            { from: colorStart, to: colorEnd },
            match[0]
          )
          return true
        }
      }
    }
    return false
  }
})

// Hash trigger extension: show color picker when typing # after color properties
const hashColorTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return

  // Check if hash trigger mode should be closed due to # being deleted
  if (hashTriggerActive && colorPickerVisible && hashTriggerStartPos !== null) {
    const doc = update.state.doc
    const cursorPos = update.state.selection.main.head

    // Check if cursor moved before # position (user deleted it)
    if (cursorPos < hashTriggerStartPos) {
      hideColorPicker()
      return
    }

    // Check if # character still exists at hashTriggerStartPos
    if (hashTriggerStartPos < doc.length) {
      const charAtStart = doc.sliceString(hashTriggerStartPos, hashTriggerStartPos + 1)
      if (charAtStart !== '#') {
        hideColorPicker()
        return
      }
    } else {
      // Document is shorter than hashTriggerStartPos, # was deleted
      hideColorPicker()
      return
    }
  }

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // Close color picker if typing space or non-hex characters while in hash trigger mode
    if (hashTriggerActive && insertedText.length > 0) {
      // Close on space, letters (except hex a-f), or other non-hex characters
      if (!/^[0-9A-Fa-f]$/.test(insertedText)) {
        hideColorPicker()
        return
      }
    }

    // Detect # typed after color properties or token definitions
    if (insertedText === '#') {
      const line = update.view.state.doc.lineAt(fromB)
      const textBefore = line.text.slice(0, fromB - line.from)

      // Match color contexts:
      // 1. Color property + space: "bg ", "col ", "color ", etc.
      // 2. Token definition with color suffix: "$name.bg: ", "$name.col: "
      // 3. Simple token definition: "$name: " (any token could be a color)
      const colorPropertyMatch = textBefore.match(/\b(bg|col|color|background|boc|border-color|hover-bg|hover-col|hover-boc)\s+$/)
      const tokenColorMatch = textBefore.match(/\$[\w.-]+\.(bg|col|color|boc):\s*$/)
      const simpleTokenMatch = textBefore.match(/\$[\w.-]+:\s*$/)

      if (colorPropertyMatch || tokenColorMatch || simpleTokenMatch) {
        // Close token panel if open (since we're showing color picker instead)
        if (tokenPanelVisible) {
          hideTokenPanel()
        }
        const coords = update.view.coordsAtPos(fromB)
        if (coords) {
          // Show color picker in hash trigger mode
          showColorPicker(
            coords.left,
            coords.bottom + 4,
            null,   // insertPos not used for hash trigger
            null,   // replaceRange not used for hash trigger
            null,   // initialColor
            true,   // isHashTrigger
            fromB   // hashStartPos (position of #)
          )
        }
      }
      // If no match, do NOT show color picker
    }
  })
})

// Keyboard extension for color picker navigation in hash trigger mode
const hashColorKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (!hashTriggerActive || !colorPickerVisible) return false

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        navigateSwatches('left')
        return true
      case 'ArrowRight':
        event.preventDefault()
        navigateSwatches('right')
        return true
      case 'ArrowUp':
        event.preventDefault()
        navigateSwatches('up')
        return true
      case 'ArrowDown':
        event.preventDefault()
        navigateSwatches('down')
        return true
      case 'Enter':
        event.preventDefault()
        const selected = colorSwatchElements[selectedSwatchIndex]
        if (selected) {
          selectColor(selected.dataset.color.toUpperCase())
        }
        return true
      case 'Escape':
        event.preventDefault()
        // Remove the # character when escaping
        if (hashTriggerStartPos !== null) {
          const cursorPos = view.state.selection.main.head
          view.dispatch({
            changes: { from: hashTriggerStartPos, to: cursorPos, insert: '' },
            selection: { anchor: hashTriggerStartPos }
          })
        }
        hideColorPicker()
        return true
    }
    return false
  }
})

// ==========================================
// Icon Picker Setup
// ==========================================

const iconPicker = document.getElementById('icon-picker')
const iconPickerGrid = document.getElementById('icon-picker-grid')
const iconPickerRecentSection = document.getElementById('icon-picker-recent')
const iconPickerRecentGrid = document.getElementById('icon-picker-recent-grid')

let iconPickerVisible = false
let iconPickerStartPos = null  // Position where icon name starts
let allIcons = []              // All icon names
let filteredIcons = []         // Currently filtered icons
let selectedIconIndex = 0      // Currently selected icon
let iconSvgCache = new Map()   // Cache for loaded SVGs
let componentPrimitives = new Map()  // Map: componentName -> primitive
window.componentPrimitives = componentPrimitives  // Expose for debugging

const ICON_STORAGE_KEY = 'mirror-recent-icons'
const MAX_RECENT_ICONS = 12

// Load recent icons from localStorage
function getRecentIcons() {
  try {
    const stored = localStorage.getItem(ICON_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save recent icons to localStorage
function saveRecentIcons(icons) {
  localStorage.setItem(ICON_STORAGE_KEY, JSON.stringify(icons.slice(0, MAX_RECENT_ICONS)))
}

// Add icon to recent list
function addToRecentIcons(iconName) {
  const recent = getRecentIcons().filter(i => i !== iconName)
  recent.unshift(iconName)
  saveRecentIcons(recent)
}

// Load icon list from CDN
async function loadIconList() {
  try {
    const res = await fetch('https://unpkg.com/@iconify-json/lucide/icons.json')
    const data = await res.json()
    allIcons = Object.keys(data.icons).sort()
    console.log(`Loaded ${allIcons.length} Lucide icons`)
    return allIcons
  } catch (err) {
    console.error('Failed to load icon list:', err)
    iconPickerGrid.innerHTML = '<div class="icon-picker-empty">Icons konnten nicht geladen werden</div>'
    return []
  }
}

// Load single icon SVG
async function loadIconSvg(name) {
  if (iconSvgCache.has(name)) {
    return iconSvgCache.get(name)
  }
  try {
    const res = await fetch(`https://unpkg.com/lucide-static/icons/${name}.svg`)
    if (!res.ok) return null
    const svg = await res.text()
    iconSvgCache.set(name, svg)
    return svg
  } catch {
    return null
  }
}

// Create icon button element
function createIconButton(name, index, isRecent = false) {
  const btn = document.createElement('button')
  btn.className = 'icon-item'
  btn.dataset.icon = name
  btn.dataset.index = index
  btn.title = name

  // Load SVG async
  loadIconSvg(name).then(svg => {
    if (svg) {
      btn.innerHTML = svg
    } else {
      btn.textContent = '?'
    }
  })

  btn.addEventListener('click', (e) => {
    e.preventDefault()
    selectIcon(name)
  })

  btn.addEventListener('mouseenter', () => {
    if (!isRecent) {
      selectedIconIndex = index
      updateSelectedIcon()
    }
  })

  return btn
}

// Render icon grid
function renderIconGrid(icons, filter = '') {
  filteredIcons = filter
    ? icons.filter(name => name.includes(filter.toLowerCase()))
    : icons

  iconPickerGrid.innerHTML = ''

  if (filteredIcons.length === 0) {
    iconPickerGrid.innerHTML = '<div class="icon-picker-empty">Keine Icons gefunden</div>'
    return
  }

  // Limit to first 144 icons (12x12) for performance
  const displayIcons = filteredIcons.slice(0, 144)

  displayIcons.forEach((name, index) => {
    iconPickerGrid.appendChild(createIconButton(name, index))
  })

  selectedIconIndex = 0
  updateSelectedIcon()
}

// Render recent icons
function renderRecentIcons() {
  const recent = getRecentIcons()

  if (recent.length === 0) {
    iconPickerRecentSection.style.display = 'none'
    return
  }

  iconPickerRecentSection.style.display = 'block'
  iconPickerRecentGrid.innerHTML = ''

  recent.forEach((name, index) => {
    iconPickerRecentGrid.appendChild(createIconButton(name, index, true))
  })
}

// Update selected icon highlight
function updateSelectedIcon() {
  const items = iconPickerGrid.querySelectorAll('.icon-item')
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === selectedIconIndex)
  })

  // Scroll into view if needed
  const selected = items[selectedIconIndex]
  if (selected) {
    selected.scrollIntoView({ block: 'nearest' })
  }
}

// Show icon picker
function showIconPicker(x, y, startPos) {
  // Close CodeMirror autocomplete if open
  if (window.editor) {
    closeCompletion(window.editor)
  }

  iconPickerStartPos = startPos
  iconPicker.style.left = x + 'px'
  iconPicker.style.top = y + 'px'
  iconPicker.classList.add('visible')
  iconPickerVisible = true

  renderRecentIcons()
  renderIconGrid(allIcons)
}

// Hide icon picker
function hideIconPicker() {
  iconPicker.classList.remove('visible')
  iconPickerVisible = false
  iconPickerStartPos = null
}

// Select an icon and insert it
function selectIcon(name) {
  if (!window.editor || iconPickerStartPos === null) return

  addToRecentIcons(name)

  // Get current position to find typed text
  const cursorPos = window.editor.state.selection.main.head
  const typedLength = cursorPos - iconPickerStartPos

  // Replace typed text with quoted icon name
  const insertText = `"${name}"`
  window.editor.dispatch({
    changes: { from: iconPickerStartPos, to: cursorPos, insert: insertText },
    selection: { anchor: iconPickerStartPos + insertText.length }
  })

  hideIconPicker()
  window.editor.focus()
}

// Filter icons based on current input
function filterIcons(text) {
  renderIconGrid(allIcons, text)
}

// Navigate icon selection
function navigateIcons(direction) {
  const cols = 12
  const total = Math.min(filteredIcons.length, 144)

  if (direction === 'down') {
    selectedIconIndex = Math.min(selectedIconIndex + cols, total - 1)
  } else if (direction === 'up') {
    selectedIconIndex = Math.max(selectedIconIndex - cols, 0)
  } else if (direction === 'right') {
    selectedIconIndex = Math.min(selectedIconIndex + 1, total - 1)
  } else if (direction === 'left') {
    selectedIconIndex = Math.max(selectedIconIndex - 1, 0)
  }

  updateSelectedIcon()
}

// Icon trigger extension (space after icon component)
const iconTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // Check for space after component name
    if (insertedText === ' ' && !iconPickerVisible) {
      const line = update.view.state.doc.lineAt(fromB)
      const textBefore = line.text.slice(0, fromB - line.from)

      // Match component name at end of line (allowing trailing spaces)
      const match = textBefore.match(/\b([A-Z][a-zA-Z0-9]*)\s*$/)
      if (match) {
        const componentName = match[1]
        const primitive = componentPrimitives.get(componentName)

        if (primitive === 'icon') {
          const coords = update.view.coordsAtPos(fromB)
          if (coords) {
            showIconPicker(coords.left, coords.bottom + 4, fromB + 1)
            return  // Don't process further - picker is now open
          }
        }
      }
    }

    // Filter icons while typing
    if (iconPickerVisible && iconPickerStartPos !== null) {
      const cursorPos = fromB + insertedText.length
      const typedText = update.view.state.doc.sliceString(iconPickerStartPos, cursorPos)

      // Close on space (user doesn't want to pick)
      if (insertedText === ' ') {
        hideIconPicker()
        return
      }

      filterIcons(typedText)
    }
  })
})

// Keyboard handler for icon picker
const iconKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event, view) => {
    if (!iconPickerVisible) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        navigateIcons('down')
        return true
      case 'ArrowUp':
        event.preventDefault()
        navigateIcons('up')
        return true
      case 'ArrowRight':
        event.preventDefault()
        navigateIcons('right')
        return true
      case 'ArrowLeft':
        event.preventDefault()
        navigateIcons('left')
        return true
      case 'Enter':
        event.preventDefault()
        if (filteredIcons[selectedIconIndex]) {
          selectIcon(filteredIcons[selectedIconIndex])
        }
        return true
      case 'Escape':
        event.preventDefault()
        // Remove typed text
        if (iconPickerStartPos !== null) {
          const cursorPos = view.state.selection.main.head
          view.dispatch({
            changes: { from: iconPickerStartPos, to: cursorPos, insert: '' },
            selection: { anchor: iconPickerStartPos }
          })
        }
        hideIconPicker()
        return true
      case 'Backspace':
        // Check if we should close (backspace past start)
        const cursorPos = view.state.selection.main.head
        if (cursorPos <= iconPickerStartPos) {
          hideIconPicker()
        }
        return false  // Let editor handle it
    }
    return false
  }
})

// Close icon picker on click outside
document.addEventListener('mousedown', (e) => {
  if (iconPickerVisible && !iconPicker.contains(e.target)) {
    hideIconPicker()
  }
})

// Load icons on startup
loadIconList()

// Create editor
const editorContainer = document.getElementById('editor-container')

const editor = new EditorView({
  state: EditorState.create({
    doc: initialCode,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      mirrorHighlight,
      autocompletion({
        override: [mirrorCompletions],
        activateOnTyping: true,
      }),
      keymap.of([
        ...completionKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        indentWithTab,
      ]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          // Skip debounced compile if change came from property panel (already compiled immediately)
          const isFromPropertyPanel = update.transactions.some(tr =>
            tr.annotation(propertyPanelChangeAnnotation)
          )
          if (!isFromPropertyPanel) {
            debouncedCompile()
          }
        }
        // Cursor sync: only when selection changed WITHOUT doc change (no typing)
        // This is critical for performance - no sync during typing
        else if (update.selectionSet && studioEditorSyncManager) {
          const line = update.state.doc.lineAt(update.state.selection.main.head).number
          studioEditorSyncManager.onCursorMove(line)
        }
      }),
      tokenPanelTriggerExtension,
      Prec.highest(tokenPanelKeyboardExtension),
      colorDoubleClickExtension,
      hashColorTriggerExtension,
      Prec.highest(hashColorKeyboardExtension),
      iconTriggerExtension,
      Prec.highest(iconKeyboardExtension),
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" },
      }),
    ],
  }),
  parent: editorContainer,
})

// Debounce helper
function debounce(fn, ms) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
}

// Save current file (debounced) - uses API or localStorage based on auth state
const debouncedSave = debounce((code) => {
  saveFile(currentFile, code)
  // Update icon if content type changed
  updateFileIcon(currentFile)
}, 500)

const debouncedCompile = debounce(() => {
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}, 300)

// Folder toggle
document.querySelectorAll('.folder-header').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement.classList.toggle('collapsed')
  })
})

// Tab switching (Preview/Generated)
const preview = document.getElementById('preview')
const generatedCode = document.getElementById('generated-code')
const status = document.getElementById('status')
const tabs = document.querySelectorAll('.tab')
const tabContents = document.querySelectorAll('.tab-content')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.tab
    tabs.forEach(t => t.classList.remove('active'))
    tabContents.forEach(c => c.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(targetId === 'preview' ? 'preview' : 'generated-code').classList.add('active')
  })
})

// Auto-create missing files when referenced
function autoCreateFile(path) {
  // Normalize path
  let filename = path
  if (!filename.endsWith('.mirror')) {
    filename = filename + '.mirror'
  }

  // Check if already exists
  if (files[filename]) return false

  // Create file with auto-generated comment
  const content = `// ${filename} (auto-created)`
  saveFile(filename, content)

  // Re-render sidebar
  renderFileList()

  console.log(`Auto-created: ${filename}`)
  return true
}

// Update file icon based on current content
function updateFileIcon(filename) {
  const fileEl = document.querySelector(`[data-file="${filename}"]`)
  if (!fileEl) return

  const iconSvg = getFileIcon(filename)

  // Only replace the icon SVG, preserve buttons
  const oldIcon = fileEl.querySelector('svg')
  if (oldIcon) {
    const temp = document.createElement('div')
    temp.innerHTML = iconSvg
    const newIcon = temp.querySelector('svg')
    if (newIcon) {
      oldIcon.replaceWith(newIcon)
    }
  }
}

// Read file callback for import resolution and page navigation
// Auto-creates missing files
function readFile(path) {
  // Normalize path
  let filename = path
  if (!filename.endsWith('.mirror')) {
    filename = filename + '.mirror'
  }

  // If file doesn't exist, auto-create it
  if (!files[filename]) {
    autoCreateFile(path)
  }

  return files[filename] || null
}

// Make readFile available globally for runtime page navigation
window._mirrorReadFile = readFile

// Scan code for file references (import and route) and auto-create missing files
function autoCreateReferencedFiles(code) {
  // Find import statements: import name or import name1, name2
  const importRegex = /^\s*import\s+(.+)$/gm
  let match
  while ((match = importRegex.exec(code)) !== null) {
    const names = match[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
    for (const name of names) {
      // Skip if it's a string (quoted)
      if (name.startsWith('"') || name.startsWith("'")) continue
      autoCreateFile(name)
    }
  }

  // Find page routes (lowercase): route name or route path/name
  const routeRegex = /\broute\s+([a-z][a-z0-9_\/]*)/g
  while ((match = routeRegex.exec(code)) !== null) {
    const routePath = match[1]
    autoCreateFile(routePath)
  }
}

// Compile and render
function compile(code) {
  if (!code.trim()) {
    preview.innerHTML = ''
    preview.className = ''
    if (generatedCode) generatedCode.textContent = ''
    if (status) {
      status.textContent = 'Ready'
      status.className = 'status'
    }
    return
  }

  // Determine file type for preview mode
  const fileType = getFileType(currentFile)

  try {
    // Auto-create any missing referenced files
    autoCreateReferencedFiles(code)

    // Resolve imports first (if function exists)
    const resolvedCode = typeof Mirror.resolveImports === 'function'
      ? Mirror.resolveImports(code, readFile)
      : code

    // Parse
    const ast = Mirror.parse(resolvedCode)

    // Check for errors
    if (ast.errors && ast.errors.length > 0) {
      const errorMsg = ast.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')
      throw new Error(errorMsg)
    }

    // Update component primitives map for icon picker
    componentPrimitives.clear()
    for (const comp of ast.components) {
      const primitive = comp.primitive || comp.name.toLowerCase()
      componentPrimitives.set(comp.name, primitive)
    }

    // Update component palette with user-defined components
    updateUserComponentsPalette(ast)

    // Build IR with source map for bidirectional editing
    const irResult = Mirror.toIR(ast, true)
    const sourceMap = irResult.sourceMap

    // Generate DOM code
    const jsCode = Mirror.generateDOM(ast)
    if (generatedCode) generatedCode.textContent = jsCode

    // Clear preview and set appropriate class
    preview.innerHTML = ''
    preview.className = ''

    // Render based on file type
    if (fileType === 'tokens') {
      preview.className = 'tokens-preview'
      renderTokensPreview(ast)
    } else if (fileType === 'component') {
      preview.className = 'components-preview'
      renderComponentsPreview(ast)
    } else {
      // Layout or other: render UI
      const hasAutoInit = jsCode.includes('// Auto-initialization')

      let ui
      if (hasAutoInit) {
        const execCode = jsCode
          .replace('export function createUI', 'function createUI')
          .replace('document.body.appendChild(_ui.root)', '')

        const fn = new Function(execCode + '\nreturn _ui;')
        ui = fn()
      } else {
        const execCode = jsCode
          .replace('export function createUI', 'function createUI')

        const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
        ui = fn()
      }

      if (ui && ui.root) {
        preview.appendChild(ui.root)
      }

      // Update studio module with new AST and source map
      updateStudio(ast, sourceMap, resolvedCode)
    }

    if (status) {
      status.textContent = `OK - ${ast.components.length} components, ${ast.instances.length} instances`
      status.className = 'status ok'
    }

  } catch (err) {
    if (status) {
      status.textContent = 'Error'
      status.className = 'status error'
    }
    preview.innerHTML = `
      <div class="error-box">
        <h3>Parse/Compile Error</h3>
        <pre>${err.message}</pre>
      </div>
    `
    if (generatedCode) generatedCode.textContent = `// Error: ${err.message}`
  }
}

// Render Tokens Preview
function renderTokensPreview(ast) {
  const tokens = ast.tokens || []
  if (tokens.length === 0) {
    preview.innerHTML = '<div style="color: #71717a; padding: 20px;">Keine Tokens definiert</div>'
    return
  }

  // Group tokens by category
  const colorTokens = tokens.filter(t => isColorValue(t.value))
  const spacingTokens = tokens.filter(t => t.name.includes('.pad') || t.name.includes('.gap') || t.name.includes('.margin'))
  const radiusTokens = tokens.filter(t => t.name.includes('.rad'))
  const otherTokens = tokens.filter(t =>
    !isColorValue(t.value) &&
    !t.name.includes('.pad') &&
    !t.name.includes('.gap') &&
    !t.name.includes('.margin') &&
    !t.name.includes('.rad')
  )

  let html = ''

  if (colorTokens.length > 0) {
    html += renderTokenSection('Farben', colorTokens, 'color')
  }
  if (spacingTokens.length > 0) {
    html += renderTokenSection('Abstände', spacingTokens, 'spacing')
  }
  if (radiusTokens.length > 0) {
    html += renderTokenSection('Radien', radiusTokens, 'spacing')
  }
  if (otherTokens.length > 0) {
    html += renderTokenSection('Weitere', otherTokens, 'other')
  }

  preview.innerHTML = html
}

function renderTokenSection(title, tokens, type) {
  let rows = ''
  for (const token of tokens) {
    const resolvedValue = resolveTokenValue(token.value)
    let visualCell = ''

    if (type === 'color') {
      visualCell = `<div class="tokens-preview-swatch" style="background: ${resolvedValue}"></div>`
    } else if (type === 'spacing') {
      const size = parseInt(resolvedValue) || 8
      visualCell = `<div class="tokens-preview-spacing" style="width: ${Math.min(size, 48)}px; height: ${Math.min(size, 24)}px;"></div>`
    }

    rows += `
      <tr class="tokens-preview-row">
        <td class="tokens-preview-cell" style="width: 48px;">${visualCell}</td>
        <td class="tokens-preview-cell"><span class="tokens-preview-name">${token.name}</span></td>
        <td class="tokens-preview-cell"><span class="tokens-preview-value">${token.value}</span></td>
      </tr>
    `
  }

  return `
    <div class="tokens-preview-section">
      <div class="tokens-preview-section-header">${title}</div>
      <table class="tokens-preview-table">${rows}</table>
    </div>
  `
}

function isColorValue(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('$')
}

function resolveTokenValue(value) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('$')) return value
  // Simple token resolution - look up in all files
  const allSource = getAllProjectSource()
  const tokenName = value
  const regex = new RegExp(`\\${tokenName}:\\s*([^\\n]+)`)
  const match = allSource.match(regex)
  if (match) {
    return resolveTokenValue(match[1].trim())
  }
  return value
}

// Known behavior states
const BEHAVIOR_STATES = ['hover', 'active', 'focus', 'disabled', 'selected', 'highlighted', 'expanded', 'collapsed', 'on', 'off', 'valid', 'invalid']

// Render Components Preview
function renderComponentsPreview(ast) {
  const components = ast.components || []
  if (components.length === 0) {
    preview.innerHTML = `
      <div style="color: #71717a; padding: 32px; text-align: center;">
        <p style="font-size: 16px; margin-bottom: 8px;">Keine Komponenten definiert</p>
        <p style="font-size: 13px; opacity: 0.7;">
          Komponenten definieren mit:<br>
          <code style="background: #18181b; padding: 2px 6px; border-radius: 4px;">Button: pad 12, bg #3B82F6</code>
        </p>
      </div>
    `
    return
  }

  // Extract sections from source code (--- Name --- syntax)
  const sections = extractComponentSections(ast, components)

  let html = ''
  for (const section of sections) {
    if (section.components.length === 0) continue

    html += `
      <div class="components-preview-section">
        <div class="components-preview-section-header">${section.name}</div>
        <div class="components-preview-list">
          ${section.components.map(comp => renderComponentWithStates(comp, ast)).join('')}
        </div>
      </div>
    `
  }

  preview.innerHTML = html
}

function extractComponentSections(ast, components) {
  // Get current file source to find section headers
  const sourceCode = files[currentFile] || ''
  const lines = sourceCode.split('\n')

  // Extract section headers with their line numbers
  const sectionHeaders = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = line.match(/^---\s*(.+?)\s*---$/)
    if (match) {
      sectionHeaders.push({
        name: match[1],
        lineStart: i + 1, // 1-based line number
        lineEnd: lines.length
      })
      // Update previous section's end line
      if (sectionHeaders.length > 1) {
        sectionHeaders[sectionHeaders.length - 2].lineEnd = i - 1
      }
    }
  }

  // If no sections defined, return all components in one section
  if (sectionHeaders.length === 0) {
    return [{ name: 'Components', components }]
  }

  // Group components by section based on line numbers
  const sections = sectionHeaders.map(h => ({ name: h.name, components: [], lineStart: h.lineStart, lineEnd: h.lineEnd }))
  const unsortedComponents = []

  for (const comp of components) {
    // Skip components that match section header names
    if (sectionHeaders.some(h => h.name === comp.name)) continue

    const compLine = comp.line || 0
    let found = false

    for (const section of sections) {
      if (compLine >= section.lineStart && compLine <= section.lineEnd) {
        section.components.push(comp)
        found = true
        break
      }
    }

    if (!found) {
      unsortedComponents.push(comp)
    }
  }

  // Add unsorted components to first section or create default section
  if (unsortedComponents.length > 0) {
    if (sections.length > 0) {
      sections[0].components = [...unsortedComponents, ...sections[0].components]
    } else {
      sections.unshift({ name: 'Components', components: unsortedComponents })
    }
  }

  // Filter out empty sections
  return sections.filter(s => s.components.length > 0)
}

function getComponentStates(comp) {
  const states = new Set()

  // Collect states from the component
  if (comp.states) {
    for (const state of comp.states) {
      if (BEHAVIOR_STATES.includes(state.name)) {
        states.add(state.name)
      }
    }
  }

  // Also collect from children
  const collectFromChildren = (children) => {
    for (const child of children || []) {
      if (child.states) {
        for (const state of child.states) {
          if (BEHAVIOR_STATES.includes(state.name)) {
            states.add(state.name)
          }
        }
      }
      if (child.children) {
        collectFromChildren(child.children)
      }
    }
  }
  collectFromChildren(comp.children || [])

  return ['default', ...Array.from(states)]
}

function renderComponentWithStates(comp, ast) {
  const states = getComponentStates(comp)

  let rows = ''
  for (let i = 0; i < states.length; i++) {
    const stateName = states[i]
    const showName = i === 0 ? comp.name : ''

    rows += `
      <div class="components-preview-row">
        <div class="components-preview-name">${showName}</div>
        <div class="components-preview-state">${stateName}</div>
        <div class="components-preview-render" id="comp-render-${comp.name}-${stateName}"></div>
      </div>
    `
  }

  // Schedule rendering after DOM update
  setTimeout(() => {
    for (const stateName of states) {
      renderComponentState(comp, stateName, ast)
    }
  }, 0)

  return `<div class="components-preview-component">${rows}</div>`
}

function getTokensSource() {
  // Only get tokens and data files (not layouts or components)
  let tokensSource = ''
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (type === 'tokens' || type === 'data') {
      tokensSource += files[filename] + '\n'
    }
  }
  return tokensSource
}

// Inject component preview CSS variables once
let componentPreviewStylesInjected = false

function injectComponentPreviewStyles() {
  if (componentPreviewStylesInjected) return

  // Get tokens and create CSS variables
  const tokensSource = getTokensSource()
  if (!tokensSource.trim()) return

  try {
    const ast = Mirror.parse(tokensSource)
    if (!ast.tokens || ast.tokens.length === 0) return

    let cssVars = ':root {\n'
    for (const token of ast.tokens) {
      // Strip $ prefix and convert dots to hyphens
      const cssVarName = (token.name.startsWith('$') ? token.name.slice(1) : token.name)
        .replace(/\./g, '-')
      cssVars += `  --${cssVarName}: ${token.value};\n`
    }
    cssVars += '}\n'

    const style = document.createElement('style')
    style.id = 'component-preview-tokens'
    style.textContent = cssVars
    document.head.appendChild(style)

    componentPreviewStylesInjected = true
  } catch (e) {
    console.warn('Failed to inject component preview styles:', e)
  }
}

function renderComponentState(comp, stateName, ast) {
  const container = document.getElementById(`comp-render-${comp.name}-${stateName}`)
  if (!container) return

  // Ensure CSS variables are injected
  injectComponentPreviewStyles()

  try {
    // Get only tokens (not layouts)
    const tokensSource = getTokensSource()

    // Get the current component file source (for component definitions)
    const currentFileSource = files[currentFile] || ''

    // Build code: tokens + component file + instance
    let code = tokensSource + '\n' + currentFileSource + '\n' + comp.name

    const miniAst = Mirror.parse(code)
    const jsCode = Mirror.generateDOM(miniAst)
      .replace('export function createUI', 'function createUI')

    const fn = new Function(jsCode + '\nreturn createUI ? createUI() : null;')
    const ui = fn()

    if (ui && ui.root) {
      // Find and extract just the component we want (last child should be our instance)
      const allChildren = ui.root.children
      if (allChildren.length > 0) {
        const targetElement = allChildren[allChildren.length - 1]

        // For non-default states, add the state class
        if (stateName !== 'default') {
          targetElement.classList.add(`state-${stateName}`)
          targetElement.setAttribute('data-state', stateName)
        }

        container.appendChild(targetElement.cloneNode(true))
      }
    }
  } catch (e) {
    container.innerHTML = `<span style="color: #52525b; font-size: 11px;">Error: ${e.message}</span>`
  }
}

// ============================================
// Studio Module - Bidirectional Editing
// ============================================

// State for studio module
let currentAST = null
let currentSourceMap = null
let studioSelectionManager = null
let studioPreviewInteraction = null
let studioPropertyPanel = null
let studioPropertyExtractor = null
let studioCodeModifier = null
let studioDragDropManager = null
let studioEditorSyncManager = null  // Syncs editor cursor ↔ preview selection
let canvasDragCleanups = []  // Cleanup functions for canvas element drag handlers

// File type processing order: data -> tokens -> components -> layouts
const FILE_TYPE_ORDER = ['data', 'tokens', 'component', 'layout']

/**
 * Get all project source in processing order (data -> tokens -> components -> layouts)
 * This allows the PropertyPanel to access tokens from all files
 */
function getAllProjectSource() {
  const filesByType = {}

  // Group files by type
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (!filesByType[type]) {
      filesByType[type] = []
    }
    filesByType[type].push({ filename, content: files[filename] })
  }

  // Concatenate in order: data -> tokens -> components -> layouts
  let allSource = ''
  for (const type of FILE_TYPE_ORDER) {
    const typeFiles = filesByType[type] || []
    for (const file of typeFiles) {
      allSource += file.content + '\n'
    }
  }

  return allSource
}

/**
 * Scroll editor to a specific line and optionally highlight it
 */
function scrollEditorToLine(line) {
  if (!editor) return

  try {
    const lineInfo = editor.state.doc.line(line)
    editor.dispatch({
      effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
      selection: { anchor: lineInfo.from }
    })
  } catch (e) {
    // Line might be out of bounds after edit
    console.warn('Studio: Could not scroll to line', line, e)
  }
}

// Initialize studio module
function initStudio() {
  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')

  if (!propertyPanelContainer || !previewContainer) {
    console.warn('Studio: Property panel or preview container not found')
    return
  }

  // Create SelectionManager
  studioSelectionManager = new Mirror.SelectionManager()

  // Create EditorSyncManager (will get sourceMap after first compile)
  // Note: We pass a dummy sourceMap initially, it will be updated after compile
  const dummySourceMap = new Mirror.SourceMap()
  studioEditorSyncManager = new Mirror.EditorSyncManager(
    dummySourceMap,
    studioSelectionManager,
    {
      debounceMs: 150,
      useIdleCallback: true,
      scrollToLine: scrollEditorToLine
    }
  )

  // Create PreviewInteraction (will attach to preview after each compile)
  // We'll create it fresh after each compile since the preview DOM changes

  console.log('Studio: Initialized')
}

// Update studio after compile
function updateStudio(ast, sourceMap, source) {
  if (!studioSelectionManager) return

  currentAST = ast
  currentSourceMap = sourceMap

  // Update EditorSyncManager with new sourceMap
  if (studioEditorSyncManager) {
    studioEditorSyncManager.updateSourceMap(sourceMap)
  }

  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')

  // Clean up old interaction handler
  if (studioPreviewInteraction) {
    studioPreviewInteraction.dispose()
  }

  // Create new PreviewInteraction for the fresh preview DOM
  studioPreviewInteraction = new Mirror.PreviewInteraction(
    previewContainer,
    studioSelectionManager,
    {
      selectedClass: 'studio-selected',
      hoverClass: 'studio-hover'
    }
  )
  // Re-apply selection visual to new DOM elements
  studioPreviewInteraction.refresh()

  // Update or create PropertyExtractor
  if (studioPropertyExtractor) {
    studioPropertyExtractor.updateAST(ast)
    studioPropertyExtractor.updateSourceMap(sourceMap)
  } else {
    studioPropertyExtractor = new Mirror.PropertyExtractor(ast, sourceMap)
  }

  // Update or create CodeModifier
  if (studioCodeModifier) {
    studioCodeModifier.updateSource(source)
    studioCodeModifier.updateSourceMap(sourceMap)
  } else {
    studioCodeModifier = new Mirror.CodeModifier(source, sourceMap)
  }

  // Validate current selection - clear if element no longer exists
  const currentSelection = studioSelectionManager.getSelection()
  if (currentSelection) {
    const selectionStillValid = studioPropertyExtractor.getProperties(currentSelection)
    if (!selectionStillValid) {
      console.log('Studio: Selection invalidated after compile, clearing:', currentSelection)
      studioSelectionManager.clearSelection()
    }
  }

  // Update or create PropertyPanel
  if (studioPropertyPanel) {
    const selection = studioSelectionManager.getSelection()
    if (selection) {
      console.log('Studio: Refreshing property panel, selection:', selection)
    }
    studioPropertyPanel.updateDependencies(studioPropertyExtractor, studioCodeModifier)
  } else {
    studioPropertyPanel = new Mirror.PropertyPanel(
      propertyPanelContainer,
      studioSelectionManager,
      studioPropertyExtractor,
      studioCodeModifier,
      handleStudioCodeChange,
      {
        getAllSource: getAllProjectSource,
        filesAccess: {
          getFile: (path) => files[path],
          setFile: (path, content) => {
            files[path] = content
            saveFile(path, content)
            // Component file updated - the main file change will trigger recompile
          },
          getCurrentFile: () => currentFile
        }
      }
    )
  }

  // Update or create DragDropManager
  if (studioDragDropManager) {
    studioDragDropManager.setCodeModifier(source, sourceMap)
  } else {
    studioDragDropManager = new Mirror.DragDropManager(previewContainer, {
      onDrop: handleStudioDrop,
      onDragEnter: () => previewContainer.style.outline = '2px dashed #3B82F6',
      onDragLeave: () => previewContainer.style.outline = '',
    })
    studioDragDropManager.setCodeModifier(source, sourceMap)
    initComponentPalette()
  }

  // Make preview elements draggable for canvas-internal movement
  makePreviewElementsDraggable()
}

/**
 * Makes all preview elements draggable for canvas-internal movement
 */
function makePreviewElementsDraggable() {
  // Cleanup previous bindings
  canvasDragCleanups.forEach(cleanup => cleanup())
  canvasDragCleanups = []

  if (!studioDragDropManager) return

  const previewContainer = document.getElementById('preview')
  if (!previewContainer) return

  // Ensure drop indicators exist (they may have been removed by preview innerHTML update)
  studioDragDropManager.ensureIndicators()

  // Find all elements with data-mirror-id
  const elements = previewContainer.querySelectorAll('[data-mirror-id]')

  elements.forEach(el => {
    const nodeId = el.getAttribute('data-mirror-id')
    if (!nodeId) return

    // Don't make root-level elements draggable (direct children of preview)
    if (el.parentElement === previewContainer) return

    // Make element draggable and store cleanup function
    const cleanup = Mirror.makeCanvasElementDraggable(
      el,
      nodeId,
      studioDragDropManager
    )
    canvasDragCleanups.push(cleanup)
  })
}

// Handle code changes from property panel
function handleStudioCodeChange(result) {
  if (!result.success) {
    console.warn('Studio: Code modification failed:', result.error)
    return
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: result.change,
    annotations: [propertyPanelChangeAnnotation.of(true)]
  })

  // Compile immediately (no debounce for property panel changes)
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}

// Handle drag-drop from component palette
function handleStudioDrop(result) {
  const previewContainer = document.getElementById('preview')
  previewContainer.style.outline = ''

  if (!result.success) {
    console.warn('Studio: Drop failed:', result.error)
    return
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: result.modification.change
  })

  console.log('Studio: Component dropped', result.dropZone?.targetId, result.dropZone?.placement)
}

// Built-in primitive components
const PRIMITIVE_COMPONENTS = [
  { name: 'Box', properties: 'pad 16, bg #27272a, rad 8', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>' },
  { name: 'Button', properties: 'pad 10 20, bg #3B82F6, rad 6', text: 'Button', icon: '<rect x="3" y="8" width="18" height="8" rx="2" ry="2"></rect>' },
  { name: 'Text', text: 'Text', icon: '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line>' },
  { name: 'Input', properties: 'pad 10, bg #27272a, rad 6', text: 'placeholder...', icon: '<rect x="3" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="7" y1="12" x2="11" y2="12"></line>' },
  { name: 'Icon', properties: '"star"', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' },
  { name: 'Image', properties: '"https://picsum.photos/200"', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>' },
]

// User component icon (cube/component symbol)
const USER_COMPONENT_ICON = '<path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path>'

// Render a component palette item
function renderPaletteItem(comp, isUserComponent = false) {
  const props = comp.properties ? ` data-properties="${comp.properties.replace(/"/g, '&quot;')}"` : ''
  const text = comp.text ? ` data-text="${comp.text}"` : ''
  const userClass = isUserComponent ? ' user-component' : ''
  return `
    <div class="component-palette-item${userClass}" data-component="${comp.name}"${props}${text} draggable="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${comp.icon || USER_COMPONENT_ICON}
      </svg>
      <span>${comp.name}</span>
    </div>
  `
}

// Attach drag handlers to palette items
function attachPaletteDragHandlers(container) {
  container.querySelectorAll('.component-palette-item').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      const componentName = item.dataset.component
      const properties = item.dataset.properties || ''
      const textContent = item.dataset.text || ''

      const dragData = {
        componentName,
        properties: properties || undefined,
        textContent: textContent || undefined
      }

      e.dataTransfer.setData('application/mirror-component', JSON.stringify(dragData))
      e.dataTransfer.setData('text/plain', JSON.stringify(dragData))
      e.dataTransfer.effectAllowed = 'copy'

      item.classList.add('dragging')
    })

    item.addEventListener('dragend', () => {
      item.classList.remove('dragging')
    })
  })
}

// Initialize component palette with primitives
function initComponentPalette() {
  const primitivesContainer = document.getElementById('primitives-palette')
  if (!primitivesContainer) return

  // Render primitives
  primitivesContainer.innerHTML = PRIMITIVE_COMPONENTS.map(comp => renderPaletteItem(comp)).join('')
  attachPaletteDragHandlers(primitivesContainer)

  console.log('Studio: Component palette initialized with', PRIMITIVE_COMPONENTS.length, 'primitives')
}

// Update user components from AST
function updateUserComponentsPalette(ast) {
  const userSection = document.getElementById('user-components-section')
  const userContainer = document.getElementById('user-components-palette')
  if (!userSection || !userContainer) return

  // Extract user-defined components (all components except primitives)
  // ast.components already contains only definitions, not instances
  const userComponents = ast.components
    .filter(comp => !PRIMITIVE_COMPONENTS.some(p => p.name === comp.name))
    .map(comp => ({
      name: comp.name,
      // No default properties for user components - they use their definition
    }))

  // Remove duplicates (keep first occurrence)
  const uniqueComponents = []
  const seen = new Set()
  for (const comp of userComponents) {
    if (!seen.has(comp.name)) {
      seen.add(comp.name)
      uniqueComponents.push(comp)
    }
  }

  if (uniqueComponents.length > 0) {
    userSection.style.display = 'block'
    userContainer.innerHTML = uniqueComponents.map(comp => renderPaletteItem(comp, true)).join('')
    attachPaletteDragHandlers(userContainer)
  } else {
    userSection.style.display = 'none'
    userContainer.innerHTML = ''
  }
}

// Initialize studio
initStudio()

// Initial compile
compile(initialCode)

// Expose for debugging
window.editor = editor
window.studioSelectionManager = studioSelectionManager
window.startCompletion = startCompletion
window.files = files
window.resetCode = async () => {
  // Reset all files to defaults
  for (const [name, content] of Object.entries(defaultFiles)) {
    files[name] = content
    if (authState.isLoggedIn && currentProject) {
      // On server, overwrite files
      await saveFile(name, content)
    } else {
      // In demo mode, clear localStorage
      localStorage.removeItem(STORAGE_PREFIX + name)
    }
  }
  // Reload current file
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: files[currentFile] }
  })
  compile(files[currentFile])
  renderFileList()
}

// ==========================================
// Resizable Panel Dividers
// Best practices: requestAnimationFrame, localStorage persistence, no visible lines
// ==========================================
const sidebarDivider = document.getElementById('sidebar-divider')
const editorDivider = document.getElementById('editor-divider')
const componentsDivider = document.getElementById('components-divider')
const container = document.querySelector('.container')

const LAYOUT_STORAGE_KEY = 'mirror-panel-layout'
const DIVIDER_WIDTH = 0  // Invisible dividers - hit area via CSS ::before
const PROPERTY_PANEL_WIDTH = 320

// Load saved layout or use defaults
function loadLayout() {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved) {
      const layout = JSON.parse(saved)
      return {
        sidebarWidth: layout.sidebarWidth ?? 240,
        componentsWidth: layout.componentsWidth ?? 160,
        editorRatio: layout.editorRatio ?? 0.5
      }
    }
  } catch (e) {
    console.warn('Failed to load panel layout:', e)
  }
  return { sidebarWidth: 240, componentsWidth: 160, editorRatio: 0.5 }
}

function saveLayout() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify({
      sidebarWidth: layout.sidebarWidth,
      componentsWidth: layout.componentsWidth,
      editorRatio: layout.editorRatio
    }))
  } catch (e) {
    // Ignore storage errors
  }
}

let layout = loadLayout()
let activeDivider = null
let rafPending = false

function updateLayout() {
  if (rafPending) return
  rafPending = true

  requestAnimationFrame(() => {
    rafPending = false
    const totalWidth = container.getBoundingClientRect().width
    const dividerTotal = DIVIDER_WIDTH * 3
    const remainingWidth = totalWidth - layout.sidebarWidth - layout.componentsWidth - PROPERTY_PANEL_WIDTH - dividerTotal
    const editorWidth = Math.round(remainingWidth * layout.editorRatio)
    const previewWidth = remainingWidth - editorWidth

    container.style.gridTemplateColumns =
      `${layout.sidebarWidth}px ${DIVIDER_WIDTH}px ${editorWidth}px ${DIVIDER_WIDTH}px ${layout.componentsWidth}px ${DIVIDER_WIDTH}px ${previewWidth}px ${PROPERTY_PANEL_WIDTH}px`
  })
}

function startDrag(dividerName, dividerElement, e) {
  activeDivider = dividerName
  dividerElement.classList.add('dragging')
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

sidebarDivider?.addEventListener('mousedown', (e) => startDrag('sidebar', sidebarDivider, e))
editorDivider?.addEventListener('mousedown', (e) => startDrag('editor', editorDivider, e))
componentsDivider?.addEventListener('mousedown', (e) => startDrag('components', componentsDivider, e))

document.addEventListener('mousemove', (e) => {
  if (!activeDivider) return

  const containerRect = container.getBoundingClientRect()
  const x = e.clientX - containerRect.left
  const totalWidth = containerRect.width
  const dividerTotal = DIVIDER_WIDTH * 3

  if (activeDivider === 'sidebar') {
    layout.sidebarWidth = Math.max(120, Math.min(400, x - DIVIDER_WIDTH / 2))
  } else if (activeDivider === 'editor') {
    const editorStart = layout.sidebarWidth + DIVIDER_WIDTH
    const availableForEditorPreview = totalWidth - layout.sidebarWidth - layout.componentsWidth - PROPERTY_PANEL_WIDTH - dividerTotal
    const editorX = x - editorStart - DIVIDER_WIDTH / 2
    layout.editorRatio = Math.max(0.15, Math.min(0.85, editorX / availableForEditorPreview))
  } else if (activeDivider === 'components') {
    const availableForEditorPreview = totalWidth - layout.sidebarWidth - PROPERTY_PANEL_WIDTH - dividerTotal
    const editorWidth = availableForEditorPreview * layout.editorRatio
    const componentsStart = layout.sidebarWidth + DIVIDER_WIDTH + editorWidth + DIVIDER_WIDTH
    const newComponentsWidth = x - componentsStart - DIVIDER_WIDTH / 2
    layout.componentsWidth = Math.max(120, Math.min(400, newComponentsWidth))
  }

  updateLayout()
})

document.addEventListener('mouseup', () => {
  if (activeDivider) {
    sidebarDivider?.classList.remove('dragging')
    editorDivider?.classList.remove('dragging')
    componentsDivider?.classList.remove('dragging')
    activeDivider = null
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    saveLayout() // Persist on drag end
  }
})

// Initialize layout
updateLayout()
window.addEventListener('resize', updateLayout)

// ==========================================
// Settings
// ==========================================

const SETTINGS_KEY = 'mirror-settings'
const settingsButton = document.getElementById('settings-button')
const settingsOverlay = document.getElementById('settings-overlay')
const settingsClose = document.getElementById('settings-close')
const imgbbKeyInput = document.getElementById('imgbb-key')
const imgbbStatus = document.getElementById('imgbb-status')

// Load settings from localStorage
function loadSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Save settings to localStorage
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Get imgbb API key
function getImgbbKey() {
  const settings = loadSettings()
  return settings.imgbbKey || ''
}

// Update status indicator
function updateImgbbStatus() {
  const key = getImgbbKey()
  if (key) {
    imgbbStatus.className = 'settings-status success'
    imgbbStatus.innerHTML = '✓ API Key gespeichert'
  } else {
    imgbbStatus.className = 'settings-status missing'
    imgbbStatus.innerHTML = '⚠ Kein API Key - Bild-Upload deaktiviert'
  }
}

// Open settings
settingsButton.addEventListener('click', () => {
  const settings = loadSettings()
  imgbbKeyInput.value = settings.imgbbKey || ''
  updateImgbbStatus()
  settingsOverlay.classList.add('visible')
})

// Close settings
function closeSettings() {
  settingsOverlay.classList.remove('visible')
}

settingsClose.addEventListener('click', closeSettings)
settingsOverlay.addEventListener('click', (e) => {
  if (e.target === settingsOverlay) closeSettings()
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && settingsOverlay.classList.contains('visible')) {
    closeSettings()
  }
})

// Save API key on input
imgbbKeyInput.addEventListener('input', () => {
  const settings = loadSettings()
  settings.imgbbKey = imgbbKeyInput.value.trim()
  saveSettings(settings)
  updateImgbbStatus()
})

// ==========================================
// Image Upload Feature
// ==========================================

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload'
const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 32 * 1024 * 1024 // 32 MB

const uploadIndicator = document.getElementById('upload-indicator')
const dropOverlay = document.getElementById('drop-overlay')
const editorPanel = document.querySelector('.editor-panel')

// Upload to imgbb
async function uploadToImgbb(file) {
  // Check for API key
  const apiKey = getImgbbKey()
  if (!apiKey) {
    throw new Error('Kein imgbb API Key. Bitte in Einstellungen hinterlegen.')
  }

  // Validate format
  if (!SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
    throw new Error(`Format nicht unterstützt: ${file.type.split('/')[1].toUpperCase()}. Erlaubt: PNG, JPG, GIF, WebP`)
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Datei zu groß: ${sizeMB} MB (Maximum: 32 MB)`)
  }

  // Create form data
  const formData = new FormData()
  formData.append('image', file)

  // Upload
  const response = await fetch(`${IMGBB_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Upload fehlgeschlagen (${response.status})`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error?.message || 'Upload fehlgeschlagen')
  }

  return data.data.url
}

// Insert URL at cursor position
function insertImageUrl(url) {
  if (!window.editor) return

  const state = window.editor.state
  const pos = state.selection.main.head
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Check if already inside a string (odd number of quotes before cursor)
  const quoteCount = (textBefore.match(/"/g) || []).length
  const inString = quoteCount % 2 === 1

  let insertText
  if (inString) {
    insertText = url
  } else {
    insertText = `"${url}"`
  }

  window.editor.dispatch({
    changes: { from: pos, to: pos, insert: insertText },
    selection: { anchor: pos + insertText.length }
  })

  window.editor.focus()
}

// Handle image upload
async function handleImageUpload(file) {
  try {
    uploadIndicator.classList.add('visible')

    const url = await uploadToImgbb(file)
    insertImageUrl(url)

  } catch (error) {
    showUploadError(error.message)
  } finally {
    uploadIndicator.classList.remove('visible')
  }
}

// Show error toast
function showUploadError(message) {
  const toast = document.createElement('div')
  toast.className = 'upload-error'
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(10px)'
    toast.style.transition = 'all 0.2s ease-out'
    setTimeout(() => toast.remove(), 200)
  }, 4000)
}

// Check if data transfer has image files
function hasImageFile(dataTransfer) {
  if (!dataTransfer || !dataTransfer.types.includes('Files')) return false

  for (const item of dataTransfer.items) {
    if (item.kind === 'file' && SUPPORTED_IMAGE_FORMATS.includes(item.type)) {
      return true
    }
  }
  return false
}

// Get image files from data transfer
function getImageFiles(dataTransfer) {
  const files = []
  if (!dataTransfer || !dataTransfer.files) return files

  for (const file of dataTransfer.files) {
    if (SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      files.push(file)
    }
  }
  return files
}

// Drag & Drop handlers
let dragCounter = 0

editorPanel.addEventListener('dragenter', (e) => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    dragCounter++
    dropOverlay.classList.add('visible')
  }
})

editorPanel.addEventListener('dragover', (e) => {
  if (hasImageFile(e.dataTransfer)) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
})

editorPanel.addEventListener('dragleave', (e) => {
  dragCounter--
  if (dragCounter === 0) {
    dropOverlay.classList.remove('visible')
  }
})

editorPanel.addEventListener('drop', async (e) => {
  dragCounter = 0
  dropOverlay.classList.remove('visible')

  const files = getImageFiles(e.dataTransfer)
  if (files.length === 0) return

  e.preventDefault()

  // Set cursor at drop position if possible
  if (window.editor) {
    const editorRect = document.querySelector('.cm-editor').getBoundingClientRect()
    const pos = window.editor.posAtCoords({ x: e.clientX, y: e.clientY })
    if (pos !== null) {
      window.editor.dispatch({ selection: { anchor: pos } })
    }
  }

  // Upload all images
  for (const file of files) {
    await handleImageUpload(file)
  }
})

// Paste handler
document.addEventListener('paste', async (e) => {
  // Only handle if editor is focused
  if (!document.activeElement.closest('.cm-editor')) return

  const files = getImageFiles(e.clipboardData)
  if (files.length === 0) return

  e.preventDefault()

  for (const file of files) {
    await handleImageUpload(file)
  }
})

// =========================================================================
// LLM CODE GENERATION
// =========================================================================

function getApiKey() {
  return localStorage.getItem('openrouter_api_key')
}

function promptForApiKey() {
  const key = prompt(
    'OpenRouter API Key eingeben:\n\n' +
    'Hol dir einen Key bei https://openrouter.ai/keys\n\n' +
    'Der Key wird lokal im Browser gespeichert.'
  )
  if (key && key.trim()) {
    localStorage.setItem('openrouter_api_key', key.trim())
    return key.trim()
  }
  return null
}

// ==========================================================================
// LLM Integration - React to Mirror Workflow
// ==========================================================================

// React-to-Mirror Converter (inline version for browser)
const STYLE_TO_MIRROR = {
  'padding': 'pad',
  'paddingTop': 'pad top',
  'paddingBottom': 'pad bottom',
  'paddingLeft': 'pad left',
  'paddingRight': 'pad right',
  'margin': 'm',
  'backgroundColor': 'bg',
  'background': 'bg',
  'color': 'col',
  'borderRadius': 'rad',
  'width': 'w',
  'height': 'h',
  'minWidth': 'minw',
  'maxWidth': 'maxw',
  'minHeight': 'minh',
  'maxHeight': 'maxh',
  'gap': 'gap',
  'fontSize': 'font-size',
  'fontWeight': 'weight',
  'fontFamily': 'font',
  'textAlign': 'text-align',
  'display': '_display',
  'flexDirection': '_flexDirection',
  'alignItems': '_alignItems',
  'justifyContent': '_justifyContent',
  'cursor': 'cursor',
  'opacity': 'opacity',
  'border': 'bor',
  'borderColor': 'boc',
  'boxShadow': 'shadow',
}

const TAG_TO_COMPONENT = {
  'div': 'frame', 'span': 'text', 'button': 'button', 'input': 'input',
  'textarea': 'textarea', 'img': 'image', 'a': 'link', 'nav': 'frame',
  'header': 'frame', 'footer': 'frame', 'main': 'frame', 'section': 'frame',
  'article': 'frame', 'aside': 'frame', 'h1': 'text', 'h2': 'text',
  'h3': 'text', 'h4': 'text', 'p': 'text', 'label': 'text', 'select': 'frame',
}

const TAG_TO_NAME = {
  'div': 'Box', 'span': 'Text', 'button': 'Button', 'input': 'Input',
  'nav': 'Nav', 'header': 'Header', 'footer': 'Footer', 'main': 'Main',
  'section': 'Section', 'h1': 'Heading', 'h2': 'Heading', 'h3': 'Heading',
  'p': 'Text', 'a': 'Link', 'img': 'Image', 'select': 'Select', 'option': 'Option',
}

function convertReactToMirror(reactCode) {
  const componentDefinitions = new Map()

  function parseStyleObject(styleStr) {
    const style = {}
    const pairs = styleStr.split(',').map(s => s.trim()).filter(Boolean)
    for (const pair of pairs) {
      const colonIndex = pair.indexOf(':')
      if (colonIndex === -1) continue
      let key = pair.slice(0, colonIndex).trim().replace(/['\"]/g, '')
      let value = pair.slice(colonIndex + 1).trim().replace(/['\"]/g, '').replace(/,\s*$/, '')
      style[key] = value
    }
    return style
  }

  function styleToMirrorProps(style) {
    const props = []
    let layout = 'ver'

    for (const [key, value] of Object.entries(style)) {
      const mirrorKey = STYLE_TO_MIRROR[key]
      if (!mirrorKey) continue

      if (mirrorKey === '_display' && value === 'flex') continue
      if (mirrorKey === '_flexDirection') {
        layout = value === 'row' ? 'hor' : 'ver'
        continue
      }
      if (mirrorKey === '_alignItems') {
        const map = { 'center': 'ver-center', 'flex-start': 'top', 'flex-end': 'bottom' }
        if (map[value]) props.push(map[value])
        continue
      }
      if (mirrorKey === '_justifyContent') {
        const map = { 'center': 'hor-center', 'space-between': 'spread', 'flex-start': 'left', 'flex-end': 'right' }
        if (map[value]) props.push(map[value])
        continue
      }

      let mirrorValue = String(value).replace(/px/g, '').trim()
      if (mirrorValue.startsWith('var(--')) {
        const tokenName = mirrorValue.match(/var\(--([^\)]+)\)/)?.[1]
        mirrorValue = tokenName ? `$${tokenName}` : mirrorValue
      }

      props.push(`${mirrorKey} ${mirrorValue}`)
    }

    if (layout === 'hor') props.unshift('hor')
    return props
  }

  function findMatchingBrace(str, openPos) {
    if (str[openPos] !== '{') return -1
    let depth = 1, pos = openPos + 1
    while (pos < str.length && depth > 0) {
      const char = str[pos]
      if (char === '{') depth++
      else if (char === '}') depth--
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < str.length && str[pos] !== quote) {
          if (str[pos] === '\\') pos++
          pos++
        }
      }
      pos++
    }
    return depth === 0 ? pos - 1 : -1
  }

  function extractReturnJSX(code) {
    const returnIndex = code.indexOf('return')
    if (returnIndex === -1) return code
    let pos = returnIndex + 6
    while (pos < code.length && code[pos] !== '(' && code[pos] !== '<') pos++
    if (code[pos] === '<') {
      const jsxStart = pos
      const tag = code.slice(pos).match(/^<(\w+)/)?.[1]
      if (tag) {
        const closeTag = `</${tag}>`
        const closeIndex = code.lastIndexOf(closeTag)
        if (closeIndex > jsxStart) return code.slice(jsxStart, closeIndex + closeTag.length).trim()
      }
      return code.slice(pos).trim()
    }
    if (code[pos] !== '(') return code
    const openParen = pos
    let depth = 1
    pos++
    while (pos < code.length && depth > 0) {
      const char = code[pos]
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        pos++
        while (pos < code.length && code[pos] !== quote) {
          if (code[pos] === '\\') pos++
          pos++
        }
      } else if (char === '(') depth++
      else if (char === ')') depth--
      pos++
    }
    return code.slice(openParen + 1, pos - 1).trim()
  }

  function parseJSXElement(jsx) {
    if (!jsx || !jsx.startsWith('<')) return null
    const openTagMatch = jsx.match(/^<(\w+)([^>]*?)(?:\/>|>)/)
    if (!openTagMatch) return null

    const tag = openTagMatch[1].toLowerCase()
    const propsStr = openTagMatch[2]
    const isSelfClosing = jsx.includes('/>')

    // Parse style
    let style = null
    const styleMatch = propsStr.match(/style=\{\{([^}]+)\}\}/)
    if (styleMatch) style = parseStyleObject(styleMatch[1])

    const element = { tag, style, children: [] }

    if (!isSelfClosing) {
      const childrenMatch = jsx.match(new RegExp(`<${openTagMatch[1]}[^>]*>([\\s\\S]*)<\\/${openTagMatch[1]}>`, 'i'))
      if (childrenMatch) {
        element.children = parseChildren(childrenMatch[1])
      }
    }

    return element
  }

  function parseChildren(content) {
    const children = []
    const trimmed = content.trim()
    if (!trimmed) return children

    if (!trimmed.includes('<')) {
      if (trimmed && !trimmed.startsWith('{')) children.push(trimmed)
      return children
    }

    let pos = 0, textStart = 0
    while (pos < trimmed.length) {
      if (trimmed[pos] === '{') {
        const exprEnd = findMatchingBrace(trimmed, pos)
        if (exprEnd > pos) { pos = exprEnd + 1; textStart = pos; continue }
      }

      const openTagStart = trimmed.indexOf('<', pos)
      if (openTagStart === -1) {
        const text = trimmed.slice(textStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
        break
      }

      const braceBeforeTag = trimmed.lastIndexOf('{', openTagStart)
      if (braceBeforeTag >= textStart) {
        const braceEnd = findMatchingBrace(trimmed, braceBeforeTag)
        if (braceEnd > openTagStart) { pos = braceEnd + 1; textStart = pos; continue }
      }

      if (trimmed[openTagStart + 1] === '/') {
        pos = trimmed.indexOf('>', openTagStart) + 1
        textStart = pos
        continue
      }

      if (openTagStart > textStart) {
        const text = trimmed.slice(textStart, openTagStart).trim()
        if (text && !text.startsWith('{') && !text.startsWith('</')) children.push(text)
      }

      const tagNameMatch = trimmed.slice(openTagStart).match(/^<(\w+)/)
      if (!tagNameMatch) { pos = openTagStart + 1; continue }

      const tagName = tagNameMatch[1]
      const selfCloseMatch = trimmed.slice(openTagStart).match(new RegExp(`^<${tagName}[^>]*/>`))
      if (selfCloseMatch) {
        const element = parseJSXElement(selfCloseMatch[0])
        if (element) children.push(element)
        pos = openTagStart + selfCloseMatch[0].length
        textStart = pos
        continue
      }

      const closeTag = `</${tagName}>`
      let depth = 1, searchPos = openTagStart + 1
      while (depth > 0 && searchPos < trimmed.length) {
        if (trimmed[searchPos] === '{') {
          const exprEnd = findMatchingBrace(trimmed, searchPos)
          if (exprEnd > searchPos) { searchPos = exprEnd + 1; continue }
        }
        const nextClose = trimmed.indexOf(closeTag, searchPos)
        if (nextClose === -1) { depth = 0; break }
        const nextOpenSearch = trimmed.slice(searchPos).search(new RegExp(`<${tagName}(?:\\s|>|/>)`))
        if (nextOpenSearch !== -1 && searchPos + nextOpenSearch < nextClose) {
          const checkPos = searchPos + nextOpenSearch
          if (!trimmed.slice(checkPos).match(new RegExp(`^<${tagName}[^>]*/>`))) depth++
          searchPos = checkPos + 1
        } else {
          depth--
          if (depth === 0) {
            const fullElement = trimmed.slice(openTagStart, nextClose + closeTag.length)
            const element = parseJSXElement(fullElement)
            if (element) children.push(element)
            pos = nextClose + closeTag.length
            textStart = pos
          } else {
            searchPos = nextClose + closeTag.length
          }
        }
      }
      if (depth !== 0) pos = openTagStart + 1
    }
    return children
  }

  function generateElement(element, depth) {
    const indent = '  '.repeat(depth)
    const name = TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)
    const parts = [name]

    if (element.style) {
      const props = styleToMirrorProps(element.style)
      if (depth > 0 || !componentDefinitions.has(name)) {
        if (props.length > 0) parts.push(props.join(', '))
      }
    }

    const textChildren = element.children.filter(c => typeof c === 'string')
    if (textChildren.length > 0) {
      const text = textChildren.join(' ').trim()
      if (text && !text.startsWith('{')) parts.push(`"${text}"`)
    }

    let line = indent + parts.join(' ')
    const elementChildren = element.children.filter(c => typeof c !== 'string')
    if (elementChildren.length > 0) {
      const childLines = elementChildren.map(child => generateElement(child, depth + 1))
      line += '\n' + childLines.join('\n')
    }
    return line
  }

  function collectComponentDefinitions(element) {
    const name = TAG_TO_NAME[element.tag] || element.tag.charAt(0).toUpperCase() + element.tag.slice(1)
    if (!componentDefinitions.has(name) && element.style) {
      const baseTag = TAG_TO_COMPONENT[element.tag] || 'frame'
      const props = styleToMirrorProps(element.style)
      if (props.length > 0) {
        componentDefinitions.set(name, `${name} as ${baseTag}:\n  ${props.join(', ')}`)
      }
    }
    for (const child of element.children) {
      if (typeof child !== 'string') collectComponentDefinitions(child)
    }
  }

  try {
    const jsx = extractReturnJSX(reactCode)
    const rootElement = parseJSXElement(jsx.trim())
    if (!rootElement) return { mirror: '', errors: ['Failed to parse JSX'] }

    componentDefinitions.clear()
    collectComponentDefinitions(rootElement)

    const lines = []
    for (const [name, def] of componentDefinitions) {
      lines.push(def)
      lines.push('')
    }
    lines.push(generateElement(rootElement, 0))

    return { mirror: lines.join('\n').trim(), errors: [] }
  } catch (error) {
    return { mirror: '', errors: [error.message] }
  }
}

// Build React generation system prompt
function buildReactSystemPrompt(context) {
  let prompt = `You are a UI developer. Generate React/JSX code for the requested UI.

IMPORTANT RULES:
1. Return ONLY JSX code inside a functional component
2. Use inline styles with camelCase properties
3. Use semantic HTML elements (div, button, span, nav, header, etc.)
4. Keep the code clean and minimal
5. Do NOT include imports or exports
6. Do NOT include explanations - just the code

EXAMPLE OUTPUT:
\`\`\`jsx
function Component() {
  return (
<div style={{ padding: '16px', backgroundColor: '#1A1A23', borderRadius: '8px' }}>
  <span style={{ color: '#E4E4E7' }}>Hello World</span>
</div>
  )
}
\`\`\`

STYLE GUIDELINES:
- Use hex colors (e.g., '#3B82F6')
- Use pixel values for spacing (e.g., '16px', '12px 24px')
- Common properties: padding, backgroundColor, color, borderRadius, display, flexDirection, gap, alignItems, justifyContent`

  // Add tokens as CSS variables
  if (context.tokens.length > 0) {
    prompt += '\n\nAVAILABLE DESIGN TOKENS (use as CSS variables):\n'
    for (const token of context.tokens.slice(0, 20)) {
      prompt += `- var(--${token.name}): ${token.value}\n`
    }
  }

  // Add existing components for style consistency
  if (context.components.length > 0) {
    prompt += '\n\nEXISTING COMPONENTS (for style consistency):\n'
    for (const comp of context.components.slice(0, 10)) {
      prompt += `- ${comp.name}: ${comp.properties.slice(0, 5).join(', ')}\n`
    }
  }

  // Add editor context
  if (context.editor) {
    const ctx = context.editor
    if (ctx.selectedNodeName) {
      prompt += `\n\nEDITOR CONTEXT:\nSelected element: "${ctx.selectedNodeName}"`
      if (ctx.ancestors && ctx.ancestors.length > 0) {
        prompt += `\nLocation: ${ctx.ancestors.join(' → ')} → ${ctx.selectedNodeName}`
      }
    }
    if (ctx.insideComponent) {
      prompt += `\nCursor is inside: "${ctx.insideComponent}"`
    }
    if (ctx.surroundingCode) {
      prompt += `\n\nSurrounding code context:\n${ctx.surroundingCode.before}\n--- CURSOR ---\n${ctx.surroundingCode.after}`
    }
    prompt += `\n\nIMPORTANT: When user says "here", "this", "add X", they refer to the current position/selection.`
  }

  return prompt
}

// ==========================================================================
// Direct Mirror Generation (Alternative Approach)
// ==========================================================================

// Extract context from editor with selection info
function extractContextFromEditor() {
  if (!window.editor) return { tokens: [], components: [], source: '', editor: {} }

  const source = window.editor.state.doc.toString()
  const lines = source.split('\n')
  const cursorPos = window.editor.state.selection.main.head
  const cursorLine = window.editor.state.doc.lineAt(cursorPos).number - 1

  const tokens = []
  const components = []
  let inTokenBlock = false
  let tokenBlockPrefix = ''
  let currentComponent = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const indent = line.length - line.trimStart().length

    if (!trimmed || trimmed.startsWith('//')) continue

    const tokenMatch = trimmed.match(/^\$?([a-zA-Z0-9._-]+)\s*:\s*(#[a-fA-F0-9]{3,8}|\d+)$/)
    if (tokenMatch && indent === 0) {
      tokens.push({ name: tokenMatch[1], value: tokenMatch[2] })
      continue
    }

    const tokenBlockMatch = trimmed.match(/^\$([a-zA-Z0-9._-]+)\s*:\s*$/)
    if (tokenBlockMatch) {
      inTokenBlock = true
      tokenBlockPrefix = tokenBlockMatch[1]
      continue
    }

    if (inTokenBlock && indent > 0) {
      const blockTokenMatch = trimmed.match(/^([a-zA-Z0-9._-]+)\s+(.+)$/)
      if (blockTokenMatch) {
        tokens.push({ name: `${tokenBlockPrefix}.${blockTokenMatch[1]}`, value: blockTokenMatch[2] })
      }
      continue
    } else if (indent === 0) {
      inTokenBlock = false
    }

    const compMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)\s+as\s+(\w+)\s*:/)
    if (compMatch) {
      if (currentComponent) components.push(currentComponent)
      currentComponent = { name: compMatch[1], base: compMatch[2], properties: [] }
      continue
    }

    if (currentComponent && indent > 0) {
      const props = trimmed.split(',').map(p => p.trim().split(' ')[0])
      currentComponent.properties.push(...props.filter(p => p && !p.startsWith('//')))
    }

    if (currentComponent && indent === 0 && !trimmed.match(/^[A-Z]/)) {
      components.push(currentComponent)
      currentComponent = null
    }
  }
  if (currentComponent) components.push(currentComponent)

  // Get selection from SelectionManager if available
  let selectedNodeId = null
  let selectedNodeName = null
  let ancestors = []

  if (window.selectionManager) {
    selectedNodeId = window.selectionManager.getSelected()
    const breadcrumb = window.selectionManager.getBreadcrumb?.() || []
    if (breadcrumb.length > 0) {
      ancestors = breadcrumb.slice(0, -1).map(b => b.name)
      selectedNodeName = breadcrumb[breadcrumb.length - 1]?.name
    }
  }

  // Find which component cursor is inside
  let insideComponent = null
  for (let i = cursorLine; i >= 0; i--) {
    const line = lines[i]
    const indent = line.length - line.trimStart().length
    if (indent === 0 && line.trim()) {
      const match = line.trim().match(/^([A-Z][a-zA-Z0-9]*)/)
      if (match) { insideComponent = match[1]; break }
    }
  }

  // Surrounding code
  const contextLines = 5
  const beforeLines = lines.slice(Math.max(0, cursorLine - contextLines), cursorLine)
  const afterLines = lines.slice(cursorLine + 1, cursorLine + 1 + contextLines)

  return {
    tokens, components, source,
    editor: {
      cursorLine,
      selectedNodeId,
      selectedNodeName,
      ancestors,
      insideComponent,
      surroundingCode: { before: beforeLines.join('\n'), after: afterLines.join('\n') }
    }
  }
}

// Golden Example for empty apps
const GOLDEN_EXAMPLE = `// Tokens - Palette
$grey-950: #09090B
$grey-900: #18181B
$grey-800: #27272A
$grey-700: #3F3F46
$grey-500: #71717A
$grey-300: #D4D4D8
$grey-100: #F4F4F5

$blue-500: #3B82F6
$blue-600: #2563EB

// Tokens - Semantic
$app.bg: $grey-950
$surface.bg: $grey-900
$card.bg: $grey-800
$hover.bg: $grey-700

$heading.col: $grey-100
$text.col: $grey-300
$muted.col: $grey-500

$primary.bg: $blue-500
$primary.hover.bg: $blue-600

$sm.pad: 8
$md.pad: 12
$lg.pad: 16

$sm.gap: 8
$md.gap: 12

$sm.rad: 4
$md.rad: 6

// Components
Heading: col $heading.col, weight bold, font-size 18
Body: col $text.col, font-size 13
Muted: col $muted.col, font-size 12

Button: pad $sm.pad $md.pad, bg $primary.bg, col white, rad $sm.rad, cursor pointer
  hover bg $primary.hover.bg

Card: pad $lg.pad, bg $card.bg, rad $md.rad, gap $md.gap

NavItem: hor, gap $sm.gap, pad $sm.pad $md.pad, rad $sm.rad, cursor pointer
  Icon: is 18, col $muted.col
  Label: col $text.col
  hover bg $hover.bg

// App
App hor, w full, h full, bg $app.bg

  Sidebar w 220, h full, bg $surface.bg, pad $md.pad, gap $md.gap
    Heading "App Name", font-size 15
    Nav gap 4
      NavItem Icon "home"; Label "Home"
      NavItem Icon "settings"; Label "Settings"

  Main w full, pad $lg.pad, gap $lg.pad
    Heading "Welcome"
    Card
      Body "Your content here."`

// Mirror DSL System Prompt
const MIRROR_SYSTEM_PROMPT = `Du schreibst UI-Code in Mirror DSL. Antworte NUR mit validem Mirror-Code.

## Syntax-Kurzreferenz

// Komponente definieren (mit Doppelpunkt)
Button: pad 12, bg #3B82F6, rad 4

// Komponente verwenden (ohne Doppelpunkt)
Button "Click me"

// Vererbung
DangerButton as Button: bg #EF4444

// Kinder (eingerückt)
Card
  Title "Hello"
  Body "Content"

// Child-Overrides (Semicolon)
NavItem Icon "home"; Label "Dashboard"

// States
Button: bg #3B82F6
  hover bg #2563EB
  state disabled bg #666

// Events
Button onclick toggle Modal
Input oninput filter Results

// Conditionals
if isActive
  ActiveView
else
  InactiveView

// Iteration
each item in items
  Card item.title

## Properties

Layout: hor, ver, center, spread, gap N, wrap, grid N
Size: w N/full/hug, h N/full/hug, minw, maxw, minh, maxh
Spacing: pad N, pad N N, pad left N, margin N
Color: bg, col, bor [width] [color], boc
Radius: rad N, rad tl N br N
Type: font-size, weight, italic, underline, truncate
Icon: is (size), iw (weight), ic (color), fill
Visual: opacity, shadow sm/md/lg, cursor, hidden, z
Scroll: scroll, scroll-hor, clip

## Primitives

Box, Text, Button, Input, Textarea, Image, Icon, Link

## Icons (Lucide)

home, settings, user, search, x, check, plus, edit, trash, bell, mail,
star, heart, arrow-left, chevron-down, eye, lock, filter, download, upload

## Regeln

1. Tokens oben definieren, dann referenzieren ($name)
2. Komponenten vor Instanzen definieren
3. Semantische Token-Namen ($primary.bg nicht $blue)
4. Existierende Patterns im Code folgen
5. Keine Magic Numbers - Tokens verwenden`

// Build Mirror generation system prompt
function buildMirrorSystemPrompt(context) {
  let prompt = MIRROR_SYSTEM_PROMPT

  // Check if code is empty - inject golden example
  const hasContent = context.source && context.source.trim().length > 0

  if (!hasContent) {
    prompt += `\n\n## Vorlage für neue App

Strukturiere deinen Code wie dieses Beispiel:

\`\`\`mirror
${GOLDEN_EXAMPLE}
\`\`\`

Passe das Beispiel an die Anfrage an.`
  } else {
    // Add existing tokens
    if (context.tokens.length > 0) {
      prompt += '\n\n## Verfügbare Tokens (verwende diese, erfinde keine neuen)\n\n'
      for (const token of context.tokens.slice(0, 30)) {
        prompt += `$${token.name}: ${token.value}\n`
      }
    }

    // Add existing components for style consistency
    if (context.components.length > 0) {
      prompt += '\n\n## Existierende Komponenten (folge diesem Stil)\n\n'
      for (const comp of context.components.slice(0, 10)) {
        prompt += `${comp.name}: ${comp.properties.slice(0, 8).join(', ')}\n`
      }
    }
  }

  // Add editor context
  if (context.editor) {
    const ctx = context.editor
    if (ctx.selectedNodeName || ctx.insideComponent) {
      prompt += '\n\n## Editor-Kontext\n'
      if (ctx.selectedNodeName) {
        prompt += `Selektiert: "${ctx.selectedNodeName}"\n`
        if (ctx.ancestors && ctx.ancestors.length > 0) {
          prompt += `Position: ${ctx.ancestors.join(' → ')} → ${ctx.selectedNodeName}\n`
        }
      }
      if (ctx.insideComponent) {
        prompt += `Cursor in: "${ctx.insideComponent}"\n`
      }
    }
    if (ctx.surroundingCode && (ctx.surroundingCode.before || ctx.surroundingCode.after)) {
      prompt += `\nUmgebender Code:\n${ctx.surroundingCode.before}\n--- CURSOR ---\n${ctx.surroundingCode.after}\n`
    }
    prompt += '\nWenn User "hier", "das", "hinzufügen" sagt, bezieht es sich auf die aktuelle Position.'
  }

  prompt += '\n\nAntworte NUR mit Mirror-Code. Keine Erklärungen.'

  return prompt
}

async function generateFromPrompt() {
  const promptInput = document.getElementById('prompt-input')
  const userPrompt = promptInput.value.trim()
  if (!userPrompt) return

  let apiKey = getApiKey()
  if (!apiKey) {
    apiKey = promptForApiKey()
    if (!apiKey) return
  }

  const btn = document.getElementById('generate-btn')
  const originalContent = btn.innerHTML

  // Loading state
  const ESTIMATED_TIME = 30
  let elapsed = 0

  btn.innerHTML = `
    <svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2v4m0 12v4m-8-10h4m12 0h4m-4.93-5.07l-2.83 2.83m-6.48 6.48l-2.83 2.83m0-12.14l2.83 2.83m6.48 6.48l2.83 2.83"/>
    </svg>
    <span>Generating</span>
    <span class="generation-timer">0s</span>
    <div class="generation-progress"><div class="generation-progress-bar"></div></div>
  `
  btn.disabled = true
  btn.style.opacity = '0.7'
  promptInput.disabled = true

  const timerEl = btn.querySelector('.generation-timer')
  const progressBar = btn.querySelector('.generation-progress-bar')
  const timerInterval = setInterval(() => {
    elapsed++
    timerEl.textContent = `${elapsed}s`
    progressBar.style.width = `${Math.min((elapsed / ESTIMATED_TIME) * 100, 95)}%`
  }, 1000)

  try {
    // Step 1: Extract context
    const context = extractContextFromEditor()
    const systemPrompt = buildMirrorSystemPrompt(context)

    console.log('🚀 Generating with prompt:', userPrompt)
    console.log('📋 Context:', context)

    // Step 2: Call LLM for Mirror code directly
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin || 'https://mirror-studio.local',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-sonnet-4.6',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    })

    const data = await response.json()
    console.log('📨 LLM Response:', data)

    if (data.error) throw new Error(data.error.message || 'API Error')

    let mirrorCode = data.choices[0].message.content

    // Extract code from markdown if wrapped
    const codeBlockMatch = mirrorCode.match(/```(?:mirror)?\s*\n?([\s\S]*?)```/)
    if (codeBlockMatch) {
      mirrorCode = codeBlockMatch[1].trim()
    } else {
      // Clean up any leading/trailing explanation text
      mirrorCode = mirrorCode.trim()
    }

    console.log('🪞 Mirror code:', mirrorCode)

    if (!mirrorCode) {
      throw new Error('LLM returned empty result')
    }

    // Step 3: Insert into editor
    if (window.editor) {
      const state = window.editor.state
      const cursorPos = state.selection.main.head
      const hasContent = context.source && context.source.trim().length > 0

      let insertText
      if (!hasContent) {
        // Empty editor - replace everything
        window.editor.dispatch({
          changes: { from: 0, to: state.doc.length, insert: mirrorCode }
        })
      } else {
        // Has content - insert at cursor
        insertText = '\n\n' + mirrorCode
        if (context.editor.insideComponent) {
          // Add proper indentation for nested insertion
          const lines = mirrorCode.split('\n')
          const indentedLines = lines.map(line => line.trim() ? '  ' + line : line)
          insertText = '\n' + indentedLines.join('\n')
        }

        window.editor.dispatch({
          changes: { from: cursorPos, insert: insertText },
          selection: { anchor: cursorPos + insertText.length }
        })
      }

      window.editor.focus()
    }

    promptInput.value = ''
    console.log('✅ Generation complete!')

  } catch (err) {
    console.error('❌ Generation error:', err)
    alert(`Generierung fehlgeschlagen: ${err.message}`)
  } finally {
    clearInterval(timerInterval)
    btn.innerHTML = originalContent
    btn.disabled = false
    btn.style.opacity = ''
    promptInput.disabled = false
    promptInput.focus()
  }
}

// Make function globally accessible (module scope workaround)
window.generateFromPrompt = generateFromPrompt

// Setup event listeners after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const promptInput = document.getElementById('prompt-input')
  const generateBtn = document.getElementById('generate-btn')

  if (promptInput) {
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        generateFromPrompt()
      }
    })
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', generateFromPrompt)
  }
})

