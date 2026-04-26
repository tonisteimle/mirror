/**
 * Mirror Agent — Fixer-only AI integration
 *
 * Single AI path: Claude Code CLI via Tauri Bridge (uses user's CLI subscription).
 *
 * @example
 * ```typescript
 * import { createFixer } from './agent'
 *
 * const fixer = createFixer({ ... })
 *
 * for await (const event of fixer.fix("füge einen roten button hinzu")) {
 *   if (event.type === 'text') console.log(event.content)
 *   if (event.type === 'done') console.log('Fertig!')
 * }
 * ```
 */

export { FixerService, createFixer, getFixer } from './fixer'
export type { FixerConfig } from './fixer'
export {
  ContextCollector,
  createContextCollector,
  getContextCollector,
  extractProjectContext,
} from './context-collector'
export { CodeApplicator, createCodeApplicator, getCodeApplicator } from './code-applicator'
export { buildFixerSystemPrompt, buildFixerPrompt } from './prompts/fixer-system'

export * from './types'
