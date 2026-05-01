/**
 * Multi-file project fixtures + lifecycle helpers
 *
 * Shared across project/*.test.ts suites.
 */

import type { TestAPI } from '../../types'

// =============================================================================
// Project File Contents
// =============================================================================

/** Design tokens shared across all screens */
export const TOKENS_FILE = `// Design System Tokens

// Brand Colors
primary.bg: #2271C1
primary-hover.bg: #1a5a9e
secondary.bg: #6366f1
accent.bg: #f59e0b
danger.bg: #ef4444
success.bg: #10b981

// Neutral Colors
surface.bg: #1a1a1a
card.bg: #27272a
canvas.bg: #0f0f0f
border.boc: #333333
divider.boc: #444444

// Text Colors
text.col: #ffffff
muted.col: #a1a1aa
subtle.col: #71717a

// Typography Scale
xs.fs: 10
s.fs: 12
m.fs: 14
l.fs: 18
xl.fs: 24
xxl.fs: 32

// Spacing Scale
xs.pad: 4
s.pad: 8
m.pad: 12
l.pad: 16
xl.pad: 24
xxl.pad: 32

xs.gap: 4
s.gap: 8
m.gap: 12
l.gap: 16
xl.gap: 24

// Radius
s.rad: 4
m.rad: 8
l.rad: 12
xl.rad: 16
full.rad: 9999
`

/** Reusable components */
export const COMPONENTS_FILE = `// UI Component Library

// Layout Components
App: w full, h full, bg $canvas, gap 0
  Header: w full, h 64, bg $surface, pad 0 $l, hor, ver-center, spread, bor 0 0 1 0, boc $border
  Sidebar: w 240, h full, bg $surface, pad $m, gap $s, bor 0 1 0 0, boc $border
  Main: grow, pad $xl, gap $l, scroll
  Footer: w full, h 48, bg $surface, pad 0 $l, hor, ver-center, center, bor 1 0 0 0, boc $border

// Navigation
NavItem: pad $m $l, rad $m, col $muted, cursor pointer, hor, gap $m, ver-center
  hover:
    bg $card
    col $text
  selected:
    bg $primary
    col white

NavGroup: gap $xs
  NavLabel: fs $xs, col $subtle, pad $s $m, uppercase

// Cards
Card: bg $card, pad $l, rad $l, gap $m
CardHeader: hor, spread, ver-center
CardTitle: fs $l, weight semibold, col $text
CardDesc: fs $s, col $muted

// Buttons
Btn: pad $m $l, rad $m, fs $m, cursor pointer, hor, gap $s, ver-center, center
  hover:
    opacity 0.9

PrimaryBtn as Btn: bg $primary, col white
  hover:
    bg $primary-hover

SecondaryBtn as Btn: bg $secondary, col white

DangerBtn as Btn: bg $danger, col white

GhostBtn as Btn: bg transparent, col $muted, bor 1, boc $border
  hover:
    bg $card
    col $text

// Form Elements
FormGroup: gap $xs
FormLabel: fs $s, col $muted
FormInput: pad $m, bg $surface, rad $m, bor 1, boc $border, col $text
  focus:
    boc $primary

// Data Display
Badge: pad $xs $s, rad $s, fs $xs
SuccessBadge as Badge: bg $success, col white
WarningBadge as Badge: bg $accent, col black
DangerBadge as Badge: bg $danger, col white

// Stats
StatCard: bg $card, pad $l, rad $l, gap $s
StatValue: fs $xxl, weight bold, col $text
StatLabel: fs $s, col $muted
StatChange: fs $xs, hor, gap $xs, ver-center

// Table
DataTable: bg $card, rad $l, clip
TableHeader: hor, bg $surface, pad $m $l
TableHeaderCell: grow, fs $s, col $muted, weight medium
TableRow: hor, pad $m $l, bor 0 0 1 0, boc $border
  hover:
    bg $surface
TableCell: grow, fs $m, col $text

// Avatar
Avatar: w 40, h 40, rad $full, bg $primary, center
  Initials: fs $m, col white, weight semibold
`

