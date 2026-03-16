# Data Feature - Technische Lösung

## Übersicht

Das Data Feature ermöglicht Mirror-native Datenstrukturen anstelle von JavaScript-Arrays. Es umfasst Schema-Definition, Data-Instanzen, Content-Felder und Data-Binding.

**Status:** Noch nicht implementiert. Dieses Dokument beschreibt die geplante Architektur.

## Architektur

```
Mirror Code → Lexer → Parser → AST → IR Transformer → IR → DOM Backend → JavaScript
                        ↓
              Schema / Data / UI Blöcke
```

## Parser-Erweiterungen

### Block-Typ-Erkennung

Der Parser muss unterscheiden zwischen Schema, Data und UI:

```typescript
function detectBlockType(lines: string[]): 'schema' | 'data' | 'ui' {
  for (const line of lines) {
    // Schema: Felder mit ": typ"
    if (line.match(/^\s+\w+:\s+(text|number|boolean|content|\w+\[\]?)$/)) {
      return 'schema'
    }
    // Data: Felder mit "feld wert" (ohne :)
    if (line.match(/^\s+\w+\s+"[^"]*"/) || line.match(/^\s+\w+\s+\d+/)) {
      return 'data'
    }
    // UI: Properties, Events, Komponenten
    if (line.match(/^\s+(pad|bg|col|gap|onclick|onhover)/)) {
      return 'ui'
    }
  }
  return 'ui' // Default
}
```

### Schema-Parsing

```typescript
interface SchemaDefinition {
  type: 'Schema'
  name: string
  fields: SchemaField[]
}

interface SchemaField {
  name: string
  fieldType: 'text' | 'number' | 'boolean' | 'content' | string
  isArray: boolean
  isRelation: boolean
}

function parseSchemaBlock(name: string, lines: string[]): SchemaDefinition {
  const fields: SchemaField[] = []

  for (const line of lines) {
    const match = line.match(/^\s+(\w+):\s+(\w+)(\[\])?$/)
    if (match) {
      const [, fieldName, fieldType, isArray] = match
      fields.push({
        name: fieldName,
        fieldType,
        isArray: !!isArray,
        isRelation: /^[A-Z]/.test(fieldType) // PascalCase = Relation
      })
    }
  }

  return { type: 'Schema', name, fields }
}
```

### Data-Instanz-Parsing

```typescript
interface DataInstance {
  type: 'DataInstance'
  schemaName: string
  fields: DataField[]
}

interface DataField {
  name: string
  value: string | number | boolean | string[] // Content als string
}

function parseDataBlock(schemaName: string, lines: string[]): DataInstance {
  const fields: DataField[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Einzeiliger Wert: name "Anna" (Wert nach " auf gleicher Zeile)
    const simpleMatch = line.match(/^\s+(\w+)\s+"([^"]+)"$/)
    if (simpleMatch) {
      fields.push({ name: simpleMatch[1], value: simpleMatch[2] })
      i++
      continue
    }

    // Mehrzeiliger Content: bio " (nur " am Zeilenende)
    const contentStart = line.match(/^\s+(\w+)\s+"$/)
    if (contentStart) {
      // Sammle bis zum schließenden " auf eigener Zeile
      const content = collectMultilineContent(lines, i)
      fields.push({ name: contentStart[1], value: content })
      // Überspringe bis nach dem schließenden "
      while (i < lines.length && lines[i].trim() !== '"') i++
      i++ // Überspringe das "
      continue
    }

    i++
  }

  return { type: 'DataInstance', schemaName, fields }
}

/**
 * Unterscheidung einzeilig vs. mehrzeilig:
 * - Einzeilig: `name "Anna"` - nach " kommt direkt der Wert
 * - Mehrzeilig: `bio "` - " am Zeilenende, Content auf nächsten Zeilen
 */
