import * as ScrollArea from '@radix-ui/react-scroll-area'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ScrollAreaBehavior: BehaviorHandler = {
  name: 'ScrollArea',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const contentNodes = slots.get('Content') || []
    const scrollbarNodes = slots.get('Scrollbar') || []

    const style = getStylesFromNode(node)
    const scrollbarStyle = scrollbarNodes[0] ? getStylesFromNode(scrollbarNodes[0]) : {}

    return (
      <ScrollArea.Root
        style={{
          ...style,
          overflow: 'hidden'
        }}
      >
        <ScrollArea.Viewport style={{ width: '100%', height: '100%' }}>
          {contentNodes.map(content => (
            <div key={content.id} style={getStylesFromNode(content)}>
              {content.children.map(child => renderFn(child, { skipLibraryHandling: true }))}
            </div>
          ))}
          {contentNodes.length === 0 && node.children.map(child =>
            renderFn(child, { skipLibraryHandling: true })
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation="vertical"
          style={{
            display: 'flex',
            padding: '2px',
            width: '10px',
            ...scrollbarStyle
          }}
        >
          <ScrollArea.Thumb
            style={{
              flex: 1,
              backgroundColor: '#444444',
              borderRadius: '4px',
              position: 'relative'
            }}
          />
        </ScrollArea.Scrollbar>
        <ScrollArea.Scrollbar
          orientation="horizontal"
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '2px',
            height: '10px',
            ...scrollbarStyle
          }}
        >
          <ScrollArea.Thumb
            style={{
              flex: 1,
              backgroundColor: '#444444',
              borderRadius: '4px'
            }}
          />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>
    )
  }
}
