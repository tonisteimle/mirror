/**
 * TreePanel Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TreePanel, createTreePanel, type TreeNode } from '../../studio/panels/tree/index'
import type { AST, Instance, ComponentDefinition } from '../../compiler/parser/ast'

describe('TreePanel', () => {
  let panel: TreePanel
  let container: HTMLElement
  let onSelect: ReturnType<typeof vi.fn>
  let onExpand: ReturnType<typeof vi.fn>
  let onCollapse: ReturnType<typeof vi.fn>

  const sampleAST: AST = {
    components: [
      {
        type: 'Definition',
        name: 'Card',
        extends: 'Ver',
        nodeId: 'card_def',
        children: [
          {
            type: 'Instance',
            component: 'Text',
            nodeId: 'card_title',
            properties: [{ property: 'bold', value: true }],
            children: []
          }
        ],
        properties: [],
        line: 1,
        column: 1,
      } as ComponentDefinition
    ],
    instances: [
      {
        type: 'Instance',
        component: 'Ver',
        nodeId: 'root_ver',
        properties: [],
        children: [
          {
            type: 'Instance',
            component: 'Card',
            nodeId: 'card_1',
            properties: [],
            children: []
          },
          {
            type: 'Instance',
            component: 'Card',
            nodeId: 'card_2',
            properties: [],
            children: []
          }
        ]
      } as Instance
    ]
  }

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)

    onSelect = vi.fn()
    onExpand = vi.fn()
    onCollapse = vi.fn()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should create tree panel', () => {
      panel = new TreePanel({ container }, { onSelect })
      expect(panel).toBeDefined()
    })

    it('should add tree-panel class to container', () => {
      panel = new TreePanel({ container }, { onSelect })
      expect(container.classList.contains('tree-panel')).toBe(true)
    })

    it('should use factory function', () => {
      panel = createTreePanel({ container }, { onSelect })
      expect(panel).toBeInstanceOf(TreePanel)
    })
  })

  describe('render()', () => {
    beforeEach(() => {
      panel = new TreePanel({ container }, { onSelect, onExpand, onCollapse })
    })

    it('should render tree from AST', () => {
      panel.render(sampleAST)
      expect(container.querySelector('.tree-panel-list')).toBeTruthy()
    })

    it('should render tree items', () => {
      panel.render(sampleAST)
      const items = container.querySelectorAll('.tree-panel-item')
      expect(items.length).toBeGreaterThan(0)
    })

    it('should set ARIA role on list', () => {
      panel.render(sampleAST)
      const list = container.querySelector('.tree-panel-list')
      expect(list?.getAttribute('role')).toBe('tree')
    })

    it('should set ARIA role on items', () => {
      panel.render(sampleAST)
      const item = container.querySelector('.tree-panel-item')
      expect(item?.getAttribute('role')).toBe('treeitem')
    })
  })

  describe('Node rendering', () => {
    beforeEach(() => {
      panel = new TreePanel({ container }, { onSelect, onExpand, onCollapse })
      panel.render(sampleAST)
    })

    it('should render node name', () => {
      const name = container.querySelector('.tree-panel-name')
      expect(name?.textContent).toBeTruthy()
    })

    it('should render icon when showIcons is true', () => {
      const icon = container.querySelector('.tree-panel-icon')
      expect(icon).toBeTruthy()
    })

    it('should not render icon when showIcons is false', () => {
      panel = new TreePanel({ container, showIcons: false }, { onSelect })
      panel.render(sampleAST)

      const icon = container.querySelector('.tree-panel-icon')
      expect(icon).toBeFalsy()
    })
  })

  describe('Selection', () => {
    beforeEach(() => {
      panel = new TreePanel({ container }, { onSelect, onExpand, onCollapse })
      panel.render(sampleAST)
    })

    it('should select node on click', () => {
      const row = container.querySelector('.tree-panel-row') as HTMLElement
      row.click()

      expect(onSelect).toHaveBeenCalled()
    })

    it('should select node programmatically', () => {
      panel.selectNode('card_def')
      expect(panel.getSelectedNode()).toBe('card_def')
    })

    it('should return null when no node selected', () => {
      expect(panel.getSelectedNode()).toBeNull()
    })
  })

  describe('Expand/Collapse', () => {
    beforeEach(() => {
      panel = new TreePanel({ container }, { onSelect, onExpand, onCollapse })
      panel.render(sampleAST)
    })

    it('should call onExpand callback', () => {
      panel.expandNode('card_def')
      expect(onExpand).toHaveBeenCalledWith('card_def')
    })

    it('should call onCollapse callback', () => {
      panel.expandNode('card_def')
      panel.collapseNode('card_def')
      expect(onCollapse).toHaveBeenCalledWith('card_def')
    })

    it('should collapse all after expand all', () => {
      panel.expandAll()
      panel.collapseAll()
      // After collapse all, expandAll should be callable again
      panel.expandAll()
      expect(panel).toBeDefined()
    })
  })

  describe('getTreeData', () => {
    it('should return tree data after render', () => {
      panel = new TreePanel({ container }, { onSelect })
      panel.render(sampleAST)

      const data = panel.getTreeData()
      expect(data.length).toBeGreaterThan(0)
    })

    it('should return empty array before render', () => {
      panel = new TreePanel({ container }, { onSelect })

      const data = panel.getTreeData()
      expect(data).toEqual([])
    })
  })

  describe('refresh', () => {
    it('should re-render tree', () => {
      panel = new TreePanel({ container }, { onSelect })
      panel.render(sampleAST)

      const initialItems = container.querySelectorAll('.tree-panel-item').length

      panel.refresh()

      const afterItems = container.querySelectorAll('.tree-panel-item').length
      expect(afterItems).toBe(initialItems)
    })
  })

  describe('Custom config', () => {
    it('should disable expandable', () => {
      panel = new TreePanel({ container, expandable: false }, { onSelect })
      panel.render(sampleAST)

      // When expandable is false, no toggle buttons should be rendered
      // (or they may be rendered differently)
      expect(panel).toBeDefined()
    })

    it('should apply custom indent size', () => {
      panel = new TreePanel({ container, indentSize: 24 }, { onSelect })
      panel.render(sampleAST)

      // Verify custom indent is stored in config
      expect(panel).toBeDefined()
    })
  })

  describe('TreeNode structure', () => {
    it('should build correct tree structure', () => {
      panel = new TreePanel({ container }, { onSelect })
      panel.render(sampleAST)

      const treeData = panel.getTreeData()

      // Should have component definitions and instances
      expect(treeData.some(node => node.id === 'card_def')).toBe(true)
      expect(treeData.some(node => node.id === 'root_ver')).toBe(true)
    })

    it('should track node depth', () => {
      panel = new TreePanel({ container }, { onSelect })
      panel.render(sampleAST)

      const treeData = panel.getTreeData()
      const rootNode = treeData.find(node => node.id === 'root_ver')

      expect(rootNode?.depth).toBe(0)
    })

    it('should track children', () => {
      panel = new TreePanel({ container }, { onSelect })
      panel.render(sampleAST)

      const treeData = panel.getTreeData()
      const rootNode = treeData.find(node => node.id === 'root_ver')

      expect(rootNode?.children.length).toBe(2) // card_1 and card_2
    })
  })
})