/** Dashboard screen */
export const DASHBOARD_SCREEN = `// Dashboard Screen

App
  Header
    Frame hor, gap $m, ver-center
      Icon "layout-dashboard", is 24, ic $primary
      Text "Dashboard", fs $l, weight semibold, col $text
    Frame hor, gap $m, ver-center
      GhostBtn
        Icon "bell", is 18, ic $muted
      GhostBtn
        Icon "settings", is 18, ic $muted
      Avatar
        Initials "JD"

  Frame hor, h full, grow
    Sidebar
      NavGroup
        NavLabel "Overview"
        NavItem name dashboard, selected
          Icon "home", is 18
          Text "Dashboard"
        NavItem name analytics
          Icon "bar-chart-2", is 18
          Text "Analytics"
      NavGroup
        NavLabel "Management"
        NavItem name users
          Icon "users", is 18
          Text "Users"
        NavItem name products
          Icon "package", is 18
          Text "Products"
        NavItem name orders
          Icon "shopping-cart", is 18
          Text "Orders"
      NavGroup
        NavLabel "Settings"
        NavItem name settings
          Icon "settings", is 18
          Text "Settings"

    Main
      Text "Welcome back, John", fs $xl, weight bold, col $text
      Text "Here's what's happening with your store today.", col $muted

      Frame hor, gap $l, wrap
        StatCard grow, minw 200
          Frame hor, spread
            StatLabel "Total Revenue"
            Icon "dollar-sign", is 18, ic $success
          StatValue "$45,231"
          StatChange
            Icon "trending-up", is 14, ic $success
            Text "+12.5%", col $success

        StatCard grow, minw 200
          Frame hor, spread
            StatLabel "Orders"
            Icon "shopping-bag", is 18, ic $primary
          StatValue "1,234"
          StatChange
            Icon "trending-up", is 14, ic $success
            Text "+8.2%", col $success

        StatCard grow, minw 200
          Frame hor, spread
            StatLabel "Customers"
            Icon "users", is 18, ic $secondary
          StatValue "5,678"
          StatChange
            Icon "trending-down", is 14, ic $danger
            Text "-2.1%", col $danger

        StatCard grow, minw 200
          Frame hor, spread
            StatLabel "Conversion"
            Icon "percent", is 18, ic $accent
          StatValue "3.2%"
          StatChange
            Icon "minus", is 14, ic $muted
            Text "0.0%", col $muted

      Card
        CardHeader
          CardTitle "Recent Orders"
          GhostBtn
            Text "View All"
            Icon "arrow-right", is 16

        DataTable
          TableHeader
            TableHeaderCell w 100, "Order ID"
            TableHeaderCell grow, "Customer"
            TableHeaderCell w 120, "Status"
            TableHeaderCell w 100, "Amount"
          TableRow
            TableCell w 100, "#12345"
            TableCell grow, "John Smith"
            TableCell w 120
              SuccessBadge "Delivered"
            TableCell w 100, "$125.00"
          TableRow
            TableCell w 100, "#12346"
            TableCell grow, "Jane Doe"
            TableCell w 120
              WarningBadge "Pending"
            TableCell w 100, "$89.00"
          TableRow
            TableCell w 100, "#12347"
            TableCell grow, "Bob Wilson"
            TableCell w 120
              DangerBadge "Cancelled"
            TableCell w 100, "$234.00"

  Footer
    Text "© 2024 MyStore. All rights reserved.", fs $xs, col $subtle
`

