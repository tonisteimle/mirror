# LLM Generation Architecture

> Architektur für zuverlässige Mirror-Code-Generierung durch LLMs

## Das Problem

LLMs haben Schwierigkeiten, korrekten Mirror-Code zu generieren. Bisherige Ansätze:

| Ansatz | Problem |
|--------|---------|
| Direktes Mirror generieren | Zu viele Regeln gleichzeitig (Syntax, Semantik, Design) |
| React-Pivot | Zu viele Freiheitsgrade, keine kanonische Form |
| Große Prompts mit allen Regeln | LLM kann nicht alles gleichzeitig beachten |

**Das Kernproblem ist ein Freiheitsgrad-Problem.** Je mehr Freiheit das LLM hat, desto mehr Fehlerquellen gibt es.

## Die Lösung

### Prinzip 1: Entscheidungen statt Code

Das LLM sollte nie freien Code generieren - sondern Entscheidungen treffen.

```
❌ LLM → Code → Hoffen dass es stimmt → Reparieren
✅ LLM → Entscheidungen (validiert) → Deterministischer Code
```

Ein Designer trifft Entscheidungen: Welche Struktur? Welches Layout? Welche Farben? Das LLM formalisiert diese Entscheidungen als JSON, ein deterministischer Builder erzeugt den Code.

### Prinzip 2: Hierarchische Zerlegung

UI baut sich auf wie Lego-Bausteine. Das LLM arbeitet genauso:

```
"App mit Navigation und Formular"
              ↓
┌─────────────────────────────────┐
│ Architekt                        │
│ "Du brauchst: Nav, Form, Layout" │
└─────────────────────────────────┘
              ↓
     ┌────────┴────────┐
     ↓                 ↓
┌─────────┐      ┌─────────┐
│ Nav-    │      │ Form-   │     ← parallel, isoliert
│ Builder │      │ Builder │
└─────────┘      └─────────┘
     ↓                 ↓
     └────────┬────────┘
              ↓
┌─────────────────────────────────┐
│ Assemblierer                     │
│ Fügt Komponenten ins Layout      │
└─────────────────────────────────┘
              ↓
         Mirror Code
```

### Prinzip 3: Spezialisierte Experten

Jeder Builder ist ein Experte für ein UI-Pattern:

| Experte | Kennt | Kennt nicht |
|---------|-------|-------------|
| NavigationExpert | Nav-Patterns, Active-States | Formulare |
| FormExpert | Inputs, Validation, Submit | Navigation |
| ListExpert | Iteration, Master-Detail | Dialoge |
| DialogExpert | Overlay, Open/Close | Listen |
| LayoutExpert | Struktur, Spacing | Inhalte |

**Kontext-Reduktion ist der Schlüssel.** Ein LLM das nur Navigation bauen muss, braucht nicht alle Mirror-Regeln.

### Prinzip 4: Design ist kein LLM-Entscheidung

Das LLM wählt Rollen, nicht Werte:

```typescript
// Das LLM sagt:
{ "background": "elevated" }

// Der Builder wendet an:
bg #27272A  // aus DESIGN_DEFAULTS
```

Zurückhaltendes, professionelles Grayscale-Design entsteht durch fixe Defaults, nicht durch LLM-Kreativität.

## Architektur

### Pipeline

```
User Intent
    ↓
┌─────────────────────────────────┐
│ Architekt (LLM)                  │
│ → Welche Komponenten?            │
│ → Welche Struktur?               │
│ Output: JSON mit fixem Schema    │
└─────────────────────────────────┘
    ↓ validiert
┌─────────────────────────────────┐
│ Spezialisten (LLM, parallel)     │
│ → Je einer pro Komponente        │
│ → Fokussierter Prompt            │
│ Output: JSON pro Komponente      │
└─────────────────────────────────┘
    ↓ validiert
┌─────────────────────────────────┐
│ Assemblierer (LLM oder Code)     │
│ → Fügt Komponenten zusammen      │
│ → Wendet Layout an               │
│ Output: Finales JSON             │
└─────────────────────────────────┘
    ↓ validiert
┌─────────────────────────────────┐
│ Code Generator (deterministisch) │
│ → JSON → Mirror Code             │
│ → Garantiert korrekte Syntax     │
│ → Wendet Design Defaults an      │
└─────────────────────────────────┘
    ↓
Mirror Code (garantiert korrekt)
```

### Validierung

Jede Stufe validiert das JSON-Schema. Fehler werden früh gefunden, nicht erst im generierten Code.

```typescript
// Beispiel: Navigation-Schema
interface NavigationSchema {
  direction: 'vertical' | 'horizontal';
  items: Array<{
    icon?: string;
    label: string;
    active?: boolean;
  }>;
  width?: 'hug' | 'full' | number;
}
```

### Design: Semantische Rollen

Das LLM und die Builder arbeiten nie mit konkreten Werten. Sie arbeiten mit **semantischen Rollen**. Ein separater Resolution-Layer übersetzt diese zu konkreten Werten.

```
┌─────────────────────────────────┐
│ Builder Output                   │
│ → background: "surface"          │  ← Rolle, nicht Wert
│ → padding: "md"                  │
│ → gap: "sm"                      │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ Resolution Layer                 │
│ Tokens vorhanden?                │
│ ├─ Ja → $surface.bg, $md.pad    │
│ └─ Nein → #18181B, 16           │
└─────────────────────────────────┘
              ↓
┌─────────────────────────────────┐
│ Mirror Code                      │
│ → bg #18181B  oder  bg $surface.bg │
└─────────────────────────────────┘
```

#### Warum Rollen statt Werte?

| Aspekt | Vorteil |
|--------|---------|
| Builder ist unabhängig | Kennt Token-System nicht |
| Funktioniert immer | Auch ohne Tokens |
| Nachträgliche Tokens | Einfach einbauen, Builder bleibt gleich |
| Konsistenz | Gleiche Rollen → gleiche Bedeutung |
| Testbar | Builder und Resolution separat testbar |

