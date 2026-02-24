/**
 * InlineInputPanel - Input properties picker for Mirror DSL
 *
 * Features:
 * - Input type selection (text, password, email, number, etc.)
 * - Placeholder text
 * - Disabled state toggle
 *
 * Triggered as part of Input/Textarea picker
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'
import { Type, Lock, Mail, Hash, Phone, Calendar, Clock, Search, Link2, EyeOff } from 'lucide-react'

// ============================================
// Types
// ============================================

type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'date' | 'time' | 'search' | 'url'

interface InputState {
  type: InputType
  placeholder: string
  disabled: boolean
}

interface InlineInputPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (code: string) => void
  onCodeChange?: (code: string) => void
  position: { x: number; y: number }
  initialCode?: string
  /** Show tabs to switch between panels */
  showTabs?: boolean
  /** Called when user wants to switch to a different panel */
  onSwitchPanel?: (panel: PanelTabId) => void
  /** Which tabs to show */
  availableTabs?: PanelTabId[]
}

// ============================================
// Constants
// ============================================

const COLORS = {
  bg: '#1a1a1a',
  buttonBg: '#181818',
  buttonBgSelected: '#252525',
  text: '#555',
  textLight: '#ccc',
  label: '#666',
}

const INPUT_TYPES: { type: InputType; icon: React.ReactNode; label: string }[] = [
  { type: 'text', icon: <Type size={14} />, label: 'Text' },
  { type: 'password', icon: <Lock size={14} />, label: 'Password' },
  { type: 'email', icon: <Mail size={14} />, label: 'Email' },
  { type: 'number', icon: <Hash size={14} />, label: 'Number' },
  { type: 'tel', icon: <Phone size={14} />, label: 'Phone' },
  { type: 'date', icon: <Calendar size={14} />, label: 'Date' },
  { type: 'time', icon: <Clock size={14} />, label: 'Time' },
  { type: 'search', icon: <Search size={14} />, label: 'Search' },
  { type: 'url', icon: <Link2 size={14} />, label: 'URL' },
]

// ============================================
// Code Generation
// ============================================

function generateInputCode(state: InputState): string {
  const parts: string[] = []

  // Type (only if not text, since text is default)
  if (state.type !== 'text') {
    parts.push(`type ${state.type}`)
  }

  // Placeholder (as the string content)
  if (state.placeholder) {
    parts.push(`"${state.placeholder}"`)
  }

  // Disabled
  if (state.disabled) {
    parts.push('disabled')
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseInputCode(code: string): Partial<InputState> {
  const state: Partial<InputState> = {}
  if (!code) return state

  // Type
  const typeMatch = code.match(/\btype\s+(text|password|email|number|tel|date|time|search|url)\b/)
  if (typeMatch) {
    state.type = typeMatch[1] as InputType
  }

  // Placeholder (quoted string)
  const placeholderMatch = code.match(/"([^"]*)"/)
  if (placeholderMatch) {
    state.placeholder = placeholderMatch[1]
  }

  // Disabled
  if (/\bdisabled\b/.test(code)) {
    state.disabled = true
  }

  return state
}

// ============================================
// UI Components
// ============================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: COLORS.label,
      marginBottom: '4px',
    }}>
      {children}
    </div>
  )
}

function TypeButton({
  type,
  icon,
  label,
  selected,
  onClick,
}: {
  type: InputType
  icon: React.ReactNode
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: selected ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: selected ? COLORS.textLight : COLORS.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ============================================
// Main Component
// ============================================

const defaultState: InputState = {
  type: 'text',
  placeholder: '',
  disabled: false,
}

export function InlineInputPanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  initialCode,
  showTabs,
  onSwitchPanel,
  availableTabs,
}: InlineInputPanelProps) {
  const [state, setState] = useState<InputState>(defaultState)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)

  // Parse initial code when opening
  useEffect(() => {
    if (isOpen) {
      hasUserInteractedRef.current = false
      pendingSyncRef.current = false
      const parsed = parseInputCode(initialCode || '')
      setState({ ...defaultState, ...parsed })
    }
  }, [isOpen, initialCode])

  // Sync to editor after user interaction
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange) {
      pendingSyncRef.current = false
      const code = generateInputCode(state)
      onCodeChange(code)
    }
  }, [state, onCodeChange])

  const updateState = useCallback((updates: Partial<InputState>) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSubmit = useCallback(() => {
    const code = generateInputCode(state)
    onSelect(code)
    onClose()
  }, [state, onSelect, onClose])

  // Global keyboard handler (Enter to submit, Escape to close)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleSubmit, onClose])

  return (
    <InlinePanel
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={360}
      maxHeight={400}
      height={showTabs ? 320 : undefined}
      testId="panel-input-picker"
    >
      {/* Tab Header when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader activeTab="input" onSwitchPanel={onSwitchPanel} availableTabs={availableTabs} />
      )}
      <div
        style={{ padding: showTabs ? '8px 16px 16px 16px' : '16px', flex: 1 }}
      >
        {/* Input Type */}
        <SectionLabel>Type</SectionLabel>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px',
          marginBottom: '20px',
        }}>
          {INPUT_TYPES.map(({ type, icon, label }) => (
            <TypeButton
              key={type}
              type={type}
              icon={icon}
              label={label}
              selected={state.type === type}
              onClick={() => updateState({ type })}
            />
          ))}
        </div>

        {/* Placeholder */}
        <SectionLabel>Placeholder</SectionLabel>
        <style>{`
          .input-panel-placeholder::placeholder {
            color: #444;
            font-size: 11px;
          }
        `}</style>
        <input
          type="text"
          className="input-panel-placeholder"
          value={state.placeholder}
          onChange={(e) => updateState({ placeholder: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Enter placeholder text..."
          style={{
            width: '100%',
            height: '32px',
            padding: '0 10px',
            backgroundColor: COLORS.buttonBg,
            color: COLORS.textLight,
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            outline: 'none',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        />

        {/* Disabled Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onMouseDown={(e) => { e.preventDefault(); updateState({ disabled: !state.disabled }) }}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: state.disabled ? COLORS.buttonBgSelected : COLORS.buttonBg,
              color: state.disabled ? COLORS.textLight : COLORS.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <EyeOff size={14} />
          </button>
          <span style={{ fontSize: '11px', fontFamily: 'system-ui, -apple-system, sans-serif', color: COLORS.label }}>
            Disabled
          </span>
        </div>
      </div>

      <PanelFooter
        hints={[
          { label: 'Abbrechen', onClick: onClose },
          { label: 'Einfügen', onClick: handleSubmit, primary: true },
        ]}
      />
    </InlinePanel>
  )
}
