/**
 * Shared DSL Examples for Tests
 *
 * Centralized DSL strings to avoid duplication across test files.
 */

// =============================================================================
// BASIC COMPONENTS
// =============================================================================

export const DSL = {
  // Simple elements
  button: 'Button "Click"',
  buttonStyled: 'Button pad 12 col #3B82F6',
  buttonWithText: 'Button pad 12 col #3B82F6 "Click"',

  // Layout
  boxHorizontal: 'Box hor gap 8',
  boxVertical: 'Box ver pad 16',
  boxCentered: 'Box hor cen cen',
  boxFull: 'App hor full',

  // Parent-child
  parentChild: `Parent
  Child
    Grandchild`,

  // Component definition
  componentDef: `Button: pad 12 col #3B82F6 rad 8

Button "Save"
Button "Cancel"`,

  // Inheritance
  inheritance: `Button: pad 12 col #3B82F6
DangerButton: from Button col #EF4444
GhostButton: from Button col transparent bor 1 boc #3B82F6`,

  // States
  toggleWithStates: `Toggle: w 52 h 28 rad 14 pad 2
  state off
    col #333
  state on
    col #3B82F6
  Knob w 24 h 24 rad 12 col white`,

  // Events
  buttonWithClick: `Button
  onclick toggle`,

  buttonWithAssign: `Button
  onclick assign count to $count + 1`,

  // Conditionals
  conditionalIf: `Box
  if $isLoggedIn
    Avatar`,

  conditionalIfElse: `Box
  if $isLoggedIn
    Avatar
  else
    Button "Login"`,

  conditionalProperty: `Button pad 12
  if $isActive
    col #3B82F6
  else
    col #6B7280`,

  // Iterators
  iterator: `List
  each $task in $tasks
    TaskCard`,

  iteratorNested: `List
  each $item in $data.items
    Item`,

  // Slots
  cardWithSlots: `Card: ver pad 24 gap 16
  Title size 20 weight 600
  Body size 14

Card
  Title "Projektname"
  Body "Beschreibung"`,
}

// =============================================================================
// COMPLEX EXAMPLES
// =============================================================================