#### Die Rollen (Design-Vokabular)

```typescript
// Background Roles
type BackgroundRole =
  | "app"         // Tiefster Hintergrund (#09090B)
  | "surface"     // Standard-Flächen (#18181B)
  | "elevated"    // Hervorgehobene Flächen (#27272A)
  | "hover"       // Hover-Zustand (#3F3F46)
  | "active"      // Active/Selected (#3F3F46)
  | "primary"     // Primäre Aktion (#3B82F6)
  | "danger"      // Gefährliche Aktion (#EF4444)
  | "transparent" // Kein Hintergrund

// Foreground Roles
type ForegroundRole =
  | "default"     // Standard-Text (#D4D4D8)
  | "muted"       // Sekundärer Text (#71717A)
  | "heading"     // Überschriften (#FAFAFA)
  | "primary"     // Primärfarbe (#3B82F6)
  | "danger"      // Fehler/Warnung (#EF4444)
  | "on-primary"  // Text auf Primärfarbe (#FFFFFF)

// Spacing Roles
type SpacingRole = "xs" | "sm" | "md" | "lg" | "xl"
// xs=4, sm=8, md=16, lg=24, xl=32

// Radius Roles
type RadiusRole = "none" | "sm" | "md" | "lg" | "full"
// none=0, sm=4, md=8, lg=12, full=9999

// Border Roles
type BorderRole = "none" | "subtle" | "default" | "strong"
// none=0, subtle=#27272A, default=#3F3F46, strong=#52525B
```

#### Builder Output mit Rollen

```typescript
// NavigationBuilder Output (Zwischenschritt)
{
  container: {
    background: "surface",
    padding: "md",
    gap: "sm",
    width: 240
  },
  item: {
    padding: ["sm", "md"],  // vertikal, horizontal
    radius: "sm",
    background: "transparent",
    hoverBackground: "hover",
    activeBackground: "active",
    color: "default",
    activeColor: "heading"
  },
  icon: {
    size: 20,
    color: "muted"
  }
}
```

#### Resolution Layer

```typescript
function resolve(
  roles: BuilderOutput,
  tokenSystem?: TokenSystem
): ResolvedValues {

  if (tokenSystem) {
    // Tokens existieren → verwende Token-Referenzen
    return {
      background: tokenSystem.resolve("surface", "bg"),  // → "$surface.bg"
      padding: tokenSystem.resolve("md", "pad"),         // → "$md.pad"
    }
  } else {
    // Keine Tokens → Hardcoded Defaults
    return {
      background: DESIGN_DEFAULTS.background.surface,   // → "#18181B"
      padding: DESIGN_DEFAULTS.spacing.md,              // → 16
    }
  }
}
```

#### Beispiel: Generierter Code

**Ohne Tokens (Hardcoded Defaults):**
```
Nav:
  ver, gap 8, pad 16, bg #18181B

NavItem:
  hor, gap 12, pad 8 16, rad 4
  hover
    bg #3F3F46
  state active
    bg #3F3F46
    col #FAFAFA
```

**Mit Tokens (Token-Referenzen):**
```
Nav:
  ver, gap $sm.gap, pad $md.pad, bg $surface.bg

NavItem:
  hor, gap $sm.gap, pad $sm.pad $md.pad, rad $sm.rad
  hover
    bg $hover.bg
  state active
    bg $active.bg
    col $heading.col
```

**Gleicher Builder, gleiche Rollen, unterschiedliche Resolution.**

### Design Defaults

```typescript
const DESIGN_DEFAULTS = {
  background: {
    app: '#09090B',       // $grey-950
    surface: '#18181B',   // $grey-900
    elevated: '#27272A',  // $grey-800
    hover: '#3F3F46',     // $grey-700
    active: '#3F3F46',    // $grey-700
    primary: '#3B82F6',   // $blue-500
    danger: '#EF4444',    // $red-500
    transparent: 'transparent'
  },
  foreground: {
    default: '#D4D4D8',   // $grey-300
    muted: '#71717A',     // $grey-500
    heading: '#FAFAFA',   // $grey-50
    primary: '#3B82F6',   // $blue-500
    danger: '#EF4444',    // $red-500
    onPrimary: '#FFFFFF'  // white
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999
  },
  border: {
    none: null,
    subtle: '#27272A',
    default: '#3F3F46',
    strong: '#52525B'
  },
  iconSize: {
    sm: 16,
    md: 20,
    lg: 24
  }
};
```

## Use Cases

### 1. Gerüst bauen

Der Designer will eine Ausgangslage schaffen.

**Input:** "Eine App mit Navigation links und Hauptbereich rechts"

**Architekt Output:**
```json
{
  "layout": {
    "direction": "horizontal",
    "children": [
      { "ref": "nav", "width": 240 },
      { "ref": "main", "width": "full" }
    ]
  },
  "components": [
    { "id": "nav", "type": "navigation" },
    { "id": "main", "type": "container", "role": "elevated" }
  ]
}
```

**Generierter Code:**
```
App horizontal
  Nav 240, ver, pad 16, bg #18181B
  Main width full, pad 24, bg #27272A
```

### 2. Komponenten bauen

Der Designer braucht eine spezifische Komponente.

**Input:** "Eine Navigation mit 5 Items und Icons"

**NavigationExpert Output:**
```json
{
  "direction": "vertical",
  "gap": "sm",
  "items": [
    { "icon": "home", "label": "Dashboard", "active": true },
    { "icon": "users", "label": "Users" },
    { "icon": "settings", "label": "Settings" },
    { "icon": "chart", "label": "Analytics" },
    { "icon": "help", "label": "Help" }
  ]
}
```

**Generierter Code:**
```
Nav:
  ver, gap 8, pad 8

NavItem:
  hor, gap 12, pad 12, rad 8, hover-bg #3F3F46
  Icon:
  Label:
  state active
    bg #3F3F46

Nav
  NavItem Icon "home"; Label "Dashboard", active
  NavItem Icon "users"; Label "Users"
  NavItem Icon "settings"; Label "Settings"
  NavItem Icon "chart"; Label "Analytics"
  NavItem Icon "help"; Label "Help"
```

