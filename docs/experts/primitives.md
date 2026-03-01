# Primitives Spezifikation

> Atomare UI-Bausteine für deterministische Code-Generierung

## Konzept

Primitives sind die kleinsten wiederverwendbaren Einheiten im LLM-Generation-System. Sie werden von Patterns und Experts kombiniert.

```
Primitives (Atome)
    ↓ kombiniert zu
Patterns (Moleküle)
    ↓ orchestriert von
Experts (Organismen)
    ↓ generiert
Mirror Code
```

### Eigenschaften von Primitives

| Eigenschaft | Beschreibung |
|-------------|--------------|
| **Atomar** | Kleinste sinnvolle Einheit |
| **Konfigurierbar** | Über TypeScript-Config steuerbar |
| **Deterministisch** | Gleiche Config → gleicher Output |
| **Kombinierbar** | Können zu Patterns zusammengesetzt werden |
| **Token-aware** | Liefern benötigte Design-Tokens mit |

---

## Primitive Katalog

### Button

Generiert Button-Varianten für verschiedene Zwecke.

| Variant | Verwendung | Status |
|---------|------------|--------|
| **primary** | Hauptaktion | MVP |
| **secondary** | Sekundäre Aktion | MVP |
| **ghost** | Tertiäre Aktion | MVP |
| **danger** | Destruktive Aktion | MVP |

**Config:**
```typescript
interface ButtonConfig {
  variants: ('primary' | 'secondary' | 'ghost' | 'danger')[];
  density: 'compact' | 'default' | 'spacious';
  fullWidth?: boolean;
}
```

**Density-Werte:**

| Density | Height | Horizontal Padding | Font Size | Icon Size |
|---------|--------|-------------------|-----------|-----------|
| compact | 28px | 12px | 12px | 16px |
| default | 38px | 16px | 13px | 18px |
| spacious | 48px | 20px | 14px | 20px |

**Generierter Code (Primary, default density):**
```mirror
$text: #D4D4D8
$primary: #3B82F6
$primary-hover: #2563EB

PrimaryButton:
  hug, h 38, pad 0 16, ver-center, bg $primary, col white, rad 4, cursor pointer, line 1
  hover
    bg $primary-hover
```

**Generierter Code (alle Varianten):**
```mirror
$text: #D4D4D8
$primary: #3B82F6
$primary-hover: #2563EB
$surface: #27272A
$surface-hover: #3F3F46
$danger: #EF4444
$danger-hover: #DC2626

PrimaryButton:
  hug, h 38, pad 0 16, ver-center, bg $primary, col white, rad 4, cursor pointer, line 1
  hover
    bg $primary-hover

SecondaryButton:
  hug, h 38, pad 0 16, ver-center, bg $surface, col $text, rad 4, cursor pointer, line 1
  hover
    bg $surface-hover

GhostButton:
  hug, h 38, pad 0 16, ver-center, bg transparent, col $text, rad 4, cursor pointer, line 1
  hover
    bg $surface-hover

DangerButton:
  hug, h 38, pad 0 16, ver-center, bg $danger, col white, rad 4, cursor pointer, line 1
  hover
    bg $danger-hover
```

---

### Input

Generiert Input-Komponenten für verschiedene Eingabetypen.

| Type | Beschreibung | Status |
|------|--------------|--------|
| **text** | Einzeilige Texteingabe | MVP |
| **email** | E-Mail-Eingabe | MVP |
| **password** | Passwort mit Toggle | MVP |
| **textarea** | Mehrzeilige Eingabe | MVP |
| **select** | Dropdown (visuell) | Phase 2 |

**Config:**
```typescript
interface InputConfig {
  types: ('text' | 'email' | 'password' | 'textarea' | 'select')[];
  density: 'compact' | 'default' | 'spacious';
  withPasswordToggle?: boolean;
}
```

**Density-Werte:**

| Density | Vertical Padding | Horizontal Padding | Font Size | Textarea Min-Height |
|---------|-----------------|-------------------|-----------|---------------------|
| compact | 6px | 10px | 12px | 80px |
| default | 10px | 12px | 13px | 100px |
| spacious | 14px | 16px | 14px | 120px |

