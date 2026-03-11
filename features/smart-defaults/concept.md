# Smart Defaults

Intelligente Vorschläge basierend auf Komponententyp und Kontext.

## Vision

Mirror erkennt die Absicht des Users und schlägt passende Properties vor.

```
User tippt: Button "Kaufen"
                    ↓
Mirror erkennt: Call-to-Action Button
                    ↓
Vorschlag: bg $primary, pad 12 24, rad 8, bold, hover bg $primary-dark
                    ↓
User drückt Tab → Akzeptiert
```

## Konzept

### Intent Recognition

```
┌─────────────────┬──────────────────────────────────────┐
│ User Input      │ Erkannter Intent                     │
├─────────────────┼──────────────────────────────────────┤
│ Button "Kaufen" │ Primary CTA                          │
│ Button "Abbrechen" │ Secondary/Ghost Button            │
│ Card            │ Container mit Shadow                 │
│ Card + Image    │ Media Card                           │
│ Input           │ Form Field                           │
│ Box hor         │ Horizontal Layout                    │
│ Icon "user"     │ Avatar/Profile Context               │
│ Text "Error"    │ Error Message                        │
└─────────────────┴──────────────────────────────────────┘
```

### Default-Kategorien

#### 1. Component Defaults

```mirror
// User tippt:
Button

// Smart Default:
Button
  pad 12 24
  rad 8
  bg $primary
  col white
  bold
  hover bg $primary-dark
```

#### 2. Context-Aware Defaults

```mirror
// In einem Form-Context:
Box ver gap 16
  Input "Email"      → type email, w full
  Input "Password"   → type password, w full
  Button "Login"     → bg $primary, w full

// In einem Card-Context:
Card
  Image              → w full, h 200, fit cover
  Text "Title"       → bold, size 18
  Text "Description" → col $muted, size 14
```

#### 3. Semantic Defaults

| Keyword | Erkannter Stil |
|---------|----------------|
| "Kaufen", "Submit", "Speichern" | Primary Action |
| "Abbrechen", "Zurück", "Cancel" | Secondary Action |
| "Löschen", "Entfernen", "Delete" | Destructive Action |
| "Error", "Fehler" | Error Styling |
| "Success", "Erfolg" | Success Styling |
| "Warning", "Warnung" | Warning Styling |

### Default-Presets

```typescript
const COMPONENT_DEFAULTS: Record<string, PropertySet> = {
  Button: {
    base: { pad: '12 24', rad: '8', cursor: 'pointer' },
    variants: {
      primary: { bg: '$primary', col: 'white', bold: true },
      secondary: { bg: 'transparent', bor: '1 $border', col: '$text' },
      destructive: { bg: '$error', col: 'white' },
      ghost: { bg: 'transparent', col: '$primary' },
    }
  },

  Card: {
    base: { bg: 'white', rad: '12', pad: '16', shadow: 'sm' },
    variants: {
      elevated: { shadow: 'md' },
      outlined: { shadow: 'none', bor: '1 $border' },
    }
  },

  Input: {
    base: { pad: '12 16', rad: '8', bor: '1 $border', w: 'full' },
    focus: { boc: '$primary', shadow: '0 0 0 2 $primary-light' },
  },

  Avatar: {
    base: { rad: 'full', w: '40', h: '40', fit: 'cover' },
    sizes: { sm: '32', md: '40', lg: '56', xl: '80' },
  },
}
```

## UX Flow

### 1. Inline Suggestion (Tab to Accept)

```
User tippt: Card
                  ↓
┌────────────────────────────────────────────┐
│ Card │ rad 12, pad 16, bg white, shadow sm │ ← Ghost-Text
└────────────────────────────────────────────┘
         ↓ Tab
┌────────────────────────────────────────────┐
│ Card rad 12, pad 16, bg white, shadow sm   │ ← Akzeptiert
└────────────────────────────────────────────┘
```

### 2. Suggestion Popup (Multiple Options)

```
User tippt: Button "Löschen"
                  ↓
┌─────────────────────────────────────┐
│ Button "Löschen"                    │
├─────────────────────────────────────┤
│ ● Destructive (bg $error, col wht) │ ← Default
│ ○ Outlined (bor 1 $error, col err) │
│ ○ Ghost (col $error)               │
│ ○ No defaults                      │
└─────────────────────────────────────┘
       ↓ Enter oder Klick
Defaults eingefügt
```

### 3. Quick Fix Suggestions

```
// User hat:
Button bg blue

// Mirror erkennt: Kein Padding, kein Radius
// Zeigt Lightbulb:
💡 Add recommended styles? (pad, rad, hover)
   [Apply] [Dismiss]
```

## Technische Implementierung

### Architektur

