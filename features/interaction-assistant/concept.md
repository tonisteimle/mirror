# Intelligent Interaction Assistant

KI-gestützter Assistent der Interaktionen versteht, vorschlägt und generiert.

---

## Vision

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  User selektiert: Button "Löschen"                              │
│                       │                                         │
│                       ▼                                         │
│  Assistent erkennt:                                             │
│  - "Löschen" = Destruktive Aktion                               │
│  - Button = Klickbar                                            │
│  - Kontext: Innerhalb einer Liste                               │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💡 Vorgeschlagene Interaktionen:                        │   │
│  │                                                         │   │
│  │ ⚡ Empfohlen für "Löschen":                             │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ 🗑️  Bestätigung anzeigen                      [+]  │ │   │
│  │ │     onclick → show ConfirmDialog                    │ │   │
│  │ │     Styling: bg $error, hover: bg $error-dark       │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │ Weitere Optionen:                                       │   │
│  │ ○ Direkt löschen mit Undo-Toast                        │   │
│  │ ○ Inline-Bestätigung (Swipe/Hold)                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kern-Konzept: Kontextuelle Intelligenz

### 1. Element-Erkennung

Der Assistent analysiert das selektierte Element:

```typescript
interface ElementAnalysis {
  // Aus dem Namen
  semanticType: 'button' | 'input' | 'card' | 'list-item' | 'modal' | ...
  intent: 'action' | 'navigation' | 'destructive' | 'submit' | 'toggle' | ...

  // Aus dem Kontext
  parent: ElementAnalysis | null
  siblings: ElementAnalysis[]
  hasState: boolean
  existingInteractions: string[]

  // Aus dem Text
  textContent: string
  textIntent: 'positive' | 'negative' | 'neutral' | 'question'
}
```

### 2. Intent-Mapping

```typescript
const INTENT_PATTERNS = {
  // Text-basiert
  destructive: [/löschen/i, /delete/i, /entfernen/i, /remove/i, /cancel/i],
  submit: [/speichern/i, /save/i, /senden/i, /submit/i, /bestätigen/i],
  navigation: [/weiter/i, /next/i, /zurück/i, /back/i, /öffnen/i, /open/i],
  toggle: [/ein/i, /aus/i, /on/i, /off/i, /aktivieren/i, /deaktivieren/i],
  expand: [/mehr/i, /details/i, /expand/i, /show more/i],

  // Element-basiert
  'list-item': { default: 'select', alternatives: ['expand', 'navigate'] },
  'card': { default: 'navigate', alternatives: ['expand', 'select'] },
  'input': { default: 'validate', alternatives: ['autocomplete', 'clear'] },
  'modal': { default: 'close-on-backdrop', alternatives: ['close-button'] },
  'dropdown': { default: 'toggle-options', alternatives: ['select-option'] },
}
```

### 3. Vorschlag-Generierung

```typescript
interface InteractionSuggestion {
  // Metadata
  id: string
  confidence: number           // 0-1, wie sicher ist der Vorschlag
  isRecommended: boolean       // Top-Empfehlung

  // Display
  title: string                // "Bestätigung anzeigen"
  description: string          // "Zeigt ConfirmDialog vor dem Löschen"
  icon: string                 // 🗑️

  // Generierter Code
  code: {
    events: string             // onclick: show ConfirmDialog
    states: string             // hover: bg $error-dark
    children?: string          // Für ConfirmDialog etc.
  }

  // Preview
  preview: () => void          // Live-Demo
}
```

---

## Interaktions-Vorlagen

### Für Buttons

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Button "Kaufen" - Vorschläge                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚡ Primary Action (empfohlen)                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ✅ Erfolgs-Feedback                                         │ │
│ │                                                             │ │
│ │ onclick:                                                    │ │
│ │   1. Button → Loading State                                 │ │
│ │   2. API Call (simuliert: 1.5s)                            │ │
│ │   3. Success Toast "Gekauft!"                               │ │
│ │   4. Button → Default State                                 │ │
│ │                                                             │ │
│ │ States: hover, active, loading, disabled                    │ │
│ │                                                             │ │
│ │ [Preview ▶]                              [Anwenden →]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Alternativen:                                                   │
│ ○ Einfacher Klick (nur onclick Handler)                        │
│ ○ Mit Bestätigung (ConfirmDialog)                              │
│ ○ Cart hinzufügen (Warenkorb-Animation)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Generierter Code:**

