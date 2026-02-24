/**
 * InlineImagePanel - Image properties picker for Mirror DSL
 *
 * Features:
 * - Source URL input
 * - Alt text input
 * - Object-fit selection (cover, contain, fill, none)
 *
 * Triggered as part of Image picker
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { InlinePanel, PanelFooter } from './InlinePanel'
import { PanelTabsHeader, type PanelTabId } from './InlineLayoutPanel'
import { Maximize, Minimize, Square, Move } from 'lucide-react'

// ============================================
// Types
// ============================================

type ObjectFit = 'cover' | 'contain' | 'fill' | 'none'

interface ImageState {
  src: string
  alt: string
  objectFit: ObjectFit
}

interface InlineImagePanelProps {
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

const OBJECT_FIT_OPTIONS: { fit: ObjectFit; icon: React.ReactNode; label: string }[] = [
  { fit: 'cover', icon: <Maximize size={14} />, label: 'Cover' },
  { fit: 'contain', icon: <Minimize size={14} />, label: 'Contain' },
  { fit: 'fill', icon: <Square size={14} />, label: 'Fill' },
  { fit: 'none', icon: <Move size={14} />, label: 'None' },
]

// ============================================
// Code Generation
// ============================================

function generateImageCode(state: ImageState): string {
  const parts: string[] = []

  // Source URL (as the string content)
  if (state.src) {
    parts.push(`"${state.src}"`)
  }

  // Alt text
  if (state.alt) {
    parts.push(`alt "${state.alt}"`)
  }

  // Object-fit (only if not cover, since cover is default for images)
  if (state.objectFit && state.objectFit !== 'cover') {
    parts.push(`object-fit ${state.objectFit}`)
  }

  return parts.join(', ')
}

// ============================================
// Code Parsing
// ============================================

function parseImageCode(code: string): Partial<ImageState> {
  const state: Partial<ImageState> = {}
  if (!code) return state

  // Source URL (first quoted string, or after src)
  const srcMatch = code.match(/(?:src\s+)?["']([^"']+)["']/)
  if (srcMatch) {
    state.src = srcMatch[1]
  }

  // Alt text
  const altMatch = code.match(/\balt\s+["']([^"']+)["']/)
  if (altMatch) {
    state.alt = altMatch[1]
  }

  // Object-fit
  const fitMatch = code.match(/\bobject-fit\s+(cover|contain|fill|none)\b/)
  if (fitMatch) {
    state.objectFit = fitMatch[1] as ObjectFit
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

function FitButton({
  fit,
  icon,
  label,
  selected,
  onClick,
}: {
  fit: ObjectFit
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
        padding: '6px 12px',
        backgroundColor: selected ? COLORS.buttonBgSelected : COLORS.buttonBg,
        color: selected ? COLORS.textLight : COLORS.text,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'system-ui, sans-serif',
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

const defaultState: ImageState = {
  src: '',
  alt: '',
  objectFit: 'cover',
}

export function InlineImagePanel({
  isOpen,
  onClose,
  onSelect,
  onCodeChange,
  position,
  initialCode,
  showTabs,
  onSwitchPanel,
  availableTabs,
}: InlineImagePanelProps) {
  const [state, setState] = useState<ImageState>(defaultState)
  const hasUserInteractedRef = useRef(false)
  const pendingSyncRef = useRef(false)

  // Parse initial code when opening
  useEffect(() => {
    if (isOpen) {
      hasUserInteractedRef.current = false
      pendingSyncRef.current = false
      const parsed = parseImageCode(initialCode || '')
      setState({ ...defaultState, ...parsed })
    }
  }, [isOpen, initialCode])

  // Sync to editor after user interaction
  useEffect(() => {
    if (pendingSyncRef.current && onCodeChange) {
      pendingSyncRef.current = false
      const code = generateImageCode(state)
      onCodeChange(code)
    }
  }, [state, onCodeChange])

  const updateState = useCallback((updates: Partial<ImageState>) => {
    hasUserInteractedRef.current = true
    pendingSyncRef.current = true
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const handleSubmit = useCallback(() => {
    const code = generateImageCode(state)
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
      height={showTabs ? 300 : undefined}
      testId="panel-image-picker"
      disableClickOutsideClose
    >
      {/* Tab Header when showTabs is true */}
      {showTabs && onSwitchPanel && (
        <PanelTabsHeader activeTab="image" onSwitchPanel={onSwitchPanel} availableTabs={availableTabs} />
      )}
      <div
        style={{ padding: showTabs ? '8px 16px 16px 16px' : '16px', flex: 1 }}
      >
        {/* Source URL */}
        <SectionLabel>Source URL</SectionLabel>
        <input
          type="text"
          value={state.src}
          onChange={(e) => updateState({ src: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="https://example.com/image.jpg"
          style={{
            width: '100%',
            height: '32px',
            padding: '0 10px',
            backgroundColor: COLORS.buttonBg,
            color: COLORS.textLight,
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
            outline: 'none',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        />

        {/* Alt Text */}
        <SectionLabel>Alt Text</SectionLabel>
        <input
          type="text"
          value={state.alt}
          onChange={(e) => updateState({ alt: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Image description..."
          style={{
            width: '100%',
            height: '32px',
            padding: '0 10px',
            backgroundColor: COLORS.buttonBg,
            color: COLORS.textLight,
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'system-ui, sans-serif',
            outline: 'none',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        />

        {/* Object Fit */}
        <SectionLabel>Object Fit</SectionLabel>
        <div style={{
          display: 'flex',
          gap: '4px',
        }}>
          {OBJECT_FIT_OPTIONS.map(({ fit, icon, label }) => (
            <FitButton
              key={fit}
              fit={fit}
              icon={icon}
              label={label}
              selected={state.objectFit === fit}
              onClick={() => updateState({ objectFit: fit })}
            />
          ))}
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
