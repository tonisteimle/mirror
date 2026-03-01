/**
 * JSON Pipeline Types
 *
 * Type definitions for the 4-stage JSON generation pipeline.
 * These types define the JSON schemas used for structured code generation.
 */

import type { TokenInfo, ComponentInfo, StylePattern, CursorContext } from '../../lib/ai-context'
import type { CodeIssue } from '../../lib/self-healing'

// =============================================================================
// Stage 0: Prompt Analysis (Understanding what the user wants)
// =============================================================================

export type PromptIntent =
  | 'create'        // Create new UI component
  | 'modify'        // Modify existing component
  | 'style'         // Add/change styling
  | 'add-behavior'  // Add interactivity
  | 'layout'        // Create layout structure

export type UIType =
  | 'button'
  | 'navigation'
  | 'form'
  | 'list'
  | 'card'
  | 'dialog'
  | 'dropdown'
  | 'table'
  | 'tabs'
  | 'header'
  | 'sidebar'
  | 'generic'

export interface PromptAnalysis {
  /** Primary intent of the prompt */
  intent: PromptIntent
  /** Type of UI being requested */
  uiType: UIType
  /** Keywords found in the prompt */
  keywords: string[]
  /** Required capabilities */
  capabilities: {
    needsHover: boolean
    needsSelected: boolean
    needsEvents: boolean
    needsIteration: boolean
    needsAnimation: boolean
    needsIcons: boolean
    needsImages: boolean
    needsInputs: boolean
  }
  /** Suggested component types based on UI type */
  suggestedComponents: string[]
  /** Relevant property categories */
  relevantPropertyCategories: string[]
}

// =============================================================================
// Stage 0: Analysis Context (Output of deterministic analysis)
// =============================================================================

export interface AnalysisContext {
  /** Prompt analysis (understanding user intent) */
  promptAnalysis: PromptAnalysis
  /** Available design tokens (filtered by relevance) */
  tokens: TokenInfo[]
  /** Defined components (filtered by relevance) */
  components: ComponentInfo[]
  /** Detected style patterns */
  stylePatterns: StylePattern[]
  /** Cursor position context */
  cursorContext: CursorContext | null
  /** Valid property names (filtered by relevance) */
  validProperties: Set<string>
  /** Valid state names (filtered by relevance) */
  validStates: Set<string>
  /** Valid event names (filtered by relevance) */
  validEvents: Set<string>
  /** Valid action names (filtered by relevance) */
  validActions: Set<string>
  /** Pre-formatted context string optimized for LLM */
  formattedContext: string
}

// =============================================================================
// Stage 1: Structure JSON (Component hierarchy without properties)
// =============================================================================

export interface StructureComponent {
  /** Component type: Box, Text, Button, Icon, Input, or custom component name */
  type: string
  /** For definitions: the component name (e.g., "MyButton" for "MyButton:") */
  name?: string
  /** True if this is a definition (Name:) */
  isDefinition?: boolean
  /** For "as" syntax: "Email as Input" */
  definedAs?: string
  /** For named instances: "Button named SaveBtn" */
  instanceName?: string
  /** Text content (string in quotes) */
  content?: string
  /** Child components */
  children?: StructureComponent[]
}

export interface StructureJSON {
  /** Root-level components */
  components: StructureComponent[]
}

// =============================================================================
// Stage 2: Properties JSON (Full component with properties, states, events)
// =============================================================================

export interface MirrorProperty {
  /** Property name in canonical (long) form: "padding", "background", etc. */
  name: string
  /** Property value: string, number, or boolean */
  value: string | number | boolean
  /** True if value is a token reference (will be prefixed with $) */
  isToken?: boolean
  /** Direction modifier for spacing: "top", "left-right", etc. */
  direction?: string
}

export interface MirrorState {
  /** State name: "hover", "selected", "expanded", etc. */
  name: string
  /** Properties applied in this state */
  properties: MirrorProperty[]
}