### 3. Tokens anwenden

Hier braucht es kaum LLM - eher Pattern-Matching:

```
bg #3B82F6 → bg $primary.bg
pad 16 → pad $md.pad
```

Das LLM hilft nur bei der Zuordnung: "Welcher Token passt zu diesem Wert?"

### 4. Design System anwenden

Wenn Komponenten existieren, wählt das LLM nur noch aus:

**Input:** "Ein Login-Formular"

**Output:**
```json
{
  "use": ["Card", "Input", "Button"],
  "structure": {
    "Card": {
      "children": [
        { "component": "Input", "props": { "placeholder": "Email" } },
        { "component": "Input", "props": { "placeholder": "Password", "type": "password" } },
        { "component": "Button", "props": { "label": "Login", "variant": "primary" } }
      ]
    }
  }
}
```

## LLM-Prompt-Strategie

### Prinzip: Beispiele zuerst, Regeln als Fallback

```
┌─────────────────────────────────────┐
│ 1. Beispiel-Patterns (80% der Fälle)│  ← Pattern Matching
├─────────────────────────────────────┤
│ 2. Wenn-Dann-Regeln (Randfälle)     │  ← Entscheidungslogik
├─────────────────────────────────────┤
│ 3. Schema-Referenz (Vollständigkeit)│  ← Nur bei Bedarf
└─────────────────────────────────────┘
```

**Warum dieser Ansatz?**

| Grund | Erklärung |
|-------|-----------|
| Pattern Matching ist natürlich | LLM erkennt "wie ein Admin-Panel" schneller als Regeln durchgehen |
| Weniger Entscheidungen | Pattern matchen = nicht 10 Einzelentscheidungen treffen |
| Beispiele sind eindeutig | "wie Spotify Sidebar" ist klarer als "permanent, grouped, icon-text" |
| Regeln nur für Randfälle | Wenn kein Pattern passt, dann Entscheidungsbaum |

### Prompt-Struktur für Spezialisten

```markdown
# [Spezialist-Name]

## Patterns (wähle das passendste)

PATTERN_NAME:
  "Beschreibung wann dieses Pattern passt"
  → Konfiguration als Kurzform
  Beispiel: Konkrete Anwendungsfälle

ANOTHER_PATTERN:
  "Beschreibung"
  → Konfiguration
  Beispiel: Anwendungsfälle

## Wenn kein Pattern passt

dimension1:
  Bedingung? → Wert
  Andere Bedingung? → Anderer Wert

dimension2:
  Bedingung? → Wert

## Schema (Referenz)
[Vollständiges Schema für Edge Cases]
```

### Beispiel: SidebarNavigation Prompt

```markdown
# SidebarNavigation

## Patterns (wähle das passendste)

SIMPLE_APP: ✅
  "Einfache App mit 3-6 Hauptbereichen, alle gleichwertig"
  → permanent, flat, icon-text, width: 240
  Beispiel: Einstellungen-App, kleine Tools, Portfolio

ADMIN_DASHBOARD: ✅
  "Viele Bereiche (>8), logisch gruppiert nach Funktion"
  → permanent, grouped, icon-text, width: 260
  Beispiel: Admin-Panel, CRM, Analytics-Dashboard, ERP

CONTENT_APP: ✅
  "Content steht im Fokus, Navigation ist sekundär"
  → collapsible, flat, icon-text, width: 240, railWidth: 64
  Beispiel: Dokumenten-Editor, Mail-Client, IDE

EMAIL_CLIENT: ✅
  "Kommunikations-App mit Zählern/Badges"
  → permanent, flat, badges, width: 240
  Beispiel: E-Mail, Chat, Notifications

FILE_EXPLORER: ✅
  "Hierarchische Struktur mit vielen Ebenen"
  → permanent, tree, icon-text, width: 280
  Beispiel: Dateimanager, CMS-Seitenbaum, Projekt-Explorer

MOBILE_NAV: ✅
  "Wenig Platz, Navigation bei Bedarf"
  → drawer, flat, icon-text
  Beispiel: Mobile App, responsive Webapp

## Wenn kein Pattern passt

visibility:
  Desktop + Nav wichtig? → permanent ✅
  Content-Fokus? → collapsible ✅
  Wenig Platz / Mobile? → drawer ✅

structure:
  <8 gleichwertige Items? → flat ✅
  Logische Kategorien? → grouped ✅
  Tiefe Hierarchie? → tree ✅

itemStyle: ✅
  Platz vorhanden? → icon-text (default)
  Sehr kompakt? → icon-only ✅
  Nur Text? → text-only ✅

## Schema
{ ... vollständiges JSON-Schema ... }
```

### Der LLM-Prozess

```
Input: "Navigation für eine Projektmanagement-App mit
        Projekten, Tasks, Team, Berichte, Einstellungen"

Schritt 1: Pattern-Match
  → "Projektmanagement, mehrere Bereiche, gruppierbar"
  → Matcht ADMIN_DASHBOARD (oder SIMPLE_APP bei weniger Items)

Schritt 2: Anpassen falls nötig
  → "5 Items ist noch flat, nicht grouped"
  → Nehme SIMPLE_APP

Schritt 3: Items ableiten
  → Aus Beschreibung: Projekte, Tasks, Team, Berichte, Einstellungen
  → Icons zuordnen: folder, check-square, users, bar-chart, settings

Output:
{
  "pattern": "SIMPLE_APP",
  "container": { "visibility": "permanent", "width": 240 },
  "structure": { "type": "flat" },
  "itemStyle": { "display": "icon-text" },
  "items": [
    { "icon": "folder", "label": "Projekte" },
    { "icon": "check-square", "label": "Tasks" },
    { "icon": "users", "label": "Team" },
    { "icon": "bar-chart", "label": "Berichte" },
    { "icon": "settings", "label": "Einstellungen" }
  ]
}
```

## Spezialisten

