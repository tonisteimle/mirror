/**
 * Component Panel Icons
 *
 * @deprecated This file is deprecated. Import from 'studio/icons' instead.
 * This file re-exports from the central icon system for backwards compatibility.
 */

import type { ComponentIcon } from './types'
import { LAYOUT_ICONS, COMPONENT_ICONS as CENTRAL_COMPONENT_ICONS, getLayoutIcon, getComponentIcon as getCentralComponentIcon } from '../../icons'

/**
 * SVG icons for layout presets and components (16x16 for backwards compat)
 * @deprecated Use LAYOUT_ICONS or COMPONENT_ICONS from 'studio/icons' instead
 */
export const COMPONENT_ICONS: Record<ComponentIcon, string> = {
  // Layout icons - now using central 24x24 icons
  vertical: getLayoutIcon('vbox'),
  'rows-3': getLayoutIcon('vbox'),
  horizontal: getLayoutIcon('hbox'),
  'columns-3': getLayoutIcon('hbox'),
  grid: getLayoutIcon('grid'),
  stack: getLayoutIcon('zstack'),
  layers: getLayoutIcon('absolute'),

  // Component icons - now using central 24x24 icons
  text: getCentralComponentIcon('text'),
  button: getCentralComponentIcon('button'),
  input: getCentralComponentIcon('input'),
  image: getCentralComponentIcon('image'),
  icon: getCentralComponentIcon('icon'),
  box: getCentralComponentIcon('box'),
  card: getCentralComponentIcon('box'), // Card uses box icon
  list: getCentralComponentIcon('box'),  // List uses box icon
  custom: getCentralComponentIcon('slot'),
}

/**
 * Get the SVG icon for a component type
 * @deprecated Use getLayoutIcon or getComponentIcon from 'studio/icons' instead
 */
export function getComponentIcon(type: ComponentIcon): string {
  return COMPONENT_ICONS[type] || COMPONENT_ICONS.custom
}
