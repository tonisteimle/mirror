# Mirror Bindings

> Komplexe Komponenten mit professionellen Libraries, gesteuert durch Mirror-Syntax.

## Konzept

Mirror Bindings verbinden die deklarative Mirror-Syntax mit bewährten JavaScript-Libraries. Der User schreibt nur Mirror - die komplexe Implementierung läuft im Hintergrund.

```
┌─────────────────────────────────────────────────────────────┐
│                    Mirror Syntax (API)                      │
│  Select placeholder "Wähle..."                              │
│    SelectOption "Option A"                                  │
│    SelectOption "Option B"                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Binding Layer                            │
│  Schema (Zod) → Validation → Props Transform → Styles       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 Professional Library                        │
│  @radix-ui/react-dropdown-menu (a11y, keyboard, etc.)      │
└─────────────────────────────────────────────────────────────┘
```

## Kern-Prinzip

**Mirror ist die API.** Der User interagiert nur mit Mirror-Syntax. Welche Library dahinter läuft, ist ein Implementierungsdetail.

```mirror
// User schreibt NUR das:
Select placeholder "Wähle..."
  SelectOption "Option A"
  SelectOption "Option B" selected

// Styling über normale Mirror-Syntax:
SelectOption:
  hover
    bg $hover
  state selected
    bg $primary
```

---

## Implementierte Bindings

### 1. Select (Dropdown)

**Library:** `@radix-ui/react-dropdown-menu`

| Komponente | Beschreibung |
|------------|--------------|
| `Select` | Container |
| `SelectTrigger` | Button der Dropdown öffnet |
| `SelectValue` | Angezeigter Wert |
| `SelectContent` | Dropdown-Inhalt |
| `SelectOption` | Einzelne Option |
| `SelectDivider` | Trennlinie |
| `SelectSearch` | Suchfeld (optional) |

```mirror
// Einfaches Select
Select
  SelectTrigger
    SelectValue "Auswählen..."
  SelectContent
    SelectOption "Option A"
    SelectOption "Option B"
    SelectDivider
    SelectOption "Option C"

// Mit Suche
Select searchable
  SelectTrigger
    SelectValue "Suchen..."
  SelectSearch
  SelectContent
    SelectOption "Alpha"
    SelectOption "Beta"
```

**States:**
- `open` - Dropdown ist geöffnet
- `selected` - Option ist ausgewählt
- `disabled` - Deaktiviert

---

### 2. DatePicker

**Library:** `react-day-picker` + `date-fns`

| Komponente | Beschreibung |
|------------|--------------|
| `DatePicker` | Container |
| `DatePickerInput` | Eingabefeld |
| `Calendar` | Kalender-Popup |
| `CalendarDay` | Einzelner Tag |
| `CalendarMonth` | Monat-Header |

```mirror
// Einfacher DatePicker
DatePicker
  DatePickerInput placeholder "Datum wählen..."
  Calendar
    CalendarDay
      state selected bg $primary
      state today bor 1 $primary

// Range DatePicker
DatePicker range
  DatePickerInput placeholder "Von - Bis"
  Calendar
```

**Properties:**
- `value` - Aktuelles Datum (YYYY-MM-DD)
- `format` - Anzeigeformat (DD.MM.YYYY, etc.)
- `range` - Bereichsauswahl aktivieren
- `min` / `max` - Datumsgrenzen

**States:**
- `selected` - Tag ist ausgewählt
- `today` - Aktueller Tag
- `disabled` - Tag nicht wählbar
- `range-start` / `range-end` - Bereichsanfang/-ende

---

### 3. MaskedInput

**Library:** `react-imask`

| Komponente | Beschreibung |
|------------|--------------|
| `MaskedInput` | Basis-Komponente mit Maske |
| `PhoneInput` | Telefonnummer (Preset) |
| `CreditCardInput` | Kreditkarte (Preset) |
| `IBANInput` | IBAN (Preset) |

```mirror
// Custom Mask
MaskedInput mask "00.00.0000", placeholder "Datum"

// Preset verwenden
PhoneInput placeholder "Telefon"
CreditCardInput placeholder "Kartennummer"
IBANInput placeholder "IBAN"
```

**Preset Masks:**

| Preset | Maske | Beispiel |
|--------|-------|----------|
| `phone` | `+49 000 00000000` | +49 170 12345678 |
| `credit_card` | `0000 0000 0000 0000` | 4111 1111 1111 1111 |
| `iban` | `SS00 0000 0000 0000 0000 00` | DE89 3704 0044 0532 0130 00 |
| `date` | `00.00.0000` | 15.06.2024 |
| `time` | `00:00` | 14:30 |
| `zip` | `00000` | 12345 |
| `currency` | `0.000.000,00 €` | 1.234,56 € |

**States:**
- `filled` - Maske vollständig ausgefüllt
- `invalid` - Ungültige Eingabe
- `disabled` - Deaktiviert

---

### 4. Autocomplete

**Library:** `@radix-ui/react-popover`

