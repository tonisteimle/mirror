/**
 * Property Reader: `rad` (border-radius).
 * Generated from the simple-number factory.
 */

import { createNumberReader } from './_number-factory'

export const radReader = createNumberReader({
  name: 'rad',
  aliases: ['rad', 'radius'],
  // CSS computed style returns one of borderTopLeftRadius/etc.; for a
  // uniform `rad N`, all four corners are equal, so reading borderTopLeftRadius
  // is a faithful representative.
  cssProp: 'borderTopLeftRadius',
})
