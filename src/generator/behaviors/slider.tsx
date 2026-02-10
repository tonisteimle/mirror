import * as Slider from '@radix-ui/react-slider'
import { useState } from 'react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const SliderBehavior: BehaviorHandler = {
  name: 'Slider',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const trackNodes = slots.get('Track') || []
    const rangeNodes = slots.get('Range') || []
    const thumbNodes = slots.get('Thumb') || []

    const [value, setValue] = useState([50])

    const rootStyle = getStylesFromNode(node)
    const trackStyle = trackNodes[0] ? getStylesFromNode(trackNodes[0]) : { height: '4px', borderRadius: '2px', backgroundColor: '#333' }
    const rangeStyle = rangeNodes[0] ? getStylesFromNode(rangeNodes[0]) : { backgroundColor: '#3B82F6' }
    const thumbStyle = thumbNodes[0] ? getStylesFromNode(thumbNodes[0]) : { width: '20px', height: '20px', borderRadius: '10px', backgroundColor: '#FFFFFF' }

    return (
      <Slider.Root
        value={value}
        onValueChange={setValue}
        max={100}
        step={1}
        style={{
          ...rootStyle,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          touchAction: 'none',
          height: '20px'
        }}
      >
        <Slider.Track
          style={{
            ...trackStyle,
            position: 'relative',
            flexGrow: 1
          }}
        >
          <Slider.Range
            style={{
              ...rangeStyle,
              position: 'absolute',
              height: '100%',
              borderRadius: 'inherit'
            }}
          />
        </Slider.Track>
        <Slider.Thumb
          style={{
            ...thumbStyle,
            display: 'block',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            cursor: 'pointer'
          }}
        />
      </Slider.Root>
    )
  }
}
