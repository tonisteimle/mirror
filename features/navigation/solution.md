# Navigation - Technische Lösung

## Übersicht

Navigation wird durch ein neues `Nav` Primitiv und eine neue `route` Property implementiert. Das System nutzt die bestehende Infrastruktur für States und Visibility.

**Zwei Route-Typen:**
- **Komponenten-Route** (Großbuchstabe): `route Home` → zeigt lokale Komponente
- **Seiten-Route** (Kleinbuchstabe): `route home` → lädt `home.mirror`

## Architektur

```
Mirror DSL → Parser → AST → IR Transformer → IR → DOM Backend → JavaScript
                                                        ↓
                                              Seiten-Route: readFile + compile
```

**Neue Komponenten:**
- Parser: `Nav` als Primitiv, `route` als Property
- IR: Neue Felder für Navigation (inkl. Route-Typ)
- DOM Backend: Runtime-Logik für Navigation + dynamisches Seiten-Laden

## Parser

### Nav Primitiv

`Nav` wird als neues Primitiv erkannt, ähnlich wie `Button`, `Input`, `Icon`:

```typescript
// In parser.ts
const PRIMITIVES = ['frame', 'text', 'button', 'input', 'icon', 'nav', ...]
```

**Erkennung:**
```mirror
Nav                    // Primitiv direkt
MyNav as Nav:          // Vererbung von Nav
```

**AST Output:**
```typescript
{
  type: 'component',
  name: 'Nav',
  primitive: 'nav',
  children: [...]
}
```

### route Property

`route` wird als spezielle Property geparst:

```typescript
// In parser.ts
if (propertyName === 'route') {
  component.route = parseIdentifier()  // z.B. "Home", "home", "admin/users"
}
```

**DSL:**
```mirror
NavItem "Home" route Home       // Komponenten-Route
NavItem "Home" route home       // Seiten-Route
NavItem "Users" route admin/users  // Seiten-Route mit Pfad
```

**AST Output:**
```typescript
{
  type: 'component',
  name: 'NavItem',
  route: 'home',              // Originalschreibweise beibehalten
  properties: [...]
}
```

### Route-Typ Erkennung

Der Typ wird anhand des ersten Zeichens erkannt:

```typescript
function isPageRoute(route: string): boolean {
  // Kleinbuchstabe am Anfang = Seiten-Route
  return /^[a-z]/.test(route)
}

// Beispiele:
// 'Home'        → false (Komponente)
// 'home'        → true  (Seite)
// 'admin/users' → true  (Seite mit Pfad)
```

## IR Transformer

### IRNode Erweiterung

Neue Felder in `IRNode` (types.ts):

```typescript
interface IRNode {
  // ... bestehende Felder
  primitive?: string           // 'nav' für Nav-Container
  route?: string               // Ziel-Komponente für Navigation
  navContainer?: string        // ID des übergeordneten Nav (für selected-Sync)
}
```

### Transformation

```typescript
// In ir/index.ts
function transformInstance(instance, context): IRNode {
  const node: IRNode = {
    // ... bestehende Transformation
    primitive: instance.primitive,
    route: instance.route,
  }

  // Wenn in Nav-Container, navContainer-ID setzen
  if (context.nearestNav) {
    node.navContainer = context.nearestNav.id
  }

  // Wenn Nav, als Context für Kinder setzen
  if (instance.primitive === 'nav') {
    context = { ...context, nearestNav: node }
  }

  // Kinder mit aktualisiertem Context transformieren
  node.children = instance.children.map(c => transformInstance(c, context))

  return node
}
```

### Event-Generierung

Für Elemente mit `route` werden automatisch Events generiert:

```typescript
if (node.route) {
  node.events.push({
    name: 'click',
    actions: [
      { type: 'navigate', target: node.route }
    ]
  })
}
```

## DOM Backend

### Nav Rendering

Nav wird als `<nav>` Element gerendert:

```typescript
// In dom.ts emitNode()
const tag = node.primitive === 'nav' ? 'nav' : node.tag
this.emit(`const ${varName} = document.createElement('${tag}')`)

// Nav-Container markieren
if (node.primitive === 'nav') {
  this.emit(`${varName}.dataset.navContainer = 'true'`)
  this.emit(`${varName}._navItems = []`)  // Für selected-Tracking
}
```

