/**
 * Empty-State Compile Output
 *
 * Single source of truth for the synthetic preview HTML + studio-state
 * reset that fires when the editor source is empty.
 *
 * The synthetic wrapper exists so drag-drop has a target zone even
 * before the user has typed anything. Three attributes matter:
 *
 *   - `class="mirror-root"`        ← preview boundary marker (also on
 *                                    real user-roots; sync-coordinator
 *                                    stops walking here)
 *   - `data-mirror-root="true"`    ← "this is the top-level Mirror node"
 *                                    (also on real user-roots; runtime
 *                                    state-machine uses it for closest()
 *                                    lookups)
 *   - `data-mirror-synthetic="true"` ← ONLY on this empty-state wrapper.
 *                                    The disambiguator. Anything that
 *                                    needs to skip the synthetic node
 *                                    (e.g. breadcrumb walk) must check
 *                                    this attribute, not the others.
 *
 * Without `data-mirror-synthetic`, the only way to tell synthetic from
 * real-root is to look up `data-mirror-id` in the SourceMap — which
 * happens to work today because the synthetic node-1 isn't registered,
 * but it's an implicit contract that breaks silently if someone seeds
 * the SourceMap differently.
 */

export const SYNTHETIC_ROOT_ATTR = 'data-mirror-synthetic'

export const EMPTY_PREVIEW_HTML = `<div class="mirror-root" style="width: 100%; height: 100%;">
      <div data-mirror-id="node-1" data-mirror-root="true" ${SYNTHETIC_ROOT_ATTR}="true" data-mirror-name="App" data-component="App"
           style="display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 200px;">
      </div>
    </div>`

export interface SelectionManager {
  clearSelection: () => void
  setBreadcrumb: (items: { nodeId: string; name: string }[]) => void
}

/**
 * Render the synthetic empty-state preview into a host element.
 */
export function renderEmptyPreview(host: HTMLElement): void {
  host.innerHTML = EMPTY_PREVIEW_HTML
  host.className = ''
}

/**
 * Reset selection / breadcrumb to "nothing selected" for an empty source.
 * The synthetic App wrapper isn't a node the user wrote — surfacing it as
 * a breadcrumb entry would mislead, so we set [].
 */
export function resetSelectionForEmptyCode(manager: SelectionManager | null | undefined): void {
  if (!manager) return
  manager.clearSelection()
  manager.setBreadcrumb([])
}