```mirror
Button "Kaufen" state loading
  bg $primary
  col white
  pad 12 24
  rad 8

  hover
    bg $primary-dark
    scale 1.02

  active
    scale 0.98

  loading
    bg $primary-light
    cursor wait
    Spinner w 16 h 16

  disabled
    bg $muted
    cursor not-allowed

  onclick
    toggle loading on
    wait 1500
    toggle loading off
    toast "Gekauft!" success
```

### Für Listen-Items

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 ListItem "User Card" - Vorschläge                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚡ Selectable List Item (empfohlen)                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │ onclick: select (single selection)                          │ │
│ │                                                             │ │
│ │ States:                                                     │ │
│ │ ┌────────┐  ┌────────┐  ┌────────┐                         │ │
│ │ │Default │  │ Hover  │  │Selected│                         │ │
│ │ │ ░░░░░░ │  │ ▒▒▒▒▒▒ │  │ ████▌  │                         │ │
│ │ └────────┘  └────────┘  └────────┘                         │ │
│ │                                                             │ │
│ │ [Preview ▶]                              [Anwenden →]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Alternativen:                                                   │
│ ○ Multi-Select (Checkbox)                                      │
│ ○ Expandable (Accordion)                                       │
│ ○ Navigierbar (onclick → page Detail)                          │
│ ○ Swipe Actions (Edit/Delete)                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Für Inputs

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Input "Email" - Vorschläge                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚡ Email Input mit Validierung (empfohlen)                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │ States:                                                     │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │ │
│ │ │   Default    │ │    Valid     │ │   Invalid    │         │ │
│ │ │ [         ]  │ │ [       ] ✓  │ │ [       ] ✗  │         │ │
│ │ │              │ │   green      │ │ Fehlertext   │         │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘         │ │
│ │                                                             │ │
│ │ Validation:                                                 │ │
│ │ - Format: email                                             │ │
│ │ - Live-Validierung (onblur)                                │ │
│ │ - Fehlermeldung: "Bitte gültige Email eingeben"            │ │
│ │                                                             │ │
│ │ [Preview ▶]                              [Anwenden →]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Alternativen:                                                   │
│ ○ Einfaches Input (nur focus/blur States)                      │
│ ○ Mit Autocomplete                                             │
│ ○ Mit Clear-Button                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Für Modals

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 Modal "ConfirmDialog" - Vorschläge                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚡ Standard Modal Verhalten (empfohlen)                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │ Öffnen:                                                     │ │
│ │ - Animation: fadeIn + scaleIn (200ms)                       │ │
│ │ - Backdrop: blur + darken                                   │ │
│ │ - Focus trap: aktiv                                         │ │
│ │                                                             │ │
│ │ Schließen:                                                  │ │
│ │ - Escape-Taste                                              │ │
│ │ - Backdrop-Click                                            │ │
│ │ - Close-Button (X)                                          │ │
│ │ - Animation: fadeOut (150ms)                                │ │
│ │                                                             │ │
│ │ [Preview ▶]                              [Anwenden →]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Natural Language Input

### Quick-Input

```
┌─────────────────────────────────────────────────────────────────┐
│ 🪄 Was soll passieren?                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Beim Klick soll ein Modal geöffnet werden                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ↓ Enter                                                         │
│                                                                 │
│ 💡 Verstanden! Generiere:                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ onclick: show Modal                                         │ │
│ │                                                             │ │
│ │ Zusätzlich empfohlen:                                       │ │
│ │ ☑ Hover-State (cursor pointer)                             │ │
│ │ ☑ Focus-State (outline)                                    │ │
│ │ ☐ Loading-State                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Anpassen...]                              [Anwenden →]         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Beispiel-Prompts

| User sagt | Assistent generiert |
|-----------|---------------------|
| "hover effekt" | `hover: bg $primary-dark, scale 1.02` |
| "klickbar machen" | `onclick: ..., hover: cursor pointer` |
| "toggle" | `state active, onclick: toggle active` |
| "ausklappbar" | `state expanded, onclick: toggle expanded` |
| "selektierbar" | `state selected, onclick: select` |
| "löschen mit bestätigung" | `onclick: show ConfirmDialog` + Dialog Code |
| "validierung für email" | Input States + Validation Logic |
| "beim hovern größer" | `hover: scale 1.05, transition 200ms` |
| "animiert einblenden" | `animate fadeIn on mount` |
| "tastatursteuerung" | `onkeydown enter: submit, escape: cancel` |

---

## Kontext-Awareness

### Parent-Kontext

```typescript
// Element ist in einer Liste
if (parent.semanticType === 'list') {
  suggestions.push({
    title: 'Selektierbar machen',
    description: 'Klick selektiert dieses Item',
    code: 'state selected\nonclick: select'
  })
}

