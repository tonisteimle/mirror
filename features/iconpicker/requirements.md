# Icon Picker

## Übersicht

Der Icon Picker ist ein Playground-Feature das beim Editieren von Icon-Komponenten eine visuelle Icon-Auswahl ermöglicht.

## Feature-Status

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Space öffnet Picker | ✅ Funktioniert | Nach Icon-Komponente öffnet Space den Picker |
| Tippen filtert Icons | ✅ Funktioniert | Eingabe im Editor filtert die Icon-Liste |
| Pfeiltasten navigieren | ✅ Funktioniert | ↑↓ navigieren durch die Liste |
| Enter wählt aus | ✅ Funktioniert | Enter fügt das ausgewählte Icon ein |
| Klick wählt aus | ✅ Funktioniert | Klick auf Icon fügt es ein |
| Escape schließt | ✅ Funktioniert | Escape schließt den Picker |
| Zuletzt verwendet | ✅ Funktioniert | Letzte Icons werden oben angezeigt |
| Icons im Preview | ✅ Funktioniert | Icons werden korrekt gerendert |

## Trigger

Der Icon-Picker öffnet automatisch wenn:
1. Eine Komponente vom Typ `icon` erkannt wird (z.B. `MyIcon as icon:`)
2. Der User nach dem Komponenten-Namen ein Space tippt (`MyIcon `)

**Erkennung:** Der Editor baut beim Compile eine Map `componentName → primitive`. Bei Space-Eingabe wird geprüft, ob die Komponente vor dem Cursor ein Icon ist.

## Verhalten

### Fokus

- Fokus bleibt im Editor
- Der Cursor bleibt aktiv
- User kann direkt tippen

### Filterung

- Eingabe im Editor filtert die Icon-Liste
- Beispiel: `MyIcon ho` zeigt nur Icons die "ho" enthalten (home, hourglass, ...)

### Navigation

- Cursor-Tasten (↑↓) navigieren durch die Icon-Liste
- Es ist immer ein Icon ausgewählt (highlighted)

### Auswahl

| Taste | Aktion |
|-------|--------|
| Enter | Fügt das ausgewählte Icon ein, schließt Picker |
| Space | Schließt Picker ohne Auswahl (Text bleibt wie getippt) |
| Escape | Schließt Picker, verwirft Eingabe |
| Klick | Fügt das angeklickte Icon ein, schließt Picker |

### Einfügen

- Icon-Name wird ohne Anführungszeichen eingegeben
- Nach Bestätigung wird der Name in Anführungszeichen gesetzt: `MyIcon "home"`

## UI

- Grid-Layout mit Icon-Vorschau
- Aktuell ausgewähltes Icon hervorgehoben
- Kein Suchfeld-Indikator, Eingabe findet im Editor statt
- Icon-Name als Tooltip

## Zuletzt verwendet

- Zuletzt verwendete Icons werden oben im Picker angezeigt (eigene Sektion)
- Persistierung in localStorage
- Maximal 12 Icons (eine Zeile im Grid)
- Bei Auswahl eines Icons wird es an den Anfang der Liste gesetzt
- Initial (ohne History) wird die Sektion nicht angezeigt

## DSL Integration

```mirror
// Icon Primitive direkt
Icon "home"

// Benutzerdefinierte Icon-Komponente
NavIcon as icon:
  icon-size 24
  icon-color #3B82F6

NavIcon "settings"
NavIcon "user"
```

### Icon Properties

| Property | Alias | Beschreibung | Default |
|----------|-------|--------------|---------|
| `icon-size` | `is` | Größe in px | 24 |
| `icon-color` | `ic` | Farbe (überschreibt color) | currentColor |
| `icon-weight` | `iw` | Strichstärke (1-3) | 2 |
| `fill` | - | Icon gefüllt (boolean) | false |
| `material` | - | Material Icons statt Lucide | false |

## Performance

- Icon-Liste wird einmalig geladen (statisch oder von CDN-Manifest)
- Filterung ist client-seitig, O(n) mit n = ~1500 Icons
- Primitive-Map wird beim Compile erstellt (bereits debounced)
- Zuletzt verwendet: localStorage Zugriff nur beim Öffnen/Schließen des Pickers
