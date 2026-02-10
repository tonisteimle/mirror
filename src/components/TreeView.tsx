import type { ASTNode } from '../parser/parser'
import { INTERNAL_NODES } from '../constants'

interface TreeViewProps {
  nodes: ASTNode[]
  selectedId: string | null
  onSelect: (id: string) => void
}

interface TreeNodeProps {
  node: ASTNode
  depth: number
  selectedId: string | null
  onSelect: (id: string) => void
}

function TreeNode({ node, depth, selectedId, onSelect }: TreeNodeProps) {
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0
  const isText = node.name === INTERNAL_NODES.TEXT

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          paddingLeft: `${depth * 16 + 8}px`,
          cursor: 'pointer',
          backgroundColor: isSelected ? '#3B82F620' : 'transparent',
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        }}
      >
        <span style={{ color: '#666', width: '16px' }}>
          {hasChildren ? '▾' : isText ? '¶' : '○'}
        </span>
        <span style={{ color: isText ? '#9CA3AF' : '#D4D4D4' }}>
          {isText ? `"${node.content}"` : node.name}
        </span>
        <span style={{ color: '#6B7280', fontSize: '11px' }}>
          :{node.id}
        </span>
        {node.modifiers.length > 0 && (
          <span style={{ color: '#A78BFA', fontSize: '12px' }}>
            {node.modifiers.join(' ')}
          </span>
        )}
      </div>
      {hasChildren && node.children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

export function TreeView({ nodes, selectedId, onSelect }: TreeViewProps) {
  if (nodes.length === 0) {
    return (
      <div style={{
        padding: '16px',
        color: '#666',
        fontSize: '13px',
      }}>
        Komponenten-Baum
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
