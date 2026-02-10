import { colors } from '../theme'

interface ErrorDialogProps {
  isOpen: boolean
  title?: string
  message: string
  details?: string
  onClose: () => void
}

export function ErrorDialog({
  isOpen,
  title = 'Fehler',
  message,
  details,
  onClose,
}: ErrorDialogProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 1000,
        }}
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-message"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '480px',
          zIndex: 1001,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>
            ⚠️
          </div>
          <h2
            id="error-dialog-title"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: colors.text,
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>

        {/* Message */}
        <p
          id="error-dialog-message"
          style={{
            fontSize: '14px',
            color: colors.textMuted,
            lineHeight: 1.5,
            margin: '0 0 16px 0',
          }}
        >
          {message}
        </p>

        {/* Details (collapsible) */}
        {details && (
          <details style={{ marginBottom: '16px' }}>
            <summary style={{
              fontSize: '12px',
              color: colors.textMuted,
              cursor: 'pointer',
              marginBottom: '8px',
            }}>
              Details anzeigen
            </summary>
            <pre style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              backgroundColor: colors.bg,
              color: '#EF4444',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              maxHeight: '150px',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {details}
            </pre>
          </details>
        )}

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: '#3B82F6',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </>
  )
}
