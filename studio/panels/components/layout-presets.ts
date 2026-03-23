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
    defaultSize: { width: 200, height: 200 },
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
    defaultSize: { width: 200, height: 150 },
  },
  {
    id: 'layout-hbox',
    name: 'H-Box',
    category: 'Layouts',
    template: 'Box',
    properties: 'hor, gap 8',
    icon: 'columns-3',
    description: 'Horizontal box',
    defaultSize: { width: 200, height: 60 },
  },
  {
    id: 'layout-zstack',
    name: 'ZStack',
    category: 'Layouts',
    template: 'Box',
    properties: 'stacked',
    icon: 'stack',
    description: 'Layered stack (z-axis)',
    defaultSize: { width: 150, height: 150 },
  },
  {
    id: 'layout-grid',
    name: 'Grid',
    category: 'Layouts',
    template: 'Box',
    properties: 'grid 2, gap 8',
    icon: 'grid',
    description: 'Grid layout',
    defaultSize: { width: 200, height: 150 },
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
    defaultSize: { width: 400, height: 300 },
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
    defaultSize: { width: 400, height: 300 },
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
    defaultSize: { width: 200, height: 150 },
    children: [
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 1' },
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 2' },
      { template: 'Box', properties: 'hor, pad 12, bg #f5f5f5, rad 4', textContent: 'Item 3' },
    ],
  },
]

/**
 * Basic primitive components
 *
 * Includes both simple display elements and Zag-powered interactive components.
 * Zag components have slots (isSlot) and items (isItem) for complex structures.
 */
