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
  // Select - Dropdown with Trigger, Content, Item slots
  Select: `Select:
  Trigger: pad 8 12, bg #27272a, rad 6, col #e4e4e7
    hover bg #3f3f46
  Content: bg #27272a, rad 8, pad 4, shadow md
  Item: pad 8 12, rad 4, col #e4e4e7
    hover bg #3f3f46`,

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
  Range: bg #3b82f6
  Thumb: w 16, h 16, bg #e4e4e7, rad 8`,

  // RadioGroup - Item and Control
  RadioGroup: `RadioGroup:
  Item: gap 8
  ItemControl: w 18, h 18, bg #27272a, rad 9, bor 1 #3f3f46
  ItemText: col #e4e4e7`,

  // Dialog - Trigger, Backdrop, Content
  Dialog: `Dialog:
  Trigger: pad 8 16, bg #3b82f6, col white, rad 6
  Backdrop: bg rgba(0,0,0,0.6)
  Content: bg #27272a, rad 12, pad 24, w 400, shadow lg
  Title: fs 20, weight bold, col #e4e4e7
  Description: col #a1a1aa
  CloseTrigger: bg transparent, col #a1a1aa
    hover col #e4e4e7`,

  // Tooltip - Trigger, Content
  Tooltip: `Tooltip:
  Trigger: cursor pointer
  Content: bg #18181b, rad 6, pad 8 12, col #e4e4e7, fs 13, shadow md`,

  // Popover - Trigger, Content
  Popover: `Popover:
  Trigger: pad 8 16, bg #27272a, rad 6, col #e4e4e7
  Content: bg #27272a, rad 8, pad 12, w 200, shadow lg
  CloseTrigger: bg transparent, col #a1a1aa`,

  // Tabs - List, Trigger, Content
  Tabs: `Tabs:
  List: bg #27272a, rad 8, pad 4, gap 4
  Trigger: pad 8 16, rad 6, col #a1a1aa
    hover col #e4e4e7
  Content: pad 16`,

  // Accordion - Item, Trigger, Content
  Accordion: `Accordion:
  Item: bor-bottom 1 #3f3f46
  ItemTrigger: pad 12, col #e4e4e7
    hover bg #27272a
  ItemContent: pad 12, col #a1a1aa`,

  // Progress - Track, Range
  Progress: `Progress:
  Track: h 6, bg #27272a, rad 3
  Range: bg #3b82f6`,

  // NumberInput - Control, Input, Buttons
  NumberInput: `NumberInput:
  Control: bg #27272a, rad 6
  Input: pad 8, col #e4e4e7, bg transparent
  IncrementTrigger: pad 4, col #a1a1aa
    hover col #e4e4e7
  DecrementTrigger: pad 4, col #a1a1aa
    hover col #e4e4e7`,

  // TagsInput - Control, Tag, Input
  TagsInput: `TagsInput:
  Control: bg #27272a, rad 6, pad 8, gap 4
  Tag: bg #3f3f46, rad 4, pad 2 8, col #e4e4e7
  TagDeleteTrigger: col #a1a1aa
    hover col #ef4444
  Input: bg transparent, col #e4e4e7`,

  // FileUpload - Dropzone, Trigger
  FileUpload: `FileUpload:
  Dropzone: bg #27272a, rad 12, pad 32, bor 2 dashed #3f3f46, center
    hover bor 2 dashed #3b82f6
  Trigger: pad 8 16, bg #3b82f6, col white, rad 6`,

  // Collapsible - Trigger, Content
  Collapsible: `Collapsible:
  Trigger: pad 12, bg #27272a, rad 8, col #e4e4e7, cursor pointer
    hover bg #3f3f46
  Content: pad 16`,

  // Steps - Item, Trigger, Separator
  Steps: `Steps:
  Item: gap 8
  Trigger: w 32, h 32, bg #27272a, rad 16, col #a1a1aa
  Separator: h 2, bg #27272a`,

  // Pagination - Item, Trigger
  Pagination: `Pagination:
  Item: pad 8, bg #27272a, rad 4, col #e4e4e7
    hover bg #3f3f46
  PrevTrigger: pad 8, bg #27272a, rad 4
  NextTrigger: pad 8, bg #27272a, rad 4`,
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
 * 1. After the last token definition ($name.prop: value)
 * 2. After the last existing component definition (Name:)
 * 3. At the start of the file
 */
