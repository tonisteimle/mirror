/**
 * Error Boundary for Picker Components
 *
 * Catches errors in pickers and shows a compact error message.
 * Automatically closes the picker on error to prevent blocking the UI.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react'
import { colors } from '../../theme'
import { logger } from '../../services/logger'

interface PickerErrorBoundaryProps {
  children: ReactNode
  onClose?: () => void
  pickerName?: string
}

interface PickerErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class PickerErrorBoundary extends Component<PickerErrorBoundaryProps, PickerErrorBoundaryState> {
  constructor(props: PickerErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): PickerErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.ui.error(`${this.props.pickerName || 'Picker'} error`, { error, errorInfo })
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null })
    this.props.onClose?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '16px',
            backgroundColor: colors.hover,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '8px' }}>
            Fehler beim Laden
          </div>
          <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '12px' }}>
            {this.state.error?.message || 'Unbekannter Fehler'}
          </div>
          <button
            onClick={this.handleClose}
            style={{
              padding: '4px 12px',
              fontSize: '11px',
              backgroundColor: colors.border,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Schliessen
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
