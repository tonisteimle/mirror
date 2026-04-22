/**
 * Component Templates for .mir and .com files
 *
 * .mir = Minimal, ready to use in layouts
 * .com = Full, with all slots and example styling for component definitions
 *
 * Component Definition Pattern:
 * When inserting a Zag component, we also insert its definition at the top
 * of the file so users can customize slot styling.
 */

export interface ComponentTemplates {
  mir: string
  com: string
}

/**
 * Component Definition Templates
 *
 * These are inserted at the top of the file (after tokens) when a component
 * is first used. Users can then customize the slot styling.
 *
 * Format: ComponentName:\n  SlotName: properties\n  ...
 */
export const COMPONENT_DEFINITIONS: Record<string, string> = {
  // Select - Pure Mirror Dropdown with Trigger, Content, Item
  // Note: Item onclick order matters! close() first transitions Trigger to default state,
  // then select() updates the trigger text with the selected value.
  Select: `Select: trigger-text, loop-focus, typeahead
  Trigger: hor, spread, pad 10 12, bg #27272a, rad 6, bor 1, boc #3f3f46, cursor pointer, ver-center, toggle()
    Text "Choose...", col #a1a1aa
    Icon "chevron-down", is 16, ic #71717a
    hover:
      bg #3f3f46
    open:
      Icon "chevron-up", is 16, ic #71717a
  Content: bg #27272a, rad 8, pad 4, shadow md, gap 2, hidden, onkeydown(arrow-down) highlightNext(Content), onkeydown(arrow-up) highlightPrev(Content), onkeydown(enter) selectHighlighted(Content), onkeydown(escape) toggle(Trigger)
    Trigger.open:
      visible
  Item: pad 8 12, rad 4, col #e4e4e7, cursor pointer, exclusive(), onclick close(Trigger) select()
    highlighted:
      bg #3f3f46
    selected:
      bg #5BA8F5
      col white`,

  // Checkbox - Control and Label
  Checkbox: `Checkbox:
  Control: w 18, h 18, bg #27272a, rad 4, bor 1 #3f3f46
  Label: col #e4e4e7`,

  // Switch - Track and Thumb
  Switch: `Switch:
  Track: w 44, h 24, bg #27272a, rad 12
  Thumb: w 20, h 20, bg #e4e4e7, rad 10`,

  // Slider - Track, Range, Thumb
  Slider: `Slider:
  Track: h 6, bg #27272a, rad 3
  Range: bg #5BA8F5
  Thumb: w 16, h 16, bg #e4e4e7, rad 8`,

  // RadioGroup - Item and Control
  RadioGroup: `RadioGroup:
  Item: gap 8
  ItemControl: w 18, h 18, bg #27272a, rad 9, bor 1 #3f3f46
  ItemText: col #e4e4e7`,

  // Dialog - Trigger, Backdrop, Content
  Dialog: `Dialog:
  Trigger: pad 8 16, bg #5BA8F5, col white, rad 6
  Backdrop: bg rgba(0,0,0,0.6)
  Content: bg #27272a, rad 12, pad 24, w 400, shadow lg
  Title: fs 20, weight bold, col #e4e4e7
  Description: col #a1a1aa
  CloseTrigger: bg transparent, col #a1a1aa
    hover col #e4e4e7`,

  // Tabs - List, Trigger, Content
  Tabs: `Tabs:
  List: bg #27272a, rad 8, pad 4, gap 4
  Trigger: pad 8 16, rad 6, col #a1a1aa
    hover col #e4e4e7
  Content: pad 16`,

  // SideNav - Navigation sidebar
  SideNav: `SideNav:
  Root: w 220, bg #18181b, pad 16, gap 8
  NavItem: pad 10 12, rad 6, col #a1a1aa
    hover bg #27272a, col #e4e4e7
    selected bg #27272a, col #e4e4e7`,

  // DatePicker - Calendar
  DatePicker: `DatePicker:
  Control: bg #27272a, rad 6, pad 8
  Input: col #e4e4e7, bg transparent
  Trigger: col #a1a1aa
  Content: bg #27272a, rad 8, pad 12, shadow lg`,

  // DateInput - Segmented date
  DateInput: `DateInput:
  Control: bg #27272a, rad 6, pad 8
  Input: col #e4e4e7, bg transparent`,
}

/**
 * Get the definition for a component
 */
export function getComponentDefinition(componentName: string): string | undefined {
  return COMPONENT_DEFINITIONS[componentName]
}

/**
 * Check if a component definition exists in the code
 */
export function hasComponentDefinition(code: string, componentName: string): boolean {
  // Match "ComponentName:" at the start of a line (with optional whitespace before)
  const pattern = new RegExp(`^\\s*${componentName}\\s*:`, 'm')
  return pattern.test(code)
}

/**
 * Find the best position to insert a component definition
 * Returns the line number after which to insert (0 = at start)
 *
 * Strategy:
 * 1. After the last token definition (name.prop: value or legacy $name.prop: value)
 * 2. After the last existing component definition (Name:)
 * 3. At the start of the file
 */
