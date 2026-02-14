/**
 * EditorActionsContext
 *
 * Context and types for editor action callbacks.
 * Separate from provider to avoid react-refresh issues.
 */
import { createContext } from 'react'

export interface EditorActions {
  /** Clear all editor content */
  onClear: () => void
}

const defaultActions: EditorActions = {
  onClear: () => {},
}

export const EditorActionsContext = createContext<EditorActions>(defaultActions)