**Generierter Code (TextInput):**
```mirror
$input: #27272A
$input-focus: #3F3F46
$text: #D4D4D8
$muted: #71717A

TextInput:
  Input "", pad 10 12, bg $input, col $text, rad 4, width full
  focus
    bg $input-focus
```

**Generierter Code (PasswordInput mit Toggle):**
```mirror
$input: #27272A
$input-focus: #3F3F46
$text: #D4D4D8
$muted: #71717A

PasswordInput:
  hor, ver-center, bg $input, rad 4
  Input "", pad 10 12, bg transparent, col $text, width full, type password
  Toggle hor, hug, h full, ver-center, pad 0 12, cursor pointer
    Icon "eye", col $muted, is 18, h 18, line 1
    state visible
      Icon "eye-off", h 18, line 1
    onclick toggle-state self
  focus
    bg $input-focus
  state visible
    Input type text
```

**Generierter Code (TextareaInput):**
```mirror
TextareaInput:
  Textarea "", pad 10 12, bg $input, col $text, rad 4, minh 100, width full
  focus
    bg $input-focus
```

**Generierter Code (SelectInput):**
```mirror
SelectInput:
  hor, ver-center, pad 10 12, bg $input, col $text, rad 4, cursor pointer
  Value "", width full
  Icon "chevron-down", col $muted, is 16, h 16, line 1
  focus
    bg $input-focus
```

---

### Label

Generiert Label-Komponenten mit Required-Indikatoren.

| Variant | Beschreibung | Status |
|---------|--------------|--------|
| **Label** | Einfaches Label | MVP |
| **LabelRequired (asterisk)** | Mit Sternchen | MVP |
| **LabelRequired (text)** | Mit "(required)" | Phase 2 |
| **LabelRequired (dot)** | Mit rotem Punkt | Phase 2 |

**Config:**
```typescript
interface LabelConfig {
  requiredStyle: 'asterisk' | 'text' | 'dot' | 'none';
  density: 'compact' | 'default' | 'spacious';
}
```

**Density-Werte:**

| Density | Font Size | Gap |
|---------|-----------|-----|
| compact | 11px | 3px |
| default | 13px | 4px |
| spacious | 14px | 5px |

**Generierter Code (Asterisk):**
```mirror
$muted: #71717A

Label:
  fs 13, col $muted

LabelRequired:
  hor, gap 0
  Text "", fs 13, col $muted
  Asterisk " *", fs 13, col $muted
```

**Generierter Code (Text):**
```mirror
LabelRequired:
  hor, gap 4
  Text "", fs 13, col $muted
  Required "(required)", col $muted, fs 12
```

**Generierter Code (Dot):**
```mirror
$muted: #71717A
$error: #EF4444

LabelRequired:
  hor, ver-center, gap 4
  Dot 6, 6, rad 999, bg $error
  Text "", fs 13, col $muted
```

---

## Design Defaults

Alle Primitives nutzen das zentrale Design-System.

### Semantische Rollen

**Background:**
| Rolle | Hex | Verwendung |
|-------|-----|------------|
| app | #09090B | Tiefster Hintergrund |
| surface | #18181B | Standard-Oberflächen |
| elevated | #27272A | Erhöhte Oberflächen (Inputs) |
| hover | #3F3F46 | Hover-States |
| primary | #3B82F6 | Primäre Aktionen |
| danger | #EF4444 | Gefährliche Aktionen |

**Foreground:**
| Rolle | Hex | Verwendung |
|-------|-----|------------|
| default | #D4D4D8 | Standard-Text |
| muted | #71717A | Sekundärer Text, Icons |
| heading | #FAFAFA | Überschriften |
| primary | #3B82F6 | Primärfarbe als Text |
| danger | #EF4444 | Fehler-Text |
| onPrimary | #FFFFFF | Text auf Primary |

**Spacing:**
| Rolle | Wert | Verwendung |
|-------|------|------------|
| xs | 4px | Kleine Abstände |
| sm | 8px | Standard-Abstände |
| smd | 12px | Icon-Text Gap |
| md | 16px | Mittlere Abstände |
| lg | 24px | Große Abstände |

**Radius:**
| Rolle | Wert |
|-------|------|
| none | 0px |
| sm | 4px |
| md | 8px |
| lg | 12px |
| full | 9999px |

