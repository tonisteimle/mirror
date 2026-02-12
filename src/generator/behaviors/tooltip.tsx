import * as Tooltip from '@radix-ui/react-tooltip'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const TooltipBehavior: BehaviorHandler = {
  name: 'Tooltip',

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
      <Tooltip.Provider delayDuration={200}>
        <Tooltip.Root>
          {triggerNodes.map((trigger) => (
            <Tooltip.Trigger key={trigger.id} asChild>
              {renderFn(trigger, { skipLibraryHandling: true })}
            </Tooltip.Trigger>
          ))}

          <Tooltip.Portal>
            {contentNodes.map((content) => (
              <Tooltip.Content
                key={content.id}
                sideOffset={4}
                style={{
                  ...getStylesFromNode(content),
                  zIndex: 1000,
                  animation: 'fadeIn 0.15s ease-out'
                }}
              >
                {content.content || content.children.map(child =>
                  renderFn(child, { skipLibraryHandling: true })
                )}
                <Tooltip.Arrow style={{ fill: content.properties.col as string || '#1E1E1E' }} />
              </Tooltip.Content>
            ))}
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    )
  }
}
