/**
 * TreeView Component (Zag.js)
 *
 * A headless tree view component for file explorer and AST navigation.
 * Uses @zag-js/tree-view for state management.
 */

import * as treeView from '@zag-js/tree-view'
import type { TreeNode } from '@zag-js/collection'

// ============================================================================
// Types
// ============================================================================

export interface FileNode extends TreeNode {
  id: string
  label: string
  type: 'file' | 'folder' | 'tokens' | 'component' | 'layout'
  children?: FileNode[]
}

export interface TreeViewConfig {
  /** Container element */
  container: HTMLElement
  /** Initial tree data */
  nodes: FileNode[]
  /** Initially expanded node IDs */
  expandedIds?: string[]
  /** Initially selected node IDs */
  selectedIds?: string[]
  /** Selection mode */
  selectionMode?: 'single' | 'multiple'
}

export interface TreeViewCallbacks {
  /** Called when selection changes */
  onSelect?: (node: FileNode) => void
  /** Called when a node is expanded/collapsed */
  onExpand?: (expandedIds: string[]) => void
  /** Called on context menu (right-click) */
  onContextMenu?: (node: FileNode, position: { x: number; y: number }) => void
  /** Called on double-click (for rename, open, etc.) */
  onDoubleClick?: (node: FileNode) => void
}

// ============================================================================
// Component
// ============================================================================

export class ZagTreeView {
  private container: HTMLElement
  private service: treeView.Service<FileNode> | null = null
  private callbacks: TreeViewCallbacks
  private config: TreeViewConfig

  constructor(config: TreeViewConfig, callbacks: TreeViewCallbacks = {}) {
    this.container = config.container
    this.config = config
    this.callbacks = callbacks
  }

  /**
   * Initialize the tree view
   */
  init(): this {
    const collection = treeView.collection<FileNode>({
      rootNode: {
        id: 'root',
        label: 'Root',
        type: 'folder',
        children: this.config.nodes,
      },
      nodeToValue: (node) => node.id,
      nodeToString: (node) => node.label,
      nodeToChildren: (node) => node.children || [],
    })

    this.service = treeView.machine({
      id: 'file-tree',
      collection,
      selectionMode: this.config.selectionMode || 'single',
      defaultExpandedValue: this.config.expandedIds || [],
      defaultSelectedValue: this.config.selectedIds || [],
      onSelectionChange: (details) => {
        if (details.selectedNodes.length > 0 && this.callbacks.onSelect) {
          this.callbacks.onSelect(details.selectedNodes[0])
        }
      },
      onExpandedChange: (details) => {
        if (this.callbacks.onExpand) {
          this.callbacks.onExpand(details.expandedValue)
        }
      },
    })

    this.service.subscribe(() => {
      this.render()
    })

    this.service.start()
    return this
  }

  /**
   * Update tree data
   */
  setNodes(nodes: FileNode[]): void {
    if (!this.service) return

    const collection = treeView.collection<FileNode>({
      rootNode: {
        id: 'root',
        label: 'Root',
        type: 'folder',
        children: nodes,
      },
      nodeToValue: (node) => node.id,
      nodeToString: (node) => node.label,
      nodeToChildren: (node) => node.children || [],
    })

    this.service.send({ type: 'COLLECTION.SET', value: collection })
  }

  /**
   * Select a node by ID
   */
  select(nodeId: string): void {
    this.service?.send({ type: 'SELECTED.SET', value: [nodeId] })
  }

  /**
   * Expand a node by ID
   */
  expand(nodeId: string): void {
    this.service?.send({ type: 'EXPANDED.SET', value: [...(this.getExpandedIds() || []), nodeId] })
  }

  /**
   * Collapse a node by ID
   */
  collapse(nodeId: string): void {
    const expanded = this.getExpandedIds() || []
    this.service?.send({ type: 'EXPANDED.SET', value: expanded.filter(id => id !== nodeId) })
  }

  /**
   * Expand all nodes
   */
  expandAll(): void {
    if (!this.service) return
    const api = this.getApi()
    if (api) {
      api.expand()
    }
  }

  /**
   * Collapse all nodes
   */
  collapseAll(): void {
    this.service?.send({ type: 'EXPANDED.SET', value: [] })
  }

  /**
   * Get currently expanded node IDs
   */
  getExpandedIds(): string[] | undefined {
    const api = this.getApi()
    return api?.expandedValue
  }

  /**
   * Get currently selected node IDs
   */
  getSelectedIds(): string[] | undefined {
    const api = this.getApi()
    return api?.selectedValue
  }

  /**
   * Get the Zag API
   */
  private getApi(): treeView.Api<FileNode> | null {
    if (!this.service) return null
    return treeView.connect(this.service)
  }

  /**
   * Render the tree
   */
  private render(): void {
    const api = this.getApi()
    if (!api) return

    this.container.innerHTML = ''
    this.container.className = 'zag-tree-view'

    // Root container
    const root = document.createElement('div')
    this.spreadProps(root, api.getRootProps())
    root.className = 'tree-root'

    // Tree element
    const tree = document.createElement('ul')
    this.spreadProps(tree, api.getTreeProps())
    tree.className = 'tree-list'

    // Render nodes
    const rootNode = api.collection.rootNode
    if (rootNode.children) {
      for (const node of rootNode.children) {
        tree.appendChild(this.renderNode(api, node, []))
      }
    }

    root.appendChild(tree)
    this.container.appendChild(root)
  }

