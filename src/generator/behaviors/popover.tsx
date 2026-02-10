import * as Popover from '@radix-ui/react-popover'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const PopoverBehavior: BehaviorHandler = {
  name: 'Popover',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const triggerNodes = slots.get('Trigger') || []
    const contentNodes = slots.get('Content') || []

    const isOpen = registry.getState(node.name) === 'open'

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'open' : 'closed')
    }

    return (
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        {triggerNodes.map((trigger) => (
          <Popover.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </Popover.Trigger>
        ))}

        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            style={{
              zIndex: 1000,
              animation: 'slideDownAndFade 0.15s ease-out'
            }}
          >
            {contentNodes.map((content) => (
              <div key={content.id} style={getStylesFromNode(content)}>
                {content.children.map((child) => {
                  if (child.name === 'Close') {
                    return (
                      <Popover.Close key={child.id} asChild>
                        {renderFn(child, { skipLibraryHandling: true })}
                      </Popover.Close>
                    )
                  }
                  return renderFn(child, { skipLibraryHandling: true })
                })}
              </div>
            ))}
            <Popover.Arrow style={{ fill: '#1E1E1E' }} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }
}