export function findDefinitionInsertPosition(code: string): number {
  const lines = code.split('\n')
  let lastTokenLine = 0
  let lastDefinitionLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Token definition: starts with $ or is new syntax name.suffix:
    if (line.startsWith('$') || /^[a-z][a-zA-Z0-9_-]*\.[a-z]+\s*:/.test(line)) {
      lastTokenLine = i + 1 // 1-indexed line number
    }
    // Component definition: starts with CapitalLetter and ends with :
    // But NOT a slot (which would be indented)
    if (
      /^[A-Z][a-zA-Z0-9]*\s*:/.test(line) &&
      !lines[i].startsWith(' ') &&
      !lines[i].startsWith('\t')
    ) {
      // Also check the NEXT line to see if this definition has children
      // If the next non-empty line is indented, count those lines too
      let endLine = i + 1
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j]
        if (!nextLine.trim()) continue // Skip empty lines
        if (nextLine.startsWith(' ') || nextLine.startsWith('\t')) {
          endLine = j + 1 // This line is part of the definition
        } else {
          break // Not indented, end of definition
        }
      }
      lastDefinitionLine = endLine
    }
  }

  // Prefer inserting after definitions, then after tokens
  if (lastDefinitionLine > 0) return lastDefinitionLine
  if (lastTokenLine > 0) return lastTokenLine
  return 0
}

/**
 * All component templates indexed by component ID
 */
