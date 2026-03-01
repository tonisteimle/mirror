# Form Spezifikation

> Deterministische Code-Generierung für Formulare

## Taxonomie

Formulare haben viele Dimensionen. Das Schema trennt diese sauber, das LLM wählt passend zum Use-Case.

### Form-Level Dimensionen

| Dimension | Optionen | Default | Status |
|-----------|----------|---------|--------|
| **layout** | vertical, horizontal, inline, grid | vertical | ✅ vertical, grid |
| **columns** | 1, 2, 3, 4, auto | 1 | ✅ 1-4 |
| **labelPosition** | top, left, floating, hidden | top | ✅ top, left, hidden |
| **requiredStyle** | asterisk, text, dot, none | asterisk | ✅ asterisk |
| **errorDisplay** | below, inline, tooltip, summary | below | ✅ below |
| **density** | compact, default, spacious | default | ✅ all |
| **submitPosition** | bottom, inline, sticky, none | bottom | ✅ bottom |

### Field-Level Dimensionen

| Dimension | Optionen | Default | MVP | Phase 2 |
|-----------|----------|---------|-----|---------|
| **size** | sm, md, lg | md | ✅ md | |
| **variant** | outline, filled, underline | outline | ✅ outline | filled |
| **iconPosition** | left, right, none | none | | left, right |
| **helperPosition** | below, tooltip, none | below | ✅ below | |
| **width** | full, auto, fixed | full | ✅ full | |

### Input-spezifische Dimensionen

| Control | Dimensionen | MVP | Phase 2 |
|---------|-------------|-----|---------|
| **password** | showToggle: true/false | ✅ showToggle | |
| **textarea** | rows, resize, counter, maxLength | ✅ rows | counter |
| **number** | stepper, min, max, step | | stepper |
| **select** | searchable, clearable | | clearable |
| **checkbox** | style: checkbox, switch, button | | switch |
| **radio** | style: radio, button, card | | button |

---

## Feld-Typen

### Kern-Input Controls

| Control | Beschreibung | Status |
|---------|--------------|--------|
| **Text** | Single line | ✅ |
| **Email** | Mit Validierung | ✅ |
| **Password** | Show/hide Toggle | ✅ |
| **Textarea** | Multi line | ✅ |
| **Select** | Dropdown | ✅ Phase 2 |
| **Number** | Mit min/max/step | ✅ Phase 3 |
| Checkbox | Single | Phase 3 |
| Radio | Group | Phase 3 |
| Switch | Toggle | Phase 3 |
| Search | Mit Clear | Phase 3 |
| Multi-select | Mehrere Optionen | Phase 3 |
| Combobox | Autocomplete | Phase 3 |
| Date/Time | Datum & Zeit | Phase 3 |

### Labels, Hilfe, Meta

| Element | Beschreibung | Status |
|---------|--------------|--------|
| **Label** | Mit required marker | MVP |
| **Placeholder** | Im Input | MVP |
| **Helper** | Hilfstext unter Feld | MVP |
| **Error** | Fehlermeldung | MVP |
| Prefix/Suffix | "CHF", "%", "kg" | Phase 2 |
| Tooltip/Info | Info-Icon | Phase 2 |
| Character counter | Für Textarea | Phase 2 |

### Struktur

| Element | Beschreibung | Status |
|---------|--------------|--------|
| **Form** | Root Container | MVP |
| **Field** | Label + Control + Help + Error | MVP |
| FieldRow | 1-n Spalten | Phase 2 |
| Section | Titel, Beschreibung, collapsible | Phase 2 |
| Fieldset | Semantische Gruppe | Phase 2 |

### Aktionen

| Element | Beschreibung | Status |
|---------|--------------|--------|
| **Submit** | Primary Button | MVP |
| Cancel | Secondary/Ghost Button | MVP |
| Reset | Formular zurücksetzen | Phase 2 |

### States & Validierung

| Element | Status |
|---------|--------|
| **Focus State** | MVP |
| **Invalid State** | MVP |
| **Required Marker** | MVP |
| Disabled State | Phase 2 |
| Valid State | Phase 2 |
| Error Summary | Phase 2 |

---

## Häufige Patterns

| Pattern | Dimensionen | Status |
|---------|-------------|--------|
| **Login Form** | vertical, 2 fields, submit | MVP |
| **Signup Form** | vertical/grid, 4-6 fields | MVP |
| **Contact Form** | vertical, textarea | MVP |
| Settings Form | sections, switches | Phase 2 |
| Filter Form | horizontal, compact, no labels | Phase 2 |
| Data Entry | grid, columns, prefix/suffix | Phase 2 |
| Inline Edit | horizontal, auto-save | Phase 3 |
| Wizard Step | sticky footer, navigation | Phase 3 |

