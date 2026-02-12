import * as Checkbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const CheckboxBehavior: BehaviorHandler = {
  name: 'Checkbox',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const indicatorNodes = slots.get('Indicator') || []

    const isChecked = registry.getState(node.name) === 'checked'

    const handleCheckedChange = (checked: boolean | 'indeterminate') => {
      registry.setState(node.name, checked === true ? 'checked' : 'unchecked')
    }

    const style = getStylesFromNode(node)

    // Get colors from node properties or use defaults
    const checkedBg = node.properties['checked-bg'] as string || '#3B82F6'
    const uncheckedBg = style.backgroundColor || '#252525'
    const checkColor = node.properties['check-col'] as string || '#FFFFFF'

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
          backgroundColor: isChecked ? checkedBg : uncheckedBg,
          borderColor: isChecked ? checkedBg : (style.borderColor || '#444444'),
          transition: 'all 0.2s'
        }}
      >
        <Checkbox.Indicator>
          {indicatorNodes[0] ? (
            <Check size={14} color={checkColor} />
          ) : (
            <Check size={14} color={checkColor} />
          )}
        </Checkbox.Indicator>
      </Checkbox.Root>
    )
  }
}
