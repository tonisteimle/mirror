import type { ASTNode, ComponentTemplate } from '../parser/parser'
import {
  generateReactElement,
  ComponentRegistryProvider,
  BehaviorRegistryProvider,
  OverlayRegistryProvider,
  TemplateRegistryProvider,
  OverlayPortal
} from '../generator/react-generator.tsx'
import { colors } from '../theme'

interface PreviewProps {
  nodes: ASTNode[]
  registry: Map<string, ComponentTemplate>
  inspectMode: boolean
  hoveredId: string | null
  selectedId: string | null
  onHover: (id: string | null) => void
  onSelect: (id: string) => void
  onPageNavigate?: (pageName: string) => void
}

export function Preview({
  nodes,
  registry,
  inspectMode,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
  onPageNavigate
}: PreviewProps) {
  if (nodes.length === 0) {
    return <div style={{ height: '100%', backgroundColor: colors.preview }} />
  }

  // Render function for overlays
  const renderOverlayNode = (node: ASTNode) => {
    return generateReactElement([node], {
      inspectMode: false,
      hoveredId: null,
      selectedId: null,
      onHover: undefined,
      onClick: undefined,
    })
  }

  return (
    <BehaviorRegistryProvider>
      <ComponentRegistryProvider onPageNavigate={onPageNavigate}>
        <TemplateRegistryProvider registry={registry}>
          <OverlayRegistryProvider>
            <div style={{
              height: '100%',
              backgroundColor: colors.preview,
              overflow: 'auto',
              position: 'relative',
            }}>
              {inspectMode && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  zIndex: 100,
                }}>
                  Inspect Mode (Shift)
                </div>
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                padding: '16px',
                boxSizing: 'border-box',
              }}>
                {generateReactElement(nodes, {
                  inspectMode,
                  hoveredId,
                  selectedId,
                  onHover,
                  onClick: onSelect,
                })}
              </div>
            </div>
            <OverlayPortal renderNode={renderOverlayNode} />
          </OverlayRegistryProvider>
        </TemplateRegistryProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
}
