import * as ContextMenu from '@radix-ui/react-context-menu'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ContextMenuBehavior: BehaviorHandler = {
  name: 'ContextMenu',

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
      <ContextMenu.Root>
        {triggerNodes.map((trigger) => (
          <ContextMenu.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </ContextMenu.Trigger>
        ))}

        <ContextMenu.Portal>
          <ContextMenu.Content
            style={{
              zIndex: 1000,
              animation: 'slideDownAndFade 0.15s ease-out'
            }}
          >
            {contentNodes.map((content) => renderContentChildren(content, renderFn))}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    )
  }
}

function renderContentChildren(contentNode: ASTNode, renderFn: RenderFn): React.ReactNode {
  const contentStyle = getStylesFromNode(contentNode)

  return (
    <div key={contentNode.id} style={contentStyle}>
      {contentNode.children.map((child) => {
        if (child.name === 'Item') {
          return (
            <ContextMenu.Item
              key={child.id}
              style={getStylesFromNode(child)}
            >
              {child.content || child.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
            </ContextMenu.Item>
          )
        }

        if (child.name === 'Separator') {
          return (
            <ContextMenu.Separator
              key={child.id}
              style={getStylesFromNode(child)}
            />
          )
        }

        return renderFn(child, { skipLibraryHandling: true })
      })}
    </div>
  )
}
