import type { LibraryComponent } from '../types'

export const MenubarComponent: LibraryComponent = {
  name: 'Menubar',
  category: 'navigation',
  description: 'A horizontal menu bar with dropdown menus, like traditional application menus.',
  slots: [
    {
      name: 'Menu',
      required: true,
      multiple: true,
      defaultProps: {}
    },
    {
      name: 'Trigger',
      required: true,
      multiple: true,
      defaultProps: {
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '$surface-hover'
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: true,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 6,
        pad: 4,
        minw: 180,
        bor: 1,
        boc: '$border'
      }
    },
    {
      name: 'Item',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        'align_main': 'between',
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
        mar: 4
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close'],
  definitions: `// Menubar
Menubar: hor bg $surface pad 4 rad 6 bor 1 boc $border
MenubarMenu: ver
MenubarTrigger: pad 8 12 rad 4 hover-bg $surface-hover
MenubarContent: ver bg $surface rad 6 pad 4 minw 180 bor 1 boc $border
MenubarItem: hor between ver-cen pad 8 12 rad 4 hover-bg $primary
MenubarSeparator: h 1 bg $border mar 4
MenubarShortcut: size 12 col $text-muted`,
  layoutExample: `Menubar
  MenubarMenu
    state closed
    MenubarTrigger
      onclick toggle
      "File"
    MenubarContent
      if open
      MenubarItem
        "New"
        MenubarShortcut "Ctrl+N"
      MenubarItem
        "Open"
        MenubarShortcut "Ctrl+O"
      MenubarSeparator
      MenubarItem
        "Save"
        MenubarShortcut "Ctrl+S"`
}