---

## Feature Status

| Feature | Status |
|---------|--------|
| Form Container (vertical, gap, padding) | ✅ |
| Field Component (Label + Input + Error) | ✅ |
| Input Types: text, email, password, textarea | ✅ |
| Focus State (background change) | ✅ |
| Invalid State (error border + error text) | ✅ |
| Submit Button | ✅ |
| Required Marker (asterisk) | ✅ |
| **Password Toggle** (on/off states) | ✅ |
| **Multiple Densities** (compact, default, spacious) | ✅ |
| **Label Position** (top, left, hidden) | ✅ |
| **Helper Text** (visible, hidden on invalid) | ✅ |
| **Grid Layout** (columns, colSpan) | ✅ Phase 2 |
| **Select Input** (dropdown with Value slot) | ✅ Phase 2 |
| **Number Input** (min/max/step) | ✅ Phase 3 |
| Grouped Sections | Phase 4 |
| Checkbox/Radio/Switch | Phase 4 |
| Prefix/Suffix | Phase 4 |
| Character Counter | Phase 4 |

---

## Generierter Code

### MVP: Login Form

```mirror
$bg: #18181B
$input: #27272A
$input-focus: #3F3F46
$text: #D4D4D8
$muted: #71717A
$primary: #3B82F6
$primary-hover: #2563EB
$error: #EF4444

Label:
  fs 13, col $muted

LabelRequired:
  hor, gap 0
  Text "", fs 13, col $muted
  Asterisk " *", col $error

InputWrapper:
  width full, bg $input, rad 6
  focus
    bg $input-focus
  state disabled
    opacity 0.5
  state invalid
    bor 1, boc $error

TextInput from InputWrapper:
  Input "", pad 10 12, bg transparent, col $text, width full

PasswordInput from InputWrapper:
  hor, ver-center
  Input "", pad 10 12, bg transparent, col $text, width full, type password
  Toggle hug, h full, ver-center, pad 0 12, cursor pointer
    Icon named EyeIcon, "eye", col $muted, is 20
    state on
      EyeIcon "eye-off"
    onclick toggle-state self
  state Toggle.on
    Input type text

Field:
  ver, gap 4
  Label
  TextInput
  Error "", fs 12, col $error, hidden
  state invalid
    TextInput invalid
    Error visible

FieldRequired:
  ver, gap 4
  LabelRequired
  TextInput
  Error "", fs 12, col $error, hidden
  state invalid
    TextInput invalid
    Error visible

PasswordField:
  ver, gap 4
  Label
  PasswordInput
  Error "", fs 12, col $error, hidden
  state invalid
    PasswordInput invalid
    Error visible

PrimaryButton:
  pad 12 24, bg $primary, col white, rad 6, cursor pointer, width full
  hover
    bg $primary-hover

Form ver, gap 16, pad 24, bg $bg, rad 8
  Field Label "Email"; Input type email, "you@example.com"
  PasswordFieldRequired Text "Password"; Input "••••••••"
  PrimaryButton "Sign In"
```

**Wichtige Konzepte:**

1. **InputWrapper**: Basis-Komponente mit allen States (focus, disabled, invalid)
2. **State-Delegation**: Field aktiviert `TextInput invalid`, InputWrapper zeigt Border
3. **Password Toggle**: `named EyeIcon` + `state Toggle.on` für korrekte State-Kopplung
4. **Helper/Error**: Helper sichtbar, wird bei invalid versteckt

### MVP: Contact Form mit Helper

```mirror
$bg: #18181B
$input: #27272A
$input-focus: #3F3F46
$text: #D4D4D8
$muted: #71717A
$primary: #3B82F6
$error: #EF4444

// ... InputWrapper, TextInput, TextareaInput wie oben ...

Field:
  ver, gap 4
  Label
  TextInput
  Helper "", fs 12, col $muted
  Error "", fs 12, col $error, hidden
  state invalid
    TextInput invalid
    Helper hidden
    Error visible

TextareaField:
  ver, gap 4
  Label
  TextareaInput
  Helper "", fs 12, col $muted
  Error "", fs 12, col $error, hidden
  state invalid
    TextareaInput invalid
    Helper hidden
    Error visible

Form ver, gap 16, pad 24, bg $bg, rad 8
  FieldRequired Text "Name"; Input ""; Helper "Ihr vollständiger Name"
  FieldRequired Text "Email"; Input type email, ""; Helper "Wird nicht veröffentlicht"
  Field Label "Subject"; Input ""
  TextareaFieldRequired Text "Message"; Textarea ""; Helper "Mindestens 10 Zeichen"
  PrimaryButton "Send Message"
```

