# Live AI Copilot

LLM beobachtet Code in Echtzeit und schlägt Styles vor während du tippst.

## Vision

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  User tippt:    LoginForm                                  │
│                      │                                     │
│                      ▼                                     │
│  LLM erkennt:   "Login" = Auth Context                     │
│                 "Form" = Container mit Inputs              │
│                      │                                     │
│                      ▼                                     │
│  AI schlägt vor: ver gap 16 pad 24 bg white rad 12 shadow │
│                      │                                     │
│                      ▼                                     │
│  Ghost-Text:    LoginForm ver gap 16 pad 24...            │
│                           ─────────────────── (grau)       │
│                      │                                     │
│                      ▼                                     │
│  User:          [Tab] → Akzeptiert                         │
│                 [Esc] → Ignoriert                          │
│                 [Weiter tippen] → Eigene Props             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Funktionsweise

### 1. Trigger Detection

```typescript
// Wann wird das LLM aktiviert?
const triggers = {
  newLine: true,           // Nach Enter auf neuer Zeile
  componentName: true,     // Nach Komponentenname + Pause
  afterString: true,       // Nach "Button Text" + Pause
  pauseMs: 300,           // Pause-Dauer für Trigger
}
```

### 2. Context Gathering

```typescript
interface CopilotContext {
  // Aktuelles Element
  currentLine: string           // "LoginForm"
  componentName: string         // "LoginForm"
  textContent?: string          // Falls "Button 'Text'"

  // Hierarchie
  parent?: {
    name: string               // "App"
    layout: 'hor' | 'ver'
    properties: string[]
  }
  siblings?: string[]          // ["Header", "Footer"]

  // Projekt-Kontext
  tokens: string[]             // ["$primary", "$spacing-md"]
  existingComponents: string[] // ["Card", "Button"]
  stylePatterns: Pattern[]     // Erkannte Muster im Code
}
```

### 3. LLM Prompt

```
Du bist ein UI-Styling-Assistent für Mirror DSL.

KONTEXT:
- Komponente: LoginForm
- Parent: App (ver)
- Siblings: Header, MainContent
- Tokens: $primary, $bg-subtle, $spacing-md, $radius-md

AUFGABE:
Generiere passende Properties für "LoginForm" basierend auf dem Namen.
Nutze verfügbare Tokens wenn passend.
Halte es minimal aber vollständig.

ANTWORT (nur Properties, keine Erklärung):
ver gap $spacing-md pad 24 bg white rad $radius-md shadow sm maxw 400 center
```

### 4. Response Handling

```typescript
interface CopilotSuggestion {
  properties: string          // "ver gap 16 pad 24..."
  confidence: number          // 0.0 - 1.0
  reasoning?: string          // Für Debug/Learning
}

// Nur anzeigen wenn confidence > threshold
const CONFIDENCE_THRESHOLD = 0.7
```

---

## User Experience

### Ghost-Text im Editor

```
┌─────────────────────────────────────────────────────────┐
│ 1  App ver                                              │
│ 2    Header hor spread                                  │
│ 3    LoginForm ver gap 16 pad 24 bg white rad 12 shadow │
│ 4              ─────────────────────────────────────────│
│                ↑ Ghost (grau, nicht selektierbar)       │
│                                                         │
│    Cursor hier: LoginForm|                              │
└─────────────────────────────────────────────────────────┘
```

### Interaktionen

| Taste | Aktion |
|-------|--------|
| `Tab` | Kompletten Vorschlag akzeptieren |
| `Cmd+→` | Wort-weise akzeptieren |
| `Esc` | Vorschlag verwerfen |
| Weiter tippen | Eigene Props, Ghost verschwindet |

### Partial Accept

```
Ghost:     ver gap 16 pad 24 bg white rad 12 shadow
                ↓ Cmd+→ (einmal)
Akzeptiert: ver
Ghost:          gap 16 pad 24 bg white rad 12 shadow
                ↓ Cmd+→ (nochmal)
Akzeptiert: ver gap 16
Ghost:                  pad 24 bg white rad 12 shadow
```

### Inline Feedback

```
LoginForm ver gap 16...  ✓ AI   ← Kleines Badge zeigt AI-Ursprung
                         │
                         └─ Click für Details/Undo
```

---

## Kontext-Intelligenz

### Hierarchie-Awareness

```mirror
App ver
  Header hor        ← LLM sieht: Top-level, horizontal
    Logo            ← LLM schlägt vor: Bild-Properties
    Nav             ← LLM schlägt vor: hor gap 16

  LoginForm         ← LLM sieht: Nach Header, in App
                    ← Schlägt vor: Zentriert, Form-Styling
    EmailInput      ← LLM sieht: In Form, "Email"
                    ← Schlägt vor: w full, type email
```

### Sibling-Consistency

```mirror
CardGrid hor gap 16 wrap
  Card pad 16 bg white rad 8 shadow    ← User styled erste Card
  Card                                  ← LLM: Gleiche Props wie Sibling
  Card                                  ← LLM: Gleiche Props wie Sibling
```

