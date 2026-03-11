# Contextual Autocomplete

Der Code führt. Autocomplete unterstützt bei jedem Schritt.

---

## Prinzip

```
User tippt → Kontext erkannt → Passende Vorschläge → User wählt → Weiter

Kein Picker. Kein Wizard. Nur intelligentes Autocomplete.
Der Code IST das Interface.
```

---

## 1. Events & Actions

```
Button "Menü"
  on|                          ← Trigger: "on" am Zeilenanfang
    ┌──────────────────┐
    │ onclick          │
    │ onhover          │
    │ onfocus          │
    │ onblur           │
    │ onchange         │
    │ onkeydown        │
    └──────────────────┘
         ↓
  onclick: |                   ← Trigger: Nach ":"
           ┌──────────────────┐
           │ show      →      │
           │ hide      →      │
           │ toggle    →      │
           │ select           │
           │ activate         │
           │ page      →      │
           │ call      →      │
           │ assign    →      │
           └──────────────────┘
                ↓
  onclick: toggle |            ← Trigger: Nach Action mit Target
                  ┌──────────────────┐
                  │ Menu        Box  │ ← Elemente aus Code
                  │ Sidebar     Box  │
                  │ Modal       Box  │
                  │ Dropdown    Box  │
                  └──────────────────┘
                       ↓
  onclick: toggle Menu         ✓ Fertig
```

### Keyboard-Events

```
  onkeydown |                  ← Trigger: Nach "onkeydown"
            ┌──────────────────┐
            │ enter            │
            │ escape           │
            │ space            │
            │ arrowup          │
            │ arrowdown        │
            │ tab              │
            │ cmd+s            │
            └──────────────────┘
                 ↓
  onkeydown escape: |          ← Action-Autocomplete
                    ┌──────────────────┐
                    │ hide      →      │
                    │ close     →      │
                    │ cancel           │
                    └──────────────────┘
                         ↓
  onkeydown escape: hide Modal  ✓
```

---

## 2. States

```
Button state |                 ← Trigger: Nach "state"
             ┌──────────────────┐
             │ selected         │
             │ active           │
             │ expanded         │
             │ open             │
             │ loading          │
             │ disabled         │
             │ visible          │
             │ [custom...]      │
             └──────────────────┘
                  ↓
Button state loading           ✓ State definiert
```

### State-Blocks

```
Button state loading
  |                            ← Trigger: Eingerückt unter Element
  ┌──────────────────┐
  │ hover            │ ← Pseudo-States
  │ focus            │
  │ active           │
  │ disabled         │
  │ ─────────────    │
  │ loading          │ ← Definierte States
  │ selected         │
  │ ─────────────    │
  │ bg               │ ← Properties
  │ col              │
  │ pad              │
  └──────────────────┘
```

### Innerhalb State-Block

```
Button state loading
  loading
    |                          ← Trigger: Im State-Block
    ┌──────────────────────────┐
    │ 💡 Typisch für "loading":│
    │ ─────────────────────────│
    │ opacity    0.7           │
    │ cursor     wait          │
    │ pointer-events none      │
    │ ─────────────────────────│
    │ Oder Spinner hinzufügen: │
    │ Spinner w 16 h 16        │
    └──────────────────────────┘
```

---

## 3. Transitions

```
Button
  transition |                 ← Trigger: Nach "transition"
             ┌──────────────────┐
             │ all              │
             │ colors           │
             │ transform        │
             │ opacity          │
             │ shadow           │
             └──────────────────┘
                  ↓
  transition all |             ← Trigger: Nach Typ
                 ┌──────────────────┐
                 │ 100ms            │
                 │ 150ms   (schnell)│
                 │ 200ms   (normal) │
                 │ 300ms            │
                 │ 500ms   (langsam)│
                 └──────────────────┘
                      ↓
  transition all 200 |         ← Trigger: Nach Dauer
                     ┌──────────────────┐
                     │ ease-out  ↗︎      │ empfohlen
                     │ ease-in   ↘︎      │
                     │ ease-in-out ↗︎↘︎   │
                     │ linear    /      │
                     │ bounce    ⌢      │
                     └──────────────────┘
                          ↓
  transition all 200 ease-out  ✓
```

---

## 4. Animationen