### MVP: Horizontal Label (labelPosition: left)

```mirror
// ... Tokens wie oben ...

FieldHorizontal:
  hor, ver-center, gap 16
  Label width 120, right
  FieldContent ver, gap 4, width full
    TextInput
    Helper "", fs 12, col $muted
    Error "", fs 12, col $error, hidden
  state invalid
    TextInput invalid
    Helper hidden
    Error visible

Form ver, gap 12, pad 24, bg $bg, rad 8
  FieldHorizontal Label "Company"; Input ""
  FieldHorizontal Label "Email"; Input type email, ""
  FieldHorizontal Label "Phone"; Input type tel, ""
  PrimaryButton "Save"
```

### MVP: Hidden Label (labelPosition: hidden)

```mirror
// ... Tokens wie oben ...

FieldHidden:
  ver, gap 4
  TextInput
  Error "", fs 12, col $error, hidden
  state invalid
    TextInput invalid
    Error visible

FilterForm hor, gap 8, pad 12, bg $bg, rad 6
  FieldHidden Input "Search..."
  PrimaryButton "Search"
```

### Phase 2: Grid Layout (columns: 2)

```mirror
$bg: #18181B
$input: #27272A
$text: #D4D4D8
$muted: #71717A
$primary: #3B82F6
$error: #EF4444

// ... InputWrapper, Field wie oben ...

Form ver, gap 16, pad 24, bg $bg, rad 8
  FieldGrid grid 2, gap 16
    FieldRequired Text "First Name"; Input ""
    FieldRequired Text "Last Name"; Input ""
    FieldRequired Text "Email"; Input type email, "", grid-column span 2
  PrimaryButton "Create Account"
```

**Wichtig:** `grid-column span 2` wird auf Felder mit `colSpan: 2` angewendet.

### Phase 2: Select Field

```mirror
// ... Tokens, InputWrapper wie oben ...

SelectInput from InputWrapper:
  hor, ver-center, pad 10 12, cursor pointer
  Value "", col $text, width full
  Icon "chevron-down", col $muted, is 18
  state open
    Icon "chevron-up"

SelectField:
  ver, gap 4
  Label
  SelectInput
  Error "", fs 12, col $error, hidden
  state invalid
    SelectInput invalid
    Error visible

Form ver, gap 16, pad 24, bg $bg, rad 8
  SelectField Label "Country"; Value "Select country..."
  SelectField Label "Language"; Value "Select language..."
  PrimaryButton "Save"
```

### Phase 3: Number Field

```mirror
// ... Tokens, InputWrapper wie oben ...

NumberInput from InputWrapper:
  Input type number, "", pad 10 12, bg transparent, col $text, width full

NumberField:
  ver, gap 4
  Label
  NumberInput
  Error "", fs 12, col $error, hidden
  state invalid
    NumberInput invalid
    Error visible

Form ver, gap 16, pad 24, bg $bg, rad 8
  NumberField Label "Quantity"; Input "", min 0, max 100, step 1
  NumberField Label "Price"; Input "", min 0, step 0.01
  PrimaryButton "Save"
```

**Unterstützte Attribute:** `min`, `max`, `step` für Validierung und Schrittweite.

### Struktur

```
Form (Container)
  ├── Field / FieldRequired / FieldHorizontal / FieldHidden
  │     ├── Label / LabelRequired (Slot, nur bei top/left)
  │     ├── TextInput / PasswordInput / TextareaInput (erbt von InputWrapper)
  │     │     └── InputWrapper hat: focus, disabled, invalid states
  │     ├── Helper (optional, sichtbar, bei invalid versteckt)
  │     ├── Error (hidden, bei invalid sichtbar)
  │     └── state invalid
  │           ├── TextInput invalid  ← delegiert an InputWrapper
  │           ├── Helper hidden
  │           └── Error visible
  ├── FieldGrid (für Grid-Layouts)
  │     └── Field (multiple)
  └── PrimaryButton / SecondaryButton / GhostButton
```

### Architektur

