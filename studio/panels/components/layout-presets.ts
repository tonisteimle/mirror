/**
 * Layout Presets - Built-in layout components and basic components
 */

import type { ComponentItem } from './types'

/**
 * Layout preset components for common layout patterns
 */
export const LAYOUT_PRESETS: ComponentItem[] = [
  // Absolute Positioning
  {
    id: 'layout-absolute',
    name: 'Absolute',
    category: 'Layouts',
    template: 'Box',
    properties: 'w full, h full, absolute',
    icon: 'layers',
    description: 'Free positioning container',
  },

  // Basic Stack Layouts
  {
    id: 'layout-vbox',
    name: 'V-Box',
    category: 'Layouts',
    template: 'Box',
    properties: 'ver, gap 8',
    icon: 'rows-3',
    description: 'Vertical box',
  },
  {
    id: 'layout-hbox',
    name: 'H-Box',
    category: 'Layouts',
    template: 'Box',
    properties: 'hor, gap 8',
    icon: 'columns-3',
    description: 'Horizontal box',
  },
  {
    id: 'layout-zstack',
    name: 'ZStack',
    category: 'Layouts',
    template: 'Box',
    properties: 'stacked',
    icon: 'stack',
    description: 'Layered stack (z-axis)',
  },
  {
    id: 'layout-grid',
    name: 'Grid',
    category: 'Layouts',
    template: 'Box',
    properties: 'grid 2, gap 8',
    icon: 'grid',
    description: 'Grid layout',
  },

  // App Layouts
  {
    id: 'layout-sidebar',
    name: 'Sidebar',
    category: 'Layouts',
    template: 'Box',
    properties: 'hor, w full, h full',
    icon: 'horizontal',
    description: 'App with sidebar',
    children: [
      { template: 'Box', properties: 'ver, w 240, h full, bg #1a1a23, pad 16', textContent: 'Sidebar' },
      { template: 'Box', properties: 'ver, w full, h full, pad 16', textContent: 'Content' },
    ],
  },
  {
    id: 'layout-header-footer',
    name: 'Header/Footer',
    category: 'Layouts',
    template: 'Box',
    properties: 'ver, w full, h full',
    icon: 'vertical',
    description: 'App with header and footer',
    children: [
      { template: 'Box', properties: 'hor, w full, h 60, bg #1a1a23, pad 16, spread', textContent: 'Header' },
      { template: 'Box', properties: 'ver, w full, h full, pad 16', textContent: 'Content' },
      { template: 'Box', properties: 'hor, w full, h 48, bg #1a1a23, pad 16, center', textContent: 'Footer' },
    ],
  },
  {
    id: 'layout-list',
    name: 'List',
    category: 'Layouts',
    template: 'Box',
    properties: 'ver, gap 4, w full',
    icon: 'vertical',
    description: 'Vertical list with items',
    children: [
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 1' },
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 2' },
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 3' },
    ],
  },
]

/**
 * Basic primitive components
 */
export const BASIC_COMPONENTS: ComponentItem[] = [
  {
    id: 'basic-text',
    name: 'Text',
    category: 'Basic',
    template: 'Text',
    textContent: 'Text',
    icon: 'text',
    description: 'Text element',
  },
  {
    id: 'basic-button',
    name: 'Button',
    category: 'Basic',
    template: 'Button',
    textContent: 'Button',
    icon: 'button',
    description: 'Clickable button',
  },
  {
    id: 'basic-input',
    name: 'Input',
    category: 'Basic',
    template: 'Input',
    properties: 'placeholder "Enter text..."',
    icon: 'input',
    description: 'Text input field',
  },
  {
    id: 'basic-box',
    name: 'Box',
    category: 'Basic',
    template: 'Box',
    icon: 'box',
    description: 'Generic container',
  },
  {
    id: 'basic-image',
    name: 'Image',
    category: 'Basic',
    template: 'Image',
    properties: 'w 100, h 100, bg #e5e7eb',
    icon: 'image',
    description: 'Image placeholder',
  },
  {
    id: 'basic-icon',
    name: 'Icon',
    category: 'Basic',
    template: 'Icon',
    properties: 'star',
    icon: 'icon',
    description: 'Icon element',
  },
]

/**
 * Get all built-in components
 */
export function getBuiltInComponents(): ComponentItem[] {
  return [...LAYOUT_PRESETS, ...BASIC_COMPONENTS]
}

/**
 * Get layout presets only
 */
export function getLayoutPresets(): ComponentItem[] {
  return LAYOUT_PRESETS
}

/**
 * Get basic components only
 */
export function getBasicComponents(): ComponentItem[] {
  return BASIC_COMPONENTS
}
