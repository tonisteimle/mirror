# Core Components Strategie

> Mirror wird zur vollständigen UI-Sprache mit eingebauten Komponenten

## Vision

Mirror-User arbeiten mit einer mächtigen Komponentenbibliothek, die in der Sprache selbst lebt. Keine Imports, keine Konfiguration - die Komponenten sind einfach da.

```mirror
// Das schreibt der User
myNav as Nav
  NavItem Icon "home"; Label "Dashboard"
  NavItem active, Icon "users"; Label "Team"

myForm as Form
  Field Label "Email"; Input type email
  Field Label "Password"; PasswordInput
  PrimaryButton "Login"
```

## Drei-Ebenen-Architektur

```
Ebene 1: Primitives (HTML)
├── Box, Text, Icon, Image
├── Input, Textarea, Button
└── Link, Segment

Ebene 2: Core Components (Sprache)
├── Navigation: Nav, NavItem, TreeItem, ...
├── Forms: Field, TextInput, PrimaryButton, ...
├── Data: Table, Card, List, ...
└── Feedback: Modal, Toast, Tooltip, ...

Ebene 3: User Components (Bibliothek)
├── myNav as Nav (User's Styling)
├── myField as Field (User's Styling)
└── ContactField from myField (Varianten)
```

### Sichtbarkeit

| Ebene | Sichtbar für User? | Beschreibung |
|-------|-------------------|--------------|
| Primitives | Ja | HTML-Elemente, immer verfügbar |
| Core Components | Nein (Typen) | Wie `string` in Programmiersprachen |
| User Components | Ja (Bibliothek) | User's eigene Komponenten |

## Syntax

### Instanz mit Styling (`as`)

```mirror
// Definiert UND rendert "myNav" als Nav mit eigenem Styling
myNav as Nav:
  NavItem col $brand

// Kurz (ohne Anpassungen)
myNav as Nav
```

### Vererbung (`from`)

```mirror
// Definiert wiederverwendbare Variante
BrandNavItem from NavItem:
  Label col $brand, weight 600

// Nutzt sie
Nav
  BrandNavItem Icon "home"; Label "Dashboard"
```

### Tokens (Theming)

```mirror
// User überschreibt Tokens
$nav.bg: $grey-900
$nav.hover: $grey-800
$nav.active: $blue-600
$nav.text: $grey-100

// Komponenten nutzen automatisch die neuen Werte
myNav as Nav
  NavItem Icon "home"; Label "Home"
```

## Core Components Katalog

### Navigation (10 Komponenten)

| Komponente | Beschreibung | States |
|------------|--------------|--------|
| `Nav` | Container | expanded, collapsed |
| `NavItem` | Icon + Label | hover, active |
| `NavItemBadge` | Mit Badge | hover, active |
| `NavSection` | Gruppen-Header | - |
| `ToggleNav` | Collapse-Button | expanded, collapsed |
| `TreeItem` | Expandable | expanded, active |
| `TreeLeaf` | Blatt-Element | active |
| `DrawerNav` | Mobile Drawer | - |
| `DrawerBackdrop` | Overlay | - |
| `MenuButton` | Hamburger | - |

**Tokens:**
```
$nav.bg, $nav.hover, $nav.active
$nav.text, $nav.muted, $nav.badge
```

### Forms (15+ Komponenten)

| Komponente | Beschreibung | States |
|------------|--------------|--------|
| `Field` | Label + Input + Error | invalid |
| `FieldRequired` | Mit Required-Marker | invalid |
| `FieldHorizontal` | Label links | invalid |
| `PasswordField` | Mit Toggle | invalid |
| `TextareaField` | Mehrzeilig | invalid |
| `TextInput` | Text-Eingabe | focus, disabled |
| `PasswordInput` | Passwort-Eingabe | focus, disabled |
| `TextareaInput` | Textarea | focus, disabled |
| `SelectInput` | Dropdown | focus, disabled |
| `Label` | Label-Text | - |
| `LabelRequired` | Mit Asterisk | - |
| `PrimaryButton` | Primärer Button | hover, disabled |
| `SecondaryButton` | Sekundärer Button | hover, disabled |
| `GhostButton` | Ghost Button | hover, disabled |
| `DangerButton` | Danger Button | hover, disabled |