```
┌─────────────────────────────────────────────────────────────┐
│ Expert (form.ts)                                             │
│ → LLM Prompt + JSON Validation + Builder-Aufruf              │
├─────────────────────────────────────────────────────────────┤
│ Builder (builders/form.ts)                                   │
│ → Schema → Mirror Code                                       │
├─────────────────────────────────────────────────────────────┤
│ Pattern (patterns/field.ts)                                  │
│ → Field = Label + Input + Helper + Error                     │
│ → Varianten: Field, FieldRequired, FieldHorizontal, FieldHidden │
│ → Je Typ: TextField, PasswordField, TextareaField            │
├─────────────────────────────────────────────────────────────┤
│ Primitives                                                   │
│ ├── input.ts → InputWrapper, TextInput, PasswordInput, ...   │
│ ├── label.ts → Label, LabelRequired                          │
│ └── button.ts → PrimaryButton, SecondaryButton, GhostButton  │
└─────────────────────────────────────────────────────────────┘
```

**Warum diese Trennung?**

| Schicht | Verantwortung | Wiederverwendung |
|---------|---------------|------------------|
| Expert | LLM-Kommunikation, Prompt | Nur für Forms |
| Builder | JSON → Code Transformation | Nur für Forms |
| Pattern | Field-Struktur (Label + Input + Error) | Tabs, Dialoge |
| Primitives | Basis-Elemente (Input, Button) | Überall |

---

## Schema

### Input Format

Das LLM liefert JSON:

```typescript
interface FormInput {
  // Form-Level
  layout?: 'vertical' | 'horizontal' | 'inline' | 'grid';
  columns?: number;
  labelPosition?: 'top' | 'left' | 'floating' | 'hidden';
  requiredStyle?: 'asterisk' | 'text' | 'dot' | 'none';
  density?: 'compact' | 'default' | 'spacious';

  // Content
  fields: Array<{
    type: 'text' | 'email' | 'password' | 'textarea' | 'number' | 'select';
    name: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    helper?: string;

    // Password-specific
    showToggle?: boolean;

    // Textarea-specific
    rows?: number;
    counter?: boolean;
    maxLength?: number;

    // Grid-specific
    colSpan?: number;
  }>;

  // Actions
  submit?: { label: string };
  cancel?: { label: string };

  // Container
  container?: {
    background?: string;
    padding?: number;
    radius?: number;
  };
}
```

### Beispiel LLM Responses

**Login Form:**
```json
{
  "fields": [
    { "type": "email", "name": "email", "label": "Email", "required": true },
    { "type": "password", "name": "password", "label": "Password", "required": true, "showToggle": true }
  ],
  "submit": { "label": "Sign In" }
}
```

**Contact Form:**
```json
{
  "fields": [
    { "type": "text", "name": "name", "label": "Name", "required": true },
    { "type": "email", "name": "email", "label": "Email", "required": true },
    { "type": "text", "name": "subject", "label": "Subject" },
    { "type": "textarea", "name": "message", "label": "Message", "required": true, "rows": 5 }
  ],
  "submit": { "label": "Send Message" }
}
```

**Signup (Grid):**
```json
{
  "layout": "grid",
  "columns": 2,
  "fields": [
    { "type": "text", "name": "firstName", "label": "First Name", "required": true },
    { "type": "text", "name": "lastName", "label": "Last Name", "required": true },
    { "type": "email", "name": "email", "label": "Email", "required": true, "colSpan": 2 },
    { "type": "password", "name": "password", "label": "Password", "required": true, "showToggle": true },
    { "type": "password", "name": "confirm", "label": "Confirm Password", "required": true }
  ],
  "submit": { "label": "Create Account" }
}
```

---

## Design Defaults

Alle Styling-Entscheidungen sind fix - das LLM hat keinen Einfluss darauf.

### Farben (Semantische Rollen)

| Rolle | Hex | Verwendung |
|-------|-----|------------|
| `surface` | #18181B | Form Hintergrund |
| `elevated` / `$input` | #27272A | Input Hintergrund |
| `hover` / `$input-focus` | #3F3F46 | Input Focus-Hintergrund |
| `default` / `$text` | #D4D4D8 | Input Text |
| `muted` | #71717A | Label, Placeholder, Icon |
| `primary` | #3B82F6 | Primary Button |
| `primary-hover` | #2563EB | Primary Button Hover |
| `danger` / `$error` | #EF4444 | Error Text, Error Border |

### Density

| Density | Input Padding | Font Size | Icon Size | Radius |
|---------|---------------|-----------|-----------|--------|
| compact | 6 10 | 12 | 16 | 4 |
| default | 10 12 | 13 | 20 | 6 |
| spacious | 14 16 | 14 | 24 | 8 |

### Field Density

| Density | Field Gap | Error Font | Helper Font | Label Width (horizontal) |
|---------|-----------|------------|-------------|--------------------------|
| compact | 3 | 11 | 11 | 100 |
| default | 4 | 12 | 12 | 120 |
| spacious | 6 | 13 | 13 | 140 |

