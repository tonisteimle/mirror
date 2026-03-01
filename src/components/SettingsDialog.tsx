/**
 * Settings Dialog component.
 * Placeholder - AI features removed.
 */

import { colors } from '../theme'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({
  isOpen,
  onClose,
}: SettingsDialogProps) {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        data-testid="dialog-settings"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          minWidth: '400px',
          maxWidth: '500px',
          zIndex: 1001,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}>
          <h2
            id="settings-dialog-title"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: colors.text,
              margin: 0,
            }}
          >
            Einstellungen
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Placeholder Content */}
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: colors.textMuted,
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Keine Einstellungen verfügbar.
          </p>
        </div>

        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#3B82F6',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Schliessen
          </button>
        </div>
      </div>
    </>
  )
}
