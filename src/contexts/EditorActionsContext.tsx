/**
 * EditorActionsContext
 *
 * Provides editor action callbacks to deeply nested components,
 * eliminating prop drilling through EditorPanel and PromptPanel.
 */
import { EditorActionsContext, type EditorActions } from './editor-actions-context'

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