```

### Mehrzeiliger Content

```typescript
function collectMultilineContent(lines: string[], startIndex: number): string {
  const contentLines: string[] = []
  let i = startIndex + 1

  while (i < lines.length) {
    const line = lines[i]

    // Schließendes " (darf eingerückt sein)
    if (line.trim() === '"') {
      break
    }

    contentLines.push(line)
    i++
  }

  // Basis-Einrückung entfernen (wie Kotlin trimIndent)
  return trimIndent(contentLines.join('\n'))
}

function trimIndent(text: string): string {
  const lines = text.split('\n')
  const nonEmptyLines = lines.filter(l => l.trim().length > 0)

  if (nonEmptyLines.length === 0) return ''

  // Minimale Einrückung finden
  const minIndent = Math.min(
    ...nonEmptyLines.map(l => l.match(/^(\s*)/)[1].length)
  )

  // Einrückung entfernen
  return lines.map(l => l.slice(minIndent)).join('\n').trim()
}
```

### Inline-Data-Syntax

```typescript
// Person "Anna", "Designer", "anna.jpg"
function parseInlineData(schemaName: string, values: string[]): DataInstance {
  const schema = schemas.get(schemaName)
  if (!schema) throw new Error(`Unknown schema: ${schemaName}`)

  // Alle Felder müssen angegeben werden - kein Überspringen erlaubt
  const simpleFields = schema.fields.filter(f =>
    ['text', 'number', 'boolean'].includes(f.fieldType)
  )

  if (values.length !== simpleFields.length) {
    throw new Error(
      `Inline-Syntax erfordert alle ${simpleFields.length} Felder, ` +
      `aber ${values.length} wurden angegeben`
    )
  }

  const fields: DataField[] = []
  simpleFields.forEach((field, index) => {
    fields.push({ name: field.name, value: values[index] })
  })

  return { type: 'DataInstance', schemaName, fields }
}
```

**Einschränkungen:**
- Alle einfachen Felder (text, number, boolean) müssen angegeben werden
- content-Felder und Relationen werden übersprungen (erfordern Block-Syntax)
- Felder können nicht ausgelassen werden - Position ist semantisch

## AST-Erweiterungen

```typescript
interface Program {
  // Bestehend
  components: Component[]
  instances: Instance[]
  tokens: TokenDefinition[]
  errors: ParseError[]

  // Neu
  schemas: SchemaDefinition[]
  dataInstances: DataInstance[]
}
```

## IR-Erweiterungen

### Schema-Information

```typescript
interface IRSchema {
  name: string
  fields: {
    name: string
    type: string
    isContent: boolean
    isRelation: boolean
    isArray: boolean
  }[]
}
```

### Data-Collections

```typescript
interface IRDataCollection {
  schemaName: string
  instances: {
    id: string  // Auto-generiert oder aus erstem Feld
    fields: Record<string, any>
  }[]
}
```

### IR-Node mit Data-Binding

```typescript
interface IRNode {
  // Bestehend
  tag: string
  styles: Record<string, string>
  children: IRNode[]

  // Neu
  dataBinding?: {
    collection: string     // "Person"
    filter?: string        // "active == true"
    itemVar?: string       // "person" (für Iteration)
  }
  contentField?: string    // "bio" → Markdown rendern
}
```

## DOM Backend

### Collections generieren

```typescript
generateCollections(schemas: IRSchema[], data: IRDataCollection[]): void {
  this.emit(`// Data Collections`)
  this.emit(`window._mirrorData = window._mirrorData || {}`)

  for (const collection of data) {
    const json = JSON.stringify(collection.instances, null, 2)
    this.emit(`window._mirrorData['${collection.schemaName}'] = ${json}`)
  }
}
```

### Data-Binding generieren

```typescript
generateDataBinding(node: IRNode, varName: string): void {
  if (!node.dataBinding) return

  const { collection, filter, itemVar = 'item' } = node.dataBinding

  this.emit(`// Data binding: ${collection}`)
  this.emit(`const ${collection}_data = window._mirrorData['${collection}'] || []`)

  if (filter) {
    this.emit(`const ${collection}_filtered = ${collection}_data.filter(${itemVar} => ${filter})`)
    this.emit(`${collection}_filtered.forEach((${itemVar}, _index) => {`)
  } else {
    this.emit(`${collection}_data.forEach((${itemVar}, _index) => {`)
  }

  // Kinder für jedes Item generieren
  for (const child of node.children) {
    this.generateNode(child, `${varName}_child_\${_index}`, itemVar)
  }

  this.emit(`})`)
}
```

### Content rendern

```typescript
generateContentField(node: IRNode, varName: string, itemVar: string): void {
  if (!node.contentField) return

  // Markdown-zu-HTML Konvertierung
  this.emit(`${varName}.innerHTML = _mirrorMarkdown(${itemVar}.${node.contentField})`)
}