```
studio/
├── smart-defaults/
│   ├── index.ts
│   ├── intent-recognizer.ts    # Erkennt Absicht aus Code
│   ├── default-presets.ts      # Preset-Definitionen
│   ├── context-analyzer.ts     # Parent/Sibling Analyse
│   ├── suggestion-engine.ts    # Generiert Vorschläge
│   └── ui/
│       ├── InlineSuggestion.ts # Ghost-Text im Editor
│       ├── SuggestionPopup.ts  # Mehrere Optionen
│       └── QuickFix.ts         # Lightbulb Suggestions
```

### Intent Recognition Algorithm

```typescript
interface IntentContext {
  componentName: string
  textContent?: string        // Button "Kaufen"
  parentComponent?: string    // In Card? In Form?
  siblingComponents?: string[] // Neben anderen Buttons?
  existingProperties?: string[] // Was ist schon gesetzt?
}

function recognizeIntent(ctx: IntentContext): Intent {
  // 1. Text-Analyse für Buttons
  if (ctx.componentName === 'Button' && ctx.textContent) {
    if (isPrimaryActionText(ctx.textContent)) return 'primary-cta'
    if (isSecondaryActionText(ctx.textContent)) return 'secondary-action'
    if (isDestructiveText(ctx.textContent)) return 'destructive-action'
  }

  // 2. Context-Analyse
  if (ctx.parentComponent === 'Card') {
    if (ctx.componentName === 'Image') return 'card-hero-image'
    if (ctx.componentName === 'Text') return 'card-text'
  }

  // 3. Sibling-Analyse
  if (ctx.siblingComponents?.includes('Input')) {
    return 'form-element'
  }

  return 'generic'
}
```

### Editor Integration

```typescript
// In Autocomplete oder als separates Plugin
function onComponentInserted(component: string, position: Position) {
  const context = analyzeContext(position)
  const intent = recognizeIntent(context)
  const defaults = getDefaultsForIntent(intent)

  if (defaults) {
    showInlineSuggestion(position, defaults)
  }
}

function showInlineSuggestion(pos: Position, defaults: PropertySet) {
  // Ghost-Text anzeigen
  editor.showGhostText(pos, formatDefaults(defaults))

  // Tab-Handler registrieren
  onTab(() => {
    editor.insertText(pos, formatDefaults(defaults))
    editor.clearGhostText()
  })
}
```

## Implementierungs-Phasen

### Phase 1: Basic Component Defaults
- [ ] Default-Presets für Button, Card, Input, Avatar
- [ ] Tab-to-Accept im Editor
- [ ] Settings: Defaults ein/aus

### Phase 2: Text Analysis
- [ ] Keyword-Erkennung (Kaufen, Abbrechen, Löschen)
- [ ] Variant-Vorschläge (Primary, Secondary, Destructive)
- [ ] Mehrsprachig (DE/EN)

### Phase 3: Context Analysis
- [ ] Parent-Component erkennen
- [ ] Sibling-Analyse
- [ ] Form-Context erkennen

### Phase 4: Quick Fixes
- [ ] Fehlende Properties erkennen
- [ ] Lightbulb-UI
- [ ] Batch-Apply

### Phase 5: Learning (Optional)
- [ ] User-Präferenzen tracken
- [ ] Projekt-spezifische Defaults
- [ ] Team-Sharing

## Konfiguration

```typescript
// In Studio Settings oder .mirrorrc
{
  "smartDefaults": {
    "enabled": true,
    "autoApply": false,       // true = sofort einfügen
    "showGhostText": true,
    "triggerKey": "Tab",
    "presets": "default",     // oder "minimal", "full"
    "customPresets": {
      "Button": {
        "base": { "rad": "4" }  // Override
      }
    }
  }
}
```

## Token-Integration

Smart Defaults sollten Design Tokens nutzen:

```mirror
// Projekt hat definiert:
$primary: #3B82F6
$primary-dark: #2563EB
$spacing-sm: 8
$spacing-md: 16
$radius-md: 8

// Smart Defaults nutzen diese:
Button "Submit"
  bg $primary
  pad $spacing-sm $spacing-md
  rad $radius-md
  hover bg $primary-dark
```

**Fallback:** Wenn keine Tokens definiert, Hex-Werte nutzen.

## Metriken

| Metrik | Ziel |
|--------|------|
| Acceptance Rate | > 60% der Vorschläge akzeptiert |
| Time Saved | 30% weniger Tipparbeit |
| Consistency | 90% der Buttons haben hover-States |

## Offene Fragen

1. **Wie aggressiv?** Immer vorschlagen vs. nur bei neuen Komponenten?
2. **Undo?** Ein Undo-Schritt für alle Defaults oder einzeln?
3. **Konflikte?** Was wenn User andere Tokens nutzt?
4. **Mobile?** Andere Defaults für Mobile-Layouts?

## Referenzen

- GitHub Copilot (Inline Suggestions)
- VSCode Quick Fixes
- Tailwind CSS IntelliSense
- Figma Auto Layout Defaults
