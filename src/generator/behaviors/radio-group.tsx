import * as RadioGroup from '@radix-ui/react-radio-group'
import { useState } from 'react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const RadioGroupBehavior: BehaviorHandler = {
  name: 'RadioGroup',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const itemNodes = slots.get('Item') || []

    const [value, setValue] = useState(itemNodes[0]?.id || '')

    return (
      <RadioGroup.Root
        value={value}
        onValueChange={setValue}
        style={getStylesFromNode(node)}
      >
        {itemNodes.map((item) => {
          const itemSlots = groupChildrenBySlot(item)
          const radioNodes = itemSlots.get('Radio') || []

          return (
            <div key={item.id} style={getStylesFromNode(item)}>
              {radioNodes.map((radio) => (
                <RadioGroup.Item
                  key={radio.id}
                  value={item.id}
                  style={{
                    ...getStylesFromNode(radio),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: value === item.id ? '#3B82F6' : (radio.properties.bg as string || '#252525'),
                    borderColor: value === item.id ? '#3B82F6' : (radio.properties.boc as string || '#444'),
                    transition: 'all 0.2s'
                  }}
                >
                  <RadioGroup.Indicator>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '5px',
                      backgroundColor: '#FFFFFF'
                    }} />
                  </RadioGroup.Indicator>
                </RadioGroup.Item>
              ))}
              {item.children
                .filter(c => c.name !== 'Radio' && c.name !== 'Indicator')
                .map(child => renderFn(child, { skipLibraryHandling: true }))}
            </div>
          )
        })}
      </RadioGroup.Root>
    )
  }
}
