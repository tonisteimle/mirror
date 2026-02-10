import { Component, type ReactNode, type ErrorInfo } from 'react'
import { colors } from '../../theme'

interface EditorErrorBoundaryProps {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface EditorErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('EditorErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px',
          backgroundColor: colors.bg,
          color: colors.text,
        }}>
          <div style={{
            maxWidth: '300px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#EF4444',
            }}>
              Editor-Fehler
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.textMuted,
              marginBottom: '8px',
            }}>
              Der Editor ist auf einen Fehler gestossen.
            </p>
            <p style={{
              fontSize: '12px',
              color: colors.textMuted,
              marginBottom: '16px',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(0,0,0,0.2)',
              padding: '8px',
              borderRadius: '4px',
              wordBreak: 'break-word',
            }}>
              {this.state.error?.message || 'Unbekannter Fehler'}
            </p>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: '#3B82F6',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
