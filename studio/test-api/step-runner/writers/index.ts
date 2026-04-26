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
export { padRWriter, padBWriter, padLWriter } from './pad-sides'
export { padXWriter, padYWriter } from './pad-axis'

import type { PropertyWriter } from './types'
import { padWriter } from './pad'
import { padTWriter } from './pad-t'
import { padRWriter, padBWriter, padLWriter } from './pad-sides'
import { padXWriter, padYWriter } from './pad-axis'

export const PROPERTY_WRITERS: Record<string, PropertyWriter> = {
  pad: padWriter,
  'pad-t': padTWriter,
  'pad-r': padRWriter,
  'pad-b': padBWriter,
  'pad-l': padLWriter,
  'pad-x': padXWriter,
  'pad-y': padYWriter,
}

export function getWriter(propertyName: string): PropertyWriter | null {
  return PROPERTY_WRITERS[propertyName] ?? null
}
