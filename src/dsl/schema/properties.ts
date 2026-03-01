/**
 * @module dsl/schema/properties
 * @description Property definitions for Mirror DSL
 *
 * Extracted from master-schema.ts for modular organization.
 */

import type {
  PropertyDefinition,
  PropertyCategory,
  ValueType,
} from './types'

import {
  STANDARD_DIRECTIONS,
  STANDARD_CORNERS,
} from './types'

export const PROPERTIES: Record<string, PropertyDefinition> = {
  // =========================================================================
  // LAYOUT PROPERTIES
  // =========================================================================
  horizontal: {
    name: 'horizontal',
    shortForms: ['hor'],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Horizontale Anordnung (row)',
    examples: ['horizontal', 'hor'],
    autocomplete: {
      syntax: 'horizontal',
      keywords: [
        'horizontal', 'nebeneinander', 'zeile', 'reihe', 'waagerecht', 'seitlich',
        'x-achse', 'row', 'inline', 'side by side', 'flex-row', 'hor', 'horz',
      ],
    },
  },

  vertical: {
    name: 'vertical',
    shortForms: ['ver', 'vert'],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Vertikale Anordnung (column) - Default',
    examples: ['vertical', 'ver'],
    autocomplete: {
      syntax: 'vertical',
      keywords: [
        'vertikal', 'untereinander', 'spalte', 'stapel', 'senkrecht', 'y-achse',
        'vertical', 'column', 'stack', 'top to bottom', 'flex-column', 'ver', 'vert',
      ],
    },
  },

  center: {
    name: 'center',
    shortForms: ['cen'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Beide Achsen zentrieren. In stacked-Layout: Kind zentriert positionieren.',
    examples: ['center', 'cen', 'Modal center  // In stacked-Parent'],
    notes: [
      'Normal: Zentriert Kinder horizontal und vertikal (justifyContent + alignItems)',
      'In stacked-Parent: Positioniert das Element selbst zentriert (justifySelf + alignSelf)',
    ],
    autocomplete: {
      syntax: 'center',
      keywords: [
        'zentrieren', 'mitte', 'mittig', 'zentriert', 'center', 'centered', 'middle',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  gap: {
    name: 'gap',
    shortForms: ['g'],
    category: 'layout' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Abstand zwischen Kindern',
    examples: ['gap 16', 'g 8'],
    autocomplete: {
      syntax: 'gap ',
      keywords: [
        'abstand', 'zwischenraum', 'lücke', 'spacing', 'gutter', 'space',
        'gap', 'row-gap', 'column-gap', 'g',
      ],
      valuePicker: 'spacing',
    },
  },

  spread: {
    name: 'spread',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Space-between Distribution',
    examples: ['spread'],
    autocomplete: {
      syntax: 'spread',
      keywords: [
        'verteilen', 'gleichmässig', 'auseinander', 'space between', 'justify',
      ],
    },
  },

  between: {
    name: 'between',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Space-between Distribution (Alias für spread)',
    examples: ['between'],
    autocomplete: {
      syntax: 'between',
      keywords: ['between', 'space-between', 'justify-between'],
    },
  },

  grow: {
    name: 'grow',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Flex-grow aktivieren',
    examples: ['grow'],
    autocomplete: {
      syntax: 'grow',
      keywords: [
        'wachsen', 'ausdehnen', 'füllen', 'expand', 'fill', 'stretch', 'flex-grow',
      ],
    },
  },

  shrink: {
    name: 'shrink',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Flex-shrink Wert',
    examples: ['shrink 0', 'shrink 1'],
    autocomplete: {
      syntax: 'shrink 0',
      keywords: ['schrumpfen', 'verkleinern', 'shrink', 'no shrink', 'flex-shrink'],
    },
  },

  'gap-col': {
    name: 'gap-col',
    shortForms: ['gap-x'],
    category: 'layout' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Horizontaler Spaltenabstand',
    examples: ['gap-col 16', 'gap-x 8'],
  },

  'gap-row': {
    name: 'gap-row',
    shortForms: ['gap-y'],
    category: 'layout' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Vertikaler Zeilenabstand',
    examples: ['gap-row 16', 'gap-y 8'],
  },

  wrap: {
    name: 'wrap',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Erlaubt Umbruch',
    examples: ['wrap'],
    autocomplete: {
      syntax: 'wrap',
      keywords: [
        'umbruch', 'umbrechen', 'mehrzeilig', 'wrap', 'multiline', 'flex-wrap',
      ],
    },
  },

  stacked: {
    name: 'stacked',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Layer-Layout: Kinder werden übereinander gestapelt wie transparente Folien. Ermöglicht intuitive Overlay-Patterns ohne Position-Hacks.',
    examples: [
      // Grundlegendes Beispiel
      'Box stacked\\n  Background\\n  Content',
      // Overlay-Pattern
      'App stacked\\n  MainContent width full, height full\\n  Overlay hidden, center',
      // Drawer-Pattern (Sidebar links)
      'App stacked, h 400\\n  MainContent ver, width full, height full\\n    Header\\n    Content\\n  Drawer hidden, stacked, width full, height full\\n    Backdrop width full, height full, bg #000, o 0.5\\n      onclick hide Drawer\\n    Sidebar left, ver, w 240, h full, bg #1a1a1a',
      // Modal-Pattern (zentriert)
      'App stacked\\n  Content\\n  Modal hidden, center\\n    Card pad 24, bg white, shadow lg',
      // Toast-Pattern (unten rechts)
      'App stacked\\n  Content\\n  Toast hidden, right, bottom\\n    Card pad 12, bg #333, col white',
    ],
    notes: [
      'Konzept: Stacked öffnet eine neue Layout-Schicht - wie transparente Folien übereinander',
      'Kinder-Positionierung: left/right/top/bottom positionieren das Kind innerhalb der Schicht',
      'left = Kind links, right = Kind rechts, top = Kind oben, bottom = Kind unten',
      'center = Kind zentriert (horizontal + vertikal)',
      'Kombinationen: "left, top" = oben links, "right, bottom" = unten rechts',
      'Verschachtelung: Innerhalb der Schicht kann wieder normales Flex-Layout verwendet werden',
      'Technisch: CSS Grid mit gridArea: "1 / 1" für alle Kinder',
      'Use Cases: Overlays, Modals, Drawers, Sidebars, Toasts, Tooltips, Backdrops',
    ],
    autocomplete: {
      syntax: 'stacked',
      keywords: [
        'stacked', 'layer', 'schicht', 'übereinander', 'overlay', 'drawer',
        'modal', 'dialog', 'popup', 'z-index', 'z-layers', 'backdrop',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  grid: {
    name: 'grid',
    shortForms: [],
    category: 'layout' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['auto'],
    description: 'Grid-Layout für Spalten',
    examples: ['grid 3', 'grid auto 250', 'grid 30% 70%'],
  },

  // =========================================================================
  // ALIGNMENT PROPERTIES
  // =========================================================================
  'horizontal-left': {
    name: 'horizontal-left',
    shortForms: ['hor-l', 'left'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Links ausrichten. In stacked-Layout: Kind links positionieren.',
    examples: ['left', 'horizontal-left', 'hor-l', 'Sidebar left, w 240  // In stacked-Parent'],
    notes: [
      'Normal: Richtet Kinder links aus (justifyContent/alignItems)',
      'In stacked-Parent: Positioniert das Element selbst links (justifySelf)',
    ],
    autocomplete: {
      syntax: 'hor-l',
      keywords: [
        'links', 'linksbündig', 'left', 'align left', 'justify-start', 'hor-l',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  'horizontal-center': {
    name: 'horizontal-center',
    shortForms: ['hor-cen', 'hor-center'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Horizontal zentrieren',
    examples: ['hor-center', 'horizontal-center'],
    autocomplete: {
      syntax: 'hor-cen',
      keywords: [
        'zentrieren', 'mitte', 'center', 'horizontal center', 'justify-center',
      ],
    },
  },

  'horizontal-right': {
    name: 'horizontal-right',
    shortForms: ['hor-r', 'right'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Rechts ausrichten. In stacked-Layout: Kind rechts positionieren.',
    examples: ['right', 'horizontal-right', 'hor-r', 'Toast right, bottom  // In stacked-Parent'],
    notes: [
      'Normal: Richtet Kinder rechts aus (justifyContent/alignItems)',
      'In stacked-Parent: Positioniert das Element selbst rechts (justifySelf)',
    ],
    autocomplete: {
      syntax: 'hor-r',
      keywords: [
        'rechts', 'rechtsbündig', 'right', 'align right', 'justify-end', 'hor-r',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  'vertical-top': {
    name: 'vertical-top',
    shortForms: ['ver-t', 'top'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Oben ausrichten. In stacked-Layout: Kind oben positionieren.',
    examples: ['top', 'vertical-top', 'ver-t', 'Banner top, width full  // In stacked-Parent'],
    notes: [
      'Normal: Richtet Kinder oben aus (alignItems)',
      'In stacked-Parent: Positioniert das Element selbst oben (alignSelf)',
    ],
    autocomplete: {
      syntax: 'ver-t',
      keywords: [
        'oben', 'obenbündig', 'top', 'align top', 'items-start', 'ver-t',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  'vertical-center': {
    name: 'vertical-center',
    shortForms: ['ver-cen', 'ver-center'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Vertikal zentrieren',
    examples: ['ver-center', 'vertical-center'],
    autocomplete: {
      syntax: 'ver-cen',
      keywords: [
        'vertikal zentrieren', 'vertical center', 'items-center', 'ver-cen',
      ],
    },
  },

  'vertical-bottom': {
    name: 'vertical-bottom',
    shortForms: ['ver-b', 'bottom'],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Unten ausrichten. In stacked-Layout: Kind unten positionieren.',
    examples: ['bottom', 'vertical-bottom', 'ver-b', 'Footer bottom, width full  // In stacked-Parent'],
    notes: [
      'Normal: Richtet Kinder unten aus (alignItems)',
      'In stacked-Parent: Positioniert das Element selbst unten (alignSelf)',
    ],
    autocomplete: {
      syntax: 'ver-b',
      keywords: [
        'unten', 'untenbündig', 'bottom', 'align bottom', 'items-end', 'ver-b',
      ],
    },
  } as PropertyDefinition & { notes: string[] },

  centered: {
    name: 'centered',
    shortForms: [],
    category: 'alignment' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Horizontale Zentrierung (margin auto)',
    examples: ['centered'],
  },

  // =========================================================================
  // SIZING PROPERTIES
  // =========================================================================
  width: {
    name: 'width',
    shortForms: ['w'],
    category: 'sizing' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['hug', 'full', 'min', 'max'],
    description: 'Breite',
    examples: ['width 300', 'width hug', 'width full', 'w 200'],
    autocomplete: {
      syntax: 'width ',
      keywords: [
        'breite', 'breit', 'width', 'horizontal size', 'wide', 'w',
      ],
    },
  },

  height: {
    name: 'height',
    shortForms: ['h'],
    category: 'sizing' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['hug', 'full', 'min', 'max'],
    description: 'Höhe',
    examples: ['height 400', 'height hug', 'height full', 'h 200'],
    autocomplete: {
      syntax: 'height ',
      keywords: [
        'höhe', 'hoch', 'height', 'vertical size', 'tall', 'h',
      ],
    },
  },

  size: {
    name: 'size',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'keyword'],
    keywords: ['hug', 'full'],
    description: 'Kombinierte Dimension (width height)',
    examples: ['size hug 32', 'size 100 200', 'size full'],
  },

  'min-width': {
    name: 'min-width',
    shortForms: ['minw'],
    category: 'sizing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'percentage'],
    description: 'Minimale Breite',
    examples: ['min-width 200', 'minw 100'],
    autocomplete: {
      syntax: 'min-width ',
      keywords: [
        'mindestbreite', 'min breite', 'minimum width', 'min width', 'minw',
      ],
    },
  },

  'max-width': {
    name: 'max-width',
    shortForms: ['maxw'],
    category: 'sizing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'percentage'],
    description: 'Maximale Breite',
    examples: ['max-width 800', 'maxw 600'],
    autocomplete: {
      syntax: 'max-width ',
      keywords: [
        'maximalbreite', 'max breite', 'maximum width', 'max width', 'maxw',
      ],
    },
  },

  'min-height': {
    name: 'min-height',
    shortForms: ['minh'],
    category: 'sizing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'percentage'],
    description: 'Minimale Höhe',
    examples: ['min-height 100', 'minh 50'],
    autocomplete: {
      syntax: 'min-height ',
      keywords: [
        'mindesthöhe', 'min höhe', 'minimum height', 'min height', 'minh',
      ],
    },
  },

  'max-height': {
    name: 'max-height',
    shortForms: ['maxh'],
    category: 'sizing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'percentage'],
    description: 'Maximale Höhe',
    examples: ['max-height 600', 'maxh 400'],
    autocomplete: {
      syntax: 'max-height ',
      keywords: [
        'maximalhöhe', 'max höhe', 'maximum height', 'max height', 'maxh',
      ],
    },
  },

  hug: {
    name: 'hug',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Fit-content (Standalone)',
    examples: ['hug'],
  },

  full: {
    name: 'full',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: '100% + flex-grow (Standalone)',
    examples: ['full'],
    autocomplete: {
      syntax: 'full',
      keywords: [
        'voll', 'vollständig', 'ausfüllen', 'full', 'full size', 'fill', 'stretch',
        '100%', 'w-full', 'h-full',
      ],
    },
  },

  'w-min': {
    name: 'w-min',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Width fit-content',
    examples: ['w-min'],
  },

  'w-max': {
    name: 'w-max',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Width 100% + flex-grow',
    examples: ['w-max'],
  },

  'h-min': {
    name: 'h-min',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Height fit-content',
    examples: ['h-min'],
  },

  'h-max': {
    name: 'h-max',
    shortForms: [],
    category: 'sizing' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Height 100% + flex-grow',
    examples: ['h-max'],
  },

  // =========================================================================
  // SPACING PROPERTIES
  // =========================================================================
  padding: {
    name: 'padding',
    shortForms: ['pad', 'p'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    directions: STANDARD_DIRECTIONS,
    cssShorthand: { minValues: 1, maxValues: 4, expansion: 'padding' },
    description: 'Innenabstand',
    examples: [
      'padding 16',
      'padding 16 12',
      'padding 16 12 8 4',
      'padding left 16',
      'padding top 8 bottom 24',
      'pad 12',
      'p 8',
    ],
    autocomplete: {
      syntax: 'padding ',
      keywords: [
        'padding', 'innenabstand', 'polster', 'inner space', 'internal spacing',
        'pad', 'p',
      ],
      valuePicker: 'spacing',
    },
  },

  'padding-top': {
    name: 'padding-top',
    shortForms: ['pt'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Padding oben',
    examples: ['padding-top 8', 'pt 16'],
    autocomplete: {
      syntax: 'padding top ',
      keywords: ['padding oben', 'padding top', 'top padding', 'pt'],
      valuePicker: 'spacing',
    },
  },

  'padding-bottom': {
    name: 'padding-bottom',
    shortForms: ['pb'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Padding unten',
    examples: ['padding-bottom 8', 'pb 16'],
    autocomplete: {
      syntax: 'padding bottom ',
      keywords: ['padding unten', 'padding bottom', 'bottom padding', 'pb'],
      valuePicker: 'spacing',
    },
  },

  'padding-left': {
    name: 'padding-left',
    shortForms: ['pl'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Padding links',
    examples: ['padding-left 8', 'pl 16'],
    autocomplete: {
      syntax: 'padding left ',
      keywords: ['padding links', 'padding left', 'left padding', 'pl'],
      valuePicker: 'spacing',
    },
  },

  'padding-right': {
    name: 'padding-right',
    shortForms: ['pr'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Padding rechts',
    examples: ['padding-right 8', 'pr 16'],
    autocomplete: {
      syntax: 'padding right ',
      keywords: ['padding rechts', 'padding right', 'right padding', 'pr'],
      valuePicker: 'spacing',
    },
  },

  margin: {
    name: 'margin',
    shortForms: ['mar', 'm'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    directions: STANDARD_DIRECTIONS,
    cssShorthand: { minValues: 1, maxValues: 4, expansion: 'padding' },
    description: 'Außenabstand',
    examples: [
      'margin 16',
      'margin top 8',
      'margin left-right 24',
      'mar 12',
      'm 8',
    ],
    autocomplete: {
      syntax: 'margin ',
      keywords: [
        'margin', 'aussenabstand', 'rand', 'outer space', 'external spacing',
        'mar', 'm',
      ],
      valuePicker: 'spacing',
    },
  },

  'margin-top': {
    name: 'margin-top',
    shortForms: ['mt'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Margin oben',
    examples: ['margin-top 8', 'mt 16'],
    autocomplete: {
      syntax: 'margin top ',
      keywords: ['margin oben', 'margin top', 'top margin', 'mt'],
      valuePicker: 'spacing',
    },
  },

  'margin-bottom': {
    name: 'margin-bottom',
    shortForms: ['mb'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Margin unten',
    examples: ['margin-bottom 8', 'mb 16'],
    autocomplete: {
      syntax: 'margin bottom ',
      keywords: ['margin unten', 'margin bottom', 'bottom margin', 'mb'],
      valuePicker: 'spacing',
    },
  },

  'margin-left': {
    name: 'margin-left',
    shortForms: ['ml'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Margin links',
    examples: ['margin-left 8', 'ml 16'],
    autocomplete: {
      syntax: 'margin left ',
      keywords: ['margin links', 'margin left', 'left margin', 'ml'],
      valuePicker: 'spacing',
    },
  },

  'margin-right': {
    name: 'margin-right',
    shortForms: ['mr'],
    category: 'spacing' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Margin rechts',
    examples: ['margin-right 8', 'mr 16'],
    autocomplete: {
      syntax: 'margin right ',
      keywords: ['margin rechts', 'margin right', 'right margin', 'mr'],
      valuePicker: 'spacing',
    },
  },

  // =========================================================================
  // COLOR PROPERTIES
  // =========================================================================
  color: {
    name: 'color',
    shortForms: ['col', 'c'],
    category: 'color' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Textfarbe',
    examples: ['color #333', 'color $primary.col', 'col #FFF'],
    autocomplete: {
      syntax: 'color ',
      keywords: [
        'farbe', 'textfarbe', 'schriftfarbe', 'color', 'text color', 'font color',
        'foreground', 'col', 'c',
      ],
      valuePicker: 'color',
    },
  },

  background: {
    name: 'background',
    shortForms: ['bg'],
    category: 'color' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token', 'keyword'],
    keywords: ['transparent'],
    description: 'Hintergrundfarbe',
    examples: ['background #3B82F6', 'background $primary.bg', 'bg #333'],
    autocomplete: {
      syntax: 'background ',
      keywords: [
        'hintergrund', 'hintergrundfarbe', 'background', 'background color',
        'fill', 'backdrop', 'surface', 'bg',
      ],
      valuePicker: 'color',
    },
  },

  'border-color': {
    name: 'border-color',
    shortForms: ['boc'],
    category: 'color' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Rahmenfarbe',
    examples: ['border-color #555', 'boc $grey-700'],
    autocomplete: {
      syntax: 'border-color ',
      keywords: [
        'rahmenfarbe', 'randfarbe', 'border color', 'stroke', 'boc',
      ],
      valuePicker: 'color',
    },
  },

  // =========================================================================
  // BORDER PROPERTIES
  // =========================================================================
  border: {
    name: 'border',
    shortForms: ['bor'],
    category: 'border' as PropertyCategory,
    valueType: 'compound' as ValueType,
    compound: {
      components: [
        { name: 'width', type: 'number', required: false, default: 1 },
        { name: 'style', type: 'enum', values: ['solid', 'dashed', 'dotted'], default: 'solid' },
        { name: 'color', type: 'color', required: false },
      ],
      order: 'any',
    },
    directions: STANDARD_DIRECTIONS,
    description: 'Rahmen',
    examples: [
      'border 1',
      'border 1 #333',
      'border 2 dashed #3B82F6',
      'border left 1',
      'border top 1 #555',
      'bor 1',
    ],
    autocomplete: {
      syntax: 'border ',
      keywords: [
        'rahmen', 'rand', 'linie', 'umrandung', 'border', 'outline', 'stroke',
        'bor',
      ],
    },
  },

  radius: {
    name: 'radius',
    shortForms: ['rad'],
    category: 'border' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    corners: STANDARD_CORNERS,
    cssShorthand: { minValues: 1, maxValues: 4, expansion: 'radius' },
    description: 'Eckenradius',
    examples: [
      'radius 8',
      'radius tl 8 br 8',
      'radius top-left 12',
      'rad 4',
    ],
    autocomplete: {
      syntax: 'radius ',
      keywords: [
        'radius', 'ecken', 'abrunden', 'rund', 'abgerundet', 'rounded', 'corner',
        'border-radius', 'rad',
      ],
      valuePicker: 'value',
    },
  },

  // =========================================================================
  // TYPOGRAPHY PROPERTIES
  // =========================================================================
  'text-size': {
    name: 'text-size',
    shortForms: ['fs', 'ts', 'font-size'],
    category: 'typography' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Schriftgröße (px)',
    examples: ['text-size 14', 'ts 12'],
    autocomplete: {
      syntax: 'size ',
      keywords: [
        'schriftgrösse', 'textgrösse', 'grösse', 'font size', 'text size',
        'fs', 'ts',
      ],
      valuePicker: 'value',
    },
  },

  'font-weight': {
    name: 'font-weight',
    shortForms: ['weight'],
    category: 'typography' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'keyword'],
    keywords: ['bold', 'normal', 'light'],
    range: { min: 100, max: 900 },
    description: 'Schriftstärke',
    examples: ['font-weight 600', 'font-weight bold', 'weight bold'],
    autocomplete: {
      syntax: 'font-weight ',
      keywords: [
        'schriftstärke', 'fett', 'gewicht', 'font weight', 'bold', 'thickness',
      ],
      valuePicker: 'weight',
    },
  },

  'line-height': {
    name: 'line-height',
    shortForms: ['line'],
    category: 'typography' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Zeilenhöhe',
    examples: ['line-height 1.5', 'line-height 24', 'line 1.5'],
    autocomplete: {
      syntax: 'line-height ',
      keywords: [
        'zeilenhöhe', 'zeilenabstand', 'line height', 'line spacing', 'leading',
      ],
      valuePicker: 'value',
    },
  },

  'font-family': {
    name: 'font-family',
    shortForms: ['font'],
    category: 'typography' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Schriftart',
    examples: ['font-family "Inter"', 'font "SF Pro"'],
    autocomplete: {
      syntax: 'font-family ',
      keywords: [
        'schriftart', 'schrift', 'font', 'font family', 'typeface',
        'inter', 'roboto', 'helvetica', 'arial',
      ],
      valuePicker: 'font',
    },
  },

  'text-align': {
    name: 'text-align',
    shortForms: ['align'],
    category: 'typography' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['left', 'center', 'right', 'justify'],
    description: 'Textausrichtung',
    examples: ['text-align center', 'align right'],
  },

  italic: {
    name: 'italic',
    shortForms: [],
    category: 'typography' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Kursiv',
    examples: ['italic'],
  },

  underline: {
    name: 'underline',
    shortForms: [],
    category: 'typography' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Unterstrichen',
    examples: ['underline'],
  },

  truncate: {
    name: 'truncate',
    shortForms: [],
    category: 'typography' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Abschneiden mit Ellipsis',
    examples: ['truncate'],
    autocomplete: {
      syntax: 'truncate',
      keywords: [
        'abschneiden', 'kürzen', 'überlauf', 'truncate', 'ellipsis', 'dots',
      ],
    },
  },

  uppercase: {
    name: 'uppercase',
    shortForms: [],
    category: 'typography' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Großbuchstaben',
    examples: ['uppercase'],
    autocomplete: {
      syntax: 'uppercase',
      keywords: [
        'grossbuchstaben', 'versalien', 'uppercase', 'caps', 'capital',
      ],
    },
  },

  lowercase: {
    name: 'lowercase',
    shortForms: [],
    category: 'typography' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Kleinbuchstaben',
    examples: ['lowercase'],
  },

  // =========================================================================
  // ICON PROPERTIES
  // =========================================================================
  'icon-size': {
    name: 'icon-size',
    shortForms: ['is'],
    category: 'icon' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Icon-Größe (px)',
    examples: ['icon-size 20', 'is 24'],
  },

  'icon-weight': {
    name: 'icon-weight',
    shortForms: ['iw'],
    category: 'icon' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    range: { min: 100, max: 700 },
    description: 'Icon-Strichstärke (100-700, Standard: 400)',
    examples: ['icon-weight 300', 'iw 600'],
  },

  'icon-color': {
    name: 'icon-color',
    shortForms: ['ic'],
    category: 'icon' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Icon-Farbe (überschreibt color)',
    examples: ['icon-color #3B82F6', 'ic $primary.col'],
  },

  fill: {
    name: 'fill',
    shortForms: [],
    category: 'icon' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Icon gefüllt (Material only)',
    examples: ['fill'],
  },

  material: {
    name: 'material',
    shortForms: [],
    category: 'icon' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Material Icons verwenden',
    examples: ['material'],
  },

  phosphor: {
    name: 'phosphor',
    shortForms: [],
    category: 'icon' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Phosphor Icons verwenden',
    examples: ['phosphor'],
  },

  // =========================================================================
  // VISUAL PROPERTIES
  // =========================================================================
  opacity: {
    name: 'opacity',
    shortForms: ['o', 'opa', 'op'],
    category: 'visual' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    range: { min: 0, max: 1 },
    description: 'Transparenz (0-1)',
    examples: ['opacity 0.5', 'o 0.8'],
    autocomplete: {
      syntax: 'opacity ',
      keywords: [
        'transparenz', 'durchsichtigkeit', 'opacity', 'transparent', 'alpha',
        'o', 'opa',
      ],
      valuePicker: 'value',
    },
  },

  shadow: {
    name: 'shadow',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'none'],
    description: 'Schatten',
    examples: ['shadow md', 'shadow lg'],
    autocomplete: {
      syntax: 'shadow ',
      keywords: [
        'schatten', 'schlagschatten', 'tiefe', 'shadow', 'drop shadow', 'elevation',
      ],
      valuePicker: 'shadow',
    },
  },

  cursor: {
    name: 'cursor',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
    description: 'Cursor-Stil',
    examples: ['cursor pointer', 'cursor grab'],
  },

  z: {
    name: 'z',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Z-Index',
    examples: ['z 10', 'z 100'],
  },

  hidden: {
    name: 'hidden',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Versteckt starten',
    examples: ['hidden'],
  },

  visible: {
    name: 'visible',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Sichtbarkeit',
    examples: ['visible'],
  },

  disabled: {
    name: 'disabled',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Deaktiviert',
    examples: ['disabled'],
  },

  rotate: {
    name: 'rotate',
    shortForms: ['rot'],
    category: 'visual' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Rotation in Grad',
    examples: ['rotate 45', 'rot 90'],
  },

  translate: {
    name: 'translate',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'compound' as ValueType,
    compound: {
      components: [
        { name: 'x', type: 'number', required: true },
        { name: 'y', type: 'number', required: false },
      ],
      order: 'strict',
    },
    description: 'X Y Verschiebung',
    examples: ['translate 10 20', 'translate 50'],
  },

  scale: {
    name: 'scale',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Skalierung (1 = normal)',
    examples: ['scale 0.98', 'scale 1.05'],
  },

  shortcut: {
    name: 'shortcut',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Keyboard Shortcut',
    examples: ['shortcut "cmd+s"', 'shortcut "ctrl+enter"'],
  },

  // =========================================================================
  // SCROLL PROPERTIES
  // =========================================================================
  scroll: {
    name: 'scroll',
    shortForms: [],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Vertikales Scrollen',
    examples: ['scroll'],
    autocomplete: {
      syntax: 'scroll',
      keywords: [
        'scrollen', 'scrollbar', 'überlauf', 'scroll', 'scrollable',
      ],
    },
  },

  'scroll-vertical': {
    name: 'scroll-vertical',
    shortForms: ['scroll-ver'],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Vertikales Scrollen',
    examples: ['scroll-vertical', 'scroll-ver'],
    autocomplete: {
      syntax: 'scroll-ver',
      keywords: [
        'vertikal scrollen', 'scroll vertical', 'vertical scroll', 'y scroll',
      ],
    },
  },

  'scroll-horizontal': {
    name: 'scroll-horizontal',
    shortForms: ['scroll-hor'],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Horizontales Scrollen',
    examples: ['scroll-horizontal', 'scroll-hor'],
    autocomplete: {
      syntax: 'scroll-hor',
      keywords: [
        'horizontal scrollen', 'scroll horizontal', 'horizontal scroll', 'x scroll',
      ],
    },
  },

  'scroll-both': {
    name: 'scroll-both',
    shortForms: [],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Beide Richtungen scrollen',
    examples: ['scroll-both'],
    autocomplete: {
      syntax: 'scroll-both',
      keywords: [
        'beide richtungen', 'scroll both', 'both directions',
      ],
    },
  },

  clip: {
    name: 'clip',
    shortForms: [],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Overflow hidden',
    examples: ['clip'],
    autocomplete: {
      syntax: 'clip',
      keywords: [
        'abschneiden', 'verstecken', 'clip', 'hidden', 'hide overflow',
      ],
    },
  },

  snap: {
    name: 'snap',
    shortForms: [],
    category: 'scroll' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Scroll Snapping aktivieren',
    examples: ['snap'],
    autocomplete: {
      syntax: 'snap',
      keywords: [
        'einrasten', 'snap', 'karussell', 'scroll snap', 'carousel',
      ],
    },
  },

  // =========================================================================
  // HOVER PROPERTIES
  // =========================================================================
  'hover-background': {
    name: 'hover-background',
    shortForms: ['hover-bg'],
    category: 'hover' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Hover Hintergrund',
    examples: ['hover-background #555', 'hover-bg $primary.hover.bg'],
    autocomplete: {
      syntax: 'hover-background ',
      keywords: [
        'hover hintergrund', 'hover background', 'background on hover', 'hover-bg',
      ],
      valuePicker: 'color',
    },
  },

  'hover-color': {
    name: 'hover-color',
    shortForms: ['hover-col'],
    category: 'hover' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Hover Textfarbe',
    examples: ['hover-color #FFF', 'hover-col $primary.col'],
    autocomplete: {
      syntax: 'hover-color ',
      keywords: [
        'hover textfarbe', 'hover text color', 'text on hover', 'hover-col',
      ],
      valuePicker: 'color',
    },
  },

  'hover-opacity': {
    name: 'hover-opacity',
    shortForms: ['hover-opa'],
    category: 'hover' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    range: { min: 0, max: 1 },
    description: 'Hover Transparenz',
    examples: ['hover-opacity 0.8', 'hover-opa 0.5'],
  },

  'hover-scale': {
    name: 'hover-scale',
    shortForms: [],
    category: 'hover' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Hover Skalierung',
    examples: ['hover-scale 1.05', 'hover-scale 1.1'],
  },

  'hover-border': {
    name: 'hover-border',
    shortForms: ['hover-bor'],
    category: 'hover' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Hover Rahmen',
    examples: ['hover-border 2', 'hover-bor 1'],
    autocomplete: {
      syntax: 'hover-border ',
      keywords: [
        'hover rahmen', 'hover border width', 'border on hover', 'hover-bor',
      ],
    },
  },

  'hover-border-color': {
    name: 'hover-border-color',
    shortForms: ['hover-boc'],
    category: 'hover' as PropertyCategory,
    valueType: 'color' as ValueType,
    accepts: ['color-hex', 'token'],
    description: 'Hover Rahmenfarbe',
    examples: ['hover-border-color #3B82F6', 'hover-boc $primary.col'],
    autocomplete: {
      syntax: 'hover-border-color ',
      keywords: [
        'hover rahmenfarbe', 'hover border color', 'hover-boc',
      ],
      valuePicker: 'color',
    },
  },

  'hover-radius': {
    name: 'hover-radius',
    shortForms: ['hover-rad'],
    category: 'hover' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number', 'token'],
    description: 'Hover Eckenradius',
    examples: ['hover-radius 12', 'hover-rad 8'],
  },

  // =========================================================================
  // FORM PROPERTIES
  // =========================================================================
  placeholder: {
    name: 'placeholder',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Platzhaltertext',
    examples: ['placeholder "Enter email..."'],
  },

  type: {
    name: 'type',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'],
    description: 'Eingabetyp',
    examples: ['type email', 'type password'],
  },

  value: {
    name: 'value',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'mixed' as ValueType,
    accepts: ['number', 'token'],
    description: 'Wert',
    examples: ['value 50', 'value $item.count'],
  },

  min: {
    name: 'min',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Minimalwert',
    examples: ['min 0', 'min 1'],
  },

  max: {
    name: 'max',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Maximalwert',
    examples: ['max 100', 'max 10'],
  },

  step: {
    name: 'step',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Schrittweite',
    examples: ['step 1', 'step 0.1'],
  },

  rows: {
    name: 'rows',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Anzahl Zeilen (Textarea)',
    examples: ['rows 4', 'rows 10'],
  },

  segments: {
    name: 'segments',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Anzahl Segmente',
    examples: ['segments 4', 'segments 6'],
  },

  length: {
    name: 'length',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'number' as ValueType,
    accepts: ['number'],
    description: 'Länge (für Segment-Input)',
    examples: ['length 4', 'length 6'],
  },

  pattern: {
    name: 'pattern',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Input-Pattern (für Segment)',
    examples: ['pattern digits', 'pattern alpha'],
  },

  mask: {
    name: 'mask',
    shortForms: [],
    category: 'form' as PropertyCategory,
    valueType: 'boolean' as ValueType,
    description: 'Maskiert (versteckt Zeichen)',
    examples: ['mask'],
  },

  // =========================================================================
  // IMAGE PROPERTIES
  // =========================================================================
  src: {
    name: 'src',
    shortForms: [],
    category: 'image' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Bild-URL',
    examples: ['src "https://example.com/image.jpg"'],
    autocomplete: {
      syntax: 'src "',
      keywords: [
        'bild', 'quelle', 'bildquelle', 'image', 'source', 'url', 'picture',
      ],
    },
  },

  alt: {
    name: 'alt',
    shortForms: [],
    category: 'image' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Alternativtext',
    examples: ['alt "Description"'],
    autocomplete: {
      syntax: 'alt "',
      keywords: [
        'alternativtext', 'beschreibung', 'alt', 'alt text', 'accessibility',
      ],
    },
  },

  fit: {
    name: 'fit',
    shortForms: [],
    category: 'image' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['cover', 'contain', 'fill', 'none', 'scale-down'],
    description: 'Bild-Anpassung',
    examples: ['fit cover', 'fit contain'],
    autocomplete: {
      syntax: 'fit ',
      keywords: [
        'einpassen', 'skalieren', 'anpassen', 'fit', 'object fit', 'cover', 'contain',
      ],
      valuePicker: 'value',
    },
  },

  // =========================================================================
  // LINK PROPERTIES
  // =========================================================================
  href: {
    name: 'href',
    shortForms: [],
    category: 'link' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Link-URL',
    examples: ['href "/about"', 'href "https://example.com"'],
  },

  target: {
    name: 'target',
    shortForms: [],
    category: 'link' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['_blank', '_self', '_parent', '_top'],
    description: 'Link-Ziel',
    examples: ['target _blank'],
  },

  // =========================================================================
  // DATA PROPERTIES
  // =========================================================================
  data: {
    name: 'data',
    shortForms: [],
    category: 'data' as PropertyCategory,
    valueType: 'string' as ValueType,
    description: 'Data Binding an Collection',
    examples: ['data Tasks', 'data Tasks where done == false'],
  },

  pointer: {
    name: 'pointer',
    shortForms: [],
    category: 'visual' as PropertyCategory,
    valueType: 'enum' as ValueType,
    enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
    description: 'Pointer-Stil (alternative zu cursor)',
    examples: ['pointer pointer', 'pointer grab'],
  },
}
