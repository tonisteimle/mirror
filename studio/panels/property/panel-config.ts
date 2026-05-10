/**
 * Property Panel — primitive-specific configuration.
 *
 * Defines which sections a primitive's property panel renders, plus
 * compact-mode flag and the subset of color properties that apply.
 *
 * Pure data + a single getter — no DOM, no controller. Imported by
 * `view.ts` to drive section rendering.
 */

export interface PanelConfig {
  /** Section names to show, in order */
  sections: string[]
  /** Hide section headers (for simple primitives) */
  compact?: boolean
  /** Which color properties to surface (bg, col, ic, boc) */
  colorProps?: string[]
}

export const PANEL_CONFIG: Record<string, PanelConfig> = {
  // ==========================================================================
  // BASIC PRIMITIVES
  // ==========================================================================
  Icon: {
    sections: ['content', 'color', 'sizing'],
    compact: true,
    colorProps: ['ic'],
  },
  Image: {
    sections: ['content', 'sizing', 'border'],
    compact: true,
  },
  Img: {
    sections: ['content', 'sizing', 'border'],
    compact: true,
  },
  Divider: {
    sections: ['color', 'spacing'],
    compact: true,
    colorProps: ['bg'],
  },
  Spacer: {
    sections: ['sizing'],
    compact: true,
  },

  // ==========================================================================
  // TEXT ELEMENTS
  // ==========================================================================
  Text: {
    sections: ['content', 'color', 'typography', 'sizing'],
    compact: true,
    colorProps: ['col'],
  },
  Label: {
    sections: ['content', 'color', 'typography'],
    compact: true,
    colorProps: ['col'],
  },
  H1: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H2: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H3: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H4: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H5: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },
  H6: { sections: ['content', 'color', 'typography'], compact: true, colorProps: ['col'] },

  // ==========================================================================
  // INTERACTIVE ELEMENTS
  // ==========================================================================
  Button: {
    sections: ['content', 'color', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col'],
  },
  Link: {
    sections: ['content', 'color', 'typography'],
    colorProps: ['col'],
  },

  // ==========================================================================
  // FORM INPUTS
  // ==========================================================================
  Input: {
    sections: ['content', 'color', 'sizing', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  Textarea: {
    sections: ['content', 'color', 'sizing', 'spacing', 'border', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },

  // ==========================================================================
  // CONTAINERS
  // ==========================================================================
  Frame: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col'],
  },
  Box: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg'],
  },

  // Semantic containers
  Header: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Nav: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Main: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Section: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Article: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Aside: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },
  Footer: { sections: ['layout', 'sizing', 'spacing', 'color'], colorProps: ['bg'] },

  // ==========================================================================
  // DATA COMPONENTS
  // ==========================================================================
  Table: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col'],
  },
  TableHeader: { sections: ['spacing', 'color'], colorProps: ['bg', 'col'] },
  TableRow: { sections: ['spacing', 'color'], colorProps: ['bg', 'col'] },
  TableCell: { sections: ['sizing', 'spacing', 'color', 'typography'], colorProps: ['col'] },
  TableHeaderCell: { sections: ['sizing', 'spacing', 'color', 'typography'], colorProps: ['col'] },

  // ==========================================================================
  // COMPONENT PANEL: FORM CONTROLS
  // ==========================================================================
  Checkbox: {
    sections: ['content', 'sizing', 'spacing', 'color'],
    colorProps: ['bg', 'col'],
  },
  Switch: {
    sections: ['content', 'sizing', 'spacing', 'color'],
    colorProps: ['bg'],
  },
  Slider: {
    sections: ['sizing', 'spacing', 'color'],
    colorProps: ['bg'],
  },
  RadioGroup: {
    sections: ['layout', 'spacing', 'color'],
    colorProps: ['col'],
  },
  RadioItem: {
    sections: ['content', 'spacing', 'color'],
    compact: true,
    colorProps: ['col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: SELECT (Pure Mirror)
  // ==========================================================================
  Select: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  SelectTrigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  Trigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  SelectContent: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  Content: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  SelectItem: {
    sections: ['spacing', 'border', 'color', 'typography'],
    compact: true,
    colorProps: ['bg', 'col'],
  },
  Item: {
    sections: ['spacing', 'border', 'color', 'typography'],
    compact: true,
    colorProps: ['bg', 'col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: DIALOG
  // ==========================================================================
  Dialog: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  DialogTrigger: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  DialogContent: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  DialogBackdrop: {
    sections: ['color'],
    compact: true,
    colorProps: ['bg'],
  },
  Backdrop: {
    sections: ['color'],
    compact: true,
    colorProps: ['bg'],
  },

  // ==========================================================================
  // COMPONENT PANEL: TABS
  // ==========================================================================
  Tabs: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  Tab: {
    sections: ['content', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
  TabList: {
    sections: ['layout', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  TabContent: {
    sections: ['spacing', 'color'],
    colorProps: ['bg'],
  },

  // ==========================================================================
  // COMPONENT PANEL: SIDENAV
  // ==========================================================================
  SideNav: {
    sections: ['layout', 'sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'boc'],
  },
  NavItem: {
    sections: ['spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col'],
  },

  // ==========================================================================
  // COMPONENT PANEL: DATE PICKER
  // ==========================================================================
  DatePicker: {
    sections: ['sizing', 'spacing', 'border', 'color'],
    colorProps: ['bg', 'col', 'boc'],
  },
  DateInput: {
    sections: ['sizing', 'spacing', 'border', 'color', 'typography'],
    colorProps: ['bg', 'col', 'boc'],
  },
}

/** Default config for unknown primitives */
export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  sections: ['content', 'layout', 'sizing', 'spacing', 'border', 'color', 'typography'],
  colorProps: ['bg', 'col'],
}

/**
 * Get panel configuration for a primitive — falls back to
 * `DEFAULT_PANEL_CONFIG` when the primitive isn't in `PANEL_CONFIG`.
 */
export function getPanelConfig(primitive: string): PanelConfig {
  return PANEL_CONFIG[primitive] || DEFAULT_PANEL_CONFIG
}