### NavigationExpert ✅ (Phase 1+2)

**Zuständig für:** Vertikale Navigation, Sidebars

**Implementiert:**
- ✅ Flat structure (einfache Liste)
- ✅ Grouped structure (Sektionen mit Überschriften)
- ✅ Collapsible/Rail mode (einklappbar)
- ✅ Badges (Zähler/Status)

**Phase 3 (Implementiert):**
- ✅ Tree structure (hierarchisch)
- ✅ Drawer (Mobile)
- ✅ itemStyle (icon-only, text-only)

→ Implementiert als SidebarNavigationExpert
→ Dokumentation: ✅ `docs/sidebar-navigation.md`

### FormExpert 🔲

**Zuständig für:** Formulare, Inputs, Validation, Submit

**Schema:**
```typescript
interface FormSchema {
  direction: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
  fields: Array<{
    type: 'text' | 'email' | 'password' | 'textarea' | 'select';
    label?: string;
    placeholder?: string;
    required?: boolean;
  }>;
  submit?: {
    label: string;
    variant?: 'primary' | 'secondary';
  };
}
```

### ListExpert 🔲

**Zuständig für:** Listen, Iteration, Master-Detail

**Schema:**
```typescript
interface ListSchema {
  itemLayout: 'simple' | 'with-icon' | 'with-avatar' | 'card';
  selectable?: boolean;
  fields: string[];  // Welche Datenfelder anzeigen
  masterDetail?: {
    detailFields: string[];
  };
}
```

### DialogExpert 🔲

**Zuständig für:** Modals, Overlays, Dropdowns

**Schema:**
```typescript
interface DialogSchema {
  type: 'modal' | 'dropdown' | 'popover';
  position?: 'center' | 'below' | 'above';
  hasClose?: boolean;
  content: ComponentRef[];
}
```

### CardExpert 🔲

**Zuständig für:** Cards, Container, Sections

**Schema:**
```typescript
interface CardSchema {
  background?: 'surface' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  radius?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md';
  slots?: Array<'header' | 'body' | 'footer' | 'image'>;
}
```

### ButtonExpert 🔲

**Zuständig für:** Buttons, Actions, Icon-Buttons

**Schema:**
```typescript
interface ButtonSchema {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right' | 'only';
  label?: string;
}
```

## Implementierungsstand

### ✅ Phase 1: SidebarNavigationExpert (Vollständig)

**Status: Implementiert, integriert und getestet (60 Tests)**

Features:
- ✅ Alle Visibility Modes (permanent, collapsible, drawer)
- ✅ Alle Structure Modes (flat, grouped, tree)
- ✅ Display Modes (icon-text, icon-only, text-only)
- ✅ Badges
- ✅ Expert Detection (`detectExpert()`)
- ✅ LLM Integration (`tryExpertPipeline()`)
- ✅ Pipeline Integration (automatisch in `translateWithJsonPipeline()`)

Dateien:
- `src/services/generation/schemas/sidebar-navigation.ts` - Zod Schema
- `src/services/generation/builders/sidebar-navigation.ts` - Deterministic Builder
- `src/services/generation/experts/index.ts` - Expert Detection & Pipeline
- `src/services/json-pipeline/index.ts` - Pipeline Integration

→ Details siehe [../sidebar-navigation.md](../sidebar-navigation.md)

### 🔲 Phase 2: Weitere Spezialisten

- FormExpert (Schema-Entwurf vorhanden)
- TabsExpert
- CardExpert
- TableExpert

Jeder folgt dem gleichen Muster wie SidebarNavigationExpert:
1. Schema definieren (Zod)
2. Builder implementieren (deterministisch)
3. Expert-Prompt schreiben (JSON-only)
4. Pattern Detection hinzufügen
5. Tests schreiben

### 🔲 Phase 3: Architekt

Erst wenn 3-4 Spezialisten funktionieren:
- Kennt die echten Fähigkeiten der Spezialisten
- Zerlegt komplexe Anfragen
- Koordiniert parallele Ausführung

### 🔲 Phase 4: Assemblierer

- Fügt Komponenten zusammen
- Wendet Layout an
- Löst Referenzen auf

---

## Expert System Implementation

### Pipeline Integration

Das Expert System ist in die JSON-Pipeline integriert und wird automatisch vor dem normalen Dispatcher geprüft:

```typescript
// src/services/json-pipeline/index.ts
export async function translateWithJsonPipeline(prompt, ...) {
  // 1. Expert Check (vor Dispatcher)
  if (!options.skipExpertCheck) {
    const expertResult = await tryExpertPipeline(prompt, {
      minConfidence: 'medium',
    });

    if (expertResult?.isValid) {
      return { code: expertResult.code, isValid: true, ... };
    }
  }

  // 2. Falls kein Expert → normale Pipeline
  const dispatchResult = await dispatch(prompt, hasExistingCode);
  // ...
}
```

### Expert Detection

Pattern-basierte Erkennung ohne LLM-Call:

```typescript
// src/services/generation/experts/index.ts
export function detectExpert(prompt: string): ExpertDetectionResult {
  // Sidebar Navigation Patterns
  const patterns = [
    /\b(sidebar|seitenleiste|navigation|nav|menü|menu)\b/i,
    /\b(nav.*(item|punkt|eintrag))/i,
  ];

  // Match + Confidence Berechnung
  const matches = patterns.filter(p => p.test(prompt));
  if (matches.length >= 2) return { expert: 'sidebar-navigation', confidence: 'high' };
  if (matches.length >= 1) return { expert: 'sidebar-navigation', confidence: 'medium' };

  return { expert: 'none', confidence: 'high' };
}
```

### Expert Pipeline Flow

```
detectExpert("Navigation für App")
       ↓
{ expert: "sidebar-navigation", confidence: "high" }
       ↓
runExpertPipeline("sidebar-navigation", prompt)
       ↓
LLM generiert JSON nach Schema-Prompt:
{
  "items": [
    { "icon": "home", "label": "Dashboard", "active": true },
    { "icon": "settings", "label": "Settings" }
  ]
}
       ↓
Zod Validation (SidebarNavigationInputSchema)
       ↓
buildSidebarNavigation(json)
       ↓
Mirror DSL Code
```

