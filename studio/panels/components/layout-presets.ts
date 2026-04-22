/**
 * Component Panel - Simplified structure
 *
 * Two sections:
 * 1. Layout - Container layouts (Row, Column, Grid, Stack)
 * 2. Components - All UI components (alphabetically sorted, includes presets)
 */

import type { ComponentItem } from './types'

/**
 * LAYOUT - Container layouts
 */
export const LAYOUT_SECTION: ComponentItem[] = [
  {
    id: 'layout-column',
    name: 'Column',
    category: 'Layout',
    template: 'Frame',
    properties: 'ver, h full, gap 8',
    icon: 'column',
    description: 'Vertical container, full height',
    defaultSize: { width: 100, height: 300 },
  },
  {
    id: 'layout-fill',
    name: 'Fill',
    category: 'Layout',
    template: 'Frame',
    properties: 'w full, h full',
    icon: 'box',
    description: 'Full width and height',
    defaultSize: { width: 200, height: 200 },
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
    id: 'layout-row',
    name: 'Row',
    category: 'Layout',
    template: 'Frame',
    properties: 'hor, w full, gap 8',
    icon: 'row',
    description: 'Horizontal container, full width',
    defaultSize: { width: 300, height: 50 },
  },
  {
    id: 'layout-stack',
    name: 'Stack',
    category: 'Layout',
    template: 'Frame',
    properties: 'stacked',
    icon: 'stack',
    description: 'Stacked layers (absolute positioning)',
    defaultSize: { width: 100, height: 100 },
  },
]

/**
 * COMPONENTS - All UI components (alphabetically sorted)
 */
