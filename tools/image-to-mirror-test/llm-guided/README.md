# LLM-Guided Image-to-Mirror Analysis

## Übersicht

Drei Ansätze wurden implementiert und getestet:

| Ansatz           | Beschreibung                              | Tests | Status          |
| ---------------- | ----------------------------------------- | ----- | --------------- |
| **Hybrid**       | LLM→Struktur, Pixel→Werte, Merge          | 4/4   | ✅ Funktioniert |
| **Orchestrator** | LLM ruft Tools, leitet Regeln ab          | 2/3   | ⚠️ Tool-Limit   |
| **Combined**     | Hybrid + Regelableitung + Table Detection | 25/25 | ✅ Empfohlen    |

## Architektur

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Bild      │────▶│  Pixel-Analyzer │────▶│ Präzise     │
│  (PNG)      │     │  (deterministic)│     │ Werte       │
└─────────────┘     └─────────────────┘     └──────┬──────┘
                                                   │
┌─────────────┐     ┌─────────────────┐            │
│   Bild      │────▶│      LLM        │            │
│  (PNG)      │     │  (semantic)     │            │
└─────────────┘     └────────┬────────┘            │
                             │                     │
                    ┌────────▼────────┐            │
                    │  Semantic       │            │
                    │  Structure      │            │
                    └────────┬────────┘            │
                             │                     │
                    ┌────────▼─────────────────────▼──────┐
                    │              MERGER                  │
                    │  - Kombiniert Struktur + Werte      │
                    │  - Leitet Regeln ab (Tokens)        │
                    └────────┬────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Mirror Code    │
                    │  + Tokens       │
                    └─────────────────┘
```

## Dateien

```
llm-guided/
├── schema.ts           # TypeScript Types für semantische Analyse
├── types.ts            # Basis-Types (LLMAnalysis, ElementHint, etc.)
├── mock-llm.ts         # Mock LLM für Tests
├── merger.ts           # Kombiniert Semantic + Pixel
├── claude-cli.ts       # Claude CLI Integration (für echte LLM-Calls)
├── table-detector.ts   # Table Pattern Detection & Code Generation
├── component-patterns.ts # Component Patterns & Role-based Styling
│
├── combined/           # Combined Approach (empfohlen)
│   ├── index.ts        # Pipeline: Semantic + Pixel → Code + Tokens
│   ├── test.ts         # End-to-End Tests (28 Tests)
│   └── rule-derivation.test.ts  # Unit Tests für Regelableitung
│
├── orchestrator/       # Orchestrator Approach
│   ├── tools.ts        # Deterministische Tools (findRegions, etc.)
│   ├── strategy.ts     # LLM-Strategie und Code-Generator
│   └── test-v2.ts      # Tests mit bestehendem Analyzer
│
└── tests/              # Einzelne Test-Schritte
    ├── step1-1-single-button.ts
    ├── step1-2-button-with-icon.ts
    ├── hybrid-flow-test.ts
    └── real-llm-test.ts
```

## Combined Approach (Empfohlen)

### Ablauf

1. **LLM analysiert Bild** → Gibt semantische Struktur zurück:

   ```json
   {
     "description": "Card mit Titel und Button",
     "componentType": "Card",
     "children": [
       { "type": "Text", "role": "heading", "text": "Titel" },
       { "type": "Button", "role": "action", "text": "OK" }
     ]
   }
   ```

2. **Pixel-Analyzer** → Findet präzise Werte:

   ```mirror
   Frame w 250, h 150, bg #1a1a1a, rad 12, gap 12
     Text "Titel", col white, fs 18
     Frame w 80, h 36, bg #2271c1, rad 6
   ```

3. **Merger** → Kombiniert beide:
   - Struktur vom LLM
   - Werte vom Pixel-Analyzer
   - Leitet Regeln ab

4. **Output**:

   ```mirror
   // Tokens
   radius.default: 12
   color.primary.bg: #1a1a1a
   color.accent.bg: #2271c1

   // Code
   Frame bg $color.primary, rad $radius, gap 12
     Text "Titel", col white, fs 18
     Button "OK", bg $color.accent, rad 6
   ```

### Regelableitung

Der Combined Approach analysiert die Pixelwerte und leitet automatisch ab:

| Regel-Typ          | Erkennung                               | Beispiel                                                |
| ------------------ | --------------------------------------- | ------------------------------------------------------- |
| **Gap**            | Konsistenter Abstand zwischen Elementen | `space.gap: 12`                                         |
| **Radius**         | 1-4 stufiges Radius-System              | `radius.sm: 4`, `radius.md: 8`, `radius.lg: 12`         |
| **Farben**         | Primary/Secondary + Akzentfarben        | `color.primary.bg: #1a1a1a`, `color.accent.bg: #2271C1` |
| **Padding**        | Konsistente Innenabstände               | `space.pad: 16`                                         |
| **Typografie**     | Font-Size-Hierarchie (h1-small)         | `type.h1.fs: 32`, `type.body.fs: 14`                    |
| **Spacing-System** | 4px oder 8px Grid-Erkennung             | `space.base: 4`                                         |

