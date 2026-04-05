/**
 * Tree Panel Module
 *
 * Displays AST as a navigable tree structure.
 */

import type { AST, Instance, ComponentDefinition, Slot } from '../../../compiler/parser/ast'

export interface TreeNode {
  id: string
  name: string
  type: string
  children: TreeNode[]
  isExpanded: boolean
  isSelected: boolean
  depth: number
}

export interface TreePanelConfig {
  container: HTMLElement
  showIcons?: boolean
  indentSize?: number
  expandable?: boolean
}

export interface TreePanelCallbacks {
  onSelect: (nodeId: string) => void
  onExpand?: (nodeId: string) => void
  onCollapse?: (nodeId: string) => void
}

export class TreePanel {
  private container: HTMLElement
  private config: Required<TreePanelConfig>
  private callbacks: TreePanelCallbacks
  private treeData: TreeNode[] = []
  private expandedNodes: Set<string> = new Set()
  private selectedNodeId: string | null = null

  constructor(config: TreePanelConfig, callbacks: TreePanelCallbacks) {
    this.container = config.container
    this.config = {
      showIcons: true,
      indentSize: 16,
      expandable: true,
      ...config,
    }
    this.callbacks = callbacks
    this.container.classList.add('tree-panel')
  }

  render(ast: AST): void {
    this.treeData = this.buildTree(ast)
    this.renderTree()
  }

  refresh(): void {
    this.renderTree()
  }

  selectNode(nodeId: string): void {
    this.selectedNodeId = nodeId
    this.expandToNode(nodeId)
    this.renderTree()
  }

  getSelectedNode(): string | null {
    return this.selectedNodeId
  }

  expandNode(nodeId: string): void {
    this.expandedNodes.add(nodeId)
    this.callbacks.onExpand?.(nodeId)
    this.renderTree()
  }

  collapseNode(nodeId: string): void {
    this.expandedNodes.delete(nodeId)
    this.callbacks.onCollapse?.(nodeId)
    this.renderTree()
  }

  expandAll(): void {
    this.forEachNode(this.treeData, node => {
      if (node.children.length > 0) {
        this.expandedNodes.add(node.id)
      }
    })
    this.renderTree()
  }

  collapseAll(): void {
    this.expandedNodes.clear()
    this.renderTree()
  }

  expandToNode(nodeId: string): void {
    // Find path to node and expand all ancestors
    const path = this.findPathToNode(nodeId, this.treeData)
    for (const node of path) {
      if (node.id !== nodeId) {
        this.expandedNodes.add(node.id)
      }
    }
  }

  getTreeData(): TreeNode[] {
    return this.treeData
  }

  private buildTree(ast: AST): TreeNode[] {
    const nodes: TreeNode[] = []

    // Component definitions
    if (ast.components) {
      for (const comp of ast.components) {
        nodes.push(this.buildComponentNode(comp, 0))
      }
    }

    // Root instances
    if (ast.instances) {
      for (const inst of ast.instances) {
        if (inst.type === 'Slot') {
          nodes.push(this.buildSlotNode(inst, 0))
        } else if (inst.type === 'Instance') {
          nodes.push(this.buildInstanceNode(inst, 0))
        }
        // Skip TableNode, Each and other node types for now
      }
    }

    return nodes
  }

  private buildComponentNode(comp: ComponentDefinition, depth: number): TreeNode {
    const nodeId = comp.nodeId || `comp_${comp.name}`
    const children: TreeNode[] = []

    if (comp.children) {
      for (const child of comp.children) {
        // Only process Instance nodes, skip Slot nodes
        if (child.type === 'Instance') {
          children.push(this.buildInstanceNode(child, depth + 1))
        }
      }
    }

    return {
      id: nodeId,
      name: `${comp.name}:`,
      type: comp.extends || comp.primitive || 'Component',
      children,
      isExpanded: this.expandedNodes.has(nodeId),
      isSelected: this.selectedNodeId === nodeId,
      depth,
    }
  }

