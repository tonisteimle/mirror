import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const AlertDialogBehavior: BehaviorHandler = {
  name: 'AlertDialog',

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

    const isOpen = registry.getState(node.name) === 'open'

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'open' : 'closed')
    }

    return (
      <AlertDialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        {triggerNodes.map((trigger) => (
          <AlertDialog.Trigger key={trigger.id} asChild>
            {renderFn(trigger, { skipLibraryHandling: true })}
          </AlertDialog.Trigger>
        ))}

        <AlertDialog.Portal>
          {backdropNodes.map((backdrop) => (
            <AlertDialog.Overlay
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
            <AlertDialog.Content
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
              {renderAlertContent(content, renderFn)}
            </AlertDialog.Content>
          ))}
        </AlertDialog.Portal>
      </AlertDialog.Root>
    )
  }
}

function renderAlertContent(contentNode: ASTNode, renderFn: RenderFn): React.ReactNode {
  return contentNode.children.map((child) => {
    if (child.name === 'Title') {
      return (
        <AlertDialog.Title key={child.id} style={getStylesFromNode(child)}>
          {child.content || child.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
        </AlertDialog.Title>
      )
    }

    if (child.name === 'Description') {
      return (
        <AlertDialog.Description key={child.id} style={getStylesFromNode(child)}>
          {child.content || child.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
        </AlertDialog.Description>
      )
    }

    if (child.name === 'Cancel') {
      return (
        <AlertDialog.Cancel key={child.id} asChild>
          {renderFn(child, { skipLibraryHandling: true })}
        </AlertDialog.Cancel>
      )
    }

    if (child.name === 'Action') {
      return (
        <AlertDialog.Action key={child.id} asChild>
          {renderFn(child, { skipLibraryHandling: true })}
        </AlertDialog.Action>
      )
    }

    return renderFn(child, { skipLibraryHandling: true })
  })
}

