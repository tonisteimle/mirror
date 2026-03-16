# Tutorial: Navigation

Dieses Kapitel zeigt, wie du Multi-Page-Navigation in Mirror baust. Mirror ist eine Single-Page-Anwendung - Navigation bedeutet hier das Umschalten zwischen verschiedenen Inhalten.

## Das Konzept

In echten Anwendungen bleibt der Rahmen (Header, Sidebar, Footer) gleich - nur der Inhalt wechselt:

```
┌─────────────────────────────┐
│ Header                      │
├───────┬─────────────────────┤
│ Nav   │ Content ← wechselt  │
│ • Home│                     │
│   About                     │
└───────┴─────────────────────┘
```

Zwei Dinge müssen synchron sein:
1. **Content** - welche Seite ist sichtbar
2. **Navigation** - welches Item ist aktiv (selected)

## Einfache Navigation

Die einfachste Variante - alles manuell:

```mirror
App hor
  Sidebar ver, gap 8
    NavItem "Home"
      onclick show Home
      onclick hide About
      onclick select
      onclick deselect-siblings
    NavItem "About"
      onclick show About
      onclick hide Home
      onclick select
      onclick deselect-siblings

  Content
    Home "Willkommen!"
    About hidden, "Über uns"
```

Das funktioniert, aber ist umständlich und fehleranfällig.

## Mit dem Nav Primitiv

Das `Nav` Primitiv macht es einfacher:

```mirror
App hor
  Nav ver, gap 8
    NavItem "Home" route Home
    NavItem "About" route About

  Content
    Home "Willkommen!"
    About "Über uns"
```

**Was passiert hier:**
- `Nav` ist ein Container mit eingebauter Navigations-Logik
- `route Home` verknüpft das Item mit der Komponente `Home`
- Klick auf Item → zeigt `Home`, versteckt Geschwister, setzt `selected` State

## Wie route funktioniert

Die `route` Property macht drei Dinge:

1. **Zeigt die Ziel-Komponente** - `Home` wird sichtbar
2. **Versteckt Geschwister** - `About` wird hidden
3. **Setzt selected State** - Das geklickte Item bekommt `state selected`

```mirror
NavItem:
  pad 12, col #888
  state selected
    col white
    bg #3B82F6

Nav
  NavItem "Home" route Home      // Klick → Home sichtbar, NavItem selected
  NavItem "About" route About    // Klick → About sichtbar, NavItem selected
```

## Initial State

Die erste Seite ist automatisch sichtbar:

```mirror
Nav
  NavItem "Home" route Home      // ← Erstes Item hat initial selected
  NavItem "About" route About

Content
  Home "Startseite"              // ← Erstes Kind ist initial sichtbar
  About "Über uns"
```

Du kannst das ändern, indem du eine andere Seite als erstes Kind setzt oder explizit `hidden` verwendest.

## Navigation mit Gruppen

Für komplexere Navigationen mit Gruppen:

```mirror
Nav ver, gap 16
  Group "Main"
    NavItem "Dashboard" route Dashboard
    NavItem "Projekte" route Projects

  Group "Settings"
    NavItem "Profil" route Profile
    NavItem "Account" route Account

Content
  Dashboard ...
  Projects ...
  Profile ...
  Account ...
```

Die `route` Property funktioniert auch in verschachtelten Strukturen.

## Eigene Navigation definieren

Du kannst von `Nav` erben und eigene Styles definieren:

```mirror
Sidebar as Nav:
  ver, gap 8, pad 16
  bg #1a1a23

Sidebar
  NavItem "Home" route Home
  NavItem "Settings" route Settings
```

## Links außerhalb der Navigation

`route` funktioniert auch auf Elementen außerhalb des `Nav` Containers:

```mirror
Nav
  NavItem "Home" route Home
  NavItem "About" route About

Content
  Home
    Text "Willkommen!"
    Link "Mehr erfahren" route About    // ← Link zur About-Seite

  About
    Text "Über uns"
    Link "Zurück" route Home            // ← Link zurück
```

**Wichtig:** Elemente außerhalb von `Nav` bekommen keinen `selected` State - nur die Items innerhalb des Nav werden synchronisiert.

## Tabs mit Navigation

Das gleiche Prinzip funktioniert für Tabs:

```mirror
TabNav as Nav:
  hor, gap 0

Tab:
  pad 12 24
  state selected
    bor b 2 #3B82F6
    col #3B82F6

TabNav
  Tab "Übersicht" route Overview
  Tab "Details" route Details
  Tab "Aktivität" route Activity

Content
  Overview ...
  Details ...
  Activity ...
```

## Vollständiges Beispiel

Eine komplette App mit Header, Sidebar und Content:

```mirror
// Navigation Items
NavItem:
  pad 12 16, rad 6
  col #888
  cursor pointer
  state selected
    col white
    bg #3B82F6

// App Layout
App hor, height full
  // Sidebar
  Nav ver, gap 4, pad 16, bg #1a1a23, width 200
    NavItem "Dashboard" route Dashboard
    NavItem "Projekte" route Projects
    NavItem "Team" route Team
    NavItem "Einstellungen" route Settings

  // Main Content
  Main ver, width full
    Header hor, spread, pad 16, bg #0a0a0f
      Text "Mirror App" weight bold
      Avatar "U"

    Content pad 24
      Dashboard
        Text "Dashboard" font-size 24, weight bold
        Text "Willkommen zurück!"

      Projects
        Text "Projekte" font-size 24, weight bold
        Text "Deine Projekte..."

      Team
        Text "Team" font-size 24, weight bold
        Text "Team-Mitglieder..."

      Settings
        Text "Einstellungen" font-size 24, weight bold
        Text "App-Einstellungen..."

App
```

## Zusammenfassung

| Element | Beschreibung |
|---------|--------------|
| `Nav` | Container-Primitiv für Navigation |
| `route X` | Verknüpft Element mit Ziel-Komponente X |
| Klick-Verhalten | Zeigt Ziel, versteckt Geschwister, setzt `selected` |
| Vererbung | `MyNav as Nav:` erstellt eigene Navigation |
| Externe Links | `route` funktioniert überall, aber ohne `selected`-Sync |

## Unterschied zu Dropdown

| Dropdown | Navigation |
|----------|------------|
| `onclick toggle` | `route X` |
| `if (open)` | Automatisch durch `route` |
| `selection $var` | Eingebaut in `Nav` |
| Ein Container | Trennung Nav ↔ Content |
