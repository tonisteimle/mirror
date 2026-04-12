/**
 * Selectors - Memoized derived state values
 *
 * Extracted from state.ts for better separation of concerns.
 * Provides computed values that cache based on dependencies.
 */

import type { StudioState, BreadcrumbItem } from './state-types'

// Import state getter - will be set by state.ts to avoid circular dependency
let getState: () => StudioState

/**
 * Initialize the state getter (called by state.ts)
 */
export function initSelectors(stateGetter: () => StudioState): void {
  getState = stateGetter
}

/**
 * Memoized selector factory
 * Caches result based on dependency values
 */
export function createSelector<TDeps extends unknown[], TResult>(
  getDeps: (s: StudioState) => TDeps,
  compute: (...deps: TDeps) => TResult
): () => TResult {
  let cachedDeps: TDeps | null = null
  let cachedResult: TResult

  return () => {
    const currentState = getState()
    const deps = getDeps(currentState)

    // Check if dependencies changed (shallow comparison)
    const depsChanged = cachedDeps === null || deps.some((dep, i) => dep !== cachedDeps![i])

    if (depsChanged) {
      cachedDeps = deps
      cachedResult = compute(...deps)
    }

    return cachedResult
  }
}

/**
 * Computed selectors - memoized derived values
 */
export const computed = {
  /**
   * Get the currently selected node (memoized)
   */
  getSelectedNode: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return null
      return sourceMap.getNodeById(nodeId)
    }
  ),

  /**
   * Get the parent of the selected node (memoized)
   */
  getSelectedNodeParent: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return null
      const node = sourceMap.getNodeById(nodeId)
      if (!node?.parentId) return null
      return sourceMap.getNodeById(node.parentId)
    }
  ),

  /**
   * Get all nodes in multi-selection (memoized)
   */
  getMultiSelectedNodes: createSelector(
    (s) => [s.multiSelection, s.sourceMap] as const,
    (nodeIds, sourceMap) => {
      if (!sourceMap || nodeIds.length === 0) return []
      return nodeIds
        .map(id => sourceMap.getNodeById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null)
    }
  ),

  /**
   * Check if multi-selection nodes are siblings (same parent)
   */
  isValidGroupSelection: createSelector(
    (s) => [s.multiSelection, s.sourceMap] as const,
    (nodeIds, sourceMap) => {
      if (!sourceMap || nodeIds.length < 2) return false
      const nodes = nodeIds
        .map(id => sourceMap.getNodeById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null)
      if (nodes.length !== nodeIds.length) return false

      // All nodes must have the same parent
      const firstParent = nodes[0].parentId
      return nodes.every(n => n.parentId === firstParent)
    }
  ),

  /**
   * Get breadcrumb path from root to selected node (memoized)
   */
  getSelectionBreadcrumb: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return []

      const path: BreadcrumbItem[] = []
      let currentId: string | undefined = nodeId

      while (currentId) {
        const node = sourceMap.getNodeById(currentId)
        if (!node) break
        path.unshift({ nodeId: currentId, name: node.componentName })
        currentId = node.parentId
      }

      return path
    }
  ),

  /**
   * Get children of the selected node (memoized)
   */
  getSelectedNodeChildren: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return []
      return sourceMap.getChildren(nodeId)
    }
  ),
}
