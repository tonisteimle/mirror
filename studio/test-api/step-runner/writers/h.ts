/**
 * Property Writer: `h` (height) — number form only.
 */

import { createNumberWriter } from './_number-factory'

export const hWriter = createNumberWriter({
  name: 'h',
  aliases: ['h', 'height'],
})
