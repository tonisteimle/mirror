import type { LibraryComponent } from '../types'

export const ContextMenuComponent: LibraryComponent = {
  name: 'ContextMenu',
  category: 'overlays',
  description: 'A menu that appears on right-click, providing contextual actions.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {}
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 8,
        pad: 4,
        minw: 180
      }
    },
    {
      name: 'Item',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        gap: 8,
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '$primary'
      }
    },
    {
      name: 'Separator',
      required: false,
      multiple: true,
      defaultProps: {
        h: 1,
        bg: '$border',
        mar_u: 4,
        mar_d: 4
      }
    },
    {
      name: 'Sub',
      required: false,
      multiple: true,
      defaultProps: {}
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close'],
  definitions: `// ContextMenu
ContextMenuTrigger: pad 40 bg $surface-hover rad 8 bor 1 boc $border-hover ver cen
ContextMenuContent: ver bg $surface rad 8 pad 4 minw 180 bor 1 boc $border
ContextMenuItem: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
ContextMenuSeparator: h 1 bg $border mar 4`,
  layoutExample: `ContextMenu
  state closed
  ContextMenuTrigger
    oncontextmenu open
    "Right-click here"
  ContextMenuContent
    if open
    ContextMenuItem
      icon "copy"
      "Copy"
    ContextMenuItem
      icon "scissors"
      "Cut"
    ContextMenuItem
      icon "clipboard"
      "Paste"
    ContextMenuSeparator
    ContextMenuItem bg $error
      icon "trash-2"
      "Delete"`
}