// Element ist in einem Formular
if (parent.semanticType === 'form') {
  suggestions.push({
    title: 'Submit-Handler',
    description: 'Enter-Taste sendet Formular',
    code: 'onkeydown enter: submit Form'
  })
}

// Element ist in einem Modal
if (hasAncestor('modal')) {
  suggestions.push({
    title: 'Modal schließen',
    description: 'Schließt das übergeordnete Modal',
    code: 'onclick: close Modal'
  })
}
```

### Sibling-Kontext

```typescript
// Geschwister haben bereits States
const siblingStates = siblings.flatMap(s => s.existingInteractions)
if (siblingStates.includes('selected')) {
  suggestions.push({
    title: 'Konsistent machen',
    description: 'Gleiche Interaktion wie Geschwister-Elemente',
    code: copyFromSibling(siblings[0])
  })
}
```

### Projekt-Kontext

```typescript
// Im Projekt verwendete Patterns
const projectPatterns = analyzeProjectPatterns(codebase)

// "Du hast dieses Pattern 5x verwendet"
if (projectPatterns.buttonHover) {
  suggestions.unshift({
    title: 'Projekt-Standard verwenden',
    description: 'Wie andere Buttons im Projekt',
    code: projectPatterns.buttonHover.code,
    confidence: 0.95
  })
}
```

---

## Intelligente Defaults

### Element-Type Defaults

```typescript
const ELEMENT_DEFAULTS: Record<string, InteractionPreset> = {
  Button: {
    states: ['hover', 'active', 'focus', 'disabled'],
    events: ['onclick'],
    defaultHover: {
      'bg': 'darken 10%',
      'scale': '1.02',
      'cursor': 'pointer'
    },
    defaultActive: {
      'scale': '0.98'
    },
    defaultFocus: {
      'outline': '2 $primary offset 2'
    }
  },

  Input: {
    states: ['focus', 'valid', 'invalid', 'disabled'],
    events: ['onfocus', 'onblur', 'oninput', 'onchange'],
    defaultFocus: {
      'boc': '$primary',
      'shadow': 'sm'
    },
    defaultInvalid: {
      'boc': '$error',
      'bg': '$error-light'
    }
  },

  Card: {
    states: ['hover', 'selected'],
    events: ['onclick'],
    defaultHover: {
      'shadow': 'lg',
      'translateY': '-2'
    }
  },

  ListItem: {
    states: ['hover', 'selected', 'active'],
    events: ['onclick'],
    defaultSelected: {
      'bg': '$primary-light',
      'bor-left': '3 $primary'
    }
  },

  Modal: {
    states: ['visible'],
    events: ['onbackdrop', 'onescape'],
    defaultTransition: 'fadeIn 200ms',
    closeEvents: ['backdrop-click', 'escape']
  },

  Toggle: {
    states: ['on', 'off'],
    events: ['onclick'],
    defaultOn: {
      'bg': '$primary',
      'translate-x': '20'
    }
  }
}
```

---

## UI-Komponenten

### Interaction Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Interaktionen                                    Button ▼    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🪄 "Was soll passieren?"                           [Fragen] │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ States                                              [+ State]   │
│ ├─ hover ────────────────────────────────────────── ✓ ──── ✎   │
│ │  bg $primary-dark, scale 1.02                                │
│ ├─ active ───────────────────────────────────────── ✓ ──── ✎   │
│ │  scale 0.98                                                  │
│ ├─ focus ────────────────────────────────────────── ○ ──── +   │
│ │  (nicht definiert)                                           │
│ └─ disabled ─────────────────────────────────────── ○ ──── +   │
│    (nicht definiert)                                           │
│                                                                 │
│ Events                                              [+ Event]   │
│ ├─ onclick ──────────────────────────────────────── ✓ ──── ✎   │
│ │  show ConfirmModal                                           │
│ └─ onkeydown ────────────────────────────────────── ○ ──── +   │
│    (nicht definiert)                                           │
│                                                                 │
│ Transitions                                                     │
│ └─ all 200ms ease-out ───────────────────────────── ✎          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 💡 Vorschläge                                        [Alle →]   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ○ Focus-State hinzufügen (Accessibility)                    │ │
│ │ ○ Disabled-State hinzufügen                                 │ │
│ │ ○ Loading-State für async Aktionen                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Actions Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Element: Button "Löschen"                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │Hover │ │Active│ │Focus │ │Click │ │ Key  │ │Anim. │        │
│ │  +   │ │  +   │ │  +   │ │  ✓   │ │  +   │ │  +   │        │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                                                 │
│ Klick auf Icon = Hinzufügen mit Smart Defaults                 │
│ ✓ = Bereits definiert, Klick öffnet Editor                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Workflow-Beispiele

### 1. Button interaktiv machen

```
1. User selektiert: Button "Speichern"
   │
