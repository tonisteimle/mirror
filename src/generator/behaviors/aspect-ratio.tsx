import * as AspectRatio from '@radix-ui/react-aspect-ratio'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { getStylesFromNode } from './index'

export const AspectRatioBehavior: BehaviorHandler = {
  name: 'AspectRatio',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const style = getStylesFromNode(node)

    // Parse ratio from properties (e.g., "16/9" or just a number)
    let ratio = 16 / 9 // default
    if (node.properties.ratio) {
      const ratioStr = String(node.properties.ratio)
      if (ratioStr.includes('/')) {
        const [w, h] = ratioStr.split('/').map(Number)
        ratio = w / h
      } else {
        ratio = Number(ratioStr)
      }
    }

    return (
      <div style={{ ...style, width: style.width || '100%' }}>
        <AspectRatio.Root ratio={ratio}>
          {node.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
        </AspectRatio.Root>
      </div>
    )
  }
}