```
Modal
  animate |                    ← Trigger: Nach "animate"
          ┌──────────────────────────┐
          │ fadeIn          ◐ → ●    │
          │ fadeOut         ● → ◐    │
          │ slideUp         ↑        │
          │ slideDown       ↓        │
          │ scaleIn         ○ → ●    │
          │ bounce          ⌢        │
          │ shake           ↔        │
          └──────────────────────────┘
               ↓
  animate fadeIn |             ← Trigger: Nach Animation
                 ┌──────────────────┐
                 │ 150ms            │
                 │ 200ms            │
                 │ 300ms            │
                 │ 500ms            │
                 └──────────────────┘
                      ↓
  animate fadeIn 200           ✓
```

### Animation-Trigger

```
Modal
  animate fadeIn 200 |         ← Optional: Wann?
                     ┌──────────────────┐
                     │ on mount         │ Default
                     │ on visible       │
                     │ on hover         │
                     │ on focus         │
                     └──────────────────┘
```

---

## 5. Farben

```
Button
  bg |                         ← Trigger: Nach Farb-Property
     ┌──────────────────────────────┐
     │ $primary         ■ #3B82F6   │ ← Tokens zuerst
     │ $secondary       ■ #6366F1   │
     │ $error           ■ #EF4444   │
     │ $success         ■ #22C55E   │
     │ ────────────────────────────│
     │ white            ■          │ ← Basis-Farben
     │ black            ■          │
     │ transparent      ◻          │
     │ ────────────────────────────│
     │ #                → Hex      │ ← Direkt-Eingabe
     │ rgb(             → RGB      │
     └──────────────────────────────┘
```

### Nach Token-Auswahl: Varianten

```
  bg $primary|                 ← Trigger: Nach Token
             ┌──────────────────────────┐
             │ $primary         #3B82F6 │
             │ $primary-light   #93C5FD │
             │ $primary-dark    #1D4ED8 │
             │ $primary-50      #EFF6FF │
             │ $primary-100     #DBEAFE │
             │ $primary-900     #1E3A8A │
             └──────────────────────────┘
```

---

## 6. Größen & Layout

### Width/Height

```
Box
  w |                          ← Trigger: Nach "w" oder "h"
    ┌──────────────────┐
    │ full       100%  │
    │ hug    fit-content│
    │ auto             │
    │ ─────────────────│
    │ 100              │
    │ 200              │
    │ 300              │
    │ ─────────────────│
    │ 50%              │
    │ 1/2         50%  │
    │ 1/3         33%  │
    └──────────────────┘
```

### Layout-Direction

```
Box |                          ← Trigger: Neues Element, kein Layout
    ┌──────────────────────────┐
    │ 💡 Layout-Richtung?      │
    │ ─────────────────────────│
    │ hor     ━━━   horizontal │
    │ ver     ┃     vertikal   │
    │ grid    ⊞     Raster     │
    │ stacked ▣     übereinander│
    └──────────────────────────┘
         ↓
Box hor |                      ← Trigger: Nach Layout
        ┌──────────────────┐
        │ gap      →       │
        │ spread           │
        │ center           │
        │ wrap             │
        │ reverse          │
        └──────────────────┘
             ↓
Box hor gap |                  ← Trigger: Nach "gap"
            ┌──────────────────────────┐
            │ $spacing-sm    8px       │
            │ $spacing-md    16px      │
            │ $spacing-lg    24px      │
            │ ─────────────────────────│
            │ 4                        │
            │ 8                        │
            │ 12                       │
            │ 16                       │
            │ 24                       │
            └──────────────────────────┘
```

---

## 7. Padding & Spacing

```
Card
  pad |                        ← Trigger: Nach "pad"
      ┌──────────────────────────┐
      │ $spacing-sm    8px       │
      │ $spacing-md    16px      │
      │ $spacing-lg    24px      │
      │ ─────────────────────────│
      │ 8                        │
      │ 12                       │
      │ 16                       │
      │ 24                       │
      │ ─────────────────────────│
      │ 16 24    (y x)           │
      │ 8 16 8 16 (t r b l)      │
      └──────────────────────────┘
```

### Richtungs-Spezifisch

```
Card
  pad|                         ← Trigger: "pad" getippt
     ┌──────────────────┐
     │ pad       alle   │
     │ padx      ←  →   │
     │ pady      ↑  ↓   │
     │ padt      ↑      │
     │ padr         →   │
     │ padb         ↓   │
     │ padl      ←      │
     └──────────────────┘
```

---

## 8. Borders & Radius

