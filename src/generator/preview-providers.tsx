/**
 * Preview Providers - Composite Provider
 *
 * Combines all preview-related context providers into a single component
 * to reduce provider nesting and improve code readability.
 */

import type { ReactNode } from 'react'
import type { ComponentTemplate, DataSchema, DataRecord, TokenValue } from '../parser/parser'
import { BehaviorRegistryProvider } from './behaviors'
import { ComponentRegistryProvider } from './component-registry'
import { OverlayRegistryProvider } from './overlay-registry'
import { TemplateRegistryProvider, TokenProvider, ContentEditProvider } from './contexts'
import { DataProvider } from './data-context'

export interface PreviewProvidersProps {
  children: ReactNode
  registry: Map<string, ComponentTemplate>
  onPageNavigate?: (pageName: string) => void
  dataRecords?: Map<string, DataRecord[]>
  dataSchemas?: DataSchema[]
  tokens?: Map<string, TokenValue>
  /** Whether content edit mode is active */
  contentEditMode?: boolean
  /** Callback when text content changes in edit mode */
  onTextChange?: (sourceLine: number, newText: string, token?: string) => void
}

/**
 * Composite provider that wraps all preview-related providers.
 * Reduces provider nesting from 6 levels to 1.
 *
 * Includes:
 * - BehaviorRegistryProvider (state management)
 * - ComponentRegistryProvider (component instances)
 * - TemplateRegistryProvider (component templates)
 * - TokenProvider (design tokens)
 * - OverlayRegistryProvider (overlays/dialogs)
 * - DataProvider (data binding)
 * - ContentEditProvider (direct text editing)
 */
export function PreviewProviders({
  children,
  registry,
  onPageNavigate,
  dataRecords = new Map(),
  dataSchemas = [],
  tokens = new Map(),
  contentEditMode = false,
  onTextChange,
}: PreviewProvidersProps) {
  return (
    <BehaviorRegistryProvider>
      <ComponentRegistryProvider onPageNavigate={onPageNavigate}>
        <TemplateRegistryProvider registry={registry}>
          <TokenProvider tokens={tokens}>
            <OverlayRegistryProvider>
              <DataProvider allRecords={dataRecords} schemas={dataSchemas}>
                <ContentEditProvider enabled={contentEditMode} onTextChange={onTextChange}>
                  {children}
                </ContentEditProvider>
              </DataProvider>
            </OverlayRegistryProvider>
          </TokenProvider>
        </TemplateRegistryProvider>
      </ComponentRegistryProvider>
    </BehaviorRegistryProvider>
  )
}
