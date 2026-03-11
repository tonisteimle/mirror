# Interaction Pickers

Visuelle Editoren für States, Interaktionen und Animationen.

## Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                     Picker Ökosystem                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│   StatePicker   │  ActionPicker   │    AnimationPicker      │
│                 │                 │    (existiert)          │
│  hover          │  onclick        │                         │
│  focus          │  onhover        │    fadeIn               │
│  active         │  onfocus        │    slideUp              │
│  disabled       │  onchange       │    bounce               │
│  state X        │  onkeydown      │    ...                  │
├─────────────────┴─────────────────┴─────────────────────────┤
│                    TransitionPicker                         │
│         Verbindet States mit Animationen                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. StatePicker

### Konzept

Visueller Editor für Element-Zustände.

```
┌─────────────────────────────────────────┐
│ States für: Button "Submit"             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Default │ │  Hover  │ │  Focus  │   │
│  │  ████   │ │  ████   │ │  ████   │   │
│  │ Submit  │ │ Submit  │ │ Submit  │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│       ●           ○           ○         │
│                                         │
├─────────────────────────────────────────┤
│ Hover State:                            │
│ ┌─────────────────────────────────────┐ │
│ │ bg      │ #2563EB      │ 🎨        │ │
│ │ scale   │ 1.02         │           │ │
│ │ shadow  │ md           │ ▼        │ │
│ │ cursor  │ pointer      │           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Property]                        │
│                                         │
├─────────────────────────────────────────┤
│ [Cancel]              [Apply to Code]   │
└─────────────────────────────────────────┘
```

### State-Typen

| Typ | Trigger | Beispiel |
|-----|---------|----------|
| `hover` | Mouse over | Farbe ändern |
| `focus` | Tab/Click in Input | Outline |
| `active` | Mouse down | Pressed-Effekt |
| `disabled` | `disabled` Property | Ausgegraut |
| `state X` | Custom Toggle | `state selected` |

### Generierter Code

```mirror
Button "Submit"
  bg $primary
  pad 12 24

  // Vom StatePicker generiert:
  hover
    bg $primary-dark
    scale 1.02
    shadow md

  focus
    outline 2 $primary offset 2

  active
    scale 0.98

  disabled
    bg $muted
    col $muted-foreground
    cursor not-allowed
```

### Custom States

```
┌─────────────────────────────────────────┐
│ Custom State erstellen                  │
├─────────────────────────────────────────┤
│                                         │
│ Name: [selected___________]             │
│                                         │
│ Typ:                                    │
│ ● Toggle (on/off)                       │
│ ○ Value (string)                        │
│ ○ Enum (multiple options)               │
│                                         │
│ Initial: ○ On  ● Off                    │
│                                         │
├─────────────────────────────────────────┤
│ Styling wenn "selected":                │
│ ┌─────────────────────────────────────┐ │
│ │ bg      │ $primary-light │ 🎨      │ │
│ │ bor     │ 2 $primary     │         │ │
│ │ bold    │ ✓              │         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Create State]                          │
└─────────────────────────────────────────┘
```

**Generiert:**
```mirror
Box state selected
  bg white
  pad 16

  selected
    bg $primary-light
    bor 2 $primary
    bold
```

---

## 2. ActionPicker

### Konzept

Visueller Editor für Event-Handler und Aktionen.

```
┌─────────────────────────────────────────┐
│ Aktion für: Button "Delete"             │
├─────────────────────────────────────────┤
│                                         │
│ Trigger:                                │
│ ┌─────────────────────────────────────┐ │
│ │ ● onclick                           │ │
│ │ ○ onhover                           │ │
│ │ ○ ondblclick                        │ │
│ │ ○ onkeydown [Enter____▼]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
├─────────────────────────────────────────┤
│ Aktion:                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Typ:     [Toggle State_____▼]       │ │
│ │ Target:  [ConfirmModal_____▼]       │ │
│ │ State:   [visible__________]        │ │
│ │ Value:   [on_______________]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Another Action]                  │
│                                         │
├─────────────────────────────────────────┤
│ Preview:                                │
│ ┌─────────────────────────────────────┐ │
│ │ onclick: show ConfirmModal          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel]              [Apply to Code]   │
└─────────────────────────────────────────┘
```

