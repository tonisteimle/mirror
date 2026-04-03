# CRUD Implementation Plan

## Übersicht

Implementierung der deklarativen CRUD-Architektur für Mirror:
- Schema-basierte Typdefinition
- `$collection.current` als UI-Daten-Brücke
- Automatische Form/Field-Generierung
- Relation-Lookups (N:1, N:N)

---

## Phase 1: Schema-Parser

**Ziel:** `$schema:` in `.data`-Dateien parsen und als Metadaten speichern.

### 1.1 Lexer erweitern

**Datei:** `compiler/parser/lexer.ts`

```
$schema:
  title: string, required
  assignee: $users
  watchers: $users[], max 5
```

Neue Tokens:
- `SCHEMA` - für `$schema:`
- Schema-Typ-Keywords: `string`, `number`, `boolean`
- Constraints: `required`, `max`, `onDelete`

### 1.2 Parser erweitern

**Datei:** `compiler/parser/parser.ts`

Neuer AST-Node:

```typescript
interface SchemaDefinition {
  type: 'SchemaDefinition'
  fields: SchemaField[]
}

interface SchemaField {
  name: string
  type: SchemaType
  constraints: Constraint[]
}

type SchemaType =
  | { kind: 'primitive', type: 'string' | 'number' | 'boolean' }
  | { kind: 'relation', target: string, isArray: boolean }  // target = '$users'

type Constraint =
  | { kind: 'required' }
  | { kind: 'max', value: number }
  | { kind: 'onDelete', action: 'cascade' | 'nullify' | 'restrict' }
```

### 1.3 Schema-Registry

**Neue Datei:** `compiler/runtime/schema-registry.ts`

```typescript
class SchemaRegistry {
  private schemas: Map<string, SchemaDefinition>

  register(collectionName: string, schema: SchemaDefinition): void
  get(collectionName: string): SchemaDefinition | undefined
  getFieldType(collection: string, field: string): SchemaType
  getRelationTarget(collection: string, field: string): string | undefined
}
```

### Testbar nach Phase 1:
- [ ] `$schema:` wird geparst
- [ ] Feldtypen sind abrufbar
- [ ] Relationen sind erkennbar

---

## Phase 2: Collection Runtime

**Ziel:** `$collection.current` implementieren mit Reaktivität.

### 2.1 Collection-Wrapper

**Datei:** `compiler/runtime/collection.ts`

```typescript
class Collection<T> {
  private items: T[]
  private _current: T | null = null

  get current(): T | null { return this._current }
  set current(item: T | null) {
    this._current = item
    this.notifySubscribers()
  }

  // CRUD
  add(item: Partial<T>): T
  update(item: T, changes: Partial<T>): void
  remove(item: T): void

  // Reaktivität
  subscribe(callback: () => void): () => void
}
```

### 2.2 Table setzt current

**Datei:** `compiler/runtime/dom-runtime.ts`

Bei Table-Row-Klick:
```typescript
row.addEventListener('click', () => {
  collection.current = rowData
})
```

### 2.3 IR-Änderungen

**Datei:** `compiler/ir/index.ts`

`$tasks.current` muss zu `__collections.tasks.current` kompilieren.

### Testbar nach Phase 2:
- [ ] `$tasks.current` ist reaktiv
- [ ] Table-Klick setzt current
- [ ] UI aktualisiert sich bei current-Wechsel

---

## Phase 3: CRUD-Funktionen

**Ziel:** `create()`, `save()`, `revert()`, `delete()` implementieren.

### 3.1 Funktionen im Schema registrieren

**Datei:** `compiler/schema/dsl.ts`

```typescript
actions: {
  create: {
    params: ['collection', 'initialValues?'],
    description: 'Create new entry and set as current'
  },
  save: {
    params: [],
    description: 'Save current changes'
  },
  revert: {
    params: [],
    description: 'Discard current changes'
  },
  delete: {
    params: ['entry', 'options?'],
    description: 'Delete entry'
  }
}
```

### 3.2 Runtime-Implementierung

**Datei:** `compiler/runtime/crud-actions.ts`

