# Tutorial: Interaktives Dropdown

Dieses Kapitel zeigt, wie du ein vollständiges, interaktives Dropdown in Mirror baust. Wir gehen Schritt für Schritt vor und erklären jedes Sprachelement ausführlich.

## Was wir bauen

Ein Dropdown mit:
- Klick zum Öffnen/Schließen
- Tastaturnavigation (Pfeiltasten, Enter, Escape)
- Hover-Highlighting
- Auswahl mit visueller Rückmeldung
- Schließen bei Klick außerhalb

## Die Grundstruktur

Beginnen wir mit der einfachsten Version:

```mirror
Dropdown as frame:
  Trigger as frame:
    "Bitte wählen..."

  Menu as frame:
    Item "Option A"
    Item "Option B"
    Item "Option C"

Dropdown
```

Das ist nur die Struktur – noch keine Interaktion. Das Menu ist immer sichtbar.

## Initial State: `closed`

Ein Dropdown startet geschlossen. Dafür verwenden wir einen **Initial State**:

```mirror
Dropdown as frame:
  closed                      // ← Startet im Zustand "closed"

  Trigger as frame:
    "Bitte wählen..."

  Menu as frame:
    Item "Option A"
    Item "Option B"
    Item "Option C"
```

**Was `closed` bewirkt:**
- Setzt `data-state="closed"` auf dem Element
- Speichert intern `_initialState = "closed"`
- Das Element "weiß" jetzt, dass es ein Toggle-Element ist

**Unterstützte Initial States:**

| State | Gegenteil | Verwendung |
|-------|-----------|------------|
| `closed` | `open` | Dropdowns, Modals |
| `collapsed` | `expanded` | Accordions, Panels |

## Bedingte Sichtbarkeit: `if (open)`

Das Menu soll nur sichtbar sein, wenn das Dropdown offen ist:

```mirror
Dropdown as frame:
  closed

  Trigger as frame:
    "Bitte wählen..."

  if (open)                   // ← Nur sichtbar wenn state === "open"
    Menu as frame:
      Item "Option A"
      Item "Option B"
      Item "Option C"
```

**Was `if (open)` bewirkt:**
- Das Kind-Element bekommt `_visibleWhen = "open"`
- Bei State-Wechsel prüft die Runtime die Bedingung
- `display: none` wenn Bedingung nicht erfüllt

**Wichtig:** Die Klammern sind optional: `if open` funktioniert genauso.

**Komplexe Bedingungen sind möglich:**
```mirror
if (open && hasItems)         // Logisches UND
if (expanded || forceShow)    // Logisches ODER
```

## Toggle-Aktion: `onclick toggle`

Der Trigger soll das Dropdown öffnen und schließen:

```mirror
Dropdown as frame:
  closed
  onclick toggle              // ← Klick wechselt zwischen open/closed

  Trigger as frame:
    hor, spread, gap 8        // ← Horizontal mit Abstand, Inhalt verteilt
    pad 10 16, bg #333, rad 4
    cursor pointer
    col #ccc

    Label as text:
    Chevron as icon:
      is 16, col #888

    Label "Bitte wählen..."
    Chevron "chevron-down"    // ← Rechtsbündiges Chevron-Icon

  if (open)
    Menu as frame:
      Item "Option A"
```

**Was `onclick toggle` bewirkt:**
1. Registriert einen Click-Event-Handler
2. Bei Klick: prüft den aktuellen State
3. `closed` → `open`, `open` → `closed`
4. Setzt `data-state` entsprechend
5. Aktualisiert die Sichtbarkeit aller `if`-abhängigen Kinder

**Die `toggle` Aktion ist intelligent:**
- Bei `closed`/`open` States: wechselt zwischen diesen
- Bei `collapsed`/`expanded` States: wechselt zwischen diesen
- Sonst: wechselt `hidden` Attribut

## Klick außerhalb: `onclick-outside close`

Das Dropdown soll schließen, wenn der Benutzer woanders klickt:

```mirror
Dropdown as frame:
  closed
  onclick toggle
  onclick-outside close       // ← Schließt bei Klick außerhalb

  Trigger as frame:
    pad 10 16, bg #333, rad 4
```

**Was `onclick-outside close` bewirkt:**
1. Registriert einen globalen Click-Handler auf `document`
2. Prüft bei jedem Klick: `element.contains(event.target)`
3. Wenn Klick außerhalb: führt `close` Aktion aus
4. Handler wird bei Cleanup automatisch entfernt