### Aktions-Typen

| Kategorie | Aktionen |
|-----------|----------|
| **Visibility** | `show`, `hide`, `toggle` |
| **State** | `select`, `deselect`, `activate`, `deactivate` |
| **Navigation** | `page`, `open`, `close` |
| **Data** | `assign`, `increment`, `append` |
| **Custom** | `call functionName` |

### Action Builder (Multi-Step)

```
┌─────────────────────────────────────────┐
│ Aktions-Sequenz                         │
├─────────────────────────────────────────┤
│                                         │
│ 1. ┌───────────────────────────────┐    │
│    │ 🎯 Toggle "Loading" → on      │ ✕  │
│    └───────────────────────────────┘    │
│                     ↓                   │
│ 2. ┌───────────────────────────────┐    │
│    │ ⏱️ Wait 2000ms                │ ✕  │
│    └───────────────────────────────┘    │
│                     ↓                   │
│ 3. ┌───────────────────────────────┐    │
│    │ 🎯 Toggle "Loading" → off     │ ✕  │
│    └───────────────────────────────┘    │
│                     ↓                   │
│ 4. ┌───────────────────────────────┐    │
│    │ 📄 Page "Success"             │ ✕  │
│    └───────────────────────────────┘    │
│                                         │
│ [+ Add Step]                            │
│                                         │
└─────────────────────────────────────────┘
```

**Generiert:**
```mirror
Button "Submit"
  onclick
    toggle Loading on
    wait 2000
    toggle Loading off
    page Success
```

### Keyboard Shortcuts Builder

```
┌─────────────────────────────────────────┐
│ Keyboard Shortcut                       │
├─────────────────────────────────────────┤
│                                         │
│ Taste aufnehmen: [___Press a key___]    │
│                                         │
│ Erkannt: ⌘ + Enter                      │
│                                         │
│ Modifiers:                              │
│ ☑ Cmd/Ctrl  ☐ Shift  ☐ Alt  ☐ Option   │
│                                         │
│ Aktion: [Submit Form_________▼]         │
│                                         │
└─────────────────────────────────────────┘
```

**Generiert:**
```mirror
Input "message"
  onkeydown cmd+enter: submit
```

---

## 3. TransitionPicker

### Konzept

Verbindet States mit Animationen für flüssige Übergänge.

```
┌─────────────────────────────────────────┐
│ Transitions für: Card                   │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────┐    ───────►    ┌─────────┐  │
│ │ Default │    fadeIn      │  Hover  │  │
│ │   ▢     │    200ms       │   ▣     │  │
│ └─────────┘    ease-out    └─────────┘  │
│                                         │
│ ◄──────────────────────────────────────►│
│ 0ms              200ms            400ms │
│                                         │
├─────────────────────────────────────────┤
│ Transition Properties:                  │
│                                         │
│ Duration:  [200___] ms                  │
│ Easing:    [ease-out________▼]          │
│ Delay:     [0_____] ms                  │
│                                         │
│ Properties to animate:                  │
│ ☑ background    ☑ transform             │
│ ☑ shadow        ☐ border                │
│ ☐ all                                   │
│                                         │
├─────────────────────────────────────────┤
│ Preview: [▶ Play]  [↻ Reset]            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │         [  Live Preview  ]          │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Easing Visualizer

```
┌─────────────────────────────────────────┐
│ Easing Curve                            │
├─────────────────────────────────────────┤
│                                         │
│     ●───────────────────●               │
│    ╱                     ╲              │
│   ╱                       ╲             │
│  ●                         ●            │
│  │                         │            │
│  └─────────────────────────┘            │
│  0%                      100%           │
│                                         │
│ Presets:                                │
│ ○ linear    ● ease-out   ○ bounce      │
│ ○ ease-in   ○ ease-in-out ○ elastic    │
│                                         │
│ Custom: cubic-bezier(0.4, 0, 0.2, 1)   │
│                                         │
└─────────────────────────────────────────┘
```

**Generiert:**
```mirror
Card
  bg white
  shadow sm
  transition all 200ms ease-out

  hover
    shadow lg
    translateY -2