2. Assistent zeigt: Quick Actions Bar
   │
   ├─ [Hover +] [Active +] [Focus +] [Click +]
   │
3. User klickt: [Hover +]
   │
4. Assistent fügt ein:
   │  hover
   │    bg $primary-dark
   │    scale 1.02
   │    cursor pointer
   │
5. User klickt: [Click +]
   │
6. Dialog öffnet: "Was soll beim Klick passieren?"
   │
   ├─ 💡 Empfohlen: "Submit Formular"
   ├─ ○ Navigation
   ├─ ○ Modal öffnen
   ├─ ○ Custom...
   │
7. User wählt: "Submit Formular"
   │
8. Assistent fügt ein:
     onclick: submit Form

Zeit: ~10 Sekunden
```

### 2. Lösch-Button mit Bestätigung

```
1. User selektiert: Button "Löschen"
   │
2. Assistent erkennt: Destruktive Aktion
   │
3. Zeigt prominent:
   │  ┌────────────────────────────────────────┐
   │  │ ⚠️ Destruktive Aktion erkannt         │
   │  │                                        │
   │  │ Empfehlung: Bestätigung vor Löschen   │
   │  │                                        │
   │  │ [Mit Bestätigung]  [Ohne Bestätigung] │
   │  └────────────────────────────────────────┘
   │
4. User wählt: [Mit Bestätigung]
   │
5. Assistent generiert:
   │
   │  Button "Löschen"
   │    bg $error
   │    col white
   │
   │    hover
   │      bg $error-dark
   │
   │    onclick: show ConfirmDialog
   │
   │  ConfirmDialog state visible off
   │    // ... Dialog Code
   │
6. Dialog erscheint im Code und Preview

Zeit: ~5 Sekunden
```

### 3. Liste mit Selektion

```
1. User selektiert: Box (enthält mehrere UserCards)
   │
2. Assistent erkennt: Liste von ähnlichen Items
   │
3. Zeigt:
   │  ┌────────────────────────────────────────┐
   │  │ 📋 Liste erkannt (5 Items)             │
   │  │                                        │
   │  │ Items interaktiv machen?               │
   │  │                                        │
   │  │ ○ Single Selection                     │
   │  │ ○ Multi Selection (Checkboxes)         │
   │  │ ○ Klick navigiert zu Details           │
   │  │ ○ Expandable (Accordion)               │
   │  │                                        │
   │  │ [Anwenden auf alle Items]              │
   │  └────────────────────────────────────────┘
   │
4. User wählt: Single Selection
   │
5. Assistent fügt zu JEDEM Item hinzu:
   │
   │  UserCard state selected
   │    hover
   │      bg $muted
   │    selected
   │      bg $primary-light
   │      bor-left 3 $primary
   │    onclick: select
   │
