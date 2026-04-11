# Editor Use Cases

Wie sich der Editor beim Schreiben von Mirror-Code verhält.

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SCHREIBEN IM EDITOR                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Tippen        → Autocomplete erscheint, passt sich an, verschwindet│
│  Enter         → Vorschlag übernehmen                                │
│  Escape        → Vorschlag ignorieren, weiter tippen                 │
│  # $ Space     → Picker öffnet, Auswahl, nahtlos weiter              │
│  Doppelklick   → Wert bearbeiten (z.B. Farbe ändern)                │
│                                                                      │
│  → Der Flow wird nie unterbrochen                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Flüssiges Schreiben

### UC-01: Autocomplete kommt und geht, stört aber nicht

**Das Erlebnis:** Du tippst einfach los. Autocomplete erscheint mit Vorschlägen, aber du kannst ignorieren und weitertippen. Es verschwindet von selbst wenn es nicht mehr passt.

```
Du tippst:
  F r a m e   g a p   8
  ↑           ↑
  Autocomplete    Autocomplete zeigt "gap"
  zeigt "Frame"   Du tippst "8" → verschwindet

Du hast nie angehalten. Der Text ist fertig:
  Frame gap 8
```

| Verhalten | Was passiert |
|-----------|--------------|
| Tippen | Autocomplete filtert mit, zeigt passende Vorschläge |
| Weiter tippen | Vorschlag wird ignoriert, Autocomplete passt sich an |
| Nichts passt mehr | Autocomplete verschwindet automatisch |
| Leertaste/Komma | Autocomplete schließt, du tippst normal weiter |

---

### UC-02: Vorschlag mit Enter übernehmen

**Das Erlebnis:** Autocomplete zeigt was du willst. Enter drücken, fertig, weiter geht's.

```
Du tippst:
  Button "OK", bg #2271C1, pa|
                             ↑
  Autocomplete zeigt:
  ┌─────────────────┐
  │ pad       ←     │  ← Ausgewählt
  │ padding         │
  └─────────────────┘

Du drückst Enter:
  Button "OK", bg #2271C1, pad |
                               ↑
                          Cursor hier, bereit für Wert
```

| Aktion | Ergebnis |
|--------|----------|
| Enter | Vorschlag wird eingefügt, Cursor dahinter |
| Tab | Wie Enter |
| Escape | Autocomplete schließt, dein getippter Text bleibt |
| Weiter tippen | Autocomplete filtert, oder verschwindet |

---

### UC-03: Autocomplete passt sich dem Kontext an

**Das Erlebnis:** Je nachdem wo du bist, zeigt Autocomplete nur das was dort Sinn macht.

```
Am Zeilenanfang → Komponenten:
  |
  ┌─────────────────┐
  │ Frame           │
  │ Button          │
  │ Text            │
  └─────────────────┘

Nach Komponenten-Name → Properties:
  Button |
         ┌─────────────────┐
         │ bg              │
         │ col             │
         │ pad             │
         └─────────────────┘

Nach Property → Werte:
  Frame hor, align |
                   ┌─────────────────┐
                   │ top             │
                   │ center          │
                   │ bottom          │
                   └─────────────────┘

Nach Event → Actions:
  Button onclick |
                 ┌─────────────────┐
                 │ show(Target)    │
                 │ hide(Target)    │
                 │ toggle()        │
                 └─────────────────┘
```

| Position | Was erscheint |
|----------|---------------|
| Zeilenanfang | Komponenten (Frame, Button, Text, ...) |
| Nach Komponente | Properties (bg, col, pad, ...) |
| Nach Komma | Properties |
| Nach Property | Werte für diese Property |
| Nach Event | Actions (show, hide, toggle, ...) |
| Unter Zag-Komponente | Slots dieser Komponente |

---

### UC-04: Deine Komponenten erscheinen im Autocomplete

**Das Erlebnis:** Du definierst eine Komponente, und sie taucht sofort in den Vorschlägen auf – ganz oben.

