/**
 * Project Toolbar
 *
 * Hamburger menu with project actions.
 */

import type { MenuItem } from './types'
import { ICON_HAMBURGER, ICON_NEW, ICON_DEMO, ICON_LOAD, ICON_SAVE } from './icons'
import { confirm } from '../dialog.js'

interface ProjectActions {
  new: () => Promise<void>
  demo: () => Promise<void>
  import: () => Promise<void>
  export: () => Promise<void>
}

let actions: ProjectActions | null = null
let initialized = false
let menuOpen = false

export function setProjectActions(projectActions: ProjectActions): void {
  actions = projectActions
}

export function initProjectToolbar(): void {
  if (initialized) return

  const container = document.getElementById('file-tree-container')
  if (!container) return

  if (container.querySelector('.fp-header')) {
    initialized = true
    return
  }

  const { header, content } = createToolbarStructure()
  moveExistingContent(container, content)
  container.appendChild(header)
  container.appendChild(content)

  attachMenuButton()
  initialized = true
}

function createToolbarStructure(): { header: HTMLElement; content: HTMLElement } {
  const header = createHeader()
  const content = createContent()
  return { header, content }
}

function createHeader(): HTMLElement {
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
  return header
}

function createContent(): HTMLElement {
  const content = document.createElement('div')
  content.id = 'file-tree-content'
  content.className = 'file-tree-content'
  return content
}

function moveExistingContent(container: HTMLElement, content: HTMLElement): void {
  while (container.firstChild) {
    content.appendChild(container.firstChild)
  }
}

function attachMenuButton(): void {
  const btn = document.getElementById('project-menu-btn')
  btn?.addEventListener('click', e => {
    e.stopPropagation()
    toggleProjectMenu(btn)
  })
}

function toggleProjectMenu(anchorBtn: HTMLElement): void {
  const existing = document.getElementById('project-menu')
  if (existing) {
    closeMenu(existing)
    return
  }
  openMenu(anchorBtn)
}

function closeMenu(menu: HTMLElement): void {
  menu.remove()
  menuOpen = false
}

function openMenu(anchorBtn: HTMLElement): void {
  const menu = createMenu()
  positionMenu(menu, anchorBtn)
  document.body.appendChild(menu)
  menuOpen = true
  setupCloseOnClickOutside(menu, anchorBtn)
}

function createMenu(): HTMLElement {
  const menu = document.createElement('div')
  menu.id = 'project-menu'
  menu.className = 'dropdown-menu'

  const items = getMenuItems()
  menu.innerHTML = items.map(renderMenuItem).join('')

  attachMenuActions(menu)
  return menu
}

function getMenuItems(): MenuItem[] {
  return [
    { id: 'new', icon: ICON_NEW, label: 'Neues Projekt' },
    { id: 'demo', icon: ICON_DEMO, label: 'Demo-Projekt' },
    { type: 'separator' },
    { id: 'load', icon: ICON_LOAD, label: 'Projekt öffnen...' },
    { id: 'save', icon: ICON_SAVE, label: 'Projekt speichern...' },
  ]
}

function renderMenuItem(item: MenuItem): string {
  if (item.type === 'separator') {
    return '<div class="dropdown-menu-separator"></div>'
  }
  return `
    <button class="dropdown-menu-item" data-action="${item.id}">
      <span class="dropdown-menu-icon">${item.icon}</span>
      <span class="dropdown-menu-label">${item.label}</span>
    </button>
  `
}

function positionMenu(menu: HTMLElement, anchorBtn: HTMLElement): void {
  const rect = anchorBtn.getBoundingClientRect()
  menu.style.position = 'fixed'
  menu.style.top = `${rect.bottom + 4}px`
  menu.style.left = `${rect.right - 180}px`
  menu.style.zIndex = '9999'
}

function attachMenuActions(menu: HTMLElement): void {
  menu.querySelectorAll<HTMLElement>('.dropdown-menu-item').forEach(btn => {
    btn.addEventListener('click', () => handleMenuAction(btn.dataset.action!))
  })
}

function setupCloseOnClickOutside(menu: HTMLElement, anchorBtn: HTMLElement): void {
  const closeHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!menu.contains(target) && target !== anchorBtn) {
      closeMenu(menu)
      document.removeEventListener('click', closeHandler)
    }
  }
  setTimeout(() => document.addEventListener('click', closeHandler), 0)
}

async function handleMenuAction(action: string): Promise<void> {
  closeCurrentMenu()

  switch (action) {
    case 'new':
      await handleNewProject()
      break
    case 'demo':
      await handleDemoProject()
      break
    case 'load':
      await actions?.import()
      break
    case 'save':
      await actions?.export()
      break
  }
}

function closeCurrentMenu(): void {
  const menu = document.getElementById('project-menu')
  if (menu) closeMenu(menu)
}

async function handleNewProject(): Promise<void> {
  const msg = 'Neues Projekt erstellen? Alle aktuellen Änderungen gehen verloren.'
  if (!(await confirm(msg, { title: 'Neues Projekt' }))) return
  await actions?.new()
}

async function handleDemoProject(): Promise<void> {
  const msg = 'Demo-Projekt laden? Alle aktuellen Änderungen gehen verloren.'
  if (!(await confirm(msg, { title: 'Demo laden' }))) return
  await actions?.demo()
}
