---
title: Navigation
subtitle: Tabs, Accordion, Collapsible, SideNav, Steps, Pagination und TreeView
prev: 07-functions
next: 09-overlays
---

Sieben Komponenten für Navigation und Struktur: **Tabs** wechseln zwischen Ansichten. **Accordion** hat mehrere aufklappbare Bereiche. **Collapsible** ist ein einzelner Toggle. **SideNav** ist eine Sidebar-Navigation. **Steps** führt durch Wizard-Prozesse. **Pagination** navigiert durch Seiten. **TreeView** zeigt hierarchische Strukturen.

Tabs, Accordion und Steps folgen dem gleichen Muster: Du definierst Items mit einem Label, die Kinder werden automatisch zum Content. Collapsible funktioniert anders – hier legst du Trigger und Content explizit fest. SideNav kombiniert Navigation mit View-Switching.

## Tabs

Ein `Tab` braucht zwei Dinge: ein Label (der Text im Tab-Header) und einen `value` (die ID). Mit `defaultValue` auf dem `Tabs`-Container bestimmst du, welcher Tab beim Start aktiv ist:

```mirror
Tabs defaultValue "home"
  Tab "Home", value "home"
    Text "Welcome to the home page"
  Tab "Profile", value "profile"
    Text "Your profile settings"
  Tab "Settings", value "settings"
    Text "Application settings"
```

Die Kinder jedes Tabs werden zum Panel-Content. Das erste Tab muss nicht "home" heißen – der `value` ist nur eine ID, die mit `defaultValue` übereinstimmen muss.

Für Custom-Styling gibt es zwei Slots: `List:` ist der Container um alle Tab-Header. `Indicator:` ist die Linie oder Fläche, die den aktiven Tab markiert:

```mirror
Tabs defaultValue "a"
  List: bg #1a1a1a, pad 4, rad 8, gap 4
  Indicator: bg #4f46e5, rad 6
  Tab "Dashboard", value "a"
    Text "Dashboard content"
  Tab "Analytics", value "b"
    Text "Analytics content"
```

## Accordion

Accordion funktioniert ähnlich wie Tabs: `AccordionItem` bekommt ein Label, die Kinder werden zum aufklappbaren Content. Der Unterschied: Mehrere Sections können existieren, und das Auf/Zuklappen passiert durch Klick auf den Header:

```mirror
Accordion
  AccordionItem "Section 1"
    Text "Content for section 1"
  AccordionItem "Section 2"
    Text "Content for section 2"
  AccordionItem "Section 3"
    Text "Content for section 3"
```

Standardmäßig kann nur ein Item offen sein – klickst du ein anderes, schließt sich das vorherige. Mit `multiple` können mehrere gleichzeitig offen bleiben. Das `icon`-Property ändert das Chevron zu einem anderen Icon:

```mirror
Accordion multiple, icon "plus"
  AccordionItem "Was ist Mirror?"
    Text "Eine DSL für rapid UI prototyping."
  AccordionItem "Wie installiere ich es?"
    Text "npm install mirror-lang"
  AccordionItem "Open Source?"
    Text "Ja, MIT Lizenz."
```

Die Styling-Slots heißen `Item:` (der ganze Bereich), `ItemTrigger:` (der klickbare Header) und `ItemContent:` (der aufklappbare Inhalt). Diese Styles gelten für alle Items:

```mirror
Accordion
  Item: bg #1a1a1a, rad 8, margin 0 0 4 0
  ItemTrigger: pad 16
  ItemContent: pad 0 16 16 16, col #888
  AccordionItem "Styled Section"
    Text "Content with custom padding"
  AccordionItem "Another Section"
    Text "Same styling applied"
```

## Collapsible

Collapsible ist für einen einzelnen auf/zuklappbaren Bereich. Anders als bei Tabs und Accordion definierst du hier `Trigger:` und `Content:` explizit als Slots – das gibt dir volle Kontrolle über beide Teile:

```mirror
Collapsible
  Trigger: Button "Toggle content"
  Content: Text "Hidden content revealed."
```

Der Trigger muss kein Button sein – du kannst beliebige Elemente verwenden. Mit `defaultOpen` startet der Bereich ausgeklappt:

```mirror
Collapsible defaultOpen
  Trigger: Frame hor, spread, ver-center, pad 12, bg #1a1a1a, rad 8, cursor pointer
    Text "Filter", weight 500
    Icon "chevron-down"
  Content: Frame ver, gap 8, pad 12, bg #1a1a1a, rad 0 0 8 8
    Text "Status: Aktiv", col #888
    Text "Kategorie: Alle", col #888
```

## SideNav

SideNav ist eine vollständige Sidebar-Navigation mit Tastatursteuerung, aufklappbaren Gruppen und automatischer View-Verlinkung.

