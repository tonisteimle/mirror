import { EditorState, RangeSetBuilder, Prec, Annotation, Transaction } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, drawSelection, Decoration, ViewPlugin } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { autocompletion, completionKeymap, startCompletion, closeCompletion } from '@codemirror/autocomplete'

// New architecture imports
import {
  initializeStudio as initNewStudio,
  updateStudioState,
  studio,
  handleSelectionChange as newHandleSelectionChange,
  events,
  executor,
  RecordedChangeCommand,
  actions as studioActions,
  mirrorCompletions,
  getStateSelectionAdapter,
} from './dist/index.js?v=41'

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
const DEBUG_SYNC = false  // Enable verbose sync logging
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

  // Detect file types for files that don't have a stored type
  for (const filename of Object.keys(files)) {
    if (!fileTypes[filename]) {
      fileTypes[filename] = detectFileType(files[filename])
    }
  }
  localStorage.setItem(FILE_TYPES_KEY, JSON.stringify(fileTypes))

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

  // Detect file types for all files
  for (const filename of Object.keys(files)) {
    fileTypes[filename] = detectFileType(files[filename])
  }
  localStorage.setItem(FILE_TYPES_KEY, JSON.stringify(fileTypes))

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
  const baseName = item.filename.replace('.mirror', '')
  const canDelete = fileCount > 1
  const fileIcon = getFileIcon(filePath)

  return `
    <div class="file ${filePath === currentFile ? 'active' : ''}" data-file="${filePath}">
      ${fileIcon}
      <span class="file-name" data-filename="${filePath}">${baseName}</span>
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
      const baseName = filename.replace(/\.mirror$/, '')
      const canDelete = fileCount > 1
      const fileIcon = getFileIcon(filename)
      return `
        <div class="file ${filename === currentFile ? 'active' : ''}" data-file="${filename}">
          ${fileIcon}
          <span class="file-name" data-filename="${filename}">${baseName}</span>
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

// Mode tabs (MIRROR / REACT)
let currentMode = 'mirror'
const reactFiles = {} // Cache for converted React files: { 'index.tsx': '...', ... }

// Helper to update status bar
function setModeStatus(message, type = 'ok') {
  const statusEl = document.getElementById('status')
  if (statusEl) {
    statusEl.textContent = message
    statusEl.className = type === 'error' ? 'status error' : 'status ok'
  }
}

document.querySelectorAll('.mode-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.mode === currentMode) return

    const newMode = tab.dataset.mode

    // Switch from Mirror to React
    if (currentMode === 'mirror' && newMode === 'react') {
      try {
        // Save current editor content to files
        const currentContent = window.editor.state.doc.toString()
        files[currentFile] = currentContent

        // SET MODE FIRST to prevent compiler from running on React code
        currentMode = 'react'

        // Convert ALL mirror files to React
        Object.keys(reactFiles).forEach(k => delete reactFiles[k]) // Clear cache

        for (const [filePath, content] of Object.entries(files)) {
          if (!filePath.endsWith('.mirror')) continue
          try {
            const ast = Mirror.parse(content)
            const reactCode = Mirror.generateReact(ast)
            const reactPath = filePath.replace('.mirror', '.tsx')
            reactFiles[reactPath] = reactCode
          } catch (e) {
            console.warn(`Error converting ${filePath}:`, e)
            const reactPath = filePath.replace('.mirror', '.tsx')
            reactFiles[reactPath] = `// Conversion error for ${filePath}\n// ${e.message}`
          }
        }

        // Switch current file to .tsx equivalent
        const reactCurrentFile = currentFile.replace('.mirror', '.tsx')
        currentFile = reactCurrentFile

        // Update editor with current React file
        window.editor.dispatch({
          changes: { from: 0, to: window.editor.state.doc.length, insert: reactFiles[reactCurrentFile] || '' }
        })

        // Re-render file list with .tsx files
        renderFileListForMode('react')

        setModeStatus('React mode - ' + Object.keys(reactFiles).length + ' files')

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        return // Early return since we already set everything
      } catch (e) {
        console.error('Error switching to React mode:', e)
        currentMode = 'mirror' // Revert on error
        setModeStatus('Conversion error: ' + e.message, 'error')
        return
      }
    }

    // Switch from React to Mirror
    if (currentMode === 'react' && newMode === 'mirror') {
      try {
        // Save current React editor content
        const currentContent = window.editor.state.doc.toString()
        reactFiles[currentFile] = currentContent

        // SET MODE FIRST
        currentMode = 'mirror'

        // Convert ALL React files back to Mirror
        for (const [filePath, content] of Object.entries(reactFiles)) {
          if (!filePath.endsWith('.tsx')) continue
          try {
            const mirrorCode = Mirror.convertToMirrorCode(content)
            const mirrorPath = filePath.replace('.tsx', '.mirror')
            files[mirrorPath] = mirrorCode
          } catch (e) {
            console.warn(`Error converting ${filePath} back to Mirror:`, e)
            // Keep original mirror file if conversion fails
          }
        }

        // Switch current file to .mirror equivalent
        const mirrorCurrentFile = currentFile.replace('.tsx', '.mirror')
        currentFile = mirrorCurrentFile

        // Update editor with current Mirror file
        window.editor.dispatch({
          changes: { from: 0, to: window.editor.state.doc.length, insert: files[mirrorCurrentFile] || '' }
        })

        // Re-render file list with .mirror files
        renderFileList()

        // Trigger recompile
        compile(files[currentFile] || '')

        setModeStatus('Mirror mode')

        // Update tab UI
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        return
      } catch (e) {
        console.error('Error switching to Mirror mode:', e)
        currentMode = 'react' // Revert on error
        setModeStatus('Conversion error: ' + e.message, 'error')
        return
      }
    }
  })
})

// Render file list for React mode (shows .tsx files)
function renderFileListForMode(mode) {
  if (mode === 'mirror') {
    renderFileList()
    return
  }

  // React mode - render .tsx files
  const container = document.getElementById('file-list')
  const fileCount = Object.keys(reactFiles).length

  const itemsHtml = Object.keys(reactFiles).map(filePath => {
    const displayName = filePath.split('/').pop()  // Keep .tsx extension
    const isActive = filePath === currentFile

    return `
      <div class="file ${isActive ? 'active' : ''}" data-file="${filePath}">
        <svg viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" width="16" height="16">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="file-name" data-filename="${filePath}">${displayName}</span>
      </div>
    `
  }).join('')

  container.innerHTML = itemsHtml

  // File click handlers for React mode
  container.querySelectorAll('.file').forEach(el => {
    el.addEventListener('click', (e) => {
      switchFileReactMode(el.dataset.file)
    })
  })
}

// Switch file in React mode
function switchFileReactMode(filename) {
  if (typeof editor === 'undefined') return

  // Save current React file
  const currentContent = editor.state.doc.toString()
  reactFiles[currentFile] = currentContent

  // Switch to new file
  currentFile = filename
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: reactFiles[filename] || '' }
  })

  // Update active state in UI
  document.querySelectorAll('.file').forEach(f => f.classList.remove('active'))
  document.querySelector(`[data-file="${filename}"]`)?.classList.add('active')
}

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
    extension: '.mir',
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
    extension: '.com',
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
    extension: '.tok',
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
  const fileType = FILE_TYPES[type] || FILE_TYPES.layout
  if (withColor) {
    return fileType.icon.replace('stroke="currentColor"', `stroke="${fileType.color}"`)
  }
  return fileType.icon
}

