import * as Accordion from '@radix-ui/react-accordion'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const AccordionBehavior: BehaviorHandler = {
  name: 'Accordion',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const itemNodes = slots.get('Item') || []

    return (
      <Accordion.Root type="single" collapsible>
        {itemNodes.map((item) => {
          const itemSlots = groupChildrenBySlot(item)
          const triggerNodes = itemSlots.get('Trigger') || []
          const contentNodes = itemSlots.get('Content') || []

          return (
            <Accordion.Item
              key={item.id}
              value={item.id}
              style={getStylesFromNode(item)}
            >
              {triggerNodes.map((trigger) => (
                <Accordion.Header key={trigger.id} style={{ margin: 0 }}>
                  <Accordion.Trigger
                    style={{
                      ...getStylesFromNode(trigger),
                      width: '100%',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left'
                    }}
                  >
                    {trigger.content || trigger.children.map(child =>
                      renderFn(child, { skipLibraryHandling: true })
                    )}
                  </Accordion.Trigger>
                </Accordion.Header>
              ))}

              {contentNodes.map((content) => (
                <Accordion.Content
                  key={content.id}
                  style={getStylesFromNode(content)}
                >
                  {content.content || content.children.map(child =>
                    renderFn(child, { skipLibraryHandling: true })
                  )}
                </Accordion.Content>
              ))}
            </Accordion.Item>
          )
        })}
      </Accordion.Root>
    )
  }
}

