# Syntax-Vereinfachung: Funktionen als Properties

## Die Änderung

**Alt:** Events als verschachtelte Children
```mirror
Button "Save"
  onclick: save()

NavItem "Home"
  onclick: navigate(HomeView)
```

**Neu:** Funktionen direkt als Property (impliziert Klick)
```mirror
Button "Save", save()
NavItem "Home", navigate(HomeView)
```

## Begründung

1. **Klick ist der Default-Event** - 90% aller Interaktionen sind Klicks
2. **Flachere Struktur** - Keine unnötige Verschachtelung
3. **Deklarativer** - Die Aktion ist direkt sichtbar
4. **Konsistent mit Funktions-Philosophie** - Events sind Funktionsaufrufe

## Regeln

| Syntax | Bedeutung |
|--------|-----------|
| `Button "X", toggle()` | Bei Klick: toggle() |
| `Button "X", navigate(Y)` | Bei Klick: navigate(Y) |
| `Button "X", save()` | Bei Klick: save() |
| `Input, onenter search()` | Bei Enter: search() |
| `Input, onkeydown escape clear()` | Bei Escape: clear() |

**Regeln:**
1. Funktion als Property = onclick impliziert (Klick ist Default)
2. Andere Events: `onevent function()` – ohne Doppelpunkt, wie alle Properties
3. Event + Wert = Property-Name, Funktion = Property-Wert

**Konsistenz mit anderen Properties:**
```mirror
bg #333                      // Property + Wert
pad 12 24                    // Property + Wert
toggle()                     // Funktion (impliziert onclick)
onenter search()             // Event + Funktion
onkeydown escape clear()     // Event + Taste + Funktion
```

Kein Doppelpunkt – Events sind Properties wie alle anderen.

## Event-Shorthands

| Shorthand | Entspricht |
|-----------|------------|
| `onenter` | `onkeydown enter` |
| `onescape` | `onkeydown escape` |
| `onspace` | `onkeydown space` |
| `onhover` | `onmouseenter` |

## Zusammenfassung

| Alt | Neu |
|-----|-----|
| `onclick: toggle()` | `toggle()` |
| `onclick: navigate(X)` | `navigate(X)` |
| `onkeydown enter: search()` | `onenter search()` |
| `onkeydown escape: clear()` | `onescape clear()` |

## Betroffene Bereiche

### 1. Parser (`compiler/parser/parser.ts`)
- [ ] Funktionsaufrufe als Property-Werte erkennen
- [ ] `funktionName(args)` als gültigen Property-Wert akzeptieren
- [ ] AST-Node für impliziten onclick generieren

### 2. IR Transformation (`compiler/ir/index.ts`)
- [ ] Funktions-Properties in Event-Handler umwandeln
- [ ] Bestehende `onclick:` Syntax weiterhin unterstützen (Abwärtskompatibilität)

### 3. Tutorials
- [x] 00-intro.html - Intro-Beispiele aktualisiert
- [x] 06-states.html - onclick Beispiele vereinfacht
- [x] 07-functions.html - Alle Beispiele aktualisiert
- [x] 08-navigation.html - Keine Änderungen nötig (Zag-Komponenten)
- [x] 09-overlays.html - Keine Änderungen nötig (Zag-Komponenten)
- [x] 13-fehler.html - Fehler-Beispiele aktualisiert
- [x] CLAUDE.md - Syntax-Dokumentation vollständig aktualisiert

### 4. Tests
- [ ] Neue Parser-Tests für Funktionen als Properties
- [ ] Bestehende Tests anpassen
- [ ] Abwärtskompatibilität testen

## Abwärtskompatibilität

Die alte Syntax bleibt gültig:
```mirror
// Alt - funktioniert weiterhin
Button "X"
  onclick: toggle()

// Neu - bevorzugt
Button "X", toggle()

// Alt - funktioniert weiterhin
Input
  onkeydown enter: search()

// Neu - bevorzugt
Input, onenter search()
```

## Migration

Keine Breaking Changes. Alte Syntax bleibt gültig. Neue Syntax ist die empfohlene.

## Beispiele nach der Änderung

### States (Kapitel 06)
```mirror
// Vorher
Btn: pad 12, bg #333, col white
  on:
    bg #2563eb
  onclick: toggle()

// Nachher
Btn: pad 12, bg #333, col white, toggle()
  on:
    bg #2563eb
```

### Navigation (Kapitel 07)
```mirror
// Vorher
NavItem "Home"
  onclick: navigate(HomeView)

// Nachher
NavItem "Home", navigate(HomeView)
```

### Overlays (Kapitel 09)
```mirror
// Vorher
Button "Open Dialog"
  onclick: showModal(ConfirmDialog)

// Nachher
Button "Open Dialog", showModal(ConfirmDialog)
```

### Keyboard Events (Kapitel 06)
```mirror
// Vorher
Input placeholder "Suche..."
  onkeydown enter: search()

// Nachher
Input placeholder "Suche...", onenter search()
// oder ausführlich:
Input placeholder "Suche...", onkeydown enter search()
```

## Entfernte Konzepte

- **`shows` Property** - Nicht mehr nötig, `navigate(X)` reicht
- **`value` bei SideNav** - Überflüssig wenn `navigate()` verwendet wird

## Entscheidungen

### Mehrere Aktionen bei Klick
Komma-separiert – alle werden nacheinander ausgeführt:
```mirror
Button "X", save(), close()
Button "Filter", toggle(), show(FilterPanel)
```

### Alte Syntax
Bleibt gültig für Abwärtskompatibilität, wird aber nicht mehr in Tutorials gezeigt.