```
Du hast definiert:
  PrimaryBtn: Button bg #2271C1, col white, pad 10 20

Später tippst du:
  Pri|
  ┌─────────────────────────┐
  │ PrimaryBtn    user  ←   │  ← Deine Komponente, zuerst!
  │ ProgressBar             │
  └─────────────────────────┘
```

| Was du definierst | Erscheint als |
|-------------------|---------------|
| `MyButton:` | "MyButton" mit Label "user" |
| `Card:` | "Card" mit Label "user" |
| `DangerBtn as Button:` | "DangerBtn" mit Label "user" |

Funktioniert auch für:
- Tokens (`primary.bg: #2271C1` → `$primary` im Token-Picker)
- Named Elements (`Frame name Header` → "Header" als Target für show/hide)

---

## 2. Picker (Farbe, Icon, Token, Animation)

### UC-05: Color Picker – tippe # und wähle

**Das Erlebnis:** Du tippst `bg #` und der Color Picker öffnet. Du wählst eine Farbe, Picker schließt, du tippst sofort weiter.

```
Du tippst:
  Button "OK", bg #|
                   ↑
  Color Picker öffnet:
  ┌───────────────────────────────────────┐
  │  ┌───┬───┬───┬───┬───┬───┬───┬───┐   │
  │  │   │   │ ▓ │   │   │   │   │   │   │ ← Pfeiltasten navigieren
  │  └───┴───┴───┴───┴───┴───┴───┴───┘   │
  │  Recent: #2271C1  #ef4444             │
  └───────────────────────────────────────┘

Du drückst Enter (oder klickst):
  Button "OK", bg #2271C1|
                         ↑
                    Cursor hier, bereit für nächste Property
```

