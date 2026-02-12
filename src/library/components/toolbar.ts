import type { LibraryComponent } from '../types'

export const ToolbarComponent: LibraryComponent = {
  name: 'Toolbar',
  category: 'navigation',
  description: 'A container for grouping buttons, toggles and other controls.',
  slots: [
    {
      name: 'Group',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        gap: 2
      }
    },
    {
      name: 'Button',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        pad: 8,
        rad: 4,
        'hover-bg': '$surface-hover'
      }
    },
    {
      name: 'Separator',
      required: false,
      multiple: true,
      defaultProps: {
        w: 1,
        h: 24,
        bg: '$border'
      }
    },
    {
      name: 'Toggle',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        pad: 8,
        rad: 4,
        'hover-bg': '$surface-hover'
      }
    }
  ],
  defaultStates: [],
  actions: [],
  definitions: `// Toolbar
Toolbar: hor ver-cen gap 4 pad 4 bg $surface rad 6 bor 1 boc $border
ToolbarGroup: hor gap 2
ToolbarButton: hor ver-cen pad 8 rad 4 hover-bg $surface-hover
ToolbarToggle: hor ver-cen pad 8 rad 4 hover-bg $surface-hover
ToolbarToggleActive: hor ver-cen pad 8 rad 4 bg $surface-hover
ToolbarSeparator: w 1 h 24 bg $border mar 0 4`,
  layoutExample: `Toolbar
  ToolbarGroup
    ToolbarButton
      icon "bold"
    ToolbarButton
      icon "italic"
    ToolbarButton
      icon "underline"
  ToolbarSeparator
  ToolbarGroup
    ToolbarButton
      icon "align-left"
    ToolbarButton
      icon "align-center"
    ToolbarButton
      icon "align-right"`
}
