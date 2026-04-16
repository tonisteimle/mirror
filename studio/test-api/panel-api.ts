/**
 * Panel API - Test interface for Studio Panels
 *
 * Provides programmatic access to:
 * - Property Panel (get/set properties, tokens)
 * - Tree Panel (navigate, select)
 * - Files Panel (create, open, delete files)
 */

import type { PanelAPI, PropertyPanelAPI, TreePanelAPI, FilesPanelAPI, TreeNode } from './types'

// =============================================================================
// Property Panel API
// =============================================================================

class PropertyPanelAPIImpl implements PropertyPanelAPI {
  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  private get panel(): any {
    return this.studio?.propertyPanel
  }

  // PropertyPanel now exposes controller methods directly

  private getCurrentElement(): any {
    // Use panel's public method
    return this.panel?.getCurrentElement?.()
  }

  isVisible(): boolean {
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return false
    return !panelEl.classList.contains('panel-hidden')
  }

  getSelectedNodeId(): string | null {
    const element = this.getCurrentElement()
    return element?.nodeId ?? null
  }

  getPropertyValue(name: string): string | null {
    const element = this.getCurrentElement()
    if (!element) return null

    // ExtractedElement has allProperties (flat list) and categories
    const allProps = element.allProperties || []

    // Try allProperties first
    const prop = allProps.find((p: any) => p.name === name)
    if (prop) return prop.value ?? null

    // Also check categories
    for (const cat of element.categories || []) {
      const catProp = cat.properties?.find((p: any) => p.name === name)
      if (catProp) return catProp.value ?? null
    }

    return null
  }

  getAllProperties(): Record<string, string> {
    const element = this.getCurrentElement()
    if (!element) return {}

    const props: Record<string, string> = {}

    // ExtractedElement has allProperties (flat list)
    for (const p of element.allProperties || []) {
      if (p.hasValue && p.value !== undefined) {
        props[p.name] = p.value
      }
    }

    return props
  }

  async setProperty(name: string, value: string): Promise<boolean> {
    const panel = this.panel
    if (!panel?.changeProperty) return false

    const element = this.getCurrentElement()
    if (!element?.nodeId) return false

    panel.changeProperty(name, value)

    // Wait for debounce (300ms default) + compile cycle (200ms) + buffer
    await new Promise(resolve => setTimeout(resolve, 700))
    return true
  }

  async removeProperty(name: string): Promise<boolean> {
    const panel = this.panel
    if (!panel?.removeProperty) return false

    const element = this.getCurrentElement()
    if (!element?.nodeId) return false

    panel.removeProperty(name)

    // Wait for compile
    await new Promise(resolve => setTimeout(resolve, 200))
    return true
  }

  async toggleProperty(name: string, enabled: boolean): Promise<boolean> {
    const panel = this.panel
    if (!panel?.toggleProperty) return false

    const element = this.getCurrentElement()
    if (!element?.nodeId) return false

    panel.toggleProperty(name, enabled)

    // Wait for compile
    await new Promise(resolve => setTimeout(resolve, 200))
    return true
  }

  getTokenOptions(property: string): string[] {
    // Extract tokens directly from source code
    const studio = this.studio
    const state = studio?.state?.get()
    if (!state?.source) return []

    // Map property names to token types
    const spacingProps = [
      'pad',
      'padding',
      'mar',
      'margin',
      'gap',
      'rad',
      'radius',
      'fs',
      'font-size',
    ]
    const colorProps = [
      'bg',
      'background',
      'col',
      'color',
      'boc',
      'border-color',
      'ic',
      'icon-color',
    ]

    // Normalize property name
    const propLower = property.toLowerCase()
    const tokens: string[] = []
    const lines = state.source.split('\n')

    // Check for spacing tokens
    for (const sp of spacingProps) {
      if (propLower === sp || propLower.startsWith(sp)) {
        // Map to the correct propType
        const propType =
          sp === 'padding'
            ? 'pad'
            : sp === 'margin'
              ? 'mar'
              : sp === 'radius'
                ? 'rad'
                : sp === 'font-size'
                  ? 'fs'
                  : sp

        for (const line of lines) {
          // Match: name.pad: 12 or name.gap: 8, etc.
          const match = line.match(new RegExp(`^(\\w+)\\.${propType}:\\s*(\\d+)`))
          if (match) {
            tokens.push(match[1])
          }
        }
        return tokens
      }
    }

    // Check for color tokens
    for (const cp of colorProps) {
      if (propLower === cp || propLower.startsWith(cp)) {
        for (const line of lines) {
          // Match: name.bg: #color or name.col: #color
          const propType =
            cp === 'background'
              ? 'bg'
              : cp === 'color'
                ? 'col'
                : cp === 'border-color'
                  ? 'boc'
                  : cp === 'icon-color'
                    ? 'ic'
                    : cp
          const match = line.match(
            new RegExp(`^(\\w+)\\.${propType}:\\s*(#[a-fA-F0-9]{3,8}|rgba?\\([^)]+\\))`)
          )
          if (match) {
            tokens.push(match[1])
          }
        }
        return tokens
      }
    }

    return []
  }

