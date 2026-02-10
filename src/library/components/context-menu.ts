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
        bg: '#1E1E1E',
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
        'hover-bg': '#3B82F6'
      }
    },
    {
      name: 'Separator',
      required: false,
      multiple: true,
      defaultProps: {
        h: 1,
        bg: '#333',
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
ContextMenuTrigger: pad 40 bg #252525 rad 8 bor 1 boc #444 ver cen
ContextMenuContent: ver bg #1E1E1E rad 8 pad 4 minw 180 bor 1 boc #333
ContextMenuItem: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #3B82F6
ContextMenuSeparator: h 1 bg #333 mar 4`,
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
    ContextMenuItem col #EF4444
      icon "trash-2"
      "Delete"`
}
