# Navigation

## Übersicht

Mirror unterstützt Single-Page-Navigation mit dem `Nav` Primitiv. Navigation ermöglicht das Umschalten zwischen verschiedenen Inhalten (Pages) während der Anwendungsrahmen bestehen bleibt.

## Konzept

Navigation in Mirror basiert auf zwei Elementen:

1. **Nav** - Ein Container-Primitiv das Navigations-Items gruppiert
2. **route** - Eine Property die ein Element mit einem Ziel verknüpft

Der `Nav`-Container synchronisiert alle seine Nachkommen die `route` haben. Beim Klick auf ein Element wird:
- Das Ziel sichtbar (Komponente oder geladene Seite)
- Das geklickte Element erhält den `selected` State

## Route-Typen

Mirror unterscheidet zwei Route-Typen anhand der Groß/Kleinschreibung:

| Schreibweise | Typ | Verhalten |
|--------------|-----|-----------|
| `route Home` | Komponenten-Route | Zeigt lokale Komponente `Home`, versteckt Geschwister |
| `route home` | Seiten-Route | Lädt `home.mirror`, rendert in Content-Bereich |

Diese Konvention folgt der Mirror-Regel: Komponenten sind immer PascalCase.

## DSL Syntax

```mirror
// Komponenten-Route (Großbuchstabe)
Nav
  Item "Home" route Home
  Item "About" route About

Content
  Home: ...
  About: ...

// Seiten-Route (Kleinbuchstabe)
Nav
  Item "Home" route home        // lädt home.mirror
  Item "About" route about      // lädt about.mirror
  Item "Contact" route contact  // lädt contact.mirror

Content named PageContent       // Hier wird die Seite gerendert

// Gemischt
Nav
  Item "Dashboard" route Dashboard  // lokale Komponente
  Item "Settings" route settings    // externe Seite

// Pfade für Seiten
Nav
  Item "Users" route admin/users    // lädt admin/users.mirror
  Item "Logs" route admin/logs      // lädt admin/logs.mirror

// Eigene Navigation definieren
MainNav as Nav:
  vertical, gap 8, pad 16

MainNav
  Item "Home" route home
  Item "About" route about
```

## Nav Primitiv

| Aspekt | Beschreibung |
|--------|--------------|
| Typ | Eingebautes Primitiv (wie Input, Button, etc.) |
| Verhalten | Synchronisiert `selected` State aller Nachkommen mit `route` |
| Vererbung | `MyNav as Nav:` erstellt eigene Navigation-Komponente |

## route Property

| Aspekt | Beschreibung |
|--------|--------------|
| Syntax | `route Target` |
| Großbuchstabe | `route Home` → Komponenten-Route (lokal) |
| Kleinbuchstabe | `route home` → Seiten-Route (lädt home.mirror) |
| Pfade | `route admin/users` → lädt admin/users.mirror |
| State | Element erhält `selected` State wenn seine Route aktiv ist |
| Scope | Muss innerhalb eines `Nav`-Containers sein für selected-Synchronisation |

## Verhalten

### Komponenten-Route (Großbuchstabe)

**Beim Klick auf ein Element mit `route Home`:**
1. Finde die Komponente Home
2. Zeige Home (`hidden = false`)
3. Verstecke alle Geschwister von Home (`hidden = true`)
4. Setze `selected` State auf das geklickte Element
5. Entferne `selected` State von allen anderen Elementen im selben `Nav`

### Seiten-Route (Kleinbuchstabe)

**Beim Klick auf ein Element mit `route home`:**
1. Lade `home.mirror` via `readFile`
2. Parse und kompiliere den Inhalt
3. Rendere das Ergebnis in den Content-Bereich (benanntes Element oder Standard-Container)
4. Setze `selected` State auf das geklickte Element
5. Entferne `selected` State von allen anderen Elementen im selben `Nav`

### Content-Bereich für Seiten

Für Seiten-Routes muss ein Ziel-Container definiert werden:

```mirror
Nav
  Item "Home" route home
  Item "About" route about

// Option 1: Benannter Container
Content named PageContent

// Option 2: Implizit erste Geschwister-Komponente nach Nav
Content
  // Seiten werden hier gerendert
```

### Initial-Zustand

- Bei Komponenten-Route: Die erste Ziel-Komponente ist sichtbar
- Bei Seiten-Route: Die erste Seite wird geladen
- Das erste Element mit `route` hat `selected` State

## Styling

Der `selected` State wird wie gewohnt gestylt:

```mirror
NavItem:
  pad 12, col #888
  state selected
    col white
    bg #3B82F6

Nav
  NavItem "Home" route Home
  NavItem "About" route About
```

## Externe Links

Elemente mit `route` außerhalb eines `Nav`-Containers funktionieren, aber ohne `selected`-Synchronisation:

```mirror
Nav
  Item "Home" route Home
  Item "About" route About

Footer
  Link "Home" route Home  // Funktioniert, aber kein selected State
```