```mirror
Frame hor, h 200
  SideNav defaultValue "dashboard", w 180
    NavItem "Dashboard", icon "home", value "dashboard", navigate(DashboardView)
    NavItem "Projects", icon "folder", value "projects", navigate(ProjectsView)
    NavItem "Settings", icon "settings", value "settings", navigate(SettingsView)

  Frame w full, pad 16
    DashboardView: Frame name DashboardView
      Text "Dashboard Content", col white
    ProjectsView: Frame name ProjectsView, hidden
      Text "Projects Content", col white
    SettingsView: Frame name SettingsView, hidden
      Text "Settings Content", col white
```

Mit `NavGroup` gruppierst du Items. Mit `collapsible` werden Gruppen auf-/zuklappbar:

```mirror
SideNav defaultValue "dashboard", w 200
  Header:
    Frame pad 12
      Text "My App", fs 14, weight bold

  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "3"

  NavGroup "Settings", collapsible, defaultOpen
    NavItem "Account", icon "user", value "account"
    NavItem "Security", icon "shield", value "security"

  Footer:
    Frame pad 12
      Text "v1.0.0", col #666, fs 11
```

Im `collapsed` Mode werden nur Icons angezeigt:

```mirror
SideNav defaultValue "dashboard", collapsed, w 56
  NavItem icon "home", value "dashboard"
  NavItem icon "folder", value "projects"
  NavItem icon "settings", value "settings"
  NavItem icon "user", value "profile"
```

Styling mit Slots – `Item:` styled alle NavItems, `Group:` die Gruppen:

```mirror
SideNav defaultValue "dashboard", w 220
  Root: bg #0a0a0a, bor 0 1 0 0, boc #1a1a1a
  Item: pad 10 14, rad 6, margin 2 8, col #888
  ItemBadge: bg #ef4444, col white, pad 2 6, rad 99, fs 10
  GroupLabel: pad 8 14, col #444, fs 10, uppercase

  NavItem "Dashboard", icon "home", value "dashboard"
  NavItem "Messages", icon "mail", value "messages", badge "5"
  NavGroup "Admin"
    NavItem "Users", icon "users", value "users"
    NavItem "Logs", icon "file-text", value "logs"
```

### Tastatursteuerung

| Taste | Aktion |
|-------|--------|
| `ArrowDown/Up` | Nächstes/Vorheriges Item |
| `ArrowRight/Left` | Gruppe öffnen/schließen |
| `Enter/Space` | Item aktivieren |
| `Home/End` | Erstes/Letztes Item |

---

## Steps

Step-Wizard für mehrstufige Prozesse wie Checkout, Onboarding oder Formulare.

```mirror
Steps defaultStep 1, count 3
  List: hor, gap 8, w full
  Item: hor, gap 8, ver-center
  Indicator: w 32, h 32, rad 99, bg #333, center, col white
    completed:
      bg #10b981
      Icon "check", ic white, is 16
    current:
      bg #2563eb
  Separator: h 1, bg #333, w full
    completed:
      bg #10b981

  Step "Account", value 1
    Frame gap 16, pad 16
      Text "Erstelle deinen Account", col white, fs 16, weight 500
      Input placeholder "E-Mail"
      Input placeholder "Passwort", type password
  Step "Profile", value 2
    Frame gap 16, pad 16
      Text "Vervollständige dein Profil", col white, fs 16, weight 500
      Input placeholder "Name"
      Input placeholder "Bio"
  Step "Confirm", value 3
    Frame gap 16, pad 16
      Text "Bestätigung", col white, fs 16, weight 500
      Text "Alle Daten sind vollständig.", col #888
```

### Mit Navigation-Buttons

```mirror
Steps defaultStep 1, count 3
  List: hor, gap 8, margin 0 0 16 0
  Indicator: w 28, h 28, rad 99, bg #333, center, col white, fs 12
    completed:
      bg #10b981
    current:
      bg #2563eb
  Separator: h 1, bg #333, w full

  Step "Step 1", value 1
    Text "Inhalt für Schritt 1", col white
  Step "Step 2", value 2
    Text "Inhalt für Schritt 2", col white
  Step "Step 3", value 3
    Text "Inhalt für Schritt 3", col white

  Frame hor, gap 8, margin 16 0 0 0
    PrevTrigger: Button "Zurück", pad 10 20, bg #333, col white, rad 6
      disabled:
        opacity 0.5
    NextTrigger: Button "Weiter", pad 10 20, bg #2563eb, col white, rad 6
```

### Vertikale Steps

