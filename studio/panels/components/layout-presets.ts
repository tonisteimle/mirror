/**
 * Component Panel - Organized by category
 *
 * Categories (in display order):
 * 1. Layout - Shell and layout structures
 * 2. Basic - Frame, Text, Icon, Image
 * 3. Form - Input controls
 * 4. Overlay - Dialogs
 * 5. Navigation - Tabs, SideNav
 */

import type { ComponentItem } from './types'

/**
 * 1. LAYOUT - Simple layout containers
 */
export const LAYOUT_COMPONENTS: ComponentItem[] = [
  {
    id: 'layout-row',
    name: 'Row',
    category: 'Layout',
    template: 'Frame',
    properties: 'hor, gap 8',
    icon: 'row',
    description: 'Horizontal container',
    defaultSize: { width: 200, height: 50 },
  },
  {
    id: 'layout-column',
    name: 'Column',
    category: 'Layout',
    template: 'Frame',
    properties: 'ver, gap 8',
    icon: 'column',
    description: 'Vertical container',
    defaultSize: { width: 100, height: 150 },
  },
  {
    id: 'layout-stack',
    name: 'Stack',
    category: 'Layout',
    template: 'Frame',
    properties: 'stacked',
    icon: 'stack',
    description: 'Stacked layers',
    defaultSize: { width: 100, height: 100 },
  },
  {
    id: 'layout-grid',
    name: 'Grid',
    category: 'Layout',
    template: 'Frame',
    properties: 'grid 3, gap 8',
    icon: 'grid',
    description: 'Grid layout',
    defaultSize: { width: 200, height: 150 },
  },
]

/**
 * 2. BASIC - Frame, Text, Icon, Image
 */
export const BASIC_PRIMITIVES: ComponentItem[] = [
  {
    id: 'basic-frame',
    name: 'Frame',
    category: 'Basic',
    template: 'Frame',
    icon: 'box',
    description: 'Container element',
    defaultSize: { width: 100, height: 100 },
  },
  {
    id: 'basic-text',
    name: 'Text',
    category: 'Basic',
    template: 'Text',
    textContent: 'Text',
    icon: 'text',
    description: 'Text element',
    defaultSize: { width: 80, height: 24 },
  },
  {
    id: 'basic-icon',
    name: 'Icon',
    category: 'Basic',
    template: 'Icon',
    properties: 'star',
    icon: 'icon',
    description: 'Icon element',
    defaultSize: { width: 24, height: 24 },
  },
  {
    id: 'basic-image',
    name: 'Image',
    category: 'Basic',
    template: 'Image',
    properties: 'w 100, h 100, bg #e5e7eb',
    icon: 'image',
    description: 'Image placeholder',
    defaultSize: { width: 100, height: 100 },
  },
]

/**
 * 3. FORM - Input controls and form elements
 */
export const FORM_COMPONENTS: ComponentItem[] = [
  {
    id: 'form-button',
    name: 'Button',
    category: 'Form',
    template: 'Button',
    textContent: 'Button',
    icon: 'button',
    description: 'Clickable button',
    defaultSize: { width: 100, height: 40 },
  },
  {
    id: 'form-input',
    name: 'Input',
    category: 'Form',
    template: 'Input',
    properties: 'placeholder "Enter text..."',
    icon: 'input',
    description: 'Text input field',
    defaultSize: { width: 200, height: 40 },
  },
  {
    id: 'form-select',
    name: 'Select',
    category: 'Form',
    template: 'Select',
    properties: 'placeholder "Choose..."',
    icon: 'select',
    description: 'Dropdown select',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true, properties: 'pad 12, bg #1e1e2e, rad 6, bor 1 #333' },
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #2a2a3e, rad 8, pad 4, shadow md',
        children: [
          { template: 'Item', isItem: true, textContent: 'Option A' },
          { template: 'Item', isItem: true, textContent: 'Option B' },
          { template: 'Item', isItem: true, textContent: 'Option C' },
        ],
      },
    ],
  },
  {
    id: 'form-checkbox',
    name: 'Checkbox',
    category: 'Form',
    template: 'Checkbox',
    icon: 'checkbox',
    description: 'Checkbox',
    defaultSize: { width: 150, height: 24 },
    children: [
      { template: 'Control', isSlot: true, properties: 'w 20, h 20, bor 1 #555, rad 4' },
      { template: 'Label', isSlot: true, textContent: 'Check me' },
    ],
  },
  {
    id: 'form-switch',
    name: 'Switch',
    category: 'Form',
    template: 'Switch',
    icon: 'toggle',
    description: 'Toggle switch',
    defaultSize: { width: 50, height: 28 },
    children: [
      { template: 'Track', isSlot: true, properties: 'w 44, h 24, rad 12, bg #555' },
      { template: 'Thumb', isSlot: true, properties: 'w 20, h 20, rad 10, bg #fff' },
    ],
  },
  {
    id: 'form-slider',
    name: 'Slider',
    category: 'Form',
    template: 'Slider',
    icon: 'slider',
    description: 'Range slider',
    defaultSize: { width: 200, height: 24 },
    children: [
      { template: 'Track', isSlot: true, properties: 'h 4, bg #333, rad 2' },
      { template: 'Range', isSlot: true, properties: 'bg #3b82f6' },
      { template: 'Thumb', isSlot: true, properties: 'w 16, h 16, rad 8, bg #fff' },
    ],
  },
  {
    id: 'form-radio-group',
    name: 'Radio Group',
    category: 'Form',
    template: 'RadioGroup',
    icon: 'radio',
    description: 'Radio buttons',
    defaultSize: { width: 150, height: 80 },
    children: [
      { template: 'RadioItem', isItem: true, textContent: 'Option A' },
      { template: 'RadioItem', isItem: true, textContent: 'Option B' },
      { template: 'RadioItem', isItem: true, textContent: 'Option C' },
    ],
  },
  {
    id: 'form-date-picker',
    name: 'Date Picker',
    category: 'Form',
    template: 'DatePicker',
    icon: 'datePicker',
    description: 'Calendar date picker',
    defaultSize: { width: 280, height: 300 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true },
    ],
  },
  {
    id: 'form-date-input',
    name: 'Date Input',
    category: 'Form',
    template: 'DateInput',
    icon: 'datePicker',
    description: 'Segmented date input',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
]

