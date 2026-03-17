/**
 * Test Utilities - Vitest Setup
 *
 * This file is loaded before each test file and registers
 * custom matchers with Vitest's expect.
 */

import { expect } from 'vitest'
import * as matchers from './matchers'

// Register all custom matchers
expect.extend(matchers)

// TypeScript declarations for IDE support
declare module 'vitest' {
  interface Assertion<T = any> {
    // DOM Matchers
    toHaveStyle(styles: Record<string, string>): T
    toHaveChildCount(count: number): T
    toHaveTagName(tag: string): T
    toHaveDataset(dataset: Record<string, string>): T
    toHaveStateStyles(state: string, styles: Record<string, string>): T
    toHaveInitialState(state: string): T
    toMatchDOMStructure(structure: import('./types').DOMStructure): T
    toHaveTextContent(text: string): T
    toHaveAttribute(name: string, value?: string): T

    // IR Matchers
    toHaveIRStyle(property: string, value: string): T
    toHaveIREvent(eventName: string): T
    toHaveIRChildren(count: number): T

    // Error Matchers
    toHaveParseError(pattern: RegExp | string): T
    toHaveSemanticError(errorType: string): T
    toHaveNoErrors(): T
  }

  interface AsymmetricMatchersContaining {
    // DOM Matchers
    toHaveStyle(styles: Record<string, string>): any
    toHaveChildCount(count: number): any
    toHaveTagName(tag: string): any
    toHaveDataset(dataset: Record<string, string>): any
    toHaveStateStyles(state: string, styles: Record<string, string>): any
    toHaveInitialState(state: string): any
    toMatchDOMStructure(structure: import('./types').DOMStructure): any
    toHaveTextContent(text: string): any
    toHaveAttribute(name: string, value?: string): any

    // IR Matchers
    toHaveIRStyle(property: string, value: string): any
    toHaveIREvent(eventName: string): any
    toHaveIRChildren(count: number): any

    // Error Matchers
    toHaveParseError(pattern: RegExp | string): any
    toHaveSemanticError(errorType: string): any
    toHaveNoErrors(): any
  }
}
