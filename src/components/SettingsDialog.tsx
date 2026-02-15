/**
 * Settings Dialog component.
 * Contains API Key management.
 */

import { useState, useEffect, useCallback } from 'react'
import { colors } from '../theme'
import { setApiKey, getApiKey, hasApiKey } from '../lib/ai'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({
  isOpen,
  onClose,
}: SettingsDialogProps) {
  const [apiKeyValue, setApiKeyValue] = useState('')
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setHasKey(hasApiKey())
      const key = getApiKey()
      if (key) {
        setApiKeyValue(key)
      }
    }
  }, [isOpen])

  const handleSaveApiKey = useCallback(() => {
    const trimmed = apiKeyValue.trim()
    if (trimmed) {
      setApiKey(trimmed)
      setHasKey(true)
    }
  }, [apiKeyValue])

  const handleClearApiKey = useCallback(() => {
    setApiKey('')  // Also removes from localStorage
    setApiKeyValue('')
    setHasKey(false)
  }, [])

  const maskedKey = hasKey
    ? `${getApiKey().slice(0, 6)}...${getApiKey().slice(-4)}`
    : ''

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

        {/* API Key Section */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: colors.text,
            marginBottom: '10px',
          }}>
            OpenRouter API Key
          </label>

          {hasKey ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                backgroundColor: colors.bg,
                color: colors.textMuted,
                borderRadius: '6px',
                border: `1px solid ${colors.border}`,
              }}>
                {maskedKey}
              </div>
              <button
                onClick={handleClearApiKey}
                style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Entfernen
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                value={apiKeyValue}
                onChange={(e) => setApiKeyValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                placeholder="sk-or-v1-..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyValue.trim()}
                style={{
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: apiKeyValue.trim() ? '#3B82F6' : colors.bg,
                  color: apiKeyValue.trim() ? '#FFF' : colors.textMuted,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: apiKeyValue.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Speichern
              </button>
            </div>
          )}
          <p style={{
            fontSize: '11px',
            color: colors.textMuted,
            marginTop: '8px',
            marginBottom: 0,
          }}>
            Hol dir deinen Key auf <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3B82F6', textDecoration: 'none' }}
            >openrouter.ai/keys</a>
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
            Fertig
          </button>
        </div>
      </div>
    </>
  )
}
