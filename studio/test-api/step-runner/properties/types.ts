/**
 * Property Reader Interface
 *
 * A property in Mirror has one identity (`nodeId + propertyName`) and three
 * representations that must always agree:
 *   - in the source code
 *   - in the rendered DOM
 *   - in the Property Panel
 *
 * A `PropertyReader` knows how to read its property from each of those three
 * places, returning the same canonical string value (e.g. "24" for a number,
 * "white" or "#ffffff" for a color). The runner compares all three to the
 * expected value and to each other — sync drift becomes a failure with a
 * clean per-dimension diff.
 *
 * Returning `null` from any reader means "not set in this dimension". A
 * property is considered consistent if all three readers agree on the same
 * non-null value, OR all three return null.
 */

import type { TestAPI } from '../../types'

export type PropertyValue = string | null

export interface ReaderContext {
  /** Full Mirror source as the editor currently sees it. */
  source: string
  /** SourceMap for line→nodeId resolution. */
  sourceMap: SourceMapLike
  /** Preview container for DOM queries. */
  container: HTMLElement
  /** Test API for panel access. */
  api: TestAPI
}

/**
 * Subset of SourceMap we use — keeps the reader interface free of compiler
 * imports. The real SourceMap satisfies this shape.
 */
export interface SourceMapLike {
  getNodeById(id: string): { position: { line: number } } | null
}

export interface PropertyReader {
  /** The Mirror property name this reader handles, e.g. "pad". */
  name: string
  /** Aliases recognized in source — e.g. ["padding", "p"] for "pad". */
  aliases?: string[]

  /** Read this property from the Mirror source for the given node. */
  fromCode(nodeId: string, ctx: ReaderContext): PropertyValue
  /** Read this property from the rendered DOM for the given node. */
  fromDom(nodeId: string, ctx: ReaderContext): PropertyValue
  /** Read this property from the Property Panel for the given node. */
  fromPanel(nodeId: string, ctx: ReaderContext): PropertyValue

  /**
   * Optional value normaliser. When present, the runner applies it to the
   * expected value (and to each read result) before comparison. This lets
   * properties with multiple equivalent representations (e.g. colors:
   * `white` ≡ `#ffffff` ≡ `rgb(255,255,255)`) accept any form in
   * `expect.props` and match any form coming back from code/DOM/panel.
   *
   * Number-valued properties don't need this — readers return canonical
   * integer strings already.
   */
  normalize?(value: PropertyValue): PropertyValue
}
