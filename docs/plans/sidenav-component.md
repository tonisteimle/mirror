# SideNav Component

## Übersicht

Eine Sidebar-Navigation für Mirror, implementiert wie Zag-Komponenten (HTML/CSS/JS unter der Haube, saubere Mirror-API).

## Verwendung

### Basis

```mirror
Frame hor, h full
  SideNav defaultValue "dashboard"
    NavItem "Dashboard", icon "home", value "dashboard", shows DashboardView
    NavItem "Settings", icon "settings", value "settings", shows SettingsView

  Frame w full
    DashboardView: Frame name DashboardView
      Text "Dashboard Content"
    SettingsView: Frame name SettingsView, hidden
      Text "Settings Content"
```

### Vollständiges Beispiel

```mirror
Frame hor, h full
  SideNav defaultValue "dashboard", w 240
    // Header (optional)
    Header:
      Frame pad 16
        Text "My App", fs 18, weight bold

    // Einfache Items
    NavItem "Dashboard", icon "home", value "dashboard", shows DashboardView
    NavItem "Projects", icon "folder", value "projects", shows ProjectsView, arrow
    NavItem "Messages", icon "mail", value "messages", shows MessagesView, badge "3"

    // Gruppe (nur visuell, nicht aufklappbar)
    NavGroup "Analytics"
      NavItem "Reports", icon "bar-chart", value "reports", shows ReportsView
      NavItem "Insights", icon "lightbulb", value "insights", shows InsightsView

    // Aufklappbare Gruppe
    NavGroup "Settings", collapsible, defaultOpen
      NavItem "Account", icon "user", value "account", shows AccountView
      NavItem "Security", icon "shield", value "security", shows SecurityView

    // Footer (optional)
    Footer:
      Frame pad 16
        Text "v1.0.0", col #666, fs 12

  // Content-Bereich
  Frame w full, pad 24
    DashboardView: Frame name DashboardView
      Text "Dashboard"
    ProjectsView: Frame name ProjectsView, hidden
      Text "Projects"
    // ... weitere Views
```

### Collapsed Mode (nur Icons)

```mirror
SideNav defaultValue "dashboard", collapsed, w 64
  NavItem icon "home", value "dashboard", shows DashboardView
  NavItem icon "folder", value "projects", shows ProjectsView
  NavItem icon "settings", value "settings", shows SettingsView
```

## API

### SideNav Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `defaultValue` | string | - | Welcher NavItem beim Start aktiv |
| `value` | string | - | Kontrollierter Wert |
| `collapsed` | boolean | false | Nur Icons anzeigen |
| `w` | number | 240 | Breite in Pixel |

### SideNav Slots (zum Stylen)

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container der gesamten Nav |
| `Header:` | Header-Bereich (optional) |
| `Footer:` | Footer-Bereich (optional) |
| `Item:` | Styling für alle NavItems |
| `ItemIcon:` | Icon in NavItems |
| `ItemLabel:` | Label-Text in NavItems |
| `ItemBadge:` | Badge/Chip in NavItems |
| `ItemArrow:` | Pfeil in NavItems |
| `Group:` | NavGroup Container |
| `GroupLabel:` | Gruppen-Überschrift |
| `GroupArrow:` | Pfeil bei collapsible Groups |
| `GroupContent:` | Inhalt der Gruppe |

### NavItem Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `value` | string | required | Eindeutige ID |
| `icon` | string | - | Icon-Name (Lucide) |
| `badge` | string | - | Badge-Text |
| `arrow` | boolean | false | Pfeil anzeigen |
| `shows` | ElementName | - | Welches Element anzeigen |
| `disabled` | boolean | false | Deaktiviert |

### NavGroup Props

| Prop | Typ | Default | Beschreibung |
|------|-----|---------|--------------|
| `collapsible` | boolean | false | Aufklappbar |
| `defaultOpen` | boolean | true | Startet offen (wenn collapsible) |

## Tastatursteuerung

| Taste | Aktion |
|-------|--------|
| `ArrowDown` | Nächstes Item fokussieren |
| `ArrowUp` | Vorheriges Item fokussieren |
| `ArrowRight` | Gruppe öffnen / in Gruppe navigieren |
| `ArrowLeft` | Gruppe schließen / aus Gruppe navigieren |
| `Enter` / `Space` | Item aktivieren |
| `Home` | Erstes Item fokussieren |
| `End` | Letztes Item fokussieren |

