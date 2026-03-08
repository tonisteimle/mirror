# Mirror DSL - Example Prompts

Example prompts to get UI code from an LLM.

---

## Simple Components

### User Card
```
Create a user profile card with avatar, name, email, and a "Follow" button. Dark mode.
```

**Expected Output:**
```mirror
$primary: #3B82F6

UserCard: w 300, pad 20, bg #1a1a23, rad 12, gap 16

UserCard
    Row hor, gap 16
        Avatar: size 56, bg $primary, rad 28, center
            Text "JS", col white, weight bold
        Info: gap 4
            Name: weight bold, col #f0f0f5
            Email: col #888, font-size 13
    FollowBtn: bg $primary, col white, pad 10, rad 8, w full

UserCard
    Row
        Avatar
            Text "JS"
        Info
            Name "John Smith"
            Email "john@example.com"
    FollowBtn "Follow"
```

---

### Navigation Bar
```
Create a horizontal navigation bar with logo, 3 nav links, and a user avatar on the right. Dark mode.
```

**Expected Output:**
```mirror
NavBar: hor, spread, pad 16 24, bg #12121a, bor b 1 #2a2a33
    Left: hor, gap 32
        Logo: weight bold, font-size 18, col #f0f0f5
        Links: hor, gap 24
            NavLink: cursor pointer
                state hover col #f0f0f5
    Avatar: size 36, bg #3B82F6, rad 18, center, cursor pointer
        Icon "user", is 18, col white

NavBar
    Left
        Logo "Mirror"
        Links
            NavLink col #f0f0f5, "Home"
            NavLink col #888, "Products"
            NavLink col #888, "About"
    Avatar
```

---

## Complex Components

### Settings Panel
```
Create a settings panel with 4 toggle options: Notifications, Dark Mode, Auto-Save, Analytics.
Each has an icon, title, description, and toggle switch. Dark mode styling.
```

**Expected Output:**
```mirror
$surface: #12121a
$card: #1a1a23
$primary: #3B82F6

SettingRow: hor, spread, pad 16, bg $surface, rad 12
    Left: hor, gap 14
        IconBox: center, size 40, bg $card, rad 10
            Icon is 20, col $primary
        Labels: gap 4
            Title: col #e0e0e5, font-size 14
            Subtitle: col #666, font-size 12
    Toggle: size 48 28, rad 14, cursor pointer
        state on bg $primary
        state off bg #333

SettingsPanel: gap 12, pad 20, bg $card, rad 16
    Header: weight bold, font-size 18, col #f0f0f5, pad-bottom 8

SettingsPanel
    Header "Settings"
    SettingRow
        Left
            IconBox
                Icon "bell"
            Labels
                Title "Notifications"
                Subtitle "Receive push notifications"
        Toggle on
    SettingRow
        Left
            IconBox
                Icon "moon"
            Labels
                Title "Dark Mode"
                Subtitle "Use dark theme"
        Toggle on
    SettingRow
        Left
            IconBox
                Icon "save"
            Labels
                Title "Auto-Save"
                Subtitle "Save changes automatically"
        Toggle off
    SettingRow
        Left
            IconBox
                Icon "bar-chart"
            Labels
                Title "Analytics"
                Subtitle "Share usage data"
        Toggle off
```

---

### Task List
```
Create a task list showing 3 tasks. Each task has a checkbox, title, due date, and priority badge.
Use each loop. Include completed and pending states.
```

**Expected Output:**
```mirror
$surface: #1a1a23

TaskItem: hor, spread, pad 16, bg $surface, rad 10, gap 12
    Left: hor, gap 12
        Check:
            state done
                Icon "check-circle", is 20, col #22C55E
            state pending
                Icon "circle", is 20, col #666
        Info: gap 4
            Title: col #e0e0e5
            DueDate: col #888, font-size 12
    Badge: pad 4 8, bg #2a2a33, rad 4
        Text font-size 11, col #a0a0aa

TaskList: gap 8

each task in tasks
    TaskItem
        Left
            Check task.done ? done : pending
            Info
                Title task.title
                DueDate task.dueDate
        Badge
            Text task.priority
```