  private buildInstanceNode(inst: Instance, depth: number): TreeNode {
    const nodeId = inst.nodeId || `inst_${inst.component}_${depth}`
    const children: TreeNode[] = []

    if (inst.children) {
      for (const child of inst.children) {
        // Only process Instance nodes, skip Text nodes
        if (child.type === 'Instance') {
          children.push(this.buildInstanceNode(child, depth + 1))
        }
      }
    }

    const name = inst.name || inst.component

    return {
      id: nodeId,
      name,
      type: inst.component,
      children,
      isExpanded: this.expandedNodes.has(nodeId),
      isSelected: this.selectedNodeId === nodeId,
      depth,
    }
  }

  private buildSlotNode(slot: Slot, depth: number): TreeNode {
    const nodeId = slot.nodeId || `slot_${slot.name}_${depth}`
    return {
      id: nodeId,
      name: `Slot "${slot.name}"`,
      type: 'Slot',
      children: [],
      isExpanded: false,
      isSelected: this.selectedNodeId === nodeId,
      depth,
    }
  }

  private renderTree(): void {
    this.container.innerHTML = ''

    const list = document.createElement('ul')
    list.className = 'tree-panel-list'
    list.setAttribute('role', 'tree')

    for (const node of this.treeData) {
      list.appendChild(this.renderNode(node))
    }

    this.container.appendChild(list)
  }

  private renderNode(node: TreeNode): HTMLElement {
    const li = document.createElement('li')
    li.className = 'tree-panel-item'
    li.setAttribute('role', 'treeitem')
    li.setAttribute('aria-expanded', String(node.isExpanded))
    li.setAttribute('data-node-id', node.id)

    const row = document.createElement('div')
    row.className = `tree-panel-row ${node.isSelected ? 'selected' : ''}`
    row.style.paddingLeft = `${node.depth * this.config.indentSize}px`

    // Expand/collapse toggle
    if (this.config.expandable && node.children.length > 0) {
      const toggle = document.createElement('span')
      toggle.className = `tree-panel-toggle ${node.isExpanded ? 'expanded' : ''}`
      toggle.textContent = node.isExpanded ? '▼' : '▶'
      toggle.onclick = (e) => {
        e.stopPropagation()
        if (node.isExpanded) {
          this.collapseNode(node.id)
        } else {
          this.expandNode(node.id)
        }
      }
      row.appendChild(toggle)
    } else {
      const spacer = document.createElement('span')
      spacer.className = 'tree-panel-spacer'
      row.appendChild(spacer)
    }

    // Icon
    if (this.config.showIcons) {
      const icon = document.createElement('span')
      icon.className = `tree-panel-icon icon-${node.type.toLowerCase()}`
      row.appendChild(icon)
    }

    // Name
    const name = document.createElement('span')
    name.className = 'tree-panel-name'
    name.textContent = node.name
    row.appendChild(name)

    // Type badge
    if (node.name !== node.type) {
      const type = document.createElement('span')
      type.className = 'tree-panel-type'
      type.textContent = node.type
      row.appendChild(type)
    }

    row.onclick = () => {
      this.selectedNodeId = node.id
      this.callbacks.onSelect(node.id)
      this.renderTree()
    }

    li.appendChild(row)

    // Children
    if (node.isExpanded && node.children.length > 0) {
      const childList = document.createElement('ul')
      childList.className = 'tree-panel-children'
      childList.setAttribute('role', 'group')

      for (const child of node.children) {
        childList.appendChild(this.renderNode(child))
      }

      li.appendChild(childList)
    }

    return li
  }

  private forEachNode(nodes: TreeNode[], callback: (node: TreeNode) => void): void {
    for (const node of nodes) {
      callback(node)
      if (node.children.length > 0) {
        this.forEachNode(node.children, callback)
      }
    }
  }

  private findPathToNode(nodeId: string, nodes: TreeNode[], path: TreeNode[] = []): TreeNode[] {
    for (const node of nodes) {
      const newPath = [...path, node]

      if (node.id === nodeId) {
        return newPath
      }

      if (node.children.length > 0) {
        const found = this.findPathToNode(nodeId, node.children, newPath)
        if (found.length > 0) {
          return found
        }
      }
    }

    return []
  }
}

/**
 * Factory function
 */
export function createTreePanel(
  config: TreePanelConfig,
  callbacks: TreePanelCallbacks
): TreePanel {
  return new TreePanel(config, callbacks)
}
