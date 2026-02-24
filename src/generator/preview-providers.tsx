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
import { TemplateRegistryProvider, TokenProvider, TypographyProvider } from './contexts'
import type { TypographyContextValue } from './contexts'
import { DataProvider } from './data-context'
import { RuntimeVariableProvider } from './RuntimeVariableProvider'

export interface PreviewProvidersProps {
  children: ReactNode
  registry: Map<string, ComponentTemplate>
  onPageNavigate?: (pageName: string) => void
  dataRecords?: Map<string, DataRecord[]>
  dataSchemas?: DataSchema[]
  tokens?: Map<string, TokenValue>
  /** Theme definitions: Map<themeName, Map<tokenName, tokenValue>> */
  themes?: Map<string, Map<string, TokenValue>>
  /** Currently active theme name */
  activeTheme?: string | null
  /** Inherited typography from App (font, size, color, line-height) */
  typography?: TypographyContextValue
}

/**
 * Composite provider that wraps all preview-related providers.
 * Reduces provider nesting from 6 levels to 1.
 *
 * Includes:
 * - TypographyProvider (inherited font/size from App)
 * - BehaviorRegistryProvider (state management)
 * - ComponentRegistryProvider (component instances)
 * - TemplateRegistryProvider (component templates)
 * - TokenProvider (design tokens)
 * - OverlayRegistryProvider (overlays/dialogs)
 * - DataProvider (data binding)
 */
export function PreviewProviders({
  children,
  registry,
  onPageNavigate,
  dataRecords = new Map(),
  dataSchemas = [],
  tokens = new Map(),
  themes = new Map(),
  activeTheme = null,
  typography = {},
}: PreviewProvidersProps) {
  // Note: themes and activeTheme are available for future runtime theme switching
  // Currently, theme tokens are merged into 'tokens' at parse time
  // Convert tokens Map to object for RuntimeVariableProvider
  const initialVariables: Record<string, unknown> = {}
  tokens.forEach((value, key) => {
    initialVariables[key] = value
  })

  return (
    <TypographyProvider typography={typography}>
      <BehaviorRegistryProvider>
        <ComponentRegistryProvider onPageNavigate={onPageNavigate}>
          <TemplateRegistryProvider registry={registry}>
            <TokenProvider tokens={tokens}>
              <RuntimeVariableProvider initialVariables={initialVariables}>
                <OverlayRegistryProvider>
                  <DataProvider allRecords={dataRecords} schemas={dataSchemas}>
                    {children}
                  </DataProvider>
                </OverlayRegistryProvider>
              </RuntimeVariableProvider>
            </TokenProvider>
          </TemplateRegistryProvider>
        </ComponentRegistryProvider>
      </BehaviorRegistryProvider>
    </TypographyProvider>
  )
}