  async clickToken(property: string, tokenName: string): Promise<boolean> {
    // Find token button in UI and click it
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return false

    // Find the section for this property
    const tokenButtons = panelEl.querySelectorAll('.token-btn, [data-token]')
    for (const btn of tokenButtons) {
      const text = btn.textContent?.trim()
      const dataToken = btn.getAttribute('data-token')
      if (text === tokenName || dataToken === tokenName) {
        ;(btn as HTMLElement).click()
        await new Promise(resolve => setTimeout(resolve, 300))
        return true
      }
    }
    return false
  }

  getSections(): string[] {
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return []

    const sections = panelEl.querySelectorAll('.property-section, [data-section]')
    return Array.from(sections)
      .map(
        s =>
          s.getAttribute('data-section') ||
          s.querySelector('.section-header')?.textContent?.trim() ||
          ''
      )
      .filter(Boolean)
  }

  isSectionExpanded(sectionName: string): boolean {
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return false

    const section = panelEl.querySelector(`[data-section="${sectionName}"]`)
    if (!section) return false

    return !section.classList.contains('collapsed')
  }

  toggleSection(sectionName: string): void {
    if (this.panel?.toggleSection) {
      this.panel.toggleSection(sectionName)
    }
  }

  getInputValue(inputName: string): string | null {
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return null

    const input = panelEl.querySelector(
      `input[name="${inputName}"], input[data-property="${inputName}"]`
    ) as HTMLInputElement | null

    return input?.value ?? null
  }

  async setInputValue(inputName: string, value: string): Promise<boolean> {
    const panelEl = document.getElementById('property-panel')
    if (!panelEl) return false

    const input = panelEl.querySelector(
      `input[name="${inputName}"], input[data-property="${inputName}"]`
    ) as HTMLInputElement | null

    if (!input) return false

    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await new Promise(resolve => setTimeout(resolve, 400))
    return true
  }
}

// =============================================================================
// Tree Panel API
// =============================================================================

class TreePanelAPIImpl implements TreePanelAPI {
  private get treeContainer(): HTMLElement | null {
    return (
      document.getElementById('tree-panel') ||
      document.querySelector('.tree-panel') ||
      document.querySelector('[data-panel="tree"]')
    )
  }

  getNodes(): TreeNode[] {
    const container = this.treeContainer
    if (!container) return []

    const nodes: TreeNode[] = []
    const treeItems = container.querySelectorAll('.tree-item, [data-node-id]')

    for (const item of treeItems) {
      const nodeId = item.getAttribute('data-node-id') || item.getAttribute('data-mirror-id')
      if (!nodeId) continue

      const labelEl = item.querySelector('.tree-label, .node-name')
      const label = labelEl?.textContent?.trim() || nodeId

      const depth = parseInt(item.getAttribute('data-depth') || '0')
      const isExpanded = !item.classList.contains('collapsed')
      const isSelected = item.classList.contains('selected')

      nodes.push({ nodeId, label, depth, expanded: isExpanded, selected: isSelected })
    }

    return nodes
  }

  getSelected(): string | null {
    const container = this.treeContainer
    if (!container) return null

    const selected = container.querySelector('.tree-item.selected, [data-node-id].selected')
    return selected?.getAttribute('data-node-id') || null
  }