---

### Dropdown Menu
```
Create a dropdown menu component with a trigger button and a list of 4 options.
Include hover states and icons for each option.
```

**Expected Output:**
```mirror
$dropdown.bg: #1a1a23
$dropdown.hover: #2a2a33

MenuItem: hor, gap 12, pad 10 12, rad 6, cursor pointer
    onhover highlight
    onclick select, close
    state highlighted bg $dropdown.hover
    Icon: is 18, col #888
    Label: col #e0e0e5

Dropdown: closed
    onclick toggle
    onclick-outside close

    Trigger: hor, spread, pad 10 16, bg #333, rad 8, cursor pointer
        Text "Options", col #ccc
        Icon "chevron-down", is 16, col #888

    if (open)
        Menu: pad 6, bg $dropdown.bg, rad 8, bor 1 #333, shadow lg
            keys
                escape close
                arrow-down highlight next
                arrow-up highlight prev
                enter select, close

            MenuItem
                Icon "user"
                Label "Profile"
            MenuItem
                Icon "settings"
                Label "Settings"
            MenuItem
                Icon "help-circle"
                Label "Help"
            MenuItem
                Icon "log-out"
                Label "Sign out"
```

---

### Modal Dialog
```
Create a confirmation modal with title, message, cancel and confirm buttons.
Include backdrop, close button, and proper spacing. Dark mode.
```

**Expected Output:**
```mirror
Modal: stacked, w full, h full
    onclick-outside close

    Backdrop: w full, h full, bg rgba(0,0,0,0.6), center
    Dialog: w 420, bg #1a1a23, rad 16, shadow lg
        Header: hor, spread, pad 20, bor b 1 #2a2a33
            Title: weight bold, font-size 18, col #f0f0f5
            CloseBtn: cursor pointer
                onclick close
                Icon "x", is 20, col #666
                state hover
                    Icon col #f0f0f5
        Body: pad 20
            Message: col #a0a0aa, line 1.5
        Footer: hor, gap 12, pad 20, right
            CancelBtn: bg #2a2a33, col #a0a0aa, pad 10 20, rad 8, cursor pointer
                onclick close
                state hover bg #333
            ConfirmBtn: bg #3B82F6, col white, pad 10 20, rad 8, cursor pointer
                state hover bg #2563EB

Modal
    Dialog
        Header
            Title "Confirm Delete"
            CloseBtn
        Body
            Message "Are you sure you want to delete this item? This action cannot be undone."
        Footer
            CancelBtn "Cancel"
            ConfirmBtn "Delete"
```

---

## Full Pages

### Login Page
```
Create a centered login form with email input, password input, "Remember me" checkbox,
login button, and "Forgot password?" link. Dark mode, modern design.
```

---

### Dashboard
```
Create a dashboard layout with:
- Left sidebar (240px) with logo and navigation items
- Main content area with stats cards (3 columns) and a data table
Dark mode styling.
```

---

### Settings Page
```
Create a settings page with:
- Header with title and save button
- Sections for Profile, Notifications, Privacy
- Each section has multiple setting rows with toggles/inputs
Dark mode.
```

---

## Interactive Patterns

### Tab Navigation
```
Create a tab component with 3 tabs: Overview, Analytics, Settings.
Show active state on selected tab. Use states for hover/active styling.
```

---

### Search with Dropdown
```
Create a search input that shows a dropdown with search results.
Include search icon, clear button, and result items with icons.
```

---

### Toast Notification
```
Create a toast notification component with icon, message, and close button.
Include variants for success, error, warning, and info.
```

---

## Tips for Better Results

1. **Be specific about layout**: "horizontal", "3-column grid", "centered"
2. **Mention dark mode**: Ensures correct color palette
3. **Specify content**: Give example text/data
4. **Reference patterns**: "like a settings panel", "similar to Slack"
5. **Ask for states**: "include hover states", "show loading state"
6. **Request data binding**: "use each loop for the list"