**Tokens:**
```
$form.bg, $form.input, $form.border
$form.focus, $form.error, $form.text
$primary.bg, $primary.hover
```

### Data (geplant)

```
Table, TableHeader, TableRow, TableCell
Card, CardHeader, CardBody, CardFooter
List, ListItem, ListDivider
```

### Feedback (geplant)

```
Modal, ModalHeader, ModalBody, ModalFooter
Toast, Alert, Badge
Tooltip, Popover
Dialog, DialogActions
```

## Implementierungsplan

### Phase 1: Sprache

1. **Core Components in Parser**
   - Komponenten als eingebaute Typen
   - Tokens-System für Theming
   - `as` und `from` Syntax funktioniert

2. **Navigation zuerst**
   - 10 Komponenten integrieren
   - Tokens definieren
   - Tests schreiben

3. **Forms danach**
   - 15+ Komponenten integrieren
   - Tokens definieren
   - Tests schreiben

### Phase 2: Builder

1. **Builder vereinfachen**
   - Generieren nur Instanzen
   - Keine Definitionen mehr
   - Verlassen sich auf Sprach-Typen

2. **Output-Format**
   ```mirror
   // Vorher (Builder generiert alles)
   NavItem:
     hor, ver-center, gap 12
     Icon "", col $muted
     Label "", col $text
     ...

   Nav
     NavItem Icon "home"; Label "Dashboard"

   // Nachher (nur Instanzen)
   Nav
     NavItem Icon "home"; Label "Dashboard"
   ```

### Phase 3: LLM

1. **Prompts vereinfachen**
   - Typen existieren bereits
   - LLM generiert nur Schema
   - Schema → Instanzen via Builder

2. **Weniger Fehlerquellen**
   - Keine Syntax-Fehler in Definitionen
   - Stabile Typen garantiert
   - Nur Instanz-Parameter variabel

## Technische Umsetzung

### Option A: core.mirror Datei

```typescript
// Parser lädt core.mirror beim Start
const coreComponents = loadCoreMirror('src/parser/core.mirror');
parser.registerBuiltins(coreComponents);
```

**Vorteile:**
- Mirror-Syntax für Definitionen
- Leicht zu lesen und ändern
- Wiederverwendung der Builder-Logik

### Option B: Programmatisch im Parser

```typescript
// Parser hat eingebaute Definitionen
const CORE_COMPONENTS = {
  NavItem: {
    layout: 'hor',
    children: ['Icon', 'Label'],
    states: ['hover', 'active'],
    // ...
  }
};
```

**Vorteile:**
- Keine externe Datei
- Schneller (kein Parsing)
- Typsicher

### Empfehlung: Hybrid

1. Builder generieren `core.mirror` einmalig (Build-Zeit)
2. Parser lädt und cached die Definitionen
3. Änderungen an Buildern → Regenerieren

```
Builder Code → core.mirror → Parser Cache → Runtime
(Source of Truth)  (Generated)   (Loaded once)
```

## Token-Namenskonvention

### Komponenten-Tokens

```
$[komponente].[property]
$nav.bg
$form.border
$table.header
```

### State-Tokens

```
$[komponente].[state].[property]
$nav.hover.bg
$form.focus.border
$button.disabled.opacity
```

### Globale Tokens

```
$primary.bg, $primary.hover
$danger.bg, $danger.text
$grey-100 ... $grey-900
```

## Offene Fragen

1. **Wie werden Tokens geladen?**
   - Default-Tokens in Sprache?
   - User überschreibt in eigenem Code?

2. **Wie dokumentieren wir Slots?**
   - Was kann man an `Field` ändern?
   - Welche Slots hat `NavItem`?

3. **Versionierung?**
   - Was wenn Core Components sich ändern?
   - Backwards Compatibility?

## Nächste Schritte

- [ ] Navigation Components in Parser integrieren
- [ ] Token-System implementieren
- [ ] Tests für Core Components
- [ ] Builder auf Instanzen umstellen
- [ ] Dokumentation für User

---

*Erstellt: 2026-02-28*
*Status: Strategie definiert, Implementation steht aus*