```mirror
Steps defaultStep 2, count 4, orientation "vertical"
  List: gap 0
  Item: hor, gap 12
  Indicator: w 24, h 24, rad 99, bg #333, center, col white, fs 11
    completed:
      bg #10b981
    current:
      bg #2563eb
  Separator: w 1, h 40, bg #333, margin 0 0 0 12
    completed:
      bg #10b981
  Content: pad 0 0 16 12

  Step "Bestellung aufgegeben", value 1
    Text "12. März 2024, 14:32", col #888, fs 12
  Step "In Bearbeitung", value 2
    Text "Wird für Versand vorbereitet", col #888, fs 12
  Step "Versendet", value 3
    Text "Voraussichtliche Lieferung: 15. März", col #888, fs 12
  Step "Zugestellt", value 4
    Text "Noch nicht zugestellt", col #666, fs 12
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `step` | number | Aktueller Schritt (controlled) |
| `defaultStep` | number | Start-Schritt |
| `count` | number | Anzahl der Schritte |
| `linear` | boolean | Nur sequenziell navigierbar |
| `orientation` | "horizontal" \| "vertical" | Ausrichtung |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `List:` | Step-Liste |
| `Item:` | Einzelner Step-Header |
| `Trigger:` | Klickbarer Bereich |
| `Indicator:` | Nummer/Icon |
| `Separator:` | Linie zwischen Steps |
| `Content:` | Step-Inhalt |
| `PrevTrigger:` | Zurück-Button |
| `NextTrigger:` | Weiter-Button |
| `Progress:` | Fortschrittsanzeige |

### States

| State | Beschreibung |
|-------|--------------|
| `completed:` | Schritt abgeschlossen |
| `current:` | Aktueller Schritt |
| `incomplete:` | Noch nicht erreicht |

---

## Pagination

Seitennavigation für lange Listen oder Tabellen.

```mirror
Pagination defaultPage 1, count 100, pageSize 10
  Root: hor, gap 4, ver-center
  PrevTrigger: pad 8, bg #333, rad 4, col white
    disabled:
      opacity 0.5
    Icon "chevron-left", is 16
  Item: w 36, h 36, rad 4, bg #333, col white, center, cursor pointer
    hover:
      bg #444
    current:
      bg #2563eb
  NextTrigger: pad 8, bg #333, rad 4, col white
    disabled:
      opacity 0.5
    Icon "chevron-right", is 16
  Ellipsis: col #666
    "..."
```

### Kompakte Variante

```mirror
Pagination defaultPage 5, count 50, pageSize 10, siblingCount 1
  Root: hor, gap 8, ver-center
  PrevTrigger: Button "←", pad 8 12, bg #333, col white, rad 4
  Item: w 32, h 32, rad 4, col #888, center
    current:
      bg #2563eb
      col white
  Ellipsis: col #666
  NextTrigger: Button "→", pad 8 12, bg #333, col white, rad 4
```

### Mit Seiten-Info

```mirror
Frame gap 12
  Pagination defaultPage 3, count 150, pageSize 10
    Root: hor, gap 4
    PrevTrigger: Button "Zurück", pad 8 16, bg #333, col white, rad 4
    Item: w 36, h 36, rad 4, bg transparent, col #888
      hover:
        bg #333
      current:
        bg #2563eb
        col white
    NextTrigger: Button "Weiter", pad 8 16, bg #333, col white, rad 4

  Text "Seite 3 von 15 (150 Einträge)", col #666, fs 12
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `page` | number | Aktuelle Seite (controlled) |
| `defaultPage` | number | Start-Seite |
| `count` | number | Gesamt-Anzahl Items |
| `pageSize` | number | Items pro Seite |
| `siblingCount` | number | Sichtbare Nachbar-Seiten |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `PrevTrigger:` | Zurück-Button |
| `NextTrigger:` | Weiter-Button |
| `Item:` | Seiten-Button |
| `Ellipsis:` | "..." zwischen Seiten |

### States

| State | Beschreibung |
|-------|--------------|
| `current:` | Aktuelle Seite |
| `disabled:` | Button deaktiviert |

---

## TreeView

Hierarchische Baumstruktur für Dateisysteme, Kategorien oder verschachtelte Daten.

```mirror
TreeView defaultValue "src"
  Root: bg #1a1a1a, pad 8, rad 8, w 250
  Tree: gap 2
  Branch: gap 2
  BranchTrigger: hor, gap 8, pad 8, rad 4, cursor pointer, w full
    hover:
      bg #333
  BranchIndicator: col #888
    expanded:
      Icon "chevron-down", is 14
    collapsed:
      Icon "chevron-right", is 14
  BranchContent: pad 0 0 0 20
  Item: hor, gap 8, pad 8, rad 4, cursor pointer
    hover:
      bg #333
    selected:
      bg #2563eb

  TreeBranch "src", value "src", icon "folder"
    TreeItem "index.ts", value "index", icon "file"
    TreeItem "app.ts", value "app", icon "file"
    TreeBranch "components", value "components", icon "folder"
      TreeItem "Button.tsx", value "button", icon "file"
      TreeItem "Card.tsx", value "card", icon "file"
  TreeBranch "docs", value "docs", icon "folder"
    TreeItem "README.md", value "readme", icon "file"
  TreeItem "package.json", value "package", icon "file"
```

