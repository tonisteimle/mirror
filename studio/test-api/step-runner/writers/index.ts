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
export { marWriter } from './mar'
export { marTWriter, marRWriter, marBWriter, marLWriter } from './mar-sides'
export { marXWriter, marYWriter } from './mar-axis'
export { gapWriter } from './gap'
export { fsWriter } from './fs'
export { radWriter } from './rad'
export { bgWriter } from './bg'
export { colWriter } from './col'

import type { PropertyWriter } from './types'
import { padWriter } from './pad'
import { padTWriter } from './pad-t'
import { padRWriter, padBWriter, padLWriter } from './pad-sides'
import { padXWriter, padYWriter } from './pad-axis'
import { marWriter } from './mar'
import { marTWriter, marRWriter, marBWriter, marLWriter } from './mar-sides'
import { marXWriter, marYWriter } from './mar-axis'
import { gapWriter } from './gap'
import { fsWriter } from './fs'
import { radWriter } from './rad'
import { bgWriter } from './bg'
import { colWriter } from './col'

export const PROPERTY_WRITERS: Record<string, PropertyWriter> = {
  pad: padWriter,
  'pad-t': padTWriter,
  'pad-r': padRWriter,
  'pad-b': padBWriter,
  'pad-l': padLWriter,
  'pad-x': padXWriter,
  'pad-y': padYWriter,
  mar: marWriter,
  'mar-t': marTWriter,
  'mar-r': marRWriter,
  'mar-b': marBWriter,
  'mar-l': marLWriter,
  'mar-x': marXWriter,
  'mar-y': marYWriter,
  gap: gapWriter,
  fs: fsWriter,
  rad: radWriter,
  bg: bgWriter,
  col: colWriter,
}

export function getWriter(propertyName: string): PropertyWriter | null {
  return PROPERTY_WRITERS[propertyName] ?? null
}