export interface MirrorEvent {
  /** Event type: "onclick", "onhover", "onkeydown", etc. */
  event: string
  /** Key modifier for keyboard events: "escape", "enter", etc. */
  key?: string
  /** Timing modifier: { type: "debounce" | "delay", ms: number } */
  timing?: { type: 'debounce' | 'delay'; ms: number }
  /** Actions to execute */
  actions: string[]
}

export interface FullComponent extends StructureComponent {
  /** Style/layout properties */
  properties?: MirrorProperty[]
  /** State blocks (hover, selected, etc.) */
  states?: MirrorState[]
  /** Event handlers */
  events?: MirrorEvent[]
  /** Child components (override with FullComponent type) */
  children?: FullComponent[]
}

export interface PropertiesJSON {
  /** Root-level components with full properties */
  components: FullComponent[]
  /** Token definitions (optional) */
  tokens?: Record<string, string | number>
  /** State variables (optional) */
  variables?: Record<string, string | number | boolean | null>
}

// =============================================================================
// Validation Results
// =============================================================================

export interface ValidationError {
  /** JSON path to the error location */
  path: string
  /** Error message */
  message: string
  /** Suggested fix (if available) */
  suggestion?: string
}

export interface JSONValidationResult {
  /** Whether the JSON is valid */
  valid: boolean
  /** Validation errors */
  errors: ValidationError[]
  /** Warnings (non-fatal issues) */
  warnings: ValidationError[]
}

// =============================================================================
// Pipeline Results
// =============================================================================

export interface StageResult<T> {
  /** Output of the stage */
  json: T
  /** Validation errors (empty if valid) */
  errors: ValidationError[]
  /** Time taken for this stage (ms) */
  durationMs: number
}

export interface PipelineResult {
  /** Final Mirror DSL code */
  code: string
  /** Whether the code is valid */
  isValid: boolean
  /** Validation issues from final code */
  validationIssues?: CodeIssue[]
  /** Error message (if pipeline failed) */
  error?: string
  /** Time to first token (ms) */
  timeToFirstToken: number
  /** Total time (ms) */
  totalTime: number
  /** Debug info: intermediate JSON stages */
  debug?: {
    analysisContext?: AnalysisContext
    structureJSON?: StructureJSON
    propertiesJSON?: PropertiesJSON
    constrainedJSON?: PropertiesJSON
    stageDurations?: {
      stage0?: number
      stage1?: number
      stage2?: number
      stage3?: number
      dispatch?: number
      correction?: number
      review?: number
      complexPipeline?: number
      expert?: number
    }
    decomposition?: {
      areas?: Array<{ name: string; position: string; purpose: string }>
      entities?: Array<{ name: string; fields: string[] }>
      components: Array<{ name: string; purpose: string; usedIn: string[] }>
      interactions?: string[]
    }
    generatedComponents?: string[]
    /** Expert used for generation */
    expertUsed?: string
    /** Schema used by the expert */
    expertSchema?: unknown
  }
}

// =============================================================================
// Pipeline Options
// =============================================================================

export interface PipelineOptions {
  /** Enable debug mode (include intermediate JSON in result) */
  debug?: boolean
  /** Maximum correction attempts (legacy, use maxReviewIterations) */
  maxCorrectionAttempts?: number
  /** Maximum self-review iterations (default: 3) */
  maxReviewIterations?: number
  /** Maximum full regenerations for critical errors (default: 1) */
  maxRegenerations?: number
  /** Skip validation (for testing) */
  skipValidation?: boolean
  /** Skip self-review loop (faster but may have more errors) */
  skipReview?: boolean
  /** Skip expert pattern check (use regular pipeline) */
  skipExpertCheck?: boolean
  /** Use streaming for LLM calls */
  streaming?: boolean
  /** Callbacks for streaming and progress */
  callbacks?: {
    onToken?: (token: string, accumulated: string) => void
    onFirstToken?: (latency: number) => void
    /** Called when a stage starts */
    onStageStart?: (stageIndex: number, stageName: string) => void
    /** Called when a stage completes */
    onStageComplete?: (stage: string, duration: number) => void
  }
}
