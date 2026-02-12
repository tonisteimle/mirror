import type { LibraryComponent } from '../types'

export const NavigationMenuComponent: LibraryComponent = {
  name: 'NavigationMenu',
  category: 'navigation',
  description: 'A collection of links for site navigation with optional dropdown menus.',
  slots: [
    {
      name: 'List',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        gap: 4
      }
    },
    {
      name: 'Item',
      required: true,
      multiple: true,
      defaultProps: {}
    },
    {
      name: 'Trigger',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        gap: 4,
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '$surface-hover'
      }
    },
    {
      name: 'Content',
      required: false,
      multiple: true,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 8,
        pad: 16,
        minw: 400,
        bor: 1,
        boc: '$border'
      }
    },
    {
      name: 'Link',
      required: false,
      multiple: true,
      defaultProps: {
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '$surface-hover'
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close'],
  definitions: `// NavigationMenu
NavigationMenu: hor
NavigationMenuList: hor gap 4
NavigationMenuItem: ver
NavigationMenuTrigger: hor ver-cen gap 4 pad 8 12 rad 4 hover-bg $surface-hover
NavigationMenuContent: ver bg $surface rad 8 pad 16 minw 400 bor 1 boc $border gap 8
NavigationMenuLink: pad 8 12 rad 4 hover-bg $surface-hover
NavigationMenuIndicator: h 2 bg $primary rad 1`,
  layoutExample: `NavigationMenu
  NavigationMenuList
    NavigationMenuItem
      NavigationMenuLink "Home"
    NavigationMenuItem
      state closed
      NavigationMenuTrigger
        onclick toggle
        "Products"
        icon "chevron-down"
      NavigationMenuContent
        if open
        NavigationMenuLink "Product A"
        NavigationMenuLink "Product B"
        NavigationMenuLink "Product C"
    NavigationMenuItem
      NavigationMenuLink "About"`
}
