/**
 * Property Writer Registry
 *
 * Map of property-name → writer. Same shape as the readers registry. Adding
 * a new property means writing a writer file (see `pad.ts` as the reference)
 * and registering it here.
 *
 * Properties currently supported: `pad`.
 */

export type { PropertyWriter, WriteVia, WriterContext } from './types'
export { padWriter } from './pad'
export { padTWriter } from './pad-t'

import type { PropertyWriter } from './types'
import { padWriter } from './pad'
import { padTWriter } from './pad-t'

export const PROPERTY_WRITERS: Record<string, PropertyWriter> = {
  pad: padWriter,
  'pad-t': padTWriter,
}

export function getWriter(propertyName: string): PropertyWriter | null {
  return PROPERTY_WRITERS[propertyName] ?? null
}