| Komponente | Beschreibung |
|------------|--------------|
| `Autocomplete` | Container |
| `AutocompleteInput` | Sucheingabe |
| `AutocompleteListbox` | Vorschlagsliste |
| `AutocompleteOption` | Einzelner Vorschlag |
| `AutocompleteGroup` | Gruppierung |
| `AutocompleteEmpty` | Keine Ergebnisse |

```mirror
// Einfaches Autocomplete
Autocomplete
  AutocompleteInput placeholder "Suchen..."
  AutocompleteListbox
    AutocompleteOption Label "Max Mustermann"
    AutocompleteOption Label "Anna Schmidt"

// Mit Beschreibungen
Autocomplete
  AutocompleteInput
  AutocompleteListbox
    AutocompleteOption Label "Max"; Description "Entwickler"
    AutocompleteOption Label "Anna"; Description "Designer"

// Mit Gruppen
Autocomplete
  AutocompleteInput
  AutocompleteListbox
    AutocompleteGroup "Team A"
    AutocompleteOption Label "Max"
    AutocompleteGroup "Team B"
    AutocompleteOption Label "Anna"
```

**States:**
- `open` - Listbox sichtbar
- `highlighted` - Tastatur-Highlight
- `selected` - Ausgewählt
- `loading` - Lädt Daten
- `filled` - Hat Wert

---

## Architektur

### Verzeichnisstruktur

```
src/bindings/
├── index.ts                    # Registry aller Bindings
│
├── datepicker/
│   ├── index.ts                # Exports + Binding Interface
│   ├── schema.ts               # Zod Schema (Mirror Props)
│   ├── defaults.ts             # Default Mirror Styling
│   ├── renderer.tsx            # Library Wrapper
│   └── utils.ts                # date-fns Hilfsfunktionen
│
├── dropdown/
│   ├── index.ts
│   ├── schema.ts
│   ├── defaults.ts             # → Select* Komponenten
│   └── renderer.tsx            # → @radix-ui/react-dropdown-menu
│
├── masked-input/
│   ├── index.ts
│   ├── schema.ts               # PRESET_MASKS
│   ├── defaults.ts
│   └── renderer.tsx            # → react-imask
│
└── autocomplete/
    ├── index.ts
    ├── schema.ts
    ├── defaults.ts
    └── renderer.tsx            # → @radix-ui/react-popover
```

### Binding Interface

Jedes Binding implementiert dieses Interface:

```typescript
interface Binding {
  /** Name des Bindings */
  name: string;

  /** Alle Komponenten-Namen die dieses Binding handhabt */
  components: string[];

  /** Validiert Input gegen Schema */
  validate: (input: unknown) => ValidationResult;

  /** Generiert Default-Mirror-Code (Tokens + Definitionen) */
  getDefaults: (density?: Density) => string;

  /** Prüft ob Komponente von diesem Binding gehandhabt wird */
  handles: (componentName: string) => boolean;

  /** Transformiert Mirror AST Node zu Binding Input */
  transformNode: (node: MirrorNode) => BindingInput;

  /** React Component für Rendering */
  Renderer: React.ComponentType<BindingProps>;
}
```

### Registry

```typescript
// src/bindings/index.ts
import { DatePickerBinding } from './datepicker';
import { DropdownBinding } from './dropdown';
import { MaskedInputBinding } from './masked-input';
import { AutocompleteBinding } from './autocomplete';

export const BINDINGS = [
  DatePickerBinding,
  DropdownBinding,
  MaskedInputBinding,
  AutocompleteBinding,
];

// Hilfsfunktionen
export function findBinding(componentName: string): Binding | undefined;
export function isBindingComponent(componentName: string): boolean;
export function getBindingComponentNames(): string[];
export function getAllBindingDefaults(): string;
```

---

## Schema Layer

Das Schema definiert alle Properties die Mirror akzeptiert:

```typescript
// schema.ts
export const SelectInputSchema = z.object({
  // Verhalten
  placeholder: z.string().optional(),
  searchable: z.boolean().default(false),
  multiple: z.boolean().default(false),
  disabled: z.boolean().default(false),

  // Optionen
  options: z.array(z.object({
    label: z.string(),
    value: z.string().optional(),
    icon: z.string().optional(),
  })).optional(),

  // Styling (aus Mirror extrahiert)
  styles: z.object({
    trigger: z.record(z.string()).optional(),
    content: z.record(z.string()).optional(),
    option: z.record(z.string()).optional(),
  }).optional(),
});
```

---

## Defaults Layer

Generiert Mirror-Code für Default-Styling:

```typescript
// defaults.ts
export function getDropdownDefaults(density: Density = 'default'): string {
  const d = getDensity(density);

  return `
$sel-bg: #27272A
$sel-hover: #3F3F46
$sel-selected: #3B82F6

SelectTrigger:
  hor, ver-center, gap ${d.gap}, pad ${d.gap} ${d.gap * 2}, bg $sel-bg, rad ${d.radius}
  SelectValue "", col $sel-text
  Icon "chevron-down", col $sel-muted
  hover
    bg $sel-hover
  state open
    Icon rot 180