**Die `close` Aktion:**
- Setzt den State auf `closed` (bei Toggle-Elementen)
- Anders als `hide`, das das Element komplett versteckt
- Das Element bleibt im DOM und kann wieder geöffnet werden

## Menu-Items definieren

Jetzt stylen wir die Items und machen sie interaktiv:

```mirror
Item as frame:
  pad 10 12, rad 4
  cursor pointer
  col #ccc
```

**`cursor pointer`:**
- Setzt `cursor: pointer` CSS
- Zeigt dem Benutzer, dass das Element klickbar ist

## Hover-Highlighting: `onhover highlight`

Items sollen beim Überfahren hervorgehoben werden:

```mirror
Item as frame:
  pad 10 12, rad 4
  cursor pointer
  col #ccc
  onhover highlight           // ← Highlight bei Hover

  state highlighted           // ← Style für highlighted State
    bg #444
```

**Was `onhover highlight` bewirkt:**
1. `mouseenter`: setzt `data-highlighted="true"` auf dem Element
2. `mouseleave`: entfernt `data-highlighted`
3. Wendet die Styles aus `state highlighted` an

**Der `state highlighted` Block:**
- Definiert CSS-Properties für den State
- Wird automatisch angewendet wenn `data-highlighted="true"`
- Basis-Styles werden beim Verlassen wiederhergestellt

## Auswahl: `onclick select`

Klick auf ein Item soll es auswählen:

```mirror
Item as frame:
  pad 10 12, rad 4
  cursor pointer
  col #ccc
  onhover highlight
  onclick select              // ← Wählt das Item aus

  state highlighted
    bg #444
  state selected              // ← Style für selected State
    bg #2563EB
    col white
```

**Was `onclick select` bewirkt:**
1. Setzt `data-selected="true"` auf dem Element
2. **Entfernt automatisch** `data-selected` von allen Geschwistern
3. Wendet die Styles aus `state selected` an
4. Speichert den Text des Elements (für Selection Binding)

**Wichtig:** `select` ist exklusiv – nur ein Element kann ausgewählt sein.

## Verkettete Aktionen: `onclick select, close`

Nach der Auswahl soll das Dropdown schließen:

```mirror
Item as frame:
  pad 10 12, rad 4
  cursor pointer
  col #ccc
  onhover highlight
  onclick select, close       // ← Zwei Aktionen mit Komma

  state highlighted
    bg #444
  state selected
    bg #2563EB
    col white
```

**Verkettung mit Komma:**
- Aktionen werden nacheinander ausgeführt
- `select` → Item wird ausgewählt
- `close` → Dropdown schließt
- Beliebig viele Aktionen möglich: `action1, action2, action3`

## Selection Binding: `selection variable`

Der ausgewählte Wert soll in einer Variable gespeichert werden:

```mirror
Dropdown as frame:
  closed
  onclick toggle
  selection selected         // ← Speichert Auswahl in selected

  Trigger as frame:
    pad 10 16, bg #333, rad 4
    cursor pointer
    col #ccc

  if (open)
    Menu as frame:
      Item as frame:
        onclick select, close
```

**Was `selection selected` bewirkt:**
1. Registriert `_selectionBinding = "selected"` auf dem Element
2. Bei `select` Aktion: speichert Text in `window._mirrorState.selected`
3. Variable ist für JavaScript-Logik verfügbar

**Verwendung in JavaScript:**
```javascript
// Zugriff auf den ausgewählten Wert
console.log(window._mirrorState.selected)  // → "Option A"
```

## Keyboard-Navigation: Der `keys` Block

Für professionelle Dropdowns brauchen wir Tastatursteuerung:

```mirror
Dropdown as frame:
  closed
  onclick toggle
  selection selected

  keys                        // ← Gruppierter Keyboard-Handler
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

  Trigger as frame:
    ...
```

**Was der `keys` Block bewirkt:**
1. Registriert einen `keydown` Event-Handler auf dem Element
2. Setzt `tabindex="0"` für Fokussierbarkeit
3. Mappt Tastennamen auf Aktionen

**Syntax im `keys` Block:**
```mirror
keys
  tastenname aktion
  tastenname aktion ziel
  tastenname aktion1, aktion2
```

**Unterstützte Tasten:**