## Styling-Beispiel

```mirror
SideNav defaultValue "dashboard"
  Root: bg #0a0a0a, bor 0 1 0 0, boc #1a1a1a
  Item: pad 12 16, rad 8, margin 2 8, col #888
  ItemIcon: is 20, ic #666
  ItemBadge: bg #ef4444, col white, pad 2 8, rad 99, fs 11
  Group: margin 16 0 0 0
  GroupLabel: pad 8 16, col #444, fs 11, uppercase

  NavItem "Dashboard", icon "home", value "dashboard", shows DashboardView
  NavGroup "Admin"
    NavItem "Users", icon "users", value "users", shows UsersView
```

## States

### NavItem States

| State | Beschreibung |
|-------|--------------|
| `selected` | Aktuell aktives Item |
| `hover` | Maus darüber |
| `focus` | Tastatur-Fokus |
| `disabled` | Deaktiviert |

```mirror
SideNav defaultValue "dashboard"
  Item: pad 12 16, col #888
    selected:
      bg #1a1a1a
      col white
    hover:
      bg #151515
    focus:
      outline 2, outlineColor #2563eb

  NavItem "Dashboard", icon "home", value "dashboard", shows DashboardView
```

### NavGroup States (wenn collapsible)

| State | Beschreibung |
|-------|--------------|
| `open` | Gruppe ist geöffnet |
| `closed` | Gruppe ist geschlossen |

## Events

| Event | Beschreibung |
|-------|--------------|
| `onchange` | Wenn ein anderes Item ausgewählt wird |

```mirror
SideNav defaultValue "dashboard", onchange: handleNavChange()
  NavItem "Dashboard", value "dashboard", shows DashboardView
```

## Implementierungsdetails

### Struktur (generiertes HTML)

```html
<nav data-zag-component="sidenav" role="navigation">
  <!-- Header Slot -->
  <div data-slot="Header">...</div>

  <!-- Items -->
  <div data-slot="ItemList" role="menubar">
    <a data-slot="Item" data-value="dashboard" role="menuitem" tabindex="0" aria-current="page">
      <span data-slot="ItemIcon">...</span>
      <span data-slot="ItemLabel">Dashboard</span>
      <span data-slot="ItemBadge">3</span>
      <span data-slot="ItemArrow">...</span>
    </a>

    <!-- Group -->
    <div data-slot="Group">
      <div data-slot="GroupLabel">Admin</div>
      <div data-slot="GroupContent">
        <a data-slot="Item" ...>...</a>
      </div>
    </div>
  </div>

  <!-- Footer Slot -->
  <div data-slot="Footer">...</div>
</nav>
```

### Verlinkung (shows)

Die `shows` Property funktioniert wie `navigate()`:

1. NavItem wird geklickt
2. Runtime findet Element mit `name` = shows-Wert
3. Alle Geschwister-Views werden `hidden`
4. Ziel-View wird `visible`

```javascript
// Runtime-Logik (vereinfacht)
function selectNavItem(value, showsTarget) {
  // 1. Update active state
  allItems.forEach(item => item.removeAttribute('aria-current'))
  activeItem.setAttribute('aria-current', 'page')

  // 2. Show/hide views
  const target = document.querySelector(`[data-mirror-name="${showsTarget}"]`)
  if (target) {
    // Hide siblings
    target.parentElement.querySelectorAll('[data-mirror-name]').forEach(el => {
      el.style.display = 'none'
    })
    // Show target
    target.style.display = ''
  }
}
```

## Dateien zu erstellen/ändern

1. `compiler/schema/zag-primitives.ts` - SideNav Definition hinzufügen
2. `compiler/backends/dom.ts` - `emitSideNavComponent()` implementieren
3. `compiler/runtime/dom-runtime-string.ts` - `initSideNavComponent()` implementieren
4. `compiler/ir/index.ts` - Falls Parser-Anpassungen nötig
5. `tests/compiler/sidenav.test.ts` - Tests
6. `docs/tutorial/` - Tutorial-Kapitel (optional)