SelectOption:
  hor, ver-center, pad ${d.gap} ${d.gap * 2}, rad ${d.radius}, cursor pointer
  hover
    bg $sel-hover
  state selected
    bg $sel-hover

Select:
  ver, hug
  SelectTrigger
  SelectContent hidden
  state open
    SelectContent visible
`;
}
```

---

## Styling-Flow

### 1. User definiert Styling in Mirror

```mirror
Select:
  SelectTrigger bg #1a1a1a, rad 12
  SelectContent shadow lg
    SelectOption
      state selected bg #3B82F6, col white
```

### 2. Parser extrahiert Styles

```typescript
{
  type: 'binding',
  binding: 'Select',
  styles: {
    trigger: { background: '#1a1a1a', borderRadius: '12px' },
    option: {
      selected: { background: '#3B82F6', color: 'white' },
    },
  },
}
```

### 3. Renderer wendet Styles auf Library an

```tsx
<RadixDropdown.Content style={styles.content}>
  {options.map(opt => (
    <RadixDropdown.Item
      style={isSelected ? styles.option.selected : styles.option.default}
    />
  ))}
</RadixDropdown.Content>
```

---

## Neues Binding erstellen

### 1. Schema definieren

```typescript
// src/bindings/my-component/schema.ts
export const MyComponentSchema = z.object({
  // Properties die Mirror akzeptiert
});

export function validateMyComponentInput(input: unknown) {
  return MyComponentSchema.safeParse(input);
}
```

### 2. Defaults erstellen

```typescript
// src/bindings/my-component/defaults.ts
export function getMyComponentDefaults(): string {
  return `
$my-bg: #27272A

MyComponent:
  // Default Mirror Styling
`;
}
```

### 3. Renderer implementieren

```typescript
// src/bindings/my-component/renderer.tsx
import { SomeLibrary } from 'some-library';

export const MyComponentRenderer: React.FC<Props> = (props) => {
  // Mirror Props → Library Props
  return <SomeLibrary {...translatedProps} />;
};
```

### 4. Binding exportieren

```typescript
// src/bindings/my-component/index.ts
export const MyComponentBinding: Binding = {
  name: 'MyComponent',
  components: ['MyComponent', 'MyComponentChild'],
  validate: validateMyComponentInput,
  getDefaults: getMyComponentDefaults,
  Renderer: MyComponentRenderer,
  handles: (name) => ['MyComponent', 'MyComponentChild'].includes(name),
  transformNode: (node) => ({ /* transform */ }),
};
```

### 5. Registrieren

```typescript
// src/bindings/index.ts
import { MyComponentBinding } from './my-component';

export const BINDINGS = [
  DatePickerBinding,
  DropdownBinding,
  MaskedInputBinding,
  AutocompleteBinding,
  MyComponentBinding,  // ← Hinzufügen
];
```

---

## Libraries

| Binding | Library | Bundle Size |
|---------|---------|-------------|
| Select | @radix-ui/react-dropdown-menu | ~15kb |
| DatePicker | react-day-picker + date-fns | ~25kb |
| MaskedInput | react-imask | ~12kb |
| Autocomplete | @radix-ui/react-popover | ~10kb |

### Warum diese Libraries?

| Kriterium | Gewählt | Alternative |
|-----------|---------|-------------|
| Accessibility | Radix (WAI-ARIA) | Headless UI |
| Bundle Size | react-day-picker | date-fns |
| Flexibilität | react-imask | cleave.js |
| Unstyled | Radix | MUI, Ant |

---

## Testing

### Unit Tests

```typescript
describe('Select Binding', () => {
  it('validates schema', () => {
    const result = validateSelectInput({ placeholder: 'Wähle...' });
    expect(result.success).toBe(true);
  });

  it('generates valid Mirror code', () => {
    const code = getSelectDefaults();
    const parsed = parse(code);
    expect(parsed.errors).toHaveLength(0);
  });

  it('handles all component names', () => {
    expect(DropdownBinding.handles('Select')).toBe(true);
    expect(DropdownBinding.handles('SelectOption')).toBe(true);
    expect(DropdownBinding.handles('Button')).toBe(false);
  });
});
```

### Testabdeckung

```
src/__tests__/bindings/
├── bindings.test.ts      # Registry + alle Bindings
└── datepicker.test.ts    # DatePicker-spezifische Tests
```

---

## Zusammenfassung

| Aspekt | Beschreibung |
|--------|--------------|
| **Mirror = API** | User schreibt nur Mirror |
| **Library = Implementation** | Bewährte Libraries im Hintergrund |
| **Binding = Brücke** | Übersetzt Mirror ↔ Library |
| **Styling über Mirror** | Volle Kontrolle über Aussehen |
| **Verhalten über Mirror** | Properties steuern Funktionalität |
| **Accessibility** | Automatisch durch Libraries |
| **Keyboard Navigation** | Automatisch durch Libraries |