// Runtime-Helper
generateMarkdownHelper(): void {
  this.emit(`
function _mirrorMarkdown(text) {
  if (!text) return ''

  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold / Italic
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Lists
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // Cleanup
    .replace(/<p><(h[1-6]|ul|li)/g, '<$1')
    .replace(/<\/(h[1-6]|ul|li)><\/p>/g, '</$1>')
}
`)
}
```

### Relationen auflösen

```typescript
resolveRelation(relation: string): string {
  // Person[Anna] → window._mirrorData['Person'].find(p => p.id === 'Anna')
  const match = relation.match(/^(\w+)\[(\w+)\]$/)
  if (match) {
    const [, type, id] = match
    return `window._mirrorData['${type}'].find(x => x.id === '${id}')`
  }
  return relation
}
```

## CRUD-Actions

### Add Action

```typescript
generateAddAction(action: IRAction): void {
  const { schemaName, initialValues } = action

  this.emit(`// Add ${schemaName}`)
  this.emit(`const newItem = {`)
  this.emit(`  id: 'item_' + Date.now(),`)

  for (const [key, value] of Object.entries(initialValues || {})) {
    this.emit(`  ${key}: ${JSON.stringify(value)},`)
  }

  this.emit(`}`)
  this.emit(`window._mirrorData['${schemaName}'].push(newItem)`)
  this.emit(`_mirrorUpdate()`) // Re-render
}
```

### Remove Action

```typescript
generateRemoveAction(varName: string, itemVar: string): void {
  this.emit(`// Remove item`)
  this.emit(`const collection = ${varName}.closest('[data-collection]')?.dataset.collection`)
  this.emit(`if (collection) {`)
  this.emit(`  const index = window._mirrorData[collection].indexOf(${itemVar})`)
  this.emit(`  if (index > -1) window._mirrorData[collection].splice(index, 1)`)
  this.emit(`  _mirrorUpdate()`)
  this.emit(`}`)
}
```

### Update / Bind

```typescript
generateBindAction(inputVar: string, field: string, itemVar: string): void {
  this.emit(`${inputVar}.value = ${itemVar}.${field}`)
  this.emit(`${inputVar}.addEventListener('input', (e) => {`)
  this.emit(`  ${itemVar}.${field} = e.target.value`)
  this.emit(`})`)
}
```

## Route-Binding

```typescript
generateRouteBinding(): void {
  this.emit(`
// Route binding
window._mirrorRoute = window.location.hash.slice(1) || 'home'

window.addEventListener('hashchange', () => {
  window._mirrorRoute = window.location.hash.slice(1)
  _mirrorUpdate()
})

// $route Variable
Object.defineProperty(window, '$route', {
  get: () => window._mirrorRoute
})
`)
}
```

## Beispiel: Generierter Code

### Input

```mirror
Person
  name: text
  bio: content

Person
  name "Anna"
  bio "
    Anna ist **Designerin**.
  "

TeamGrid data Person, gap 16
  Card pad 16
    Text name
    Content bio
```

### Output

```javascript
// Data Collections
window._mirrorData = window._mirrorData || {}
window._mirrorData['Person'] = [
  {
    id: 'Anna',
    name: 'Anna',
    bio: 'Anna ist **Designerin**.'
  }
]

// Markdown helper
function _mirrorMarkdown(text) { /* ... */ }

