/**
 * Grammar Module Exports
 *
 * Provides access to the PEG parser and grammar verification utilities.
 */

export {
  pegParse,
  isValidSyntax,
  getSyntaxError,
  resetParser,
  extractComponentNames,
  countNodes,
  maxDepth,
  isGrammarLoaded,
  getGrammarError,
  verifyGrammar
} from './peg-parser'

export type {
  PegNode,
  PegProgram,
  PegParseResult,
  PegParseOptions
} from './peg-parser'