  select(nodeId: string): void {
    const container = this.treeContainer
    if (!container) return

    const item = container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement
    if (item) {
      item.click()
    }
  }

  expand(nodeId: string): void {
    const container = this.treeContainer
    if (!container) return

    const item = container.querySelector(`[data-node-id="${nodeId}"]`)
    if (item?.classList.contains('collapsed')) {
      const toggle = item.querySelector('.tree-toggle, .expand-btn')
      if (toggle) {
        ;(toggle as HTMLElement).click()
      }
    }
  }

  collapse(nodeId: string): void {
    const container = this.treeContainer
    if (!container) return

    const item = container.querySelector(`[data-node-id="${nodeId}"]`)
    if (item && !item.classList.contains('collapsed')) {
      const toggle = item.querySelector('.tree-toggle, .expand-btn')
      if (toggle) {
        ;(toggle as HTMLElement).click()
      }
    }
  }

  expandAll(): void {
    const container = this.treeContainer
    if (!container) return

    const collapsed = container.querySelectorAll('.tree-item.collapsed')
    for (const item of collapsed) {
      const toggle = item.querySelector('.tree-toggle, .expand-btn')
      if (toggle) {
        ;(toggle as HTMLElement).click()
      }
    }
  }

  collapseAll(): void {
    const container = this.treeContainer
    if (!container) return

    const expanded = container.querySelectorAll('.tree-item:not(.collapsed)')
    for (const item of expanded) {
      const toggle = item.querySelector('.tree-toggle, .expand-btn')
      if (toggle) {
        ;(toggle as HTMLElement).click()
      }
    }
  }
}

// =============================================================================
// Files Panel API
// =============================================================================

class FilesPanelAPIImpl implements FilesPanelAPI {
  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  private get files(): Record<string, string> {
    return (window as any).files || {}
  }

  private get filesContainer(): HTMLElement | null {
    return (
      document.getElementById('explorer-panel') ||
      document.querySelector('.files-panel') ||
      document.querySelector('[data-panel="files"]')
    )
  }

  list(): string[] {
    return Object.keys(this.files)
  }

  getContent(filename: string): string | null {
    return this.files[filename] ?? null
  }

  async create(name: string, content = ''): Promise<boolean> {
    const files = this.files
    if (files[name] !== undefined) return false // Already exists

    files[name] = content

    // Trigger UI update
    const addFile = (window as any).addFile
    if (addFile) {
      addFile(name)
    }

    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  }

  async open(name: string): Promise<boolean> {
    const switchFile = (window as any).switchFile
    if (!switchFile) return false

    if (!this.files[name]) return false

    switchFile(name)
    await new Promise(resolve => setTimeout(resolve, 200))
    return true
  }

  async delete(name: string): Promise<boolean> {
    const files = this.files
    if (!files[name]) return false

    delete files[name]

    // Trigger UI update
    const deleteFile = (window as any).deleteFile
    if (deleteFile) {
      deleteFile(name)
    }

    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  }

  async rename(oldName: string, newName: string): Promise<boolean> {
    const files = this.files
    if (!files[oldName]) return false
    if (files[newName]) return false // New name exists

    const content = files[oldName]
    delete files[oldName]
    files[newName] = content

    await new Promise(resolve => setTimeout(resolve, 100))
    return true
  }

  getCurrentFile(): string | null {
    const studio = this.studio
    return studio?.state?.get()?.currentFile ?? null
  }

  getFileType(filename: string): string {
    if (filename.endsWith('.tok') || filename.endsWith('.tokens')) return 'tokens'
    if (filename.endsWith('.com') || filename.endsWith('.components')) return 'components'
    if (filename.endsWith('.mir') || filename.endsWith('.mirror')) return 'layout'
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) return 'data'
    return 'unknown'
  }
}

// =============================================================================
// Combined Panel API
// =============================================================================

export class PanelAPIImpl implements PanelAPI {
  readonly property: PropertyPanelAPI
  readonly tree: TreePanelAPI
  readonly files: FilesPanelAPI

  constructor() {
    this.property = new PropertyPanelAPIImpl()
    this.tree = new TreePanelAPIImpl()
    this.files = new FilesPanelAPIImpl()
  }
}

export function createPanelAPI(): PanelAPI {
  return new PanelAPIImpl()
}
