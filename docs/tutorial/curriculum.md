# Mirror Tutorial – Curriculum

## Philosophie

Mirror existiert, weil bestehende Werkzeuge nicht für UI-Beschreibung gemacht wurden:

- **HTML** wurde für Dokumente gebaut, nicht für Apps
- **CSS** wurde für Print-Designer entworfen
- **Frameworks** wurden für Entwickler geschrieben

Mirror ist eine Sprache für Menschen, die UIs beschreiben wollen – ohne Programmierung.

### Kernprinzipien

1. **Radikale Einfachheit** – Eine Zeile = Ein Element. Keine Tags, keine Klammern.
2. **Lesbar für Menschen** – Code, den Designer und Entwickler verstehen.
3. **KI-ready** – Kompakt genug für Prompts, strukturiert genug für Generierung.

### Vergleich

```
React:
<button
  className="btn"
  style={{
    background: '#2563eb',
    padding: '12px 24px',
    borderRadius: '6px',
    color: 'white'
  }}
>Klick</button>

Mirror:
Button "Klick", bg #2563eb, pad 12 24, rad 6, col white
```

---

## Lehrgang-Struktur

Der Lehrgang ist in 8 Phasen unterteilt, von den absoluten Grundlagen bis zu komplexen Design-Systemen.

### Phase 1: Grundlagen (Lektionen 01–04)

Die Basis. Jeder startet hier.

| # | Titel | Inhalte |
|---|-------|---------|
| 01 | Erste Schritte | Elemente (Text, Button, Frame), erste Properties (bg, col, pad) |
| 02 | Komponenten | Eigene Bausteine definieren (`Name:`), wiederverwenden, überschreiben |
| 03 | Design Tokens | Variablen (`$name: wert`), Farb-Paletten, konsistentes Design |
| 04 | Interaktion | Hover, Focus, Disabled – States als Kind-Blöcke |

**Lernziel:** Einfache UIs mit eigenen Komponenten und konsistentem Styling bauen.

---

### Phase 2: Layout & Sizing (Lektionen 05–08)

Wie Elemente angeordnet und dimensioniert werden.

| # | Titel | Inhalte |
|---|-------|---------|
| 05 | Layout-Basics | `hor`, `ver`, `gap`, `center` – Elemente anordnen |
| 06 | Größen & Abstände | `w`, `h`, `hug`, `full`, `pad`, `margin` |
| 07 | Flex-Verhalten | `spread`, `wrap`, `shrink`, `align` |
| 08 | Grid-Layout | `grid N`, `dense`, `gap-x`, `gap-y`, `row-height` |

**Lernziel:** Jedes Layout umsetzen können – von simplen Listen bis zu komplexen Grids.

---

### Phase 3: Visuelles Design (Lektionen 09–12)

Farben, Typografie, Effekte.

| # | Titel | Inhalte |
|---|-------|---------|
| 09 | Farben & Borders | `bg`, `col`, `bor`, `boc`, `rad` – Farbsystem |
| 10 | Typografie | `fs`, `weight`, `font`, `line`, `text-align`, `truncate` |
| 11 | Effekte | `shadow`, `opacity`, `blur`, `backdrop-blur` |
| 12 | Icons | `Icon`, `icon-size`, `icon-color`, `fill`, `material` |

**Lernziel:** Visuell ansprechende UIs gestalten.

---

### Phase 4: Positionierung (Lektionen 13–15)

Absolute Positionierung, Overlays, Scroll-Verhalten.

| # | Titel | Inhalte |
|---|-------|---------|
| 13 | Positioned Layout | `pos`, `stacked`, `x`, `y`, `z` |
| 14 | Pinning | `pin-left`, `pin-right`, `pin-top`, `pin-bottom`, `pin-center` |
| 15 | Overflow & Scroll | `scroll`, `scroll-hor`, `scroll-both`, `clip`, `hidden` |

**Lernziel:** Overlays, Sticky-Header und scrollbare Bereiche bauen.

---

### Phase 5: States & Events (Lektionen 16–19)

Interaktive UIs mit Zuständen und Ereignissen.