export function findDefinitionInsertPosition(code: string): number {
  const lines = code.split('\n')
  let lastTokenLine = 0
  let lastDefinitionLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Token definition: starts with $
    if (line.startsWith('$')) {
      lastTokenLine = i + 1  // 1-indexed line number
    }
    // Component definition: starts with CapitalLetter and ends with :
    // But NOT a slot (which would be indented)
    if (/^[A-Z][a-zA-Z0-9]*\s*:/.test(line) && !lines[i].startsWith(' ') && !lines[i].startsWith('\t')) {
      // Also check the NEXT line to see if this definition has children
      // If the next non-empty line is indented, count those lines too
      let endLine = i + 1
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j]
        if (!nextLine.trim()) continue  // Skip empty lines
        if (nextLine.startsWith(' ') || nextLine.startsWith('\t')) {
          endLine = j + 1  // This line is part of the definition
        } else {
          break  // Not indented, end of definition
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
  pad 12 24, bg #3b82f6, col white, rad 6
  hover bg #2563eb`,
  },
  'form-input': {
    mir: 'Input placeholder "Enter..."',
    com: `Input placeholder "Enter..."
  pad 12, bg #27272a, bor 1 #3f3f46, rad 6, col white
  focus bor 1 #3b82f6`,
  },

  // ============================================================================
  // ZAG: SELECT
  // ============================================================================
  'form-select': {
    mir: `Select placeholder "Choose..."
  Item "Option A"
  Item "Option B"
  Item "Option C"`,
    com: `Select placeholder "Choose...", searchable, clearable
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
  'form-number-input': {
    mir: 'NumberInput',
    com: 'NumberInput min 0, max 100, step 1, value 0',
  },
  'form-pin-input': {
    mir: 'PinInput length 4',
    com: 'PinInput length 6, mask, otp',
  },
  'form-password-input': {
    mir: 'PasswordInput',
    com: 'PasswordInput placeholder "Enter password..."',
  },
  'form-tags-input': {
    mir: 'TagsInput',
    com: 'TagsInput placeholder "Add tag...", max 5',
  },
  'form-editable': {
    mir: 'Editable "Click to edit"',
    com: 'Editable "Click to edit", submitMode "enter"',
  },
  'form-segmented-control': {
    mir: `SegmentedControl
  Segment "List"
  Segment "Grid"`,
    com: `SegmentedControl value "list"
  Segment "List" value "list"
  Segment "Grid" value "grid"
  Segment "Table" value "table"`,
  },
  'form-toggle-group': {
    mir: `ToggleGroup
  Toggle "B"
  Toggle "I"
  Toggle "U"`,
    com: `ToggleGroup multiple
  Toggle "B" value "bold"
  Toggle "I" value "italic"
  Toggle "U" value "underline"`,
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
      Button "Confirm", bg #3b82f6`,
  },
  'overlay-tooltip': {
    mir: `Tooltip
  Trigger: Text "Hover me"
  Content: Text "Tooltip"`,
    com: `Tooltip positioning "top", openDelay 200, closeDelay 0
  Trigger: Button "Hover for info"
  Content: Frame pad 8 12, bg #18181b, rad 6, bor 1 #3f3f46
    Text "Helpful tooltip text", fs 13`,
  },
  'overlay-popover': {
    mir: `Popover
  Trigger: Button "Click"
  Content: Text "Popover content"`,
    com: `Popover positioning "bottom", closeOnEscape, closeOnInteractOutside
  Trigger: Button "Open Menu"
  Content: Frame ver, gap 4, pad 8, bg #27272a, rad 8, bor 1 #3f3f46, w 200
    Button "Option 1", bg transparent, w full
    Button "Option 2", bg transparent, w full
    Divider
    CloseTrigger: Button "Close", bg transparent, w full, col #ef4444`,
  },
  'overlay-hover-card': {
    mir: `HoverCard
  Trigger: Text "@username"
  Content: Text "User info"`,
    com: `HoverCard positioning "bottom", openDelay 300, closeDelay 100
  Trigger: Text "@username", col #3b82f6, underline
  Content: Frame ver, gap 12, pad 16, bg #27272a, rad 12, bor 1 #3f3f46, w 300
    Frame hor, gap 12
      Avatar "JD", size 48
      Frame ver
        Text "John Doe", weight bold
        Text "@johndoe", col #71717a, fs 13
    Text "Software developer and UI enthusiast", col #a1a1aa`,
  },
  'overlay-collapsible': {
    mir: `Collapsible
  Trigger: Button "Toggle"
  Content: Text "Hidden content"`,
    com: `Collapsible defaultOpen
  Trigger: Frame hor, spread, pad 12, bg #27272a, rad 8, cursor pointer
    Text "Click to expand"
    Icon chevron-down
  Content: Frame pad 16, bg #1f1f23, rad 8
    Text "This content can be collapsed"`,
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
  'nav-accordion': {
    mir: `Accordion
  AccordionItem "Section 1"
    Text "Content 1"
  AccordionItem "Section 2"
    Text "Content 2"`,
    com: `Accordion collapsible, multiple
  AccordionItem "What is Mirror?" value "q1"
    Text "Mirror is a DSL for rapid UI prototyping."
  AccordionItem "How does it work?" value "q2"
    Text "You write declarative code and it compiles to DOM or React."
  AccordionItem "Is it free?" value "q3"
    Text "Yes, Mirror is open source."`,
  },
  'nav-steps': {
    mir: `Steps
  Step "Step 1"
  Step "Step 2"
  Step "Step 3"`,
    com: `Steps current 1
  Step "Account" description "Create your account"
  Step "Profile" description "Set up your profile"
  Step "Complete" description "You're all set"`,
  },
  'nav-pagination': {
    mir: 'Pagination count 100',
    com: 'Pagination count 100, pageSize 10, siblingCount 1, page 1',
  },
  'nav-tree-view': {
    mir: `TreeView
  Branch "Folder"
    TreeItem "File"
  TreeItem "File"`,
    com: `TreeView selectionMode "single"
  Branch "src" value "src"
    Branch "components" value "components"
      TreeItem "Button.tsx" value "button"
      TreeItem "Input.tsx" value "input"
    TreeItem "index.ts" value "index"
  Branch "public" value "public"
    TreeItem "favicon.ico" value "favicon"`,
  },

  // ============================================================================
  // ZAG: SELECTION
  // ============================================================================
  'form-listbox': {
    mir: `Listbox
  ListItem "Item 1"
  ListItem "Item 2"
  ListItem "Item 3"`,
    com: `Listbox selectionMode "multiple"
  ListItem "Design" value "design"
  ListItem "Development" value "dev"
  ListItem "Marketing" value "marketing"
  ListItem "Sales" value "sales"`,
  },

  // ============================================================================
  // ZAG: DATE & TIME
  // ============================================================================
  'form-date-picker': {
    mir: 'DatePicker',
    com: 'DatePicker placeholder "Select date", format "DD.MM.YYYY"',
  },

  // ============================================================================
  // ZAG: MEDIA & FILES
  // ============================================================================
  'media-avatar': {
    mir: 'Avatar "AB"',
    com: 'Avatar "JD", size 48',
  },
  'media-file-upload': {
    mir: 'FileUpload',
    com: `FileUpload multiple, maxFiles 5, accept "image/*"
  Dropzone: Frame ver, center, gap 8, pad 32, bg #27272a, rad 12, bor 2 dashed #3f3f46
    Icon upload, size 32, col #71717a
    Text "Drop files here", col #a1a1aa
    Text "or click to browse", fs 13, col #52525b
  Trigger: Button "Browse Files"`,
  },
  'media-carousel': {
    mir: `Carousel
  Slide: Frame bg #27272a
  Slide: Frame bg #3f3f46`,
    com: `Carousel loop, autoplay, interval 5000
  Slide: Frame center, h 200, bg #27272a, rad 8
    Text "Slide 1"
  Slide: Frame center, h 200, bg #3f3f46, rad 8
    Text "Slide 2"
  Slide: Frame center, h 200, bg #52525b, rad 8
    Text "Slide 3"`,
  },

  // ============================================================================
  // ZAG: FEEDBACK
  // ============================================================================
  'feedback-progress': {
    mir: 'Progress value 60',
    com: 'Progress value 60, max 100',
  },
  'feedback-circular-progress': {
    mir: 'CircularProgress value 75',
    com: 'CircularProgress value 75, size 80, trackWidth 8',
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
