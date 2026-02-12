import * as ToggleGroup from '@radix-ui/react-toggle-group'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ToggleGroupBehavior: BehaviorHandler = {
  name: 'ToggleGroup',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const itemNodes = slots.get('Item') || []

    const style = getStylesFromNode(node)
    const currentValue = registry.getState(node.name) || ''

    const handleValueChange = (value: string) => {
      if (value) {
        registry.setState(node.name, value)
      }
    }

    // Check if multiple selection is allowed
    const isMultiple = node.properties.multiple === true

    if (isMultiple) {
      return (
        <ToggleGroup.Root
          type="multiple"
          value={currentValue ? currentValue.split(',') : []}
          onValueChange={(values) => handleValueChange(values.join(','))}
          style={style}
        >
          {itemNodes.map((item) => (
            <ToggleGroup.Item
              key={item.id}
              value={item.id}
              style={{
                ...getStylesFromNode(item),
                cursor: 'pointer'
              }}
            >
              {item.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
            </ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      )
    }

    return (
      <ToggleGroup.Root
        type="single"
        value={currentValue}
        onValueChange={handleValueChange}
        style={style}
      >
        {itemNodes.map((item) => (
          <ToggleGroup.Item
            key={item.id}
            value={item.id}
            style={{
              ...getStylesFromNode(item),
              cursor: 'pointer'
            }}
          >
            {item.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    )
  }
}
