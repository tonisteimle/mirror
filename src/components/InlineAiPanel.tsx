/**
 * Inline AI Panel - appears at cursor position when ? is typed
 * Similar to color picker but for AI generation
 */

import { useState, useEffect, useRef } from 'react'
import { colors } from '../theme'
import type { Position } from '../types/common'

interface InlineAiPanelProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
  position: Position
  isGenerating: boolean
}

export function InlineAiPanel({
  isOpen,
  onClose,
  onSubmit,
  position,
  isGenerating,
}: InlineAiPanelProps) {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus and reset when opened
  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && prompt.trim() && !isGenerating) {
      e.preventDefault()
      onSubmit(prompt.trim())
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        minWidth: '300px',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: colors.textMuted,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a10 10 0 1 0 10 10H12V2Z"/>
          <path d="M12 12 2.1 12"/>
          <path d="m5 19 5-5"/>
        </svg>
        <span style={{ fontWeight: 500 }}>AI Generate</span>
        <span style={{ marginLeft: 'auto', opacity: 0.6 }}>↵ Generate · Esc Cancel</span>
      </div>

      {/* Input */}
      <div style={{ padding: '8px' }}>
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Was soll ich erstellen?"
          disabled={isGenerating}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: '13px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: isGenerating ? '#252525' : '#1A1A1A',
            color: isGenerating ? colors.textMuted : colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            outline: 'none',
            opacity: isGenerating ? 0.7 : 1,
          }}
        />
      </div>

      {/* Generating Status */}
      {isGenerating && (
        <div style={{
          padding: '8px 12px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#F59E0B',
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            border: '2px solid #333',
            borderTop: '2px solid #F59E0B',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Generiere...
        </div>
      )}

      {/* Spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
