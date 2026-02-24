/**
 * React to Mirror Transformation Module
 *
 * Provides the full pipeline: React/JSX → Schema → Mirror DSL
 */

export * from './schema'
export { default as parseReactCode } from './react-parser'
export { default as transformToMirror } from './transformer'

import parseReactCode from './react-parser'
import transformToMirror from './transformer'

/**
 * Transform React/JSX code to Mirror DSL
 *
 * @param reactCode - React/JSX code following the constrained API
 * @returns Mirror DSL code string
 */
export function reactToMirror(reactCode: string): string {
  const document = parseReactCode(reactCode)
  return transformToMirror(document)
}

export default reactToMirror