// UI
const node_1 = document.createElement('div')
node_1.style.display = 'flex'
node_1.style.gap = '16px'
node_1.dataset.collection = 'Person'

const Person_data = window._mirrorData['Person'] || []
Person_data.forEach((item, _index) => {
  const node_2 = document.createElement('div')
  node_2.style.padding = '16px'

  const node_3 = document.createElement('span')
  node_3.textContent = item.name
  node_2.appendChild(node_3)

  const node_4 = document.createElement('div')
  node_4.innerHTML = _mirrorMarkdown(item.bio)
  node_2.appendChild(node_4)

  node_1.appendChild(node_2)
})

document.body.appendChild(node_1)
```

## Implementierungs-Reihenfolge

### Phase 1: Schema + Data Parsing

1. Lexer: Mehrzeilige Strings mit `"`
2. Parser: Schema-Blöcke erkennen
3. Parser: Data-Blöcke erkennen
4. Parser: Inline-Data-Syntax
5. AST: Schema und DataInstance Typen

### Phase 2: IR + Collections

1. IR: Schema-Information speichern
2. IR: Data-Collections erstellen
3. DOM: Collections generieren
4. DOM: `_mirrorData` global verfügbar

### Phase 3: Data-Binding

1. Parser: `data Type` Property erkennen
2. IR: dataBinding auf IRNode
3. DOM: Iteration über Collection
4. DOM: Feld-Zugriff im Kontext

### Phase 4: Content

1. Parser: `content` Feldtyp
2. Parser: Content-Normalisierung (trimIndent)
3. DOM: Markdown-Helper generieren
4. DOM: Content-Komponente

### Phase 5: Relationen

1. Parser: `Type[id]` Syntax
2. IR: Relationen auflösen
3. DOM: Relation-Lookup generieren

### Phase 6: CRUD + Route

1. Parser: `add`, `remove`, `bind` Actions
2. DOM: CRUD-Logik generieren
3. DOM: Route-Binding
4. DOM: Update-Funktion für Reaktivität

## Tests

### Phase 1: Schema + Data Parsing

```typescript
describe('Schema Parsing', () => {
  it('parses simple schema', () => {
    const input = `
Person
  name: text
  role: text
`
    const ast = parse(input)
    expect(ast.schemas).toHaveLength(1)
    expect(ast.schemas[0].name).toBe('Person')
    expect(ast.schemas[0].fields).toHaveLength(2)
  })

  it('parses all field types', () => {
    const input = `
Item
  title: text
  count: number
  active: boolean
  body: content
`
    const ast = parse(input)
    const fields = ast.schemas[0].fields
    expect(fields[0].fieldType).toBe('text')
    expect(fields[1].fieldType).toBe('number')
    expect(fields[2].fieldType).toBe('boolean')
    expect(fields[3].fieldType).toBe('content')
  })

  it('parses relation fields', () => {
    const input = `
Project
  lead: Person
  members: Person[]
`
    const ast = parse(input)
    expect(ast.schemas[0].fields[0].isRelation).toBe(true)
    expect(ast.schemas[0].fields[1].isArray).toBe(true)
  })

  it('first text field becomes ID', () => {
    const input = `
Person
  name: text
  email: text
`
    const ast = parse(input)
    expect(ast.schemas[0].idField).toBe('name')
  })
})

describe('Data Instance Parsing', () => {
  it('parses simple data instance', () => {
    const input = `
Person
  name "Anna"
  role "Designer"
`
    const ast = parse(input)
    expect(ast.dataInstances).toHaveLength(1)
    expect(ast.dataInstances[0].fields[0].value).toBe('Anna')
  })

  it('parses number values', () => {
    const input = `
