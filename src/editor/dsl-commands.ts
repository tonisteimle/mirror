// DSL Command definitions for autocomplete and slash commands

export interface DSLCommand {
  name: string           // Display name
  syntax: string         // The actual code to insert
  description: string    // Short description
  category: string       // Category for grouping
  keywords: string[]     // Search keywords (German + English)
}

// Library component templates (functional examples with state and events)
const libraryCommands: DSLCommand[] = [
  // Overlays
  {
    name: 'Dropdown',
    syntax: `Dropdown
  state closed
  Trigger hor ver-cen gap 8 pad 8 12 bg #252525 rad 6 bor 1 boc #444 hover-bg #333
    onclick toggle
    icon "chevron-down"
    "Options"
  Content ver bg #1E1E1E rad 8 pad 4 minw 180 bor 1 boc #333
    if open
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #3B82F6
      icon "user"
      "Profile"
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #3B82F6
      icon "settings"
      "Settings"
    Separator h 1 bg #333 mar 4
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #EF4444 col #EF4444
      icon "log-out"
      "Logout"`,
    description: 'Dropdown menu with items',
    category: 'Components',
    keywords: ['dropdown', 'menu', 'menü', 'auswahl', 'select']
  },
  {
    name: 'Dialog',
    syntax: `Dialog
  state closed
  Trigger pad 12 bg #3B82F6 col #FFF rad 6 hover-bg #2563EB
    onclick open
    "Open Dialog"
  Overlay bg #00000080
    if open
    onclick close
  Content ver bg #1E1E1E rad 12 pad 24 w 400 gap 16 bor 1 boc #333
    if open
    Title size 18 weight 600 "Settings"
    Description size 14 col #888 "Configure your preferences here."
    Box hor gap 8 hor-r
      Close pad 8 12 bg #333 rad 6 hover-bg #444
        onclick close
        "Cancel"
      Close pad 8 12 bg #3B82F6 col #FFF rad 6 hover-bg #2563EB
        onclick close
        "Save"`,
    description: 'Modal dialog with overlay',
    category: 'Components',
    keywords: ['dialog', 'modal', 'popup', 'fenster', 'overlay']
  },
  {
    name: 'Tooltip',
    syntax: `Tooltip
  Trigger pad 8 bg #333 rad 6
    icon "info" size 16
  Content pad 8 12 bg #1E1E1E rad 6 bor 1 boc #333 size 12
    "Helpful information here"`,
    description: 'Tooltip on hover',
    category: 'Components',
    keywords: ['tooltip', 'hint', 'hinweis', 'info', 'hilfe']
  },
  {
    name: 'Popover',
    syntax: `Popover
  state closed
  Trigger pad 8 12 bg #333 rad 6 hover-bg #444
    onclick toggle
    "Click me"
  Content ver gap 12 pad 16 bg #1E1E1E rad 8 bor 1 boc #333 w 240
    if open
    Title size 14 weight 600 "Popover Title"
    Description size 13 col #888 "Some content goes here."
    Close pad 8 12 bg #3B82F6 col #FFF rad 6 hover-bg #2563EB
      onclick close
      "Got it"`,
    description: 'Interactive popup',
    category: 'Components',
    keywords: ['popover', 'popup', 'overlay', 'click']
  },
  {
    name: 'AlertDialog',
    syntax: `AlertDialog
  state closed
  Trigger pad 12 bg #EF4444 col #FFF rad 6 hover-bg #DC2626
    onclick open
    "Delete"
  Overlay bg #00000080
    if open
    onclick close
  Content ver bg #1E1E1E rad 12 pad 24 w 400 gap 16 bor 1 boc #333
    if open
    Title size 18 weight 600 "Are you sure?"
    Description size 14 col #888 "This action cannot be undone."
    Box hor gap 8 hor-r
      Cancel pad 8 12 bg #333 rad 6 hover-bg #444
        onclick close
        "Cancel"
      Action pad 8 12 bg #EF4444 col #FFF rad 6 hover-bg #DC2626
        onclick close
        "Delete"`,
    description: 'Confirmation dialog',
    category: 'Components',
    keywords: ['alert', 'confirm', 'bestätigung', 'warnung', 'löschen']
  },
  {
    name: 'ContextMenu',
    syntax: `ContextMenu
  Trigger pad 24 bg #252525 rad 8 bor 1 boc #333
    "Right-click here"
  Content ver bg #1E1E1E rad 8 pad 4 minw 160 bor 1 boc #333
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #333
      icon "copy"
      "Copy"
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #333
      icon "clipboard"
      "Paste"
    Separator h 1 bg #333 mar 4
    Item hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #EF4444 col #EF4444
      icon "trash"
      "Delete"`,
    description: 'Right-click menu',
    category: 'Components',
    keywords: ['context', 'rechtsklick', 'right-click', 'menu']
  },
  {
    name: 'HoverCard',
    syntax: `HoverCard
  Trigger col #3B82F6 hover-col #2563EB
    "@username"
  Content ver gap 12 pad 16 bg #1E1E1E rad 8 bor 1 boc #333 w 280
    Box hor gap 12
      Avatar w 48 h 48 rad 24 bg #333
        Fallback "UN"
      Box ver gap 2
        Title size 14 weight 600 "User Name"
        Description size 12 col #888 "@username"
    Description size 13 col #A0A0A0 "Bio or description text here"`,
    description: 'Preview card on hover',
    category: 'Components',
    keywords: ['hover', 'card', 'preview', 'vorschau', 'profil']
  },

  // Navigation
  {
    name: 'Tabs',
    syntax: `Tabs
  state tab1
  List hor bor d 1 boc #333
    Tab pad 12 16 col #FFF bor d 2 boc #3B82F6
      onclick change to tab1
      "Tab 1"
    Tab pad 12 16 col #888 hover-col #FFF
      onclick change to tab2
      "Tab 2"
    Tab pad 12 16 col #888 hover-col #FFF
      onclick change to tab3
      "Tab 3"
  Panel pad 16
    if tab1
    "Content for Tab 1"
  Panel pad 16
    if tab2
    "Content for Tab 2"
  Panel pad 16
    if tab3
    "Content for Tab 3"`,
    description: 'Tab navigation',
    category: 'Components',
    keywords: ['tabs', 'reiter', 'navigation', 'tab']
  },
  {
    name: 'Accordion',
    syntax: `Accordion ver
  Item ver bor d 1 boc #333
    state closed
    Trigger hor between ver-cen pad 16 hover-bg #252525
      onclick toggle
      "Question 1?"
      icon "chevron-down"
    Content pad 16
      if open
      "Answer to question 1"
  Item ver bor d 1 boc #333
    state closed
    Trigger hor between ver-cen pad 16 hover-bg #252525
      onclick toggle
      "Question 2?"
      icon "chevron-down"
    Content pad 16
      if open
      "Answer to question 2"`,
    description: 'Collapsible FAQ sections',
    category: 'Components',
    keywords: ['accordion', 'collapsible', 'faq', 'aufklappen', 'zuklappen']
  },
  {
    name: 'Collapsible',
    syntax: `Collapsible ver gap 8
  state closed
  Trigger hor ver-cen gap 8 pad 8 hover-bg #252525 rad 4
    onclick toggle
    icon "chevron-right"
    "Show more"
  Content pad 8 pad_l 24 col #888
    if open
    "Hidden content revealed"`,
    description: 'Simple collapsible',
    category: 'Components',
    keywords: ['collapsible', 'toggle', 'aufklappen', 'ausklappen']
  },

  // Form
  {
    name: 'Select',
    syntax: `Select
  state closed
  Trigger hor between ver-cen pad 8 12 bg #1E1E1E rad 6 bor 1 boc #333 minw 180
    onclick toggle
    "Select option..."
    icon "chevron-down"
  Content ver bg #1E1E1E rad 8 pad 4 bor 1 boc #333
    if open
    Group ver
      Label pad 8 size 11 col #666 uppercase "Category"
      Item pad 8 12 rad 4 hover-bg #3B82F6
        onclick close
        "Option 1"
      Item pad 8 12 rad 4 hover-bg #3B82F6
        onclick close
        "Option 2"`,
    description: 'Select dropdown',
    category: 'Components',
    keywords: ['select', 'dropdown', 'auswahl', 'formular', 'form']
  },
  {
    name: 'Switch',
    syntax: `Switch w 44 h 24 rad 12 bg #333 pad 2
  state off
  onclick toggle
  Thumb w 20 h 20 rad 10 bg #FFF
    if on
    mar_l 20`,
    description: 'Toggle switch',
    category: 'Components',
    keywords: ['switch', 'toggle', 'schalter', 'on', 'off', 'an', 'aus']
  },
  {
    name: 'Checkbox',
    syntax: `Box hor ver-cen gap 8
  Checkbox w 20 h 20 rad 4 bor 1 boc #444 ver cen
    state unchecked
    onclick toggle
    icon "check" size 14
      if checked
  Label "Accept terms"`,
    description: 'Checkbox with label',
    category: 'Components',
    keywords: ['checkbox', 'check', 'häkchen', 'formular']
  },
  {
    name: 'RadioGroup',
    syntax: `RadioGroup ver gap 8
  state option1
  Item hor ver-cen gap 8
    onclick change to option1
    Radio w 20 h 20 rad 10 bor 2 boc #444 ver cen
      Box w 10 h 10 rad 5 bg #3B82F6
        if option1
    "Option 1"
  Item hor ver-cen gap 8
    onclick change to option2
    Radio w 20 h 20 rad 10 bor 2 boc #444 ver cen
      Box w 10 h 10 rad 5 bg #3B82F6
        if option2
    "Option 2"`,
    description: 'Radio button group',
    category: 'Components',
    keywords: ['radio', 'button', 'auswahl', 'formular', 'group']
  },
  {
    name: 'Slider',
    syntax: `Slider hor ver-cen w 200 h 20
  Track h 4 bg #333 rad 2 grow
  Range h 4 bg #3B82F6 rad 2 w 100
  Thumb w 20 h 20 rad 10 bg #FFF bor 2 boc #3B82F6 mar_l 90`,
    description: 'Slider input',
    category: 'Components',
    keywords: ['slider', 'range', 'schieberegler', 'wert']
  },

  // Feedback
  {
    name: 'Toast',
    syntax: `Toast hor gap 12 pad 16 bg #1E1E1E rad 8 bor 1 boc #333 w 360
  Box ver gap 4 grow
    Title size 14 weight 600 "Success!"
    Description size 13 col #888 "Your changes have been saved."
  Action pad 6 8 bg #333 rad 4 hover-bg #444 size 12
    "Undo"`,
    description: 'Notification toast',
    category: 'Components',
    keywords: ['toast', 'notification', 'benachrichtigung', 'meldung', 'alert']
  },
  {
    name: 'Progress',
    syntax: `Progress h 8 bg #333 rad 4 w 200
  Indicator h 8 bg #3B82F6 rad 4 w 120`,
    description: 'Progress bar',
    category: 'Components',
    keywords: ['progress', 'loading', 'fortschritt', 'laden', 'bar']
  },
  {
    name: 'Avatar',
    syntax: `Avatar w 48 h 48 rad 24 bg #333 ver cen
  Image "avatar.jpg" 48 48 rad 24 fit cover
  Fallback size 16 weight 600 col #FFF "AB"`,
    description: 'Avatar with fallback',
    category: 'Components',
    keywords: ['avatar', 'profilbild', 'bild', 'user', 'benutzer']
  },
]

