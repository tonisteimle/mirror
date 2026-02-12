/**
 * MirrorPlayground Component
 *
 * A self-contained, embeddable component for interactive Mirror code editing.
 * Designed for use in documentation and tutorials.
 *
 * Features:
 * - Live preview as you type
 * - Syntax highlighting (basic)
 * - Error display
 * - Reset to initial code
 * - Minimal dependencies
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { parse } from '../parser/parser'
import { Preview } from './Preview'

// ============================================
// Types
// ============================================

export interface MirrorPlaygroundProps {
  /** Initial Mirror code */
  initialCode: string
  /** Height of the playground (default: 300) */
  height?: number
  /** Title shown above the editor */
  title?: string
  /** Whether to show line numbers */
  lineNumbers?: boolean
  /** Theme: 'dark' (default) or 'light' */
  theme?: 'dark' | 'light'
  /** Read-only mode */
  readOnly?: boolean
  /** Layout: 'horizontal' (default) or 'vertical' */
  layout?: 'horizontal' | 'vertical'
  /** Minimal mode: hides headers and status bar */
  minimal?: boolean
}

// ============================================
// Theme
// ============================================

const themes = {
  dark: {
    bg: '#0a0a0a',
    editorBg: '#0f0f0f',
    previewBg: '#1a1a1a',
    border: '#2a2a2a',
    text: '#e0e0e0',
    textMuted: '#666',
    accent: '#3B82F6',
    error: '#ef4444',
    success: '#22c55e',
  },
  light: {
    bg: '#ffffff',
    editorBg: '#f8f8f8',
    previewBg: '#f5f5f5',
    border: '#e0e0e0',
    text: '#1a1a1a',
    textMuted: '#888',
    accent: '#3B82F6',
    error: '#dc2626',
    success: '#16a34a',
  }
}

// ============================================
// Styles
// ============================================

const createStyles = (theme: typeof themes.dark, height: number, layout: 'horizontal' | 'vertical', minimal: boolean) => {
  const isVertical = layout === 'vertical'

  return {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      border: minimal ? 'none' : `1px solid ${theme.border}`,
      borderRadius: minimal ? '0' : '8px',
      overflow: 'hidden',
      backgroundColor: theme.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    header: {
      display: minimal ? 'none' : 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: theme.editorBg,
      borderBottom: `1px solid ${theme.border}`,
    },
    title: {
      fontSize: '12px',
      fontWeight: 500,
      color: theme.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    resetButton: {
      padding: '4px 10px',
      fontSize: '11px',
      fontWeight: 500,
      color: theme.textMuted,
      backgroundColor: 'transparent',
      border: `1px solid ${theme.border}`,
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.15s',
    },
    main: {
      display: 'flex',
      flexDirection: isVertical ? 'column' as const : 'row' as const,
      height: isVertical ? 'auto' : `${height}px`,
    },
    editorPane: {
      flex: isVertical ? 'none' : 1,
      display: 'flex',
      flexDirection: 'column' as const,
      borderRight: isVertical ? 'none' : `1px solid ${theme.border}`,
      borderBottom: isVertical ? `1px solid ${theme.border}` : 'none',
    },
    previewPane: {
      flex: isVertical ? 'none' : 1,
      display: 'flex',
      flexDirection: 'column' as const,
      minHeight: isVertical ? `${height}px` : 'auto',
    },
    paneHeader: {
      display: minimal ? 'none' : 'block',
      padding: '6px 12px',
      fontSize: '10px',
      fontWeight: 600,
      color: theme.textMuted,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      backgroundColor: theme.editorBg,
      borderBottom: `1px solid ${theme.border}`,
    },
    editor: {
      flex: isVertical ? 'none' : 1,
      padding: '12px',
      backgroundColor: theme.editorBg,
      color: theme.text,
      fontFamily: '"SF Mono", "Consolas", "Monaco", monospace',
      fontSize: '13px',
      lineHeight: '1.6',
      border: 'none',
      outline: 'none',
      resize: 'none' as const,
      overflow: 'auto',
      minHeight: isVertical ? '120px' : 'auto',
    },
    preview: {
      flex: 1,
      padding: '16px',
      backgroundColor: theme.previewBg,
      color: theme.text,
      overflow: 'auto',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: isVertical ? 'flex-start' : 'center',
    },
    error: {
      padding: '8px 12px',
      fontSize: '12px',
      color: theme.error,
      backgroundColor: `${theme.error}15`,
      borderTop: `1px solid ${theme.error}30`,
    },
    status: {
      display: minimal ? 'none' : 'flex',
      padding: '4px 12px',
      fontSize: '10px',
      color: theme.success,
      backgroundColor: theme.editorBg,
      borderTop: `1px solid ${theme.border}`,
      alignItems: 'center',
      gap: '6px',
    },
    statusDot: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      backgroundColor: theme.success,
    },
  }
}

// ============================================
// Component
// ============================================

export function MirrorPlayground({
  initialCode,
  height = 300,
  title = 'Try it',
  lineNumbers = false,
  theme = 'dark',
  readOnly = false,
  layout = 'horizontal',
  minimal = false,
}: MirrorPlaygroundProps) {
  const [code, setCode] = useState(initialCode.trim())
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const colors = themes[theme]
  const styles = useMemo(() => createStyles(colors, height, layout, minimal), [colors, height, layout, minimal])

  // Parse and render
  const { nodes, registry } = useMemo(() => {
    try {
      const result = parse(code)
      if (result.errors.length > 0) {
        setError(result.errors[0])
        return { nodes: [], registry: new Map() }
      }
      setError(null)
      return { nodes: result.nodes, registry: result.registry }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error')
      return { nodes: [], registry: new Map() }
    }
  }, [code])

  // Handle code change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value)
  }, [])

  // Handle tab key
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newCode = code.substring(0, start) + '  ' + code.substring(end)
      setCode(newCode)

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2
      })
    }
  }, [code])

  // Reset to initial code
  const handleReset = useCallback(() => {
    setCode(initialCode.trim())
  }, [initialCode])

  // Render preview content using full Preview component
  const previewContent = useMemo(() => {
    if (nodes.length === 0) {
      return (
        <div style={{ color: colors.textMuted, fontSize: '13px' }}>
          {error ? 'Fix the error to see preview' : 'Start typing...'}
        </div>
      )
    }

    return (
      <Preview
        nodes={nodes}
        registry={registry}
      />
    )
  }, [nodes, registry, error, colors.textMuted])

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>{title}</span>
        {!readOnly && code !== initialCode.trim() && (
          <button
            style={styles.resetButton}
            onClick={handleReset}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = colors.accent
              e.currentTarget.style.color = colors.accent
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = colors.border
              e.currentTarget.style.color = colors.textMuted
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Main content */}
      <div style={styles.main}>
        {/* Editor pane */}
        <div style={styles.editorPane}>
          <div style={styles.paneHeader}>Code</div>
          <textarea
            ref={textareaRef}
            style={styles.editor}
            value={code}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>

        {/* Preview pane */}
        <div style={styles.previewPane}>
          <div style={styles.paneHeader}>Preview</div>
          <div style={styles.preview}>
            <div style={{ width: 'max-content', maxWidth: '100%' }}>
              {previewContent}
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {/* Status bar */}
      {!error && nodes.length > 0 && (
        <div style={styles.status}>
          <div style={styles.statusDot} />
          <span>Live</span>
        </div>
      )}
    </div>
  )
}

export default MirrorPlayground