```

---

## 4. AnimationPicker (Erweiterung)

Der bestehende AnimationPicker erweitert um:

### Animation Timeline

```
┌─────────────────────────────────────────┐
│ Animation: bounceIn                     │
├─────────────────────────────────────────┤
│                                         │
│ Timeline:                               │
│ ├──────┼──────┼──────┼──────┼──────┤   │
│ 0%    25%    50%    75%   100%          │
│ │      │      │      │      │           │
│ ●──────●──────●──────●──────●           │
│ scale  1.2    0.9    1.05   1.0         │
│                                         │
│ Keyframe Editor:                        │
│ ┌─────────────────────────────────────┐ │
│ │ 0%:   scale 0, opacity 0            │ │
│ │ 50%:  scale 1.2                     │ │
│ │ 75%:  scale 0.9                     │ │
│ │ 100%: scale 1, opacity 1            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ Add Keyframe]                        │
│                                         │
└─────────────────────────────────────────┘
```

### Animation Trigger

```
┌─────────────────────────────────────────┐
│ Wann animieren?                         │
├─────────────────────────────────────────┤
│                                         │
│ ● On Mount (Element erscheint)          │
│ ○ On State Change                       │
│   State: [visible________▼]             │
│   From:  [off___] To: [on___]           │
│ ○ On Scroll (In Viewport)               │
│   Threshold: [50__]%                    │
│ ○ On Event                              │
│   Event: [onclick________▼]             │
│                                         │
├─────────────────────────────────────────┤
│ Optionen:                               │
│ ☐ Loop                                  │
│ ☐ Reverse on exit                       │
│ ☑ Respect reduced motion                │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. Combined: Interaction Flow Builder

### Konzept

Visueller Flow-Editor für komplexe Interaktionen.

```
┌─────────────────────────────────────────────────────────────┐
│ Interaction Flow: "Add to Cart"                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐             │
│  │ Button  │─────►│ Loading │─────►│ Success │             │
│  │  Click  │      │  State  │      │  Toast  │             │
│  └─────────┘      └────┬────┘      └─────────┘             │
│                        │                                    │
│                        ▼                                    │
│                   ┌─────────┐                               │
│                   │  Error  │                               │
│                   │  Toast  │                               │
│                   └─────────┘                               │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Step Details:                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Button Click                                         │ │
│ │    → Toggle Loading on                                  │ │
│ │    → Button disabled                                    │ │
│ │    → Animate: pulse                                     │ │
│ │                                                         │ │
│ │ 2. Loading State (2000ms)                               │ │
│ │    → Show Spinner                                       │ │
│ │    → Wait for API (simulated)                           │ │
│ │                                                         │ │
│ │ 3. Success Path                                         │ │
│ │    → Toggle Loading off                                 │ │
│ │    → Show Toast "Added!"                                │ │
│ │    → Animate: bounceIn                                  │ │
│ │    → Auto-hide after 3000ms                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [▶ Preview Flow]                    [Generate Code]         │
└─────────────────────────────────────────────────────────────┘
```

---

## Technische Architektur

### Picker-Struktur