### route Property

```typescript
// route Property rendern
if (node.route) {
  this.emit(`${varName}.dataset.route = '${node.route}'`)

  // Bei Nav-Container registrieren
  if (node.navContainer) {
    this.emit(`_elements['${node.navContainer}']._navItems.push(${varName})`)
  }
}
```

### Navigate Action

Neue Action `navigate` im DOM Backend:

```typescript
// In emitAction()
case 'navigate':
  const target = action.target
  const isPage = /^[a-z]/.test(target)
  if (isPage) {
    this.emit(`_runtime.navigateToPage('${target}', ${currentVar})`)
  } else {
    this.emit(`_runtime.navigate('${target}', ${currentVar})`)
  }
  break
```

### Runtime Helpers

```typescript
// In emitRuntime()

this.emit('navigate(targetName, clickedElement) {')
this.indent++
this.emit('// 1. Finde die Ziel-Komponente')
this.emit(`const target = document.querySelector('[data-component="${targetName}"]')`)
this.emit('if (!target) return')
this.emit('')
this.emit('// 2. Zeige Ziel, verstecke Geschwister')
this.emit('if (target.parentElement) {')
this.indent++
this.emit('Array.from(target.parentElement.children).forEach(sibling => {')
this.indent++
this.emit('if (sibling.dataset.component) {')
this.indent++
this.emit('sibling.style.display = sibling === target ? "" : "none"')
this.indent--
this.emit('}')
this.indent--
this.emit('})')
this.indent--
this.emit('}')
this.emit('')
this.emit('// 3. Update selected State im Nav-Container')
this.emit('this.updateNavSelection(clickedElement)')
this.indent--
this.emit('},')
this.emit('')

this.emit('updateNavSelection(clickedElement) {')
this.indent++
this.emit('if (!clickedElement) return')
this.emit('')
this.emit('// Finde den Nav-Container')
this.emit('let nav = clickedElement.closest("[data-nav-container]")')
this.emit('if (!nav || !nav._navItems) return')
this.emit('')
this.emit('// Update selected State für alle Items im Nav')
this.emit('nav._navItems.forEach(item => {')
this.indent++
this.emit('if (item === clickedElement) {')
this.indent++
this.emit('item.dataset.selected = "true"')
this.emit('this.applyState(item, "selected")')
this.indent--
this.emit('} else {')
this.indent++
this.emit('delete item.dataset.selected')
this.emit('this.removeState(item, "selected")')
this.indent--
this.emit('}')
this.indent--
this.emit('})')
this.indent--
this.emit('},')
```

### Seiten-Route Runtime

Für Seiten-Routes muss der Runtime dynamisch Dateien laden und kompilieren:

```typescript
this.emit('navigateToPage(pageName, clickedElement) {')
this.indent++
this.emit('// 1. Dateiname konstruieren')
this.emit('const filename = pageName + ".mirror"')
this.emit('')
this.emit('// 2. Datei laden via readFile callback')
this.emit('const content = this.readFile(filename)')
this.emit('if (!content) {')
this.indent++
this.emit('console.warn("Page not found:", filename)')
this.emit('return')
this.indent--
this.emit('}')
this.emit('')
this.emit('// 3. Content kompilieren')
this.emit('const pageCode = Mirror.compile(content, { readFile: this.readFile })')
this.emit('')
this.emit('// 4. In Content-Bereich rendern')
this.emit('const container = this.getPageContainer()')
this.emit('if (container) {')
this.indent++
this.emit('container.innerHTML = ""')
this.emit('const fn = new Function(pageCode + "\\nreturn createUI();")')
this.emit('const ui = fn()')
this.emit('if (ui && ui.root) container.appendChild(ui.root)')
this.indent--
this.emit('}')
this.emit('')
this.emit('// 5. Update selected State')
this.emit('this.updateNavSelection(clickedElement)')
this.indent--
this.emit('},')
this.emit('')

this.emit('getPageContainer() {')
this.indent++
this.emit('// Suche benannten Container oder ersten Geschwister nach Nav')
this.emit('return document.querySelector("[data-page-container]") ||')
this.emit('       document.querySelector("[data-component]")')
this.indent--
this.emit('},')
```

