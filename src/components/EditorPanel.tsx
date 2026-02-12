/**
 * EditorPanel component containing the code editor tabs and AI prompt input.
 */

import { memo, useState, useCallback, useRef } from 'react'
import { colors } from '../theme'
import { PromptPanel, type PromptPanelRef } from './PromptPanel'
import { useEditorActions } from '../contexts'
import { generateDSLViaJSON, hasApiKey } from '../lib/ai'

export type EditorTab = 'layout' | 'components' | 'tokens'

interface EditorPanelProps {
  width: number
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
  layoutCode: string
  componentsCode: string
  tokensCode: string
  onLayoutChange: (code: string) => void
  onComponentsChange: (code: string) => void
  onTokensChange: (code: string) => void
  highlightLine?: number
  designTokens?: Map<string, unknown>
  autoCompleteMode: 'always' | 'delay' | 'off'
}

export const EditorPanel = memo(function EditorPanel({
  width,
  activeTab,
  onTabChange,
  layoutCode,
  componentsCode,
  tokensCode,
  onLayoutChange,
  onComponentsChange,
  onTokensChange,
  highlightLine,
  designTokens,
  autoCompleteMode,
}: EditorPanelProps) {
  // Get editor actions from context instead of props
  const { onClear, onClean } = useEditorActions()
  const currentValue = activeTab === 'layout' ? layoutCode : activeTab === 'components' ? componentsCode : tokensCode
  const currentOnChange = activeTab === 'layout' ? onLayoutChange : activeTab === 'components' ? onComponentsChange : onTokensChange

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Handle AI generation
  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      // Pass design system (tokens + components) as context
      const designSystem = {
        tokens: tokensCode,
        components: componentsCode,
      }
      const result = await generateDSLViaJSON(aiPrompt.trim(), designSystem)
      if (result.layout) {
        // Append generated code to layout (always to layout tab)
        const newCode = layoutCode.trim()
          ? layoutCode.trimEnd() + '\n\n' + result.layout
          : result.layout
        onLayoutChange(newCode)
        setAiPrompt('')
      }
    } catch (err) {
      console.error('AI generation error:', err)
      // Show error to user
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [aiPrompt, isGenerating, tokensCode, componentsCode, layoutCode, onLayoutChange])

  // Handle keyboard in prompt
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && aiPrompt.trim() && !isGenerating) {
      e.preventDefault()
      handleGenerate()
    }
  }, [aiPrompt, isGenerating, handleGenerate])

  return (
    <div style={{ padding: '4px 12px 12px 16px', width: `${width}px`, backgroundColor: colors.panel }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.panel,
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Tab Toggle */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '2px 4px',
        }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <TabButton
              label="Page"
              isActive={activeTab === 'layout'}
              onClick={() => onTabChange('layout')}
            />
            <TabButton
              label="Components"
              isActive={activeTab === 'components'}
              onClick={() => onTabChange('components')}
            />
            <TabButton
              label="Tokens"
              isActive={activeTab === 'tokens'}
              onClick={() => onTabChange('tokens')}
            />
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <IconButton onClick={onClear} title="Clear">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </IconButton>
            <IconButton onClick={onClean} title="Extract">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M16 16h5v5"/>
              </svg>
            </IconButton>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', paddingLeft: '4px' }}>
          <PromptPanel
            value={currentValue}
            onChange={currentOnChange}
            highlightLine={activeTab === 'layout' ? highlightLine : undefined}
            tab={activeTab === 'tokens' ? undefined : activeTab}
            getOtherTabCode={activeTab === 'tokens' ? undefined : () => activeTab === 'layout' ? componentsCode : layoutCode}
            tokensCode={tokensCode}
            designTokens={designTokens}
            autoCompleteMode={autoCompleteMode}
          />
        </div>

        {/* AI Prompt Footer - only visible when API key is configured */}
        {hasApiKey() && (
          <div style={{
              borderTop: `1px solid ${colors.border}`,
              padding: '8px 4px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isGenerating ? '#F59E0B' : colors.textMuted}
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 2a10 10 0 1 0 10 10H12V2Z"/>
                <path d="M12 12 2.1 12"/>
                <path d="m5 19 5-5"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Was soll ich erstellen?"
                disabled={isGenerating}
                style={{
                  flex: 1,
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
              {isGenerating && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #333',
                  borderTop: '2px solid #F59E0B',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
              )}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
          </div>
        )}
      </div>
    </div>
  )
})

// Tab button component
function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 0',
        fontSize: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: isActive ? 600 : 500,
        border: 'none',
        borderBottom: 'none',
        outline: 'none',
        textDecoration: 'none',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: isActive ? colors.text : colors.textMuted,
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  )
}

// Icon button component (Clear, Extract)
function IconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        backgroundColor: 'transparent',
        color: colors.textMuted,
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
