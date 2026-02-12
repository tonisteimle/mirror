import { memo } from 'react'
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
  onPageNavigate?: (pageName: string) => void
}

export const Preview = memo(function Preview({
  nodes,
  registry,
  onPageNavigate
}: PreviewProps) {
  if (nodes.length === 0) {
    return <div style={{ height: '100%', backgroundColor: colors.preview }} />
  }

  // Render function for overlays
  const renderOverlayNode = (node: ASTNode) => {
    return generateReactElement([node], {})
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
                {generateReactElement(nodes, {})}
              </div>
            </div>
            <OverlayPortal renderNode={renderOverlayNode} />
          </OverlayRegistryProvider>
        </TemplateRegistryProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
})
