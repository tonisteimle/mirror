import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'

export const InputBehavior: BehaviorHandler = {
  name: 'Input',

  render(
    node: ASTNode,
    children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const labelNodes = children.get('Label') || []
    const fieldNodes = children.get('Field') || []
    const hintNodes = children.get('Hint') || []

    const containerStyle = getContainerStyles(node)
    const labelNode = labelNodes[0]
    const fieldNode = fieldNodes[0]
    const hintNode = hintNodes[0]

    return (
      <div style={containerStyle}>
        {labelNode && (
          <label style={getLabelStyles(labelNode)}>
            {labelNode.content || renderFn(labelNode)}
          </label>
        )}
        {fieldNode && (
          <input
            type={fieldNode.properties.type as string || 'text'}
            placeholder={fieldNode.properties.placeholder as string || ''}
            style={getFieldStyles(fieldNode)}
          />
        )}
        {hintNode && (
          <span style={getHintStyles(hintNode)}>
            {hintNode.content || renderFn(hintNode)}
          </span>
        )}
      </div>
    )
  }
}

function getContainerStyles(node: ASTNode): React.CSSProperties {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }
  const props = node.properties

  if (typeof props.gap === 'number') style.gap = `${props.gap}px`
  if (typeof props.w === 'number') style.width = `${props.w}px`
  if (props.w === 'full') style.width = '100%'

  return style
}

function getLabelStyles(node: ASTNode): React.CSSProperties {
  const style: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 500,
    color: '#FFFFFF',
  }
  const props = node.properties

  if (typeof props.size === 'number') style.fontSize = `${props.size}px`
  if (typeof props.weight === 'number') style.fontWeight = props.weight
  if (typeof props.col === 'string') style.color = props.col

  return style
}

function getFieldStyles(node: ASTNode): React.CSSProperties {
  const style: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
    border: '1px solid #333',
    borderRadius: '6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }
  const props = node.properties

  // Padding
  if (typeof props.pad === 'number') {
    style.padding = `${props.pad}px`
  } else if (Array.isArray(props.pad)) {
    if (props.pad.length === 2) {
      style.padding = `${props.pad[0]}px ${props.pad[1]}px`
    } else if (props.pad.length === 4) {
      style.padding = `${props.pad[0]}px ${props.pad[1]}px ${props.pad[2]}px ${props.pad[3]}px`
    }
  }

  if (typeof props.size === 'number') style.fontSize = `${props.size}px`
  if (typeof props.bg === 'string') style.backgroundColor = props.bg
  if (typeof props.col === 'string') style.color = props.col
  if (typeof props.bor === 'number') style.border = `${props.bor}px solid ${props.boc || '#333'}`
  if (typeof props.boc === 'string') style.borderColor = props.boc
  if (typeof props.rad === 'number') style.borderRadius = `${props.rad}px`

  return style
}

function getHintStyles(node: ASTNode): React.CSSProperties {
  const style: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
  }
  const props = node.properties

  if (typeof props.size === 'number') style.fontSize = `${props.size}px`
  if (typeof props.col === 'string') style.color = props.col

  return style
}
