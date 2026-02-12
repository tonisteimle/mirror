/**
 * Smart Render Utilities
 *
 * Auto-wraps components with required providers.
 */
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement, ComponentType } from 'react'
import { EditorActionsProvider, type EditorActions } from '../../contexts'
import { editorActionsContext } from './factories'

// Provider configuration type
interface ProviderConfig {
  EditorActions?: Partial<EditorActions>
}

/**
 * Render with all necessary providers auto-wrapped.
 */
export function renderWithProviders(
  ui: ReactElement,
  config?: ProviderConfig
): RenderResult {
  const editorActions = {
    ...editorActionsContext(),
    ...config?.EditorActions,
  } as EditorActions

  return render(
    <EditorActionsProvider actions={editorActions}>
      {ui}
    </EditorActionsProvider>
  )
}

/**
 * Create a render function for a specific component with default props.
 */
export function createRenderer<P extends Record<string, unknown>>(
  Component: ComponentType<P>,
  defaultProps: () => P,
  options?: { providers?: ProviderConfig }
) {
  return (overrides?: Partial<P>) => {
    const props = { ...defaultProps(), ...overrides } as P
    const element = <Component {...props} />

    const result = options?.providers
      ? renderWithProviders(element, options.providers)
      : render(element)

    return {
      ...result,
      props,
    }
  }
}

/**
 * Render result with props reference for assertions.
 */
export interface RenderWithProps<P> extends RenderResult {
  props: P
}
