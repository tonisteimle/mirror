/**
 * @module dsl/schema/components
 * @description Primitive component definitions (Box, Text, Icon, Input, etc.)
 */

import type { ComponentDefinition } from './types'

// =============================================================================
// PRIMITIVE COMPONENTS
// =============================================================================

export const COMPONENTS: Record<string, ComponentDefinition> = {
  // ===========================================================================
  // CONTAINER COMPONENTS
  // ===========================================================================
  Box: {
    name: 'Box',
    aliases: ['Container', 'Row', 'Col', 'Stack', 'Wrapper', 'Frame'],
    allowedCategories: ['layout', 'alignment', 'sizing', 'spacing', 'color', 'border', 'visual', 'scroll', 'hover'],
    acceptsTextContent: false,
    acceptsChildren: true,
    description: 'Basis-Container für Layout',
  },

  // ===========================================================================
  // TEXT COMPONENTS
  // ===========================================================================
  Text: {
    name: 'Text',
    aliases: ['Label', 'Title', 'Heading', 'Paragraph', 'Span'],
    allowedCategories: ['typography', 'color', 'spacing', 'visual', 'hover'],
    forbiddenProperties: {
      'icon-size': 'Text verwendet "font-size", nicht "icon-size"',
      'icon-weight': 'Text verwendet "font-weight" oder "weight", nicht "icon-weight"',
      'icon-color': 'Text verwendet "color", nicht "icon-color"',
      'fill': '"fill" ist nur für Icons. Verwende "background" für Text.',
      'material': '"material" ist nur für Icons verfügbar.',
    },
    acceptsTextContent: true,
    acceptsChildren: false,
    description: 'Textanzeige',
  },

  // ===========================================================================
  // ICON COMPONENT
  // ===========================================================================
  Icon: {
    name: 'Icon',
    aliases: [],
    allowedCategories: ['icon', 'color', 'visual', 'hover'],
    allowedProperties: ['color', 'opacity', 'rotate', 'hidden', 'visible', 'cursor'],
    forbiddenProperties: {
      'size': 'Für Icons verwende "icon-size" statt "size"',
      'font-size': 'Für Icons verwende "icon-size" statt "font-size"',
      'weight': 'Für Icons verwende "icon-weight" statt "weight"',
      'font-weight': 'Für Icons verwende "icon-weight" statt "font-weight"',
    },
    acceptsTextContent: true, // Icon "name"
    acceptsChildren: false,
    description: 'Icon-Anzeige (Lucide oder Material)',
  },

  // ===========================================================================
  // FORM COMPONENTS
  // ===========================================================================
  Input: {
    name: 'Input',
    aliases: ['TextField', 'TextInput'],
    allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'hover'],
    acceptsTextContent: true, // placeholder
    acceptsChildren: false,
    description: 'Eingabefeld',
  },

  Textarea: {
    name: 'Textarea',
    aliases: ['TextArea', 'MultilineInput'],
    allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'scroll', 'hover'],
    acceptsTextContent: true, // placeholder
    acceptsChildren: false,
    description: 'Mehrzeiliges Eingabefeld',
  },

  Button: {
    name: 'Button',
    aliases: ['Btn'],
    allowedCategories: ['typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'hover', 'layout'],
    acceptsTextContent: true, // label
    acceptsChildren: true, // kann Icon + Text enthalten
    description: 'Interaktiver Button',
  },

  Segment: {
    name: 'Segment',
    aliases: ['SegmentedInput', 'CodeInput'],
    allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual'],
    acceptsTextContent: false,
    acceptsChildren: false,
    description: 'Segmentiertes Eingabefeld (z.B. für Codes)',
  },

  // ===========================================================================
  // MEDIA COMPONENTS
  // ===========================================================================
  Image: {
    name: 'Image',
    aliases: ['Img', 'Picture', 'Photo'],
    allowedCategories: ['sizing', 'border', 'visual', 'spacing'],
    allowedProperties: ['src', 'alt', 'object-fit', 'radius'],
    forbiddenProperties: {
      'color': 'Image hat keine Textfarbe. Meinst du einen Filter?',
      'font-size': 'Image hat keine Schriftgröße. Verwende width/height.',
    },
    acceptsTextContent: true, // src URL
    acceptsChildren: false,
    description: 'Bildanzeige',
  },

  // ===========================================================================
  // NAVIGATION COMPONENTS
  // ===========================================================================
  Link: {
    name: 'Link',
    aliases: ['Anchor', 'A'],
    allowedCategories: ['typography', 'color', 'spacing', 'visual', 'hover'],
    allowedProperties: ['href', 'target'],
    acceptsTextContent: true, // label
    acceptsChildren: true,
    description: 'Hyperlink',
  },
}
