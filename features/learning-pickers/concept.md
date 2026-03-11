# Learning Pickers

Pickers die Stati und Interaktionen definieren - und dabei den Code lehren.

---

## Kern-Idee

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   User will: "Hover-Effekt für Button"                          │
│                      │                                          │
│                      ▼                                          │
│   Picker zeigt:                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │  WAS soll sich ändern?          CODE (live)             │   │
│   │  ─────────────────────          ─────────────           │   │
│   │  ☑ Hintergrund  [■ #2563EB]     hover                   │   │
│   │  ☑ Größe        [1.02    ]        bg #2563EB            │   │
│   │  ☐ Schatten                       scale 1.02            │   │
│   │  ☐ Rahmen                                               │   │
│   │                                                         │   │
│   │  ───────────────────────────────────────────────────    │   │
│   │  User SIEHT den Code entstehen.                         │   │
│   │  User LERNT die Syntax.                                 │   │
│   │  ───────────────────────────────────────────────────    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Prinzip:** Der Picker ist kein Black-Box-Generator. Er ist ein Lehrer.

---

## 1. State Picker

### Aufbau

```
┌─────────────────────────────────────────────────────────────────┐
│ State hinzufügen                                           ✕    │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│  WELCHER STATE?                │  DEIN CODE                     │
│  ─────────────                 │  ─────────                     │
│                                │                                │
│  ○ hover   (Maus drüber)       │  ┌────────────────────────┐   │
│  ○ focus   (Tab/Fokus)         │  │ hover                  │   │
│  ○ active  (Gedrückt)          │  │   bg #2563EB           │   │
│  ○ disabled                    │  │   scale 1.02           │   │
│  ─────────────                 │  │   shadow md            │   │
│  ○ Custom: [selected___]       │  └────────────────────────┘   │
│                                │                                │
├────────────────────────────────┤  Kopieren 📋                   │
│                                │                                │
│  WAS ÄNDERT SICH?              │────────────────────────────────│
│  ───────────────               │                                │
│                                │  VORSCHAU                      │
│  Hintergrund                   │  ────────                      │
│  ☑ Farbe    [■ #2563EB  ]     │                                │
│                                │  ┌────────────┐                │
│  Größe                         │  │   Button   │  ← Live        │
│  ☑ Scale    [1.02       ]     │  └────────────┘                │
│                                │        ↕                       │
│  Schatten                      │  ┌────────────┐                │
│  ☑ Schatten [md        ▼]     │  │   Button   │  ← Hover       │
│                                │  └────────────┘                │
│  Rahmen                        │                                │
│  ☐ Border                      │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  💡 Tipp: Tippe nächstes Mal direkt "hover" + Enter im Editor   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Abbrechen]                                    [Code einfügen]  │
└─────────────────────────────────────────────────────────────────┘
```

### Der Lern-Aspekt

**Code-Panel ist zentral, nicht versteckt:**

```
┌──────────────────────────────────────┐
│  hover                               │  ← State-Name
│    bg #2563EB                        │  ← Property + Wert
│    scale 1.02                        │  ← Property + Wert
│    shadow md                         │  ← Property + Wert
└──────────────────────────────────────┘
         │
         ▼
   User lernt:
   "Aha, ich schreibe 'hover' und darunter
    eingerückt die Properties die sich ändern"
```

**Tooltips erklären Syntax:**

```
hover              ← "State-Name, gefolgt von Zeilenumbruch"
  bg #2563EB       ← "Eingerückt: 'bg' für Hintergrund, dann Farbe"
  scale 1.02       ← "'scale' vergrößert/verkleinert (1 = normal)"
```

---

## 2. Event Picker

### Aufbau

```
┌─────────────────────────────────────────────────────────────────┐
│ Interaktion hinzufügen                                     ✕    │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│  WANN?                         │  DEIN CODE                     │
│  ─────                         │  ─────────                     │
│                                │                                │
│  ● onclick   (Klick)           │  ┌────────────────────────┐   │
│  ○ onhover   (Maus drüber)     │  │ onclick: show Modal    │   │
│  ○ onfocus   (Fokus)           │  └────────────────────────┘   │
│  ○ onchange  (Wert ändert)     │                                │
│  ○ onkeydown (Taste)           │  Kopieren 📋                   │
│    └─ Taste: [Enter____]       │                                │
│                                │────────────────────────────────│
├────────────────────────────────┤                                │
│                                │  VORSCHAU                      │
│  WAS PASSIERT?                 │  ────────                      │
│  ─────────────                 │                                │
│                                │  Klick simulieren:             │
│  ● show      Element zeigen    │  [▶ Testen]                    │
│  ○ hide      Element verstecken│                                │
│  ○ toggle    Ein/Aus schalten  │                                │
│  ○ select    Auswählen         │                                │
│  ○ page      Seite wechseln    │                                │
│  ○ call      Funktion rufen    │                                │
│                                │                                │
│  ZIEL:                         │                                │
│  [Modal__________________▼]    │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  💡 Syntax: onclick: show Modal                                 │
│             ───────  ────  ─────                                │
│             Trigger  Aktion Ziel                                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Abbrechen]                                    [Code einfügen]  │
└─────────────────────────────────────────────────────────────────┘
```

### Syntax-Erklärung integriert

```
onclick: show Modal
───────  ────  ─────
   │       │     │
   │       │     └─ "Welches Element?"
   │       └─────── "Was tun? (show/hide/toggle/...)"
   └─────────────── "Wann? (onclick/onhover/...)"

💡 "Du kannst das auch direkt tippen: onclick: show Modal"
```

---

## 3. Custom State Picker

Für eigene States wie `selected`, `expanded`, `loading`:

```
┌─────────────────────────────────────────────────────────────────┐
│ Custom State erstellen                                     ✕    │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│  STATE NAME                    │  DEIN CODE                     │
│  ──────────                    │  ─────────                     │
│                                │                                │
│  [selected______________]      │  ┌────────────────────────┐   │
│                                │  │ Button state selected  │   │
│  Vorschläge:                   │  │   bg white             │   │
│  • selected                    │  │                        │   │
│  • expanded                    │  │   selected             │   │
│  • loading                     │  │     bg $primary-light  │   │
│  • active                      │  │     bor 2 $primary     │   │
│  • open                        │  │     bold               │   │
│                                │  │                        │   │
├────────────────────────────────┤  │   onclick: toggle      │   │
│                                │  │     selected           │   │
│  STYLING WENN "selected"       │  └────────────────────────┘   │
│  ───────────────────────       │                                │
│                                │                                │
│  ☑ Hintergrund [$primary-light]│                                │
│  ☑ Rahmen     [2 $primary    ]│                                │
│  ☑ Text       [bold         ]│                                │
│                                │                                │
├────────────────────────────────┤                                │
│                                │                                │
│  WIE AKTIVIEREN?               │                                │
│  ───────────────               │                                │
│                                │                                │
│  ● onclick: toggle selected    │                                │
│  ○ Manuell (von außen)         │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  💡 "state selected" deklariert den State                       │
│     "selected" Block definiert das Styling                      │
│     "toggle selected" schaltet ihn um                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Transition Picker

```
┌─────────────────────────────────────────────────────────────────┐
│ Übergang hinzufügen                                        ✕    │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│  WAS ANIMIEREN?                │  DEIN CODE                     │
│  ──────────────                │  ─────────                     │
│                                │                                │
│  ● Alles        (all)          │  ┌────────────────────────┐   │
│  ○ Nur Farben   (colors)       │  │ transition all 200     │   │
│  ○ Nur Größe    (transform)    │  │   ease-out             │   │
│  ○ Nur Schatten (shadow)       │  └────────────────────────┘   │
│                                │                                │
├────────────────────────────────┤                                │
│                                │                                │
│  DAUER                         │  VORSCHAU                      │
│  ─────                         │  ────────                      │
│                                │                                │
│  [====●=========] 200ms        │  ┌────────────┐                │
│   50  100  200  300  500       │  │   Button   │                │
│                                │  └────────────┘                │
│  KURVE                         │       ↓ hover                  │
│  ─────                         │  ╭────────────╮                │
│                                │  │   Button   │                │
│  ○ linear                      │  ╰────────────╯                │
│  ● ease-out   (empfohlen)      │                                │
│  ○ ease-in                     │  [▶ Abspielen]                 │
│  ○ ease-in-out                 │                                │
│  ○ bounce                      │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                                                                 │
│  💡 Syntax: transition [was] [dauer-ms] [kurve]                 │
│             transition all 200 ease-out                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Lern-Progression

### Stufe 1: Picker nutzen

```
User klickt [+ Hover] → Picker öffnet → User wählt Optionen → Code wird eingefügt
                                                                      │
                                                    User SIEHT den Code
```

### Stufe 2: Code lesen

```
User sieht im Editor:
  hover
    bg #2563EB
    scale 1.02

User denkt: "Aha, so sieht das aus"
```

### Stufe 3: Code anpassen

```
User ändert direkt:
  hover
    bg #1D4ED8      ← Farbe angepasst
    scale 1.05      ← Wert angepasst
```

### Stufe 4: Code schreiben

```
User tippt selbst:
  hover
    bg $primary-dark
    translateY -2
    shadow lg

Picker nicht mehr nötig!
```

**Der Picker macht sich selbst überflüssig.** Das ist das Ziel.

---

## UI-Prinzipien

### 1. Code immer sichtbar

```
┌───────────────────┬───────────────────┐
│   Optionen        │   CODE            │  ← 50/50 Split
│   (visuell)       │   (Text)          │
└───────────────────┴───────────────────┘

NICHT:
┌─────────────────────────────────────────┐
│   Optionen                              │
│   [Erweitert: Code anzeigen ▼]          │  ← Versteckt = nicht lernen
└─────────────────────────────────────────┘
```

### 2. Syntax-Erklärungen inline

```
hover              ← State-Block
  bg #2563EB       ← bg = background
  scale 1.02       ← 1.02 = 2% größer
```

### 3. Direkt-Tipp am Ende

```
┌─────────────────────────────────────────┐
│ 💡 Nächstes Mal: Tippe einfach "hover"  │
│    und drücke Enter                     │
└─────────────────────────────────────────┘
```

### 4. Kopier-Button prominent

```
┌────────────────────────┐
│ hover                  │ [📋 Kopieren]
│   bg #2563EB           │
│   scale 1.02           │
└────────────────────────┘

User kann Code kopieren und woanders einfügen → Lernen
```

---

## Minimal-Set an Pickern

Nur das Wichtigste:

| Picker | Zweck |
|--------|-------|
| **State Picker** | hover, focus, active, disabled, custom |
| **Event Picker** | onclick, onhover, onkeydown + Aktionen |
| **Transition Picker** | Animierte Übergänge |

Kein Flow-Builder. Keine komplexen Sequenzen. Einfach.

---

## Trigger

Wann öffnen die Picker?

```
1. Property Panel
   ┌─────────────────────────────┐
   │ States          [+ State]  │ ← Klick öffnet State Picker
   │ • hover ✓                  │
   │                            │
   │ Events          [+ Event]  │ ← Klick öffnet Event Picker
   │ • onclick ✓                │
   └─────────────────────────────┘

2. Kontext-Menü (Rechtsklick auf Element)
   ┌─────────────────────┐
   │ + State hinzufügen  │
   │ + Event hinzufügen  │
   │ + Transition        │
   └─────────────────────┘

3. Keyboard
   Cmd+Shift+S → State Picker
   Cmd+Shift+E → Event Picker
```

---

## Implementierung

### Dateistruktur

```
studio/pickers/
├── state/
│   ├── StatePicker.ts
│   ├── StatePreview.ts
│   └── presets.ts
├── event/
│   ├── EventPicker.ts
│   ├── ActionList.ts
│   └── targets.ts
├── transition/
│   ├── TransitionPicker.ts
│   ├── EasingPreview.ts
│   └── presets.ts
└── shared/
    ├── CodePreview.ts       # Zeigt generierten Code
    ├── SyntaxTooltip.ts     # Erklärt Syntax
    └── InsertCode.ts        # Fügt Code ein
```

### CodePreview Komponente

```typescript
interface CodePreviewProps {
  code: string
  annotations?: {
    line: number
    text: string
  }[]
  onCopy: () => void
}

function CodePreview({ code, annotations, onCopy }: CodePreviewProps) {
  return (
    <div class="code-preview">
      <div class="code-header">
        <span>Dein Code</span>
        <button onclick={onCopy}>📋 Kopieren</button>
      </div>
      <pre>
        {code.split('\n').map((line, i) => (
          <div class="code-line">
            <code>{line}</code>
            {annotations?.[i] && (
              <span class="annotation">← {annotations[i].text}</span>
            )}
          </div>
        ))}
      </pre>
    </div>
  )
}
```

---

## Beispiel-Flows

### Hover hinzufügen

```
1. User selektiert Button
2. Klickt [+ State] im Property Panel
3. State Picker öffnet
4. User wählt "hover"
5. User aktiviert:
   ☑ Hintergrund → wählt Farbe
   ☑ Scale → setzt 1.02
6. Rechts sieht User live:
   hover
     bg #2563EB
     scale 1.02
7. Klickt [Einfügen]
8. Code erscheint im Editor
9. User lernt: "So schreibt man hover!"
```

### Click-Event hinzufügen

```
1. User selektiert Button
2. Klickt [+ Event]
3. Event Picker öffnet
4. User wählt:
   - Wann: onclick
   - Was: show
   - Ziel: Modal (aus Dropdown)
5. Rechts sieht User:
   onclick: show Modal
6. 💡 Tooltip: "onclick: [aktion] [ziel]"
7. User klickt [Einfügen]
8. User lernt die Syntax!
```

---

## Roadmap

### Phase 1: State Picker (1 Woche)
- [ ] Basis-UI mit Code-Preview
- [ ] hover, focus, active, disabled
- [ ] Live-Vorschau
- [ ] Syntax-Annotationen

### Phase 2: Event Picker (1 Woche)
- [ ] Trigger-Auswahl
- [ ] Aktions-Auswahl
- [ ] Ziel-Dropdown (Elemente im Projekt)
- [ ] Code-Preview mit Erklärung

### Phase 3: Transition Picker (3-4 Tage)
- [ ] Dauer-Slider
- [ ] Easing-Auswahl mit Visualisierung
- [ ] Preview-Animation

### Phase 4: Integration (3-4 Tage)
- [ ] Property Panel Integration
- [ ] Kontext-Menü
- [ ] Keyboard Shortcuts
- [ ] Lerntipps

---

## Erfolgsmetrik

Der Picker ist erfolgreich wenn:

1. User nach 3-5 Nutzungen die Syntax kennt
2. User anfängt, Code direkt zu tippen
3. User den Picker seltener braucht

**Ziel: Picker macht sich überflüssig**