### Token-Nutzung

```mirror
// Projekt hat definiert:
$primary: #3B82F6
$spacing: 16
$radius: 8

// LLM nutzt Tokens statt Hardcoded:
Button "Submit" bg $primary pad $spacing rad $radius
                   ↑ Nicht "#3B82F6" sondern Token
```

### Pattern Learning

```mirror
// User hat 3x dieses Pattern verwendet:
Card ver pad 16 bg white rad 8 shadow sm

// Bei nächstem "Card" schlägt LLM genau das vor
// (Projekt-spezifisches Learning)
```

---

## Semantische Erkennung

### Komponenten-Namen

| Name enthält | LLM inferiert | Vorgeschlagene Props |
|--------------|---------------|----------------------|
| Form | Input-Container | `ver gap 16 pad 24` |
| Button, Btn | Klickbar | `pad 12 24 rad 8 cursor pointer` |
| Card | Content-Container | `bg white pad 16 rad 12 shadow` |
| Input, Field | Eingabe | `w full pad 12 bor 1 $border rad 8` |
| Header | Top-Navigation | `hor spread pad 16 h 60` |
| Modal, Dialog | Overlay | `bg white pad 24 rad 16 shadow lg` |
| Avatar | Profilbild | `rad full w 40 h 40 fit cover` |
| Badge | Label | `pad 4 8 rad full bg $muted size 12` |
| List | Items | `ver gap 8` |
| Nav | Navigation | `hor gap 16` |

### Text-Content

| Text enthält | LLM inferiert | Zusätzliche Props |
|--------------|---------------|-------------------|
| "Kaufen", "Submit", "Speichern" | Primary CTA | `bg $primary col white bold` |
| "Abbrechen", "Cancel" | Secondary | `bg transparent bor 1` |
| "Löschen", "Delete" | Destructive | `bg $error col white` |
| "..." (kurz) | Icon-Button | `pad 8 rad full` |
| Email/URL | Link | `col $primary underline` |

### Kombinationen

```
"LoginButton" = Login (Auth) + Button (CTA)
  → bg $primary col white pad 12 24 rad 8 bold w full

"UserAvatar" = User (Profile) + Avatar (Image)
  → rad full w 40 h 40 fit cover bg $muted

"ErrorMessage" = Error (State) + Message (Text)
  → col $error bg $error-light pad 12 rad 8
```

---

## Technische Architektur

### Komponenten

```
studio/
├── llm/
│   ├── copilot/
│   │   ├── CopilotEngine.ts      # Hauptlogik
│   │   ├── ContextBuilder.ts     # Sammelt Kontext
│   │   ├── TriggerDetector.ts    # Erkennt wann aktivieren
│   │   ├── SuggestionCache.ts    # Caching für Speed
│   │   └── PatternLearner.ts     # Lernt Projekt-Patterns
│   └── ...
├── editor/
│   └── GhostTextRenderer.ts      # Ghost-Text Anzeige
```

### Datenfluss

```
Editor Change Event
       │
       ▼
┌──────────────┐
│ TriggerDetector │ ─── Kein Trigger? → Stop
└──────────────┘
       │ Trigger erkannt
       ▼
┌──────────────┐
│ ContextBuilder │ ─── Sammelt Parent, Siblings, Tokens
└──────────────┘
       │
       ▼
┌──────────────┐
│ SuggestionCache │ ─── Cache Hit? → Direkt anzeigen
└──────────────┘
       │ Cache Miss
       ▼
┌──────────────┐
│ LLM API Call │ ─── Haiku für Speed
└──────────────┘
       │ Streaming Response
       ▼
┌──────────────┐
│ GhostTextRenderer │ ─── Zeigt Ghost-Text
└──────────────┘
       │
       ▼
User Interaktion (Tab/Esc/Weiter tippen)
```

### Performance-Optimierungen

```typescript
// 1. Debouncing
const TRIGGER_DEBOUNCE_MS = 300

// 2. Caching
interface CacheKey {
  componentName: string
  parentContext: string
  hasTokens: boolean
}
const suggestionCache = new LRUCache<CacheKey, string>(1000)

// 3. Streaming
async function* streamSuggestion(context: CopilotContext) {
  const stream = await llm.stream(buildPrompt(context))
  for await (const chunk of stream) {
    yield chunk // Sofort anzeigen
  }
}

// 4. Prefetching
function prefetchLikelySuggestions(context: CopilotContext) {
  const likelyNext = predictNextComponents(context)
  likelyNext.forEach(comp => {
    queueMicrotask(() => fetchSuggestion(comp))
  })
}

// 5. Local Model Fallback
const USE_LOCAL_FOR_COMMON = true
const commonPatterns = loadCommonPatterns() // Ohne API-Call
```

### Latenz-Budget

| Phase | Max. Zeit |
|-------|-----------|
| Trigger Detection | 10ms |
| Context Building | 20ms |
| Cache Lookup | 5ms |
| LLM First Token | 200ms |
| Total to Ghost | ~250ms |

