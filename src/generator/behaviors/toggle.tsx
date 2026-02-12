import * as Toggle from '@radix-ui/react-toggle'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { getStylesFromNode } from './index'

export const ToggleBehavior: BehaviorHandler = {
  name: 'Toggle',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const isPressed = registry.getState(node.name) === 'on'
    const style = getStylesFromNode(node)

    const handlePressedChange = (pressed: boolean) => {
      registry.setState(node.name, pressed ? 'on' : 'off')
    }

    // Get colors from node properties or use defaults
    const pressedBg = node.properties['on-bg'] as string || style.backgroundColor || '#252525'

    return (
      <Toggle.Root
        pressed={isPressed}
        onPressedChange={handlePressedChange}
        style={{
          ...style,
          cursor: 'pointer',
          backgroundColor: isPressed ? pressedBg : 'transparent',
          transition: 'background-color 0.15s'
        }}
      >
        {node.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
      </Toggle.Root>
    )
  }
}
