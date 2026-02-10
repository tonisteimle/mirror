/**
 * EditorPanel component containing the code editor tabs and AI prompt input.
 */

import { colors } from '../theme'
import { PromptPanel } from './PromptPanel'

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
  onOpenAiAssistant: (position: { x: number; y: number }) => void
  onClear: () => void
  onClean: () => void
}

export function EditorPanel({
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
  onOpenAiAssistant,
  onClear,
  onClean,
}: EditorPanelProps) {
  const currentValue = activeTab === 'layout' ? layoutCode : activeTab === 'components' ? componentsCode : tokensCode
  const currentOnChange = activeTab === 'layout' ? onLayoutChange : activeTab === 'components' ? onComponentsChange : onTokensChange

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
            onOpenAiAssistant={onOpenAiAssistant}
          />
        </div>
      </div>
    </div>
  )
}

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
