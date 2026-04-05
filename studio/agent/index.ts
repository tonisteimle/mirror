/**
 * Mirror Agent
 *
 * AI-powered assistant for Mirror DSL editing.
 *
 * @example
 * ```typescript
 * import { createFixer } from './agent'
 *
 * const fixer = createFixer({
 *   getFiles: () => fileManager.getFiles(),
 *   getCurrentFile: () => fileManager.currentFile,
 *   // ... other config
 * })
 *
 * // Stream code generation
 * for await (const event of fixer.fix("füge einen roten button hinzu")) {
 *   if (event.type === 'text') console.log(event.content)
 *   if (event.type === 'done') console.log('Fertig!')
 * }
 * ```
 */

// Fixer (Multi-File Code Generation)
export { FixerService, createFixer, getFixer } from './fixer'
export type { FixerConfig } from './fixer'
export { ContextCollector, createContextCollector, getContextCollector, extractProjectContext } from './context-collector'
export { CodeApplicator, createCodeApplicator, getCodeApplicator } from './code-applicator'
export { buildFixerSystemPrompt, buildFixerPrompt } from './prompts/fixer-system'

// Legacy agents
export { MirrorAgent, createMirrorAgent } from './mirror-agent'
export { ClaudeCliAgent, createClaudeCliAgent, isClaudeCliAvailable } from './claude-cli-agent'
export { buildSystemPrompt } from './prompts/system'
export { coreTools } from './tools/core'
export { writeTools } from './tools/write'
export { analyzeTools } from './tools/analyze'
export { generateTools } from './tools/generate'
export { visualTools } from './tools/visual'
export { projectTools } from './tools/project'
export { validateTools } from './tools/validate'
export { validateStructure, validateAndFix, formatErrors } from './validator'
export type { ValidationError, ValidationResult } from './validator'
export { AgentCommandHandler, createCommandHandler } from './command-handler'
export type { CommandHandlerConfig, AgentCommandResult } from './command-handler'
export { VisualFeedbackManager, getVisualFeedbackManager, createVisualFeedbackManager } from './visual-feedback'

// Phase 4: Intelligence
export { MemoryStore, getMemoryStore, createMemoryStore } from './memory'
export type { MemoryEntry, Preference, Pattern, PatternAction, Correction, Snippet, Interaction } from './memory'
export { SuggestionEngine, getSuggestionEngine, createSuggestionEngine } from './suggestions'
export type { Suggestion, SuggestionAction, SuggestionContext } from './suggestions'
export { LearningManager, getLearningManager, createLearningManager } from './learning'
export type { LearningConfig, FeedbackData, LearningStats } from './learning'

// Integration
export { AgentIntegration, initializeAgent, getAgentIntegration, isAgentAvailable } from './integration'
export type { AgentIntegrationConfig } from './integration'

export * from './types'
