/**
 * Component Panel - Organized by category
 *
 * Categories (in display order):
 * 1. Layout - Shell and layout structures
 * 2. Basic - Frame, Text, Icon, Image
 * 3. Form - Input controls
 * 4. Overlay - Dialogs, tooltips, popovers
 * 5. Navigation - Tabs, accordion, steps
 * 6. Media - Avatar, file upload, carousel
 * 7. Feedback - Progress indicators
 */

import type { ComponentItem } from './types'

/**
 * 1. LAYOUT - Simple layout containers
 * Note: Shell compound primitive was removed - these are simple Frame-based containers
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
  {
    id: 'layout-sidebar',
    name: 'Sidebar',
    category: 'Layout',
    template: 'Frame',
    properties: 'hor, w full, h full',
    icon: 'sidebar',
    description: 'Sidebar layout',
    defaultSize: { width: 300, height: 200 },
    children: [
      { template: 'Frame', properties: 'w 200, h full, bg #1e1e2e', textContent: 'Sidebar' },
      { template: 'Frame', properties: 'grow, h full', textContent: 'Content' },
    ],
  },
  {
    id: 'layout-header-footer',
    name: 'Header/Footer',
    category: 'Layout',
    template: 'Frame',
    properties: 'ver, w full, h full',
    icon: 'headerFooter',
    description: 'Header and footer layout',
    defaultSize: { width: 300, height: 200 },
    children: [
      { template: 'Frame', properties: 'w full, h 48, bg #1e1e2e', textContent: 'Header' },
      { template: 'Frame', properties: 'w full, grow', textContent: 'Content' },
      { template: 'Frame', properties: 'w full, h 48, bg #1e1e2e', textContent: 'Footer' },
    ],
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
    id: 'form-number-input',
    name: 'Number Input',
    category: 'Form',
    template: 'NumberInput',
    properties: 'min 0, max 100',
    icon: 'numberInput',
    description: 'Numeric stepper',
    defaultSize: { width: 120, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
      { template: 'IncrementTrigger', isSlot: true },
      { template: 'DecrementTrigger', isSlot: true },
    ],
  },
  {
    id: 'form-pin-input',
    name: 'Pin Input',
    category: 'Form',
    template: 'PinInput',
    properties: 'length 6',
    icon: 'pinInput',
    description: 'Code/PIN entry',
    defaultSize: { width: 240, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'form-password-input',
    name: 'Password Input',
    category: 'Form',
    template: 'PasswordInput',
    icon: 'passwordInput',
    description: 'Password with visibility toggle',
    defaultSize: { width: 200, height: 40 },
    children: [
      { template: 'Input', isSlot: true },
      { template: 'VisibilityTrigger', isSlot: true },
    ],
  },
  {
    id: 'form-tags-input',
    name: 'Tags Input',
    category: 'Form',
    template: 'TagsInput',
    icon: 'tagsInput',
    description: 'Tag/chip input',
    defaultSize: { width: 250, height: 40 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Tag', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'form-editable',
    name: 'Editable',
    category: 'Form',
    template: 'Editable',
    properties: 'defaultValue "Click to edit"',
    icon: 'editable',
    description: 'Inline edit text',
    defaultSize: { width: 200, height: 32 },
    children: [
      { template: 'Preview', isSlot: true },
      { template: 'Input', isSlot: true },
    ],
  },
  {
    id: 'form-segmented-control',
    name: 'Segmented Control',
    category: 'Form',
    template: 'SegmentedControl',
    icon: 'segmentedControl',
    description: 'Button group selector',
    defaultSize: { width: 200, height: 36 },
    children: [
      { template: 'Segment', isItem: true, textContent: 'List' },
      { template: 'Segment', isItem: true, textContent: 'Grid' },
    ],
  },
  {
    id: 'form-toggle-group',
    name: 'Toggle Group',
    category: 'Form',
    template: 'ToggleGroup',
    icon: 'toggleGroup',
    description: 'Multi-select toggles',
    defaultSize: { width: 150, height: 36 },
    children: [
      { template: 'Toggle', isItem: true, textContent: 'B' },
      { template: 'Toggle', isItem: true, textContent: 'I' },
      { template: 'Toggle', isItem: true, textContent: 'U' },
    ],
  },
  {
    id: 'form-listbox',
    name: 'Listbox',
    category: 'Form',
    template: 'Listbox',
    icon: 'listbox',
    description: 'List selection',
    defaultSize: { width: 200, height: 150 },
    children: [
      { template: 'ListItem', isItem: true, textContent: 'Item 1' },
      { template: 'ListItem', isItem: true, textContent: 'Item 2' },
      { template: 'ListItem', isItem: true, textContent: 'Item 3' },
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
]

/**
 * 4. OVERLAY - Dialogs, tooltips, popovers
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
    id: 'overlay-popover',
    name: 'Popover',
    category: 'Overlay',
    template: 'Popover',
    icon: 'popover',
    description: 'Click popover',
    defaultSize: { width: 200, height: 150 },
    children: [
      { template: 'Trigger', isSlot: true, children: [
        { template: 'Button', properties: 'pad 8 16, bg #374151, rad 6', textContent: 'Click' },
      ]},
      { template: 'Content', isSlot: true, properties: 'w 200, bg #1e1e2e, rad 8, pad 16, shadow lg' },
    ],
  },
  {
    id: 'overlay-hover-card',
    name: 'Hover Card',
    category: 'Overlay',
    template: 'HoverCard',
    icon: 'hoverCard',
    description: 'Hover preview card',
    defaultSize: { width: 100, height: 40 },
    children: [
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true, properties: 'w 200, bg #1e1e2e, rad 8, pad 16, shadow lg' },
    ],
  },
  {
    id: 'overlay-collapsible',
    name: 'Collapsible',
    category: 'Overlay',
    template: 'Collapsible',
    icon: 'collapsible',
    description: 'Expand/collapse content',
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
]

/**
 * 5. NAVIGATION - Tabs, accordion, steps
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
    id: 'nav-accordion',
    name: 'Accordion',
    category: 'Navigation',
    template: 'Accordion',
    icon: 'accordion',
    description: 'Collapsible sections',
    defaultSize: { width: 300, height: 200 },
    children: [
      { template: 'AccordionItem', isItem: true, textContent: 'Section 1' },
      { template: 'AccordionItem', isItem: true, textContent: 'Section 2' },
      { template: 'AccordionItem', isItem: true, textContent: 'Section 3' },
    ],
  },
  {
    id: 'nav-steps',
    name: 'Steps',
    category: 'Navigation',
    template: 'Steps',
    icon: 'steps',
    description: 'Wizard steps',
    defaultSize: { width: 400, height: 60 },
    children: [
      { template: 'Step', isItem: true, textContent: 'Step 1' },
      { template: 'Step', isItem: true, textContent: 'Step 2' },
      { template: 'Step', isItem: true, textContent: 'Step 3' },
    ],
  },
  {
    id: 'nav-pagination',
    name: 'Pagination',
    category: 'Navigation',
    template: 'Pagination',
    properties: 'count 100, pageSize 10',
    icon: 'pagination',
    description: 'Page navigation',
    defaultSize: { width: 300, height: 40 },
  },
  {
    id: 'nav-tree-view',
    name: 'Tree View',
    category: 'Navigation',
    template: 'TreeView',
    icon: 'treeView',
    description: 'Hierarchical tree',
    defaultSize: { width: 250, height: 200 },
    children: [
      { template: 'Branch', isItem: true, textContent: 'Folder' },
      { template: 'TreeItem', isItem: true, textContent: 'File' },
    ],
  },
]

/**
 * 6. MEDIA - Avatar, file upload, carousel
 */
