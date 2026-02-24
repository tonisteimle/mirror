import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

/**
 * Check if a node is an Input primitive (either named 'Input' or has _primitiveType: 'Input')
 */
function isInputNode(node: ASTNode): boolean {
  return node.name === 'Input' || node.properties._primitiveType === 'Input'
}

/**
 * Check if a node is a Textarea primitive (either named 'Textarea' or has _primitiveType: 'Textarea')
 */
function isTextareaNode(node: ASTNode): boolean {
  return node.name === 'Textarea' || node.properties._primitiveType === 'Textarea'
}

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
    // Accept 'Field' slot, or any component that is/inherits from Input or Textarea
    // This allows custom components like TextInput, EmailInput (which have _primitiveType: 'Input')
    let fieldNodes = slots.get('Field') || slots.get('Input') || slots.get('Textarea') || []

    // If no explicit slots found, look for any child that is an Input or Textarea primitive
    if (fieldNodes.length === 0) {
      fieldNodes = node.children.filter(child =>
        isInputNode(child) || isTextareaNode(child)
      )
    }
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
      <div className="FormField" data-id={node.id} style={containerStyle}>
        {labelNode && (
          <label style={getStylesFromNode(labelNode)}>
            {labelNode.content || renderFn(labelNode, { skipLibraryHandling: true })}
          </label>
        )}
        {fieldNode && (
          isTextareaNode(fieldNode) ? (
            <textarea
              placeholder={fieldNode.properties.placeholder as string || ''}
              rows={fieldNode.properties.rows as number || 3}
              style={{
                ...getStylesFromNode(fieldNode),
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          ) : (
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
          )
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
