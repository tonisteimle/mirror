/**
 * Generator Context Providers
 *
 * Barrel export for all generator context providers and hooks.
 */

// Template Registry
export { TemplateRegistryContext } from './template-registry-context'
export { useTemplateRegistry } from './template-registry-hooks'
export { TemplateRegistryProvider } from './template-registry'

// Token Context
export { TokenContext } from './token-context-definition'
export { useTokens } from './token-context-hooks'
export { TokenProvider } from './token-context'

// Container Context
export { ContainerContext, useContainerContext, type ContainerContextValue } from './container-context'
export { templateToNode } from './container-utils'

// State Override Context
export { StateOverrideContext, StateOverrideProvider, useStateOverride, buildStateOverrides } from './state-override-context'
export type { StateOverrideContextValue, StateChildOverride } from './state-override-context'

// Typography Context (inherited font/size from App)
export {
  TypographyContext,
  TypographyProvider,
  useTypography,
  extractTypography
} from './typography-context'
export type { TypographyContextValue } from './typography-context'

// Hover Context (for passing hover state to primitives)
export { HoverContext, useHoverContext } from './hover-context'
export type { HoverContextValue } from './hover-context'

// Filled Context (for primitives to report filled state to parent)
export { FilledContext, useFilledContext } from './filled-context'
export type { FilledContextValue } from './filled-context'
