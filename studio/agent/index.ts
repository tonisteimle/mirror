/**
 * Mirror Agent
 *
 * AI-powered assistant for Mirror DSL editing.
 *
 * @example
 * ```typescript
 * import { createMirrorAgent } from './agent'
 * import { getLLMBridge } from '../llm'
 *
 * const agent = createMirrorAgent({
 *   apiKey: 'sk-...',
 *   getCode: () => editor.state.doc.toString(),
 *   tokens: { '$primary.bg': '#007bff' }
 * })
 *
 * const bridge = getLLMBridge()
 *
 * // Stream responses
 * for await (const event of agent.run("Make the button red")) {
 *   if (event.type === 'text') {
 *     console.log(event.content)
 *   }
 *   if (event.type === 'command') {
 *     // Execute command through LLMBridge
 *     bridge.executeResponse({ commands: [event.command] })
 *   }
 * }
 * ```
 */

export { MirrorAgent, createMirrorAgent } from './mirror-agent'
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
export type { CommandHandlerConfig, CommandResult } from './command-handler'
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
