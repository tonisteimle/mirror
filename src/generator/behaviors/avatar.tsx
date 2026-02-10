import * as Avatar from '@radix-ui/react-avatar'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const AvatarBehavior: BehaviorHandler = {
  name: 'Avatar',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const imageNodes = slots.get('Image') || []
    const fallbackNodes = slots.get('Fallback') || []

    const rootStyle = getStylesFromNode(node)
    const imageSrc = imageNodes[0]?.properties.src as string | undefined

    return (
      <Avatar.Root
        style={{
          ...rootStyle,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          userSelect: 'none'
        }}
      >
        {imageSrc && (
          <Avatar.Image
            src={imageSrc}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
        {fallbackNodes.map((fallback) => (
          <Avatar.Fallback
            key={fallback.id}
            delayMs={600}
            style={{
              ...getStylesFromNode(fallback),
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {fallback.content || fallback.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
          </Avatar.Fallback>
        ))}
      </Avatar.Root>
    )
  }
}
