import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const FormFieldBehavior: BehaviorHandler = {
  name: 'FormField',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const labelNodes = slots.get('Label') || []
    const fieldNodes = slots.get('Field') || []
    const hintNodes = slots.get('Hint') || []

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      ...getStylesFromNode(node)
    }

    const labelNode = labelNodes[0]
    const fieldNode = fieldNodes[0]
    const hintNode = hintNodes[0]

    // Simple usage: Input placeholder "..." without slots
    // In this case, render a simple input element
    const hasSlots = labelNodes.length > 0 || fieldNodes.length > 0 || hintNodes.length > 0
    if (!hasSlots) {
      return (
        <input
          type={node.properties.type as string || 'text'}
          placeholder={node.properties.placeholder as string || ''}
          style={{
            ...getStylesFromNode(node),
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      )
    }

    return (
      <div style={containerStyle}>
        {labelNode && (
          <label style={getStylesFromNode(labelNode)}>
            {labelNode.content || renderFn(labelNode, { skipLibraryHandling: true })}
          </label>
        )}
        {fieldNode && (
          <input
            type={fieldNode.properties.type as string || 'text'}
            placeholder={fieldNode.properties.placeholder as string || ''}
            style={{
              ...getStylesFromNode(fieldNode),
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        )}
        {hintNode && (
          <span style={getStylesFromNode(hintNode)}>
            {hintNode.content || renderFn(hintNode, { skipLibraryHandling: true })}
          </span>
        )}
      </div>
    )
  }
}