/**
 * 4. OVERLAY - Dialog, Tooltip
 */
export const OVERLAY_COMPONENTS: ComponentItem[] = [
  {
    id: 'overlay-dialog',
    name: 'Dialog',
    category: 'Overlay',
    template: 'Dialog',
    icon: 'dialog',
    description: 'Modal dialog',
    defaultSize: { width: 400, height: 300 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', properties: 'pad 12 24, bg #3b82f6, col #fff, rad 6', textContent: 'Open' },
      ]},
      { template: 'Backdrop', isSlot: true, properties: 'bg #00000080' },
      { template: 'Content', isSlot: true, properties: 'w 400, bg #1e1e2e, rad 12, pad 24, shadow lg' },
    ],
  },
  {
    id: 'overlay-tooltip',
    name: 'Tooltip',
    category: 'Overlay',
    template: 'Tooltip',
    icon: 'tooltip',
    description: 'Hover tooltip',
    defaultSize: { width: 150, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', textContent: 'Hover me' },
      ]},
      { template: 'Content', isSlot: true, properties: 'pad 8 12, bg #333, col #fff, rad 4, fs 12', children: [
        { template: 'Text', textContent: 'Tooltip text' },
      ]},
    ],
  },
]

/**
 * 5. NAVIGATION - Tabs, SideNav
 */
export const NAVIGATION_COMPONENTS: ComponentItem[] = [
  {
    id: 'nav-tabs',
    name: 'Tabs',
    category: 'Navigation',
    template: 'Tabs',
    icon: 'tabs',
    description: 'Tabbed navigation',
    defaultSize: { width: 300, height: 200 },
    children: [
      {
        template: 'List',
        isSlot: true,
        properties: 'hor, gap 4, bg #1e1e2e, pad 4, rad 8',
        children: [
          { template: 'Tab', isItem: true, textContent: 'Tab 1' },
          { template: 'Tab', isItem: true, textContent: 'Tab 2' },
          { template: 'Tab', isItem: true, textContent: 'Tab 3' },
        ],
      },
      { template: 'Content', isSlot: true, properties: 'pad 16' },
    ],
  },
  {
    id: 'nav-sidenav',
    name: 'SideNav',
    category: 'Navigation',
    template: 'SideNav',
    icon: 'sidebar',
    description: 'Sidebar navigation',
    defaultSize: { width: 220, height: 300 },
    children: [
      { template: 'NavItem', isItem: true, textContent: 'Dashboard', properties: 'icon "home"' },
      { template: 'NavItem', isItem: true, textContent: 'Projects', properties: 'icon "folder"' },
      { template: 'NavItem', isItem: true, textContent: 'Settings', properties: 'icon "settings"' },
    ],
  },
]

/**
 * 6. MEDIA - Empty (removed)
 */
export const MEDIA_COMPONENTS: ComponentItem[] = []

/**
 * 7. FEEDBACK - Empty (removed)
 */
export const FEEDBACK_COMPONENTS: ComponentItem[] = []

/**
 * Legacy export for backwards compatibility
 */
export const BASIC_COMPONENTS: ComponentItem[] = [
  ...FORM_COMPONENTS,
  ...OVERLAY_COMPONENTS,
  ...NAVIGATION_COMPONENTS,
]