```
studio/pickers/
├── base/                    # Bestehend
├── color/                   # Bestehend
├── token/                   # Bestehend
├── icon/                    # Bestehend
├── animation/               # Bestehend (erweitern)
│
├── state/                   # NEU
│   ├── StatePicker.ts
│   ├── StatePreview.ts
│   ├── CustomStateBuilder.ts
│   └── state-presets.ts
│
├── action/                  # NEU
│   ├── ActionPicker.ts
│   ├── ActionBuilder.ts
│   ├── KeyboardShortcutCapture.ts
│   └── action-types.ts
│
├── transition/              # NEU
│   ├── TransitionPicker.ts
│   ├── EasingVisualizer.ts
│   ├── TimingEditor.ts
│   └── easing-presets.ts
│
└── flow/                    # NEU (Optional, Phase 2)
    ├── FlowBuilder.ts
    ├── FlowCanvas.ts
    └── FlowNode.ts
```

### Trigger Points

```typescript
// Wann öffnet welcher Picker?

const PICKER_TRIGGERS = {
  // Im Code
  'hover': StatePicker,       // Cursor nach "hover" → StatePicker
  'onclick': ActionPicker,    // Cursor nach "onclick" → ActionPicker
  'transition': TransitionPicker,
  'animate': AnimationPicker,

  // Im PropertyPanel
  'States': StatePicker,      // Section "States" → StatePicker
  'Events': ActionPicker,     // Section "Events" → ActionPicker

  // Keyboard
  'Cmd+Shift+S': StatePicker,
  'Cmd+Shift+A': ActionPicker,
}
```

### Code Generation

```typescript
interface PickerResult {
  code: string           // Generierter Mirror-Code
  insertPosition: 'inline' | 'block' | 'after'
  preview?: () => void   // Für Live-Preview
}

// Beispiel: StatePicker Result
{
  code: `hover
    bg $primary-dark
    scale 1.02`,
  insertPosition: 'block',
}

// Beispiel: ActionPicker Result
{
  code: `onclick: toggle Modal`,
  insertPosition: 'inline',
}
```

---

## Implementierungs-Roadmap

### Phase 1: StatePicker (2-3 Wochen)
- [ ] Basic State Selection (hover, focus, active, disabled)
- [ ] Property Editor pro State
- [ ] Live Preview im Picker
- [ ] Code Generation
- [ ] Integration in PropertyPanel

### Phase 2: ActionPicker (2-3 Wochen)
- [ ] Trigger Selection
- [ ] Action Type Dropdown
- [ ] Target Element Picker
- [ ] Keyboard Shortcut Capture
- [ ] Multi-Action Sequencing

### Phase 3: TransitionPicker (1-2 Wochen)
- [ ] Duration/Easing Editor
- [ ] Easing Curve Visualizer
- [ ] Property Selection
- [ ] Preview Animation

### Phase 4: Animation Erweiterungen (1 Woche)
- [ ] Timeline View
- [ ] Keyframe Editor
- [ ] Trigger Conditions

### Phase 5: Flow Builder (Optional, 3-4 Wochen)
- [ ] Visual Node Editor
- [ ] Step Connections
- [ ] Conditional Branches
- [ ] Full Flow Preview

---

## UX Guidelines

### Konsistenz mit bestehenden Pickern

| Aspekt | Standard |
|--------|----------|
| Trigger | Click auf Trigger-Zone oder Cmd+K Menü |
| Position | Unter/neben dem Trigger-Element |
| Keyboard | Tab durch Felder, Enter bestätigt |
| Preview | Live-Update wenn möglich |
| Cancel | Escape oder Click außerhalb |

### Accessibility

- Alle Picker keyboard-navigierbar
- Focus-Trap innerhalb Picker
- Aria-Labels für alle Elemente
- Reduced Motion respektieren bei Previews

---

## Offene Fragen

1. **Picker-Orchestration:** Wie handlen wir Picker-in-Picker? (z.B. ColorPicker innerhalb StatePicker)
2. **Undo:** Soll Picker-Apply ein Undo-Step sein?
3. **Templates:** Vordefinierte State/Action Kombinationen? (z.B. "Button with hover")
4. **AI-Assist:** "Mach den Button interaktiv" → AI wählt passende States/Actions?