| Aktion | Ergebnis |
|--------|----------|
| Pfeiltasten | Navigieren im Grid |
| Enter/Klick | Farbe einfügen, Picker schließt |
| Escape | Picker schließt, `#` wird entfernt |
| Weiter tippen | Filtert Farben (z.B. "ff" zeigt nur #ff...) |
| Außerhalb klicken | Picker schließt |

---

### UC-06: Color Picker – Doppelklick zum Ändern

**Das Erlebnis:** Eine Farbe steht schon da. Doppelklick drauf, Picker öffnet mit dieser Farbe, du wählst neu.

```
Bestehender Code:
  Button "OK", bg #2271C1, col white
                  ↑
           Doppelklick hier

Color Picker öffnet:
  - Die aktuelle Farbe (#2271C1) ist markiert
  - Du wählst eine neue
  - Die alte wird ersetzt

Ergebnis:
  Button "OK", bg #ef4444, col white
                  ↑
           Ersetzt, nicht eingefügt
```

---

### UC-07: Icon Picker – Space nach Icon

**Das Erlebnis:** Du tippst `Icon ` (mit Space) und der Icon Picker öffnet.

```
Du tippst:
  Icon |
       ↑
  Icon Picker öffnet:
  ┌───────────────────────────────────────┐
  │  Suche: [         ]                   │
  │  ┌─────┬─────┬─────┬─────┬─────┐     │
  │  │ ★   │ ♥   │ ✓   │ ✗   │ ⚙   │     │
  │  │star │heart│check│ x   │sett.│     │
  │  └─────┴─────┴─────┴─────┴─────┘     │
  │  Recent: star, check, user            │
  └───────────────────────────────────────┘

Du tippst "che" → Filter zeigt nur "check", "check-circle", ...
Enter:
  Icon "check"|
              ↑
         Cursor hier, mit Quotes drumrum
```

| Aktion | Ergebnis |
|--------|----------|
| Tippen | Live-Filter der Icons |
| Enter | Icon-Name in Quotes eingefügt |
| Pfeiltasten | Navigieren |
| Escape | Picker schließt |

---

### UC-08: Token Picker – tippe $ und wähle

**Das Erlebnis:** Du tippst `$` und siehst deine definierten Tokens.

```
Deine Tokens:
  primary.bg: #2271C1
  danger.bg: #ef4444
  card.rad: 8

Du tippst:
  Button bg $|
             ↑
  Token Picker zeigt nur .bg Tokens (passt zum Kontext!):
  ┌─────────────────────────┐
  │ $primary    #2271C1     │
  │ $danger     #ef4444     │
  └─────────────────────────┘

Enter:
  Button bg $primary|
```

| Besonderheit | Verhalten |
|--------------|-----------|
| Kontext-Filter | Nach `bg $` zeigt nur `.bg` Tokens |
| Nach `rad $` | Zeigt nur `.rad` Tokens |
| Alle Tokens | Werden live aus deinem Code extrahiert |

---

### UC-09: Nach Picker-Auswahl direkt weiterarbeiten

**Das Erlebnis:** Picker schließt, Cursor ist genau da wo du weiter tippen willst.

```
Vorher:
  Button "OK", bg |

Nach Color Picker:
  Button "OK", bg #2271C1|
                         ↑
                    Cursor hier

Du tippst direkt weiter:
  Button "OK", bg #2271C1, pad 10 20
```

| Nach Picker | Cursor-Position |
|-------------|-----------------|
| Color (#) | Direkt nach der Farbe |
| Icon | Nach dem schließenden Quote |
| Token ($) | Nach dem Token-Namen |
| Animation | Nach dem Animation-Namen |

Der Editor hat wieder Fokus – du musst nicht klicken.

---

## 3. Zag-Komponenten und Slots

### UC-10: Slot-Vorschläge unter Zag-Komponente

**Das Erlebnis:** Du bist unter einer Zag-Komponente eingerückt, Autocomplete zeigt die passenden Slots.

```
Du tippst:
  Dialog
    Tr|
      ↑
  Autocomplete zeigt Dialog-Slots:
  ┌─────────────────────────┐
  │ Trigger:     slot   ←   │  ← Slots zuerst!
  │ Content:     slot       │
  │ Backdrop:    slot       │
  │ Title:       slot       │
  └─────────────────────────┘

Nach Enter:
  Dialog
    Trigger:|
```

| Parent | Slots die erscheinen |
|--------|---------------------|
| Dialog | Trigger:, Content:, Backdrop:, Title:, ... |
| Tabs | List:, Trigger:, Content:, Indicator:, ... |
| Select | Trigger:, Content:, Item:, ... |

---

### UC-11: Item-Keywords für Zag-Komponenten

**Das Erlebnis:** Unter einer Zag-Komponente wie Select erscheinen auch die Item-Keywords.

```
Du tippst:
  Select
    Op|
      ↑
  Autocomplete zeigt:
  ┌─────────────────────────┐
  │ Option       item   ←   │  ← Item-Keyword für Select
  └─────────────────────────┘

Ergebnis:
  Select
    Option "Erste Option", value "1"
```

| Zag-Komponente | Item-Keywords |
|----------------|---------------|
| Select | Option |
| RadioGroup | RadioItem |
| Tabs | Tab |
| Menu | MenuItem |

---

## 4. Navigation und Feedback

### UC-12: Klick in Preview → Editor springt zur Zeile

**Das Erlebnis:** Du klickst ein Element in der Preview, der Editor scrollt zur passenden Zeile.

```
Preview:                         Editor:
┌───────────────────┐           ┌────────────────────────┐
│                   │           │ 1: Frame gap 8         │
│  ┌─────────┐      │           │ 2:   Text "Titel"      │
│  │ Button  │←KLICK│  ───→     │ 3:   Button "OK" ← ──  │
│  └─────────┘      │           │ 4:   Text "Footer"     │
│                   │           └────────────────────────┘
└───────────────────┘                    ↑
                                    Editor scrollt hierhin
```

---

### UC-13: Cursor im Editor → Element wird in Preview hervorgehoben

**Das Erlebnis:** Du bewegst den Cursor im Code, das entsprechende Element wird in der Preview markiert.

```
Editor:                          Preview:
┌────────────────────────┐      ┌───────────────────┐
│ 1: Frame gap 8         │      │                   │
│ 2:   Text "Titel"      │      │  ┌─────────┐      │
│ 3:   Button "OK" ← ──  │ ───→ │  │ Button  │ ← ── │ HIGHLIGHT
│ 4:   Text "Footer"     │      │  └─────────┘      │
└────────────────────────┘      │                   │
         ↑                      └───────────────────┘
    Cursor auf Zeile 3
```

Das passiert mit kurzer Verzögerung (50ms), damit schnelles Scrollen nicht flackert.

---

### UC-14: Property-Panel ändert Code

**Das Erlebnis:** Du änderst einen Wert im Property-Panel, der Code aktualisiert sich automatisch.

```
Property Panel:                  Editor (vorher):
┌─────────────────────┐         Button "OK", bg #2271C1
│  Button             │
│  ──────────────     │         Editor (nachher):
│  bg: [#2271C1]→     │  ───→   Button "OK", bg #ef4444
│      [#ef4444]      │                        ↑
└─────────────────────┘                   Automatisch geändert
```

---

## 5. Spezialfälle

### UC-15: # in einem String wird ignoriert

**Das Erlebnis:** Du tippst `Text "Color is #ff0000"` – der Color Picker öffnet NICHT, weil du in einem String bist.

```
Du tippst:
  Text "Color is #|"
                  ↑
  → Kein Color Picker! Du bist in Quotes.

Das funktioniert korrekt:
  Text "Color is #ff0000"
```

---

### UC-16: Escape im Picker entfernt Trigger-Zeichen

**Das Erlebnis:** Du tippst `#`, Picker öffnet, du drückst Escape → das `#` wird auch entfernt.

```
Du tippst:
  Button bg #|
             ↑
  Color Picker offen

Escape:
  Button bg |
            ↑
       # wurde entfernt, du kannst anders weitermachen
```

Bei Icon-Picker (Space als Trigger) bleibt der Space, weil er Teil der Syntax sein könnte.

---

### UC-17: Backspace vor Trigger schließt Picker

**Das Erlebnis:** Du tippst `#abc`, dann Backspace bis vor das `#` → Picker schließt.

```
Du tippst:
  Button bg #ab|
               ↑
  Picker offen, zeigt Filter "ab"

Backspace, Backspace, Backspace:
  Button bg |
            ↑
  Cursor vor dem ehemaligen #, Picker geschlossen
```

---

## Zusammenfassung

### Kern-Prinzipien

| Prinzip | Umsetzung |
|---------|-----------|
| **Nicht unterbrechen** | Autocomplete kommt/geht automatisch, man kann ignorieren |
| **Kontext verstehen** | Zeigt nur was an dieser Stelle Sinn macht |
| **Nahtlos weiter** | Nach Picker-Auswahl: Fokus zurück, Cursor richtig platziert |
| **Eigene Definitionen** | User-Komponenten und Tokens erscheinen automatisch |
| **Fehler vermeiden** | Kein Trigger in Strings, passende Werte pro Property |

### Tastatur-Shortcuts

| Taste | Im Autocomplete | Im Picker |
|-------|-----------------|-----------|
| Enter | Vorschlag übernehmen | Auswahl übernehmen |
| Escape | Schließen | Schließen (+ Trigger entfernen bei #/$) |
| Pfeiltasten | Navigieren | Navigieren |
| Tippen | Filtern | Filtern |
| Tab | Wie Enter | - |

### Trigger-Zeichen

| Zeichen | Öffnet | Kontext |
|---------|--------|---------|
| `#` | Color Picker | Nach Farb-Property (bg, col, boc, ic, ...) |
| `$` | Token Picker | In Property-Wert |
| Space | Icon Picker | Nach "Icon" |
| Space | Animation Picker | Nach "anim" |
| Doppelklick | Color Picker | Auf bestehende Hex-Farbe |

---

## Verwandte Dokumente

- [Drag-Drop Use Cases](./drag-drop-use-cases.md) – Drag & Drop im Preview
