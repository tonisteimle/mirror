/**
 * Test-Utilities für Mirror Dokumentations-Tests
 *
 * @example
 * import {
 *   renderMirror,
 *   parseAndRender,
 *   getStyledElement,
 *   getState,
 *   hasEventHandler,
 *   getParseErrors,
 *   colorsMatch
 * } from './utils'
 */

// Render-Utilities
export {
  renderMirror,
  parseAndRender,
  getStyledElement,
  getStyledElementByText,
  type ParseResult,
} from './render'

// Parser-Helpers
export {
  getFirstNode,
  getStates,
  getState,
  hasState,
  getEventHandlers,
  getEventHandler,
  hasEventHandler,
  hasAction,
  getParseErrors,
  getSyntaxWarnings,
  isParseSuccessful,
  getTextContent,
  getProperty,
  type ASTNode,
  type StateDefinition,
  type EventHandler,
} from './parser-helpers'

// Custom Matchers
export { colorsMatch } from './matchers'

// Matchers werden automatisch bei Import registriert
import './matchers'