6. Alle Items haben jetzt konsistente Interaktion

Zeit: ~8 Sekunden
```

---

## Technische Architektur

```
studio/
├── interaction-assistant/
│   ├── index.ts
│   ├── InteractionAssistant.ts      # Hauptklasse
│   ├── ElementAnalyzer.ts           # Analysiert Element + Kontext
│   ├── IntentRecognizer.ts          # Erkennt Intent aus Name/Text
│   ├── SuggestionEngine.ts          # Generiert Vorschläge
│   ├── PatternMatcher.ts            # Findet Projekt-Patterns
│   ├── CodeGenerator.ts             # Generiert Mirror Code
│   │
│   ├── presets/
│   │   ├── button-presets.ts
│   │   ├── input-presets.ts
│   │   ├── list-presets.ts
│   │   ├── modal-presets.ts
│   │   └── form-presets.ts
│   │
│   ├── ui/
│   │   ├── InteractionPanel.ts      # Haupt-UI
│   │   ├── QuickActionsBar.ts       # Schnellzugriff
│   │   ├── SuggestionCard.ts        # Vorschlag-Karte
│   │   ├── NaturalLanguageInput.ts  # Text-Input
│   │   └── StateEditor.ts           # State bearbeiten
│   │
│   └── __tests__/
│       ├── ElementAnalyzer.test.ts
│       ├── IntentRecognizer.test.ts
│       └── SuggestionEngine.test.ts
```

### Integration

```typescript
// In SelectionManager
events.on('selection:changed', ({ nodeId }) => {
  if (nodeId) {
    const element = getElement(nodeId)
    const suggestions = interactionAssistant.analyze(element)
    ui.showQuickActions(suggestions.quickActions)
    ui.updateInteractionPanel(suggestions)
  }
})
```

---

## LLM-Integration (Optional)

Für komplexere Anfragen kann ein LLM eingebunden werden:

```typescript
async function processNaturalLanguage(input: string, context: ElementContext) {
  // Einfache Patterns lokal verarbeiten
  const localResult = localPatternMatcher.match(input)
  if (localResult.confidence > 0.9) {
    return localResult
  }

  // Komplexere Anfragen an LLM
  const prompt = `
    Element: ${context.elementType} "${context.textContent}"
    Kontext: ${context.parentType}, ${context.siblingCount} Siblings
    Anfrage: "${input}"

    Generiere Mirror DSL Code für Interaktion.
  `

  const response = await llm.generate(prompt)
  return parseResponse(response)
}
```

---

## Implementierungs-Roadmap

### Phase 1: Core (1-2 Wochen)
- [ ] ElementAnalyzer
- [ ] IntentRecognizer (Text-basiert)
- [ ] Basis-Presets (Button, Input, Card)
- [ ] Quick Actions Bar UI

### Phase 2: UI (1-2 Wochen)
- [ ] InteractionPanel
- [ ] StateEditor
- [ ] SuggestionCards mit Preview
- [ ] Code-Generierung + Insertion

### Phase 3: Intelligenz (1-2 Wochen)
- [ ] Kontext-Awareness (Parent, Siblings)
- [ ] Projekt-Pattern-Erkennung
- [ ] Erweiterte Presets (Modal, List, Form)

### Phase 4: Natural Language (1 Woche)
- [ ] NaturalLanguageInput
- [ ] Lokale Pattern-Erkennung
- [ ] Optional: LLM-Integration

### Phase 5: Polish (1 Woche)
- [ ] Animations für Transitions
- [ ] Keyboard Shortcuts
- [ ] Undo/Redo Integration
- [ ] Tests

---

## Vergleich: Mit vs. Ohne Assistent

| Aufgabe | Ohne Assistent | Mit Assistent |
|---------|----------------|---------------|
| Button Hover hinzufügen | Syntax nachschlagen, tippen | 1 Klick |
| Lösch-Bestätigung | Modal erstellen, Events verkabeln | 2 Klicks |
| Liste selektierbar | Jeden Item einzeln, copy-paste | 1 Dialog |
| Input-Validierung | States, Error-Text, Events | 1 Klick |
| Modal-Verhalten | Backdrop, Escape, Animation | 1 Klick |

**Zeitersparnis: 80-90%**
