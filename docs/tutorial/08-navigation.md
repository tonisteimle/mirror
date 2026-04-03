---
title: Navigation
subtitle: Tabs, Accordion, Collapsible und SideNav
prev: 07-functions
next: 09-overlays
---

Vier Komponenten für unterschiedliche Szenarien: **Tabs** wechseln zwischen Ansichten. **Accordion** hat mehrere aufklappbare Bereiche. **Collapsible** ist ein einzelner Toggle. **SideNav** ist eine vollständige Sidebar-Navigation.

Tabs und Accordion folgen dem gleichen Muster: Du definierst Items mit einem Label, die Kinder werden automatisch zum Content. Collapsible funktioniert anders – hier legst du Trigger und Content explizit fest. SideNav kombiniert Navigation mit View-Switching.

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
  Trigger: Frame hor, spread, pad 12, bg #1a1a1a, rad 8, cursor pointer
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

## Zusammenfassung

| Komponente | Pattern | Anwendung |
|------------|---------|-----------|
| `Tabs` + `Tab` | Label + Kinder → Content | Zwischen Ansichten wechseln |
| `Accordion` + `AccordionItem` | Label + Kinder → Content | Mehrere aufklappbare Bereiche |
| `Collapsible` | `Trigger:` + `Content:` | Ein einzelner Toggle |
| `SideNav` + `NavItem/NavGroup` | Items mit `navigate()` | Sidebar-Navigation |

**Tabs:** `defaultValue` · Slots: `List:`, `Indicator:`

**Accordion:** `multiple`, `icon` · Slots: `Item:`, `ItemTrigger:`, `ItemContent:`

**Collapsible:** `defaultOpen`

**SideNav:** `defaultValue`, `collapsed` · Slots: `Root:`, `Header:`, `Footer:`, `Item:`, `Group:`