```typescript
function create(collection: Collection, initialValues?: object): void {
  const newItem = { ...getDefaults(collection), ...initialValues }
  collection.add(newItem)
  collection.current = newItem
}

function save(form: Form): void {
  // Änderungen aus Form in Collection übernehmen
  const current = form.collection.current
  Object.assign(current, form.pendingChanges)
  form.pendingChanges = {}
}

function revert(form: Form): void {
  form.pendingChanges = {}
  form.refresh()
}

function deleteEntry(entry: any, options?: { confirm?: string }): void {
  if (options?.confirm && !confirm(options.confirm)) return
  const collection = getCollectionFor(entry)
  collection.remove(entry)
  if (collection.current === entry) {
    collection.current = null
  }
}
```

### 3.3 Cascade-Delete

```typescript
function deleteWithCascade(entry: any): void {
  const schema = schemaRegistry.get(entry.__collection)

  // Finde alle Collections die auf diese referenzieren
  for (const [collName, collSchema] of schemaRegistry.entries()) {
    for (const field of collSchema.fields) {
      if (field.type.kind === 'relation' && field.type.target === entry.__collection) {
        const constraint = field.constraints.find(c => c.kind === 'onDelete')

        if (constraint?.action === 'cascade') {
          // Lösche alle referenzierenden Einträge
          collections[collName].removeWhere(item => item[field.name] === entry)
        } else if (constraint?.action === 'nullify') {
          // Setze Referenz auf null
          collections[collName].updateWhere(
            item => item[field.name] === entry,
            { [field.name]: null }
          )
        } else if (constraint?.action === 'restrict') {
          // Prüfe ob Referenzen existieren
          const hasRefs = collections[collName].some(item => item[field.name] === entry)
          if (hasRefs) throw new Error('Cannot delete: referenced by ' + collName)
        }
      }
    }
  }

  // Dann löschen
  collection.remove(entry)
}
```

### Testbar nach Phase 3:
- [ ] `create($tasks)` erstellt neuen Eintrag
- [ ] `create($tasks, { project: $projects.current })` mit Initialwerten
- [ ] `save()` speichert Änderungen
- [ ] `revert()` verwirft Änderungen
- [ ] `delete()` löscht Eintrag
- [ ] `delete(..., confirm: "...")` zeigt Bestätigung
- [ ] Cascade-Delete funktioniert

---

## Phase 4: Form-Komponente

**Ziel:** `Form $collection` mit automatischem Binding.

### 4.1 Form als Zag-Primitive

**Datei:** `compiler/schema/zag-primitives.ts`

```typescript
Form: {
  machine: 'form',
  slots: ['Actions'],
  props: {
    collection: { type: 'collection', required: true }
  }
}
```

### 4.2 Field-Komponente

**Datei:** `compiler/schema/zag-primitives.ts`

```typescript
Field: {
  parent: 'Form',
  props: {
    name: { type: 'identifier', required: true },
    label: { type: 'string' },
    placeholder: { type: 'string' },
    multiline: { type: 'boolean' },
    display: { type: 'expression' },
    filter: { type: 'expression' },
    allowClear: { type: 'boolean' },
    max: { type: 'number' },
    required: { type: 'boolean' },
    disabled: { type: 'boolean' }
  }
}
```

### 4.3 Field-Rendering

**Datei:** `compiler/backends/dom.ts`

```typescript
function renderField(field: FieldNode, form: FormContext): string {
  const schema = schemaRegistry.get(form.collection)
  const fieldSchema = schema.getField(field.name)

  switch (fieldSchema.type.kind) {
    case 'primitive':
      if (fieldSchema.type.type === 'string') {
        return field.multiline
          ? renderTextarea(field, form)
          : renderInput(field, form)
      }
      if (fieldSchema.type.type === 'number') {
        return renderNumberInput(field, form)
      }
      if (fieldSchema.type.type === 'boolean') {
        return renderSwitch(field, form)
      }

    case 'relation':
      if (fieldSchema.type.isArray) {
        return renderTagInput(field, form, fieldSchema.type.target)
      } else {
        return renderSelect(field, form, fieldSchema.type.target)
      }
  }
}
```

### 4.4 Two-Way Binding

```typescript
function renderInput(field: FieldNode, form: FormContext): string {
  const path = `${form.collection}.current.${field.name}`
  return `
    <input
      value="\${${path}}"
      oninput="__runtime.setPath('${path}', this.value)"
    />
  `
}
```

