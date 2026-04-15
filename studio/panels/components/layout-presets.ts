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
    properties: 'ver, gap 8',
    icon: 'column',
    description: 'Vertical container',
    defaultSize: { width: 100, height: 150 },
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
    properties: 'hor, gap 8',
    icon: 'row',
    description: 'Horizontal container',
    defaultSize: { width: 200, height: 50 },
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
    id: 'comp-area-chart',
    name: 'Area Chart',
    category: 'Components',
    template: 'Area',
    properties: '$chartData, w 300, h 200',
    icon: 'chart',
    description: 'Filled area chart',
    defaultSize: { width: 300, height: 200 },
    dataBlock: {
      name: 'chartData',
      content: `Jan: 120
Feb: 180
Mar: 240
Apr: 200`,
    },
  },
  {
    id: 'preset-avatar',
    name: 'Avatar',
    category: 'Components',
    template: 'Frame',
    icon: 'avatar',
    description: 'Circular avatar with initials',
    defaultSize: { width: 48, height: 48 },
    mirTemplate: `Frame w 48, h 48, bg #5BA8F5, rad 99, center
  Text "AB", col white, fs 16, weight 600`,
  },
  {
    id: 'preset-badge',
    name: 'Badge',
    category: 'Components',
    template: 'Frame',
    icon: 'custom',
    description: 'Status badge pill',
    defaultSize: { width: 60, height: 24 },
    mirTemplate: `Frame pad 4 8, bg #10b981, rad 99
  Text "Active", fs 11, col white, weight 500`,
  },
  {
    id: 'comp-bar-chart',
    name: 'Bar Chart',
    category: 'Components',
    template: 'Bar',
    properties: '$chartData, w 300, h 200',
    icon: 'chart',
    description: 'Bar chart for comparisons',
    defaultSize: { width: 300, height: 200 },
    dataBlock: {
      name: 'chartData',
      content: `Jan: 120
Feb: 180
Mar: 240
Apr: 200`,
    },
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
    id: 'preset-button-group',
    name: 'Button Group',
    category: 'Components',
    template: 'Frame',
    icon: 'horizontal',
    description: 'Cancel + Save button pair',
    defaultSize: { width: 200, height: 48 },
    mirTemplate: `Frame hor, gap 8
  Button "Cancel", pad 12 24, bg #3f3f46, col #e4e4e7, rad 6
  Button "Save", pad 12 24, bg #5BA8F5, col white, rad 6`,
  },
  {
    id: 'preset-card',
    name: 'Card',
    category: 'Components',
    template: 'Frame',
    icon: 'card',
    description: 'Card with title, description, action',
    defaultSize: { width: 280, height: 160 },
    mirTemplate: `Frame ver, gap 12, pad 16, bg #27272a, rad 12
  Text "Card Title", fs 16, weight 600, col #e4e4e7
  Text "Card description goes here.", fs 14, col #a1a1aa
  Frame hor, gap 8, mar 8 0 0 0
    Button "Action", pad 8 16, bg #5BA8F5, col white, rad 6`,
  },
  {
    id: 'comp-checkbox',
    name: 'Checkbox',
    category: 'Components',
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
    id: 'comp-date-picker',
    name: 'Date Picker',
    category: 'Components',
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
    id: 'comp-dialog',
    name: 'Dialog',
    category: 'Components',
    template: 'Dialog',
    icon: 'dialog',
    description: 'Modal dialog',
    defaultSize: { width: 400, height: 300 },
    children: [
      {
        template: 'Trigger',
        isSlot: true,
        children: [
          {
            template: 'Button',
            properties: 'pad 12 24, bg #5BA8F5, col #fff, rad 6',
            textContent: 'Open',
          },
        ],
      },
      { template: 'Backdrop', isSlot: true, properties: 'bg #00000080' },
      {
        template: 'Content',
        isSlot: true,
        properties: 'w 400, bg #1e1e2e, rad 12, pad 24, shadow lg',
      },
    ],
  },
  {
    id: 'comp-donut-chart',
    name: 'Donut Chart',
    category: 'Components',
    template: 'Donut',
    properties: '$chartData, w 200, h 200',
    icon: 'chart',
    description: 'Donut chart with center hole',
    defaultSize: { width: 200, height: 200 },
    dataBlock: {
      name: 'chartData',
      content: `Sales: 45
Marketing: 25
Engineering: 30`,
    },
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
    id: 'preset-form-field',
    name: 'Form Field',
    category: 'Components',
    template: 'Frame',
    icon: 'input',
    description: 'Label + Input combination',
    defaultSize: { width: 200, height: 60 },
    mirTemplate: `Frame ver, gap 4
  Text "Label", fs 12, col #a1a1aa
  Input w full, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter value..."`,
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
    id: 'comp-line-chart',
    name: 'Line Chart',
    category: 'Components',
    template: 'Line',
    properties: '$chartData, w 300, h 200',
    icon: 'chart',
    description: 'Line chart for trends',
    defaultSize: { width: 300, height: 200 },
    dataBlock: {
      name: 'chartData',
      content: `Jan: 120
Feb: 180
Mar: 240
Apr: 200`,
    },
  },
  {
    id: 'preset-list-item',
    name: 'List Item',
    category: 'Components',
    template: 'Frame',
    icon: 'list',
    description: 'Icon + text list row',
    defaultSize: { width: 200, height: 44 },
    mirTemplate: `Frame hor, gap 12, pad 10 12, bg #27272a, rad 8, ver-center
  Icon "file", is 18, ic #71717a
  Text "List item text", fs 14, col #e4e4e7`,
  },
  {
    id: 'comp-pie-chart',
    name: 'Pie Chart',
    category: 'Components',
    template: 'Pie',
    properties: '$chartData, w 200, h 200',
    icon: 'chart',
    description: 'Pie chart for proportions',
    defaultSize: { width: 200, height: 200 },
    dataBlock: {
      name: 'chartData',
      content: `Sales: 45
Marketing: 25
Engineering: 30`,
    },
  },
  {
    id: 'comp-radio-group',
    name: 'Radio Group',
    category: 'Components',
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
    id: 'preset-search-bar',
    name: 'Search Bar',
    category: 'Components',
    template: 'Frame',
    icon: 'input',
    description: 'Search icon + input',
    defaultSize: { width: 240, height: 44 },
    mirTemplate: `Frame hor, gap 8, pad 10 12, bg #1e1e2e, rad 8, bor 1, boc #3f3f46, ver-center
  Icon "search", is 18, ic #71717a
  Input bg transparent, col #e4e4e7, grow, placeholder "Search..."`,
  },
  {
    id: 'comp-select',
    name: 'Select',
    category: 'Components',
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
    id: 'comp-sidenav',
    name: 'SideNav',
    category: 'Components',
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
  {
    id: 'comp-slider',
    name: 'Slider',
    category: 'Components',
    template: 'Slider',
    icon: 'slider',
    description: 'Range slider',
    defaultSize: { width: 200, height: 24 },
    children: [
      { template: 'Track', isSlot: true, properties: 'h 4, bg #333, rad 2' },
      { template: 'Range', isSlot: true, properties: 'bg #5BA8F5' },
      { template: 'Thumb', isSlot: true, properties: 'w 16, h 16, rad 8, bg #fff' },
    ],
  },
  {
    id: 'preset-stat-card',
    name: 'Stat Card',
    category: 'Components',
    template: 'Frame',
    icon: 'card',
    description: 'Number + label stat display',
    defaultSize: { width: 140, height: 100 },
    mirTemplate: `Frame ver, gap 4, pad 16, bg #27272a, rad 12
  Text "1,234", fs 28, weight 700, col #e4e4e7
  Text "Total Users", fs 12, col #71717a`,
  },
  {
    id: 'comp-switch',
    name: 'Switch',
    category: 'Components',
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
    id: 'comp-table',
    name: 'Table',
    category: 'Components',
    template: 'Table',
    icon: 'table',
    description: 'Data table',
    defaultSize: { width: 400, height: 200 },
    children: [
      {
        template: 'Header',
        isSlot: true,
        children: [{ template: 'Row', textContent: 'Name", "Status", "Actions' }],
      },
      { template: 'Row', textContent: 'Item 1", "Active", "Edit' },
      { template: 'Row', textContent: 'Item 2", "Pending", "Edit' },
    ],
  },
  {
    id: 'comp-tabs',
    name: 'Tabs',
    category: 'Components',
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
  {
    id: 'comp-tooltip',
    name: 'Tooltip',
    category: 'Components',
    template: 'Tooltip',
    icon: 'tooltip',
    description: 'Hover tooltip',
    defaultSize: { width: 150, height: 40 },
    children: [
      {
        template: 'Trigger',
        isSlot: true,
        children: [{ template: 'Button', textContent: 'Hover me' }],
      },
      {
        template: 'Content',
        isSlot: true,
        properties: 'pad 8 12, bg #333, col #fff, rad 4, fs 12',
        children: [{ template: 'Text', textContent: 'Tooltip text' }],
      },
    ],
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
