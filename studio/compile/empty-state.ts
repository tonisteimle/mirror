/**
 * Empty-State Compile Output
 *
 * Single source of truth for the synthetic preview HTML + studio-state
 * reset that fires when the editor source is empty.
 *
 * The synthetic wrapper (`data-mirror-root="true"`, `data-component="App"`,
 * `data-mirror-id="node-1"`) exists so that drag-drop has a target zone
 * even before the user has typed anything. It carries the same
 * `data-mirror-root` marker that real user-roots get, so anything that
 * walks the preview DOM must distinguish via `data-component` /
 * SourceMap-presence — see `sync-coordinator-v2.ts`.
 *
 * Two call sites historically duplicated this:
 *   - studio/app.ts (the production compile path)
 *   - studio/compile/compile-service.ts (the modular orchestrator)
 *
 * Both now go through `renderEmptyPreview` / `resetSelectionForEmptyCode`.
 */

export const EMPTY_PREVIEW_HTML = `<div class="mirror-root" style="width: 100%; height: 100%;">
      <div data-mirror-id="node-1" data-mirror-root="true" data-mirror-name="App" data-component="App"
           style="display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 200px;">
      </div>
    </div>`

export interface SelectionManager {
  clearSelection: () => void
  setBreadcrumb: (items: unknown[]) => void
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
export function resetSelectionForEmptyCode(manager: SelectionManager | undefined): void {
  if (!manager) return
  manager.clearSelection()
  manager.setBreadcrumb([])
}
