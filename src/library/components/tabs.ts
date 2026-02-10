import type { LibraryComponent } from '../types'

export const TabsComponent: LibraryComponent = {
  name: 'Tabs',
  category: 'navigation',
  description: 'A set of layered sections of content that are displayed one at a time.',
  slots: [
    {
      name: 'List',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        gap: 0,
        bor_d: 1,
        boc: '#333'
      }
    },
    {
      name: 'Tab',
      required: true,
      multiple: true,
      defaultProps: {
        pad_u: 12,
        pad_d: 12,
        pad_l: 16,
        pad_r: 16,
        col: '#888',
        'hover-col': '#FFF'
      }
    },
    {
      name: 'Panel',
      required: true,
      multiple: true,
      defaultProps: {
        pad: 16
      }
    }
  ],
  defaultStates: ['tab-1', 'tab-2', 'tab-3'],
  actions: ['change'],
  definitions: `// Tabs Components
TabList: hor bor d 1 boc #333
Tab: pad 12 16 col #888 hover-col #FFF
TabActive: pad 12 16 col #FFF bor d 2 boc #3B82F6
TabPanel: pad 16`,
  layoutExample: `Tabs
  state tab1
  TabList
    TabActive
      onclick change to tab1
      "Tab 1"
    Tab
      onclick change to tab2
      "Tab 2"
    Tab
      onclick change to tab3
      "Tab 3"
  TabPanel
    if tab1
    "Content for Tab 1"
  TabPanel
    if tab2
    "Content for Tab 2"
  TabPanel
    if tab3
    "Content for Tab 3"`
}