| # | Titel | Inhalte |
|---|-------|---------|
| 16 | Custom States | `state selected`, `state expanded`, `state on/off` |
| 17 | State-Modifikatoren | `exclusive`, `toggle`, `initial` |
| 18 | Events | `onclick`, `onhover`, `onfocus`, `onchange`, `onkeydown` |
| 19 | Actions | `show`, `hide`, `toggle`, `open`, `close`, `navigate` |

**Lernziel:** UIs bauen, die auf Benutzerinteraktion reagieren.

---

### Phase 6: Animationen (Lektionen 20–21)

Bewegung und Übergänge.

| # | Titel | Inhalte |
|---|-------|---------|
| 20 | Animation-Presets | `fade-in`, `slide-in`, `scale-in`, `bounce`, `pulse`, `shake` |
| 21 | Transitions | Hover-Animationen, Timing, kombinierte Effekte |

**Lernziel:** UIs lebendig machen mit subtilen Animationen.

---

### Phase 7: Vorgefertigte Komponenten (Lektionen 22–28)

Mirror enthält fertige Komponenten für komplexe UI-Patterns – mit eingebauter Accessibility und Keyboard-Navigation.

| # | Titel | Inhalte |
|---|-------|---------|
| 22 | Einführung | Was sind vorgefertigte Komponenten, Slots-Konzept |
| 23 | Select & Combobox | Dropdowns, Autocomplete, Keyboard-Navigation |
| 24 | Dialog & Popover | Modale Dialoge, Popovers, Tooltips |
| 25 | Tabs & Accordion | Tab-Navigation, Collapsibles |
| 26 | Form Controls | Checkbox, Switch, Slider, RadioGroup |
| 27 | Date & Time | DatePicker, Timer |
| 28 | Weitere Komponenten | TreeView, FileUpload, Carousel, Menu |

**Lernziel:** Komplexe UI-Patterns nutzen ohne sie selbst bauen zu müssen.

---

### Phase 8: Design Systems (Lektionen 29–32)

Alles zusammen – professionelle Design-Systeme bauen.

| # | Titel | Inhalte |
|---|-------|---------|
| 29 | Token-Systeme | Hierarchische Tokens, Theming, Dark/Light Mode |
| 30 | Component Library | Eigene Komponenten-Bibliothek aufbauen |
| 31 | Patterns | Cards, Lists, Forms, Navigation – Best Practices |
| 32 | Komplettes Projekt | Dashboard von Grund auf bauen |

**Lernziel:** Ein vollständiges Design-System erstellen und pflegen.

---

## Zusammenfassung

| Phase | Lektionen | Fokus |
|-------|-----------|-------|
| 1. Grundlagen | 01–04 | Elemente, Komponenten, Tokens, Hover |
| 2. Layout | 05–08 | Anordnung, Größen, Flex, Grid |
| 3. Visuell | 09–12 | Farben, Typo, Effekte, Icons |
| 4. Position | 13–15 | Absolute, Pinning, Scroll |
| 5. Interaktion | 16–19 | States, Events, Actions |
| 6. Animation | 20–21 | Presets, Transitions |
| 7. Komponenten | 22–28 | Vorgefertigte UI-Patterns |
| 8. Design System | 29–32 | Professionelle Systeme |

**Gesamt: 32 Lektionen in 8 Phasen**

---

## Didaktische Prinzipien

1. **Ein Konzept pro Abschnitt** – Nie mehr als eine neue Idee gleichzeitig
2. **Keine Vorwärtsreferenzen** – Nur verwenden, was schon erklärt wurde
3. **Playground in jedem Abschnitt** – Sofort ausprobieren
4. **Übung am Ende** – Gelerntes anwenden
5. **Progressive Komplexität** – Vom Einfachen zum Komplexen

## Nächste Schritte

1. [ ] Index-Seite mit neuem Intro überarbeiten
2. [ ] Phase 1 (Lektionen 01–04) finalisieren ✓
3. [ ] Phase 2 (Lektionen 05–08) erstellen
4. [ ] Phasen-Navigation in Index einbauen