### Neuen Expert hinzufügen

1. **Schema definieren** (`schemas/form.ts`):
```typescript
export const FormInputSchema = z.object({
  fields: z.array(FieldSchema),
  buttons: z.array(ButtonSchema),
  layout: z.enum(['vertical', 'horizontal', 'grid']).optional(),
});
```

2. **Builder implementieren** (`builders/form.ts`):
```typescript
export function buildForm(input: FormInput): string {
  // Deterministisch: JSON → Mirror Code
}
```

3. **Expert-Prompt schreiben** (in `experts/index.ts`):
```typescript
const FORM_PROMPT = `Du generierst JSON für ein Formular...`;
```

4. **Pattern Detection hinzufügen**:
```typescript
const DETECTION_PATTERNS = {
  'form': [
    /\b(formular|form|eingabe|input)\b/i,
    /\b(submit|absenden|speichern)\b/i,
  ],
  // ...
};
```

5. **Pipeline erweitern**:
```typescript
if (expert === 'form') {
  return runFormExpert(prompt, startTime);
}
```

## Vorteile dieser Architektur

| Aspekt | Vorteil |
|--------|---------|
| Korrektheit | Code-Generator ist deterministisch, nicht LLM |
| Testbarkeit | Jeder Spezialist isoliert testbar |
| Parallelisierung | Spezialisten laufen parallel |
| Fehler-Isolation | Fehler in Nav betrifft Form nicht |
| Prompt-Größe | Kleine, fokussierte Prompts |
| Design-Konsistenz | Fixe Defaults, nicht LLM-Kreativität |
| Erweiterbarkeit | Neue Spezialisten folgen dem Muster |
| Debugging | JSON-Zwischenschritte sind inspizierbar |

---

## Modulare Code-Generierung

Die Code-Generierung folgt einer dreistufigen Architektur für maximale Wiederverwendbarkeit:

```
┌─────────────────────────────────────────────────────────┐
│  EXPERTS (Orchestrierung + LLM)                         │
│  navigation.ts │ form.ts │ tabs.ts │ dialog.ts          │
├─────────────────────────────────────────────────────────┤
│  PATTERNS (Kombinationen)                               │
│  nav-item.ts │ field.ts │ tab-item.ts │ accordion.ts    │
├─────────────────────────────────────────────────────────┤
│  PRIMITIVES (Basis-Bausteine)                           │
│  button.ts │ input.ts │ icon.ts │ label.ts │ tooltip.ts │
└─────────────────────────────────────────────────────────┘
```

### Wann abstrahieren?

**Regel: Abstrahieren wenn der zweite Consumer bekannt ist, nicht wenn er vermutet wird.**

| Situation | Entscheidung | Grund |
|-----------|--------------|-------|
| Form braucht Field = Label + Input + Error | ✅ Pattern erstellen | Struktur ist bekannt und fix |
| Navigation hat NavItem = Icon + Label | ❌ Nicht abstrahieren | Kein zweiter Consumer bekannt |
| TabItem könnte wie NavItem sein | ❌ Warten | "Könnte" ist Spekulation |
| TabsExpert gebaut, TabItem = NavItem | ✅ Jetzt extrahieren | Zweiter Consumer existiert |

**Beispiel: Warum Form Primitives hat**

```
Form Expert
    │
    └── Field Pattern ──┬── Label Primitive
                        ├── Input Primitive
                        └── Error (inline)

Field nutzt Input in:
├── TextField      → TextInput
├── PasswordField  → PasswordInput
├── TextareaField  → TextareaInput
└── SelectField    → SelectInput

→ Konkrete Wiederverwendung, nicht Spekulation
```

**Beispiel: Warum Navigation keine Primitives hat (noch)**

```
Navigation Expert
    │
    └── NavItem (inline im Builder)
            │
            ├── Icon  ← Nativer Primitive, keine Abstraktion nötig
            └── Label ← Einfacher Text, keine Abstraktion nötig

TabItem könnte ähnlich sein... oder auch nicht.
→ Warten bis TabsExpert existiert
```

**Konsequenz:** Die Architektur-Grafik oben zeigt den *Zielzustand*. Der aktuelle Stand:

| Schicht | Form | Navigation |
|---------|------|------------|
| Expert | ✅ form.ts | ✅ sidebar-navigation.ts |
| Pattern | ✅ field.ts | ❌ (inline im Builder) |
| Primitives | ✅ button.ts, input.ts, label.ts | ❌ (nicht nötig) |

Navigation wird erst aufgebrochen wenn ein zweiter Expert (z.B. Tabs) zeigt, dass sich NavItem-Logik wiederholt.

### Primitives

Atomare UI-Elemente. Generieren **nur Definitionen**, keine Instanzen.

```typescript
interface PrimitiveConfig {
  // Design
  density: 'compact' | 'default' | 'spacious';
  theme: 'dark' | 'light';
  variant?: string;

  // States (optional)
  states?: ('hover' | 'focus' | 'active' | 'disabled' | 'loading')[];
}

interface PrimitiveResult {
  tokens: Map<string, string>;    // $name: value
  definitions: string[];          // Component-Definitionen
  dependencies: string[];         // Benötigte andere Primitives
}
```

**Beispiel: Button Primitive**

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonConfig extends PrimitiveConfig {
  variants: ButtonVariant[];
  withIcon?: boolean;
  withLoading?: boolean;
}

function buildButtons(config: ButtonConfig): PrimitiveResult {
  // Generiert:
  // - Tokens: $primary, $primary-hover, etc.
  // - Definitionen: PrimaryButton:, SecondaryButton:, GhostButton:
  // - Dependencies: ['Icon'] wenn withIcon
}
```

**Generierter Code:**
```mirror
$primary: #3B82F6
$primary-hover: #2563EB

