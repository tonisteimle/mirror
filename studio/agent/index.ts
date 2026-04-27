/**
 * Mirror Agent — Fixer-only AI integration
 *
 * Single AI path: Claude Code CLI via Tauri Bridge (uses the user's CLI
 * subscription). Triggered by the editor's `??` draft-mode marker.
 *
 * @example
 * ```typescript
 * import { createFixer } from './agent'
 *
 * const fixer = createFixer({
 *   getFiles: () => [...],
 *   getCurrentFile: () => 'index.mir',
 * })
 * const code = await fixer.generateDraftCode('blauer button', '', source)
 * ```
 */

export { FixerService, createFixer, getFixer } from './fixer'
export type { FixerConfig } from './fixer'
export {
  buildDraftPrompt,
  extractCodeBlock,
  indentBlock,
  spliceDraftBlock,
  type DraftPromptInput,
} from './draft-prompts'
export type { FileType, FileInfo } from './types'