---

## API

### Builder-Pattern

Jedes Primitive exportiert einen Builder:

```typescript
// Button
import { buildButtons, ButtonConfig, ButtonResult } from './primitives/button';

const config: ButtonConfig = {
  variants: ['primary', 'secondary'],
  density: 'default',
  fullWidth: false
};

const result: ButtonResult = buildButtons(config);
// result.tokens: Map<string, string> - benötigte Tokens
// result.definitions: string[] - Mirror-Code-Zeilen
```

```typescript
// Input
import { buildInputs, InputConfig, InputResult } from './primitives/input';

const config: InputConfig = {
  types: ['text', 'password'],
  density: 'default',
  withPasswordToggle: true
};

const result: InputResult = buildInputs(config);
```

```typescript
// Label
import { buildLabels, LabelConfig, LabelResult } from './primitives/label';

const config: LabelConfig = {
  requiredStyle: 'asterisk',
  density: 'default'
};

const result: LabelResult = buildLabels(config);
```

### Convenience-Funktionen

```typescript
// Nur Definitionen als String
import { getButtonDefinitions } from './primitives/button';
const code = getButtonDefinitions({ variants: ['primary'], density: 'default' });

// Nur Tokens als String
import { getButtonTokens } from './primitives/button';
const tokens = getButtonTokens({ variants: ['primary'], density: 'default' });

// Density-Einstellungen abrufen
import { getInputDensity } from './primitives/input';
const d = getInputDensity('default'); // { padding: [10, 12], fontSize: 13, minHeight: 100 }
```

---

## Kombination in Patterns

Primitives werden zu Patterns kombiniert:

```typescript
// Field Pattern (kombiniert Label + Input)
function buildField(config: FieldConfig): string[] {
  const labels = buildLabels({
    requiredStyle: config.requiredStyle,
    density: config.density
  });

  const inputs = buildInputs({
    types: config.inputTypes,
    density: config.density,
    withPasswordToggle: config.passwordToggle
  });

  // Kombiniere zu Field-Definition
  return [
    'Field:',
    '  ver, gap 4',
    '  Label:',
    '  Input:',
    '  Error "", fs 12, col $error, hidden',
    '  state invalid',
    '    Input bor 1 $error',
    '    Error visible'
  ];
}
```

---

## Dateien

```
src/services/generation/
├── design-defaults.ts         # Semantische Rollen → Werte
└── primitives/
    ├── index.ts               # Re-exports
    ├── button.ts              # Button-Varianten
    ├── input.ts               # Input-Typen
    └── label.ts               # Label-Varianten
```

---

## Erweiterbarkeit

### Neues Primitive hinzufügen

1. **Datei erstellen:** `src/services/generation/primitives/[name].ts`

2. **Standard-Struktur:**
```typescript
// Types
export interface [Name]Config { ... }
export interface [Name]Result {
  tokens: Map<string, string>;
  definitions: string[];
}

// Density Settings (falls relevant)
const [NAME]_DENSITY = { ... };

// Token Builder
function build[Name]Tokens(config: [Name]Config): Map<string, string> { ... }

// Definition Builders
function build[Variant](config: [Name]Config): string[] { ... }

// Main Builder
export function build[Name]s(config: [Name]Config): [Name]Result { ... }

// Convenience Exports
export function get[Name]Definitions(config: [Name]Config): string { ... }
export function get[Name]Tokens(config: [Name]Config): string { ... }
```

3. **Export in index.ts:**
```typescript
export * from './[name]';
```

### Geplante Primitives

| Primitive | Verwendung | Phase |
|-----------|------------|-------|
| **Checkbox** | Form, Settings | Phase 2 |
| **Radio** | Form, Selection | Phase 2 |
| **Switch** | Settings, Toggles | Phase 2 |
| **Badge** | Navigation, Status | Phase 2 |
| **Avatar** | Profile, Lists | Phase 2 |
| **Icon** | Universal | Phase 2 |
| **Divider** | Sections | Phase 2 |

---

## Tests

```bash
npm test -- primitives
```

Test-Dateien:
- `src/__tests__/generation/primitives/button.test.ts`
- `src/__tests__/generation/primitives/input.test.ts`
- `src/__tests__/generation/primitives/label.test.ts`