export const COMPLEX = {
  // Dashboard layout
  dashboard: `$bg-app: #0A0A0F
$bg-sidebar: #0F0F14
$bg-card: #1A1A23
$primary: #3B82F6
$text: #F4F4F5
$text-muted: #71717A

App hor full col $bg-app
  Sidebar w 240 ver col $bg-sidebar pad 16 gap 8
    Logo h 48 hor ver-cen
      Icon icon "layers" size 24 col $primary
      Title weight 600 size 18 col $text "Mirror"
    Navigation ver gap 4
      NavItem hor ver-cen gap 8 pad 12 rad 8 hover-col #252530
        Icon icon "home"
        Label "Dashboard"
  Main grow ver
    Header h 64 hor ver-cen between pad l-r 24 bor d 1 boc #27272A
      Title size 20 weight 600 col $text "Dashboard"
    Content grow pad 24 ver gap 24
      Stats hor gap 16
        StatCard grow ver pad 16 col $bg-card rad 12
          Label size 12 col $text-muted uppercase "Total Users"
          Value size 28 weight 700 col $text "12,543"`,

  // Login form
  loginForm: `LoginForm: ver gap 24 w 400 pad 32 col #1A1A23 rad 16
  Title size 24 weight 700 hor-cen "Login"

  EmailField ver gap 8
    Label size 14 weight 500 "Email"
    Input h 44 pad l-r 16 col #252530 rad 8 bor 1 boc #333 placeholder "your@email.com"

  PasswordField ver gap 8
    Label size 14 weight 500 "Password"
    Input h 44 pad l-r 16 col #252530 rad 8 bor 1 boc #333 type "password"

  SubmitButton h 48 hor-cen ver-cen col #3B82F6 rad 8 col white weight 600 "Sign In"`,

  // Chat interface
  chatInterface: `Chat: ver full col #111827
Messages: ver grow pad 16 gap 12
MyMessage: ver maxw 280 pad 12 rad 12 col #3B82F6
TheirMessage: ver maxw 280 pad 12 rad 12 col #374151
InputArea: hor gap 12 pad 16 col #1F2937 bor u 1 boc #374151
  Input grow h 44 pad l-r 16 col #374151 rad 22 col #FFF
  SendButton: hor hor-cen ver-cen w 44 h 44 rad 22 col #3B82F6

Chat
  Messages
    TheirMessage "Hello!"
    MyMessage "Hi there!"
  InputArea
    Input "Type a message..."
    SendButton icon "send"`,

  // Kanban board
  kanbanBoard: `KanbanBoard hor gap 16 pad 16 scroll-x h 100%
  each $column in $columns
    Column ver w 300 col #0F0F14 rad 12 maxh 100%
      Header hor between ver-cen pad 16 bor d 1 boc #27272A
        TitleRow hor ver-cen gap 8
          Title weight 600 $column.name
          Count pad 4 8 rad 12 col #333 size 12 $column.cards.length
        AddButton w 28 h 28 rad 6 hover-col #333 hor-cen ver-cen onclick addCard $column.id
          Icon icon "plus" size 16 col #888

      Cards ver gap 8 pad 12 grow scroll-y
        each $card in $column.cards
          Card ver gap 8 pad 12 col #1A1A23 rad 8 bor 1 boc #27272A hover-boc #3B82F6
            Title size 14 weight 500 $card.title
            if $card.description
              Description size 12 col #888 truncate $card.description`,

  // Product grid
  productGrid: `ProductGrid hor wrap gap 24 pad 24
  each $product in $products
    ProductCard ver w 280 col #1A1A23 rad 12 clip
      ImageContainer h 200 clip
        Image full fit cover src $product.image
      Content ver gap 12 pad 16
        Header hor between ver-cen
          Category size 11 uppercase col #888 $product.category
          Rating hor ver-cen gap 4
            Icon icon "star" size 14 col #F59E0B
            Text size 13 weight 500 $product.rating
        Title size 16 weight 600 $product.name
        Price size 20 weight 700 col #3B82F6 $product.price
        AddToCart h 40 hor-cen ver-cen col #3B82F6 rad 8 col white weight 500 "Add to Cart"`,

  // Notification list
  notificationList: `NotificationList ver col #1A1A23 rad 12
  Header hor between ver-cen pad 16 bor d 1 boc #27272A
    Title size 16 weight 600 "Notifications"
    Actions hor gap 8
      MarkAllRead size 13 col #3B82F6 hover-col #60A5FA "Mark all read"

  List ver maxh 400 scroll-y
    each $notification in $notifications
      NotificationItem hor gap 12 pad 16 bor d 1 boc #27272A hover-col #252530
        IconContainer w 40 h 40 rad 20 hor-cen ver-cen
          if $notification.type == "success"
            col #10B98120
            Icon icon "check" size 18 col #10B981
        Content ver gap 4 grow
          Message size 14 $notification.message
          Time size 12 col #666 $notification.time`,

  // Dialog with form
  dialogWithForm: `$bg-card: #1A1A23
$border: #27272A
$space-lg: 24
$radius-lg: 12

NewProjectDialog
  Overlay full col #00000080 cen z 100
  Content ver gap $space-lg pad 32 col $bg-card rad $radius-lg w 400
    Header hor between ver-cen
      Title size 18 weight 600 "New Project"
      CloseButton pad 4 rad 4
        onclick close
        Icon icon "x"
    Form ver gap 16
      FormField ver gap 4
        Label size 14 col #71717A "Project Name"
        Input pad 8 12 col #0A0A0F rad 8 bor 1 boc $border placeholder "My Project"
          oninput assign projectName to $event.value
    Actions hor gap 8 hor-r
      SecondaryButton
        onclick close
        "Cancel"
      PrimaryButton "Create"`,
}

// =============================================================================
// BUTTON VARIANTS
// =============================================================================

export const BUTTONS = {
  base: 'Button: pad 12 col #3B82F6 rad 8',
  primary: 'PrimaryButton: from Button col #3B82F6',
  danger: 'DangerButton: from Button col #EF4444',
  ghost: 'GhostButton: from Button col transparent bor 1 boc #3B82F6 textCol #3B82F6',
  small: 'SmallButton: from Button pad 8 size 12',
  all: `Button: hor cen pad 12 rad 8 weight 500
PrimaryButton: from Button col #3B82F6
SecondaryButton: from Button col #252530
DangerButton: from Button col #EF4444
GhostButton: from Button col transparent textCol #71717A`,
}

// =============================================================================
// LIBRARY COMPONENTS
// =============================================================================

export const LIBRARY = {
  dropdown: 'MyDropdown as Dropdown:',
  dialog: 'MyDialog as Dialog:',
  tabs: 'MyTabs as Tabs:',
  accordion: 'MyAccordion as Accordion:',
  tooltip: 'MyTooltip as Tooltip:',
  popover: 'MyPopover as Popover:',
  contextMenu: 'MyContextMenu as ContextMenu:',
  hoverCard: 'MyHoverCard as HoverCard:',
  alertDialog: 'MyAlertDialog as AlertDialog:',
  input: 'Input',  // Input is a primitive, not a library component
  formField: 'EmailInput as FormField:',  // Library component for form fields with Label, Field, Hint, Error
  select: 'MySelect as Select:',
  checkbox: 'MyCheckbox as Checkbox:',
  switch: 'MySwitch as Switch:',
  radioGroup: 'MyRadioGroup as RadioGroup:',
  slider: 'MySlider as Slider:',
  toast: 'MyToast as Toast:',
  progress: 'MyProgress as Progress:',
  avatar: 'MyAvatar as Avatar:',
  collapsible: 'MyCollapsible as Collapsible:',
}
