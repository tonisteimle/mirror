/**
 * Template Registry Context
 *
 * Provides access to component templates (ComponentTemplate) for overlay rendering.
 */

import type { ReactNode } from 'react'
import type { ComponentTemplate } from '../../parser/parser'
import { TemplateRegistryContext } from './template-registry-context'

export function TemplateRegistryProvider({
  registry,
  children
}: {
  registry: Map<string, ComponentTemplate>
  children: ReactNode
}) {
  return (
    <TemplateRegistryContext.Provider value={registry}>
      {children}
    </TemplateRegistryContext.Provider>
  )
}

