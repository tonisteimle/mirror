import { memo, useCallback, useMemo } from 'react'
import type { ASTNode, ComponentTemplate, DataSchema, DataRecord, TokenValue } from '../parser/parser'
import { generateReactElement, OverlayPortal } from '../generator/react-generator.tsx'
import { PreviewProviders } from '../generator/preview-providers'
import { extractTypography } from '../generator/contexts'
import { colors } from '../theme'

// Stable empty options object to prevent unnecessary re-renders
const EMPTY_OPTIONS = {} as const

// Stable empty token map to prevent unnecessary re-renders
const EMPTY_TOKENS = new Map<string, TokenValue>()

interface PreviewProps {
  nodes: ASTNode[]
  registry: Map<string, ComponentTemplate>
  onPageNavigate?: (pageName: string) => void
  /** Data records for data binding */
  dataRecords?: Map<string, DataRecord[]>
  /** Data schemas for data binding */
  dataSchemas?: DataSchema[]
  /** Design tokens for token inheritance in nested components (e.g., Playground) */
  tokens?: Map<string, TokenValue>
  /** Callback when an element is selected in the preview (single click) */
  onElementSelect?: (line: number | null) => void
  /** Callback when an element is double-clicked (navigates to source) */
  onElementDoubleClick?: (line: number) => void
  /** Callback when an element is option-clicked (opens property panel) */
  onElementOptionClick?: (line: number) => void
  /** Currently selected line */
  selectedLine?: number | null
}

export const Preview = memo(function Preview({
  nodes,
  registry,
  onPageNavigate,
  dataRecords = new Map(),
  dataSchemas = [],
  tokens = EMPTY_TOKENS,
  onElementSelect,
  onElementDoubleClick,
  onElementOptionClick,
  selectedLine,
}: PreviewProps) {
  // Use $appbg-color token if defined, otherwise fall back to default
  const appBgToken = tokens.get('appbg-color')
  const backgroundColor = typeof appBgToken === 'string' ? appBgToken : colors.preview
  const textColor = '#A5A5A5'

  // Extract inherited typography from root node (App)
  // This allows `App font "Inter", size 16` to cascade to all children
  const inheritedTypography = useMemo(() => {
    if (nodes.length === 0) return {}
    const rootNode = nodes[0]
    return extractTypography(rootNode.properties)
  }, [nodes])

  // Create options with inherited typography
  const generateOptions = useMemo(() => ({
    typography: inheritedTypography
  }), [inheritedTypography])

  // Memoized render function for overlays
  const renderOverlayNode = useCallback((node: ASTNode) => {
    return generateReactElement([node], generateOptions)
  }, [generateOptions])

  // Handle click on preview to select element (or option-click for property panel)
  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const elementWithLine = target.closest('[data-source-line]') as HTMLElement | null

    if (elementWithLine) {
      const line = elementWithLine.getAttribute('data-source-line')
      if (line !== null) {
        const lineNum = parseInt(line, 10)
        e.stopPropagation()

        // Option+Click opens property panel
        if (e.altKey && onElementOptionClick) {
          e.preventDefault()
          onElementOptionClick(lineNum)
          return
        }

        // Normal click selects element
        if (onElementSelect) {
          onElementSelect(lineNum)
        }
      }
    } else {
      // Clicked on background - deselect
      if (onElementSelect) {
        onElementSelect(null)
      }
    }
  }, [onElementSelect, onElementOptionClick])

  // Handle double-click to navigate to source line in editor
  const handlePreviewDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onElementDoubleClick) return

    const target = e.target as HTMLElement
    const elementWithLine = target.closest('[data-source-line]') as HTMLElement | null

    if (elementWithLine) {
      const line = elementWithLine.getAttribute('data-source-line')
      if (line !== null) {
        e.stopPropagation()
        e.preventDefault()
        onElementDoubleClick(parseInt(line, 10))
      }
    }
  }, [onElementDoubleClick])

  // Memoize generated elements to avoid re-generating on provider changes
  const generatedElements = useMemo(
    () => generateReactElement(nodes, generateOptions),
    [nodes, generateOptions]
  )

  if (nodes.length === 0) {
    return <div style={{ height: '100%', backgroundColor, color: textColor }} />
  }

  // Add selection highlight styles
  const selectionStyles = selectedLine !== null ? `
    [data-source-line="${selectedLine}"] {
      outline: 2px solid #3B82F6 !important;
      outline-offset: 2px;
    }
  ` : ''

  return (
    <PreviewProviders
      registry={registry}
      onPageNavigate={onPageNavigate}
      dataRecords={dataRecords}
      dataSchemas={dataSchemas}
      tokens={tokens}
      typography={inheritedTypography}
    >
      {selectionStyles && <style>{selectionStyles}</style>}
      <div
        style={{
          height: '100%',
          backgroundColor,
          color: textColor,
          overflow: 'auto',
          position: 'relative',
          cursor: onElementSelect || onElementDoubleClick ? 'pointer' : 'default',
        }}
        onClick={handlePreviewClick}
        onDoubleClick={handlePreviewDoubleClick}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          minHeight: '100%',
          padding: '16px',
          boxSizing: 'border-box',
          // Apply inherited typography from App - these CSS properties naturally cascade
          ...(inheritedTypography.fontFamily && { fontFamily: inheritedTypography.fontFamily }),
          ...(inheritedTypography.fontSize && { fontSize: `${inheritedTypography.fontSize}px` }),
          ...(inheritedTypography.lineHeight && { lineHeight: inheritedTypography.lineHeight }),
          ...(inheritedTypography.color && { color: inheritedTypography.color }),
        }}>
          {generatedElements}
        </div>
      </div>
      <OverlayPortal renderNode={renderOverlayNode} />
    </PreviewProviders>
  )
})
