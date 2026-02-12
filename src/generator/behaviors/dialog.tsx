import * as Dialog from '@radix-ui/react-dialog'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const DialogBehavior: BehaviorHandler = {
  name: 'Dialog',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const triggerNodes = slots.get('Trigger') || []
    const backdropNodes = slots.get('Backdrop') || []
    const contentNodes = slots.get('Content') || []

    // Get current state from registry - use node.name for action targeting
    const isOpen = registry.getState(node.name) === 'open'

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'open' : 'closed')
    }

    return (
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        {triggerNodes.map((trigger) => (
          <Dialog.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </Dialog.Trigger>
        ))}

        <Dialog.Portal>
          {backdropNodes.map((backdrop) => (
            <Dialog.Overlay
              key={backdrop.id}
              style={{
                ...getStylesFromNode(backdrop),
                position: 'fixed',
                inset: 0,
                zIndex: 999
              }}
            />
          ))}

          {contentNodes.map((content) => (
            <Dialog.Content
              key={content.id}
              style={{
                ...getStylesFromNode(content),
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
              }}
            >
              {renderDialogContent(content, renderFn)}
            </Dialog.Content>
          ))}
        </Dialog.Portal>
      </Dialog.Root>
    )
  }
}

// Render dialog content children (Title, Description, Close, etc.)
function renderDialogContent(
  contentNode: ASTNode,
  renderFn: RenderFn
): React.ReactNode {
  return contentNode.children.map((child) => {
    if (child.name === 'Title') {
      return (
        <Dialog.Title
          key={child.id}
          style={getStylesFromNode(child)}
        >
          {child.content || renderFn(child, { skipLibraryHandling: true })}
        </Dialog.Title>
      )
    }

    if (child.name === 'Description') {
      return (
        <Dialog.Description
          key={child.id}
          style={getStylesFromNode(child)}
        >
          {child.content || renderFn(child, { skipLibraryHandling: true })}
        </Dialog.Description>
      )
    }

    if (child.name === 'Close') {
      return (
        <Dialog.Close key={child.id} asChild>
          {renderFn(child, { skipLibraryHandling: true })}
        </Dialog.Close>
      )
    }

    // Other elements rendered directly
    return renderFn(child, { skipLibraryHandling: true })
  })
}