Item
  count 42
  price 19.99
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toBe(42)
    expect(ast.dataInstances[0].fields[1].value).toBe(19.99)
  })

  it('parses boolean values', () => {
    const input = `
Task
  done true
  urgent false
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toBe(true)
    expect(ast.dataInstances[0].fields[1].value).toBe(false)
  })

  it('parses inline data syntax', () => {
    const input = `
Person
  name: text
  role: text

Person "Anna", "Designer"
Person "Ben", "Developer"
`
    const ast = parse(input)
    expect(ast.dataInstances).toHaveLength(2)
    expect(ast.dataInstances[0].fields[0].value).toBe('Anna')
    expect(ast.dataInstances[1].fields[1].value).toBe('Developer')
  })

  it('rejects inline syntax with missing fields', () => {
    const input = `
Person
  name: text
  role: text
  avatar: text

Person "Anna", "Designer"
`
    expect(() => parse(input)).toThrow(/erfordert alle 3 Felder/)
  })
})

describe('Content Parsing', () => {
  it('parses single-line content', () => {
    const input = `
Person
  bio "Short bio text"
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toBe('Short bio text')
  })

  it('parses multiline content', () => {
    const input = `
Person
  bio "
    First paragraph.

    Second paragraph.
  "
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('normalizes content indentation', () => {
    const input = `
Article
  body "
      Indented text.
      More indented.
  "
`
    const ast = parse(input)
    // Basis-Einrückung (6 spaces) wird entfernt
    expect(ast.dataInstances[0].fields[0].value).toBe('Indented text.\nMore indented.')
  })

  it('preserves relative indentation in content', () => {
    const input = `
Article
  body "
    Normal text.
      Indented line.
    Back to normal.
  "
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toBe('Normal text.\n  Indented line.\nBack to normal.')
  })

  it('preserves markdown in content', () => {
    const input = `
Article
  body "
    **Bold** and _italic_.
  "
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toContain('**Bold**')
  })
})

describe('Block Type Detection', () => {
  it('detects schema block', () => {
    const input = `
Person
  name: text
`
    const ast = parse(input)
    expect(ast.schemas).toHaveLength(1)
    expect(ast.dataInstances).toHaveLength(0)
  })

  it('detects data block', () => {
    const input = `
Person
  name "Anna"
`
    const ast = parse(input)
    expect(ast.dataInstances).toHaveLength(1)
  })

  it('detects UI block', () => {
    const input = `
Card pad 16, bg #333
  Text "Hello"
`
    const ast = parse(input)
    expect(ast.components).toBeDefined()
  })

  it('handles mixed blocks', () => {
    const input = `
Person
  name: text

Person
  name "Anna"

Card data Person
  Text name
`
    const ast = parse(input)
    expect(ast.schemas).toHaveLength(1)
    expect(ast.dataInstances).toHaveLength(1)
  })
})
```

### Phase 2: IR + Collections

```typescript
describe('IR Generation', () => {
  it('creates IR schema', () => {
    const input = `
Person
  name: text
  bio: content
`
    const ir = transform(parse(input))
    expect(ir.schemas['Person']).toBeDefined()
    expect(ir.schemas['Person'].fields[1].isContent).toBe(true)
  })

  it('creates data collections', () => {
    const input = `
Person
  name: text

Person
  name "Anna"

Person
  name "Ben"
`
    const ir = transform(parse(input))
    expect(ir.collections['Person']).toHaveLength(2)
  })

  it('auto-generates IDs from first text field', () => {
    const input = `
Person
  name: text

Person
  name "Anna Schmidt"
`
    const ir = transform(parse(input))
    expect(ir.collections['Person'][0].id).toBe('Anna Schmidt')
  })
})
```

### Phase 3: Data Binding

```typescript
describe('Data Binding', () => {
  it('generates forEach loop', () => {
    const input = `
Person
  name: text

Person
  name "Anna"

List data Person
  Text name
`
    const output = compile(input)
    expect(output).toContain("window._mirrorData['Person']")
    expect(output).toContain('.forEach(')
    expect(output).toContain('item.name')
  })

  it('generates filter for where clause', () => {
    const input = `
Task
  done: boolean

List data Task where done == false
  Text title
`
    const output = compile(input)
    expect(output).toContain('.filter(')
    expect(output).toContain('item.done == false')
  })

  it('handles nested data binding', () => {
    const input = `
Project
  members: Person[]

ProjectCard data Project
  MemberList data members
    Text name
`
    const output = compile(input)
    expect(output).toContain('item.members.forEach')
  })
})
```

### Phase 4: Content Rendering

```typescript
describe('Content Rendering', () => {
  it('generates markdown helper', () => {
    const input = `
Article
  body: content

Article
  body "**Bold**"

Card
  Content body
`
    const output = compile(input)
    expect(output).toContain('_mirrorMarkdown')
  })

  it('Content component uses innerHTML', () => {
    const input = `
Card
  Content body
`
    const output = compile(input)
    expect(output).toContain('.innerHTML = _mirrorMarkdown(item.body)')
  })

  it('renders basic markdown', () => {
    // Runtime test
    const html = _mirrorMarkdown('**bold** and _italic_')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })
})
```

### Phase 5: Relations

```typescript
describe('Relations', () => {
  it('parses relation reference', () => {
    const input = `
Project
  lead Person[Anna]
`
    const ast = parse(input)
    expect(ast.dataInstances[0].fields[0].value).toEqual({
      type: 'relation',
      targetType: 'Person',
      targetId: 'Anna'
    })
  })

  it('resolves relation in output', () => {
    const input = `
Person
  name: text

Person
  name "Anna"

Project
  lead: Person

Project
  lead Person[Anna]

Card data Project
  Text lead.name
`
    const output = compile(input)
    expect(output).toContain("window._mirrorData['Person'].find")
  })
})
```

### Phase 6: CRUD + Route

```typescript
describe('CRUD Actions', () => {
  it('generates add action', () => {
    const input = `
Button onclick add Person
  "Add"
`
    const output = compile(input)
    expect(output).toContain("window._mirrorData['Person'].push")
  })

  it('generates add with initial values', () => {
    const input = `
Button onclick add Person name "New" role "Unknown"
  "Add"
`
    const output = compile(input)
    expect(output).toContain("name: 'New'")
    expect(output).toContain("role: 'Unknown'")
  })

  it('generates remove action', () => {
    const input = `
Card data Person
  Button onclick remove
    "Delete"
`
    const output = compile(input)
    expect(output).toContain('.splice(')
  })
})

describe('Route Binding', () => {
  it('generates route variable', () => {
    const input = `
Page data Post where slug == $route
  Text title
`
    const output = compile(input)
    expect(output).toContain('window._mirrorRoute')
    expect(output).toContain("slug == window._mirrorRoute")
  })

  it('generates route interpolation in page action', () => {
    const input = `
Card data Post
  onclick page post/$slug
`
    const output = compile(input)
    expect(output).toContain('window.location.hash = ')
    expect(output).toContain('item.slug')
  })
})
```

### E2E Tests

```typescript
describe('E2E: Team Website', () => {
  it('renders team members from data', async () => {
    const input = `
Person
  name: text
  role: text

Person
  name "Anna"
  role "Designer"

Person
  name "Ben"
  role "Developer"

TeamGrid data Person
  Card pad 16
    Text name
    Text role
`
    const { container } = render(input)
    expect(container.querySelectorAll('[data-component="Card"]')).toHaveLength(2)
    expect(container.textContent).toContain('Anna')
    expect(container.textContent).toContain('Ben')
  })

  it('renders markdown content', async () => {
    const input = `
Article
  body: content

Article
  body "
    # Title

    This is **bold**.
  "

Page
  Content body
`
    const { container } = render(input)
    expect(container.querySelector('h1')).toBeTruthy()
    expect(container.querySelector('strong').textContent).toBe('bold')
  })

  it('filters data with where clause', async () => {
    const input = `
Task
  title: text
  done: boolean

Task
  title "Task 1"
  done false

Task
  title "Task 2"
  done true

OpenTasks data Task where done == false
  Text title
`
    const { container } = render(input)
    expect(container.textContent).toContain('Task 1')
    expect(container.textContent).not.toContain('Task 2')
  })
})
```
