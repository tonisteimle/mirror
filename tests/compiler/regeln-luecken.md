# Regeln-Lücken Analyse

Vergleich: Tests vs. `regeln.md` - Was fehlt?

---

## A. LEXER REGELN (komplett fehlend)

### Token-Typen
```
IDENTIFIER:   Button, my-button, _private, Card2
KEYWORD:      as, extends, named, each, in, if, else, where, data, keys
STRING:       "Hello World", "Ümläüt", "🎉"
NUMBER:       42, 3.14, 0.5
HEX_COLOR:    #FFF, #3B82F6, #00000080
OPERATORS:    >, <, >=, <=, !=, ==, ===, &&, ||, !
PUNCTUATION:  : , ; . = ? ( )
```

### String-Regeln
- Nur doppelte Anführungszeichen (`"..."`)
- Unicode unterstützt (Emoji, Umlaute, CJK)
- Escaped quotes: `"Er sagte: \"Hallo\""`
- Leere Strings erlaubt: `""`

### Kommentare
```
// Zeilenkommentar
Button "Click" // Kommentar am Ende
```

### Einrückung
- Tab = 4 Spaces
- Gemischte Einrückung erlaubt
- Leerzeilen ignoriert

**Tests:** `lexer-*.test.ts` (204 tests)

---

## B. PARSER SYNTAX (teilweise fehlend)

### 1. Komponenten-Definition (fehlt Details)
```
// Basis
Card as frame:
  pad 16

// Vererbung
DangerButton extends Button:
  bg danger

// Inline + Block
Card as frame: rad 8
  pad 16
  bg surface
```

### 2. Instanz-Syntax (fehlt komplett)
```
// Einfach
Button

// Mit Inhalt
Button "Click me"

// Benannt
Button named saveBtn "Save"

// Mit Properties
Button pad 8 bg primary
```

### 3. Slot-Syntax (fehlt komplett)
```
// Definition
Slot "Header"
Slot "Content"

// Default
Slot    // name = "default"

// Mit Properties
Slot "Sidebar" w 200
```

### 4. Event-Syntax (fehlt Details)
```
// Basis
onclick toggle Menu

// Keyboard mit Key
onkeydown enter: submit
onkeydown escape: close

// Keys Block
keys
  escape close
  enter select
  arrow-down highlight next

// Mit Timing
oninput debounce 300: filter
onclick delay 200: submit
```

### 5. State-Syntax (fehlt Details)
```
// Block
hover:
  bg primary
  col white

// Inline
hover: bg primary

// Custom States
selected:
  bg highlight
```

### 6. Conditional-Syntax (fehlt komplett)
```
// Block
if loggedIn
  UserProfile
else
  LoginButton

// Verschachtelt
if hasData
  if isLoading
    Spinner
  else
    Content

// Ternary in Properties
Button bg active ? primary : muted
Icon content done ? "check" : "circle"

// Komplexe Bedingungen
if user.isAdmin && (hasPermission || isOwner)
  AdminPanel
```

### 7. Iteration-Syntax (fehlt komplett)
```
// Basis
each task in tasks
  Card
    Text task.title

// Mit Filter
each task in tasks where done === false
  TaskItem

// Data Binding
TaskList data tasks where priority > 3
```

### 8. JavaScript-Integration (fehlt komplett)
```
Button as button:

let count = 0

function increment() {
  count++
}
```
Erkannte Keywords: `let`, `const`, `var`, `function`, `class`

### 9. Automatische Property-Trennung (fehlt)
```
// Kommas optional wenn Property-Name erkannt
Box h 300 bg #333 pad 16    // ← funktioniert!
Box h 300, bg #333, pad 16  // ← auch OK
```

### 10. Child Override Syntax (fehlt)
```
NavItem Icon "home"; Label "Home"
Card Title "Header"; Content "Body"
```

**Tests:** `parser-*.test.ts` (440 tests)

---

## C. IR TRANSFORMATION (teilweise fehlend)

### SourceMap-Regeln (fehlt komplett)
```
- nodeId: eindeutige ID pro Node
- parentId: Verweis auf Eltern-Node
- componentName: z.B. 'Box', 'Text'
- instanceName: bei `named` Instanzen
- isDefinition: true für Komponenten-Definition
- isEachTemplate: true für each-Loop Items
- isConditional: true für if/else Blöcke
```

### Validation Warnings (fehlt)
```
Box unknownprop 123
→ Warning: { type: 'unknown-property', property: 'unknownprop' }
```

### Component Merging (fehlt)
```
// Definition 1: Styles
Box: bg #111, pad 10

// Definition 2: Kinder
Box:
  Text "Hello"

// Ergebnis: merged (beide)
```

**Tests:** `ir-*.test.ts` (232 tests)

---

## D. HTML ELEMENT MAPPING (fehlt komplett)

| Primitive | HTML Tag |
|-----------|----------|
| Frame, Box | `<div>` |
| Text | `<span>` |
| Button | `<button>` |
| Input | `<input>` |
| Textarea | `<textarea>` |
| Label | `<label>` |
| Image, Img | `<img>` |
| Icon | `<span>` |
| Link | `<a>` |
| Divider | `<hr>` |
| Spacer | `<div>` |
| H1-H6 | `<h1>`-`<h6>` |
| Header | `<header>` |
| Nav | `<nav>` |
| Main | `<main>` |
| Section | `<section>` |
| Article | `<article>` |
| Aside | `<aside>` |
| Footer | `<footer>` |

**Tests:** `backend-dom.test.ts`, `html-output-022.test.ts` (319 tests)

---

## E. SIZING REGELN (unvollständig)