  /**
   * Render a single tree node
   */
  private renderNode(
    api: treeView.Api<FileNode>,
    node: FileNode,
    indexPath: number[]
  ): HTMLElement {
    const hasChildren = node.children && node.children.length > 0
    const nodeState = api.getNodeState({ node, indexPath })

    // Branch node (folder)
    if (hasChildren) {
      const branch = document.createElement('li')
      this.spreadProps(branch, api.getBranchProps({ node, indexPath }))
      branch.className = 'tree-branch'
      if (nodeState.expanded) branch.classList.add('expanded')
      if (nodeState.selected) branch.classList.add('selected')

      // Branch content (clickable row)
      const content = document.createElement('div')
      this.spreadProps(content, api.getBranchContentProps({ node, indexPath }))
      content.className = 'tree-item'

      // Expand/collapse indicator
      const indicator = document.createElement('span')
      this.spreadProps(indicator, api.getBranchIndicatorProps({ node, indexPath }))
      indicator.className = 'tree-indicator'
      indicator.innerHTML = nodeState.expanded ? this.getChevronDown() : this.getChevronRight()

      // Icon
      const icon = document.createElement('span')
      icon.className = `tree-icon tree-icon-${node.type}`
      icon.innerHTML = this.getIcon(node.type, nodeState.expanded)

      // Label
      const text = document.createElement('span')
      this.spreadProps(text, api.getBranchTextProps({ node, indexPath }))
      text.className = 'tree-label'
      text.textContent = node.label

      content.appendChild(indicator)
      content.appendChild(icon)
      content.appendChild(text)

      // Context menu
      content.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        this.callbacks.onContextMenu?.(node, { x: e.clientX, y: e.clientY })
      })

      // Double click
      content.addEventListener('dblclick', () => {
        this.callbacks.onDoubleClick?.(node)
      })

      branch.appendChild(content)

      // Children (branch control)
      if (nodeState.expanded && node.children) {
        const childList = document.createElement('ul')
        this.spreadProps(childList, api.getBranchControlProps({ node, indexPath }))
        childList.className = 'tree-children'

        node.children.forEach((child, i) => {
          childList.appendChild(this.renderNode(api, child, [...indexPath, i]))
        })

        branch.appendChild(childList)
      }

      return branch
    }

    // Leaf node (file)
    const item = document.createElement('li')
    this.spreadProps(item, api.getItemProps({ node, indexPath }))
    item.className = 'tree-item-wrapper'
    if (nodeState.selected) item.classList.add('selected')

    const content = document.createElement('div')
    content.className = 'tree-item'

    // Spacer for alignment with branches
    const spacer = document.createElement('span')
    spacer.className = 'tree-spacer'

    // Icon
    const icon = document.createElement('span')
    icon.className = `tree-icon tree-icon-${node.type}`
    icon.innerHTML = this.getIcon(node.type, false)

    // Label
    const text = document.createElement('span')
    this.spreadProps(text, api.getItemTextProps({ node, indexPath }))
    text.className = 'tree-label'
    text.textContent = node.label

    content.appendChild(spacer)
    content.appendChild(icon)
    content.appendChild(text)

    // Context menu
    content.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      this.callbacks.onContextMenu?.(node, { x: e.clientX, y: e.clientY })
    })

    // Double click
    content.addEventListener('dblclick', () => {
      this.callbacks.onDoubleClick?.(node)
    })

    item.appendChild(content)
    return item
  }

  /**
   * Spread Zag props onto element
   */
  private spreadProps(el: HTMLElement, props: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value as EventListener)
      } else if (
        key.startsWith('data-') ||
        key.startsWith('aria-') ||
        key === 'role' ||
        key === 'id' ||
        key === 'tabindex'
      ) {
        el.setAttribute(key, String(value))
      }
    }
  }

  /**
   * Get icon SVG based on type
   */
  private getIcon(type: string, expanded: boolean): string {
    switch (type) {
      case 'folder':
        return expanded
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 4a2 2 0 012-2h5l2 2h9a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4z"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>'
      case 'tokens':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4m11-11h-4M5 12H1m16.95-6.95l-2.83 2.83M9.88 14.12l-2.83 2.83m0-9.9l2.83 2.83m4.24 4.24l2.83 2.83"/></svg>'
      case 'component':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18"/></svg>'
      case 'layout':
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>'
      default:
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>'
    }
  }

  /**
   * Chevron icons
   */
  private getChevronRight(): string {
    return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>'
  }

  private getChevronDown(): string {
    return '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>'
  }

  /**
   * Destroy the component
   */
  destroy(): void {
    this.service?.stop()
    this.container.innerHTML = ''
    this.service = null
  }
}

/**
 * Factory function
 */
export function createTreeView(
  config: TreeViewConfig,
  callbacks: TreeViewCallbacks = {}
): ZagTreeView {
  return new ZagTreeView(config, callbacks).init()
}
