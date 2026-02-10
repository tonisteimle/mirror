import * as HoverCard from '@radix-ui/react-hover-card'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const HoverCardBehavior: BehaviorHandler = {
  name: 'HoverCard',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const triggerNodes = slots.get('Trigger') || []
    const contentNodes = slots.get('Content') || []

    return (
      <HoverCard.Root openDelay={200} closeDelay={100}>
        {triggerNodes.map((trigger) => (
          <HoverCard.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </HoverCard.Trigger>
        ))}

        <HoverCard.Portal>
          <HoverCard.Content
            sideOffset={4}
            style={{
              zIndex: 1000,
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {contentNodes.map((content) => (
              <div key={content.id} style={getStylesFromNode(content)}>
                {content.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
              </div>
            ))}
            <HoverCard.Arrow style={{ fill: '#1E1E1E' }} />
          </HoverCard.Content>
        </HoverCard.Portal>
      </HoverCard.Root>
    )
  }
}
