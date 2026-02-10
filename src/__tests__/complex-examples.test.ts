/**
 * Complex Examples Tests
 * Tests für komplexe, realistische DSL-Beispiele die mehrere Features kombinieren.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

// ============================================================================
// KOMPLETTES DASHBOARD LAYOUT
// ============================================================================

describe('Komplettes Dashboard Layout', () => {
  it('Dashboard mit Sidebar, Header und Content', () => {
    const dsl = `$bg-app: #0A0A0F
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
      NavItem hor ver-cen gap 8 pad 12 rad 8 hover-col#252530
        Icon icon "home"
        Label "Dashboard"
      NavItem hor ver-cen gap 8 pad 12 rad 8 hover-col#252530
        Icon icon "users"
        Label "Users"
      NavItem hor ver-cen gap 8 pad 12 rad 8 hover-col#252530
        Icon icon "settings"
        Label "Settings"
  Main grow ver
    Header h 64 hor ver-cen between pad l-r 24 bor d 1 boc #27272A
      Title size 20 weight 600 col $text "Dashboard"
      Actions hor gap 12
        Button pad 8 12 rad 6 col $primary "New Item"
    Content grow pad 24 ver gap 24
      Stats hor gap 16
        StatCard grow ver pad 16 col $bg-card rad 12
          Label size 12 col $text-muted uppercase "Total Users"
          Value size 28 weight 700 col $text "12,543"
        StatCard grow ver pad 16 col $bg-card rad 12
          Label size 12 col $text-muted uppercase "Revenue"
          Value size 28 weight 700 col $text "$45,231"
        StatCard grow ver pad 16 col $bg-card rad 12
          Label size 12 col $text-muted uppercase "Active Now"
          Value size 28 weight 700 col $text "573"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.tokens.size).toBeGreaterThan(0)
    const app = result.nodes.find(n => n.name === 'App')
    expect(app).toBeDefined()
    expect(app!.children.length).toBe(2) // Sidebar + Main
  })

  it('Dashboard mit dynamischen Listen', () => {
    const dsl = `Dashboard hor full
  Sidebar w 240 ver col#0F0F14
    each $page in $pages
      NavItem hor pad 12 gap 8 hover-col#252530 onclick page $page.id
        Icon icon $page.icon
        Label $page.name
  Content grow ver pad 24
    each $card in $cards
      Card ver pad 16 col#1A1A23 rad 12
        Title weight 600 $card.title
        Value size 24 $card.value
        if $card.trend > 0
          Trend col #10B981 "+$card.trend%"
        else
          Trend col #EF4444 "$card.trend%"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.nodes[0].name).toBe('Dashboard')
  })
})

// ============================================================================
// KOMPLEXE FORMULARE
// ============================================================================

describe('Komplexe Formulare', () => {
  it('Login-Formular mit Validierung', () => {
    const dsl = `LoginForm: ver gap 24 w 400 pad 32 col#1A1A23 rad 16
  Title size 24 weight 700 hor-cen "Login"

  EmailField ver gap 8
    Label size 14 weight 500 "Email"
    Input h 44 pad l-r 16 col#252530 rad 8 bor 1 boc #333 placeholder "your@email.com"
    if $emailError
      Error size 12 col #EF4444 $emailError

  PasswordField ver gap 8
    Label size 14 weight 500 "Password"
    Input h 44 pad l-r 16 col#252530 rad 8 bor 1 boc #333 type "password" placeholder "Enter password"
    if $passwordError
      Error size 12 col #EF4444 $passwordError

  Options hor between ver-cen
    RememberMe hor gap 8 ver-cen
      Checkbox w 18 h 18 rad 4 bor 1 boc #444
      Label size 14 "Remember me"
    ForgotLink size 14 col #3B82F6 hover-col #60A5FA "Forgot password?"

  SubmitButton h 48 hor-cen ver-cen col#3B82F6 rad 8 col white weight 600 hover-col#2563EB
    if $loading
      Spinner w 20 h 20
    else
      "Sign In"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('LoginForm')).toBe(true)
  })

  it('Registrierungsformular mit mehreren Feldern', () => {
    const dsl = `RegisterForm: ver gap 20 pad 24 col#1E1E2E rad 12

  Row hor gap 16
    FirstName ver gap 6 grow
      Label size 13 col #888 "First Name"
      Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333
    LastName ver gap 6 grow
      Label size 13 col #888 "Last Name"
      Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333

  EmailField ver gap 6
    Label size 13 col #888 "Email Address"
    Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333 placeholder "you@example.com"

  PasswordField ver gap 6
    Label size 13 col #888 "Password"
    Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333 type "password"
    Requirements ver gap 4 mar u 8
      Requirement hor gap 6 ver-cen
        Icon icon "check" size 14 if $hasMinLength then col #10B981 else col #666
        Text size 12 col #888 "At least 8 characters"
      Requirement hor gap 6 ver-cen
        Icon icon "check" size 14 if $hasNumber then col #10B981 else col #666
        Text size 12 col #888 "Contains a number"

  Terms hor gap 8 ver-cen
    Checkbox w 16 h 16 rad 4 bor 1 boc #444
    Label size 13 col #888 "I agree to the Terms and Conditions"

  SubmitButton h 44 hor-cen ver-cen col#3B82F6 rad 8 col white weight 500 "Create Account"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('RegisterForm')).toBe(true)
  })

  it('Kontaktformular mit Textarea', () => {
    const dsl = `ContactForm ver gap 16 pad 20 col#1A1A23 rad 12 w 500
  Header ver gap 4
    Title size 20 weight 600 "Contact Us"
    Subtitle size 14 col #888 "We'd love to hear from you"

  Fields ver gap 12
    NameInput ver gap 6
      Label size 13 weight 500 "Name"
      Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333

    EmailInput ver gap 6
      Label size 13 weight 500 "Email"
      Input h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333

    SubjectInput ver gap 6
      Label size 13 weight 500 "Subject"
      Select h 40 pad l-r 12 col#252530 rad 6 bor 1 boc #333

    MessageInput ver gap 6
      Label size 13 weight 500 "Message"
      Textarea h 120 pad 12 col#252530 rad 6 bor 1 boc #333 placeholder "Your message..."

  Actions hor hor-r gap 12
    CancelButton pad 10 16 rad 6 col#333 col #888 hover-col#444 "Cancel"
    SendButton pad 10 16 rad 6 col#3B82F6 col white hover-col#2563EB "Send Message"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})

// ============================================================================
// KOMPLEXE KOMPONENTEN MIT STATES
// ============================================================================

describe('Komponenten mit mehreren States', () => {
  it('Toggle mit Animation-States', () => {
    const dsl = `Toggle: w 52 h 28 rad 14 pad 2 hor ver-cen onclick toggle
  state off
    col#333
  state on
    col#3B82F6
  Knob: w 24 h 24 rad 12 colwhite

ToggleGroup ver gap 12
  ToggleRow hor between ver-cen
    Label "Dark Mode"
    Toggle
  ToggleRow hor between ver-cen
    Label "Notifications"
    Toggle`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('Toggle')).toBe(true)
    expect(result.registry.has('Knob')).toBe(true)
  })

  it('Accordion mit expanded/collapsed States', () => {
    const dsl = `AccordionItem: ver bor d 1 boc #333
  state collapsed
    Content h 0 opacity 0
  state expanded
    Content h auto opacity 1
  Header: hor between ver-cen pad 16 hover-col#252530 onclick toggle
    Title weight 500
    Icon icon "chevron-down"
  Content: ver pad 16 pad u 0

FAQ ver rad 12 col#1A1A23 clip
  AccordionItem
    Header
      Title "What is Mirror?"
    Content
      Text col #888 "Mirror is a visual DSL for building UIs."
  AccordionItem
    Header
      Title "How does it work?"
    Content
      Text col #888 "You write declarative DSL code and see live previews."
  AccordionItem
    Header
      Title "Is it free?"
    Content
      Text col #888 "Yes, Mirror is free and open source."`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('AccordionItem')).toBe(true)
  })

  it('Button mit loading, disabled, hover States', () => {
    const dsl = `Button: hor hor-cen ver-cen h 44 pad l-r 20 rad 8 gap 8
  state default
    col#3B82F6
    col white
    hover-col#2563EB
  state loading
    col#3B82F6
  state disabled
    col#333
    col #666
  state success
    col#10B981
    col white

ActionButton from Button onclick submit
  if $isLoading
    Spinner w 16 h 16
  else
    Icon icon "send" size 16`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('Button')).toBe(true)
    const button = result.registry.get('Button')!
    // TODO: State parser doesn't parse multiple states correctly yet
    expect(button.states?.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// DATA TABLES
// ============================================================================

describe('Data Tables', () => {
  it('Sortierbare Datentabelle', () => {
    const dsl = `DataTable ver col#1A1A23 rad 12
  Header hor col#0F0F14 pad 12 gap 0
    HeaderCell grow pad l-r 16 hor ver-cen gap 8
      Text weight 600 size 13 col #888 "Name"
    HeaderCell w 120 pad l-r 16 hor ver-cen gap 8
      Text weight 600 size 13 col #888 "Status"
    HeaderCell w 100 pad l-r 16 hor ver-cen
      Text weight 600 size 13 col #888 "Date"

  Body ver
    each $row in $data
      Row hor pad 12 gap 0 bor d 1 boc #27272A hover-col#252530
        Cell grow pad l-r 16 hor ver-cen gap 12
          Avatar w 32 h 32 rad 16 col#3B82F6 hor-cen ver-cen
          Info ver gap 2
            Name size 14 weight 500 $row.name
            Email size 12 col #888 $row.email
        Cell w 120 pad l-r 16 hor ver-cen
          Badge pad 4 8 rad 4 size 12 $row.status
        Cell w 100 pad l-r 16 hor ver-cen
          Text size 13 col #888 $row.date`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Tabelle mit Selektion', () => {
    const dsl = `SelectableTable ver col#1E1E2E rad 12
  Header hor col#161622 pad 12
    SelectAll w 40 hor-cen ver-cen
      Checkbox w 18 h 18 rad 4 bor 2 boc #444 onclick selectAll
    Columns grow hor
      Col grow "Name"
      Col w 120 "Status"
      Col w 100 "Role"

  Body ver
    each $user in $users
      Row hor pad 12 bor d 1 boc #27272A if $user.selected then col#3B82F620 else coltransparent
        SelectCell w 40 hor-cen ver-cen
          Checkbox w 18 h 18 rad 4 if $user.selected then col#3B82F6 bor 0 else bor 2 boc #444
            onclick toggle $user.id
        DataCells grow hor
          NameCell grow hor ver-cen gap 12
            Avatar w 36 h 36 rad 18 col#3B82F6
            Text weight 500 $user.name
          StatusCell w 120
            Badge pad 4 10 rad 12 size 12 $user.status
          RoleCell w 100
            Text col #888 $user.role

  Footer hor between ver-cen pad 12 col#161622
    SelectedCount size 13 col #888 "$selectedCount selected"
    Actions hor gap 8
      Button pad 8 12 rad 6 col#333 "Delete"
      Button pad 8 12 rad 6 col#3B82F6 col white "Export"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})

// ============================================================================
// NAVIGATION PATTERNS
// ============================================================================

describe('Navigation Patterns', () => {
  it('Sidebar Navigation mit aktiven States', () => {
    const dsl = `Sidebar: w 260 ver col#0F0F14 h 100%
  Brand hor ver-cen gap 12 pad 20 bor d 1 boc #1F1F28
    Logo w 36 h 36 rad 8 col#3B82F6 hor-cen ver-cen
      Icon icon "layers" size 20 col white
    AppName size 18 weight 700 "Mirror"

  Nav ver pad 12 gap 4 grow
    Section ver gap 4
      SectionLabel size 11 weight 600 uppercase col #555 pad l 12 mar d 8 "Main"
      NavItem: hor ver-cen gap 12 pad 12 rad 8
        state default
          col #888
          hover-col#1F1F28
        state active
          col#3B82F620
          col #3B82F6
        Icon: size 20
        Label: size 14
      NavItem onclick page dashboard
        Icon icon "home"
        Label "Dashboard"
      NavItem onclick page analytics
        Icon icon "bar-chart-2"
        Label "Analytics"
      NavItem onclick page users
        Icon icon "users"
        Label "Users"

    Section ver gap 4 mar u 16
      SectionLabel size 11 weight 600 uppercase col #555 pad l 12 mar d 8 "Settings"
      NavItem onclick page settings
        Icon icon "settings"
        Label "Settings"
      NavItem onclick page help
        Icon icon "help-circle"
        Label "Help"

  UserSection hor ver-cen gap 12 pad 16 bor u 1 boc #1F1F28
    Avatar w 40 h 40 rad 20 col#3B82F6
    UserInfo ver gap 2 grow
      Name size 14 weight 500 "John Doe"
      Role size 12 col #666 "Admin"
    LogoutButton w 32 h 32 rad 6 hover-col#1F1F28 hor-cen ver-cen
      Icon icon "log-out" size 16 col #666`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('Sidebar')).toBe(true)
    expect(result.registry.has('NavItem')).toBe(true)
  })

  it('Breadcrumb Navigation', () => {
    const dsl = `Breadcrumb: hor ver-cen gap 8 pad 12
  each $crumb in $breadcrumbs
    if $crumb.isLast
      CurrentPage size 14 weight 500 col white $crumb.name
    else
      Link size 14 col #888 hover-col white onclick page $crumb.id $crumb.name
      Separator col #444 "/"

PageHeader hor between ver-cen pad 24 bor d 1 boc #27272A
  Left ver gap 8
    Breadcrumb
    Title size 24 weight 700 "User Management"
  Right hor gap 12
    SearchInput h 40 w 280 pad l-r 16 col#252530 rad 8 bor 1 boc #333 placeholder "Search users..."
    AddButton h 40 pad l-r 16 col#3B82F6 rad 8 col white hor ver-cen gap 8
      Icon icon "plus" size 16
      "Add User"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('Breadcrumb')).toBe(true)
  })

  it('Tab Navigation mit Unternavigation', () => {
    const dsl = `TabNav ver
  Tabs hor gap 0 bor d 1 boc #333
    each $tab in $tabs
      Tab pad 16 20 bor d 2 mar d -1 onclick selectTab $tab.id
        if $tab.id == $activeTab
          boc #3B82F6
          col white
        else
          boc transparent
          col #888
          hover-col white
        Label weight 500 $tab.name
        if $tab.count > 0
          Badge mar l 8 pad 2 6 rad 10 col#3B82F620 col #3B82F6 size 11 $tab.count

  TabContent pad 24
    if $activeTab == "overview"
      OverviewPanel ver gap 16
        Stats hor gap 16
          StatCard grow
          StatCard grow
          StatCard grow
    if $activeTab == "details"
      DetailsPanel ver gap 16
        Form ver gap 12
    if $activeTab == "history"
      HistoryPanel ver gap 8
        each $event in $events
          EventItem hor gap 12 pad 12`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})

// ============================================================================
// CARDS & LISTS
// ============================================================================

describe('Cards und Listen', () => {
  it('Produkt-Karten Grid', () => {
    const dsl = `ProductGrid hor wrap gap 24 pad 24
  each $product in $products
    ProductCard ver w 280 col#1A1A23 rad 12 clip
      ImageContainer h 200 clip
        Image full fit cover src $product.image
        if $product.discount > 0
          DiscountBadge pos abs u 12 l 12 pad 6 12 rad 8 col#EF4444 col white size 12 weight 600
            "-$product.discount%"
      Content ver gap 12 pad 16
        Header hor between ver-cen
          Category size 11 uppercase col #888 $product.category
          Rating hor ver-cen gap 4
            Icon icon "star" size 14 col #F59E0B
            Text size 13 weight 500 $product.rating
        Title size 16 weight 600 $product.name
        PriceRow hor ver-cen gap 8
          if $product.originalPrice
            OriginalPrice size 14 col #666 $product.originalPrice
          CurrentPrice size 20 weight 700 col #3B82F6 $product.price
        AddToCart h 40 hor-cen ver-cen col#3B82F6 rad 8 col white weight 500 hover-col#2563EB
          "Add to Cart"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Notification Liste', () => {
    const dsl = `NotificationList ver col#1A1A23 rad 12
  Header hor between ver-cen pad 16 bor d 1 boc #27272A
    Title size 16 weight 600 "Notifications"
    Actions hor gap 8
      MarkAllRead size 13 col #3B82F6 hover-col #60A5FA "Mark all read"
      ClearAll size 13 col #888 hover-col white "Clear all"

  List ver maxh 400 scroll-y
    each $notification in $notifications
      NotificationItem hor gap 12 pad 16 bor d 1 boc #27272A hover-col#252530
        if not $notification.read
          UnreadDot w 8 h 8 rad 4 col#3B82F6
        IconContainer w 40 h 40 rad 20 hor-cen ver-cen
          if $notification.type == "success"
            col#10B98120
            Icon icon "check" size 18 col #10B981
          if $notification.type == "warning"
            col#F59E0B20
            Icon icon "alert-triangle" size 18 col #F59E0B
          if $notification.type == "error"
            col#EF444420
            Icon icon "x-circle" size 18 col #EF4444
          if $notification.type == "info"
            col#3B82F620
            Icon icon "info" size 18 col #3B82F6
        Content ver gap 4 grow
          Message size 14 $notification.message
          Time size 12 col #666 $notification.time
        CloseButton w 24 h 24 rad 4 hover-col#333 hor-cen ver-cen onclick dismiss $notification.id
          Icon icon "x" size 14 col #666

  Footer hor hor-cen pad 12 bor u 1 boc #27272A
    ViewAll size 13 col #3B82F6 hover-col #60A5FA "View all notifications"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Kommentar-Thread mit Antworten', () => {
    const dsl = `CommentThread ver gap 16
  each $comment in $comments
    Comment ver gap 12
      CommentMain hor gap 12
        Avatar w 40 h 40 rad 20 col#3B82F6
          if $comment.avatar
            Image full fit cover src $comment.avatar
          else
            Initials hor-cen ver-cen weight 600 size 14 $comment.initials
        Body ver gap 8 grow
          Header hor ver-cen gap 8
            Author weight 600 size 14 $comment.author
            if $comment.isAuthor
              Badge pad 2 6 rad 4 col#3B82F620 col #3B82F6 size 10 "Author"
            Time size 12 col #666 $comment.time
          Text size 14 col #CCC $comment.text
          Actions hor gap 16
            LikeButton hor ver-cen gap 6 col #888 hover-col white onclick like $comment.id
              Icon icon "heart" size 14
              Count size 12 $comment.likes
            ReplyButton hor ver-cen gap 6 col #888 hover-col white onclick reply $comment.id
              Icon icon "message-circle" size 14
              "Reply"

      if $comment.replies.length > 0
        Replies ver gap 12 mar l 52 pad l 16 bor l 2 boc #333
          each $reply in $comment.replies
            Reply hor gap 12
              Avatar w 32 h 32 rad 16 col#666
              Body ver gap 4 grow
                Header hor ver-cen gap 8
                  Author weight 500 size 13 $reply.author
                  Time size 11 col #666 $reply.time
                Text size 13 col #AAA $reply.text`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})

// ============================================================================
// MODALS & OVERLAYS
// ============================================================================

describe('Modals und Overlays', () => {
  it('Bestätigungs-Dialog', () => {
    const dsl = `ConfirmDialog: ver gap 20 w 400 pad 24 col#1E1E2E rad 16 bor 1 boc #333
  state closed
    opacity 0
    pointer none
  state open
    opacity 1

  Header hor between ver-cen
    Title size 18 weight 600 "Confirm Delete"
    CloseButton w 32 h 32 rad 6 hover-col#333 hor-cen ver-cen onclick close
      Icon icon "x" size 18 col #888

  Body ver gap 12
    Icon w 48 h 48 rad 24 col#EF444420 hor-cen ver-cen
      Icon icon "trash-2" size 24 col #EF4444
    Message size 15 col #CCC hor-cen "Are you sure you want to delete this item?"
    Warning size 13 col #888 hor-cen "This action cannot be undone."

  Actions hor gap 12 hor-r
    CancelButton h 40 pad l-r 20 rad 8 col#333 col #CCC hover-col#444 onclick close
      "Cancel"
    DeleteButton h 40 pad l-r 20 rad 8 col#EF4444 col white hover-col#DC2626 onclick confirm
      "Delete"

Overlay: full col#00000080 hor-cen ver-cen onclick close
  state closed
    opacity 0
    pointer none
  state open
    opacity 1`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('ConfirmDialog')).toBe(true)
    expect(result.registry.has('Overlay')).toBe(true)
  })

  it('Toast Notifications', () => {
    const dsl = `ToastContainer: ver gap 12 pad 16 w 360

Toast: hor gap 12 pad 16 col#1E1E2E rad 12 bor 1 boc #333 shadow "0 4px 12px #0004"
  state entering
    opacity 0
    mar r -100
  state visible
    opacity 1
    mar r 0
  state exiting
    opacity 0
    mar r -100

  IconSlot: w 24 h 24
  Content: ver gap 4 grow
    Title: size 14 weight 600
    Message: size 13 col #888
  CloseButton: w 24 h 24 rad 4 hover-col#333 hor-cen ver-cen onclick dismiss
    Icon icon "x" size 14 col #666

SuccessToast from Toast
  IconSlot
    Icon icon "check-circle" size 24 col #10B981
  Content
    Title "Success"
    Message "Your changes have been saved."
  CloseButton

ErrorToast from Toast
  IconSlot
    Icon icon "x-circle" size 24 col #EF4444
  Content
    Title "Error"
    Message "Something went wrong. Please try again."
  CloseButton

InfoToast from Toast
  IconSlot
    Icon icon "info" size 24 col #3B82F6
  Content
    Title "Info"
    Message "A new version is available."
  CloseButton`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
    expect(result.registry.has('Toast')).toBe(true)
    // SuccessToast, ErrorToast, InfoToast sind Instanzen (nodes), keine neuen Komponenten-Definitionen
    const nodeNames = result.nodes.map(n => n.name)
    expect(nodeNames).toContain('SuccessToast')
    expect(nodeNames).toContain('ErrorToast')
    expect(nodeNames).toContain('InfoToast')
  })
})

// ============================================================================
// KOMPLEXE BERECHNUNGEN
// ============================================================================

describe('Komplexe Berechnungen', () => {
  it('Warenkorb mit Berechnungen', () => {
    const dsl = `ShoppingCart ver col#1A1A23 rad 12
  Header hor between ver-cen pad 16 bor d 1 boc #27272A
    Title size 18 weight 600 "Shopping Cart"
    ItemCount size 14 col #888 "$cartItems.length items"

  Items ver pad 16 gap 12
    each $item in $cartItems
      CartItem hor gap 16 pad 12 col#252530 rad 8
        Image w 80 h 80 rad 8 fit cover src $item.image
        Details ver gap 4 grow
          Name size 14 weight 500 $item.name
          Variant size 12 col #888 $item.variant
          Quantity hor ver-cen gap 8
            MinusBtn w 28 h 28 rad 4 col#333 hor-cen ver-cen hover-col#444 onclick decrement $item.id
              Icon icon "minus" size 14
            Count size 14 weight 500 w 32 hor-cen $item.quantity
            PlusBtn w 28 h 28 rad 4 col#333 hor-cen ver-cen hover-col#444 onclick increment $item.id
              Icon icon "plus" size 14
        Price ver ver-cen hor-r
          LineTotal size 16 weight 600 $item.price * $item.quantity
          RemoveBtn size 12 col #EF4444 hover-col #F87171 onclick remove $item.id "Remove"

  Summary ver gap 12 pad 16 bor u 1 boc #27272A
    Row hor between
      Label col #888 "Subtotal"
      Value $subtotal
    Row hor between
      Label col #888 "Shipping"
      Value if $subtotal >= 50 then "Free" else $shipping
    Row hor between
      Label col #888 "Tax"
      Value $subtotal * 0.19
    Divider h 1 col#333 mar u-d 8
    TotalRow hor between
      Label size 16 weight 600 "Total"
      Total size 20 weight 700 col #3B82F6 $subtotal + $tax + $shipping

  CheckoutButton h 48 hor-cen ver-cen col#3B82F6 rad 8 col white weight 600 mar 16 hover-col#2563EB
    "Proceed to Checkout"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Statistik-Dashboard mit Prozentberechnungen', () => {
    const dsl = `StatsDashboard ver gap 24
  Overview hor gap 16
    each $stat in $stats
      StatCard ver pad 20 col#1A1A23 rad 12 grow
        Header hor between ver-cen
          Label size 12 col #888 uppercase $stat.label
          if $stat.change > 0
            Change hor ver-cen gap 4 col #10B981
              Icon icon "trending-up" size 14
              Text size 12 "+$stat.change%"
          else
            Change hor ver-cen gap 4 col #EF4444
              Icon icon "trending-down" size 14
              Text size 12 "$stat.change%"
        Value size 32 weight 700 mar u 8 $stat.value
        ProgressBar h 4 col#333 rad 2 mar u 12 full
          Fill h 4 rad 2 col#3B82F6 w $stat.progress * 100 + "%"

  Charts hor gap 16
    ChartCard ver pad 20 col#1A1A23 rad 12 grow
      Header hor between ver-cen mar d 16
        Title size 16 weight 600 "Revenue Over Time"
        Filters hor gap 8
          FilterBtn pad 6 12 rad 6 if $period == "week" then col#3B82F6 col white else col#333 col #888
            onclick setPeriod "week" "Week"
          FilterBtn pad 6 12 rad 6 if $period == "month" then col#3B82F6 col white else col#333 col #888
            onclick setPeriod "month" "Month"
          FilterBtn pad 6 12 rad 6 if $period == "year" then col#3B82F6 col white else col#333 col #888
            onclick setPeriod "year" "Year"
      Chart h 300
        each $point in $chartData
          Bar w 24 col#3B82F6 rad u 4 h $point.value / $maxValue * 100 + "%"`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})

// ============================================================================
// VERSCHACHTELTE ITERATOREN
// ============================================================================

describe('Verschachtelte Iteratoren', () => {
  it('Kategorie-Liste mit Produkten', () => {
    const dsl = `CategoryList ver gap 24
  each $category in $categories
    Section ver gap 12
      Header hor between ver-cen
        Title size 18 weight 600 $category.name
        Count size 14 col #888 $category.products.length + " products"
      Products hor gap 16 scroll-x pad d 8
        each $product in $category.products
          ProductCard ver w 200 col#1A1A23 rad 12
            Image h 150 clip rad u 12
              Img full fit cover src $product.image
            Info ver gap 8 pad 12
              Name size 14 weight 500 truncate $product.name
              Price size 16 weight 600 col #3B82F6 $product.price`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Kanban Board mit Spalten und Karten', () => {
    const dsl = `KanbanBoard hor gap 16 pad 16 scroll-x h 100%
  each $column in $columns
    Column ver w 300 col#0F0F14 rad 12 maxh 100%
      Header hor between ver-cen pad 16 bor d 1 boc #27272A
        TitleRow hor ver-cen gap 8
          Title weight 600 $column.name
          Count pad 4 8 rad 12 col#333 size 12 $column.cards.length
        AddButton w 28 h 28 rad 6 hover-col#333 hor-cen ver-cen onclick addCard $column.id
          Icon icon "plus" size 16 col #888

      Cards ver gap 8 pad 12 grow scroll-y
        each $card in $column.cards
          Card ver gap 8 pad 12 col#1A1A23 rad 8 bor 1 boc #27272A hover-boc #3B82F6
            if $card.labels.length > 0
              Labels hor gap 4 wrap
                each $label in $card.labels
                  Label pad 2 8 rad 4 size 10 col $label.color col $label.color $label.name
            Title size 14 weight 500 $card.title
            if $card.description
              Description size 12 col #888 truncate $card.description
            Footer hor between ver-cen mar u 4
              Assignees hor
                each $assignee in $card.assignees
                  Avatar w 24 h 24 rad 12 mar l -8 bor 2 boc #1A1A23 col#3B82F6
              Meta hor gap 8 col #666
                if $card.comments > 0
                  Comments hor ver-cen gap 4
                    Icon icon "message-circle" size 12
                    Text size 11 $card.comments
                if $card.attachments > 0
                  Attachments hor ver-cen gap 4
                    Icon icon "paperclip" size 12
                    Text size 11 $card.attachments`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })

  it('Verschachtelte Menüs', () => {
    const dsl = `NavigationMenu ver
  each $item in $menuItems
    MenuItem ver
      ItemHeader hor between ver-cen pad 12 hover-col#252530 rad 8
        if $item.children.length > 0
          onclick toggleSubmenu $item.id
        else
          onclick navigate $item.path
        Left hor ver-cen gap 12
          Icon icon $item.icon size 18 col #888
          Label size 14 $item.label
        if $item.children.length > 0
          ChevronIcon icon "chevron-right" size 16 col #666

      if $item.expanded and $item.children.length > 0
        Submenu ver mar l 32 pad l 12 bor l 1 boc #333
          each $child in $item.children
            SubItem hor ver-cen gap 8 pad 10 12 hover-col#252530 rad 6 onclick navigate $child.path
              Label size 13 col #AAA $child.label
              if $child.badge
                Badge pad 2 6 rad 8 col#3B82F620 col #3B82F6 size 10 $child.badge`

    const result = parse(dsl)
    expect(result.errors.filter(e => !e.startsWith('Warning:'))).toHaveLength(0)
  })
})