export const COMPONENTS_SECTION: ComponentItem[] = [
  {
    id: 'comp-accordion',
    name: 'Accordion',
    category: 'Components',
    template: 'Frame',
    icon: 'chevron-down',
    description: 'Collapsible content sections',
    defaultSize: { width: 300, height: 180 },
    mirTemplate: `AccordionItem as Frame: ver, toggle()
  Header: Frame hor, spread, ver-center, pad 12 16, bg #27272a, rad 6, cursor pointer
    hover:
      bg #3f3f46
    Content: Slot
    Chevron: Icon "chevron-down", is 16, ic #888
      on:
        rot 180
  Panel: Frame pad 16, hidden
    on:
      visible
    Content: Slot

AccordionItem
  Header: Text "Section 1"
  Panel: Text "Content for section 1"`,
  },
  {
    id: 'comp-button',
    name: 'Button',
    category: 'Components',
    template: 'Button',
    textContent: 'Button',
    properties: 'pad 12 24, bg #5BA8F5, col white, rad 6',
    icon: 'button',
    description: 'Clickable button',
    defaultSize: { width: 100, height: 40 },
  },
  {
    id: 'comp-chart',
    name: 'Chart',
    category: 'Components',
    template: 'Chart',
    properties: 'type line, $sales, w 300, h 200',
    icon: 'chart',
    description: 'Chart (line, bar, pie, donut, area)',
    defaultSize: { width: 300, height: 200 },
  },
  {
    id: 'comp-checkbox',
    name: 'Checkbox',
    category: 'Components',
    template: 'Checkbox',
    icon: 'checkbox',
    description: 'Checkbox with label',
    defaultSize: { width: 150, height: 24 },
    mirTemplate: `Checkbox "Accept terms"`,
  },
  {
    id: 'comp-date-picker',
    name: 'Date Picker',
    category: 'Components',
    template: 'DatePicker',
    icon: 'datePicker',
    description: 'Calendar date picker',
    defaultSize: { width: 200, height: 44 },
    children: [
      { template: 'Control', isSlot: true },
      { template: 'Input', isSlot: true },
      { template: 'Trigger', isSlot: true },
      { template: 'Content', isSlot: true },
    ],
  },
  {
    id: 'comp-frame',
    name: 'Frame',
    category: 'Components',
    template: 'Frame',
    properties: 'w 100, h 100, bg #27272a, rad 8',
    icon: 'box',
    description: 'Container element',
    defaultSize: { width: 100, height: 100 },
  },
  {
    id: 'comp-h1',
    name: 'H1',
    category: 'Components',
    template: 'H1',
    textContent: 'Heading 1',
    properties: 'col #e4e4e7',
    icon: 'text',
    description: 'Main heading',
    defaultSize: { width: 200, height: 40 },
  },
  {
    id: 'comp-h2',
    name: 'H2',
    category: 'Components',
    template: 'H2',
    textContent: 'Heading 2',
    properties: 'col #e4e4e7',
    icon: 'text',
    description: 'Section heading',
    defaultSize: { width: 180, height: 32 },
  },
  {
    id: 'comp-icon',
    name: 'Icon',
    category: 'Components',
    template: 'Icon',
    properties: '"star", is 20, ic #a1a1aa',
    icon: 'icon',
    description: 'Icon element',
    defaultSize: { width: 24, height: 24 },
  },
  {
    id: 'comp-image',
    name: 'Image',
    category: 'Components',
    template: 'Image',
    properties: 'w 100, h 100, bg #e5e7eb',
    icon: 'image',
    description: 'Image placeholder',
    defaultSize: { width: 100, height: 100 },
  },
  {
    id: 'comp-input',
    name: 'Input',
    category: 'Components',
    template: 'Input',
    properties:
      'w 200, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter text..."',
    icon: 'input',
    description: 'Text input field',
    defaultSize: { width: 200, height: 40 },
  },
  {
    id: 'comp-radio-group',
    name: 'Radio Group',
    category: 'Components',
    template: 'RadioGroup',
    icon: 'radio',
    description: 'Radio button group',
    defaultSize: { width: 200, height: 100 },
    mirTemplate: `RadioGroup value "a"
  RadioItem "Option A", value "a"
  RadioItem "Option B", value "b"
  RadioItem "Option C", value "c"`,
  },
  {
    id: 'comp-select',
    name: 'Select',
    category: 'Components',
    template: 'Frame',
    icon: 'select',
    description: 'Dropdown select',
    defaultSize: { width: 200, height: 40 },
    mirTemplate: `Frame name Select, trigger-text, loop-focus, typeahead
  Frame name Trigger, hor, spread, pad 10 12, bg #27272a, rad 6, bor 1, boc #3f3f46, cursor pointer, ver-center, toggle()
    Text "Choose...", col #a1a1aa
    Icon "chevron-down", is 16, ic #71717a
    hover:
      bg #3f3f46
    open:
      Icon "chevron-up", is 16, ic #71717a
  Frame name Content, bg #27272a, rad 8, pad 4, shadow md, gap 2, hidden, onkeydown(arrow-down) highlightNext(Content), onkeydown(arrow-up) highlightPrev(Content), onkeydown(enter) selectHighlighted(Content), onkeydown(escape) toggle(Trigger)
    Trigger.open:
      visible
    Frame name Item, pad 8 12, rad 4, col #e4e4e7, cursor pointer, exclusive(), onclick toggle(Trigger)
      highlighted:
        bg #3f3f46
      selected:
        bg #5BA8F5
        col white
    Item "Option A"
    Item "Option B"
    Item "Option C"`,
  },
  {
    id: 'comp-slider',
    name: 'Slider',
    category: 'Components',
    template: 'Slider',
    icon: 'slider',
    description: 'Range slider',
    defaultSize: { width: 200, height: 24 },
    mirTemplate: `Slider min 0, max 100, value 50, step 1`,
  },
  {
    id: 'comp-switch',
    name: 'Switch',
    category: 'Components',
    template: 'Switch',
    icon: 'toggle',
    description: 'Toggle switch',
    defaultSize: { width: 50, height: 24 },
    mirTemplate: `Switch "Dark mode"`,
  },
  {
    id: 'comp-table',
    name: 'Table',
    category: 'Components',
    template: 'Table',
    icon: 'table',
    description: 'Data table',
    defaultSize: { width: 300, height: 150 },
    mirTemplate: `Table gap 1, bg #27272a, rad 8, pad 2
  TableHeader bg #1e1e2e, pad 12
    TableHeaderCell "Name", col #a1a1aa, w 120
    TableHeaderCell "Status", col #a1a1aa, w 80
    TableHeaderCell "Action", col #a1a1aa, w 80
  TableRow pad 12
    TableCell "Item 1", col #e4e4e7
    TableCell "Active", col #10b981
    TableCell
      Button "Edit", pad 4 8, bg #5BA8F5, col white, rad 4, fs 12
  TableRow pad 12
    TableCell "Item 2", col #e4e4e7
    TableCell "Pending", col #f59e0b
    TableCell
      Button "Edit", pad 4 8, bg #5BA8F5, col white, rad 4, fs 12`,
  },
  {
    id: 'comp-tabs',
    name: 'Tabs',
    category: 'Components',
    template: 'Tabs',
    icon: 'tabs',
    description: 'Tabbed navigation',
    defaultSize: { width: 300, height: 150 },
    mirTemplate: `Tabs defaultValue "tab1"
  Tab "Overview", value "tab1"
    Frame pad 16
      Text "Overview content", col #e4e4e7
  Tab "Details", value "tab2"
    Frame pad 16
      Text "Details content", col #e4e4e7
  Tab "Settings", value "tab3"
    Frame pad 16
      Text "Settings content", col #e4e4e7`,
  },
  {
    id: 'comp-text',
    name: 'Text',
    category: 'Components',
    template: 'Text',
    textContent: 'Text',
    properties: 'fs 14, col #e4e4e7',
    icon: 'text',
    description: 'Text element',
    defaultSize: { width: 80, height: 24 },
  },
  {
    id: 'comp-textarea',
    name: 'Textarea',
    category: 'Components',
    template: 'Textarea',
    properties:
      'w 200, h 80, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter text..."',
    icon: 'input',
    description: 'Multi-line text input',
    defaultSize: { width: 200, height: 80 },
  },
]

/**
 * Legacy exports for backwards compatibility
 */
export const LAYOUT_COMPONENTS = LAYOUT_SECTION
export const BASIC_PRIMITIVES: ComponentItem[] = []
export const FORM_COMPONENTS: ComponentItem[] = []
export const OVERLAY_COMPONENTS: ComponentItem[] = []
export const NAVIGATION_COMPONENTS: ComponentItem[] = []
export const DATA_COMPONENTS: ComponentItem[] = []
export const CHART_COMPONENTS: ComponentItem[] = []
export const MEDIA_COMPONENTS: ComponentItem[] = []
export const FEEDBACK_COMPONENTS: ComponentItem[] = []
export const BASIC_COMPONENTS: ComponentItem[] = []