export const COMPONENT_TEMPLATES: Record<string, ComponentTemplates> = {
  // ============================================================================
  // LAYOUT CONTAINERS
  // ============================================================================
  'layout-row': {
    mir: `Frame hor, gap 8
  Text "Item 1"
  Text "Item 2"
  Text "Item 3"`,
    com: `Frame hor, gap 16, pad 16, bg #27272a, rad 8
  Frame pad 16, bg #3f3f46, rad 4
    Text "Column 1"
  Frame pad 16, bg #3f3f46, rad 4
    Text "Column 2"
  Frame pad 16, bg #3f3f46, rad 4
    Text "Column 3"`,
  },
  'layout-column': {
    mir: `Frame ver, gap 8
  Text "Item 1"
  Text "Item 2"
  Text "Item 3"`,
    com: `Frame ver, gap 16, pad 16, bg #27272a, rad 8
  Frame pad 16, bg #3f3f46, rad 4, w full
    Text "Row 1"
  Frame pad 16, bg #3f3f46, rad 4, w full
    Text "Row 2"
  Frame pad 16, bg #3f3f46, rad 4, w full
    Text "Row 3"`,
  },
  'layout-stack': {
    mir: `Frame stacked, w 200, h 150
  Frame w full, h full, bg #5BA8F5, rad 8
  Frame w 150, h 100, bg #27272a, rad 8, center
    Text "Overlay"`,
    com: `Frame stacked, w 300, h 200
  Image w full, h full, fit cover, rad 8
  Frame w full, h full, bg rgba(0,0,0,0.5), rad 8
  Frame ver, gap 8, center
    Text "Stacked Title", fs 24, weight bold, col white
    Text "Subtitle text", col #e4e4e7`,
  },
  'layout-grid': {
    mir: `Frame grid 2, gap 8
  Text "Cell 1"
  Text "Cell 2"
  Text "Cell 3"
  Text "Cell 4"`,
    com: `Frame grid 3, gap 16, pad 16, bg #27272a, rad 8
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "1"
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "2"
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "3"
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "4"
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "5"
  Frame pad 16, bg #3f3f46, rad 4, center
    Text "6"`,
  },
  'layout-sidebar': {
    mir: `SidebarLayout
  Sidebar
    Text "Navigation", weight bold, col #e4e4e7
    Text "Dashboard", col #a1a1aa
    Text "Projects", col #a1a1aa
    Text "Settings", col #a1a1aa
  Main
    Text "Main Content", fs 18, weight bold
    Text "Your content goes here", col #a1a1aa`,
    com: `// Sidebar Layout Komponente
SidebarLayout: hor, w full, h 400
  Sidebar: w 220, h full, bg #18181b, pad 16, gap 16
  Main: grow, h full, pad 24, bg #27272a

// Navigation Item
NavItem: hor, gap 8, pad 8 12, rad 6, cursor pointer, col #a1a1aa
  hover:
    bg #27272a
    col #e4e4e7`,
  },
  'layout-header-footer': {
    mir: `PageLayout
  Header
    Text "Brand", weight bold, col white
    Frame hor, gap 16
      Text "Link 1", col #a1a1aa
      Text "Link 2", col #a1a1aa
  Main
    Text "Main Content", fs 18, weight bold
    Text "Your content goes here", col #a1a1aa
  Footer
    Text "© 2024 Company", col #71717a, fs 13`,
    com: `// Page Layout Komponente
PageLayout: ver, w full, h 400
  Header: hor, w full, h 56, bg #18181b, pad 0 24, spread
  Main: ver, w full, grow, pad 24, bg #27272a, gap 16
  Footer: hor, w full, h 48, bg #18181b, pad 0 24, center`,
  },

  // ============================================================================
  // BASIC PRIMITIVES
  // ============================================================================
  'basic-frame': {
    mir: 'Frame w 100, h 100, bg #3f3f46',
    com: 'Frame w 100, h 100, bg #27272a, rad 8',
  },
  'basic-text': {
    mir: 'Text "Label"',
    com: 'Text "Label", fs 16, weight medium, col #e4e4e7',
  },
  'basic-icon': {
    mir: 'Icon star',
    com: 'Icon star, size 24, col #a1a1aa',
  },
  'basic-image': {
    mir: 'Image w 200, h 150, bg #3f3f46',
    com: 'Image w 200, h 150, fit cover, rad 8, bg #3f3f46',
  },

  // ============================================================================
  // SIMPLE HTML
  // ============================================================================
  'form-button': {
    mir: 'Button "Click"',
    com: `Button "Click"
  pad 12 24, bg #5BA8F5, col white, rad 6
  hover bg #2271C1`,
  },
  'form-input': {
    mir: 'Input placeholder "Enter..."',
    com: `Input placeholder "Enter..."
  pad 12, bg #27272a, bor 1 #3f3f46, rad 6, col white
  focus bor 1 #5BA8F5`,
  },

  // ============================================================================
  // PURE MIRROR: SELECT
  // ============================================================================
  'form-select': {
    mir: `Select
  Trigger
    Text "Choose..."
  Content
    Item "Option A"
    Item "Option B"
    Item "Option C"`,
    com: `Select
  Trigger
    Text "Choose..."
    Icon "chevron-down", is 16
  Content
    Item "Option A"
    Item "Option B"
    Item "Option C"`,
  },

  // ============================================================================
  // ZAG: FORM CONTROLS
  // ============================================================================
  'form-checkbox': {
    mir: 'Checkbox "Label"',
    com: `Checkbox "Accept terms and conditions"
  icon check`,
  },
  'form-switch': {
    mir: 'Switch',
    com: 'Switch defaultChecked',
  },
  'form-slider': {
    mir: 'Slider',
    com: 'Slider min 0, max 100, value 50, step 1',
  },
  'form-radio-group': {
    mir: `RadioGroup
  RadioItem "Option A"
  RadioItem "Option B"`,
    com: `RadioGroup value "a"
  RadioItem "Option A" value "a"
  RadioItem "Option B" value "b"
  RadioItem "Option C" value "c"`,
  },
  'form-date-picker': {
    mir: 'DatePicker',
    com: 'DatePicker placeholder "Select date"',
  },
  'form-date-input': {
    mir: 'DateInput',
    com: 'DateInput placeholder "DD.MM.YYYY"',
  },

  // ============================================================================
  // ZAG: OVERLAYS
  // ============================================================================
  'overlay-dialog': {
    mir: `Dialog
  Trigger: Button "Open"
  Content: Text "Dialog content"`,
    com: `Dialog closeOnEscape, closeOnInteractOutside
  Trigger: Button "Open Dialog"
  Backdrop: bg rgba(0,0,0,0.8)
  Content: Frame ver, gap 16, pad 24, bg #27272a, rad 12, w 400
    Title: Text "Dialog Title", fs 20, weight bold
    Description: Text "Dialog description", col #a1a1aa
    Frame ver, gap 8
      Text "Main content goes here"
    Frame hor, gap 8, spread
      CloseTrigger: Button "Cancel", bg transparent, bor 1 #3f3f46
      Button "Confirm", bg #5BA8F5`,
  },

  // ============================================================================
  // ZAG: NAVIGATION
  // ============================================================================
  'nav-tabs': {
    mir: `Tabs
  Tab "Tab 1"
    Text "Content 1"
  Tab "Tab 2"
    Text "Content 2"`,
    com: `Tabs defaultValue "tab1"
  Tab "Overview" value "tab1"
    Frame pad 16
      Text "Overview content"
  Tab "Details" value "tab2"
    Frame pad 16
      Text "Details content"
  Tab "Settings" value "tab3"
    Frame pad 16
      Text "Settings content"`,
  },
  'nav-sidenav': {
    mir: `SideNav
  NavItem "Dashboard", icon "home"
  NavItem "Projects", icon "folder"
  NavItem "Settings", icon "settings"`,
    com: `SideNav defaultValue "dashboard"
  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Projects", icon "folder", value "projects"
  NavItem "Settings", icon "settings", value "settings"`,
  },
}

/**
 * Get the template for a component based on file type
 */
export function getComponentTemplate(
  componentId: string,
  fileType: 'mir' | 'com'
): string | undefined {
  const templates = COMPONENT_TEMPLATES[componentId]
  if (!templates) return undefined
  return templates[fileType]
}

/**
 * Detect file type from filename
 */
export function getFileType(filename: string): 'mir' | 'com' {
  if (filename.endsWith('.com')) return 'com'
  return 'mir'
}
