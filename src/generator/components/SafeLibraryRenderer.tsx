import { Component, type ReactNode } from 'react'
import type { ASTNode } from '../../parser/types'

interface Props {
  node: ASTNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Error boundary for library components.
 * Prevents a single broken behavior handler from crashing the entire preview.
 */
export class SafeLibraryRenderer extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 8,
            border: '1px dashed #EF4444',
            color: '#EF4444',
            fontSize: 12
          }}
        >
          Error: {this.props.node.name}
        </div>
      )
    }
    return this.props.children
  }
}
