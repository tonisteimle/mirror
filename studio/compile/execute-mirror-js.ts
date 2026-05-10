/**
 * Mirror compiled-JS execution helper.
 *
 * The DOM backend's output is module-level JavaScript with an
 * `export function createUI()` and (in newer modes) an
 * `// Auto-initialization` block that builds `_ui` immediately. We can't
 * directly `import` it here — we evaluate via `new Function()`. The two
 * shapes need slightly different wrappers:
 *
 *   - Auto-init shape: code populates a top-level `_ui` itself; we strip
 *     the `document.body.appendChild` call (the studio mounts manually
 *     into the preview pane) and `return _ui` from the wrapper.
 *
 *   - Classic shape: there's a callable `createUI()`; we return its
 *     result (or null if the codegen produced nothing).
 *
 * In both shapes we replace `export function createUI` with the bare
 * declaration so the wrapper compiles, and inject any YAML data right
 * after the `__mirrorData = { … }` object so the runtime sees it before
 * the first render.
 *
 * Pure-ish: side effects are confined to `new Function(…)` evaluation,
 * which is the whole point of the helper.
 */

const MIRROR_DATA_RE = /(__mirrorData = \{[\s\S]*?\n\})/

export interface UiRootContainer {
  root?: unknown
}

export type UiResult = UiRootContainer | Element | null

function injectYaml(code: string, yamlInjection: string | null | undefined): string {
  if (!yamlInjection) return code
  return code.replace(MIRROR_DATA_RE, match => match + yamlInjection)
}

export function executeMirrorJS(
  jsCode: string,
  yamlInjection: string | null | undefined
): UiResult {
  const hasAutoInit = jsCode.includes('// Auto-initialization')

  if (hasAutoInit) {
    let execCode = jsCode
      .replace('export function createUI', 'function createUI')
      .replace('document.body.appendChild(_ui.root)', '')
    execCode = injectYaml(execCode, yamlInjection)
    const fn = new Function(execCode + '\nreturn _ui;')
    return fn() as UiResult
  }

  const execCode = injectYaml(
    jsCode.replace('export function createUI', 'function createUI'),
    yamlInjection
  )
  const fn = new Function(execCode + '\nreturn createUI ? createUI() : null;')
  return fn() as UiResult
}
