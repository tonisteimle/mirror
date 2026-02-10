import * as Collapsible from '@radix-ui/react-collapsible'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const CollapsibleBehavior: BehaviorHandler = {
  name: 'Collapsible',

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
      <Collapsible.Root open={isOpen} onOpenChange={handleOpenChange}>
        {triggerNodes.map((trigger) => (
          <Collapsible.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </Collapsible.Trigger>
        ))}

        <Collapsible.Content
          style={{
            overflow: 'hidden',
            animation: isOpen ? 'slideDownAndFade 0.2s ease-out' : 'slideUpAndFade 0.2s ease-out'
          }}
        >
          {contentNodes.map((content) => (
            <div key={content.id} style={getStylesFromNode(content)}>
              {content.content || content.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
            </div>
          ))}
        </Collapsible.Content>
      </Collapsible.Root>
    )
  }
}
