import * as Menubar from '@radix-ui/react-menubar'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const MenubarBehavior: BehaviorHandler = {
  name: 'Menubar',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const style = getStylesFromNode(node)

    return (
      <Menubar.Root style={style}>
        {node.children.filter(c => c.name === 'Menu').map(menu => (
          <Menubar.Menu key={menu.id}>
            {renderMenuContent(menu, renderFn)}
          </Menubar.Menu>
        ))}
      </Menubar.Root>
    )
  }
}

function renderMenuContent(menuNode: ASTNode, renderFn: RenderFn): React.ReactNode {
  const triggerNode = menuNode.children.find(c => c.name === 'Trigger')
  const contentNode = menuNode.children.find(c => c.name === 'Content')

  return (
    <>
      {triggerNode && (
        <Menubar.Trigger
          style={{
            // Reset button defaults
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            font: 'inherit',
            // User-defined styles
            ...getStylesFromNode(triggerNode),
            cursor: 'pointer'
          }}
        >
          {triggerNode.content || triggerNode.children.map(c =>
            renderFn(c, { skipLibraryHandling: true })
          )}
        </Menubar.Trigger>
      )}

      {contentNode && (
        <Menubar.Portal>
          <Menubar.Content
            sideOffset={4}
            style={{
              ...getStylesFromNode(contentNode),
              zIndex: 1000
            }}
          >
            {contentNode.children.map(item => {
              if (item.name === 'Item') {
                return (
                  <Menubar.Item
                    key={item.id}
                    style={{
                      // Reset button defaults
                      background: 'transparent',
                      border: 'none',
                      color: 'inherit',
                      font: 'inherit',
                      // User-defined styles
                      ...getStylesFromNode(item),
                      cursor: 'pointer'
                    }}
                  >
                    {item.content || item.children.map(c =>
                      renderFn(c, { skipLibraryHandling: true })
                    )}
                  </Menubar.Item>
                )
              }

              if (item.name === 'Separator') {
                return (
                  <Menubar.Separator
                    key={item.id}
                    style={getStylesFromNode(item)}
                  />
                )
              }

              return renderFn(item, { skipLibraryHandling: true })
            })}
          </Menubar.Content>
        </Menubar.Portal>
      )}
    </>
  )
}
