/**
 * Inline State and Event Extraction
 *
 * Functions for extracting inline states and events from instance children.
 * The parser treats inline constructs like:
 * - `state hover bg #333` as a child Instance with component="state"
 * - `onclick toggle` as a child Instance with component="onclick"
 */

import type { Instance, Text, Property } from '../../parser/ast'
import { isInstance } from '../../parser/ast'
import type { IRStyle, IREvent, IRAction } from '../types'
import { mapEventToDom } from '../../schema/ir-helpers'

/**
 * Context for inline extraction
 */
export interface InlineExtractionContext {
  propertyToCSS: (prop: Property) => IRStyle[]
}

/**
 * Result of inline state/event extraction
 */
export interface InlineExtractionResult {
  inlineStateStyles: IRStyle[]
  inlineEvents: IREvent[]
  remainingChildren: (Instance | Text)[]
}

/**
 * Extract inline states and events from instance children.
 *
 * This method identifies and extracts them, returning:
 * - inlineStateStyles: IRStyle[] with state attribute
 * - inlineEvents: IREvent[]
 * - remainingChildren: actual UI children
 *
 * @param children Array of instance children
 * @param ctx Context with propertyToCSS function
 * @returns Extraction result with styles, events, and remaining children
 */
export function extractInlineStatesAndEvents(
  children: (Instance | Text)[],
  ctx: InlineExtractionContext
): InlineExtractionResult {
  const inlineStateStyles: IRStyle[] = []
  const inlineEvents: IREvent[] = []
  const remainingChildren: (Instance | Text)[] = []

  for (const child of children) {
    // Only process Instance type
    if (!isInstance(child)) {
      remainingChildren.push(child)
      continue
    }

    const inst = child
    const component = inst.component.toLowerCase()

    // Check for inline state: "state hover bg #333"
    if (component === 'state') {
      // First property should be the state name, rest are styles
      const props = inst.properties
      if (props.length > 0) {
        // First value of first property is the state name
        const stateNameProp = props[0]
        const stateName = stateNameProp.name

        // Rest of the properties are the styles for this state
        const stateProps = props.slice(1)
        for (const prop of stateProps) {
          const cssStyles = ctx.propertyToCSS(prop)
          for (const style of cssStyles) {
            inlineStateStyles.push({ ...style, state: stateName })
          }
        }
      }
      continue
    }

    // Check for inline event: "onclick toggle" or "onhover highlight"
    if (component.startsWith('on')) {
      const eventName = mapEventToDom(component)
      const actions: IRAction[] = []

      // Parse actions from properties
      for (const prop of inst.properties) {
        // Action name is the property name, target is the first value
        actions.push({
          type: prop.name,
          target: prop.values.length > 0 ? String(prop.values[0]) : undefined,
          args: prop.values.slice(1).map(v => String(v)),
        })
      }

      if (actions.length > 0) {
        inlineEvents.push({
          name: eventName,
          actions,
        })
      }
      continue
    }

    // Not a state or event, keep as regular child
    remainingChildren.push(child)
  }

  return { inlineStateStyles, inlineEvents, remainingChildren }
}
