/**
 * API Key input component for the header.
 * Allows users to set their OpenRouter API key securely.
 */

import { useState, useEffect, useCallback } from 'react'
import { colors } from '../theme'
import { STORAGE_KEYS } from '../constants'
import { setApiKey, getApiKey, hasApiKey } from '../lib/ai'

export function ApiKeyInput() {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [hasKey, setHasKey] = useState(false)

  // Check if API key exists on mount
  useEffect(() => {
    setHasKey(hasApiKey())
    // If key exists, pre-fill with masked version for editing
    const key = getApiKey()
    if (key) {
      setInputValue(key)
    }
  }, [])

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      setApiKey(trimmed)
      setHasKey(true)
    }
    setIsEditing(false)
  }, [inputValue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      // Restore original value
      setInputValue(getApiKey())
    }
  }, [handleSave])

  const handleClear = useCallback(() => {
    setApiKey('')
    setInputValue('')
    setHasKey(false)
    setIsEditing(false)
    localStorage.removeItem(STORAGE_KEYS.API_KEY)
  }, [])

  // Get masked display of API key
  const maskedKey = hasKey
    ? `${getApiKey().slice(0, 6)}...${getApiKey().slice(-4)}`
    : 'Nicht gesetzt'

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="password"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="OpenRouter API Key"
          autoFocus
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            fontFamily: 'JetBrains Mono, monospace',
            backgroundColor: colors.inputBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            width: '180px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSave}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: '#3B82F6',
            color: '#FFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          OK
        </button>
        {hasKey && (
          <button
            onClick={handleClear}
            title="API Key entfernen"
            style={{
              padding: '4px 6px',
              fontSize: '11px',
              backgroundColor: 'transparent',
              color: colors.textMuted,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      title={hasKey ? 'API Key ändern' : 'API Key eingeben'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '6px 10px',
        fontSize: '11px',
        fontFamily: 'JetBrains Mono, monospace',
        color: hasKey ? colors.textMuted : '#F59E0B',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'color 0.15s ease',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
      {maskedKey}
    </button>
  )
}
