# Components Preview

## Übersicht

Wenn eine Components-Datei ausgewählt ist, zeigt das Preview-Panel alle definierten Komponenten mit ihren States.

## Sektionen

Komponenten können mit `--- Titel ---` Syntax gruppiert werden:

```mirror
--- Buttons ---

Button: pad 12 24, bg $primary.bg
  state hover bg $primary.hover.bg

GhostButton: pad 12 24, bg transparent, bor 1 $primary.bg
  state hover bg $primary.bg

--- Cards ---

Card: pad 16, bg $grey-800, rad $lg.rad
  state hover bg $grey-700
```

Die Sektionen werden als Überschriften in der Preview angezeigt.

## Screenshot

![Components Preview](../../packages/mirror-lang/docs/screenshots/components-preview.png)

## Layout

Jede Komponente wird mit allen definierten States angezeigt:

```
┌──────────────────────────────────────┐
│ Components                           │
├──────────────────────────────────────┤
│ Button    DEFAULT   [████████]       │
│           HOVER     [████████]       │
├──────────────────────────────────────┤
│ Card      DEFAULT   [██████████████] │
│           SELECTED  [██████████████] │
└──────────────────────────────────────┘
```

## States

Erkannte Behavior-States:
- `hover`
- `active`
- `focus`
- `disabled`
- `selected`
- `highlighted`
- `expanded`
- `collapsed`
- `on` / `off`
- `valid` / `invalid`

## Rendering

Komponenten werden mit dem vollständigen Projekt-Kontext gerendert:
1. Tokens werden geladen und als CSS-Variablen injiziert
2. Komponenten-Definitionen werden geparst
3. Für jeden State wird eine Instanz erstellt
4. Die State-Klasse wird dem Element hinzugefügt

## CSS Klassen

```css
.components-preview-section        /* Sektion */
.components-preview-section-header /* Überschrift */
.components-preview-list           /* Liste der Komponenten */
.components-preview-component      /* Eine Komponente */
.components-preview-row            /* Zeile (State) */
.components-preview-name           /* Komponenten-Name */
.components-preview-state          /* State-Label */
.components-preview-render         /* Render-Container */
```

## JavaScript

```javascript
function renderComponentsPreview(ast) {
  const components = ast.components || []
  const sections = extractComponentSections(ast, components)

  for (const section of sections) {
    // Render section header
    // For each component: render with all states
    for (const comp of section.components) {
      const states = getComponentStates(comp) // ['default', 'hover', ...]
      for (const state of states) {
        renderComponentState(comp, state, ast)
      }
    }
  }
}
```

## CSS-Variablen Injection

Die Token-Werte werden einmalig als CSS-Variablen injiziert:

```javascript
function injectComponentPreviewStyles() {
  // Parse tokens
  const ast = Mirror.parse(tokensSource)

  // Generate CSS variables
  let cssVars = ':root {\n'
  for (const token of ast.tokens) {
    const cssVarName = token.name
      .replace(/^\$/, '')     // Remove $ prefix
      .replace(/\./g, '-')    // Convert dots to hyphens
    cssVars += `  --${cssVarName}: ${token.value};\n`
  }
  cssVars += '}\n'

  // Inject into document
  const style = document.createElement('style')
  style.id = 'component-preview-tokens'
  style.textContent = cssVars
  document.head.appendChild(style)
}
```
