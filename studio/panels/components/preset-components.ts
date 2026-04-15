/**
 * Preset Components - Smart Composites
 *
 * Pre-built component combinations for rapid prototyping.
 * Uses mirTemplate for multi-line Mirror code insertion.
 */

import type { ComponentItem } from './types'

export const PRESETS_SECTION: ComponentItem[] = [
  {
    id: 'preset-form-field',
    name: 'Form Field',
    category: 'Presets',
    template: 'Frame',
    icon: 'input',
    description: 'Label + Input combination',
    defaultSize: { width: 200, height: 60 },
    mirTemplate: `Frame ver, gap 4
  Text "Label", fs 12, col #a1a1aa
  Input w full, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter value..."`,
  },

  {
    id: 'preset-button-group',
    name: 'Button Group',
    category: 'Presets',
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
    category: 'Presets',
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
    id: 'preset-avatar',
    name: 'Avatar',
    category: 'Presets',
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
    category: 'Presets',
    template: 'Frame',
    icon: 'custom',
    description: 'Status badge pill',
    defaultSize: { width: 60, height: 24 },
    mirTemplate: `Frame pad 4 8, bg #10b981, rad 99
  Text "Active", fs 11, col white, weight 500`,
  },

  {
    id: 'preset-stat-card',
    name: 'Stat Card',
    category: 'Presets',
    template: 'Frame',
    icon: 'card',
    description: 'Number + label stat display',
    defaultSize: { width: 140, height: 100 },
    mirTemplate: `Frame ver, gap 4, pad 16, bg #27272a, rad 12
  Text "1,234", fs 28, weight 700, col #e4e4e7
  Text "Total Users", fs 12, col #71717a`,
  },

  {
    id: 'preset-list-item',
    name: 'List Item',
    category: 'Presets',
    template: 'Frame',
    icon: 'list',
    description: 'Icon + text list row',
    defaultSize: { width: 200, height: 44 },
    mirTemplate: `Frame hor, gap 12, pad 10 12, bg #27272a, rad 8, ver-center
  Icon "file", is 18, ic #71717a
  Text "List item text", fs 14, col #e4e4e7`,
  },

  {
    id: 'preset-search-bar',
    name: 'Search Bar',
    category: 'Presets',
    template: 'Frame',
    icon: 'input',
    description: 'Search icon + input',
    defaultSize: { width: 240, height: 44 },
    mirTemplate: `Frame hor, gap 8, pad 10 12, bg #1e1e2e, rad 8, bor 1, boc #3f3f46, ver-center
  Icon "search", is 18, ic #71717a
  Input bg transparent, col #e4e4e7, grow, placeholder "Search..."`,
  },
]
