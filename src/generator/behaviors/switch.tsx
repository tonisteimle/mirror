import * as Switch from '@radix-ui/react-switch'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const SwitchBehavior: BehaviorHandler = {
  name: 'Switch',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const thumbNodes = slots.get('Thumb') || []

    const isChecked = registry.getState(node.name) === 'on'

    const handleCheckedChange = (checked: boolean) => {
      registry.setState(node.name, checked ? 'on' : 'off')
    }

    const rootStyle = getStylesFromNode(node)
    const thumbStyle = thumbNodes[0] ? getStylesFromNode(thumbNodes[0]) : {
      width: '20px',
      height: '20px',
      borderRadius: '10px',
      backgroundColor: '#FFFFFF'
    }

    return (
      <Switch.Root
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        style={{
          ...rootStyle,
          cursor: 'pointer',
          backgroundColor: isChecked ? '#3B82F6' : (rootStyle.backgroundColor || '#333'),
          transition: 'background-color 0.2s'
        }}
      >
        <Switch.Thumb
          style={{
            ...thumbStyle,
            display: 'block',
            transform: isChecked ? 'translateX(22px)' : 'translateX(2px)',
            transition: 'transform 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        />
      </Switch.Root>
    )
  }
}