/** Users management screen */
export const USERS_SCREEN = `// Users Management Screen

App
  Header
    Frame hor, gap $m, ver-center
      Icon "users", is 24, ic $primary
      Text "Users", fs $l, weight semibold, col $text
    Frame hor, gap $m
      FormInput placeholder "Search users...", w 300
      PrimaryBtn
        Icon "plus", is 16
        Text "Add User"

  Frame hor, h full, grow
    Sidebar
      NavGroup
        NavLabel "Overview"
        NavItem name dashboard
          Icon "home", is 18
          Text "Dashboard"
        NavItem name analytics
          Icon "bar-chart-2", is 18
          Text "Analytics"
      NavGroup
        NavLabel "Management"
        NavItem name users, selected
          Icon "users", is 18
          Text "Users"
        NavItem name products
          Icon "package", is 18
          Text "Products"
        NavItem name orders
          Icon "shopping-cart", is 18
          Text "Orders"

    Main
      Frame hor, spread, ver-center
        Frame gap $xs
          Text "All Users", fs $xl, weight bold, col $text
          Text "Manage your team members and their permissions", col $muted
        Frame hor, gap $s
          GhostBtn
            Icon "filter", is 16
            Text "Filter"
          GhostBtn
            Icon "download", is 16
            Text "Export"

      Card pad 0
        DataTable
          TableHeader
            TableHeaderCell w 250, "User"
            TableHeaderCell w 200, "Email"
            TableHeaderCell w 120, "Role"
            TableHeaderCell w 120, "Status"
            TableHeaderCell w 100, "Actions"

          TableRow
            TableCell w 250
              Frame hor, gap $m, ver-center
                Avatar
                  Initials "JS"
                Frame gap $xs
                  Text "John Smith", col $text
                  Text "Joined Jan 2024", fs $xs, col $subtle
            TableCell w 200, "john@example.com"
            TableCell w 120
              Badge bg $primary, col white, "Admin"
            TableCell w 120
              SuccessBadge "Active"
            TableCell w 100
              GhostBtn pad $s
                Icon "more-horizontal", is 16

          TableRow
            TableCell w 250
              Frame hor, gap $m, ver-center
                Avatar bg $secondary
                  Initials "JD"
                Frame gap $xs
                  Text "Jane Doe", col $text
                  Text "Joined Feb 2024", fs $xs, col $subtle
            TableCell w 200, "jane@example.com"
            TableCell w 120
              Badge bg $card, col $text, bor 1, boc $border, "Editor"
            TableCell w 120
              SuccessBadge "Active"
            TableCell w 100
              GhostBtn pad $s
                Icon "more-horizontal", is 16

          TableRow
            TableCell w 250
              Frame hor, gap $m, ver-center
                Avatar bg $accent
                  Initials "BW"
                Frame gap $xs
                  Text "Bob Wilson", col $text
                  Text "Joined Mar 2024", fs $xs, col $subtle
            TableCell w 200, "bob@example.com"
            TableCell w 120
              Badge bg $card, col $text, bor 1, boc $border, "Viewer"
            TableCell w 120
              DangerBadge "Inactive"
            TableCell w 100
              GhostBtn pad $s
                Icon "more-horizontal", is 16

  Footer
    Text "© 2024 MyStore. All rights reserved.", fs $xs, col $subtle
`

/** Products screen */
export const PRODUCTS_SCREEN = `// Products Screen

App
  Header
    Frame hor, gap $m, ver-center
      Icon "package", is 24, ic $primary
      Text "Products", fs $l, weight semibold, col $text
    Frame hor, gap $m
      FormInput placeholder "Search products...", w 300
      PrimaryBtn
        Icon "plus", is 16
        Text "Add Product"

  Frame hor, h full, grow
    Sidebar
      NavGroup
        NavLabel "Overview"
        NavItem name dashboard
          Icon "home", is 18
          Text "Dashboard"
      NavGroup
        NavLabel "Management"
        NavItem name users
          Icon "users", is 18
          Text "Users"
        NavItem name products, selected
          Icon "package", is 18
          Text "Products"
        NavItem name orders
          Icon "shopping-cart", is 18
          Text "Orders"

    Main
      Frame hor, spread, ver-center
        Text "Product Catalog", fs $xl, weight bold, col $text
        Frame hor, gap $s
          GhostBtn
            Icon "grid", is 16
          GhostBtn
            Icon "list", is 16

      Frame hor, gap $l, wrap
        Card w 280
          Frame h 160, bg $surface, rad $m, center
            Icon "image", is 48, ic $subtle
          Frame gap $s, mar $m 0 0 0
            Text "Premium Widget", weight semibold
            Text "High-quality widget for professionals", fs $s, col $muted
            Frame hor, spread, ver-center
              Text "$99.00", fs $l, weight bold, col $primary
              SuccessBadge "In Stock"

        Card w 280
          Frame h 160, bg $surface, rad $m, center
            Icon "image", is 48, ic $subtle
          Frame gap $s, mar $m 0 0 0
            Text "Basic Widget", weight semibold
            Text "Affordable widget for beginners", fs $s, col $muted
            Frame hor, spread, ver-center
              Text "$29.00", fs $l, weight bold, col $primary
              WarningBadge "Low Stock"

        Card w 280
          Frame h 160, bg $surface, rad $m, center
            Icon "image", is 48, ic $subtle
          Frame gap $s, mar $m 0 0 0
            Text "Pro Widget", weight semibold
            Text "Advanced features for experts", fs $s, col $muted
            Frame hor, spread, ver-center
              Text "$199.00", fs $l, weight bold, col $primary
              DangerBadge "Out of Stock"

  Footer
    Text "© 2024 MyStore. All rights reserved.", fs $xs, col $subtle
`

