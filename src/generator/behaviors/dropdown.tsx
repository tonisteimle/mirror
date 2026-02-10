import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const DropdownBehavior: BehaviorHandler = {
  name: 'Dropdown',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const triggerNodes = slots.get('Trigger') || []
    const contentNodes = slots.get('Content') || []

    // Get current state from registry - use node.name for action targeting
    const isOpen = registry.getState(node.name) === 'open'

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'open' : 'closed')
    }

    return (
      <DropdownMenu.Root open={isOpen} onOpenChange={handleOpenChange}>
        {triggerNodes.map((trigger) => (
          <DropdownMenu.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </DropdownMenu.Trigger>
        ))}

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={4}
            style={{
              zIndex: 1000,
              animation: 'slideDownAndFade 0.15s ease-out'
            }}
          >
            {contentNodes.map((content) => renderContentChildren(content, renderFn))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    )
  }
}

// Render content children (Items, Separators, etc.)
function renderContentChildren(
  contentNode: ASTNode,
  renderFn: RenderFn
): React.ReactNode {
  // Apply content node styles as wrapper
  const contentStyle = getStylesFromNode(contentNode)

  return (
    <div key={contentNode.id} style={contentStyle}>
      {contentNode.children.map((child) => {
        if (child.name === 'Item') {
          return (
            <DropdownMenu.Item
              key={child.id}
              style={getStylesFromNode(child)}
              onSelect={() => {
                // Item selection handled by Radix
              }}
            >
              {renderFn(child, { skipLibraryHandling: true })}
            </DropdownMenu.Item>
          )
        }

        if (child.name === 'Separator') {
          return (
            <DropdownMenu.Separator
              key={child.id}
              style={getStylesFromNode(child)}
            />
          )
        }

        // Other elements rendered directly
        return renderFn(child, { skipLibraryHandling: true })
      })}
    </div>
  )
}