export const BASIC_COMPONENTS: ComponentItem[] = [
  // ============================================================================
  // DISPLAY ELEMENTS (no Zag needed)
  // ============================================================================
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
    id: 'basic-box',
    name: 'Box',
    category: 'Basic',
    template: 'Box',
    icon: 'box',
    description: 'Generic container',
    defaultSize: { width: 100, height: 100 },
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

  // ============================================================================
  // BUTTONS (simple, no Zag needed)
  // ============================================================================
  {
    id: 'basic-button',
    name: 'Button',
    category: 'Basic',
    template: 'Button',
    properties: 'pad 12 24, bg #3b82f6, col #fff, rad 6',
    textContent: 'Button',
    icon: 'button',
    description: 'Clickable button',
    defaultSize: { width: 100, height: 40 },
  },

  // ============================================================================
  // INPUTS (simple HTML, no Zag needed)
  // ============================================================================
  {
    id: 'basic-input',
    name: 'Input',
    category: 'Basic',
    template: 'Input',
    properties: 'placeholder "Enter text..."',
    icon: 'input',
    description: 'Text input field',
    defaultSize: { width: 200, height: 40 },
  },

  // ============================================================================
  // ZAG: SELECT COMPONENTS
  // ============================================================================
  {
    id: 'zag-select',
    name: 'Select',
    category: 'Basic',
    template: 'Select',
    properties: 'placeholder "Choose..."',
    icon: 'select',
    description: 'Dropdown select (Zag)',
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
    id: 'zag-menu',
    name: 'Menu',
    category: 'Basic',
    template: 'Menu',
    icon: 'menu',
    description: 'Dropdown menu (Zag)',
    defaultSize: { width: 120, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true, properties: 'pad 12, bg #1e1e2e, rad 6' },
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #2a2a3e, rad 8, pad 4, shadow md',
        children: [
          { template: 'Item', isItem: true, textContent: 'Action 1' },
          { template: 'Item', isItem: true, textContent: 'Action 2' },
        ],
      },
    ],
  },

  // ============================================================================
  // ZAG: FORM CONTROLS
  // ============================================================================
  {
    id: 'zag-checkbox',
    name: 'Checkbox',
    category: 'Basic',
    template: 'Checkbox',
    icon: 'checkbox',
    description: 'Checkbox (Zag)',
    defaultSize: { width: 150, height: 24 },
    children: [
      { template: 'Control', isSlot: true, properties: 'w 20, h 20, bor 1 #555, rad 4' },
      { template: 'Label', isSlot: true, textContent: 'Check me' },
    ],
  },
  {
    id: 'zag-switch',
    name: 'Switch',
    category: 'Basic',
    template: 'Switch',
    icon: 'toggle',
    description: 'Toggle switch (Zag)',
    defaultSize: { width: 50, height: 28 },
    children: [
      { template: 'Track', isSlot: true, properties: 'w 44, h 24, rad 12, bg #555' },
      { template: 'Thumb', isSlot: true, properties: 'w 20, h 20, rad 10, bg #fff' },
    ],
  },
  {
    id: 'zag-slider',
    name: 'Slider',
    category: 'Basic',
    template: 'Slider',
    icon: 'slider',
    description: 'Range slider (Zag)',
    defaultSize: { width: 200, height: 24 },
    children: [
      { template: 'Track', isSlot: true, properties: 'h 4, bg #333, rad 2' },
      { template: 'Range', isSlot: true, properties: 'bg #3b82f6' },
      { template: 'Thumb', isSlot: true, properties: 'w 16, h 16, rad 8, bg #fff' },
    ],
  },
  {
    id: 'zag-radio-group',
    name: 'Radio Group',
    category: 'Basic',
    template: 'RadioGroup',
    icon: 'radio',
    description: 'Radio buttons (Zag)',
    defaultSize: { width: 150, height: 80 },
    children: [
      { template: 'Item', isItem: true, textContent: 'Option A' },
      { template: 'Item', isItem: true, textContent: 'Option B' },
      { template: 'Item', isItem: true, textContent: 'Option C' },
    ],
  },

  // ============================================================================
  // ZAG: OVERLAYS
  // ============================================================================
  {
    id: 'zag-dialog',
    name: 'Dialog',
    category: 'Basic',
    template: 'Dialog',
    icon: 'dialog',
    description: 'Modal dialog (Zag)',
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
    id: 'zag-tooltip',
    name: 'Tooltip',
    category: 'Basic',
    template: 'Tooltip',
    icon: 'tooltip',
    description: 'Hover tooltip (Zag)',
    defaultSize: { width: 100, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', properties: 'pad 8 16, bg #374151, rad 6', textContent: 'Hover' },
      ]},
      { template: 'Content', isSlot: true, properties: 'bg #1f2937, col #fff, pad 8 12, rad 6, fs 12', children: [
        { template: 'Text', textContent: 'Tooltip text' },
      ]},
    ],
  },
  {
    id: 'zag-popover',
    name: 'Popover',
    category: 'Basic',
    template: 'Popover',
    icon: 'popover',
    description: 'Click popover (Zag)',
    defaultSize: { width: 200, height: 150 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', properties: 'pad 8 16, bg #374151, rad 6', textContent: 'Click' },
      ]},
      { template: 'Content', isSlot: true, properties: 'w 200, bg #1e1e2e, rad 8, pad 16, shadow lg' },
    ],
  },

  // ============================================================================
  // ZAG: NAVIGATION
  // ============================================================================
  {
    id: 'zag-tabs',
    name: 'Tabs',
    category: 'Basic',
    template: 'Tabs',
    icon: 'tabs',
    description: 'Tabbed navigation (Zag)',
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
    id: 'zag-accordion',
    name: 'Accordion',
    category: 'Basic',
    template: 'Accordion',
    icon: 'accordion',
    description: 'Collapsible sections (Zag)',
    defaultSize: { width: 300, height: 200 },
    children: [
      { template: 'Item', isItem: true, textContent: 'Section 1' },
      { template: 'Item', isItem: true, textContent: 'Section 2' },
      { template: 'Item', isItem: true, textContent: 'Section 3' },
    ],
  },
  {
    id: 'zag-collapsible',
    name: 'Collapsible',
    category: 'Basic',
    template: 'Collapsible',
    icon: 'collapsible',
    description: 'Expand/collapse content (Zag)',
    defaultSize: { width: 250, height: 120 },
    children: [
      { template: 'Trigger', isSlot: true, properties: 'pad 12, bg #1e1e2e, rad 6' },
      { template: 'Content', isSlot: true, properties: 'pad 12' },
    ],
  },
  {
    id: 'zag-steps',
    name: 'Steps',
    category: 'Basic',
    template: 'Steps',
    icon: 'steps',
    description: 'Wizard steps (Zag)',
    defaultSize: { width: 400, height: 60 },
    children: [
      {
        template: 'List',
        isSlot: true,
        properties: 'hor, gap 8',
        children: [
          { template: 'Step', isItem: true, textContent: 'Step 1' },
          { template: 'Step', isItem: true, textContent: 'Step 2' },
          { template: 'Step', isItem: true, textContent: 'Step 3' },
        ],
      },
    ],
  },
  {
    id: 'zag-pagination',
    name: 'Pagination',
    category: 'Basic',
    template: 'Pagination',
    properties: 'count 100, pageSize 10',
    icon: 'pagination',
    description: 'Page navigation (Zag)',
    defaultSize: { width: 300, height: 40 },
    children: [
      { template: 'PrevTrigger', isSlot: true },
      { template: 'Item', isSlot: true },
      { template: 'NextTrigger', isSlot: true },
    ],
  },
  {
    id: 'zag-tree-view',
    name: 'Tree View',
    category: 'Basic',
    template: 'TreeView',
    icon: 'treeView',
    description: 'Hierarchical tree (Zag)',
    defaultSize: { width: 250, height: 200 },
    children: [
      { template: 'Branch', isItem: true, textContent: 'Folder' },
      { template: 'Item', isItem: true, textContent: 'File' },
    ],
  },

  // ============================================================================
  // ZAG: SELECTION EXTENDED
  // ============================================================================
  {
    id: 'zag-combobox',
    name: 'Combobox',
    category: 'Basic',
    template: 'Combobox',
    properties: 'placeholder "Search..."',
    icon: 'combobox',
    description: 'Searchable dropdown (Zag)',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
      { template: 'Trigger', isSlot: true },
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #2a2a3e, rad 8, pad 4, shadow md',
        children: [
          { template: 'Item', isItem: true, textContent: 'Option A' },
          { template: 'Item', isItem: true, textContent: 'Option B' },
        ],
      },
    ],
  },
  {
    id: 'zag-listbox',
    name: 'Listbox',
    category: 'Basic',
    template: 'Listbox',
    icon: 'listbox',
    description: 'List selection (Zag)',
    defaultSize: { width: 200, height: 150 },
    children: [
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #1e1e2e, rad 6, pad 4',
        children: [
          { template: 'Item', isItem: true, textContent: 'Item 1' },
          { template: 'Item', isItem: true, textContent: 'Item 2' },
          { template: 'Item', isItem: true, textContent: 'Item 3' },
        ],
      },
    ],
  },
  {
    id: 'zag-context-menu',
    name: 'Context Menu',
    category: 'Basic',
    template: 'ContextMenu',
    icon: 'contextMenu',
    description: 'Right-click menu (Zag)',
    defaultSize: { width: 150, height: 100 },
    children: [
      { template: 'Trigger', isSlot: true },
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #2a2a3e, rad 8, pad 4, shadow md',
        children: [
          { template: 'Item', isItem: true, textContent: 'Cut' },
          { template: 'Item', isItem: true, textContent: 'Copy' },
          { template: 'Item', isItem: true, textContent: 'Paste' },
        ],
      },
    ],
  },
  {
    id: 'zag-nested-menu',
    name: 'Nested Menu',
    category: 'Basic',
    template: 'NestedMenu',
    icon: 'nestedMenu',
    description: 'Menu with submenus (Zag)',
    defaultSize: { width: 150, height: 120 },
    children: [
      { template: 'Trigger', isSlot: true },
      {
        template: 'Content',
        isSlot: true,
        properties: 'bg #2a2a3e, rad 8, pad 4, shadow md',
        children: [
          { template: 'Item', isItem: true, textContent: 'File' },
          { template: 'Item', isItem: true, textContent: 'Edit' },
        ],
      },
    ],
  },
  {
    id: 'zag-navigation-menu',
    name: 'Nav Menu',
    category: 'Basic',
    template: 'NavigationMenu',
    icon: 'navigationMenu',
    description: 'Navigation with dropdowns (Zag)',
    defaultSize: { width: 400, height: 50 },
    children: [
      {
        template: 'List',
        isSlot: true,
        properties: 'hor, gap 8',
        children: [
          { template: 'Item', isItem: true, textContent: 'Products' },
          { template: 'Item', isItem: true, textContent: 'Pricing' },
        ],
      },
    ],
  },

  // ============================================================================
  // ZAG: FORM CONTROLS EXTENDED
  // ============================================================================
  {
    id: 'zag-range-slider',
    name: 'Range Slider',
    category: 'Basic',
    template: 'RangeSlider',
    properties: 'min 0, max 100',
    icon: 'rangeSlider',
    description: 'Dual-thumb slider (Zag)',
    defaultSize: { width: 200, height: 24 },
    children: [
      { template: 'Track', isSlot: true, properties: 'h 4, bg #333, rad 2' },
      { template: 'Range', isSlot: true, properties: 'bg #3b82f6' },
      { template: 'Thumb', isSlot: true, properties: 'w 16, h 16, rad 8, bg #fff' },
    ],
  },
  {
    id: 'zag-angle-slider',
    name: 'Angle Slider',
    category: 'Basic',
    template: 'AngleSlider',
    icon: 'angleSlider',
    description: 'Circular angle input (Zag)',
    defaultSize: { width: 100, height: 100 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Thumb', isSlot: true },
    ],
  },
  {
    id: 'zag-number-input',
    name: 'Number Input',
    category: 'Basic',
    template: 'NumberInput',
    properties: 'min 0, max 100',
    icon: 'numberInput',
    description: 'Numeric stepper (Zag)',
    defaultSize: { width: 120, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
      { template: 'IncrementTrigger', isSlot: true },
      { template: 'DecrementTrigger', isSlot: true },
    ],
  },
  {
    id: 'zag-pin-input',
    name: 'Pin Input',
    category: 'Basic',
    template: 'PinInput',
    properties: 'length 6',
    icon: 'pinInput',
    description: 'Code/PIN entry (Zag)',
    defaultSize: { width: 240, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'zag-password-input',
    name: 'Password Input',
    category: 'Basic',
    template: 'PasswordInput',
    icon: 'passwordInput',
    description: 'Password with visibility toggle (Zag)',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
      { template: 'VisibilityTrigger', isSlot: true },
    ],
  },
  {
    id: 'zag-tags-input',
    name: 'Tags Input',
    category: 'Basic',
    template: 'TagsInput',
    icon: 'tagsInput',
    description: 'Tag/chip input (Zag)',
    defaultSize: { width: 250, height: 40 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Tag', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'zag-editable',
    name: 'Editable',
    category: 'Basic',
    template: 'Editable',
    properties: 'defaultValue "Click to edit"',
    icon: 'editable',
    description: 'Inline edit text (Zag)',
    defaultSize: { width: 200, height: 32 },
    children: [
      { template: 'Preview', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'zag-rating-group',
    name: 'Rating',
    category: 'Basic',
    template: 'RatingGroup',
    properties: 'count 5',
    icon: 'ratingGroup',
    description: 'Star rating (Zag)',
    defaultSize: { width: 150, height: 32 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Item', isSlot: true },
    ],
  },
  {
    id: 'zag-segmented-control',
    name: 'Segmented Control',
    category: 'Basic',
    template: 'SegmentedControl',
    icon: 'segmentedControl',
    description: 'Button group selector (Zag)',
    defaultSize: { width: 200, height: 36 },
    children: [
      { template: 'Indicator', isSlot: true },
      { template: 'Item', isItem: true, textContent: 'List' },
      { template: 'Item', isItem: true, textContent: 'Grid' },
    ],
  },
  {
    id: 'zag-toggle-group',
    name: 'Toggle Group',
    category: 'Basic',
    template: 'ToggleGroup',
    icon: 'toggleGroup',
    description: 'Multi-select toggles (Zag)',
    defaultSize: { width: 150, height: 36 },
    children: [
      { template: 'Item', isItem: true, textContent: 'B' },
      { template: 'Item', isItem: true, textContent: 'I' },
      { template: 'Item', isItem: true, textContent: 'U' },
    ],
  },

  // ============================================================================
  // ZAG: DATE & TIME
  // ============================================================================
  {
    id: 'zag-date-picker',
    name: 'Date Picker',
    category: 'Basic',
    template: 'DatePicker',
    icon: 'datePicker',
    description: 'Calendar date picker (Zag)',
    defaultSize: { width: 280, height: 300 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true },
    ],
  },
  {
    id: 'zag-date-input',
    name: 'Date Input',
    category: 'Basic',
    template: 'DateInput',
    icon: 'dateInput',
    description: 'Segmented date entry (Zag)',
    defaultSize: { width: 150, height: 40 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'zag-timer',
    name: 'Timer',
    category: 'Basic',
    template: 'Timer',
    icon: 'timer',
    description: 'Countdown/stopwatch (Zag)',
    defaultSize: { width: 150, height: 50 },
    children: [
      { template: 'Segment', isSlot: true },
      { template: 'Separator', isSlot: true },
      { template: 'ActionTrigger', isSlot: true },
    ],
  },

  // ============================================================================
  // ZAG: OVERLAYS EXTENDED
  // ============================================================================
  {
    id: 'zag-hover-card',
    name: 'Hover Card',
    category: 'Basic',
    template: 'HoverCard',
    icon: 'hoverCard',
    description: 'Hover preview card (Zag)',
    defaultSize: { width: 100, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true, properties: 'w 200, bg #1e1e2e, rad 8, pad 16, shadow lg' },
    ],
  },
  {
    id: 'zag-floating-panel',
    name: 'Floating Panel',
    category: 'Basic',
    template: 'FloatingPanel',
    properties: 'draggable, resizable',
    icon: 'floatingPanel',
    description: 'Draggable window (Zag)',
    defaultSize: { width: 300, height: 200 },
    children: [
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true },
      { template: 'Header', isSlot: true },
      { template: 'Body', isSlot: true },
    ],
  },
  {
    id: 'zag-tour',
    name: 'Tour',
    category: 'Basic',
    template: 'Tour',
    icon: 'tour',
    description: 'Guided tour (Zag)',
    defaultSize: { width: 300, height: 150 },
    children: [
      { template: 'Step', isItem: true, textContent: 'Welcome' },
      { template: 'Step', isItem: true, textContent: 'Features' },
    ],
  },
  {
    id: 'zag-presence',
    name: 'Presence',
    category: 'Basic',
    template: 'Presence',
    icon: 'presence',
    description: 'Animated presence (Zag)',
    defaultSize: { width: 100, height: 100 },
    children: [
      { template: 'Content', isSlot: true },
    ],
  },
  {
    id: 'zag-toast',
    name: 'Toast',
    category: 'Basic',
    template: 'Toast',
    icon: 'toast',
    description: 'Notifications (Zag)',
    defaultSize: { width: 300, height: 80 },
    children: [
      { template: 'Title', isSlot: true, textContent: 'Notification' },
      { template: 'Description', isSlot: true },
      { template: 'CloseTrigger', isSlot: true },
    ],
  },

  // ============================================================================
  // ZAG: MEDIA & FILES
  // ============================================================================
  {
    id: 'zag-avatar',
    name: 'Avatar',
    category: 'Basic',
    template: 'Avatar',
    properties: 'fallback "AB"',
    icon: 'avatar',
    description: 'User avatar (Zag)',
    defaultSize: { width: 48, height: 48 },
    children: [
      { template: 'Image', isSlot: true },
      { template: 'Fallback', isSlot: true },
    ],
  },
  {
    id: 'zag-file-upload',
    name: 'File Upload',
    category: 'Basic',
    template: 'FileUpload',
    properties: 'multiple',
    icon: 'fileUpload',
    description: 'File drop zone (Zag)',
    defaultSize: { width: 300, height: 150 },
    children: [
      { template: 'Dropzone', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'ItemGroup', isSlot: true },
    ],
  },
  {
    id: 'zag-image-cropper',
    name: 'Image Cropper',
    category: 'Basic',
    template: 'ImageCropper',
    icon: 'imageCropper',
    description: 'Image crop tool (Zag)',
    defaultSize: { width: 300, height: 300 },
    children: [
      { template: 'Image', isSlot: true },
      { template: 'Overlay', isSlot: true },
      { template: 'Cropper', isSlot: true },
    ],
  },
  {
    id: 'zag-carousel',
    name: 'Carousel',
    category: 'Basic',
    template: 'Carousel',
    properties: 'loop',
    icon: 'carousel',
    description: 'Image slideshow (Zag)',
    defaultSize: { width: 400, height: 250 },
    children: [
      {
        template: 'ItemGroup',
        isSlot: true,
        children: [
          { template: 'Item', isItem: true, textContent: 'Slide 1' },
          { template: 'Item', isItem: true, textContent: 'Slide 2' },
        ],
      },
      { template: 'PrevTrigger', isSlot: true },
      { template: 'NextTrigger', isSlot: true },
    ],
  },
  {
    id: 'zag-signature-pad',
    name: 'Signature Pad',
    category: 'Basic',
    template: 'SignaturePad',
    icon: 'signaturePad',
    description: 'Drawing signature (Zag)',
    defaultSize: { width: 300, height: 150 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Segment', isSlot: true },
      { template: 'ClearTrigger', isSlot: true },
    ],
  },

  // ============================================================================
  // ZAG: FEEDBACK
  // ============================================================================
  {
    id: 'zag-progress',
    name: 'Progress',
    category: 'Basic',
    template: 'Progress',
    properties: 'value 60',
    icon: 'progress',
    description: 'Progress bar (Zag)',
    defaultSize: { width: 200, height: 8 },
    children: [
      { template: 'Track', isSlot: true },
      { template: 'Range', isSlot: true },
    ],
  },
  {
    id: 'zag-circular-progress',
    name: 'Circular Progress',
    category: 'Basic',
    template: 'CircularProgress',
    properties: 'value 75',
    icon: 'circularProgress',
    description: 'Circular progress (Zag)',
    defaultSize: { width: 60, height: 60 },
    children: [
      { template: 'Circle', isSlot: true },
      { template: 'Range', isSlot: true },
      { template: 'ValueText', isSlot: true },
    ],
  },
  {
    id: 'zag-marquee',
    name: 'Marquee',
    category: 'Basic',
    template: 'Marquee',
    properties: 'speed 50',
    icon: 'marquee',
    description: 'Scrolling text (Zag)',
    defaultSize: { width: 300, height: 32 },
    children: [
      { template: 'Content', isSlot: true },
    ],
  },

  // ============================================================================
  // ZAG: UTILITY
  // ============================================================================
  {
    id: 'zag-clipboard',
    name: 'Clipboard',
    category: 'Basic',
    template: 'Clipboard',
    properties: 'value "Copy me"',
    icon: 'clipboard',
    description: 'Copy to clipboard (Zag)',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'Indicator', isSlot: true },
    ],
  },
  {
    id: 'zag-qr-code',
    name: 'QR Code',
    category: 'Basic',
    template: 'QRCode',
    properties: 'value "https://example.com"',
    icon: 'qrCode',
    description: 'QR code generator (Zag)',
    defaultSize: { width: 128, height: 128 },
    children: [
      { template: 'Frame', isSlot: true },
    ],
  },
  {
    id: 'zag-scroll-area',
    name: 'Scroll Area',
    category: 'Basic',
    template: 'ScrollArea',
    icon: 'scrollArea',
    description: 'Custom scrollbar (Zag)',
    defaultSize: { width: 200, height: 200 },
    children: [
      { template: 'Viewport', isSlot: true },
      { template: 'Scrollbar', isSlot: true },
      { template: 'Thumb', isSlot: true },
    ],
  },
  {
    id: 'zag-splitter',
    name: 'Splitter',
    category: 'Basic',
    template: 'Splitter',
    icon: 'splitter',
    description: 'Resizable panes (Zag)',
    defaultSize: { width: 400, height: 200 },
    children: [
      { template: 'Panel', isSlot: true },
      { template: 'ResizeTrigger', isSlot: true },
      { template: 'Panel', isSlot: true },
    ],
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
