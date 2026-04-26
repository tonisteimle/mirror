/**
 * Property Reader: `h` (height) — number form only. See w.ts for the
 * keyword-form caveat (`h full`, `h hug` not yet supported).
 */

import { createNumberReader } from './_number-factory'

export const hReader = createNumberReader({
  name: 'h',
  aliases: ['h', 'height'],
  cssProp: 'height',
})
