/**
 * Minimal Preview App
 *
 * Renders only the preview panel with code from URL parameter.
 * Used for testing generated Mirror code without the full editor.
 *
 * URL Parameters:
 *   ?code=base64EncodedMirrorCode   Required: The Mirror code to preview
 *   &showCode=1                     Optional: Show code panel for debugging
 */

import { useMemo, useState } from 'react'
import { Preview } from './components/Preview'
import { CodeDisplay } from './components/CodeDisplay'
import { useCodeParsing } from './hooks/useCodeParsing'
import { getDefaultsContent } from './library/defaults-loader'
import { colors } from './theme'

interface UrlParams {
  code: string | null
  showCode: boolean
}

function getUrlParams(): UrlParams {
  const params = new URLSearchParams(window.location.search)
  const encoded = params.get('code')

  let code: string | null = null
  if (encoded) {
    try {
      code = atob(encoded)
    } catch {
      console.error('Invalid base64 in ?code parameter')
    }
  }

  return {
    code,
    showCode: params.get('showCode') === '1',
  }
}

export function PreviewApp() {
  const { code: previewCode, showCode: initialShowCode } = useMemo(() => getUrlParams(), [])
  const [showCode, setShowCode] = useState(initialShowCode)

  // Parse the code with library defaults
  const defaultsContent = useMemo(() => getDefaultsContent(), [])
  const { parseResult, diagnostics } = useCodeParsing(
    '',                  // tokensCode (tokens can be inline in previewCode)
    defaultsContent,     // componentsCode (library defaults)
    previewCode || '',   // layoutCode (user's preview code)
    { debounceMs: 0 }
  )

  // No code provided
  if (!previewCode) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        color: colors.textMuted,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: colors.text, marginBottom: 16, fontWeight: 600 }}>
            Mirror Preview
          </h1>
          <p style={{ marginBottom: 8 }}>No code provided.</p>
          <code style={{
            background: colors.panel,
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 13,
          }}>
            ?code=base64EncodedMirrorCode
          </code>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: colors.bg,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        flexShrink: 0,
      }}>
        <span style={{
          color: colors.text,
          fontWeight: 600,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          Mirror Preview
        </span>

        <span style={{
          color: colors.textMuted,
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {parseResult.nodes.length} element{parseResult.nodes.length !== 1 ? 's' : ''}
        </span>

        <div style={{ flex: 1 }} />

        {/* Toggle code view */}
        <button
          onClick={() => setShowCode(!showCode)}
          style={{
            background: showCode ? colors.tabActive : 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: 4,
            padding: '4px 12px',
            color: colors.text,
            fontSize: 12,
            fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          {showCode ? 'Hide Code' : 'Show Code'}
        </button>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Code panel (optional) */}
        {showCode && (
          <div style={{
            width: 400,
            borderRight: `1px solid ${colors.border}`,
            overflow: 'auto',
            background: colors.panel,
          }}>
            <CodeDisplay code={previewCode} />
          </div>
        )}

        {/* Preview area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 24,
        }}>
          <Preview
            nodes={parseResult.nodes}
            registry={parseResult.registry}
            tokens={parseResult.tokens}
            dataRecords={new Map()}
          />
        </div>
      </div>

      {/* Error display */}
      {diagnostics.length > 0 && (
        <div style={{
          padding: '12px 16px',
          background: '#2D1F1F',
          borderTop: '1px solid #EF4444',
          color: '#EF4444',
          fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          flexShrink: 0,
          maxHeight: 150,
          overflow: 'auto',
        }}>
          {diagnostics.map((err, i) => (
            <div key={i}>{err.message}</div>
          ))}
        </div>
      )}
    </div>
  )
}
