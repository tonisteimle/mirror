# Mirror V2: Actions, States & Interactivity

## Status: Implementiert

Die V2-Features für Interaktivität sind implementiert und funktionieren.

---

## Ausgangspunkt

Figma ist zu schwach für echtes Prototyping:
- Keine Variablen
- Keine Bedingungen
- Keine echte Logik
- Nur primitive Frame-zu-Frame Verbindungen

Mirror füllt diese Lücke: **Mächtigkeit von Code, Lesbarkeit von natürlicher Sprache.**

---

## Kernprinzipien

### 1. Keine vorgefertigten Konzepte

Nicht "Dialog", "Modal", "Page" als Keywords. Das sind nur Container mit States:
- Ein Dialog = Container mit State `hidden`/`visible`, der über anderen liegt
- Eine Page = State des Content-Containers
- **Alles ist Container + State**

### 2. Komponente = Klasse

Jede Komponente kapselt:
- **Properties** (Aussehen)
- **States** (definierte Zustände mit eigenen Properties)
- **Variablen** (interne Member-Werte)
- **Event Handler** (onclick, onhover, etc.)

```
Panel: bg #243 pad 16
  selected = false              // Variable

  state open                    // State Definition
    bg #243
  state close
    bg #255

  onclick                       // Event Handler
    if not selected
      change self to close
      selected = true
```

### 3. Python-artig, kein Boilerplate

Einrückung statt `{}`, keine `function`, kein `const`, kein `=>`.
Die DSL versteckt den Boilerplate, nicht die Logik.

---

## Implementierte Features

### States in Komponenten

```
Panel: bg #333
  state normal
    bg #333
  state active
    bg #0066FF

  onclick
    toggle self

Panel "Click me"
```

- Erster State = Default
- State überschreibt Properties der Komponente
- `toggle` wechselt zwischen States

### Variablen

```
Panel: bg #333
  count = 0
  selected = false
  name = "Default"
```

- Wie Member in einer Klasse
- Jede Instanz hat eigene Werte
- Typen implizit (boolean, number, string)

### Event Handler

**Inline (einfache Actions):**
```
Button onclick toggle self
Button onclick change self to active
```

**Block (komplexe Logik):**
```
Panel onclick
  if not selected
    change self to active
    selected = true
```

### Actions (Verben)

| Action | Beschreibung | Status |
|--------|--------------|--------|
| `toggle X` | Wechselt zwischen States | ✅ |
| `change X to Y` | Wechselt State von X zu Y | ✅ |
| `open X` | Zeigt Element X | ⏳ |
| `close X` | Versteckt Element X | ⏳ |
| `varName = value` | Setzt Variable | ✅ |

### Bedingungen

```
if selected
  ...

if not selected
  ...

if count > 0
  ...

if name == "Test"
  ...
```

Unterstützte Operatoren: `==`, `!=`, `>`, `<`, `>=`, `<=`, `not`

---

## Architektur

### Lexer (src/parser/lexer.ts)

Neue Token-Typen:
- `STATE` - `state` keyword
- `EVENT` - `onclick`, `onhover`, etc.
- `ACTION` - `open`, `close`, `toggle`, `change`, `to`
- `CONTROL` - `if`, `not`, `and`, `or`
- `ASSIGNMENT` - `=`
- `OPERATOR` - `==`, `!=`, `>`, `<`, `>=`, `<=`

### Parser (src/parser/parser.ts)

Neue AST-Typen:
```typescript
interface StateDefinition {
  name: string
  properties: Record<string, string | number | boolean>
  children: ASTNode[]
}

interface VariableDeclaration {
  name: string
  value: string | number | boolean
}

interface EventHandler {
  event: string  // onclick, onhover, etc.
  actions: (ActionStatement | Conditional)[]
}

interface ActionStatement {
  type: 'change' | 'open' | 'close' | 'toggle' | 'assign'
  target?: string
  toState?: string
  value?: string | number | boolean
}

interface Conditional {
  condition: ConditionExpr
  thenActions: ActionStatement[]
  elseActions?: ActionStatement[]
}
```

### React Generator (src/generator/react-generator.tsx)

Neue `InteractiveComponent`:
- `useState` für States und Variablen
- Event Handler Ausführung
- State-spezifische Styles
- Condition-Evaluation

---

## Beispiele

### Toggle Button

```
Button: bg #333 pad 12 rad 8 col #FFF
  state normal
    bg #333
  state active
    bg #0066FF
  onclick
    toggle self

Button "Toggle Me"
```

### Counter

```
Counter: ver gap 8 pad 16 bg #222 rad 8
  count = 0

  Display size 24 weight 600 col #FFF
  Button "+" onclick
    count = count + 1

Counter
  Display "0"
```

### Sidebar Toggle

```
Sidebar: ver w 280 bg #111
  state open
    w 280
  state closed
    w 0

Header: hor between pad 16 bg #1a1a1a
  Logo "Mirror"
  MenuIcon icon "menu" onclick
    toggle Sidebar

App: hor full
  Sidebar
  Header
  Content
```

---

## Implementierte Features (Fortsetzung)

### Cross-Component Communication ✅

Komponenten können andere Komponenten steuern:

```
Panel: ver pad 16 bg #333 rad 8
  state normal
    bg #333
  state active
    bg #0066FF

Button: pad 12 bg #444 rad 8 col #FFF
  onclick
    toggle Panel       // Togglet Panel zwischen States
    change Panel to active  // Setzt Panel auf bestimmten State

Panel "Target"
Button "Control Panel"
```

Unterstützte Actions für andere Komponenten:
- `toggle X` - Wechselt X zwischen States ✅
- `change X to Y` - Setzt State von X auf Y ✅
- `open X` / `show X` - Setzt X auf "visible" State ✅
- `close X` / `hide X` - Setzt X auf "hidden" State ✅

---

## Offene Features

1. **Dot-Notation für Properties**
   - `panel.bg = #333`
   - Dynamische Property-Änderung

2. **Animations/Transitions**
   - `transition 300ms` Property
   - Automatische Übergänge bei State-Wechsel

3. **Erweiterte open/close Actions**
   - Visibility-basierte States mit CSS display/opacity
   - Implizite hidden/visible States

---

## Dateien

- `src/dsl/properties.ts` - Keywords und Properties
- `src/parser/lexer.ts` - Tokenizer
- `src/parser/parser.ts` - AST Builder
- `src/generator/react-generator.tsx` - React Renderer