### `size` Property (fehlt)
```
Frame size 100    // w 100 + h 100
Frame size hug    // w hug + h hug
Frame size full   // w full + h full
```

### Flex-Verhalten (fehlt Details)
```
w full  → flex: 1 1 0%, min-width: 0
h full  → flex: 1 1 0%, min-height: 0
w hug   → width: fit-content
h hug   → height: fit-content
```

**Tests:** `ir-full-sizing.test.ts`, `ir-hug-edge-cases.test.ts` (24 tests)

---

## F. DIRECTIONAL PROPERTIES (fehlt)

### Padding/Margin Richtungen
```
pad left 10     → padding-left: 10px
pad right 10    → padding-right: 10px
pad top 10      → padding-top: 10px
pad bottom 10   → padding-bottom: 10px

margin left 10  → margin-left: 10px
margin x 20     → margin-left + margin-right
margin y 20     → margin-top + margin-bottom
```

### Border-Radius Richtungen
```
rad tl 8   → border-top-left-radius: 8px
rad tr 8   → border-top-right-radius: 8px
rad bl 8   → border-bottom-left-radius: 8px
rad br 8   → border-bottom-right-radius: 8px
rad t 8    → top-left + top-right
rad b 8    → bottom-left + bottom-right
rad l 8    → top-left + bottom-left
rad r 8    → top-right + bottom-right
```

**Tests:** `html-output-022.test.ts`

---

## G. ERROR HANDLING (komplett fehlend)

### Lexer Error Recovery
- Unclosed Strings → weiter parsen
- Ungültige Zeichen (@, `, ~) → überspringen
- Ungültige Hex-Farben → überspringen

### Parser Error Collection
```javascript
ast.errors = [
  { message: 'Expected COLON', line: 5, column: 10 }
]
```
Parser stoppt NICHT bei Fehlern, sammelt sie.

### Validator Error Codes
| Code | Bedeutung |
|------|-----------|
| `UNKNOWN_PROPERTY` | Property nicht im Schema |
| `UNDEFINED_COMPONENT` | Komponente nicht definiert |
| `UNKNOWN_EVENT` | Event nicht im Schema |
| `UNKNOWN_ACTION` | Action nicht bekannt |
| `UNKNOWN_KEY` | Keyboard-Key ungültig |
| `UNDEFINED_TOKEN` | Token ($name) nicht definiert |
| `INVALID_VALUE` | Wert-Format ungültig |
| `CIRCULAR_REFERENCE` | Zirkuläre Vererbung |
| `DUPLICATE_DEFINITION` | Doppelte Definition |

### Quick Fix Suggestions
```
Box backgrund #333
→ Suggestion: "background" (Typo-Korrektur)
```

**Tests:** `errors-*.test.ts`, `validator-*.test.ts` (170 tests)

---

## H. RUNTIME HELPERS (fehlt)

### State Management API
```javascript
_runtime.setState(el, 'selected', true)
_runtime.getState(el, 'selected')
_runtime.updateVisibility(el)
```

### Actions
```javascript
_runtime.show(el)
_runtime.hide(el)
_runtime.toggle(el)
_runtime.select(el)
_runtime.highlight(el)
_runtime.destroy(el)  // Cleanup
```

### Each Loop Config
```javascript
_eachConfig = {
  itemVar: 'task',
  collection: 'tasks',
  filter: (item) => !item.done,
  renderItem: (item) => createTaskElement(item)
}
```

### Conditional Config
```javascript
_conditionalConfig = {
  condition: () => loggedIn,
  renderThen: () => createProfile(),
  renderElse: () => createLoginButton()
}
```

**Tests:** `backend-dom-javascript.test.ts` (12 tests)

---

## I. PROPERTY ALIASES (unvollständig in regeln.md)

| Lang | Kurz | Kategorie |
|------|------|-----------|
| width | w | Sizing |
| height | h | Sizing |
| padding | pad, p | Spacing |
| margin | m | Spacing |
| gap | g | Layout |
| background | bg | Color |
| color | col, c | Color |
| border-color | boc | Color |
| border | bor | Border |
| radius | rad | Border |
| font-size | fs | Typography |
| opacity | o, opa | Visual |
| horizontal | hor | Layout |
| vertical | ver | Layout |
| center | cen | Alignment |
| positioned | pos | Position |
| absolute | abs | Position |
| rotate | rot | Transform |
| pin-left | pl | Position |
| pin-right | pr | Position |
| pin-top | pt | Position |
| pin-bottom | pb | Position |
| pin-center-x | pcx | Position |
| pin-center-y | pcy | Position |
| pin-center | pc | Position |
| min-width | minw | Sizing |
| max-width | maxw | Sizing |
| min-height | minh | Sizing |
| max-height | maxh | Sizing |

---

## ZUSAMMENFASSUNG

| Kategorie | Status in regeln.md |
|-----------|---------------------|
| Struktur | ✓ Dokumentiert |
| Zag-Komponenten | ✓ Dokumentiert |
| Properties | ◐ Teilweise |
| Vererbung | ✓ Dokumentiert |
| Layout | ✓ Dokumentiert |
| Tokens | ✓ Dokumentiert |
| Visual Properties | ✓ Dokumentiert |
| **Lexer Regeln** | ✗ Fehlt komplett |
| **Parser Syntax** | ◐ Teilweise |
| **IR Transformation** | ◐ Teilweise |
| **HTML Mapping** | ✗ Fehlt komplett |
| **Error Handling** | ✗ Fehlt komplett |
| **Runtime API** | ✗ Fehlt komplett |
| **Property Aliases** | ◐ Unvollständig |

**Empfehlung:** `regeln.md` um die fehlenden Abschnitte erweitern.
