/**
 * Component Templates
 *
 * Central registry of multi-line component templates.
 * Used by:
 * - Drag & Drop (DropHandler)
 * - Autocomplete (Editor snippets)
 * - Component Panel (Insert button)
 *
 * Templates use relative indentation:
 * - Line 1: 0 spaces (component name)
 * - Children: 2 spaces per level
 *
 * At insertion time, the target indentation is added to all lines.
 */

/** Valid template categories */
export type TemplateCategory =
  | 'navigation'
  | 'form'
  | 'overlay'
  | 'media'
  | 'feedback'
  | 'layout'

export interface ComponentTemplate {
  /** Human-readable description */
  description: string
  /** Multi-line code template (relative indentation) */
  code: string
  /** Category for grouping in UI */
  category: TemplateCategory
}

/**
 * Component templates registry
 *
 * Only components that NEED children are included here.
 * Simple components (Button, Input, etc.) don't need templates.
 */
export const COMPONENT_TEMPLATES: Record<string, ComponentTemplate> = {
  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  Tabs: {
    description: 'Tabbed navigation with panels',
    category: 'navigation',
    code: `Tabs
  TabList hor
    TabTrigger "Tab 1"
    TabTrigger "Tab 2"
    TabTrigger "Tab 3"
  TabContent
    Text "Content for Tab 1"
  TabContent
    Text "Content for Tab 2"
  TabContent
    Text "Content for Tab 3"`,
  },

  Accordion: {
    description: 'Collapsible content sections',
    category: 'navigation',
    code: `Accordion
  AccordionItem
    AccordionTrigger "Section 1"
    AccordionContent
      Text "Content for section 1"
  AccordionItem
    AccordionTrigger "Section 2"
    AccordionContent
      Text "Content for section 2"`,
  },

  Steps: {
    description: 'Step-by-step wizard',
    category: 'navigation',
    code: `Steps
  StepItem
    StepTrigger "Step 1"
    StepContent
      Text "Step 1 content"
  StepItem
    StepTrigger "Step 2"
    StepContent
      Text "Step 2 content"
  StepItem
    StepTrigger "Step 3"
    StepContent
      Text "Step 3 content"`,
  },

  TreeView: {
    description: 'Hierarchical tree structure',
    category: 'navigation',
    code: `TreeView
  TreeBranch
    TreeBranchControl
      Text "Parent"
    TreeBranchContent
      TreeItem
        Text "Child 1"
      TreeItem
        Text "Child 2"`,
  },

  // ===========================================================================
  // SELECTION & DROPDOWNS
  // ===========================================================================
  Select: {
    description: 'Dropdown select menu',
    category: 'form',
    code: `Select
  SelectTrigger
    SelectValue "Select option"
  SelectContent
    SelectItem "Option 1"
    SelectItem "Option 2"
    SelectItem "Option 3"`,
  },

  Combobox: {
    description: 'Searchable select with autocomplete',
    category: 'form',
    code: `Combobox
  ComboboxControl
    ComboboxInput placeholder "Search..."
    ComboboxTrigger
  ComboboxContent
    ComboboxItem "Option 1"
    ComboboxItem "Option 2"
    ComboboxItem "Option 3"`,
  },

  Listbox: {
    description: 'Selectable list',
    category: 'form',
    code: `Listbox
  ListboxItem "Item 1"
  ListboxItem "Item 2"
  ListboxItem "Item 3"`,
  },

  // ===========================================================================
  // MENUS
  // ===========================================================================
  Menu: {
    description: 'Dropdown menu',
    category: 'overlay',
    code: `Menu
  MenuTrigger
    Button "Open Menu"
  MenuContent
    MenuItem "Action 1"
    MenuItem "Action 2"
    MenuSeparator
    MenuItem "Action 3"`,
  },

  ContextMenu: {
    description: 'Right-click context menu',
    category: 'overlay',
    code: `ContextMenu
  ContextMenuTrigger
    Box w 200, h 100, bg #f0f0f0, center
      Text "Right-click here"
  ContextMenuContent
    ContextMenuItem "Cut"
    ContextMenuItem "Copy"
    ContextMenuItem "Paste"`,
  },

  NavigationMenu: {
    description: 'Site navigation with dropdowns',
    category: 'navigation',
    code: `NavigationMenu
  NavigationMenuList hor, gap 16
    NavigationMenuItem
      NavigationMenuTrigger "Products"
      NavigationMenuContent
        Text "Products content"
    NavigationMenuItem
      NavigationMenuLink "About"
    NavigationMenuItem
      NavigationMenuLink "Contact"`,
  },

  // ===========================================================================
  // OVERLAYS & MODALS
  // ===========================================================================
  Dialog: {
    description: 'Modal dialog',
    category: 'overlay',
    code: `Dialog
  DialogTrigger
    Button "Open Dialog"
  DialogContent pad 24, rad 8, bg #fff
    DialogTitle "Dialog Title"
    DialogDescription "Dialog description text"
    Box hor, gap 8, margin top 16
      DialogCloseTrigger
        Button "Cancel"
      Button "Confirm"`,
  },

  Popover: {
    description: 'Floating popover',
    category: 'overlay',
    code: `Popover
  PopoverTrigger
    Button "Open Popover"
  PopoverContent pad 16, rad 8, bg #fff, shadow md
    Text "Popover content"`,
  },

  Tooltip: {
    description: 'Hover tooltip',
    category: 'overlay',
    code: `Tooltip
  TooltipTrigger
    Button "Hover me"
  TooltipContent pad 8, rad 4, bg #333, col #fff
    Text "Tooltip text"`,
  },

  HoverCard: {
    description: 'Rich hover preview',
    category: 'overlay',
    code: `HoverCard
  HoverCardTrigger
    Link "Hover for details"
  HoverCardContent pad 16, rad 8, bg #fff, shadow lg
    Text "Preview content"`,
  },

  // ===========================================================================
  // MEDIA & CONTENT
  // ===========================================================================
  Carousel: {
    description: 'Image/content carousel',
    category: 'media',
    code: `Carousel loop
  CarouselControl hor, spread
    CarouselPrevTrigger
      Button "<"
    CarouselNextTrigger
      Button ">"
  CarouselItemGroup
    CarouselItem
      Box w full, h 200, bg #e0e0e0, center
        Text "Slide 1"
    CarouselItem
      Box w full, h 200, bg #d0d0d0, center
        Text "Slide 2"
    CarouselItem
      Box w full, h 200, bg #c0c0c0, center
        Text "Slide 3"`,
  },

  Avatar: {
    description: 'User avatar with fallback',
    category: 'media',
    code: `Avatar
  AvatarImage src "https://example.com/avatar.jpg"
  AvatarFallback
    Text "AB"`,
  },

  FileUpload: {
    description: 'File upload dropzone',
    category: 'form',
    code: `FileUpload
  FileUploadDropzone pad 32, bor 2 dashed #ccc, rad 8, center
    FileUploadLabel "Drop files here or click to upload"
    FileUploadTrigger
      Button "Choose Files"
  FileUploadItemGroup ver, gap 8
    FileUploadItem
      FileUploadItemName
      FileUploadItemDeleteTrigger`,
  },

  // ===========================================================================
  // FORM CONTROLS
  // ===========================================================================
  RadioGroup: {
    description: 'Radio button group',
    category: 'form',
    code: `RadioGroup ver, gap 8
  RadioItem
    RadioControl
    RadioLabel "Option 1"
  RadioItem
    RadioControl
    RadioLabel "Option 2"
  RadioItem
    RadioControl
    RadioLabel "Option 3"`,
  },

  SegmentedControl: {
    description: 'Segmented button group',
    category: 'form',
    code: `SegmentedControl hor
  SegmentedControlItem value "day"
    SegmentedControlLabel "Day"
  SegmentedControlItem value "week"
    SegmentedControlLabel "Week"
  SegmentedControlItem value "month"
    SegmentedControlLabel "Month"`,
  },

  ToggleGroup: {
    description: 'Toggle button group',
    category: 'form',
    code: `ToggleGroup hor, gap 4
  ToggleItem value "bold"
    Text "B", weight bold
  ToggleItem value "italic"
    Text "I", italic
  ToggleItem value "underline"
    Text "U", underline`,
  },

  TagsInput: {
    description: 'Tag input field',
    category: 'form',
    code: `TagsInput
  TagsInputControl hor, wrap, gap 4, pad 8, bor 1 #ccc, rad 4
    TagsInputItem
      TagsInputItemText
      TagsInputItemDeleteTrigger
    TagsInputInput placeholder "Add tag..."`,
  },

  PinInput: {
    description: 'PIN/OTP input',
    category: 'form',
    code: `PinInput length 4
  PinInputControl hor, gap 8
    PinInputInput
    PinInputInput
    PinInputInput
    PinInputInput`,
  },

  RatingGroup: {
    description: 'Star rating',
    category: 'form',
    code: `RatingGroup count 5
  RatingControl hor
    RatingItem
    RatingItem
    RatingItem
    RatingItem
    RatingItem`,
  },

  Slider: {
    description: 'Range slider',
    category: 'form',
    code: `Slider min 0, max 100
  SliderControl
    SliderTrack
      SliderRange
    SliderThumb`,
  },

  RangeSlider: {
    description: 'Dual-thumb range slider',
    category: 'form',
    code: `RangeSlider min 0, max 100
  RangeSliderControl
    RangeSliderTrack
      RangeSliderRange
    RangeSliderThumb
    RangeSliderThumb`,
  },

  // ===========================================================================
  // DATE & TIME
  // ===========================================================================
  DatePicker: {
    description: 'Date selection calendar',
    category: 'form',
    code: `DatePicker
  DatePickerControl
    DatePickerInput
    DatePickerTrigger
      Button "📅"
  DatePickerContent
    DatePickerView
      DatePickerViewControl hor, spread
        DatePickerPrevTrigger
        DatePickerViewTrigger
        DatePickerNextTrigger
      DatePickerTable
        DatePickerTableHead
          DatePickerTableRow
            DatePickerTableHeader
        DatePickerTableBody`,
  },

  // ===========================================================================
  // FEEDBACK & STATUS
  // ===========================================================================
  Progress: {
    description: 'Progress bar',
    category: 'feedback',
    code: `Progress value 50, min 0, max 100
  ProgressTrack h 8, bg #e0e0e0, rad 4
    ProgressRange bg #5BA8F5, rad 4`,
  },

  CircularProgress: {
    description: 'Circular progress indicator',
    category: 'feedback',
    code: `CircularProgress value 75, min 0, max 100
  CircularProgressCircle
    CircularProgressTrack
    CircularProgressRange
  CircularProgressValueText`,
  },

  Toast: {
    description: 'Toast notification',
    category: 'feedback',
    code: `Toast
  ToastTitle "Notification"
  ToastDescription "This is a toast message"
  ToastCloseTrigger`,
  },

  // ===========================================================================
  // LAYOUT & UTILITY
  // ===========================================================================
  Collapsible: {
    description: 'Collapsible section',
    category: 'layout',
    code: `Collapsible
  CollapsibleTrigger
    Button "Toggle"
  CollapsibleContent
    Box pad 16
      Text "Collapsible content"`,
  },

  Splitter: {
    description: 'Resizable split panels',
    category: 'layout',
    code: `Splitter w full, h 300
  SplitterPanel minw 100
    Box pad 16, bg #f5f5f5, h full
      Text "Panel 1"
  SplitterResizeTrigger
  SplitterPanel minw 100
    Box pad 16, bg #e5e5e5, h full
      Text "Panel 2"`,
  },

  ScrollArea: {
    description: 'Custom scrollable area',
    category: 'layout',
    code: `ScrollArea w 300, h 200
  ScrollAreaViewport
    Box ver, gap 8
      Text "Scrollable content..."
  ScrollAreaScrollbar
    ScrollAreaThumb`,
  },
}