export const dslCommands: DSLCommand[] = [
  // Library Components first
  ...libraryCommands,

  // Then the regular DSL commands
  // Layout
  { name: 'hor', syntax: 'hor', description: 'Horizontal layout', category: 'Layout', keywords: ['horizontal', 'row', 'zeile', 'nebeneinander'] },
  { name: 'ver', syntax: 'ver', description: 'Vertical layout', category: 'Layout', keywords: ['vertical', 'column', 'spalte', 'untereinander'] },
  { name: 'gap', syntax: 'gap 8', description: 'Spacing between children', category: 'Layout', keywords: ['abstand', 'space', 'spacing', 'lücke'] },
  { name: 'between', syntax: 'between', description: 'Space between items', category: 'Layout', keywords: ['justify', 'spread', 'verteilen'] },
  { name: 'wrap', syntax: 'wrap', description: 'Wrap children', category: 'Layout', keywords: ['umbruch', 'umbrechen'] },
  { name: 'grow', syntax: 'grow', description: 'Flex grow', category: 'Layout', keywords: ['expand', 'fill', 'ausdehnen', 'füllen'] },

  // Alignment
  { name: 'cen', syntax: 'cen cen', description: 'Center both axes', category: 'Alignment', keywords: ['center', 'mitte', 'zentrieren', 'mittig'] },
  { name: 'hor-l', syntax: 'hor-l', description: 'Align left', category: 'Alignment', keywords: ['left', 'links'] },
  { name: 'hor-r', syntax: 'hor-r', description: 'Align right', category: 'Alignment', keywords: ['right', 'rechts'] },
  { name: 'hor-cen', syntax: 'hor-cen', description: 'Center horizontally', category: 'Alignment', keywords: ['center', 'horizontal', 'mitte'] },
  { name: 'ver-t', syntax: 'ver-t', description: 'Align top', category: 'Alignment', keywords: ['top', 'oben'] },
  { name: 'ver-b', syntax: 'ver-b', description: 'Align bottom', category: 'Alignment', keywords: ['bottom', 'unten'] },
  { name: 'ver-cen', syntax: 'ver-cen', description: 'Center vertically', category: 'Alignment', keywords: ['center', 'vertical', 'mitte'] },

  // Spacing
  { name: 'pad', syntax: 'pad 12', description: 'Padding all sides', category: 'Spacing', keywords: ['padding', 'innen', 'innenabstand'] },
  { name: 'pad sides', syntax: 'pad l r 12', description: 'Padding left & right', category: 'Spacing', keywords: ['padding', 'horizontal', 'seiten'] },
  { name: 'pad vertical', syntax: 'pad u d 12', description: 'Padding top & bottom', category: 'Spacing', keywords: ['padding', 'vertical', 'oben', 'unten'] },
  { name: 'mar', syntax: 'mar 12', description: 'Margin all sides', category: 'Spacing', keywords: ['margin', 'aussen', 'aussenabstand'] },

  // Size
  { name: 'w', syntax: 'w 100', description: 'Width in pixels', category: 'Size', keywords: ['width', 'breite'] },
  { name: 'h', syntax: 'h 100', description: 'Height in pixels', category: 'Size', keywords: ['height', 'höhe', 'hoehe'] },
  { name: 'minw', syntax: 'minw 100', description: 'Minimum width', category: 'Size', keywords: ['min-width', 'mindestbreite'] },
  { name: 'maxw', syntax: 'maxw 400', description: 'Maximum width', category: 'Size', keywords: ['max-width', 'maximalbreite'] },
  { name: 'full', syntax: 'full', description: '100% width & height', category: 'Size', keywords: ['fullscreen', 'voll', 'komplett'] },

  // Colors
  { name: 'col', syntax: 'col #333', description: 'Color (background/text)', category: 'Colors', keywords: ['color', 'farbe', 'background', 'hintergrund', 'text', 'schrift', 'textfarbe'] },
  { name: 'boc', syntax: 'boc #666', description: 'Border color', category: 'Colors', keywords: ['border-color', 'rahmenfarbe'] },

  // Border
  { name: 'bor', syntax: 'bor 1', description: 'Border width', category: 'Border', keywords: ['border', 'rahmen', 'rand'] },
  { name: 'rad', syntax: 'rad 8', description: 'Border radius', category: 'Border', keywords: ['radius', 'rounded', 'ecken', 'abrunden', 'rund'] },
  { name: 'bor sides', syntax: 'bor_d 1', description: 'Border bottom only', category: 'Border', keywords: ['border', 'unten', 'bottom'] },

  // Typography
  { name: 'size', syntax: 'size 14', description: 'Font size', category: 'Typography', keywords: ['font-size', 'schriftgrösse', 'text'] },
  { name: 'weight', syntax: 'weight 600', description: 'Font weight', category: 'Typography', keywords: ['font-weight', 'bold', 'fett', 'dick'] },
  { name: 'font', syntax: 'font "Inter"', description: 'Font family', category: 'Typography', keywords: ['font-family', 'schriftart'] },

  // Hover
  { name: 'hover-bg', syntax: 'hover-bg #444', description: 'Background on hover', category: 'Hover', keywords: ['hover', 'background', 'hintergrund'] },
  { name: 'hover-col', syntax: 'hover-col #FFF', description: 'Text color on hover', category: 'Hover', keywords: ['hover', 'color', 'text'] },

  // Events
  { name: 'onclick', syntax: 'onclick\n  ', description: 'Click event handler', category: 'Events', keywords: ['click', 'klick', 'event', 'aktion'] },
  { name: 'onclick toggle', syntax: 'onclick toggle self', description: 'Toggle own state on click', category: 'Events', keywords: ['toggle', 'umschalten', 'wechseln'] },
  { name: 'onclick page', syntax: 'onclick page PageName', description: 'Navigate to page', category: 'Events', keywords: ['navigate', 'page', 'seite', 'navigation'] },
  { name: 'onclick open', syntax: 'onclick open ComponentName', description: 'Open a component', category: 'Events', keywords: ['open', 'öffnen', 'show', 'zeigen'] },
  { name: 'onclick close', syntax: 'onclick close ComponentName', description: 'Close a component', category: 'Events', keywords: ['close', 'schliessen', 'hide', 'verstecken'] },
  { name: 'onhover', syntax: 'onhover\n  ', description: 'Hover event handler', category: 'Events', keywords: ['hover', 'mouse', 'maus'] },

  // States
  { name: 'state', syntax: 'state default\n  bg #333', description: 'Define a state', category: 'States', keywords: ['state', 'zustand', 'status'] },
  { name: 'state visible', syntax: 'state visible\n  \nstate hidden\n  ', description: 'Visible/hidden states', category: 'States', keywords: ['visible', 'hidden', 'sichtbar', 'versteckt'] },

  // Icon
  { name: 'icon', syntax: 'icon "arrow-right"', description: 'Add Lucide icon', category: 'Icon', keywords: ['icon', 'symbol', 'bild'] },

  // Component Definition
  { name: 'Component:', syntax: 'MyComponent: hor cen gap 8\n  ', description: 'Define reusable component', category: 'Definition', keywords: ['component', 'define', 'komponente', 'definieren'] },
]

// Get categories in order
export const commandCategories = [
  'Layout',
  'Alignment',
  'Spacing',
  'Size',
  'Colors',
  'Border',
  'Typography',
  'Hover',
  'Events',
  'States',
  'Icon',
  'Definition',
  'Components'  // Library components at the end
]

// Search commands by query (fuzzy search on name, description, and keywords)
export function searchCommands(query: string): DSLCommand[] {
  if (!query) return dslCommands

  const lowerQuery = query.toLowerCase()

  return dslCommands.filter(cmd => {
    const searchText = [
      cmd.name,
      cmd.description,
      cmd.category,
      ...cmd.keywords
    ].join(' ').toLowerCase()

    return searchText.includes(lowerQuery)
  })
}

// Get commands grouped by category
export function getCommandsByCategory(): Map<string, DSLCommand[]> {
  const grouped = new Map<string, DSLCommand[]>()

  for (const category of commandCategories) {
    grouped.set(category, dslCommands.filter(cmd => cmd.category === category))
  }

  return grouped
}
