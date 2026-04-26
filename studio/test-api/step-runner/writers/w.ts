/**
 * Property Writer: `w` (width) — number form only.
 */

import { createNumberWriter } from './_number-factory'

export const wWriter = createNumberWriter({
  name: 'w',
  aliases: ['w', 'width'],
})
