import * as Checkbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { getStylesFromNode } from './index'

export const CheckboxBehavior: BehaviorHandler = {
  name: 'Checkbox',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const isChecked = registry.getState(node.name) === 'checked'

    const handleCheckedChange = (checked: boolean | 'indeterminate') => {
      registry.setState(node.name, checked === true ? 'checked' : 'unchecked')
    }

    const style = getStylesFromNode(node)

    return (
      <Checkbox.Root
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        style={{
          ...style,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isChecked ? '#3B82F6' : (style.backgroundColor || '#252525'),
          borderColor: isChecked ? '#3B82F6' : (style.borderColor || '#444'),
          transition: 'all 0.2s'
        }}
      >
        <Checkbox.Indicator>
          <Check size={14} color="#FFFFFF" />
        </Checkbox.Indicator>
      </Checkbox.Root>
    )
  }
}