### Weitere Defaults

| Property | Wert |
|----------|------|
| Form Gap | 16px (zwischen Fields) |
| Form Padding | 24px |
| Horizontal Gap | 16px (Label zu Input bei left) |

---

## LLM Prompt

### Patterns

| Pattern | Beschreibung | Felder |
|---------|--------------|--------|
| LOGIN_FORM | Email + Password | 2 |
| SIGNUP_FORM | Name, Email, Password | 4-6 |
| CONTACT_FORM | Name, Email, Message | 3-5 |
| SETTINGS_FORM | Verschiedene Einstellungen | 5+ |
| SEARCH_FORM | Suchfeld inline | 1 |
| FILTER_FORM | Kompakte Filter | 2-4 |

### Icon-Katalog (für Password Toggle)

```
eye, eye-off
```

---

## Dateien

```
src/services/generation/
├── index.ts                           # Public API
├── design-defaults.ts                 # Semantische Rollen → Werte
├── primitives/
│   ├── index.ts                       # Re-exports
│   ├── button.ts                      # Button variants
│   ├── input.ts                       # Input types
│   └── label.ts                       # Label variants
├── schemas/
│   └── form.ts                        # Zod Schema + Defaults
├── builders/
│   └── form.ts                        # Schema → Mirror Code
├── prompts/
│   └── form.ts                        # LLM Prompt
└── experts/
    └── form.ts                        # Kombiniert alles
```

---

## Usage

### Mit LLM

```typescript
import { generateForm } from './services/generation';

const result = await generateForm(
  "Login-Formular für SaaS-App",
  llmCall
);

console.log(result.code);  // Mirror Code
```

### Ohne LLM (direktes Schema)

```typescript
import { generateFormFromSchema } from './services/generation';

// Login
const result = generateFormFromSchema({
  fields: [
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'password', name: 'password', label: 'Password', required: true, showToggle: true }
  ],
  submit: { label: 'Sign In' }
});

// Contact mit Textarea
const contactForm = generateFormFromSchema({
  fields: [
    { type: 'text', name: 'name', label: 'Name', required: true },
    { type: 'email', name: 'email', label: 'Email', required: true },
    { type: 'textarea', name: 'message', label: 'Message', required: true }
  ],
  submit: { label: 'Send' }
});
```

---

## Geplante Erweiterungen

### Phase 2: Layout & Controls

**Neue Dimensionen:**
- Layout: `horizontal`, `grid`
- Columns: 2-4
- LabelPosition: `left`

**Neue Field Types:**
- `select` mit Options
- `checkbox`, `radio`, `switch`
- `number` mit Stepper

**Neue Features:**
- Sections mit Title/Description
- Prefix/Suffix für Inputs
- Character Counter für Textarea

### Phase 3: Advanced

- Date/Time Picker
- Multi-select/Combobox
- Conditional Fields (`showIf`)
- File Upload
- Error Summary
- Sticky Footer
- Auto-save

---

## Vergleich mit Navigation

| Aspekt | SidebarNavigation | Form |
|--------|-------------------|------|
| **Dimensionen** | 3 (visibility, structure, itemStyle) | 7+ (layout, density, labelPosition, ...) |
| **Field Types** | 1 (NavItem) | 6+ (text, email, password, textarea, ...) |
| **Layouts** | 1 (vertical) | 3+ (vertical, horizontal, hidden) |
| **Nesting** | Groups (1 Level) | Sections (Phase 2) |
| **States** | 2 (active, hover) | 4+ (focus, invalid, disabled, on/off) |
| **Primitives** | Keine (inline im Builder) | 3 (input.ts, label.ts, button.ts) |
| **Patterns** | Keine | 1 (field.ts) |

**Konsequenz:** Form hat mehr bewegliche Teile, daher modularer Aufbau mit Primitives und Patterns.

---

## Tests

**207 Tests bestanden** - Builder, Schema, Expert, E2E

```bash
npx vitest run src/__tests__/generation/

# Spezifisch:
npx vitest run src/__tests__/generation/form.test.ts
npx vitest run src/__tests__/generation/e2e.test.ts
npx vitest run src/__tests__/generation/live-expert.test.ts
```

Test-Kategorien:

| Kategorie | Tests | Beschreibung |
|-----------|-------|--------------|
| `form.test.ts` | Builder | Schema → Mirror Code |
| `architecture.test.ts` | Architektur | Keine doppelten Definitionen |
| `e2e.test.ts` | End-to-End | Generierter Code parst korrekt |
| `live-expert.test.ts` | LLM | Echte LLM-Aufrufe (skippt ohne API Key) |
