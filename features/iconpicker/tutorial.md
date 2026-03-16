# Tutorial: Icon Picker

Der Icon Picker ist ein Feature des Mirror Playgrounds, das die Auswahl von Icons vereinfacht. Dieses Tutorial erklärt, wie du ihn verwendest.

## Icons in Mirror

Mirror unterstützt Icons als Primitive. Du kannst Lucide Icons direkt verwenden:

```mirror
Icon "home"
Icon "settings"
Icon "user"
```

## Icon-Komponenten definieren

Für wiederverwendbare Icons mit eigenen Styles:

```mirror
NavIcon as icon:
  icon-size 20
  icon-color #3B82F6

NavIcon "home"
NavIcon "settings"
NavIcon "user"
```

## Den Icon Picker öffnen

Der Icon Picker öffnet automatisch, wenn du:

1. Eine Icon-Komponente tippst
2. Ein Space danach eingibst

```
NavIcon |          ← Space drücken
        ↓
   [Icon Picker öffnet]
```

## Navigation im Picker

**Mit der Tastatur:**
- `↑` `↓` - Durch Icons navigieren
- `Enter` - Icon auswählen
- `Escape` - Picker schließen

**Mit der Maus:**
- Klick auf ein Icon wählt es aus

## Icons filtern

Tippe weiter, um Icons zu filtern:

```
NavIcon ho|        ← "ho" getippt
          ↓
   [Zeigt: home, hourglass, hotel, ...]
```

Die Filterung ist live - jeder Buchstabe aktualisiert die Liste.

## Icon einfügen

Nach der Auswahl wird der Icon-Name automatisch in Anführungszeichen gesetzt:

```
NavIcon "home"     ← Nach Enter
```

## Zuletzt verwendete Icons

Deine zuletzt verwendeten Icons erscheinen oben im Picker:

```
┌─────────────────────────────┐
│ Zuletzt verwendet           │
│ [home] [settings] [user]    │
├─────────────────────────────┤
│ Alle Icons                  │
│ [a-arrow-down] [a-arrow-up] │
│ ...                         │
└─────────────────────────────┘
```

- Maximal 12 Icons werden gespeichert
- Die Liste bleibt zwischen Sessions erhalten (localStorage)

## Icon Properties

Icons haben spezielle Properties:

```mirror
Icon "home"
  icon-size 24        // Größe in px
  icon-color #3B82F6  // Farbe
  icon-weight 2       // Strichstärke (1-3)
  fill                // Gefüllt statt outline
```

**Kurzformen:**

| Property | Kurzform |
|----------|----------|
| `icon-size` | `is` |
| `icon-color` | `ic` |
| `icon-weight` | `iw` |

## Material Icons

Für Material Icons statt Lucide:

```mirror
Icon "home" material
```

## Vollständiges Beispiel

```mirror
// Icon-Komponenten definieren
SmallIcon as icon:
  icon-size 16
  icon-color #888

LargeIcon as icon:
  icon-size 32
  icon-color #3B82F6

// Verwendung
Nav hor, gap 16
  SmallIcon "home"
  SmallIcon "settings"
  SmallIcon "user"

Feature cen
  LargeIcon "rocket"
  Text "Schnell starten"
```

## Tastenkürzel Übersicht

| Taste | Aktion |
|-------|--------|
| `Space` | Picker öffnen (nach Icon-Komponente) |
| `↑` `↓` | Navigieren |
| `Enter` | Auswählen |
| `Escape` | Abbrechen |
| Tippen | Filtern |

## Tipps

1. **Schnelles Suchen**: Tippe direkt nach dem Space den Icon-Namen
2. **Zuletzt verwendet**: Häufige Icons sind immer oben
3. **Tab-Completion**: Der Picker funktioniert wie Autocomplete

## Fehlerbehandlung

Wenn ein Icon nicht gefunden wird:
- Im Preview wird der Icon-Name als Text angezeigt
- Prüfe die Schreibweise (lowercase, mit Bindestrichen)
- Beispiel: `arrow-up` nicht `arrowUp`