### readFile Injection

Der `readFile` Callback muss zur Laufzeit verfügbar sein:

```typescript
// Bei der Initialisierung
this.emit('const _runtime = {')
this.indent++
this.emit('readFile: _options?.readFile || (() => null),')
// ... weitere Runtime-Methoden
this.indent--
this.emit('}')
```

**Playground-Integration:**

```javascript
// In playground.html
const ui = Mirror.createUI({
  readFile: (path) => files[path] || null
})
```

### Initial State

Das erste Element mit `route` und die erste Ziel-Komponente werden initial sichtbar/selected:

```typescript
// Nach dem Rendern aller Nodes
this.emit('// Initialize navigation')
this.emit('const navContainers = _root.querySelectorAll("[data-nav-container]")')
this.emit('navContainers.forEach(nav => {')
this.indent++
this.emit('if (nav._navItems && nav._navItems.length > 0) {')
this.indent++
this.emit('// Erstes Item als selected markieren')
this.emit('const firstItem = nav._navItems[0]')
this.emit('firstItem.dataset.selected = "true"')
this.emit('_runtime.applyState(firstItem, "selected")')
this.emit('')
this.emit('// Erste Ziel-Komponente sichtbar, Rest hidden')
this.emit('const firstRoute = firstItem.dataset.route')
this.emit('if (firstRoute) _runtime.navigate(firstRoute, firstItem)')
this.indent--
this.emit('}')
this.indent--
this.emit('})')
```

## Zusammenspiel der Komponenten

```
1. Parser
   - Erkennt `Nav` als Primitiv
   - Parst `route X` als Property

2. IR Transformer
   - Setzt `primitive: 'nav'`
   - Setzt `route: 'X'` auf Node
   - Trackt Nav-Container für Kinder
   - Generiert Click-Event mit navigate-Action

3. DOM Backend
   - Rendert Nav als <nav>
   - Registriert route-Items beim Nav-Container
   - navigate() zeigt/versteckt Ziele
   - updateNavSelection() synchronisiert selected State

4. Runtime
   - Click → navigate(target, element)
   - Zeigt Ziel, versteckt Geschwister
   - Updated selected State im Nav
```

## Offene Punkte

### Browser History (Optional)

Für echte URL-Navigation (Hash oder History API):

```typescript
// Optional: Hash-basierte URLs
navigate(targetName, clickedElement) {
  // ... bestehende Logik

  // URL aktualisieren
  if (window.location.hash !== '#' + targetName) {
    window.location.hash = targetName
  }
}

// Hash-Change Listener
window.addEventListener('hashchange', () => {
  const target = location.hash.slice(1)
  if (target) _runtime.navigateToHash(target)
})
```

### Animations (Optional)

Für animierte Übergänge:

```mirror
Nav transition fade 200
  NavItem "Home" route Home
```

## Testplan

Siehe `navigation.test.ts` für die Test-Spezifikation:

1. **Parser Tests**
   - Nav wird als Primitiv erkannt
   - route Property wird geparst
   - Groß/Kleinschreibung bleibt erhalten

2. **IR Tests**
   - primitive: 'nav' wird gesetzt
   - route wird transformiert
   - navContainer wird propagiert

3. **DOM Backend Tests**
   - Nav rendert als <nav>
   - route generiert Click-Handler
   - navigate() zeigt/versteckt korrekt (Komponenten-Route)
   - navigateToPage() lädt und rendert Seite (Seiten-Route)
   - selected State wird synchronisiert

4. **E2E Tests - Komponenten-Route**
   - Klick auf NavItem zeigt richtige Komponente
   - NavItem wird selected
   - Andere Komponenten werden hidden
   - Initial-State ist korrekt

5. **E2E Tests - Seiten-Route**
   - Klick auf NavItem lädt richtige Seite
   - Seite wird in Content-Bereich gerendert
   - NavItem wird selected
   - readFile wird mit korrektem Pfad aufgerufen
   - Pfade wie `admin/users` werden korrekt aufgelöst