```
Card
  bor |                        ← Trigger: Nach "bor"
      ┌──────────────────────────┐
      │ 1 $border               │ ← Häufig
      │ 1 #E5E7EB               │
      │ 2 $primary              │
      │ ─────────────────────────│
      │ 1         → Farbe       │
      │ 2         → Farbe       │
      └──────────────────────────┘
           ↓
  bor 1 |                      ← Trigger: Nach Breite
        ┌──────────────────────────┐
        │ $border        ■ #E5E7EB │
        │ $primary       ■ #3B82F6 │
        │ currentColor   ■        │
        │ ─────────────────────────│
        │ #                        │
        └──────────────────────────┘
```

### Radius

```
Card
  rad |                        ← Trigger: Nach "rad"
      ┌──────────────────────────┐
      │ $radius-sm     4px   ╭╮  │
      │ $radius-md     8px   ╭╮  │
      │ $radius-lg     16px  ╭╮  │
      │ full           50%   ●   │
      │ ─────────────────────────│
      │ 4                        │
      │ 8                        │
      │ 12                       │
      │ 16                       │
      └──────────────────────────┘
```

---

## 9. Shadow

```
Card
  shadow |                     ← Trigger: Nach "shadow"
         ┌──────────────────────────┐
         │ sm      ░░       subtle  │
         │ md      ▒▒       normal  │
         │ lg      ▓▓       stark   │
         │ xl      ██       sehr stark│
         │ none                      │
         │ ─────────────────────────│
         │ 0 2 4 rgba(...)  custom  │
         └──────────────────────────┘
```

---

## 10. Text & Typography

```
Text "Hello"
  size |                       ← Trigger: Nach "size"
       ┌──────────────────────────┐
       │ $text-xs      12px      │
       │ $text-sm      14px      │
       │ $text-base    16px      │
       │ $text-lg      18px      │
       │ $text-xl      20px      │
       │ $text-2xl     24px      │
       │ ─────────────────────────│
       │ 12                       │
       │ 14                       │
       │ 16                       │
       └──────────────────────────┘
```

```
Text "Hello"
  |                            ← Trigger: Text-Element
  ┌──────────────────┐
  │ bold             │
  │ italic           │
  │ underline        │
  │ uppercase        │
  │ ─────────────────│
  │ size      →      │
  │ col       →      │
  │ align     →      │
  │ leading   →      │
  └──────────────────┘
```

---

## 11. Conditions

```
Card
  @|                           ← Trigger: "@" für Responsive
   ┌──────────────────────────┐
   │ @mobile     < 640px      │
   │ @tablet     < 1024px     │
   │ @desktop    > 1024px     │
   │ ─────────────────────────│
   │ @dark       Dark Mode    │
   │ @light      Light Mode   │
   │ @reduced    Reduced Motion│
   └──────────────────────────┘
        ↓
  @mobile
    |                          ← Properties für Mobile
    ┌──────────────────┐
    │ 💡 Typisch mobil:│
    │ ─────────────────│
    │ w full           │
    │ pad 12           │
    │ size 14          │
    └──────────────────┘
```

---

## Smart Context

### Nach Element-Typ

```
Button "|"                     ← Leerer Button
       ┌──────────────────────────┐
       │ 💡 Button-Text?          │
       │ ─────────────────────────│
       │ "Speichern"              │
       │ "Abbrechen"              │
       │ "Weiter"                 │
       │ "Senden"                 │
       └──────────────────────────┘
```

```
Input |                        ← Input-Element
      ┌──────────────────────────┐
      │ type       →            │
      │ placeholder →           │
      │ value      →            │
      │ ─────────────────────────│
      │ w full                   │
      │ pad 12                   │
      │ rad 8                    │
      │ bor 1 $border            │
      └──────────────────────────┘
```

### Nach Sibling-Kontext

```
List hor gap 16
  Item "Eins"
  Item "Zwei"
  |                            ← Neues Element
  ┌──────────────────────────┐
  │ 💡 Weiteres Item?        │
  │ ─────────────────────────│
  │ Item "..."               │ ← Gleicher Typ wie Siblings
  │ ─────────────────────────│
  │ Divider                  │
  │ Spacer                   │
  └──────────────────────────┘
```

---

## Inline-Dokumentation

Bei jeder Auswahl: Kurze Erklärung

```
  onclick: toggle |
                  ┌───────────────────────────────┐
                  │ Menu                          │
                  │ ─────────────────────────────│
                  │ 💡 toggle: Schaltet zwischen │
                  │    show und hide um          │
                  └───────────────────────────────┘
```

```
  transition all 200 |
                     ┌───────────────────────────────┐
                     │ ease-out         empfohlen    │
                     │ ─────────────────────────────│
                     │ 💡 ease-out: Schneller Start,│
                     │    sanftes Ende. Natürlich.  │
                     └───────────────────────────────┘
```