/**
 * Get a component template by name
 */
export function getComponentTemplate(componentName: string): ComponentTemplate | undefined {
  return COMPONENT_TEMPLATES[componentName]
}

/**
 * Check if a component has a template
 */
export function hasComponentTemplate(componentName: string): boolean {
  return componentName in COMPONENT_TEMPLATES
}

/**
 * Get all template names
 */
export function getTemplateNames(): string[] {
  return Object.keys(COMPONENT_TEMPLATES)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): Array<{ name: string; template: ComponentTemplate }> {
  return Object.entries(COMPONENT_TEMPLATES)
    .filter(([_, template]) => template.category === category)
    .map(([name, template]) => ({ name, template }))
}

/**
 * Get all categories
 */
export function getTemplateCategories(): TemplateCategory[] {
  const categories = new Set<TemplateCategory>()
  for (const template of Object.values(COMPONENT_TEMPLATES)) {
    categories.add(template.category)
  }
  return Array.from(categories)
}

/**
 * Adjust template indentation for insertion
 *
 * Takes a template with relative indentation and adds the base indentation.
 *
 * @param templateCode - The template code with relative indentation
 * @param baseIndent - The indentation to add to all lines (e.g., "    " for 4 spaces)
 * @returns The template with adjusted indentation
 */
export function adjustTemplateIndentation(templateCode: string, baseIndent: string): string {
  const lines = templateCode.split('\n')
  return lines.map(line => baseIndent + line).join('\n')
}