PrimaryButton:
  pad 12 24, bg $primary, col white, rad 4, cursor pointer
  hover
    bg $primary-hover
  state disabled
    opacity 0.5
    cursor not-allowed

GhostButton:
  pad 12 24, bg transparent, col $text, rad 4, cursor pointer
  hover
    bg $hover
```

**Weitere Primitives:**

| Primitive | Generiert | Dependencies |
|-----------|-----------|--------------|
| `input.ts` | TextInput, PasswordInput, TextareaInput | - |
| `label.ts` | Label, LabelRequired | - |
| `icon.ts` | (natives Icon) | - |
| `tooltip.ts` | Tooltip | - |
| `badge.ts` | Badge, NotificationBadge | - |

### Patterns

Kombinationen von Primitives für häufige UI-Muster.

```typescript
interface PatternConfig extends PrimitiveConfig {
  // Pattern-spezifische Optionen
}

interface PatternResult {
  tokens: Map<string, string>;
  definitions: string[];
  dependencies: string[];         // Welche Primitives werden benötigt
  primitiveConfigs: PrimitiveConfig[];  // Für automatisches Laden
}
```

**Beispiel: Field Pattern** (kombiniert Label + Input)

```typescript
interface FieldConfig extends PatternConfig {
  inputType: 'text' | 'email' | 'password' | 'textarea' | 'select';
  required?: boolean;
  requiredStyle: 'asterisk' | 'text' | 'dot' | 'none';
  withHelper?: boolean;
  withError?: boolean;
}

function buildField(config: FieldConfig): PatternResult {
  return {
    dependencies: ['Label', 'Input'],
    // ...
  };
}
```

**Generierter Code:**
```mirror
Field:
  ver, gap 4
  Label "", fs 13, col $muted
  TextInput
  Helper "", fs 12, col $muted, hidden
  Error "", fs 12, col $error, hidden
  state invalid
    TextInput bor 1 $error
    Error visible
