import type { LibraryComponent } from '../types'

export const TabsComponent: LibraryComponent = {
  name: 'Tabs',
  category: 'navigation',
  description: 'A set of layered sections of content that are displayed one at a time.',
  slots: [
    {
      name: 'Tabs',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        gap: 0,
        bor_d: 1,
        boc: '$border'
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
        col: '$text-muted',
        'hover-col': '$text'
      }
    },
    {
      name: 'TabContent',
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
Tabs: hor bor d 1 boc $border
Tab: pad 12 16 col $text-muted hover-col $text
TabActive: pad 12 16 bor d 2 boc $primary
TabContent: pad 16`,
  layoutExample: `Tabs
  state tab1
  Tabs
    TabActive
      onclick change to tab1
      "Tab 1"
    Tab
      onclick change to tab2
      "Tab 2"
    Tab
      onclick change to tab3
      "Tab 3"
  TabContent
    if tab1
    "Content for Tab 1"
  TabContent
    if tab2
    "Content for Tab 2"
  TabContent
    if tab3
    "Content for Tab 3"`
}