### Mit Icons nach Dateityp

```mirror
TreeView defaultValue "readme"
  Root: bg #111, pad 8, rad 8, w 280
  Branch: gap 1
  BranchTrigger: hor, gap 8, pad 6 8, rad 4, col white, fs 13
    hover:
      bg #252525
  BranchIndicator: col #666
  BranchContent: pad 0 0 0 16
  Item: hor, gap 8, pad 6 8, rad 4, col white, fs 13
    hover:
      bg #252525
    selected:
      bg #2563eb

  TreeBranch "project", value "project"
    Icon "folder", ic #f59e0b, is 16
    TreeBranch "src", value "src"
      Icon "folder", ic #f59e0b, is 16
      TreeItem "main.ts", value "main"
        Icon "file-code", ic #3b82f6, is 16
      TreeItem "styles.css", value "styles"
        Icon "file", ic #a855f7, is 16
    TreeItem "README.md", value "readme"
      Icon "file-text", ic #888, is 16
    TreeItem "package.json", value "pkg"
      Icon "file-json", ic #10b981, is 16
```

### Multi-Select

```mirror
TreeView multiple
  Root: bg #1a1a1a, pad 8, rad 8, w 220
  Item: hor, gap 8, pad 6 8, rad 4, col #888
    hover:
      bg #333
    selected:
      bg #2563eb33
      col white
  ItemIndicator: margin 0 0 0 auto
    Icon "check", ic #2563eb, is 14

  TreeItem "Dokumente", value "docs", icon "file"
  TreeItem "Bilder", value "images", icon "image"
  TreeItem "Videos", value "videos", icon "video"
  TreeItem "Musik", value "music", icon "music"
```

### Props

| Prop | Typ | Beschreibung |
|------|-----|--------------|
| `value` | string \| string[] | Ausgewählte Items |
| `defaultValue` | string \| string[] | Start-Auswahl |
| `multiple` | boolean | Mehrfachauswahl |
| `selectionMode` | "single" \| "multiple" | Auswahl-Modus |
| `expandedKeys` | string[] | Geöffnete Branches |
| `defaultExpandedKeys` | string[] | Start-geöffnete Branches |

### Slots

| Slot | Beschreibung |
|------|--------------|
| `Root:` | Container |
| `Tree:` | Baum-Container |
| `Branch:` | Verzweigung (hat Kinder) |
| `BranchTrigger:` | Klickbarer Branch-Header |
| `BranchContent:` | Branch-Kinder |
| `BranchIndicator:` | Expand/Collapse Icon |
| `Item:` | Blatt-Element (keine Kinder) |
| `ItemText:` | Item-Text |

### States

| State | Beschreibung |
|-------|--------------|
| `selected:` | Item ausgewählt |
| `expanded:` | Branch geöffnet |
| `collapsed:` | Branch geschlossen |

---

## Zusammenfassung

| Komponente | Pattern | Anwendung |
|------------|---------|-----------|
| `Tabs` + `Tab` | Label + Kinder → Content | Zwischen Ansichten wechseln |
| `Accordion` + `AccordionItem` | Label + Kinder → Content | Mehrere aufklappbare Bereiche |
| `Collapsible` | `Trigger:` + `Content:` | Ein einzelner Toggle |
| `SideNav` + `NavItem/NavGroup` | Items mit `navigate()` | Sidebar-Navigation |
| `Steps` + `Step` | Label + Kinder → Content | Wizard-Prozesse |
| `Pagination` | Page-Buttons | Seitennavigation |
| `TreeView` + `TreeBranch/TreeItem` | Hierarchische Items | Baumstrukturen |

**Tabs:** `defaultValue` · Slots: `List:`, `Indicator:`

**Accordion:** `multiple`, `icon` · Slots: `Item:`, `ItemTrigger:`, `ItemContent:`

**Collapsible:** `defaultOpen`

**SideNav:** `defaultValue`, `collapsed` · Slots: `Root:`, `Header:`, `Footer:`, `Item:`, `Group:`

**Steps:** `defaultStep`, `count`, `linear`, `orientation` · Slots: `List:`, `Indicator:`, `Separator:`, `Content:`

**Pagination:** `defaultPage`, `count`, `pageSize`, `siblingCount` · Slots: `PrevTrigger:`, `NextTrigger:`, `Item:`

**TreeView:** `defaultValue`, `multiple`, `expandedKeys` · Slots: `Branch:`, `BranchTrigger:`, `Item:`
