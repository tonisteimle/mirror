/**
 * LLM Prompt Template for JavaScript Builder API
 *
 * This prompt teaches the LLM to generate UI using the JS Builder API,
 * which is then automatically transformed to Mirror DSL.
 *
 * NOTE: The actual prompt is in js-builder-prompts.ts which uses
 * reference.json as the source of truth for Mirror syntax.
 */

// Re-export from centralized prompt file
export { JS_BUILDER_PROMPT, default } from './js-builder-prompts'
