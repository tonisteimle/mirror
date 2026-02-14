/**
 * EditorActionsContext Hooks
 *
 * Hooks for accessing editor actions context.
 * Separated from provider to avoid react-refresh issues.
 */
import { useContext } from 'react'
import { EditorActionsContext, type EditorActions } from './editor-actions-context'

/**
 * Hook to access editor actions from any component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { onClear } = useEditorActions()
 *   return <button onClick={onClear}>Clear</button>
 * }
 * ```
 */
export function useEditorActions(): EditorActions {
  return useContext(EditorActionsContext)
}
