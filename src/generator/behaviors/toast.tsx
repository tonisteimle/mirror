import * as Toast from '@radix-ui/react-toast'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ToastBehavior: BehaviorHandler = {
  name: 'Toast',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const titleNodes = slots.get('Title') || []
    const descriptionNodes = slots.get('Description') || []
    const actionNodes = slots.get('Action') || []
    const closeNodes = slots.get('Close') || []

    const isOpen = registry.getState(node.name) === 'visible'

    const handleOpenChange = (open: boolean) => {
      registry.setState(node.name, open ? 'visible' : 'hidden')
    }

    const rootStyle = getStylesFromNode(node)

    return (
      <Toast.Provider swipeDirection="right">
        <Toast.Root
          open={isOpen}
          onOpenChange={handleOpenChange}
          style={{
            ...rootStyle,
            listStyle: 'none'
          }}
        >
          {titleNodes.map((title) => (
            <Toast.Title key={title.id} style={getStylesFromNode(title)}>
              {title.content || title.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
            </Toast.Title>
          ))}

          {descriptionNodes.map((desc) => (
            <Toast.Description key={desc.id} style={getStylesFromNode(desc)}>
              {desc.content || desc.children.map(c => renderFn(c, { skipLibraryHandling: true }))}
            </Toast.Description>
          ))}

          {actionNodes.map((action) => (
            <Toast.Action key={action.id} altText="Action" asChild>
              {renderFn(action, { skipLibraryHandling: true })}
            </Toast.Action>
          ))}

          {closeNodes.map((close) => (
            <Toast.Close key={close.id} asChild>
              {renderFn(close, { skipLibraryHandling: true })}
            </Toast.Close>
          ))}
        </Toast.Root>

        <Toast.Viewport
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '10px',
            width: '400px',
            maxWidth: '100vw',
            margin: 0,
            listStyle: 'none',
            zIndex: 2147483647,
            outline: 'none'
          }}
        />
      </Toast.Provider>
    )
  }
}
