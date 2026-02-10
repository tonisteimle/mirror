import * as Progress from '@radix-ui/react-progress'
import { useState, useEffect } from 'react'
import type { ASTNode } from '../../parser/parser'
import type { BehaviorHandler, RenderFn, BehaviorRegistry } from './index'
import { groupChildrenBySlot, getStylesFromNode } from './index'

export const ProgressBehavior: BehaviorHandler = {
  name: 'Progress',

  render(
    node: ASTNode,
    _children: Map<string, ASTNode[]>,
    _renderFn: RenderFn,
    _registry: BehaviorRegistry
  ) {
    const slots = groupChildrenBySlot(node)
    const indicatorNodes = slots.get('Indicator') || []

    // Demo: animate progress
    const [progress, setProgress] = useState(0)

    useEffect(() => {
      const timer = setInterval(() => {
        setProgress(prev => prev >= 100 ? 0 : prev + 10)
      }, 500)
      return () => clearInterval(timer)
    }, [])

    const rootStyle = getStylesFromNode(node)
    const indicatorStyle = indicatorNodes[0] ? getStylesFromNode(indicatorNodes[0]) : { backgroundColor: '#3B82F6' }

    return (
      <Progress.Root
        value={progress}
        style={{
          ...rootStyle,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Progress.Indicator
          style={{
            ...indicatorStyle,
            width: '100%',
            height: '100%',
            transition: 'transform 0.3s ease',
            transform: `translateX(-${100 - progress}%)`
          }}
        />
      </Progress.Root>
    )
  }
}