**Ziel:** Ghost-Text erscheint bevor User weiter tippt.

---

## LLM Configuration

### Model Selection

```typescript
const COPILOT_CONFIG = {
  model: 'claude-3-haiku',  // Schnellstes Model
  maxTokens: 100,           // Kurze Responses
  temperature: 0.3,         // Konsistente Outputs
  stopSequences: ['\n'],    // Nur eine Zeile
}
```

### System Prompt

```
Du bist ein UI-Styling-Assistent für die Mirror DSL.

REGELN:
1. Antworte NUR mit Properties, keine Erklärungen
2. Nutze verfügbare Tokens ($name) wenn passend
3. Halte es minimal - nur essentielle Properties
4. Orientiere dich an Sibling-Styling für Konsistenz
5. Bei Unsicherheit: weniger ist mehr

BEISPIELE:
- "LoginForm" → ver gap 16 pad 24 bg white rad 12 shadow
- "SubmitButton" → bg $primary col white pad 12 24 rad 8 bold
- "ErrorText" → col $error size 14

VERFÜGBARE TOKENS:
{tokens}

AKTUELLE HIERARCHIE:
{hierarchy}
```

---

## User Settings

```typescript
interface CopilotSettings {
  enabled: boolean              // An/Aus
  aggressiveness: 'minimal' | 'moderate' | 'proactive'
  autoAcceptDelay?: number      // Auto-Accept nach X Sekunden
  showConfidence: boolean       // Confidence-Badge anzeigen
  learnFromProject: boolean     // Projekt-Patterns lernen
  preferTokens: boolean         // Tokens > Hardcoded Values
}
```

### Aggressiveness Levels

| Level | Verhalten |
|-------|-----------|
| **minimal** | Nur bei hoher Confidence (>0.9) |
| **moderate** | Bei mittlerer Confidence (>0.7), Standard |
| **proactive** | Immer vorschlagen, auch bei niedriger Confidence |

---

## Privacy & Offline

### Local-First Option

```typescript
// Für einfache Patterns: Lokale Rules statt LLM
const localRules: Rule[] = [
  { match: /Button/i, suggest: 'pad 12 24 rad 8 cursor pointer' },
  { match: /Card/i, suggest: 'bg white pad 16 rad 12 shadow' },
  { match: /Input/i, suggest: 'w full pad 12 bor 1 $border rad 8' },
  // ...
]

function getLocalSuggestion(name: string): string | null {
  for (const rule of localRules) {
    if (rule.match.test(name)) return rule.suggest
  }
  return null
}

// Hybrid: Lokal für bekannte, LLM für unbekannte
async function getSuggestion(context: CopilotContext) {
  const local = getLocalSuggestion(context.componentName)
  if (local) return local

  if (settings.offlineMode) return null
  return await llmSuggestion(context)
}
```

### Data Handling

- Code wird nur für Suggestion gesendet
- Keine persistente Speicherung auf Server
- Opt-in für Pattern Learning
- Lokaler Cache nur auf Device

---

## Implementierungs-Roadmap

### Phase 1: Basic Copilot (2 Wochen)
- [ ] Trigger Detection (Pause nach Komponenten-Name)
- [ ] Simple Context (nur aktueller Name)
- [ ] LLM Integration (Haiku)
- [ ] Ghost-Text Rendering
- [ ] Tab to Accept

### Phase 2: Context Awareness (1-2 Wochen)
- [ ] Parent/Sibling Context
- [ ] Token Detection
- [ ] Hierarchie-Parsing

### Phase 3: Performance (1 Woche)
- [ ] Response Caching
- [ ] Streaming Display
- [ ] Debouncing Tuning

### Phase 4: Intelligence (2 Wochen)
- [ ] Semantic Name Parsing
- [ ] Sibling Consistency
- [ ] Pattern Learning

### Phase 5: Polish (1 Woche)
- [ ] Partial Accept (Cmd+→)
- [ ] Confidence Display
- [ ] Settings UI
- [ ] Local Fallback Rules

---

## Metriken

| Metrik | Ziel |
|--------|------|
| Time to Suggestion | < 300ms |
| Acceptance Rate | > 50% |
| Partial Accept Rate | > 20% |
| Cache Hit Rate | > 60% |
| User Satisfaction | > 4/5 |

---

## Risiken & Mitigations

| Risiko | Mitigation |
|--------|------------|
| Latenz zu hoch | Aggressive Caching, Local Fallback |
| Suggestions nervig | Debouncing, Confidence Threshold |
| Falsche Suggestions | Easy Dismiss (Esc), Learning |
| API Kosten | Caching, Haiku Model, Local Rules |
| Privacy Concerns | Opt-in, Local-First Option |

---

## Offene Fragen

1. **Multi-Line?** Soll Copilot auch Children vorschlagen?
2. **Explanation?** Hover über Ghost zeigt Reasoning?
3. **Undo-Granularität?** AI-Accept als eigener Undo-Step?
4. **Team Learning?** Shared Patterns im Team?
5. **Figma Integration?** Styles aus Figma-Selection?