/** Settings screen */
export const SETTINGS_SCREEN = `// Settings Screen

App
  Header
    Frame hor, gap $m, ver-center
      Icon "settings", is 24, ic $primary
      Text "Settings", fs $l, weight semibold, col $text

  Frame hor, h full, grow
    Sidebar
      NavGroup
        NavLabel "Settings"
        NavItem name general, selected
          Icon "sliders", is 18
          Text "General"
        NavItem name profile
          Icon "user", is 18
          Text "Profile"
        NavItem name notifications
          Icon "bell", is 18
          Text "Notifications"
        NavItem name security
          Icon "shield", is 18
          Text "Security"
        NavItem name billing
          Icon "credit-card", is 18
          Text "Billing"

    Main
      Text "General Settings", fs $xl, weight bold, col $text
      Text "Manage your account settings and preferences", col $muted, mar 0 0 $l 0

      Card
        CardTitle "Store Information"
        CardDesc "Update your store details"

        Frame gap $l, mar $l 0 0 0
          FormGroup
            FormLabel "Store Name"
            FormInput value "MyStore", w full

          FormGroup
            FormLabel "Store URL"
            FormInput value "mystore.example.com", w full

          FormGroup
            FormLabel "Contact Email"
            FormInput value "contact@mystore.com", w full

          Frame hor, gap $m
            PrimaryBtn "Save Changes"
            GhostBtn "Cancel"

      Card
        CardTitle "Appearance"
        CardDesc "Customize how your dashboard looks"

        Frame gap $l, mar $l 0 0 0
          FormGroup
            FormLabel "Theme"
            Frame hor, gap $m
              GhostBtn pad $m, bg $card
                Icon "moon", is 18
                Text "Dark"
              GhostBtn pad $m
                Icon "sun", is 18
                Text "Light"

          FormGroup
            FormLabel "Language"
            Select placeholder "Select language"
              Option "English"
              Option "German"
              Option "French"
              Option "Spanish"

      Card
        CardTitle "Danger Zone"
        CardDesc "Irreversible actions"

        Frame gap $m, mar $l 0 0 0
          Frame hor, spread, ver-center, pad $m, bg rgba(239,68,68,0.1), rad $m
            Frame gap $xs
              Text "Delete Store", weight semibold, col $danger
              Text "Permanently delete your store and all data", fs $s, col $muted
            DangerBtn "Delete Store"

  Footer
    Text "© 2024 MyStore. All rights reserved.", fs $xs, col $subtle
`

/** Data file for charts and lists */
export const DATA_FILE = `// App Data

// Dashboard Stats
stats:
  revenue: "$45,231"
  orders: 1234
  customers: 5678
  conversion: "3.2%"

// User list
users:
  john:
    name: "John Smith"
    email: "john@example.com"
    role: "Admin"
    status: "active"
  jane:
    name: "Jane Doe"
    email: "jane@example.com"
    role: "Editor"
    status: "active"
  bob:
    name: "Bob Wilson"
    email: "bob@example.com"
    role: "Viewer"
    status: "inactive"

// Products
products:
  premium:
    name: "Premium Widget"
    price: 99
    stock: 150
  basic:
    name: "Basic Widget"
    price: 29
    stock: 12
  pro:
    name: "Pro Widget"
    price: 199
    stock: 0

// Monthly sales data
monthlySales:
  Jan: 12500
  Feb: 18200
  Mar: 24100
  Apr: 19800
  May: 28300
  Jun: 32100
`

// =============================================================================
// Test Helper Functions
// =============================================================================

/**
 * Setup a multi-file project with all necessary files
 */
export async function setupProject(api: TestAPI): Promise<void> {
  const files = api.panel.files

  // Create token file
  await files.create('tokens.tok', TOKENS_FILE)

  // Create components file
  await files.create('components.com', COMPONENTS_FILE)

  // Create data file
  await files.create('data.data', DATA_FILE)

  // Create screen files in screens folder
  await files.create('screens/dashboard.mir', DASHBOARD_SCREEN)
  await files.create('screens/users.mir', USERS_SCREEN)
  await files.create('screens/products.mir', PRODUCTS_SCREEN)
  await files.create('screens/settings.mir', SETTINGS_SCREEN)

  // Wait for files to be created
  await api.utils.delay(300)
}

/**
 * Clean up project files
 */
export async function cleanupProject(api: TestAPI): Promise<void> {
  const files = api.panel.files
  const fileList = files.list()

  for (const file of fileList) {
    if (file !== 'index.mir') {
      await files.delete(file)
    }
  }

  await api.utils.delay(100)
}
