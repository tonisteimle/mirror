/**
 * EditorActionsContext
 *
 * Provides editor action callbacks to deeply nested components,
 * eliminating prop drilling through EditorPanel and PromptPanel.
 */
import { createContext, useContext } from 'react'

export interface EditorActions {
  /** Clear all editor content */
  onClear: () => void
  /** Clean/extract styles from layout to components */
  onClean: () => void
}

const defaultActions: EditorActions = {
  onClear: () => {},
  onClean: () => {},
}

export const EditorActionsContext = createContext<EditorActions>(defaultActions)

/**
 * Hook to access editor actions from any component.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { onClear, onClean } = useEditorActions()
 *   return <button onClick={onClear}>Clear</button>
 * }
 * ```
 */
export function useEditorActions(): EditorActions {
  return useContext(EditorActionsContext)
}

/**
 * Provider component for editor actions.
 */
export function EditorActionsProvider({
  children,
  actions,
}: {
  children: React.ReactNode
  actions: EditorActions
}) {
  return (
    <EditorActionsContext.Provider value={actions}>
      {children}
    </EditorActionsContext.Provider>
  )
}