| Tastenname | JavaScript Key |
|------------|----------------|
| `escape` | `Escape` |
| `enter` | `Enter` |
| `space` | ` ` |
| `tab` | `Tab` |
| `arrow-up` | `ArrowUp` |
| `arrow-down` | `ArrowDown` |
| `arrow-left` | `ArrowLeft` |
| `arrow-right` | `ArrowRight` |
| `backspace` | `Backspace` |
| `delete` | `Delete` |
| `home` | `Home` |
| `end` | `End` |

## Navigation-Aktionen: `highlight next/prev`

Pfeiltasten sollen durch die Items navigieren:

```mirror
keys
  arrow-down highlight next   // ← Nächstes Item highlighten
  arrow-up highlight prev     // ← Vorheriges Item highlighten
```

**Was `highlight next` bewirkt:**
1. Findet alle highlightbaren Items im Container
2. Sucht das aktuell highlighted Item
3. Bewegt den Highlight zum nächsten/vorherigen
4. Stoppt am Anfang/Ende (kein Wrap-around)

**Wie Items als "highlightbar" erkannt werden:**
- Haben `state highlighted` definiert (bevorzugt)
- Oder haben `cursor: pointer` Style

## Enter zum Auswählen: `select highlighted`

Enter soll das aktuell hervorgehobene Item auswählen:

```mirror
keys
  enter select highlighted, close
```

**Was `select highlighted` bewirkt:**
1. Findet das Element mit `data-highlighted="true"`
2. Führt `select` darauf aus
3. Die verkettete `close` Aktion schließt das Dropdown

## Das vollständige Dropdown

Alle Features zusammen:

```mirror
// Token-Definitionen (optional)
dropdown:
  bg: #1a1a23
  trigger-bg: #333
  item-hover: #444
  item-selected: #2563EB

// Item-Definition mit allen States
Item as frame:
  pad 10 12, rad 4
  cursor pointer
  col #ccc
  onhover highlight
  onclick select, close

  state highlighted
    bg dropdown.item-hover
  state selected
    bg dropdown.item-selected
    col white

// Trigger mit rechtsbündigem Chevron
Trigger as frame:
  hor, spread, gap 8
  pad 10 16, bg dropdown.trigger-bg, rad 4
  cursor pointer, col #ccc

  Label as text:
  Chevron as icon:
    is 16, col #888

// Dropdown-Definition
Dropdown as frame:
  closed
  onclick toggle
  onclick-outside close
  selection selected

  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

  if (open)
    Menu as frame:
      pad 4, bg dropdown.bg, rad 6
      bor 1 #444

      Item "Dashboard"
      Item "Einstellungen"
      Item "Profil"
      Item "Abmelden"

// Verwendung
Container pad 40, bg #0a0a0f, min-height 300
  Dropdown
    Trigger
      Label "Bitte wählen..."
      Chevron "chevron-down"
```

## Zusammenfassung der Sprachelemente

| Element | Zweck | Beispiel |
|---------|-------|----------|
| `closed` | Initial State | `closed` / `open` / `collapsed` / `expanded` |
| `if (state)` | Bedingte Sichtbarkeit | `if (open)` |
| `onclick toggle` | State wechseln | `onclick toggle` |
| `onclick-outside` | Klick außerhalb | `onclick-outside close` |
| `onhover highlight` | Hover-Highlighting | `onhover highlight` |
| `onclick select` | Auswahl | `onclick select, close` |
| `state name` | State-Styles | `state highlighted` / `state selected` |
| `selection var` | Selection Binding | `selection selected` |
| `keys` | Keyboard-Handler | `keys { escape close }` |
| `highlight next/prev` | Navigation | `arrow-down highlight next` |
| `select highlighted` | Highlighted auswählen | `enter select highlighted` |

## Wichtige Konzepte

**Implizites `self`:**
Bei diesen Aktionen ist `self` der Default-Target:
- `highlight` → `highlight self`
- `select` → `select self`
- `close` → `close self`

**State vs. Hidden:**
- `close` setzt State auf "closed" → Toggle funktioniert weiter
- `hide` versteckt Element komplett → kein Toggle mehr möglich

**Fokussierbarkeit:**
- `keys` Block setzt automatisch `tabindex="0"`
- Element muss fokussiert sein für Keyboard-Events
- Bei Klick auf Trigger wird Dropdown fokussiert
