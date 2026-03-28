/**
 * Test Utilities - Type Definitions
 */

import type { JSDOM } from 'jsdom'
import type { AST } from '../parser/ast'
import type { IR } from '../ir/types'

/**
 * Result from compileAndExecute helper
 */
export interface DOMResult {
  /** JSDOM instance */
  dom: JSDOM
  /** The first element inside the container (the actual UI element) */
  root: HTMLElement
  /** The mirror-root container element */
  container: HTMLElement
  /** The Mirror API object */
  api: MirrorAPI
  /** Generated JavaScript code */
  jsCode: string
  /** Generated CSS styles */
  styles: string
}

/**
 * Mirror runtime API
 */
export interface MirrorAPI {
  root: HTMLElement
  setState: (elementId: string, state: string) => void
  getState: (elementId: string) => string | null
  update: (data: Record<string, unknown>) => void
  getElement: (name: string) => HTMLElement | null
}

/**
 * Custom matcher result
 */
export interface MatcherResult {
  pass: boolean
  message: () => string
}

/**
 * Style expectation object
 */
export type StyleExpectation = Record<string, string>

/**
 * Dataset expectation object
 */
export type DatasetExpectation = Record<string, string>

/**
 * DOM structure for matching
 */
export interface DOMStructure {
  tag: string
  attributes?: Record<string, string>
  children?: DOMStructure[]
  text?: string
}

/**
 * Parse error info
 */
export interface ParseError {
  message: string
  line?: number
  column?: number
}

/**
 * IR Node expectation
 */
export interface IRNodeExpectation {
  type?: string
  styles?: Record<string, string>
  events?: string[]
  children?: number
}
