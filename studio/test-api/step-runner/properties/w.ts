/**
 * Property Reader: `w` (width) — number form only.
 *
 * Mirror's width property accepts three forms:
 *   - `w N`        — pixel value (this reader handles it)
 *   - `w full`     — stretch to fill (CSS: flex 1 1 0%, align-self stretch)
 *   - `w hug`      — shrink to content (CSS: width fit-content)
 *
 * Keyword forms are NOT yet supported by this reader — the DOM doesn't
 * preserve which form the value came from (browsers compute fit-content
 * back to a pixel value, etc.), so distinguishing the source form from
 * computed style alone is unreliable. A future increment can add keyword
 * detection via additional CSS hints (flex shorthand, align-self) plus
 * source-form preservation in the panel state.
 */

import { createNumberReader } from './_number-factory'

export const wReader = createNumberReader({
  name: 'w',
  aliases: ['w', 'width'],
  cssProp: 'width',
})
