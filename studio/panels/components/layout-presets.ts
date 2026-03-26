/**
 * Component Panel - Basic primitives and Zag components
 */

import type { ComponentItem } from './types'

/**
 * Basic primitives - Frame, Text, Icon, Image
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
 * Interactive components (simple HTML + Zag-powered)
 */
export const BASIC_COMPONENTS: ComponentItem[] = [
  // ============================================================================
  // SIMPLE HTML ELEMENTS
  // ============================================================================
  {
    id: 'basic-button',
    name: 'Button',
    category: 'Components',
    template: 'Button',
    textContent: 'Button',
    icon: 'button',
    description: 'Clickable button',
    defaultSize: { width: 100, height: 40 },
  },
  {
    id: 'basic-input',
    name: 'Input',
    category: 'Components',
    template: 'Input',
    properties: 'placeholder "Enter text..."',
    icon: 'input',
    description: 'Text input field',
    defaultSize: { width: 200, height: 40 },
  },

  // ============================================================================
  // ZAG: SELECT
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

  // ============================================================================
  // ZAG: FORM CONTROLS (Implemented)
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
      { template: 'RadioItem', isItem: true, textContent: 'Option A' },
      { template: 'RadioItem', isItem: true, textContent: 'Option B' },
      { template: 'RadioItem', isItem: true, textContent: 'Option C' },
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
    id: 'zag-segmented-control',
    name: 'Segmented Control',
    category: 'Basic',
    template: 'SegmentedControl',
    icon: 'segmentedControl',
    description: 'Button group selector (Zag)',
    defaultSize: { width: 200, height: 36 },
    children: [
      { template: 'Segment', isItem: true, textContent: 'List' },
      { template: 'Segment', isItem: true, textContent: 'Grid' },
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
      { template: 'Toggle', isItem: true, textContent: 'B' },
      { template: 'Toggle', isItem: true, textContent: 'I' },
      { template: 'Toggle', isItem: true, textContent: 'U' },
    ],
  },

  // ============================================================================
  // ZAG: OVERLAYS (Implemented)
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
    id: 'zag-collapsible',
    name: 'Collapsible',
    category: 'Basic',
    template: 'Collapsible',
    icon: 'collapsible',
    description: 'Expand/collapse content (Zag)',
    defaultSize: { width: 250, height: 120 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', textContent: 'Toggle' },
      ]},
      { template: 'Content', isSlot: true, children: [
        { template: 'Text', textContent: 'Collapsible content' },
      ]},
    ],
  },

  // ============================================================================
  // ZAG: NAVIGATION (Implemented)
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
      { template: 'AccordionItem', isItem: true, textContent: 'Section 1' },
      { template: 'AccordionItem', isItem: true, textContent: 'Section 2' },
      { template: 'AccordionItem', isItem: true, textContent: 'Section 3' },
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
      { template: 'Step', isItem: true, textContent: 'Step 1' },
      { template: 'Step', isItem: true, textContent: 'Step 2' },
      { template: 'Step', isItem: true, textContent: 'Step 3' },
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
      { template: 'TreeItem', isItem: true, textContent: 'File' },
    ],
  },

  // ============================================================================
  // ZAG: SELECTION (Implemented)
  // ============================================================================
  {
    id: 'zag-listbox',
    name: 'Listbox',
    category: 'Basic',
    template: 'Listbox',
    icon: 'listbox',
    description: 'List selection (Zag)',
    defaultSize: { width: 200, height: 150 },
    children: [
      { template: 'ListItem', isItem: true, textContent: 'Item 1' },
      { template: 'ListItem', isItem: true, textContent: 'Item 2' },
      { template: 'ListItem', isItem: true, textContent: 'Item 3' },
    ],
  },

  // ============================================================================
  // ZAG: DATE & TIME (Implemented)
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

  // ============================================================================
  // ZAG: MEDIA & FILES (Implemented)
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
    id: 'zag-carousel',
    name: 'Carousel',
    category: 'Basic',
    template: 'Carousel',
    properties: 'loop',
    icon: 'carousel',
    description: 'Image slideshow (Zag)',
    defaultSize: { width: 400, height: 250 },
    children: [
      { template: 'Slide', isItem: true, textContent: 'Slide 1' },
      { template: 'Slide', isItem: true, textContent: 'Slide 2' },
    ],
  },

  // ============================================================================
  // ZAG: FEEDBACK (Implemented)
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
]
