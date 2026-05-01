/**
 * Drag test helpers — palette component lookup
 */

import { LAYOUT_SECTION, COMPONENTS_SECTION } from '../../panels/components/layout-presets'
import type { ComponentItem } from '../../panels/components/types'

/**
 * Look up a component by name from the palette sections
 * Returns the component definition if found, undefined otherwise
 */
export function lookupComponentByName(name: string): ComponentItem | undefined {
  // First check layout section
  const layoutItem = LAYOUT_SECTION.find(item => item.name.toLowerCase() === name.toLowerCase())
  if (layoutItem) return layoutItem

  // Then check components section
  const componentItem = COMPONENTS_SECTION.find(
    item => item.name.toLowerCase() === name.toLowerCase()
  )
  if (componentItem) return componentItem

  return undefined
}