---

## Ketten-Completion

Mehrere Aktionen:

```
  onclick: toggle Menu, |      ← Trigger: Nach ","
                        ┌──────────────────┐
                        │ 💡 Weitere Aktion│
                        │ ─────────────────│
                        │ show      →      │
                        │ hide      →      │
                        │ toggle    →      │
                        │ wait      →      │
                        │ call      →      │
                        └──────────────────┘
                             ↓
  onclick: toggle Menu, hide Tooltip  ✓
```

---

## Implementierung

### Architektur

```
studio/autocomplete/
├── index.ts
├── AutocompleteEngine.ts      # Kern-Logik
├── contexts/
│   ├── EventContext.ts        # on... → onclick, onhover
│   ├── ActionContext.ts       # show, hide, toggle
│   ├── TargetContext.ts       # Element-Referenzen
│   ├── StateContext.ts        # state selected, loading
│   ├── TransitionContext.ts   # transition all 200
│   ├── ColorContext.ts        # bg, col → Farben
│   ├── SizeContext.ts         # w, h → Größen
│   ├── SpacingContext.ts      # pad, gap → Abstände
│   └── LayoutContext.ts       # hor, ver, grid
├── providers/
│   ├── TokenProvider.ts       # $-Tokens
│   ├── ElementProvider.ts     # Elemente im Code
│   └── PropertyProvider.ts    # Verfügbare Properties
└── ui/
    ├── AutocompletePopup.ts
    ├── CompletionItem.ts
    └── InlineDoc.ts
```

### Context Detection

```typescript
interface CompletionContext {
  trigger: string           // Was wurde getippt
  position: 'value' | 'property' | 'element'
  parentProperty?: string   // z.B. "onclick" wenn nach ":"
  elementType?: string      // z.B. "Button"
  existingTokens?: string[] // Was kommt vorher auf der Zeile
}

function detectContext(line: string, cursor: number): CompletionContext {
  // "onclick: toggle |" → { trigger: "", parentProperty: "onclick", ... }
  // "bg |" → { trigger: "", parentProperty: "bg", position: "value" }
  // "on|" → { trigger: "on", position: "property" }
}
```

### Completion Provider

```typescript
interface CompletionProvider {
  id: string
  triggers: RegExp[]

  shouldActivate(context: CompletionContext): boolean
  getCompletions(context: CompletionContext): Completion[]
}

const eventProvider: CompletionProvider = {
  id: 'events',
  triggers: [/^on/],

  shouldActivate(ctx) {
    return ctx.trigger.startsWith('on') && ctx.position === 'property'
  },

  getCompletions(ctx) {
    return [
      { label: 'onclick', detail: 'Klick', icon: '👆' },
      { label: 'onhover', detail: 'Maus drüber', icon: '🖱' },
      { label: 'onfocus', detail: 'Fokussiert', icon: '🎯' },
      // ...
    ]
  }
}
```

---

## Roadmap

### Phase 1: Core (1-2 Wochen)
- [ ] AutocompleteEngine
- [ ] Event-Context (on... → onclick)
- [ ] Action-Context (onclick: → show/hide/toggle)
- [ ] Target-Context (→ Elemente)

### Phase 2: Properties (1 Woche)
- [ ] Color-Context (bg, col)
- [ ] Size-Context (w, h)
- [ ] Spacing-Context (pad, gap)
- [ ] Layout-Context (hor, ver)

### Phase 3: Advanced (1 Woche)
- [ ] State-Context
- [ ] Transition-Context
- [ ] Animation-Context
- [ ] Responsive-Context (@mobile)

### Phase 4: Intelligence (1 Woche)
- [ ] Element-Typ-Awareness
- [ ] Sibling-Kontext
- [ ] Inline-Dokumentation
- [ ] Ketten-Completion

---

## Vergleich

| Ansatz | Lernkurve | Geschwindigkeit | Flexibilität |
|--------|-----------|-----------------|--------------|
| **Contextual Autocomplete** | Niedrig | ⚡⚡⚡ | ⚡⚡⚡ |
| Separate Picker | Niedrig | ⚡⚡ | ⚡⚡ |
| Wizard | Sehr niedrig | ⚡ | ⚡ |
| Manuell tippen | Hoch | ⚡ | ⚡⚡⚡ |

**Contextual Autocomplete ist der Sweet Spot:**
- Schnell wie Tippen
- Geführt wie ein Wizard
- Flexibel wie manueller Code
- Lehrreich durch Inline-Docs