```

**Weitere Patterns:**

| Pattern | Kombiniert | Für |
|---------|------------|-----|
| `nav-item.ts` | Button + Icon | Navigation Items |
| `tab-item.ts` | Button | Tab-Leisten |
| `accordion-item.ts` | Button + Icon | Aufklappbare Sektionen |
| `card.ts` | Container | Karten-Layouts |

### Pattern → Expert Verbindung

Experts nutzen Patterns und fügen LLM-Entscheidungen hinzu:

```typescript
// Expert für Navigation
async function generateNavigation(
  request: string,
  llmCall: LLMCallFn
): Promise<NavigationResult> {

  // 1. LLM entscheidet über Struktur
  const schema = await llmCall(NAV_PROMPT, request);

  // 2. Pattern für Items laden
  const navItemResult = buildNavItem({
    withIcon: schema.itemStyle.display !== 'text-only',
    withLabel: schema.itemStyle.display !== 'icon-only',
    density: schema.density || 'default',
    theme: 'dark'
  });

  // 3. Container bauen
  const containerResult = buildNavContainer(schema);

  // 4. Tokens mergen
  const tokens = mergeTokens([navItemResult, containerResult]);

  // 5. Instanzen generieren
  const instances = schema.items.map(item =>
    `NavItem Icon "${item.icon}"; Label "${item.label}"${item.active ? ', active' : ''}`
  );

  return {
    tokens,
    definitions: [...navItemResult.definitions, ...containerResult.definitions],
    instances
  };
}
```

### Token-Merging

Wenn mehrere Primitives/Patterns kombiniert werden:

```typescript
function mergeTokens(results: PrimitiveResult[]): Map<string, string> {
  const merged = new Map<string, string>();

  for (const result of results) {
    for (const [name, value] of result.tokens) {
      if (merged.has(name) && merged.get(name) !== value) {
        console.warn(`Token conflict: ${name}`);
        // Strategie: Erster gewinnt oder expliziter Override
      }
      merged.set(name, value);
    }
  }

  return merged;
}
```

### Density-System

Alle Primitives/Patterns respektieren die Density-Einstellung:

```typescript
const DENSITY = {
  compact: {
    padding: [6, 10],
    gap: 8,
    fontSize: 12,
    iconSize: 16,
    radius: 4
  },
  default: {
    padding: [10, 12],
    gap: 12,
    fontSize: 13,
    iconSize: 20,
    radius: 6
  },
  spacious: {
    padding: [14, 16],
    gap: 16,
    fontSize: 14,
    iconSize: 24,
    radius: 8
  },
};
```

### Validation Layer

Nach der Generierung wird der Code validiert:

```typescript
function validateGenerated(result: PatternResult): ValidationResult {
  const errors: string[] = [];

  // 1. Syntax-Check
  for (const def of result.definitions) {
    const parseResult = parse(def);
    if (parseResult.errors.length > 0) {
      errors.push(...parseResult.errors.map(e => e.message));
    }
  }

  // 2. Dependency-Check
  for (const dep of result.dependencies) {
    if (!result.definitions.some(d => d.startsWith(`${dep}:`))) {
      errors.push(`Missing dependency: ${dep}`);
    }
  }

  // 3. Token-Check
  for (const def of result.definitions) {
    const usedTokens = extractTokenRefs(def);
    for (const token of usedTokens) {
      if (!result.tokens.has(token)) {
        errors.push(`Undefined token: ${token}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## Dateien

```
src/services/generation/
├── index.ts                  # Public API
├── design-defaults.ts        # Semantische Rollen → Werte + Density
│
├── primitives/
│   ├── button.ts
│   ├── input.ts
│   ├── label.ts
│   ├── tooltip.ts
│   ├── badge.ts
│   └── index.ts              # Re-exports + mergeTokens
│
├── patterns/
│   ├── field.ts
│   ├── nav-item.ts
│   ├── tab-item.ts
│   ├── accordion-item.ts
│   ├── card.ts
│   └── index.ts
│
├── schemas/                  # Zod Schemas pro Experte
│   ├── navigation.ts
│   ├── form.ts
│   ├── tabs.ts
│   └── index.ts
│
├── builders/                 # Schema → Mirror Code
│   ├── navigation.ts
│   ├── form.ts
│   └── index.ts
│
├── prompts/                  # LLM Prompts
│   ├── navigation.ts
│   ├── form.ts
│   └── index.ts
│
├── experts/                  # Kombiniert alles
│   ├── navigation.ts
│   ├── form.ts
│   ├── tabs.ts
│   ├── dialog.ts
│   └── index.ts
│
├── validation/               # Validation Layer
│   ├── syntax-validator.ts
│   ├── dependency-checker.ts
│   └── index.ts
│
├── architect.ts              # 🔲 Geplant
└── assembler.ts              # 🔲 Geplant
```

Für Experten-Details siehe jeweilige Dokumentation:
- [sidebar-navigation.md](../sidebar-navigation.md)

---

## Migration Plan

### Phase 1: Primitives extrahieren
1. `button.ts` aus bestehenden Experts extrahieren
2. `input.ts` aus Form extrahieren
3. `label.ts` aus Form extrahieren
4. Tests für jeden Primitive

### Phase 2: Patterns erstellen
1. `field.ts` kombiniert Label + Input
2. `nav-item.ts` für Navigation
3. Tests für Kombinationen

### Phase 3: Experts refactoren
1. `navigation.ts` nutzt nav-item Pattern
2. `form.ts` nutzt field + button Patterns

### Phase 4: Neue Experts
1. `tabs.ts`
2. `dialog.ts`
3. `accordion.ts`

---

## Beantwortete Fragen

### 1. Wie granular sind die Spezialisten?

**Antwort: UI-Domain-Driven Design**

Die Granularität orientiert sich an **UI-Domänen**, nicht an technischer Komplexität:

| Spezialist | Domäne | Warum dieser Schnitt |
|------------|--------|----------------------|
| NavigationExpert | Wayfinding | Active-States, Icons, Gruppierung - eigene Logik |
| FormExpert | Data Collection | Validation, Labels, Field-States - eigene Logik |
| ListExpert | Data Display | Iteration, Selection, Master-Detail - eigene Logik |
| DialogExpert | Interruption | Overlay, Focus-Trap, Positioning - eigene Logik |
| TabsExpert | Content Organization | Activation, Panels, Indicators - eigene Logik |

**Regel:** Ein Spezialist ist dann richtig geschnitten, wenn:
1. Er **eine klare UI-Aufgabe** hat (nicht "Buttons" sondern "Navigation")
2. Er **eigene States/Behaviors** mitbringt (active, selected, expanded...)
3. Er **ohne Kontext anderer Spezialisten** arbeiten kann

**Anti-Pattern:** ButtonExpert, IconExpert, CardExpert → Das sind Primitives, keine Spezialisten. Ein "Button" ist nie alleine sinnvoll, er ist immer Teil von etwas (Form-Submit, Nav-Item, Dialog-Action).

### 2. Wann braucht es den Architekten?

**Antwort: Complexity-Based Routing**

```
┌─────────────────────────────────────────────────────┐
│ Input-Analyse (deterministisch, kein LLM)           │
│                                                     │
│ Keywords → Spezialist                               │
│ ├─ "Navigation", "Sidebar", "Menu" → NavigationExpert │
│ ├─ "Form", "Input", "Login" → FormExpert           │
│ ├─ "List", "Table", "Items" → ListExpert           │
│ └─ Mehrere Domänen erkannt? → Architekt            │
└─────────────────────────────────────────────────────┘
```

**Direkt zum Spezialisten** (kein Architekt):
- "Eine Navigation mit 5 Items" → NavigationExpert
- "Ein Login-Formular" → FormExpert
- "Eine Liste von Produkten" → ListExpert

**Über den Architekten**:
- "Eine App mit Sidebar und Formular" → Architekt zerlegt
- "Dashboard mit Charts und Einstellungen" → Architekt zerlegt
- "Komplexes Layout mit mehreren Bereichen" → Architekt zerlegt

**Implementierung:**
```typescript
function routeRequest(input: string): 'architect' | ExpertType {
  const domains = detectDomains(input); // Keyword-Matching, kein LLM

  if (domains.length === 0) return 'architect';  // Unklar → Architekt entscheidet
  if (domains.length === 1) return domains[0];   // Eindeutig → Direkt
  if (domains.length > 1) return 'architect';    // Mehrere → Architekt koordiniert

  return 'architect';
}
```

### 3. Wie mit bestehenden Komponenten umgehen?

**Antwort: Library-Aware Generation mit Zwei-Phasen-Prüfung**

**Phase 1: Vor der Generierung (Spezialist-Prompt)**
```typescript
const existingComponents = library.findSimilar('navigation');
// → ['SidebarNav', 'TopNav', 'MobileNav']

const prompt = `
Du generierst Navigation.

EXISTIERENDE KOMPONENTEN (nutze diese wenn passend):
${existingComponents.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Wenn eine existierende Komponente passt:
{ "use": "SidebarNav", "items": [...] }

Wenn keine passt, generiere neu:
{ "generate": { ... } }
`;
```

**Phase 2: Nach der Generierung (Assembler)**
```typescript
function assembleResult(expertOutput: ExpertOutput, library: Library): string {
  if (expertOutput.use) {
    // Existierende Komponente mit neuen Items
    const component = library.get(expertOutput.use);
    return instantiateWithItems(component, expertOutput.items);
  } else {
    // Neue Komponente generieren
    return buildFromSchema(expertOutput.generate);
  }
}
```

**Kein separater LibraryExpert** – jeder Spezialist kennt die relevanten Komponenten seiner Domäne.

### 4. Caching/Wiederverwendung

**Antwort: Template-Selektion statt Generierung für häufige Patterns**

**Drei Ebenen:**

```
┌─────────────────────────────────────────────────────┐
│ Level 1: Static Templates (kein LLM)                │
│ "Standard Sidebar" → vordefiniertes Template        │
│ Erkannt durch exakte Pattern-Matches                │
└─────────────────────────────────────────────────────┘
                         ↓ kein Match
┌─────────────────────────────────────────────────────┐
│ Level 2: Parameterized Templates (LLM wählt aus)    │
│ "Navigation mit 5 Items" → Template + Parameter     │
│ LLM füllt nur: items, icons, labels                 │
└─────────────────────────────────────────────────────┘
                         ↓ kein Template passt
┌─────────────────────────────────────────────────────┐
│ Level 3: Full Generation (LLM generiert Schema)     │
│ "Spezielle Navigation mit Gruppen und Badges"       │
│ Vollständige Schema-Generierung                     │
└─────────────────────────────────────────────────────┘
```

**Template-Cache:**
```typescript
const NAVIGATION_TEMPLATES = {
  'simple-sidebar': {
    matches: ['einfache sidebar', 'standard navigation', 'app navigation'],
    template: (items: NavItem[]) => buildSimpleSidebar(items)
  },
  'grouped-sidebar': {
    matches: ['admin sidebar', 'gruppierte navigation', 'sections'],
    template: (groups: NavGroup[]) => buildGroupedSidebar(groups)
  }
};

function selectTemplate(input: string): Template | null {
  for (const [id, template] of Object.entries(NAVIGATION_TEMPLATES)) {
    if (template.matches.some(m => input.toLowerCase().includes(m))) {
      return template;
    }
  }
  return null;
}
```

**Vorteil:** 80% der Anfragen brauchen kein Schema-LLM, nur Item-Extraktion.

### 5. Theming

**Antwort: Semantische Rollen + Theme-Resolution**

Das LLM und die Builder arbeiten **immer mit Rollen**, nie mit Werten:

```typescript
// Builder Output (theme-agnostisch)
{
  background: "surface",    // Rolle
  foreground: "default",    // Rolle
  accent: "primary"         // Rolle
}

// Theme-Definitionen
const THEMES = {
  dark: {
    surface: '#18181B',
    default: '#D4D4D8',
    primary: '#3B82F6'
  },
  light: {
    surface: '#FFFFFF',
    default: '#27272A',
    primary: '#2563EB'
  }
};
```

**Resolution geschieht im letzten Schritt:**

```typescript
function resolveTheme(
  roles: BuilderOutput,
  theme: 'dark' | 'light',
  useTokens: boolean
): ResolvedValues {

  if (useTokens) {
    // Token-Referenzen generieren
    return {
      background: `$${roles.background}.bg`,  // → $surface.bg
      color: `$${roles.foreground}.col`       // → $default.col
    };
  } else {
    // Direkte Werte aus Theme
    return {
      background: THEMES[theme][roles.background],  // → #18181B
      color: THEMES[theme][roles.foreground]        // → #D4D4D8
    };
  }
}
```

**Für den Nutzer:**
```typescript
// API
generateNavigation(request, {
  theme: 'dark',      // oder 'light'
  useTokens: true     // ob Token-Referenzen oder Werte
});
```

**Ergebnis mit Tokens:**
```mirror
$surface.bg: #18181B
Nav bg $surface.bg
```

**Ergebnis ohne Tokens:**
```mirror
Nav bg #18181B
```

### 6. State-Composition

**Antwort: Ownership-Hierarchie mit State-Namespacing**

**Regel:** Jede Komponente **besitzt ihre eigenen States**. Verschachtelte Patterns deklarieren States auf ihrer Ebene.

```
┌─────────────────────────────────────────────────────┐
│ Accordion (besitzt: expanded/collapsed)             │
│   ├─ Header (besitzt: hover)                        │
│   └─ Content                                        │
│       └─ Field (besitzt: focus, valid/invalid)      │
│           ├─ Label                                  │
│           └─ Input (besitzt: focus, disabled)       │
└─────────────────────────────────────────────────────┘
```

**State-Propagation bei Verschachtelung:**

```typescript
interface PatternResult {
  definitions: string[];
  states: {
    name: string;
    scope: 'self' | 'children' | 'all';
    propagates?: string[];  // States die an Kinder weitergegeben werden
  }[];
}

// Accordion Pattern
{
  states: [
    { name: 'expanded', scope: 'self' },
    { name: 'collapsed', scope: 'self' }
  ]
}

// Field Pattern
{
  states: [
    { name: 'focus', scope: 'self', propagates: ['Input'] },
    { name: 'invalid', scope: 'self', propagates: ['Input', 'Label'] }
  ]
}
```

**Generierter Code:**

```mirror
Accordion:
  state expanded
    Content visible
  state collapsed
    Content hidden

AccordionContent:
  Field
    state invalid
      Input bor 1 $error
      Label col $error
```

**Merge-Strategie:**
```typescript
function mergeStates(parent: State[], child: State[]): State[] {
  // Kinder behalten ihre States
  // Parent kann Kinder-States nicht überschreiben
  // Konflikte werden durch Namespacing gelöst

  return [
    ...parent.map(s => ({ ...s, namespace: 'parent' })),
    ...child.map(s => ({ ...s, namespace: 'child' }))
  ];
}
```

**Beispiel: Accordion mit Field**
```mirror
AccordionItem:
  ver
  AccordionHeader onclick toggle-state
    Icon "chevron-down"
    Label ""
    state expanded
      Icon rot 180
  AccordionContent hidden
    state expanded
      visible

AccordionItem
  AccordionContent
    Field Label "Email"; Input "placeholder"
      // Field States (focus, invalid) bleiben unberührt
      // Accordion States (expanded) steuern Sichtbarkeit
```

---

## Offene Implementierungsfragen

1. **Performance-Optimierung**
   - Parallele Spezialist-Aufrufe vs. sequentielle Validierung
   - Cache-Invalidierung bei Library-Änderungen

2. **Error Recovery**
   - Was wenn ein Spezialist fehlschlägt?
   - Fallback auf generischeren Spezialisten?

3. **Feedback-Loop**
   - Wie fließt User-Korrektur zurück ins System?
   - Schema-Anpassung basierend auf häufigen Korrekturen?