### Testbar nach Phase 4:
- [ ] `Form $tasks` bindet an `$tasks.current`
- [ ] `Field title` rendert Input
- [ ] `Field done` rendert Switch
- [ ] `Field aufwand` rendert NumberInput
- [ ] `Field description, multiline` rendert Textarea
- [ ] Two-Way Binding funktioniert

---

## Phase 5: Relation-Lookups

**Ziel:** N:1 → Select, N:N → TagInput mit automatischen Optionen.

### 5.1 Select für N:1

**Datei:** `compiler/backends/dom.ts`

```typescript
function renderSelect(field: FieldNode, form: FormContext, targetCollection: string): string {
  const displayExpr = field.display || 'item.name'
  const filterExpr = field.filter || 'true'

  return `
    <select
      value="\${${form.collection}.current.${field.name}?.__id}"
      onchange="__runtime.setRelation('${form.collection}', '${field.name}', this.value)"
    >
      ${field.allowClear ? '<option value="">-- Keine Auswahl --</option>' : ''}
      \${${targetCollection}
        .filter(item => ${filterExpr})
        .map(item => \`
          <option value="\${item.__id}" \${item === ${form.collection}.current.${field.name} ? 'selected' : ''}>
            \${${displayExpr}}
          </option>
        \`).join('')}
    </select>
  `
}
```

### 5.2 TagInput für N:N

**Datei:** `compiler/backends/dom.ts`

```typescript
function renderTagInput(field: FieldNode, form: FormContext, targetCollection: string): string {
  const displayExpr = field.display || 'item.name'
  const maxItems = field.max || Infinity

  return `
    <div class="tag-input">
      <div class="tags">
        \${${form.collection}.current.${field.name}.map(item => \`
          <span class="tag">
            \${${displayExpr}}
            <button onclick="__runtime.removeFromRelation('${form.collection}', '${field.name}', '\${item.__id}')">×</button>
          </span>
        \`).join('')}
      </div>

      \${${form.collection}.current.${field.name}.length < ${maxItems} ? \`
        <button onclick="__runtime.showRelationPicker('${form.collection}', '${field.name}', '${targetCollection}')">
          + Add
        </button>
      \` : ''}
    </div>
  `
}
```

### 5.3 Relation-Picker Dialog

**Datei:** `compiler/runtime/relation-picker.ts`

```typescript
function showRelationPicker(
  sourceCollection: string,
  field: string,
  targetCollection: string
): void {
  const schema = schemaRegistry.get(sourceCollection)
  const fieldSchema = schema.getField(field)
  const current = collections[sourceCollection].current
  const currentIds = current[field].map(item => item.__id)

  // Zeige Dialog mit verfügbaren Optionen
  const available = collections[targetCollection]
    .filter(item => !currentIds.includes(item.__id))
    .filter(item => evalFilter(fieldSchema.filter, item))

  showDialog({
    items: available,
    display: fieldSchema.display || 'item.name',
    onSelect: (item) => {
      current[field].push(item)
      closeDialog()
    }
  })
}
```

### Testbar nach Phase 5:
- [ ] `Field assignee` rendert Select mit allen Users
- [ ] `Field watchers` rendert TagInput
- [ ] `display user.email` ändert Anzeige
- [ ] `filter user.active` filtert Optionen
- [ ] `allowClear` zeigt "Keine Auswahl"
- [ ] `max 5` limitiert Anzahl

---

## Phase 6: Table Integration

**Ziel:** Inline Editing und Relation-Picker in Tables.

### 6.1 Editable Columns

**Datei:** `compiler/backends/dom.ts`

```typescript
function renderTableCell(column: ColumnNode, row: any, collection: string): string {
  if (!column.editable) {
    return renderReadOnlyCell(column, row)
  }

  const schema = schemaRegistry.get(collection)
  const fieldSchema = schema.getField(column.field)

  // Inline-Edit basierend auf Typ
  switch (fieldSchema.type.kind) {
    case 'primitive':
      if (fieldSchema.type.type === 'boolean') {
        return `<input type="checkbox" ${row[column.field] ? 'checked' : ''}
          onchange="__runtime.setPath('${collection}.items[${row.__index}].${column.field}', this.checked)" />`
      }
      return `<input value="${row[column.field]}"
        onblur="__runtime.setPath('${collection}.items[${row.__index}].${column.field}', this.value)" />`

    case 'relation':
      return renderInlineRelationPicker(column, row, fieldSchema)
  }
}
```

### 6.2 Row Actions

```typescript
function renderRowActions(actions: ActionNode[], row: any): string {
  return actions.map(action => {
    // `row` ist im Scope verfügbar
    return `<button onclick="__runtime.execute('${action.name}', row)">${action.icon}</button>`
  }).join('')
}
```

### Testbar nach Phase 6:
- [ ] `Column done, editable` rendert Checkbox
- [ ] `Column title, editable` rendert Input
- [ ] `Column assignee, editable` rendert Inline-Select
- [ ] `RowActions:` funktioniert

---

## Phase 7: Validierung

**Ziel:** Required-Validierung und Fehleranzeige.

### 7.1 Validierung bei Save

```typescript
function save(form: Form): void {
  const schema = schemaRegistry.get(form.collection)
  const current = form.collection.current
  const errors: ValidationError[] = []

  for (const field of schema.fields) {
    const value = current[field.name]

    // Required
    if (field.constraints.some(c => c.kind === 'required')) {
      if (value === null || value === undefined || value === '') {
        errors.push({ field: field.name, message: 'Pflichtfeld' })
      }
    }

    // Max (für Arrays)
    const maxConstraint = field.constraints.find(c => c.kind === 'max')
    if (maxConstraint && Array.isArray(value) && value.length > maxConstraint.value) {
      errors.push({ field: field.name, message: `Maximal ${maxConstraint.value} Einträge` })
    }
  }

  if (errors.length > 0) {
    form.errors = errors
    return
  }

  // Speichern
  Object.assign(current, form.pendingChanges)
  form.pendingChanges = {}
  form.errors = []
}
```

### 7.2 Fehleranzeige

```typescript
function renderField(field: FieldNode, form: FormContext): string {
  const error = form.errors.find(e => e.field === field.name)

  return `
    <div class="field ${error ? 'field--error' : ''}">
      <label>${field.label || field.name}</label>
      ${renderFieldInput(field, form)}
      ${error ? `<span class="field-error">${error.message}</span>` : ''}
    </div>
  `
}
```

### Testbar nach Phase 7:
- [ ] `required` verhindert leeres Speichern
- [ ] Fehler werden angezeigt
- [ ] `max` bei Arrays wird validiert

---

## Zusammenfassung: Dateien

| Phase | Neue/Geänderte Dateien |
|-------|------------------------|
| 1 | `lexer.ts`, `parser.ts`, `schema-registry.ts` (neu) |
| 2 | `collection.ts` (neu), `dom-runtime.ts`, `ir/index.ts` |
| 3 | `dsl.ts`, `crud-actions.ts` (neu) |
| 4 | `zag-primitives.ts`, `dom.ts` |
| 5 | `dom.ts`, `relation-picker.ts` (neu) |
| 6 | `dom.ts` |
| 7 | `crud-actions.ts`, `dom.ts` |

## Abhängigkeiten

```
Phase 1 (Schema)
    ↓
Phase 2 (Collection Runtime)
    ↓
Phase 3 (CRUD Functions)
    ↓
Phase 4 (Form/Field) ← braucht Schema + Collection
    ↓
Phase 5 (Lookups) ← braucht Schema + Collection + Form
    ↓
Phase 6 (Table) ← braucht alles
    ↓
Phase 7 (Validation) ← braucht Schema + Form
```

## Meilensteine

| Meilenstein | Phasen | Ergebnis |
|-------------|--------|----------|
| **M1: Schema** | 1 | `$schema:` wird geparst |
| **M2: Reactive** | 1-2 | `$tasks.current` ist reaktiv |
| **M3: CRUD** | 1-3 | create/save/delete funktionieren |
| **M4: Forms** | 1-4 | `Form $tasks` + `Field` funktionieren |
| **M5: Lookups** | 1-5 | Relation-Selects automatisch |
| **M6: Complete** | 1-7 | Alles fertig |

---

## Nächste Schritte

1. **Phase 1 starten:** Schema-Syntax im Parser
2. **Tests schreiben:** Für jede Phase
3. **Incrementell:** Jede Phase einzeln testen bevor nächste
