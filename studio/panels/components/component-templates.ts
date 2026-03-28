/**
 * Component Templates for .mir and .com files
 *
 * .mir = Minimal, ready to use in layouts
 * .com = Full, with all slots and example styling for component definitions
 */

export interface ComponentTemplates {
  mir: string
  com: string
}

/**
 * All component templates indexed by component ID
 */
export const COMPONENT_TEMPLATES: Record<string, ComponentTemplates> = {
  // ============================================================================
  // LAYOUT COMPONENTS
  // ============================================================================
  'layout-shell': {
    mir: `Shell
  Header
    Text "My App"
  Sidebar
    Text "Menu"
  Main
    Text "Content goes here"`,
    com: `Shell w full, h full
  Header
    Text "My App"
  Sidebar
    Text "Menu"
  Main
    Text "Content goes here"`,
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
  'basic-button': {
    mir: 'Button "Click"',
    com: `Button "Click"
  pad 12 24, bg #3b82f6, col white, rad 6
  hover bg #2563eb`,
  },
  'basic-input': {
    mir: 'Input placeholder "Enter..."',
    com: `Input placeholder "Enter..."
  pad 12, bg #27272a, bor 1 #3f3f46, rad 6, col white
  focus bor 1 #3b82f6`,
  },

  // ============================================================================
  // ZAG: SELECT
  // ============================================================================
  'zag-select': {
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
  'zag-checkbox': {
    mir: 'Checkbox "Label"',
    com: `Checkbox "Accept terms and conditions"
  icon check`,
  },
  'zag-switch': {
    mir: 'Switch',
    com: 'Switch defaultChecked',
  },
  'zag-slider': {
    mir: 'Slider',
    com: 'Slider min 0, max 100, value 50, step 1',
  },
  'zag-radio-group': {
    mir: `RadioGroup
  RadioItem "Option A"
  RadioItem "Option B"`,
    com: `RadioGroup value "a"
  RadioItem "Option A" value "a"
  RadioItem "Option B" value "b"
  RadioItem "Option C" value "c"`,
  },
  'zag-number-input': {
    mir: 'NumberInput',
    com: 'NumberInput min 0, max 100, step 1, value 0',
  },
  'zag-pin-input': {
    mir: 'PinInput length 4',
    com: 'PinInput length 6, mask, otp',
  },
  'zag-password-input': {
    mir: 'PasswordInput',
    com: 'PasswordInput placeholder "Enter password..."',
  },
  'zag-tags-input': {
    mir: 'TagsInput',
    com: 'TagsInput placeholder "Add tag...", max 5',
  },
  'zag-editable': {
    mir: 'Editable "Click to edit"',
    com: 'Editable "Click to edit", submitMode "enter"',
  },
  'zag-segmented-control': {
    mir: `SegmentedControl
  Segment "List"
  Segment "Grid"`,
    com: `SegmentedControl value "list"
  Segment "List" value "list"
  Segment "Grid" value "grid"
  Segment "Table" value "table"`,
  },
  'zag-toggle-group': {
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
  'zag-dialog': {
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
  'zag-tooltip': {
    mir: `Tooltip
  Trigger: Text "Hover me"
  Content: Text "Tooltip"`,
    com: `Tooltip positioning "top", openDelay 200, closeDelay 0
  Trigger: Button "Hover for info"
  Content: Frame pad 8 12, bg #18181b, rad 6, bor 1 #3f3f46
    Text "Helpful tooltip text", fs 13`,
  },
  'zag-popover': {
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
  'zag-hover-card': {
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
  'zag-collapsible': {
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
  'zag-tabs': {
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
  'zag-accordion': {
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
  'zag-steps': {
    mir: `Steps
  Step "Step 1"
  Step "Step 2"
  Step "Step 3"`,
    com: `Steps current 1
  Step "Account" description "Create your account"
  Step "Profile" description "Set up your profile"
  Step "Complete" description "You're all set"`,
  },
  'zag-pagination': {
    mir: 'Pagination count 100',
    com: 'Pagination count 100, pageSize 10, siblingCount 1, page 1',
  },
  'zag-tree-view': {
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
  'zag-listbox': {
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
  'zag-date-picker': {
    mir: 'DatePicker',
    com: 'DatePicker placeholder "Select date", format "DD.MM.YYYY"',
  },

  // ============================================================================
  // ZAG: MEDIA & FILES
  // ============================================================================
  'zag-avatar': {
    mir: 'Avatar "AB"',
    com: 'Avatar "JD", size 48',
  },
  'zag-file-upload': {
    mir: 'FileUpload',
    com: `FileUpload multiple, maxFiles 5, accept "image/*"
  Dropzone: Frame ver, center, gap 8, pad 32, bg #27272a, rad 12, bor 2 dashed #3f3f46
    Icon upload, size 32, col #71717a
    Text "Drop files here", col #a1a1aa
    Text "or click to browse", fs 13, col #52525b
  Trigger: Button "Browse Files"`,
  },
  'zag-carousel': {
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
  'zag-progress': {
    mir: 'Progress value 60',
    com: 'Progress value 60, max 100',
  },
  'zag-circular-progress': {
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
