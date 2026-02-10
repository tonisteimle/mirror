import { useState, useEffect, useRef, useCallback } from 'react'
import { colors } from '../theme'
import { BasePicker, PickerFooter } from './picker'
import type { Position } from '../types/common'

interface AiAssistantPanelProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string) => void
  position: Position
  isGenerating: boolean
}

export function AiAssistantPanel({
  isOpen,
  onClose,
  onSubmit,
  position,
  isGenerating,
}: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setPrompt('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim() && !isGenerating) {
        onSubmit(prompt.trim())
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [prompt, isGenerating, onSubmit, onClose])

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={360}
      maxHeight={200}
      footer={
        <PickerFooter
          hints={[
            { key: '↵', label: 'Generieren' },
            { key: 'Esc', label: 'Schliessen' },
          ]}
        />
      }
    >
      <div style={{ padding: '12px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          color: colors.textMuted,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2Z"/>
            <path d="M12 12 2.1 12"/>
            <path d="m5 19 5-5"/>
          </svg>
          AI Assistent
        </div>
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Was möchtest du erstellen?"
          disabled={isGenerating}
          style={{
            width: '100%',
            minHeight: '60px',
            padding: '8px',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#1A1A1A',
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            outline: 'none',
            resize: 'vertical',
          }}
        />
        {isGenerating && (
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: colors.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #333',
              borderTop: '2px solid #5BA8F5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            Generiere...
          </div>
        )}
      </div>
    </BasePicker>
  )
}