// Get file type color
function getFileTypeColor(filename) {
  const type = getFileType(filename)
  return (FILE_TYPES[type] || FILE_TYPES.layout).color
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


// Autocomplete - using modular engine from studio/autocomplete/
// mirrorCompletions is imported from ./dist/index.js
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

// Tailwind CSS v3 Colors
const TAILWIND_COLORS = [
  { name: 'slate', shades: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'] },
  { name: 'gray', shades: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827'] },
  { name: 'zinc', shades: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b'] },
  { name: 'red', shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d'] },
  { name: 'orange', shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12'] },
  { name: 'amber', shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'] },
  { name: 'yellow', shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12'] },
  { name: 'lime', shades: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314'] },
  { name: 'green', shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'] },
  { name: 'emerald', shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b'] },
  { name: 'teal', shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a'] },
  { name: 'cyan', shades: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'] },
  { name: 'sky', shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e'] },
  { name: 'blue', shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  { name: 'indigo', shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'] },
  { name: 'violet', shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'] },
  { name: 'purple', shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87'] },
  { name: 'fuchsia', shades: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75'] },
  { name: 'pink', shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843'] },
  { name: 'rose', shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337'] },
]

// Material Design Colors
const MATERIAL_COLORS = [
  { name: 'red', shades: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828', '#b71c1c'] },
  { name: 'pink', shades: ['#fce4ec', '#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#e91e63', '#d81b60', '#c2185b', '#ad1457', '#880e4f'] },
  { name: 'purple', shades: ['#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc', '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c'] },
  { name: 'deepPurple', shades: ['#ede7f6', '#d1c4e9', '#b39ddb', '#9575cd', '#7e57c2', '#673ab7', '#5e35b1', '#512da8', '#4527a0', '#311b92'] },
  { name: 'indigo', shades: ['#e8eaf6', '#c5cae9', '#9fa8da', '#7986cb', '#5c6bc0', '#3f51b5', '#3949ab', '#303f9f', '#283593', '#1a237e'] },
  { name: 'blue', shades: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1'] },
  { name: 'lightBlue', shades: ['#e1f5fe', '#b3e5fc', '#81d4fa', '#4fc3f7', '#29b6f6', '#03a9f4', '#039be5', '#0288d1', '#0277bd', '#01579b'] },
  { name: 'cyan', shades: ['#e0f7fa', '#b2ebf2', '#80deea', '#4dd0e1', '#26c6da', '#00bcd4', '#00acc1', '#0097a7', '#00838f', '#006064'] },
  { name: 'teal', shades: ['#e0f2f1', '#b2dfdb', '#80cbc4', '#4db6ac', '#26a69a', '#009688', '#00897b', '#00796b', '#00695c', '#004d40'] },
  { name: 'green', shades: ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#43a047', '#388e3c', '#2e7d32', '#1b5e20'] },
  { name: 'lightGreen', shades: ['#f1f8e9', '#dcedc8', '#c5e1a5', '#aed581', '#9ccc65', '#8bc34a', '#7cb342', '#689f38', '#558b2f', '#33691e'] },
  { name: 'lime', shades: ['#f9fbe7', '#f0f4c3', '#e6ee9c', '#dce775', '#d4e157', '#cddc39', '#c0ca33', '#afb42b', '#9e9d24', '#827717'] },
  { name: 'yellow', shades: ['#fffde7', '#fff9c4', '#fff59d', '#fff176', '#ffee58', '#ffeb3b', '#fdd835', '#fbc02d', '#f9a825', '#f57f17'] },
  { name: 'amber', shades: ['#fff8e1', '#ffecb3', '#ffe082', '#ffd54f', '#ffca28', '#ffc107', '#ffb300', '#ffa000', '#ff8f00', '#ff6f00'] },
  { name: 'orange', shades: ['#fff3e0', '#ffe0b2', '#ffcc80', '#ffb74d', '#ffa726', '#ff9800', '#fb8c00', '#f57c00', '#ef6c00', '#e65100'] },
  { name: 'deepOrange', shades: ['#fbe9e7', '#ffccbc', '#ffab91', '#ff8a65', '#ff7043', '#ff5722', '#f4511e', '#e64a19', '#d84315', '#bf360c'] },
  { name: 'brown', shades: ['#efebe9', '#d7ccc8', '#bcaaa4', '#a1887f', '#8d6e63', '#795548', '#6d4c41', '#5d4037', '#4e342e', '#3e2723'] },
  { name: 'grey', shades: ['#fafafa', '#f5f5f5', '#eeeeee', '#e0e0e0', '#bdbdbd', '#9e9e9e', '#757575', '#616161', '#424242', '#212121'] },
  { name: 'blueGrey', shades: ['#eceff1', '#cfd8dc', '#b0bec5', '#90a4ae', '#78909c', '#607d8b', '#546e7a', '#455a64', '#37474f', '#263238'] },
]

const colorPicker = document.getElementById('color-picker')
const colorPickerGrid = document.getElementById('color-picker-grid')
const colorPickerTailwindGrid = document.getElementById('color-picker-tailwind-grid')
const colorPickerMaterialGrid = document.getElementById('color-picker-material-grid')
const colorPickerTokenGrid = document.getElementById('color-picker-token-grid')
const colorPreview = document.getElementById('color-preview')
const colorHex = document.getElementById('color-hex')
let colorPickerVisible = false
let colorPickerInsertPos = null
let colorPickerReplaceRange = null // { from, to } for replacing existing colors
let colorPickerProperty = null // Current property type (bg, col, etc.)
let colorPickerCallback = null // Callback for property panel mode

// Hash trigger state (for typing # to open color picker)
let hashTriggerActive = false
let hashTriggerStartPos = null
let selectedSwatchIndex = 0
let colorSwatchElements = []
const SWATCH_COLUMNS = 13  // Number of color columns in grid (Open Color)
const SWATCH_ROWS = 10    // Number of shades per color

// Color picker tab state
let currentColorTab = 'custom' // 'custom', 'tailwind', 'open', 'material'

// Custom color picker state (HSV)
let customColorState = {
  h: 220,  // Hue (0-360)
  s: 100,  // Saturation (0-100)
  v: 100,  // Value/Brightness (0-100)
  a: 1     // Alpha (0-1)
}

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

// Build Tailwind color grid
function buildTailwindColorGrid() {
  colorPickerTailwindGrid.innerHTML = ''
  TAILWIND_COLORS.forEach((scale) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
    })
    colorPickerTailwindGrid.appendChild(col)
  })
}
buildTailwindColorGrid()

// Build Material color grid
function buildMaterialColorGrid() {
  colorPickerMaterialGrid.innerHTML = ''
  MATERIAL_COLORS.forEach((scale) => {
    const col = document.createElement('div')
    col.className = 'color-picker-column'
    scale.shades.forEach((hex) => {
      const btn = document.createElement('button')
      btn.className = 'color-swatch'
      btn.style.backgroundColor = hex
      btn.dataset.color = hex
      btn.addEventListener('mouseenter', () => {
        colorPreview.style.backgroundColor = hex
        colorHex.textContent = hex.toUpperCase()
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        selectColor(hex.toUpperCase())
      })
      col.appendChild(btn)
    })
    colorPickerMaterialGrid.appendChild(col)
  })
}
buildMaterialColorGrid()

// Tab switching
function initColorPickerTabs() {
  const tabs = colorPicker.querySelectorAll('.color-picker-tab')
  const contents = colorPicker.querySelectorAll('.color-picker-content')

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab
      currentColorTab = tabName

      // Update tab active state
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')

      // Update content visibility
      contents.forEach(c => c.classList.remove('active'))
      const content = document.getElementById(`color-picker-${tabName}`)
      if (content) content.classList.add('active')

      // Initialize custom picker canvas if needed
      if (tabName === 'custom') {
        drawColorArea()
        updateHueSlider()
        updateAlphaSlider()
      }
    })
  })
}
initColorPickerTabs()

// ==========================================
// Custom Color Picker (Figma-style)
// ==========================================

const colorPickerArea = document.getElementById('color-picker-area')
const colorPickerHue = document.getElementById('color-picker-hue')
const colorPickerHueThumb = document.getElementById('color-picker-hue-thumb')
const colorPickerAlpha = document.getElementById('color-picker-alpha')
const colorPickerAlphaThumb = document.getElementById('color-picker-alpha-thumb')
const colorPickerHexInput = document.getElementById('color-picker-hex-input')
const colorPickerOpacityInput = document.getElementById('color-picker-opacity-input')
const colorPickerEyedropper = document.getElementById('color-picker-eyedropper')

let colorAreaDragging = false
let hueDragging = false
let alphaDragging = false

// HSV to RGB conversion
function hsvToRgb(h, s, v) {
  s /= 100
  v /= 100
  const c = v * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = v - c
  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

// RGB to Hex
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Hex to RGB
function hexToRgb(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}

// RGB to HSV
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max
  if (max !== min) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return { h: h * 360, s: s * 100, v: v * 100 }
}

// Get current color as hex
function getCurrentColorHex() {
  const rgb = hsvToRgb(customColorState.h, customColorState.s, customColorState.v)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

// Draw the color area (saturation/brightness)
function drawColorArea() {
  if (!colorPickerArea) return
  const ctx = colorPickerArea.getContext('2d')
  const width = colorPickerArea.width
  const height = colorPickerArea.height

  // Clear
  ctx.clearRect(0, 0, width, height)

  // Base hue color
  const hueRgb = hsvToRgb(customColorState.h, 100, 100)
  ctx.fillStyle = `rgb(${hueRgb.r}, ${hueRgb.g}, ${hueRgb.b})`
  ctx.fillRect(0, 0, width, height)

  // White gradient (left to right)
  const whiteGrad = ctx.createLinearGradient(0, 0, width, 0)
  whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)')
  whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = whiteGrad
  ctx.fillRect(0, 0, width, height)

  // Black gradient (top to bottom)
  const blackGrad = ctx.createLinearGradient(0, 0, 0, height)
  blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
  blackGrad.addColorStop(1, 'rgba(0, 0, 0, 1)')
  ctx.fillStyle = blackGrad
  ctx.fillRect(0, 0, width, height)

  // Draw cursor
  const cursorX = (customColorState.s / 100) * width
  const cursorY = (1 - customColorState.v / 100) * height
  ctx.beginPath()
  ctx.arc(cursorX, cursorY, 6, 0, Math.PI * 2)
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cursorX, cursorY, 7, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()
}

// Update hue slider thumb position
function updateHueSlider() {
  if (!colorPickerHueThumb) return
  const percent = customColorState.h / 360 * 100
  colorPickerHueThumb.style.left = `${percent}%`
}

// Update alpha slider
function updateAlphaSlider() {
  if (!colorPickerAlpha || !colorPickerAlphaThumb) return
  const hex = getCurrentColorHex()
  colorPickerAlpha.style.backgroundImage = `
    linear-gradient(to right, transparent, ${hex}),
    repeating-conic-gradient(#404040 0% 25%, #606060 0% 50%)
  `
  colorPickerAlphaThumb.style.left = `${customColorState.a * 100}%`
}

// Update all color displays
function updateColorDisplays() {
  const hex = getCurrentColorHex()
  colorPreview.style.backgroundColor = hex
  colorHex.textContent = hex
  if (colorPickerHexInput) {
    colorPickerHexInput.value = hex.replace('#', '')
  }
  if (colorPickerOpacityInput) {
    colorPickerOpacityInput.value = Math.round(customColorState.a * 100) + '%'
  }
  updateAlphaSlider()
}

// Color area mouse events
if (colorPickerArea) {
  colorPickerArea.addEventListener('mousedown', (e) => {
    colorAreaDragging = true
    handleColorAreaMove(e)
  })
}

function handleColorAreaMove(e) {
  if (!colorPickerArea) return
  const rect = colorPickerArea.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
  customColorState.s = (x / rect.width) * 100
  customColorState.v = (1 - y / rect.height) * 100
  drawColorArea()
  updateColorDisplays()
}

// Hue slider mouse events
if (colorPickerHue) {
  colorPickerHue.addEventListener('mousedown', (e) => {
    hueDragging = true
    handleHueMove(e)
  })
}

function handleHueMove(e) {
  if (!colorPickerHue) return
  const rect = colorPickerHue.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  customColorState.h = (x / rect.width) * 360
  updateHueSlider()
  drawColorArea()
  updateColorDisplays()
}

// Alpha slider mouse events
if (colorPickerAlpha) {
  colorPickerAlpha.addEventListener('mousedown', (e) => {
    alphaDragging = true
    handleAlphaMove(e)
  })
}

function handleAlphaMove(e) {
  if (!colorPickerAlpha) return
  const rect = colorPickerAlpha.getBoundingClientRect()
  const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  customColorState.a = x / rect.width
  updateAlphaSlider()
  updateColorDisplays()
}

// Global mouse move/up for sliders
document.addEventListener('mousemove', (e) => {
  if (colorAreaDragging) handleColorAreaMove(e)
  if (hueDragging) handleHueMove(e)
  if (alphaDragging) handleAlphaMove(e)
})

document.addEventListener('mouseup', () => {
  colorAreaDragging = false
  hueDragging = false
  alphaDragging = false
})

// Hex input
if (colorPickerHexInput) {
  colorPickerHexInput.addEventListener('input', (e) => {
    let hex = e.target.value.replace('#', '')
    if (hex.length === 6 && /^[0-9A-Fa-f]+$/.test(hex)) {
      const rgb = hexToRgb(hex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      customColorState.h = hsv.h
      customColorState.s = hsv.s
      customColorState.v = hsv.v
      drawColorArea()
      updateHueSlider()
      updateColorDisplays()
    }
  })

  colorPickerHexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const hex = '#' + colorPickerHexInput.value.toUpperCase()
      selectColor(hex)
    }
  })
}

// Opacity input
if (colorPickerOpacityInput) {
  colorPickerOpacityInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value.replace('%', ''))
    if (!isNaN(val)) {
      customColorState.a = Math.max(0, Math.min(100, val)) / 100
      updateAlphaSlider()
    }
  })
}

// Eyedropper (if supported)
if (colorPickerEyedropper && 'EyeDropper' in window) {
  colorPickerEyedropper.addEventListener('click', async () => {
    try {
      const eyeDropper = new EyeDropper()
      const result = await eyeDropper.open()
      const rgb = hexToRgb(result.sRGBHex)
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
      customColorState.h = hsv.h
      customColorState.s = hsv.s
      customColorState.v = hsv.v
      drawColorArea()
      updateHueSlider()
      updateColorDisplays()
    } catch (e) {
      // User cancelled or error
    }
  })
} else if (colorPickerEyedropper) {
  colorPickerEyedropper.style.display = 'none'
}

// Set color from hex (used when opening picker with existing color)
function setCustomColorFromHex(hex) {
  if (!hex) return
  const rgb = hexToRgb(hex)
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b)
  customColorState.h = hsv.h
  customColorState.s = hsv.s
  customColorState.v = hsv.v
  drawColorArea()
  updateHueSlider()
  updateColorDisplays()
}

// ==========================================
// Token Colors for Color Picker
// ==========================================

// Property → token suffix mapping for filtering
const COLOR_PROPERTY_SUFFIXES = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  ic: '.col',
  'icon-color': '.col',
}

// Extract color tokens from files
function extractColorTokens() {
  const tokens = []

  // Iterate through all files
  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue

    // Match token definitions: $name: #hex or name: #hex
    const lines = content.split('\n')
    for (const line of lines) {
      // Match patterns like: $primary.bg: #3B82F6 or primary: #3B82F6
      const tokenMatch = line.match(/^\s*\$?([\w.-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*(?:\/\/.*)?$/)
      if (tokenMatch) {
        const name = tokenMatch[1]
        const value = tokenMatch[2]
        tokens.push({ name: '$' + name, value: value.toUpperCase() })
      }
    }
  }

  return tokens
}

// Build token colors section based on property type
function buildTokenColors(property) {
  if (!colorPickerTokenGrid) return

  colorPickerTokenGrid.innerHTML = ''

  // Get the suffix for this property
  const suffix = property ? COLOR_PROPERTY_SUFFIXES[property] : null

  // Extract all color tokens
  const allTokens = extractColorTokens()

  // Filter tokens based on suffix
  let filteredTokens = allTokens
  if (suffix) {
    filteredTokens = allTokens.filter(t => t.name.endsWith(suffix))
  }

  // If no matching tokens, show all color tokens
  if (filteredTokens.length === 0) {
    filteredTokens = allTokens.filter(t => /^#[0-9A-Fa-f]{6}$/i.test(t.value))
  }

  // Limit to first 14 tokens (2 rows of 7)
  filteredTokens = filteredTokens.slice(0, 14)

  // Update label
  const label = colorPicker.querySelector('.color-picker-label')
  if (label) {
    if (suffix) {
      label.textContent = `Tokens (${suffix})`
    } else {
      label.textContent = 'Tokens'
    }
  }

  // Create swatches
  filteredTokens.forEach(token => {
    const btn = document.createElement('button')
    btn.className = 'token-swatch'
    btn.style.backgroundColor = token.value
    btn.dataset.token = token.name
    btn.dataset.color = token.value
    btn.title = token.name

    btn.addEventListener('mouseenter', () => {
      colorPreview.style.backgroundColor = token.value
      colorHex.textContent = token.name
    })

    btn.addEventListener('click', (e) => {
      e.preventDefault()
      // Insert token name instead of hex value
      selectColor(token.name)
    })

    colorPickerTokenGrid.appendChild(btn)
  })

  // Hide section if no tokens
  const section = document.getElementById('color-picker-tokens')
  if (section) {
    section.style.display = filteredTokens.length > 0 ? 'block' : 'none'
  }
}

function showColorPicker(x, y, insertPos, replaceRange = null, initialColor = null, isHashTrigger = false, hashStartPos = null, property = null, callback = null) {
  colorPickerInsertPos = insertPos
  colorPickerReplaceRange = replaceRange
  hashTriggerActive = isHashTrigger
  hashTriggerStartPos = hashStartPos
  colorPickerProperty = property
  colorPickerCallback = callback || null

  // Smart positioning: check if picker fits below, otherwise show above
  const pickerHeight = 400 // Approximate height of color picker
  const pickerWidth = 260 // Approximate width of color picker
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const margin = 8

  // Calculate final position
  let finalX = x
  let finalY = y

  // Check vertical: if not enough space below, position above
  if (y + pickerHeight > viewportHeight - margin) {
    // Position above the trigger (subtract picker height and some offset for the trigger element)
    finalY = Math.max(margin, y - pickerHeight - 36)
  }

  // Check horizontal: if not enough space to the right, position to the left of the trigger
  if (x + pickerWidth > viewportWidth - margin) {
    // Position picker to the left of the trigger point
    finalX = Math.max(margin, x - pickerWidth - 8)
  }

  colorPicker.style.left = finalX + 'px'
  colorPicker.style.top = finalY + 'px'
  colorPicker.classList.add('visible')
  colorPickerVisible = true
  const displayColor = initialColor || '#3b82f6'
  colorPreview.style.backgroundColor = displayColor
  colorHex.textContent = displayColor.toUpperCase()

  // Initialize custom color picker with current color
  if (displayColor) {
    setCustomColorFromHex(displayColor)
  }

  // Build token colors for this property
  buildTokenColors(property)

  // Reset and show selection for hash trigger mode
  if (isHashTrigger) {
    // Start selection at blue-500 (#3b82f6) which is column 4 (blue), row 5 (500)
    selectedSwatchIndex = 4 * SWATCH_ROWS + 5
    updateSelectedSwatch()
  } else {
    // Clear selection for non-hash mode
    colorSwatchElements.forEach(el => el.classList.remove('selected'))
  }

  // Initialize custom tab canvas if active
  if (currentColorTab === 'custom') {
    drawColorArea()
    updateHueSlider()
    updateAlphaSlider()
  }
}

function hideColorPicker() {
  colorPicker.classList.remove('visible')
  colorPickerVisible = false
  colorPickerInsertPos = null
  colorPickerReplaceRange = null
  colorPickerCallback = null
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
  // Property panel callback mode
  if (colorPickerCallback) {
    const callback = colorPickerCallback
    hideColorPicker()
    callback(hex)
    return
  }

  // Editor mode
  if (window.editor) {
    if (hashTriggerActive && hashTriggerStartPos !== null) {
      // Hash trigger mode: replace from # position to current cursor
      const cursorPos = window.editor.state.selection.main.head
      const newCursorPos = hashTriggerStartPos + hex.length
      window.editor.dispatch({
        changes: { from: hashTriggerStartPos, to: cursorPos, insert: hex },
        selection: { anchor: newCursorPos },
        annotations: Transaction.userEvent.of('input.color')
      })
    } else if (colorPickerReplaceRange) {
      // Replace existing color
      const newCursorPos = colorPickerReplaceRange.from + hex.length
      window.editor.dispatch({
        changes: { from: colorPickerReplaceRange.from, to: colorPickerReplaceRange.to, insert: hex },
        selection: { anchor: newCursorPos },
        annotations: Transaction.userEvent.of('input.color')
      })
    } else if (colorPickerInsertPos !== null) {
      // Insert new color
      const newCursorPos = colorPickerInsertPos + hex.length
      window.editor.dispatch({
        changes: { from: colorPickerInsertPos, to: colorPickerInsertPos, insert: hex },
        selection: { anchor: newCursorPos },
        annotations: Transaction.userEvent.of('input.color')
      })
    }
    window.editor.focus()
  }
  hideColorPicker()
}

// Close on escape or click outside
// Note: Hash trigger mode handles Escape in hashColorKeyboardExtension (removes # char)
document.addEventListener('keydown', (e) => {
  if (colorPickerVisible && !hashTriggerActive) {
    switch (e.key) {
      case 'Escape':
        hideColorPicker()
        if (window.editor) window.editor.focus()
        break
      case 'Enter':
        e.preventDefault()
        // Use custom color if on custom tab, otherwise use selected swatch
        if (currentColorTab === 'custom') {
          selectColor(getCurrentColorHex())
        } else {
          const selected = colorSwatchElements[selectedSwatchIndex]
          if (selected) {
            selectColor(selected.dataset.color.toUpperCase())
          }
        }
        break
      case 'ArrowLeft':
        e.preventDefault()
        navigateSwatches('left')
        break
      case 'ArrowRight':
        e.preventDefault()
        navigateSwatches('right')
        break
      case 'ArrowUp':
        e.preventDefault()
        navigateSwatches('up')
        break
      case 'ArrowDown':
        e.preventDefault()
        navigateSwatches('down')
        break
    }
  }
})

document.addEventListener('mousedown', (e) => {
  if (colorPickerVisible && !colorPicker.contains(e.target)) {
    hideColorPicker()
  }
})

// Global API for property panel to use color picker
window.showColorPickerForProperty = function(x, y, property, currentValue, callback) {
  showColorPicker(x, y, null, null, currentValue, false, null, property, callback)
}

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
let allTokensForFilter = []  // All tokens before filtering (for live filtering as user types)
let dollarStartPos = null  // Position where $ was typed (for calculating filter text)

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

// Extract tokens from a text string
function extractTokensFromText(text) {
  const tokens = []
  const lines = text.split('\n')

  for (const line of lines) {
    // Match: $name: value or name: value (token definition)
    // Values can be: #hex, number, or $token-reference
    // Examples: $primary.bg: #3B82F6, $sm.pad: 4, $surface.bg: $grey-900
    const match = line.match(/^\s*\$?([a-zA-Z][a-zA-Z0-9.-]*):\s*(#[0-9A-Fa-f]{3,8}|\d+|\$[\w-]+)/)
    if (match) {
      const name = match[1]
      const value = match[2]
      // Determine type from token name suffix (not value)
      let type = 'spacing'
      if (name.endsWith('.bg') || name.endsWith('.col') || name.endsWith('.boc')) {
        type = 'color'
      }
      tokens.push({ name, value, type })
    }
  }

  return tokens
}

// Extract tokens from current document only
function extractTokensFromDoc(doc) {
  return extractTokensFromText(doc.toString())
}

// Extract tokens from ALL project files
function extractAllTokens() {
  const allTokens = []
  const seen = new Set()

  for (const [filename, content] of Object.entries(files)) {
    if (!content) continue
    const tokens = extractTokensFromText(content)
    for (const token of tokens) {
      if (!seen.has(token.name)) {
        seen.add(token.name)
        allTokens.push(token)
      }
    }
  }

  return allTokens
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
  dollarStartPos = isDollarTrigger ? insertPos : null  // Track where $ was typed for live filtering

  // Get tokens from document
  const allTokens = extractAllTokens()

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

  // Store for live filtering
  allTokensForFilter = filteredTokens

  // Show/hide color picker section based on property type
  const panelType = PROPERTY_PANELS[property]
  // For $ trigger: hide picker if we have tokens, show picker if no tokens (fallback)
  const showPicker = panelType === 'color' && (!isDollarTrigger || filteredTokens.length === 0)

  // Don't show panel if no tokens and no picker
  if (filteredTokens.length === 0 && !showPicker) {
    return
  }

  renderTokenList(filteredTokens)

  if (showPicker) {
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

    // Get current cursor position to replace any typed filter text
    const currentPos = window.editor.state.selection.main.head
    const replaceFrom = tokenPanelInsertPos
    const replaceTo = currentPos

    const newCursorPos = replaceFrom + insertValue.length
    window.editor.dispatch({
      changes: { from: replaceFrom, to: replaceTo, insert: insertValue },
      selection: { anchor: newCursorPos },
      annotations: Transaction.userEvent.of('input.token')
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

    // Live filter tokens as user types after $ (including backspace)
    if (tokenPanelVisible && dollarTriggerActive) {
      // Handle character insertion
      if (insertedText.length > 0 && insertedText !== ' ' && insertedText !== '$') {
        // Get the text typed after $ for filtering
        const line = update.view.state.doc.lineAt(toB)
        const textAfterDollar = line.text.slice(dollarStartPos - line.from, toB - line.from)

        // Filter tokens by the typed prefix
        const filtered = allTokensForFilter.filter(token =>
          token.name.toLowerCase().startsWith(textAfterDollar.toLowerCase())
        )

        if (filtered.length > 0) {
          selectedTokenIndex = 0
          renderTokenList(filtered)
          // Update insert position to replace everything after $
          tokenPanelInsertPos = dollarStartPos
        } else {
          // No matches - close panel
          hideTokenPanel()
        }
        return
      }

      // Handle backspace/deletion
      if (insertedText.length === 0 && fromA !== toA) {
        // Check if we deleted back to or before the $ position
        if (toB <= dollarStartPos) {
          hideTokenPanel()
          return
        }

        // Recalculate filter text
        const line = update.view.state.doc.lineAt(toB)
        const textAfterDollar = line.text.slice(dollarStartPos - line.from, toB - line.from)

        // Filter tokens by the remaining prefix
        const filtered = allTokensForFilter.filter(token =>
          token.name.toLowerCase().startsWith(textAfterDollar.toLowerCase())
        )

        selectedTokenIndex = 0
        renderTokenList(filtered)
        tokenPanelInsertPos = dollarStartPos
        return
      }
    }

    // Close panel if typing in non-dollar mode
    if (tokenPanelVisible && !dollarTriggerActive && insertedText.length > 0 && insertedText !== ' ' && insertedText !== '$') {
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
      // Check if $ is at line start (new token definition) - NO autocomplete
      const isLineStart = /^\s*$/.test(textBefore)
      if (isLineStart) {
        // User is defining a new token, don't show autocomplete
        return
      }

      // Match any property that accepts tokens (with or without space before $)
      const propertyMatch = textBefore.match(/\b(bg|background|col|color|boc|border-color|hover-bg|hover-col|hover-boc|pad|padding|gap|margin|rad|radius)\s*$/)

      // Match token definition: $name.suffix: $ (extract suffix to determine type)
      const tokenDefMatch = textBefore.match(/\$([\w-]+)\.(bg|col|boc|pad|gap|margin|rad):\s*$/)

      if (propertyMatch || tokenDefMatch) {
        // Close color picker if open
        if (colorPickerVisible) {
          hideColorPicker()
        }
        // Get property from either match
        // propertyMatch[1] = "bg", "pad", etc.
        // tokenDefMatch[2] = "bg", "col", "pad", etc. (the suffix)
        const property = propertyMatch ? propertyMatch[1] : (tokenDefMatch ? tokenDefMatch[2] : null)
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
        // Use custom color if on custom tab, otherwise use selected swatch
        if (currentColorTab === 'custom') {
          selectColor(getCurrentColorHex())
        } else {
          const selected = colorSwatchElements[selectedSwatchIndex]
          if (selected) {
            selectColor(selected.dataset.color.toUpperCase())
          }
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
    selection: { anchor: iconPickerStartPos + insertText.length },
    annotations: Transaction.userEvent.of('input.icon')
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

// ==========================================
// ANIMATION PICKER (Vanilla JS)
// ==========================================

const EASING_PRESETS = [
  { name: 'linear', value: 'linear' },
  { name: 'ease', value: 'ease' },
  { name: 'ease-in', value: 'ease-in' },
  { name: 'ease-out', value: 'ease-out' },
  { name: 'ease-in-out', value: 'ease-in-out' },
]

const EASING_CURVES = {
  'linear': 'M 0 36 L 36 0',
  'ease': 'M 0 36 C 9 36, 25 0, 36 0',
  'ease-in': 'M 0 36 C 16 36, 30 12, 36 0',
  'ease-out': 'M 0 36 C 0 24, 25 0, 36 0',
  'ease-in-out': 'M 0 36 C 16 36, 20 0, 36 0',
}

const animationPickerContainer = document.getElementById('animation-picker-container')
let animationPickerDialog = null
let animationPickerVisible = false
let animationPickerLineStart = null
let animationPickerData = null
let animationPickerSelectedTrack = 0
let animationPickerIsPlaying = false
let animationPickerCurrentTime = 0
let animationPickerAnimationFrame = null

function createAnimationPickerDialog() {
  const dialog = document.createElement('div')
  dialog.className = 'animation-picker-dialog'
  dialog.innerHTML = `
    <div class="ap-header">
      <div class="ap-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <input type="text" class="ap-name-input" value="">
        <span class="ap-subtitle">as animation</span>
      </div>
      <div class="ap-actions">
        <button class="ap-btn ap-btn-secondary" data-action="cancel">Cancel</button>
        <button class="ap-btn ap-btn-primary" data-action="done">Done</button>
      </div>
    </div>
    <div class="ap-body">
      <div class="ap-playback">
        <button class="ap-play-btn" data-action="play">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>
        </button>
        <div class="ap-scrubber">
          <div class="ap-scrubber-progress"></div>
          <div class="ap-scrubber-handle"></div>
        </div>
        <div class="ap-time-display">
          <span class="ap-current-time">0.00</span>s
        </div>
      </div>
      <div class="ap-timeline">
        <div class="ap-timeline-ruler">
          <div class="ap-ruler-marks"></div>
        </div>
        <div class="ap-timeline-tracks">
          <div class="ap-playhead"></div>
        </div>
        <button class="ap-add-track" data-action="add-track">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add property
        </button>
      </div>
      <div class="ap-section">
        <div class="ap-section-label">Easing <span class="ap-selected-track"></span></div>
        <div class="ap-easing-row">
          <div class="ap-easing-presets"></div>
          <div class="ap-curve-preview">
            <svg viewBox="0 0 36 36"><path d=""/></svg>
          </div>
        </div>
      </div>
      <div class="ap-section">
        <div class="ap-section-label">Values <span class="ap-selected-track"></span></div>
        <div class="ap-values-grid">
          <span class="ap-value-label">From</span>
          <input type="text" class="ap-value-input" data-field="from" value="">
          <span class="ap-value-label">To</span>
          <input type="text" class="ap-value-input" data-field="to" value="">
        </div>
      </div>
      <div class="ap-options-row">
        <div class="ap-option-group">
          <span class="ap-option-label">Delay</span>
          <input type="text" class="ap-option-input" data-field="delay" value="0">
          <span class="ap-option-label">s</span>
        </div>
        <label class="ap-option-checkbox">
          <input type="checkbox" data-field="loop">
          Loop
        </label>
        <label class="ap-option-checkbox">
          <input type="checkbox" data-field="reverse">
          Reverse
        </label>
      </div>
    </div>
  `
  injectAnimationPickerStyles()
  return dialog
}

function showAnimationPicker(animationData, lineStart) {
  if (!animationPickerContainer) return

  animationPickerLineStart = lineStart
  animationPickerData = animationData || {
    name: 'FadeUp',
    easing: 'ease-out',
    duration: 0.3,
    tracks: [
      { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
    ],
  }

  // Create dialog if not exists
  if (!animationPickerDialog) {
    animationPickerDialog = createAnimationPickerDialog()
    animationPickerContainer.appendChild(animationPickerDialog)
    setupAnimationPickerEvents()
  }

  // Update UI with data
  updateAnimationPickerUI()
  animationPickerDialog.style.display = 'block'
  animationPickerVisible = true
}

function hideAnimationPicker() {
  pauseAnimationPicker()
  if (animationPickerDialog) {
    animationPickerDialog.style.display = 'none'
  }
  animationPickerVisible = false
  animationPickerLineStart = null
  if (window.editor) window.editor.focus()
}

function updateAnimationPickerUI() {
  if (!animationPickerDialog || !animationPickerData) return

  // Update name
  const nameInput = animationPickerDialog.querySelector('.ap-name-input')
  if (nameInput) nameInput.value = animationPickerData.name

  // Update easing presets
  const presetsContainer = animationPickerDialog.querySelector('.ap-easing-presets')
  if (presetsContainer) {
    presetsContainer.innerHTML = EASING_PRESETS.map(e => `
      <button class="ap-easing-btn ${e.value === animationPickerData.easing ? 'active' : ''}" data-easing="${e.value}">${e.name}</button>
    `).join('')
  }

  // Update curve preview
  const curvePath = animationPickerDialog.querySelector('.ap-curve-preview path')
  if (curvePath) {
    curvePath.setAttribute('d', EASING_CURVES[animationPickerData.easing] || EASING_CURVES['ease-out'])
  }

  // Update tracks
  renderAnimationTracks()

  // Update ruler
  updateAnimationRuler()

  // Update values
  updateAnimationValues()

  // Update options
  const delayInput = animationPickerDialog.querySelector('.ap-option-input[data-field="delay"]')
  if (delayInput) delayInput.value = animationPickerData.delay || 0

  const loopCheckbox = animationPickerDialog.querySelector('input[data-field="loop"]')
  if (loopCheckbox) loopCheckbox.checked = animationPickerData.loop || false

  const reverseCheckbox = animationPickerDialog.querySelector('input[data-field="reverse"]')
  if (reverseCheckbox) reverseCheckbox.checked = animationPickerData.reverse || false
}

function renderAnimationTracks() {
  const tracksContainer = animationPickerDialog.querySelector('.ap-timeline-tracks')
  if (!tracksContainer) return

  // Keep playhead, remove old tracks
  const playhead = tracksContainer.querySelector('.ap-playhead')
  tracksContainer.innerHTML = ''
  if (playhead) tracksContainer.appendChild(playhead)

  // Add tracks
  animationPickerData.tracks.forEach((track, index) => {
    const startPercent = (track.startTime / animationPickerData.duration) * 100
    const widthPercent = ((track.endTime - track.startTime) / animationPickerData.duration) * 100

    const trackEl = document.createElement('div')
    trackEl.className = 'ap-timeline-track'
    trackEl.dataset.trackIndex = index
    trackEl.innerHTML = `
      <div class="ap-track-label">${track.property}</div>
      <div class="ap-track-content">
        <div class="ap-keyframe-bar ${index === animationPickerSelectedTrack ? 'selected' : ''}"
             style="left: ${startPercent}%; width: ${widthPercent}%;"
             data-track-index="${index}">
          <div class="ap-keyframe-handle start"></div>
          <div class="ap-keyframe-handle end"></div>
        </div>
      </div>
    `
    tracksContainer.appendChild(trackEl)
  })
}

function updateAnimationRuler() {
  const rulerMarks = animationPickerDialog.querySelector('.ap-ruler-marks')
  if (!rulerMarks) return

  const marks = []
  const steps = 4
  for (let i = 0; i <= steps; i++) {
    const time = (i / steps) * animationPickerData.duration
    const percent = (i / steps) * 100
    marks.push(`<div class="ap-ruler-mark" style="left: ${percent}%"><span>${time.toFixed(2)}</span></div>`)
  }
  rulerMarks.innerHTML = marks.join('')
}

function updateAnimationValues() {
  const track = animationPickerData.tracks[animationPickerSelectedTrack]
  if (!track) return

  const fromInput = animationPickerDialog.querySelector('.ap-value-input[data-field="from"]')
  const toInput = animationPickerDialog.querySelector('.ap-value-input[data-field="to"]')

  if (fromInput) fromInput.value = track.fromValue
  if (toInput) toInput.value = track.toValue

  // Update selected track labels
  animationPickerDialog.querySelectorAll('.ap-selected-track').forEach(el => {
    el.textContent = `(${track.property})`
  })
}

function selectAnimationTrack(index) {
  animationPickerSelectedTrack = index

  // Update bar selection
  animationPickerDialog.querySelectorAll('.ap-keyframe-bar').forEach((bar, i) => {
    bar.classList.toggle('selected', i === index)
  })

  updateAnimationValues()
}

function setupAnimationPickerEvents() {
  if (!animationPickerDialog) return

  // Button actions
  animationPickerDialog.addEventListener('click', (e) => {
    const target = e.target
    const action = target.closest('[data-action]')?.dataset.action

    switch (action) {
      case 'play':
        toggleAnimationPlay()
        break
      case 'cancel':
        hideAnimationPicker()
        break
      case 'done':
        updateAnimationInCode(animationPickerData)
        hideAnimationPicker()
        break
      case 'add-track':
        addAnimationTrack()
        break
    }

    // Easing button
    const easingBtn = target.closest('.ap-easing-btn')
    if (easingBtn) {
      animationPickerData.easing = easingBtn.dataset.easing
      updateAnimationPickerUI()
    }

    // Track selection
    const keyframeBar = target.closest('.ap-keyframe-bar')
    if (keyframeBar) {
      e.stopPropagation()
      selectAnimationTrack(parseInt(keyframeBar.dataset.trackIndex))
    }
  })

  // Scrubber
  const scrubber = animationPickerDialog.querySelector('.ap-scrubber')
  if (scrubber) {
    scrubber.addEventListener('mousedown', (e) => {
      pauseAnimationPicker()
      handleAnimationScrub(e, scrubber)
    })
  }

  // Value inputs
  animationPickerDialog.querySelectorAll('.ap-value-input').forEach(input => {
    input.addEventListener('change', () => {
      const field = input.dataset.field
      const track = animationPickerData.tracks[animationPickerSelectedTrack]
      if (track) {
        const val = parseFloat(input.value)
        if (field === 'from') track.fromValue = isNaN(val) ? input.value : val
        if (field === 'to') track.toValue = isNaN(val) ? input.value : val
      }
    })
  })

  // Option inputs
  animationPickerDialog.querySelector('.ap-option-input[data-field="delay"]')?.addEventListener('change', (e) => {
    animationPickerData.delay = parseFloat(e.target.value) || 0
  })

  animationPickerDialog.querySelector('input[data-field="loop"]')?.addEventListener('change', (e) => {
    animationPickerData.loop = e.target.checked
  })

  animationPickerDialog.querySelector('input[data-field="reverse"]')?.addEventListener('change', (e) => {
    animationPickerData.reverse = e.target.checked
  })

  // Name input
  animationPickerDialog.querySelector('.ap-name-input')?.addEventListener('change', (e) => {
    animationPickerData.name = e.target.value
  })
}

function handleAnimationScrub(e, scrubber) {
  const rect = scrubber.getBoundingClientRect()

  const updateScrub = (e) => {
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    animationPickerCurrentTime = x
    updateAnimationPlayhead(x)
  }

  updateScrub(e)

  const onMove = (e) => updateScrub(e)
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

function toggleAnimationPlay() {
  if (animationPickerIsPlaying) {
    pauseAnimationPicker()
  } else {
    playAnimationPicker()
  }
}

function playAnimationPicker() {
  if (animationPickerIsPlaying) return
  animationPickerIsPlaying = true

  const playBtn = animationPickerDialog.querySelector('.ap-play-btn')
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="white"/><rect x="14" y="4" width="4" height="16" fill="white"/></svg>'
  }

  const startTime = performance.now() - (animationPickerCurrentTime * animationPickerData.duration * 1000)

  const animate = (now) => {
    if (!animationPickerIsPlaying) return

    animationPickerCurrentTime = ((now - startTime) / 1000) / animationPickerData.duration

    if (animationPickerCurrentTime >= 1) {
      if (animationPickerData.loop) {
        animationPickerCurrentTime = 0
      } else {
        animationPickerCurrentTime = 1
        pauseAnimationPicker()
        return
      }
    }

    updateAnimationPlayhead(animationPickerCurrentTime)
    animationPickerAnimationFrame = requestAnimationFrame(animate)
  }

  animationPickerAnimationFrame = requestAnimationFrame(animate)
}

function pauseAnimationPicker() {
  animationPickerIsPlaying = false

  const playBtn = animationPickerDialog?.querySelector('.ap-play-btn')
  if (playBtn) {
    playBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="white"/></svg>'
  }

  if (animationPickerAnimationFrame) {
    cancelAnimationFrame(animationPickerAnimationFrame)
    animationPickerAnimationFrame = null
  }
}

function updateAnimationPlayhead(progress) {
  const percent = progress * 100

  const scrubberProgress = animationPickerDialog?.querySelector('.ap-scrubber-progress')
  const scrubberHandle = animationPickerDialog?.querySelector('.ap-scrubber-handle')
  if (scrubberProgress) scrubberProgress.style.width = `${percent}%`
  if (scrubberHandle) scrubberHandle.style.left = `${percent}%`

  const playhead = animationPickerDialog?.querySelector('.ap-playhead')
  const trackContent = animationPickerDialog?.querySelector('.ap-track-content')
  if (playhead && trackContent) {
    const trackWidth = trackContent.offsetWidth
    playhead.style.left = `${72 + (percent / 100) * trackWidth}px`
  }

  const currentTimeEl = animationPickerDialog?.querySelector('.ap-current-time')
  if (currentTimeEl) {
    currentTimeEl.textContent = (progress * animationPickerData.duration).toFixed(2)
  }
}

function addAnimationTrack() {
  const newTrack = {
    property: 'scale',
    startTime: 0,
    endTime: animationPickerData.duration,
    fromValue: 1,
    toValue: 1.1,
  }
  animationPickerData.tracks.push(newTrack)
  renderAnimationTracks()
}

function injectAnimationPickerStyles() {
  if (document.getElementById('animation-picker-styles')) return

  const style = document.createElement('style')
  style.id = 'animation-picker-styles'
  style.textContent = `
    .animation-picker-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a1f;
      border: 1px solid #333;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      width: 520px;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e4e4e7;
      font-size: 12px;
      display: none;
    }
    .ap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #222228;
      border-bottom: 1px solid #333;
      border-radius: 8px 8px 0 0;
    }
    .ap-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    .ap-name-input {
      background: transparent;
      border: none;
      color: #e4e4e7;
      font-size: 12px;
      font-weight: 600;
      width: 120px;
      padding: 2px 4px;
    }
    .ap-name-input:focus {
      outline: none;
      background: #27272a;
      border-radius: 3px;
    }
    .ap-subtitle { color: #555; font-weight: 400; }
    .ap-actions { display: flex; gap: 6px; }
    .ap-btn {
      padding: 5px 10px;
      font-size: 11px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ap-btn-secondary { background: #333; color: #999; }
    .ap-btn-secondary:hover { background: #444; color: #fff; }
    .ap-btn-primary { background: #3B82F6; color: #fff; }
    .ap-btn-primary:hover { background: #2563EB; }
    .ap-body { padding: 12px; }
    .ap-playback {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .ap-play-btn {
      width: 28px;
      height: 28px;
      background: #3B82F6;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .ap-play-btn:hover { background: #2563EB; }
    .ap-play-btn svg { width: 14px; height: 14px; }
    .ap-scrubber {
      flex: 1;
      height: 6px;
      background: #27272a;
      border-radius: 3px;
      position: relative;
      cursor: pointer;
    }
    .ap-scrubber-progress {
      height: 100%;
      background: #3B82F6;
      border-radius: 3px;
      width: 0%;
    }
    .ap-scrubber-handle {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      cursor: grab;
      left: 0%;
    }
    .ap-time-display {
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      color: #666;
      min-width: 50px;
      text-align: right;
    }
    .ap-timeline {
      background: #111115;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .ap-timeline-ruler {
      height: 20px;
      background: #1a1a1f;
      border-bottom: 1px solid #27272a;
      position: relative;
      display: flex;
      padding-left: 72px;
    }
    .ap-ruler-marks { flex: 1; position: relative; }
    .ap-ruler-mark {
      position: absolute;
      top: 0;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translateX(-50%);
    }
    .ap-ruler-mark span { font-size: 9px; color: #555; margin-top: 3px; }
    .ap-ruler-mark::after {
      content: '';
      width: 1px;
      flex: 1;
      background: #333;
    }
    .ap-timeline-tracks { position: relative; }
    .ap-timeline-track {
      display: flex;
      height: 28px;
      border-bottom: 1px solid #1f1f24;
    }
    .ap-timeline-track:last-child { border-bottom: none; }
    .ap-track-label {
      width: 72px;
      padding: 0 8px;
      font-size: 11px;
      color: #666;
      display: flex;
      align-items: center;
      background: #1a1a1f;
      border-right: 1px solid #27272a;
      flex-shrink: 0;
    }
    .ap-track-content {
      flex: 1;
      position: relative;
      background: #111115;
    }
    .ap-keyframe-bar {
      position: absolute;
      top: 5px;
      height: 18px;
      background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      min-width: 16px;
    }
    .ap-keyframe-bar:hover { filter: brightness(1.1); }
    .ap-keyframe-bar.selected { box-shadow: 0 0 0 2px #fff; }
    .ap-keyframe-handle {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 2px;
      cursor: ew-resize;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .ap-keyframe-bar:hover .ap-keyframe-handle,
    .ap-keyframe-bar.selected .ap-keyframe-handle { opacity: 1; }
    .ap-keyframe-handle.start { left: -4px; }
    .ap-keyframe-handle.end { right: -4px; }
    .ap-playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ef4444;
      z-index: 10;
      pointer-events: none;
      left: 72px;
    }
    .ap-playhead::before {
      content: '';
      position: absolute;
      top: -3px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #ef4444;
    }
    .ap-add-track {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      font-size: 11px;
      color: #555;
      background: transparent;
      border: none;
      border-top: 1px solid #27272a;
      cursor: pointer;
      width: 100%;
      transition: all 0.15s;
    }
    .ap-add-track:hover { color: #888; background: rgba(255,255,255,0.02); }
    .ap-add-track svg { width: 12px; height: 12px; }
    .ap-section { margin-bottom: 12px; }
    .ap-section:last-child { margin-bottom: 0; }
    .ap-section-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .ap-selected-track { font-weight: normal; text-transform: none; }
    .ap-easing-row { display: flex; align-items: center; gap: 8px; }
    .ap-easing-presets { display: flex; gap: 3px; flex-wrap: wrap; flex: 1; }
    .ap-easing-btn {
      padding: 4px 8px;
      font-size: 10px;
      color: #888;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ap-easing-btn:hover { color: #fff; border-color: #444; }
    .ap-easing-btn.active { background: #3B82F6; border-color: #3B82F6; color: #fff; }
    .ap-curve-preview {
      width: 48px;
      height: 48px;
      background: #27272a;
      border-radius: 4px;
      position: relative;
      flex-shrink: 0;
    }
    .ap-curve-preview svg {
      position: absolute;
      inset: 6px;
      width: calc(100% - 12px);
      height: calc(100% - 12px);
    }
    .ap-curve-preview path { fill: none; stroke: #3B82F6; stroke-width: 2; }
    .ap-values-grid {
      display: grid;
      grid-template-columns: auto 1fr auto 1fr;
      gap: 6px 8px;
      align-items: center;
    }
    .ap-value-label { font-size: 10px; color: #555; }
    .ap-value-input {
      padding: 4px 6px;
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #e4e4e7;
      width: 100%;
    }
    .ap-value-input:focus { outline: none; border-color: #3B82F6; }
    .ap-options-row {
      display: flex;
      gap: 12px;
      padding-top: 12px;
      border-top: 1px solid #27272a;
    }
    .ap-option-group { display: flex; align-items: center; gap: 6px; }
    .ap-option-label { font-size: 10px; color: #555; }
    .ap-option-input {
      width: 50px;
      padding: 4px 6px;
      font-size: 11px;
      font-family: 'SF Mono', monospace;
      background: #27272a;
      border: 1px solid #333;
      border-radius: 4px;
      color: #e4e4e7;
    }
    .ap-option-input:focus { outline: none; border-color: #3B82F6; }
    .ap-option-checkbox {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: #666;
      cursor: pointer;
    }
    .ap-option-checkbox input { accent-color: #3B82F6; }
  `
  document.head.appendChild(style)
}

function updateAnimationInCode(data) {
  if (!window.editor || animationPickerLineStart === null) return

  const doc = window.editor.state.doc
  const dsl = generateAnimationDSL(data)

  // Find the animation block boundaries
  const startLine = animationPickerLineStart
  let endLine = startLine

  // Find where the animation block ends (next non-indented line or end of file)
  const totalLines = doc.lines
  for (let i = startLine + 1; i <= totalLines; i++) {
    const line = doc.line(i)
    const text = line.text
    // Stop at empty line, non-indented content, or section header
    if (text.trim() === '' || (!text.startsWith(' ') && !text.startsWith('\t') && text.trim() !== '')) {
      endLine = i - 1
      break
    }
    endLine = i
  }

  // Calculate the range to replace
  const from = doc.line(startLine).from
  const to = doc.line(endLine).to

  // Replace the animation block
  window.editor.dispatch({
    changes: { from, to, insert: dsl },
    annotations: Transaction.userEvent.of('input.animation')
  })
}

function generateAnimationDSL(data) {
  const lines = []
  lines.push(`${data.name} as animation: ${data.easing}`)

  // Group all unique times from tracks
  const times = new Set()
  for (const track of data.tracks) {
    times.add(track.startTime)
    times.add(track.endTime)
  }

  const sortedTimes = Array.from(times).sort((a, b) => a - b)

  for (const time of sortedTimes) {
    const props = []

    for (const track of data.tracks) {
      if (track.startTime === time) {
        props.push(`${track.property} ${track.fromValue}`)
      } else if (track.endTime === time) {
        props.push(`${track.property} ${track.toValue}`)
      }
    }

    if (props.length > 0) {
      lines.push(`  ${time.toFixed(2)} ${props.join(', ')}`)
    }
  }

  return lines.join('\n')
}

function parseAnimationKeyframes(doc, startLine) {
  const tracks = []
  const propertyData = {}

  // Parse keyframe lines after the animation definition
  for (let i = startLine + 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    // Stop at non-indented line
    if (!text.startsWith(' ') && !text.startsWith('\t')) break
    if (text.trim() === '') break

    // Parse keyframe: "  0.00 opacity 0, y-offset 20"
    const match = text.trim().match(/^([\d.]+)\s+(.+)/)
    if (match) {
      const time = parseFloat(match[1])
      const propsStr = match[2]

      // Parse properties
      const propParts = propsStr.split(',').map(p => p.trim())
      for (const prop of propParts) {
        const propMatch = prop.match(/^([\w-]+)\s+(.+)/)
        if (propMatch) {
          const propName = propMatch[1]
          const value = propMatch[2]

          if (!propertyData[propName]) {
            propertyData[propName] = []
          }
          propertyData[propName].push({ time, value })
        }
      }
    }
  }

  // Convert to tracks
  for (const [property, keyframes] of Object.entries(propertyData)) {
    if (keyframes.length >= 1) {
      const sorted = keyframes.sort((a, b) => a.time - b.time)
      const fromValue = parseFloat(sorted[0].value) || sorted[0].value
      const toValue = sorted.length > 1
        ? (parseFloat(sorted[sorted.length - 1].value) || sorted[sorted.length - 1].value)
        : fromValue

      tracks.push({
        property,
        startTime: sorted[0].time,
        endTime: sorted.length > 1 ? sorted[sorted.length - 1].time : sorted[0].time + 0.3,
        fromValue,
        toValue
      })
    }
  }

  return tracks
}

// Animation picker trigger extension for CodeMirror
// Triggers when user types space after "as animation:"
const animationPickerTriggerExtension = EditorView.updateListener.of(update => {
  if (!update.docChanged) return
  if (animationPickerVisible) return

  // Check what was typed
  update.transactions.forEach(tr => {
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.toString()

      // Trigger on space after "as animation:"
      if (insertedText === ' ') {
        const line = update.state.doc.lineAt(fromB)
        const textBefore = line.text.slice(0, fromB - line.from)

        // Check if we just typed space after "as animation:"
        if (textBefore.match(/\w+\s+as\s+animation:$/)) {
          // Extract name from the line
          const nameMatch = textBefore.match(/^(\w+)\s+as\s+animation:$/)
          const name = nameMatch ? nameMatch[1] : 'Animation'
          const lineNum = line.number

          // Small delay to let the space be inserted
          setTimeout(() => {
            showAnimationPicker({
              name: name,
              easing: 'ease-out',
              duration: 0.3,
              tracks: [
                { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
              ]
            }, lineNum)
          }, 10)
        }
      }
    })
  })
})

// Double-click on "animation" keyword to open picker
const animationDoubleClickExtension = EditorView.domEventHandlers({
  dblclick: (event, view) => {
    if (animationPickerVisible) return false

    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pos === null) return false

    const line = view.state.doc.lineAt(pos)
    const text = line.text

    // Check if this line has "as animation:"
    const animationMatch = text.match(/(\w+)\s+as\s+animation:/)
    if (!animationMatch) return false

    // Find the position of "animation" in the line
    const animationIndex = text.indexOf('animation')
    if (animationIndex === -1) return false

    const animationStart = line.from + animationIndex
    const animationEnd = animationStart + 'animation'.length

    // Check if double-click was on the word "animation"
    if (pos >= animationStart && pos <= animationEnd) {
      event.preventDefault()

      const name = animationMatch[1]
      const lineNum = line.number

      // Parse existing keyframes if any
      const tracks = parseAnimationKeyframes(view.state.doc, lineNum)

      showAnimationPicker({
        name: name,
        easing: 'ease-out',
        duration: tracks.length > 0 ? Math.max(...tracks.map(t => t.endTime)) : 0.3,
        tracks: tracks.length > 0 ? tracks : [
          { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
        ]
      }, lineNum)

      return true
    }

    return false
  }
})

// Keyboard shortcut: Cmd+Shift+A to open animation picker
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'a') {
    e.preventDefault()

    if (animationPickerVisible) {
      hideAnimationPicker()
    } else if (window.editor) {
      const pos = window.editor.state.selection.main.head
      const line = window.editor.state.doc.lineAt(pos)
      const text = line.text

      // Check if on animation line
      const animationMatch = text.match(/(\w+)\s+as\s+animation:/)
      if (animationMatch) {
        const name = animationMatch[1]
        const lineNum = line.number
        const tracks = parseAnimationKeyframes(window.editor.state.doc, lineNum)

        showAnimationPicker({
          name: name,
          easing: 'ease-out',
          duration: tracks.length > 0 ? Math.max(...tracks.map(t => t.endTime)) : 0.3,
          tracks: tracks.length > 0 ? tracks : [
            { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
          ]
        }, lineNum)
      }
    }
  }
})

// Close animation picker on Escape
document.addEventListener('keydown', (e) => {
  if (animationPickerVisible && e.key === 'Escape') {
    hideAnimationPicker()
    if (window.editor) window.editor.focus()
  }
})

// Close animation picker on click outside
document.addEventListener('mousedown', (e) => {
  if (animationPickerVisible && animationPickerContainer && !animationPickerContainer.contains(e.target)) {
    hideAnimationPicker()
  }
})

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
        // Only sync if editor has focus (not when user selected something in preview)
        else if (update.selectionSet && getEditorHasFocus()) {
          // Sync property panel directly to cursor position
          syncPropertyPanelToEditorCursor()
        }
      }),
      tokenPanelTriggerExtension,
      Prec.highest(tokenPanelKeyboardExtension),
      colorDoubleClickExtension,
      hashColorTriggerExtension,
      Prec.highest(hashColorKeyboardExtension),
      iconTriggerExtension,
      Prec.highest(iconKeyboardExtension),
      animationPickerTriggerExtension,
      animationDoubleClickExtension,
      EditorView.theme({
        '&': { height: '100%' },
        '.cm-scroller': { fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" },
      }),
    ],
  }),
  parent: editorContainer,
})

// Debounce helper with cancel support
function debounce(fn, ms) {
  let timeout
  const debounced = (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => {
    clearTimeout(timeout)
  }
  return debounced
}

// Save current file (debounced) - uses API or localStorage based on auth state
const debouncedSave = debounce((code) => {
  saveFile(currentFile, code)
  // Update icon if content type changed
  updateFileIcon(currentFile)
}, 500)

const debouncedCompile = debounce(() => {
  // Skip compilation in React mode
  if (currentMode === 'react') {
    // Still save the React code
    const code = editor.state.doc.toString()
    reactFiles[currentFile] = code
    return
  }
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)
}, 300)

// Undo/Redo buttons
const undoBtn = document.getElementById('undo-btn')
const redoBtn = document.getElementById('redo-btn')

undoBtn?.addEventListener('click', () => {
  if (editor) {
    undo(editor)
    editor.focus()
  }
})

redoBtn?.addEventListener('click', () => {
  if (editor) {
    redo(editor)
    editor.focus()
  }
})

// Update undo/redo button states based on history
function updateUndoRedoButtons() {
  if (!editor || !undoBtn || !redoBtn) return

  // Use undoDepth/redoDepth to check history availability
  undoBtn.disabled = undoDepth(editor.state) === 0
  redoBtn.disabled = redoDepth(editor.state) === 0
}

// Call on editor transactions
const originalDispatch = editor.dispatch.bind(editor)
editor.dispatch = (...args) => {
  originalDispatch(...args)
  updateUndoRedoButtons()
}

// Initial state
updateUndoRedoButtons()

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

// Get all token and component files as prelude code
// This ensures tokens and components are available when compiling layouts
function getPreludeCode(excludeFile) {
  const sections = []

  // Collect files by type in the correct order: tokens first, then components
  const tokenFiles = []
  const componentFiles = []

  for (const filename of Object.keys(files)) {
    // Skip the current file being compiled
    if (filename === excludeFile) continue

    const fileType = getFileType(filename)
    if (fileType === 'tokens') {
      tokenFiles.push(filename)
    } else if (fileType === 'component') {
      componentFiles.push(filename)
    }
  }

  // Add tokens first (sorted alphabetically for consistency)
  tokenFiles.sort()
  for (const filename of tokenFiles) {
    const content = files[filename]
    if (content && content.trim()) {
      sections.push(`// === ${filename} ===\n${content}`)
    }
  }

  // Then components
  componentFiles.sort()
  for (const filename of componentFiles) {
    const content = files[filename]
    if (content && content.trim()) {
      sections.push(`// === ${filename} ===\n${content}`)
    }
  }

  return sections.join('\n\n')
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
    // Clear selection and update studio state for empty code
    if (studioSelectionManager) {
      studioSelectionManager.clearSelection()
      studioSelectionManager.setBreadcrumb([])
    }
    // Clear component palette user components
    const userComponentsList = document.querySelector('.user-components-list')
    if (userComponentsList) {
      userComponentsList.innerHTML = ''
    }
    return
  }

  // Determine file type for preview mode
  const fileType = getFileType(currentFile)

  try {
    // Auto-create any missing referenced files
    autoCreateReferencedFiles(code)

    // For layout files, prepend all tokens and components
    // This ensures they are available when rendering
    let resolvedCode = code
    currentPreludeOffset = 0  // Reset prelude offset
    if (fileType === 'layout') {
      const prelude = getPreludeCode(currentFile)
      if (prelude) {
        const separator = '\n\n// === ' + currentFile + ' ===\n'
        resolvedCode = prelude + separator + code
        // Track the character offset so we can adjust CodeModifier changes for the editor
        currentPreludeOffset = prelude.length + separator.length
      }
    }

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

    // Update component palette with user-defined components from ALL files
    updateUserComponentsPalette()

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
      // Update studio module with AST and source map for tokens too
      updateStudio(ast, sourceMap, resolvedCode)
    } else if (fileType === 'component') {
      preview.className = 'components-preview'
      renderComponentsPreview(ast)
      // Update studio module with AST and source map for component definitions
      updateStudio(ast, sourceMap, resolvedCode)
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

  // Build token lookup map for resolution
  const tokenMap = new Map()
  for (const t of tokens) {
    tokenMap.set(t.name, t.value)
  }

  // Helper to check if a token is a color (by name or resolved value)
  const isColorToken = (t) => {
    // Check by name suffix
    if (t.name.includes('.bg') || t.name.includes('.col') || t.name.includes('.color')) {
      return true
    }
    // Check by value
    const resolved = resolveTokenValueWithMap(t.value, tokenMap)
    return isDirectColorValue(resolved)
  }

  // Helper to infer token display type
  const inferTokenType = (t) => {
    if (isColorToken(t)) return 'color'
    if (t.name.includes('.pad') || t.name.includes('.gap') || t.name.includes('.margin') || t.name.includes('.rad')) return 'spacing'
    return 'other'
  }

  let html = ''

  // Check if any tokens have sections defined
  const hasSections = tokens.some(t => t.section)

  if (hasSections) {
    // Group by sections (preserve order from source)
    const sections = new Map()
    const noSection = []

    for (const t of tokens) {
      if (t.section) {
        if (!sections.has(t.section)) {
          sections.set(t.section, [])
        }
        sections.get(t.section).push(t)
      } else {
        noSection.push(t)
      }
    }

    // Render sections in order
    for (const [sectionName, sectionTokens] of sections) {
      html += renderTokenSection(sectionName, sectionTokens, 'mixed', tokenMap, inferTokenType)
    }

    // Render unsectioned tokens at the end
    if (noSection.length > 0) {
      html += renderTokenSection('Weitere', noSection, 'mixed', tokenMap, inferTokenType)
    }
  } else {
    // Fallback: group by automatic categories
    const colorTokens = tokens.filter(t => isColorToken(t))
    const spacingTokens = tokens.filter(t => t.name.includes('.pad') || t.name.includes('.gap') || t.name.includes('.margin'))
    const radiusTokens = tokens.filter(t => t.name.includes('.rad'))
    const otherTokens = tokens.filter(t =>
      !isColorToken(t) &&
      !t.name.includes('.pad') &&
      !t.name.includes('.gap') &&
      !t.name.includes('.margin') &&
      !t.name.includes('.rad')
    )

    if (colorTokens.length > 0) {
      html += renderTokenSection('Farben', colorTokens, 'color', tokenMap)
    }
    if (spacingTokens.length > 0) {
      html += renderTokenSection('Abstände', spacingTokens, 'spacing', tokenMap)
    }
    if (radiusTokens.length > 0) {
      html += renderTokenSection('Radien', radiusTokens, 'spacing', tokenMap)
    }
    if (otherTokens.length > 0) {
      html += renderTokenSection('Weitere', otherTokens, 'other', tokenMap)
    }
  }

  preview.innerHTML = html
}

function renderTokenSection(title, tokens, type, tokenMap, inferTokenType = null) {
  let rows = ''
  for (const token of tokens) {
    const resolvedValue = resolveTokenValueWithMap(token.value, tokenMap)
    let visualCell = ''

    // For mixed sections, infer type per token
    const tokenType = (type === 'mixed' && inferTokenType) ? inferTokenType(token) : type

    if (tokenType === 'color') {
      visualCell = `<div class="tokens-preview-swatch" style="background: ${resolvedValue}"></div>`
    } else if (tokenType === 'spacing') {
      const size = parseInt(resolvedValue) || 8
      visualCell = `<div class="tokens-preview-spacing" style="width: ${Math.min(size, 48)}px; height: ${Math.min(size, 24)}px;"></div>`
    }

    // Determine value type class for syntax highlighting
    const valueTypeClass = getValueTypeClass(token.value)

    rows += `
      <tr class="tokens-preview-row">
        <td class="tokens-preview-cell" style="width: 48px;">${visualCell}</td>
        <td class="tokens-preview-cell"><span class="tokens-preview-name">${token.name}</span></td>
        <td class="tokens-preview-cell"><span class="tokens-preview-value ${valueTypeClass}">${token.value}</span></td>
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

// Check if value is a direct color (hex, rgb, hsl) - not a token reference
function isDirectColorValue(value) {
  if (typeof value !== 'string') return false
  return value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')
}

// Determine CSS class for value type (matches editor syntax highlighting)
function getValueTypeClass(value) {
  if (typeof value !== 'string') return ''
  if (value.startsWith('#')) return 'hex'
  if (value.startsWith('$')) return 'token-ref'
  if (/^\d/.test(value)) return 'number'
  return ''
}

// Resolve token value using the token map (recursive, with cycle detection)
function resolveTokenValueWithMap(value, tokenMap, visited = new Set()) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('$')) return value

  // Cycle detection
  if (visited.has(value)) return value
  visited.add(value)

  // Look up in token map
  const resolved = tokenMap.get(value)
  if (resolved) {
    return resolveTokenValueWithMap(resolved, tokenMap, visited)
  }

  // Fallback: try regex on source
  return resolveTokenValue(value)
}

function resolveTokenValue(value) {
  if (typeof value !== 'string') return value
  if (!value.startsWith('$')) return value
  // Simple token resolution - look up in all files
  const allSource = getAllProjectSource()
  const tokenName = value
  // Escape special regex characters in token name
  const escapedName = tokenName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedName}:\\s*([^\\n]+)`, 'm')
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

// Inject component preview CSS variables (refreshes when tokens change)
let lastTokensHash = ''

function injectComponentPreviewStyles(force = false) {
  // Get tokens and create CSS variables
  const tokensSource = getTokensSource()

  // Calculate simple hash to detect changes
  const tokensHash = tokensSource.length + ':' + tokensSource.slice(0, 100)

  // Skip if unchanged (unless forced)
  if (!force && tokensHash === lastTokensHash) return
  lastTokensHash = tokensHash

  if (!tokensSource.trim()) return

  try {
    const ast = Mirror.parse(tokensSource)
    if (!ast.tokens || ast.tokens.length === 0) return

    // Build token map for resolving references
    const tokenMap = new Map()
    for (const t of ast.tokens) {
      tokenMap.set(t.name, t.value)
    }

    // Resolve token references (e.g., $surface.bg: $grey-800)
    const resolveValue = (value) => {
      if (typeof value === 'string' && value.startsWith('$')) {
        const resolved = tokenMap.get(value)
        if (resolved) return resolveValue(resolved)
      }
      return value
    }

    let cssVars = ':root {\n'
    for (const token of ast.tokens) {
      // Strip $ prefix and convert dots to hyphens
      const cssVarName = (token.name.startsWith('$') ? token.name.slice(1) : token.name)
        .replace(/\./g, '-')
      const resolvedValue = resolveValue(token.value)
      cssVars += `  --${cssVarName}: ${resolvedValue};\n`
    }
    cssVars += '}\n'

    // Remove old style element if exists
    const oldStyle = document.getElementById('component-preview-tokens')
    if (oldStyle) oldStyle.remove()

    const style = document.createElement('style')
    style.id = 'component-preview-tokens'
    style.textContent = cssVars
    document.head.appendChild(style)
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
let studioPropertyPanel = null
let studioPropertyExtractor = null
let studioCodeModifier = null
let studioDragDropManager = null
let canvasDragCleanups = []  // Cleanup functions for canvas element drag handlers
// editorHasFocus is now managed by studio state (studioState.get().editorHasFocus)
// This getter provides backwards compatibility for existing code
function getEditorHasFocus() {
  return studioState ? studioState.get().editorHasFocus : true
}
let currentPreludeOffset = 0  // Character offset of prelude in merged source (for adjusting change positions)

/**
 * Ensure codeModifier is in sync with the current editor content.
 * This prevents RangeErrors when the editor has uncommitted changes.
 * Returns true if a recompile was needed (callers should bail out as state changed).
 */
function ensureCodeModifierInSync() {
  if (!studioCodeModifier || !editor) return false

  const currentCode = editor.state.doc.toString()
  const modifierCode = studioCodeModifier.getSource()

  if (currentCode !== modifierCode) {
    // Out of sync - cancel debounce and compile immediately
    debouncedCompile.cancel()
    compile(currentCode)
    return true // Recompiled - caller should bail out
  }
  return false // Already in sync
}

// Expose sync function globally for property panel to use
window.ensureCodeModifierInSync = ensureCodeModifierInSync

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
 * Calculate the line offset for the current file in the combined source
 * Returns the number of lines that come before the current file
 */
function getCurrentFileLineOffset() {
  const filesByType = {}

  // Group files by type
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    if (!filesByType[type]) {
      filesByType[type] = []
    }
    filesByType[type].push({ filename, content: files[filename] })
  }

  // Count lines before current file
  let lineOffset = 0
  for (const type of FILE_TYPE_ORDER) {
    const typeFiles = filesByType[type] || []
    for (const file of typeFiles) {
      if (file.filename === currentFile) {
        return lineOffset
      }
      // Count lines in this file (+1 for the trailing newline added during combination)
      const lineCount = (file.content.match(/\n/g) || []).length + 1
      lineOffset += lineCount
    }
  }

  return lineOffset
}

/**
 * Scroll editor to a specific line and optionally highlight it
 * Only sets selection if editor is NOT focused (to avoid interrupting typing)
 */
function scrollEditorToLine(line) {
  if (!editor) return

  // Don't move cursor while user is typing in editor
  const editorHasFocus = editor.hasFocus

  try {
    const lineInfo = editor.state.doc.line(line)
    if (editorHasFocus) {
      // Only scroll, don't change selection
      editor.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' })
      })
    } else {
      // Scroll and select (user clicked in preview)
      editor.dispatch({
        effects: EditorView.scrollIntoView(lineInfo.from, { y: 'center' }),
        selection: { anchor: lineInfo.from }
      })
    }
  } catch (e) {
    // Line might be out of bounds after edit
    console.warn('Studio: Could not scroll to line', line, e)
  }
}

/**
 * Find component name from a definition line
 * Handles "Name:" or "Name as Parent:" syntax
 * Returns the component name (not nodeId) for lookup in SourceMap
 */
function findComponentNameFromDefinitionLine(lineContent) {
  // Match component definition patterns:
  // "Button:" or "Button: props" or "Button as Parent:" etc.
  const match = lineContent.match(/^\s*(\w+)\s*(as\s+\w+)?:/)
  if (!match) return null

  return match[1]
}

/**
 * Extract component name from a line of Mirror code
 * Returns null for empty lines, comments, tokens, section headers
 * Returns { name: string, isDefinition: boolean } for valid component lines
 */
function extractComponentFromLine(line) {
  const trimmed = line.trim()

  // Skip empty lines
  if (!trimmed) {
    return null
  }

  // Skip comments (single-line and inline)
  if (trimmed.startsWith('//')) {
    return null
  }

  // Skip token definitions ($name: value)
  if (trimmed.startsWith('$')) {
    return null
  }

  // Skip section headers (--- Section ---)
  if (trimmed.startsWith('---')) {
    return null
  }

  // Skip state/event keywords that start a block
  if (/^(state|hover|focus|active|disabled|onclick|onhover|onchange|oninput|onkeydown|onkeyup|keys|each|if|else)\b/.test(trimmed)) {
    return null
  }

  // Skip primitive keywords used inline
  if (/^(show|hide|animate|data)\b/.test(trimmed)) {
    return null
  }

  // Match component name at start: "ComponentName ..." or "ComponentName: ..."
  // Must start with uppercase letter (Mirror convention)
  const match = trimmed.match(/^([A-Z][a-zA-Z0-9]*)(\s*:|[\s,]|$)/)
  if (!match) {
    return null
  }

  const name = match[1]
  const isDefinition = match[2].includes(':')

  return { name, isDefinition }
}

/**
 * Find the parent component definition for a nested line.
 * Scans upward from the current line to find a line with less indentation
 * that is a component definition (ends with :)
 */
function findParentComponentDefinition(editorLineNum) {
  if (!editor) return null

  const currentLine = editor.state.doc.line(editorLineNum)
  const currentIndent = currentLine.text.match(/^(\s*)/)[1].length

  // If no indent, this is a top-level line
  if (currentIndent === 0) return null

  // Scan upward to find parent definition
  for (let lineNum = editorLineNum - 1; lineNum >= 1; lineNum--) {
    const line = editor.state.doc.line(lineNum)
    const lineText = line.text
    const lineIndent = lineText.match(/^(\s*)/)[1].length

    // Found a line with less indentation
    if (lineIndent < currentIndent) {
      // Check if it's a component definition
      const match = lineText.trim().match(/^([A-Z][a-zA-Z0-9]*)\s*(as\s+[a-zA-Z0-9]+\s*)?:/)
      if (match) {
        return { name: match[1], line: lineNum }
      }
      // Not a definition, but less indent - stop searching
      return null
    }
  }

  return null
}

/**
 * Sync property panel to editor cursor position
 * Called after compile when editor has focus
 *
 * Strategy:
 * 1. For definitions (ComponentName:) -> show definition properties
 * 2. For instances -> find the instance closest to cursor line
 * 3. Keep previous selection if on empty/non-component line
 */
function syncPropertyPanelToEditorCursor() {
  if (!editor || !studioSelectionManager) {
    DEBUG_SYNC && console.log('[Sync] No editor or selectionManager')
    return
  }

  try {
    const cursorPos = editor.state.selection.main.head
    const editorLine = editor.state.doc.lineAt(cursorPos).number
    const lineInfo = editor.state.doc.line(editorLine)
    const lineContent = lineInfo.text

    DEBUG_SYNC && console.log('[Sync] Line', editorLine, ':', lineContent)

    // Extract component info from the line
    const componentInfo = extractComponentFromLine(lineContent)

    DEBUG_SYNC && console.log('[Sync] componentInfo:', componentInfo)

    // If not a component line, check if we're inside a component definition block
    // (e.g., on a state line, event line, or child line)
    if (!componentInfo) {
      DEBUG_SYNC && console.log('[Sync] Not a component line, checking for parent definition...')
      const parent = findParentComponentDefinition(editorLine)
      DEBUG_SYNC && console.log('[Sync] Parent found:', parent)
      if (parent && parent.name && studioPropertyPanel) {
        const parentSuccess = studioPropertyPanel.showComponentDefinition(parent.name)
        DEBUG_SYNC && console.log('[Sync] Parent showComponentDefinition result:', parentSuccess)
        if (parentSuccess) {
          studioSelectionManager.clearSelection()
          // Determine what kind of nested line this is (state, event, etc.)
          const trimmedLine = lineContent.trim()
          let childLabel = 'nested'
          if (trimmedLine.startsWith('state ')) {
            const stateMatch = trimmedLine.match(/^state\s+(\w+)/)
            childLabel = stateMatch ? `state: ${stateMatch[1]}` : 'state'
          } else if (trimmedLine.startsWith('on')) {
            const eventMatch = trimmedLine.match(/^(on\w+)/)
            childLabel = eventMatch ? eventMatch[1] : 'event'
          }
          studioSelectionManager.setBreadcrumb([{
            nodeId: `def-${parent.name}`,
            label: `${parent.name} (Definition)`,
            componentName: parent.name
          }, {
            nodeId: `child-${childLabel}`,
            label: childLabel,
            componentName: parent.name
          }])
        }
      }
      return
    }

    const { name: componentName, isDefinition } = componentInfo

    DEBUG_SYNC && console.log('[Sync] Component:', componentName, 'isDefinition:', isDefinition, 'hasPropertyPanel:', !!studioPropertyPanel)

    // Handle definitions: show component definition properties
    if (isDefinition && studioPropertyPanel) {
      const success = studioPropertyPanel.showComponentDefinition(componentName)
      DEBUG_SYNC && console.log('[Sync] showComponentDefinition result:', success)
      if (success) {
        studioSelectionManager.clearSelection()
        // Update breadcrumb to show we're in a definition
        studioSelectionManager.setBreadcrumb([{
          nodeId: `def-${componentName}`,
          label: `${componentName} (Definition)`,
          componentName: componentName
        }])
        return
      }
    }

    // Handle instances: find the instance that matches the line content
    if (currentSourceMap && studioPropertyExtractor) {
      const instances = currentSourceMap.getNodesByComponent(componentName)
      if (instances && instances.length > 0) {
        // For single instances, just select it
        if (instances.length === 1) {
          studioSelectionManager.select(instances[0].nodeId)
          return
        }

        // For multiple instances, use position order to determine which one to select
        // Count how many component lines of this type are BEFORE the cursor line
        let componentLineIndex = 0
        for (let lineNum = 1; lineNum < editorLine; lineNum++) {
          try {
            const prevLine = editor.state.doc.line(lineNum).text
            const prevInfo = extractComponentFromLine(prevLine)
            if (prevInfo && prevInfo.name === componentName && !prevInfo.isDefinition) {
              componentLineIndex++
            }
          } catch (e) {
            // Line doesn't exist
          }
        }

        // Sort instances by their source position line number
        const sortedInstances = [...instances].sort((a, b) =>
          (a.position?.line || 0) - (b.position?.line || 0)
        )

        // Select the instance at the corresponding index
        const selectedInstance = sortedInstances[componentLineIndex] || sortedInstances[0]

        studioSelectionManager.select(selectedInstance.nodeId)
        return
      }
    }

    // Fallback: try to show definition if component exists but no instances rendered
    DEBUG_SYNC && console.log('[Sync] Fallback: trying showComponentDefinition for', componentName)
    if (studioPropertyPanel) {
      const success = studioPropertyPanel.showComponentDefinition(componentName)
      DEBUG_SYNC && console.log('[Sync] Fallback showComponentDefinition result:', success)
      if (success) {
        studioSelectionManager.clearSelection()
        studioSelectionManager.setBreadcrumb([{
          nodeId: `def-${componentName}`,
          label: `${componentName} (Definition)`,
          componentName: componentName
        }])
        return
      }

      // Component not found - check if we're on a nested line (child slot)
      // Find the parent component definition and show that instead
      DEBUG_SYNC && console.log('[Sync] Component not found, looking for parent...')
      const parent = findParentComponentDefinition(editorLine)
      DEBUG_SYNC && console.log('[Sync] Parent found:', parent)
      if (parent && parent.name) {
        const parentSuccess = studioPropertyPanel.showComponentDefinition(parent.name)
        DEBUG_SYNC && console.log('[Sync] Parent showComponentDefinition result:', parentSuccess)
        if (parentSuccess) {
          studioSelectionManager.clearSelection()
          studioSelectionManager.setBreadcrumb([{
            nodeId: `def-${parent.name}`,
            label: `${parent.name} (Definition)`,
            componentName: parent.name
          }, {
            nodeId: `child-${componentName}`,
            label: componentName,
            componentName: componentName
          }])
        }
      }
    }
  } catch (e) {
    console.warn('Studio: Could not sync to cursor', e)
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

  // ============================================
  // NEW ARCHITECTURE: Initialize new studio
  // ============================================
  try {
    initNewStudio({
      editor: editor,
      previewContainer: previewContainer,
      propertyPanelContainer: propertyPanelContainer,
      initialSource: files[currentFile] || '',
      currentFile: currentFile,
    })
    console.log('Studio: New architecture initialized')
  } catch (e) {
    console.warn('Studio: New architecture failed to initialize:', e)
  }

  // ============================================
  // SELECTION ADAPTER: Bridge between new state and legacy PropertyPanel
  // Uses StateSelectionAdapter which automatically syncs with core state
  // ============================================
  studioSelectionManager = getStateSelectionAdapter()

  // Focus tracking is now handled by EditorController and PreviewController
  // The state.editorHasFocus is updated automatically by the new architecture

  console.log('Studio: Initialized')
}

// Update studio after compile
function updateStudio(ast, sourceMap, source) {
  if (!studioSelectionManager) return

  currentAST = ast
  currentSourceMap = sourceMap

  // ============================================
  // NEW ARCHITECTURE: Update state
  // ============================================
  try {
    updateStudioState(ast, null, sourceMap, source)
  } catch (e) {
    console.warn('Studio: New architecture update failed:', e)
  }

  // SourceMap sync handled by new architecture via updateStudioState()

  const propertyPanelContainer = document.getElementById('property-panel')
  const previewContainer = document.getElementById('preview')

  // Refresh preview controller after DOM update
  if (studio.preview) {
    studio.preview.refresh()
  }

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
      studioSelectionManager.setBreadcrumb([])
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

  // Sync property panel to editor cursor after compile (if editor has focus)
  if (getEditorHasFocus()) {
    syncPropertyPanelToEditorCursor()
  }
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

  // Adjust change positions for prelude offset
  // The CodeModifier operates on the merged source (prelude + current file),
  // but the editor only contains the current file
  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate adjusted change range before applying (prevents RangeError crashes)
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength || adjustedChange.from > adjustedChange.to) {
    console.warn('Studio: Invalid change range after adjustment', {
      original: result.change,
      adjusted: adjustedChange,
      preludeOffset: currentPreludeOffset,
      docLength
    })
    // Force recompile to fix the state mismatch
    debouncedCompile.cancel()
    compile(editor.state.doc.toString())
    return
  }

  // Calculate inverse change for undo
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the adjusted change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: [
      propertyPanelChangeAnnotation.of(true),
      Transaction.userEvent.of('input.property')
    ]
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: 'Property change'
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'panel',
    change: adjustedChange
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

  // Adjust change positions for prelude offset (merged source vs single file)
  const change = result.modification.change
  const adjustedChange = {
    from: change.from - currentPreludeOffset,
    to: change.to - currentPreludeOffset,
    insert: change.insert
  }

  // Validate range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength || adjustedChange.from > adjustedChange.to) {
    console.warn('Studio: Invalid drop range after offset adjustment')
    return
  }

  // Calculate inverse change for undo
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('input.drop')
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: 'Drop component'
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'drag-drop',
    change: adjustedChange
  })

  console.log('Studio: Component dropped', result.dropZone?.targetId, result.dropZone?.placement)
}

// Handle element deletion from canvas
function handleElementDelete() {
  if (!studioSelectionManager || !studioCodeModifier) return false

  const selection = studioSelectionManager.getSelection()
  if (!selection) return false

  // Get the node to delete (use templateId for template instances)
  const nodeId = selection.templateId || selection.nodeId
  if (!nodeId) return false

  // Remove the node
  const result = studioCodeModifier.removeNode(nodeId)
  if (!result.success) {
    console.warn('Studio: Failed to delete element:', result.error)
    return false
  }

  // Adjust change positions for prelude offset
  const adjustedChange = {
    from: result.change.from - currentPreludeOffset,
    to: result.change.to - currentPreludeOffset,
    insert: result.change.insert
  }

  // Validate range
  const docLength = editor.state.doc.length
  if (adjustedChange.from < 0 || adjustedChange.to > docLength) {
    console.warn('Studio: Invalid delete range')
    return false
  }

  // Calculate inverse change for undo (the deleted content)
  const currentSource = editor.state.doc.toString()
  const inverseChange = {
    from: adjustedChange.from,
    to: adjustedChange.from + adjustedChange.insert.length,
    insert: currentSource.substring(adjustedChange.from, adjustedChange.to)
  }

  // Apply the change to CodeMirror
  editor.dispatch({
    changes: adjustedChange,
    annotations: Transaction.userEvent.of('delete.element')
  })

  // Record the change in CommandExecutor for undo/redo
  const command = new RecordedChangeCommand({
    change: adjustedChange,
    inverseChange: inverseChange,
    description: `Delete ${nodeId}`
  })
  executor.execute(command)

  // Emit event for tracking
  events.emit('source:changed', {
    source: editor.state.doc.toString(),
    origin: 'keyboard',
    change: adjustedChange
  })

  // Clear selection and recompile
  studioSelectionManager.clearSelection()
  newHandleSelectionChange(null, 'keyboard')
  const code = editor.state.doc.toString()
  compile(code)
  debouncedSave(code)

  console.log('Studio: Element deleted', nodeId)
  return true
}

// Keyboard listener for Delete/Backspace on selected elements
document.addEventListener('keydown', (e) => {
  // Only handle Delete/Backspace when preview has focus (not editor)
  if (getEditorHasFocus()) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    if (handleElementDelete()) {
      e.preventDefault()
    }
  }
})

// Global undo/redo via CommandExecutor (when preview has focus)
document.addEventListener('keydown', (e) => {
  // Don't interfere with editor's own undo/redo
  if (getEditorHasFocus()) return
  // Don't interfere with input fields
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modifier = isMac ? e.metaKey : e.ctrlKey

  if (modifier && e.key === 'z') {
    if (e.shiftKey) {
      // Redo
      if (executor.canRedo()) {
        e.preventDefault()
        const result = executor.redo()
        if (result.success) {
          compile(editor.state.doc.toString())
          console.log('Studio: Redo via CommandExecutor')
        }
      }
    } else {
      // Undo
      if (executor.canUndo()) {
        e.preventDefault()
        const result = executor.undo()
        if (result.success) {
          compile(editor.state.doc.toString())
          console.log('Studio: Undo via CommandExecutor')
        }
      }
    }
  }
  // Also support Ctrl+Y for redo on Windows
  if (!isMac && e.ctrlKey && e.key === 'y') {
    if (executor.canRedo()) {
      e.preventDefault()
      const result = executor.redo()
      if (result.success) {
        compile(editor.state.doc.toString())
        console.log('Studio: Redo via CommandExecutor')
      }
    }
  }
})

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
function renderPaletteItem(comp) {
  const props = comp.properties ? ` data-properties="${comp.properties.replace(/"/g, '&quot;')}"` : ''
  const text = comp.text ? ` data-text="${comp.text}"` : ''
  return `
    <div class="component-palette-item" data-component="${comp.name}"${props}${text} draggable="true">
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

// Initialize component palette
function initComponentPalette() {
  updateComponentPalette()
  console.log('Studio: Component palette initialized with', PRIMITIVE_COMPONENTS.length, 'primitives')
}

// Update component palette with primitives + user components
function updateComponentPalette() {
  const container = document.getElementById('components-palette')
  if (!container) return

  // Collect user components from ALL files
  const userComponents = []
  for (const filename of Object.keys(files)) {
    const type = getFileType(filename)
    // Skip token files - they don't contain components
    if (type === 'tokens' || type === 'data') continue

    try {
      const content = files[filename]
      if (!content || !content.trim()) continue

      const ast = Mirror.parse(content)
      if (ast.components) {
        for (const comp of ast.components) {
          // Skip primitives
          if (PRIMITIVE_COMPONENTS.some(p => p.name === comp.name)) continue
          // Skip token definitions (names starting with $)
          if (comp.name.startsWith('$')) continue

          userComponents.push({
            name: comp.name,
            sourceFile: filename
          })
        }
      }
    } catch (e) {
      // Skip files that fail to parse
      console.debug('Failed to parse', filename, 'for components:', e.message)
    }
  }

  // Remove duplicates (keep first occurrence)
  const uniqueUserComponents = []
  const seen = new Set()
  for (const comp of userComponents) {
    if (!seen.has(comp.name)) {
      seen.add(comp.name)
      uniqueUserComponents.push(comp)
    }
  }

  // Combine all components and sort alphabetically
  const allComponents = [
    ...PRIMITIVE_COMPONENTS,
    ...uniqueUserComponents
  ].sort((a, b) => a.name.localeCompare(b.name))

  // Store for filtering
  window.allPaletteComponents = allComponents

  // Render all components
  renderFilteredComponents(allComponents)
}

// Render filtered components to the palette
function renderFilteredComponents(components) {
  const container = document.getElementById('components-palette')
  if (!container) return

  container.innerHTML = components.map(comp => renderPaletteItem(comp)).join('')
  attachPaletteDragHandlers(container)
}

// Filter components by search query
function filterComponents(query) {
  const allComponents = window.allPaletteComponents || []
  if (!query.trim()) {
    renderFilteredComponents(allComponents)
    return
  }

  const lowerQuery = query.toLowerCase()
  const filtered = allComponents.filter(comp =>
    comp.name.toLowerCase().includes(lowerQuery)
  )
  renderFilteredComponents(filtered)
}

// Initialize component search
function initComponentSearch() {
  const searchInput = document.getElementById('component-search')
  if (!searchInput) return

  searchInput.addEventListener('input', (e) => {
    filterComponents(e.target.value)
  })
}

// Alias for backwards compatibility
function updateUserComponentsPalette() {
  updateComponentPalette()
}

// Initialize studio
initStudio()
initComponentSearch()

// Initial compile
compile(initialCode)

// Expose for debugging
window.editor = editor
window.studioSelectionManager = studioSelectionManager
window.startCompletion = startCompletion
window.files = files
window.studio = studio  // New architecture
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
    selection: { anchor: pos + insertText.length },
    annotations: Transaction.userEvent.of('input.image')
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

  // Block component drops on editor (they should go to preview)
  if (e.dataTransfer.types.includes('application/mirror-component')) {
    e.preventDefault()
    e.stopPropagation()
    return
  }

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
          changes: { from: 0, to: state.doc.length, insert: mirrorCode },
          annotations: Transaction.userEvent.of('input.ai')
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
          selection: { anchor: cursorPos + insertText.length },
          annotations: Transaction.userEvent.of('input.ai')
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

