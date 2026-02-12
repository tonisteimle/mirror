import * as Separator from '@radix-ui/react-separator'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { getStylesFromNode } from './index'

export const SeparatorBehavior: BehaviorHandler = {
  name: 'Separator',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const style = getStylesFromNode(node)
    const orientation = node.properties.vertical ? 'vertical' : 'horizontal'

    return (
      <Separator.Root
        orientation={orientation}
        style={{
          ...style,
          backgroundColor: style.backgroundColor || '#333333'
        }}
      />
    )
  }
}