### Akzentfarben-Erkennung

Das System erkennt automatisch Akzentfarben - gesättigte Farben, die auf interaktive Elemente hindeuten:

- **Blautöne** (#2271C1, #2563eb) - Primary Actions
- **Grüntöne** (#10b981, #22c55e) - Success States
- **Rottöne** (#ef4444) - Danger/Error
- **Lila** (#7c3aed) - Special Actions

### Typografie-System

Bei mehreren Font-Größen wird automatisch eine Hierarchie abgeleitet:

```
type.h1.fs: 32    // Größte Schrift
type.h2.fs: 24    // Zweitgrößte
type.body.fs: 16  // Standard Text
type.caption.fs: 14
type.small.fs: 12 // Kleinste Schrift
```

### Spacing-System (Grid-Erkennung)

Das System analysiert alle Spacing-Werte (Gap, Padding, Radius) und erkennt ob sie einem Grid folgen:

- **4px Grid**: Alle Werte sind Vielfache von 4 (4, 8, 12, 16, 20, 24...)
- **8px Grid**: Alle Werte sind Vielfache von 8 (8, 16, 24, 32...)

Wenn ≥70% der Werte dem Grid entsprechen, wird `space.base` abgeleitet.

### Component Patterns

Das System verwendet vordefinierte Patterns für UI-Komponenten, um fehlende Pixel-Daten zu ergänzen:

**Unterstützte Komponenten:**
| Komponente | Default Radius | Default Padding | Default Gap |
|------------|----------------|-----------------|-------------|
| Button | 6 | 10 20 | - |
| Input | 4 | 8 12 | - |
| Card | 12 | 16 | 12 |
| Dialog | 16 | 24 | 16 |
| Form | - | 20 | 16 |
| FormField | - | - | 4 |
| Header | - | 16 | - |
| Navigation | - | 12 | 4 |

**Role-based Styling:**
| Role | Font Size | Font Weight | Color | Background |
|------|-----------|-------------|-------|------------|
| heading | 18 | bold | - | - |
| subheading | 16 | 500 | - | - |
| description | 14 | - | #888888 | - |
| label | 12 | - | #888888 | - |
| caption | 12 | - | #666666 | - |
| value | 24 | bold | - | - |
| action/submit | - | - | white | #2271C1 |
| cancel | - | - | white | #333333 |
| danger | - | - | white | #ef4444 |

**Fallback-Tracking:**
Das System trackt welche Fallbacks verwendet wurden:

```
Erkenntnisse:
  - 3 Elemente mit Component-Pattern-Defaults
  - 2 Elemente mit Role-based Styling
  - 1 fehlende Kinder aus Semantic ergänzt
```

### Component Definition Extraction

Das System erkennt automatisch wiederverwendbare Komponenten und generiert Mirror-Definitionen:

**Erkannte Komponenten:**

- Button, Card, Badge, Avatar, NavItem, Tab, Toast, Dialog, Input, FormField, Tag

**Voraussetzungen für Extraktion:**

- Element hat mindestens 2 sinnvolle Eigenschaften (bg, rad, pad, gap, etc.)
- Element ist kein einfacher Text oder Icon

**Generierter Code:**

```mirror
// Komponenten-Definitionen

Button as Button: bg #2271C1, rad 6, pad 10 20
Card: bg #1a1a1a, rad 12, pad 16, gap 12
Badge: bg #10b981, rad 4, pad 4 8
```

**Integration in Pipeline-Output:**

```typescript
const result = runCombinedPipeline({ semanticAnalysis, pixelCode })

console.log(result.componentDefinitions) // Array von Definitionen
console.log(result.componentDefinitionsCode) // Mirror Definition Code
```

### Table Detection

Wenn die semantische Analyse `componentType: "Table"` liefert, wird automatisch nach Tabellen-Mustern gesucht:

**Erkennungs-Kriterien:**

- Reguläre Zeilenhöhen (≤50% Varianz oder ≤20px Differenz)
- Mindestens 2 Zeilen mit je ≥2 Spalten
- Konsistente horizontale Layouts in den Zeilen

**Spalten-Erkennung:**

1. Primär: X-Positionen aus Pixel-Analyse (10px Grid-Rounding)
2. Fallback: Zell-Reihenfolge + Breiten wenn x=0

**Generierter Code:**

```mirror
Frame bg #1a1a1a, rad 8, gap 0
  Frame hor, bg #333333, pad 12
    Text "Name", w 150, col #888888, fs 12
    Text "Status", w 100, col #888888, fs 12
  Frame hor, pad 12
    Text "Max Mustermann", w 150, col white, fs 14
    Text "Aktiv", w 100, col #10b981, fs 14
```

## Tests ausführen

```bash
# Rule Derivation Unit Tests (6/6 Tests)
npx tsx tools/image-to-mirror-test/llm-guided/combined/rule-derivation.test.ts

# Hybrid Approach
npx tsx tools/image-to-mirror-test/llm-guided/tests/hybrid-flow-test.ts

# Combined Approach (End-to-End)
npx tsx tools/image-to-mirror-test/llm-guided/combined/test.ts

# Real Screen Tests (6 realistische UI-Screens)
npx tsx tools/image-to-mirror-test/llm-guided/combined/real-screens-test.ts

# Orchestrator Approach
npx tsx tools/image-to-mirror-test/llm-guided/orchestrator/test-v2.ts
```

### Test-Status

| Test Suite      | Status   | Beschreibung                  |
| --------------- | -------- | ----------------------------- |
| Rule Derivation | 6/6 ✅   | Unit Tests für Regelableitung |
| Hybrid Flow     | 4/4 ✅   | Semantic + Pixel Merge        |
| Combined E2E    | 30/30 ✅ | End-to-End mit Pixel-Analyzer |
| Real Screens    | 6/6 ✅   | Realistische UI-Screens       |
| Orchestrator    | 2/3 ⚠️   | LLM Tool-Orchestrierung       |

### Test Cases (30 Total)

**Basic (4):** Button-Paar, Card, Form, Typografie

**Complex (6):**
| Test | Beschreibung |
|------|--------------|
| Dashboard Stats Grid | 2x2 Card Grid (low contrast) |
| Sidebar Navigation | Vertical nav with icons |
| Profil-Card mit Avatar | Nested layout with avatar |
| Verschachtelte Cards | Cards within cards |
| Settings Toggle Panel | Toggle switches |
| Tabbed Interface | Tabs with content |

**Advanced (10):**
| Test | Beschreibung |
|------|--------------|
| Notification Toast | Success toast mit Icon und Close |
| Search Bar mit Filter | Suchleiste mit Dropdown |
| Breadcrumb Navigation | Pfad-Navigation |
| Progress Steps | 3-Schritt Stepper |
| Data Table Row | Tabellenzeile mit Avatar |
| Pricing Card | Preiskarte mit Features |
| Chat Message | Chat-Bubble mit Avatar |
| Metric Card mit Trend | KPI-Karte mit Trend-Badge |
| Action Bar | Button-Gruppe horizontal |
| Empty State | Leerzustand mit CTA |

**Semantic Layout (3):**
| Test | Beschreibung |
|------|--------------|
| Header mit Spread | `spread`, `ver-center` vom LLM |
| Root-Level Grow | `grow` auf Root-Ebene |
| Zentrierter Dialog | `center` Alignment |

**Component Patterns (3):**
| Test | Beschreibung |
|------|--------------|
| Button Roles | submit/cancel/danger mit Role-Styling |
| Form with Labels | FormField Pattern mit Label+Input |
| Card with Heading | Card Pattern mit heading/description Roles |

**Component Definition Extraction (2):**
| Test | Beschreibung |
|------|--------------|
| Multiple Buttons | Extrahiert Button-Definitionen aus Button-Gruppe |
| Reusable Card | Extrahiert Card- und Button-Definitionen |

**Table Detection (2):**
| Test | Beschreibung |
|------|--------------|
| Simple Data Table | Datentabelle mit Header + 3 Rows |
| Zebra-Striped Table | Tabelle mit alternierenden Farben |

### Real Screen Tests (6 Total)

Realistische UI-Screens zum Testen der End-to-End Pipeline:

| Screen                | Beschreibung                                | Tokens erkannt                 |
| --------------------- | ------------------------------------------- | ------------------------------ |
| Dashboard Overview    | Stats-Cards, Quick Actions, Recent Activity | Spacing-System, Akzentfarben   |
| Settings Page         | Profil, Toggles, Form Fields                | Typografie-Hierarchie          |
| User Management Table | Suche, Filter, Datentabelle                 | Radius-System, Gap-System      |
| Chat Interface        | Nachrichtenverlauf, Avatar, Eingabe         | Avatar-Radius, Bubble-Styling  |
| Product Grid          | Sidebar-Filter, Produkt-Cards               | Card-Pattern, Rating-Icons     |
| Login Screen          | Formular, Social Login                      | Form-Styling, Button-Hierarchy |

**Erkenntnisse aus Real Screen Tests:**

- ✅ Spacing-System (4px/8px Grid) wird zuverlässig erkannt
- ✅ Radius-Hierarchien (sm/md/lg) werden abgeleitet
- ✅ Akzentfarben werden von neutralen Farben unterschieden
- ✅ Component Definitions werden aus wiederholten Patterns extrahiert
- ✅ Font-Normalisierung korrigiert unrealistische Pixel-Werte automatisch
- ✅ Struktur-Vereinfachung entfernt unnötige Wrapper-Frames

### Post-Processing Verbesserungen

**Font-Size-Normalisierung:**

```
Pixel-Analyzer: fs 104, fs 96, fs 64  →  Nach Normalisierung: fs 24, fs 24, fs 18
```

Unrealistische Font-Größen (>48px) werden automatisch auf plausible Werte korrigiert:

- Werte >80px → 24px (heading)
- Werte >60px → 18px (subheading)
- Sonstige → 14px (body)

Role-basierte Korrektur:

- `heading` → 24px
- `subheading`, `title` → 18px
- `body`, `description` → 14px
- `label`, `caption` → 12px
- `value`, `metric` → 28px

**Struktur-Vereinfachung:**
Unnötige Single-Child-Wrapper werden entfernt wenn:

- Kein `borderRadius`, `padding`, `gap`
- Keine semantische Bedeutung (type, role)
- Hintergrundfarbe ≈ Parent-Farbe (Differenz <10)

## Bekannte Limitierungen

### 1. Pixel-Analyzer

**Was funktioniert:**

- ✅ Horizontale/vertikale Layouts mit Gap werden erkannt
- ✅ Text-Heuristik filtert Anti-Aliasing-Artefakte
- ✅ Verschachtelte Frames mit ausreichend Kontrast
- ✅ Border, Radius, Padding Erkennung
- ✅ ±2px Toleranz für Grid-Erkennung (18px → 4px Grid)

**Limitierungen:**

- ⚠️ Low-Contrast (< 20 Farbwertdifferenz) - Kinder werden nicht erkannt
- ⚠️ Layout-Semantik (`spread`, `ver-center`, `grow`) nicht erkennbar
- ⚠️ Icons in farbigen Containern werden als Rectangles erkannt
- ⚠️ Reine Text-Layouts (ohne Frames) werden schlecht erkannt
- ⚠️ Anti-aliasierter Text auf farbigen Hintergründen erzeugt Artefakte

### 2. LLM-Integration

- Claude CLI spawning ist langsam
- Für Tests werden Mock-Responses verwendet

### 3. Spacing-Regel Ableitung

- ✅ ±2px Toleranz für Grid-Matching hinzugefügt
- ⚠️ Spacing-Regel nur bei ≥60% Grid-Übereinstimmung

### 4. Table Detection

- ✅ Infrastruktur für Tabellen-Erkennung implementiert
- ✅ Column-Erkennung aus Zell-Reihenfolge (wenn x-Positionen fehlen)
- ✅ Wrapper-Struktur-Handling für verschachtelte Elemente
- ⚠️ Pixel-Analyzer liefert oft unzureichende Struktur für genaue Tabellen-Erkennung
- ⚠️ Low-Contrast Rows werden nicht als separate Elemente erkannt

## Nächste Schritte

1. **Pixel-Analyzer**
   - Low-Contrast Detection verbessern (adaptive Schwellwerte)
   - Icon-Erkennung durch Shape-Matching statt Rectangle-Detection
   - Robustere Behandlung von Anti-Aliasing auf farbigen Backgrounds
   - X/Y-Positionen in Output aufnehmen für präzisere Table Detection

2. **LLM-Integration**
   - Direkte Vision-API nutzen statt CLI
   - LLM kann gezielt nachfragen ("Was ist bei Position X,Y?")
   - Layout-Semantik (`spread`, `grow`) aus semantischer Analyse ableiten

3. **Merger verbessern**
   - LLM-Struktur als Leitfaden für Pixel-Analyse nutzen
   - Bei fehlenden Pixel-Daten auf LLM-Hints zurückfallen
   - Komponenten-Patterns (Card, Button, Input) aus Struktur erkennen

4. **Table Detection**
   - Header-Erkennung durch Font-Gewicht und Hintergrundfarbe
   - Spalten-Alignment erkennen (left, center, right)
   - Zebra-Striping als Pattern erkennen und als Token ableiten

## Verwendung in Produktion

```typescript
import { runCombinedPipeline } from './llm-guided/combined'

// LLM analysiert das Bild (oder Mock für Tests)
const semanticAnalysis = await llm.analyze(imagePath)

// Pixel-Analyzer liefert präzise Werte
const pixelCode = await analyzer.analyze(imagePath)

// Combined Pipeline
const result = runCombinedPipeline({
  semanticAnalysis,
  pixelCode,
})

console.log(result.mirrorCode) // Generierter Mirror Code
console.log(result.tokensCode) // Abgeleitete Tokens
console.log(result.derivedRules) // Erkannte Regeln
console.log(result.insights) // Erkenntnisse
```