export const MEDIA_COMPONENTS: ComponentItem[] = [
  {
    id: 'media-avatar',
    name: 'Avatar',
    category: 'Media',
    template: 'Avatar',
    properties: 'fallback "AB"',
    icon: 'avatar',
    description: 'User avatar',
    defaultSize: { width: 48, height: 48 },
  },
  {
    id: 'media-file-upload',
    name: 'File Upload',
    category: 'Media',
    template: 'FileUpload',
    properties: 'multiple',
    icon: 'fileUpload',
    description: 'File drop zone',
    defaultSize: { width: 300, height: 150 },
    children: [
      { template: 'Dropzone', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'ItemGroup', isSlot: true },
    ],
  },
  {
    id: 'media-carousel',
    name: 'Carousel',
    category: 'Media',
    template: 'Carousel',
    properties: 'loop',
    icon: 'carousel',
    description: 'Image slideshow',
    defaultSize: { width: 400, height: 250 },
    children: [
      { template: 'Slide', isItem: true, textContent: 'Slide 1' },
      { template: 'Slide', isItem: true, textContent: 'Slide 2' },
    ],
  },
]

/**
 * 7. FEEDBACK - Progress indicators
 */
export const FEEDBACK_COMPONENTS: ComponentItem[] = [
  {
    id: 'feedback-progress',
    name: 'Progress',
    category: 'Feedback',
    template: 'Progress',
    properties: 'value 60',
    icon: 'progress',
    description: 'Progress bar',
    defaultSize: { width: 200, height: 8 },
    children: [
      { template: 'Track', isSlot: true },
      { template: 'Range', isSlot: true },
    ],
  },
  {
    id: 'feedback-circular-progress',
    name: 'Circular Progress',
    category: 'Feedback',
    template: 'CircularProgress',
    properties: 'value 75',
    icon: 'circularProgress',
    description: 'Circular progress',
    defaultSize: { width: 60, height: 60 },
    children: [
      { template: 'Circle', isSlot: true },
      { template: 'Range', isSlot: true },
      { template: 'ValueText', isSlot: true },
    ],
  },
]

/**
 * Legacy export for backwards compatibility
 * Combines all non-layout, non-basic components
 */
export const BASIC_COMPONENTS: ComponentItem[] = [
  ...FORM_COMPONENTS,
  ...OVERLAY_COMPONENTS,
  ...NAVIGATION_COMPONENTS,
  ...MEDIA_COMPONENTS,
  ...FEEDBACK_COMPONENTS,
]
