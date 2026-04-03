# CRUD Test Plan

## Teststrategie

```
Unit Tests (schnell, isoliert)
    ↓
Integration Tests (Komponenten zusammen)
    ↓
E2E Tests (komplette Workflows)
```

Jede Phase aus dem Implementation Plan bekommt eigene Tests. Tests werden **vor** der Implementierung geschrieben (TDD).

---

## Phase 1: Schema-Parser

### Unit Tests: Lexer

**Datei:** `tests/compiler/lexer-schema.test.ts`

```typescript
describe('Lexer: Schema', () => {
  it('tokenizes $schema: keyword', () => {
    const input = `$schema:`
    const tokens = lex(input)
    expect(tokens[0]).toMatchObject({ type: 'SCHEMA' })
  })

  it('tokenizes primitive types', () => {
    const input = `title: string`
    const tokens = lex(input)
    expect(tokens).toContainEqual({ type: 'IDENTIFIER', value: 'string' })
  })

  it('tokenizes relation type', () => {
    const input = `assignee: $users`
    const tokens = lex(input)
    expect(tokens).toContainEqual({ type: 'VARIABLE', value: '$users' })
  })

  it('tokenizes array relation', () => {
    const input = `members: $users[]`
    const tokens = lex(input)
    expect(tokens).toContainEqual({ type: 'VARIABLE', value: '$users' })
    expect(tokens).toContainEqual({ type: 'LBRACKET' })
    expect(tokens).toContainEqual({ type: 'RBRACKET' })
  })

  it('tokenizes constraints', () => {
    const input = `title: string, required, max 100`
    const tokens = lex(input)
    expect(tokens).toContainEqual({ type: 'IDENTIFIER', value: 'required' })
    expect(tokens).toContainEqual({ type: 'IDENTIFIER', value: 'max' })
    expect(tokens).toContainEqual({ type: 'NUMBER', value: 100 })
  })

  it('tokenizes onDelete constraint', () => {
    const input = `project: $projects, onDelete cascade`
    const tokens = lex(input)
    expect(tokens).toContainEqual({ type: 'IDENTIFIER', value: 'onDelete' })
    expect(tokens).toContainEqual({ type: 'IDENTIFIER', value: 'cascade' })
  })
})
```

### Unit Tests: Parser

**Datei:** `tests/compiler/parser-schema.test.ts`

```typescript
describe('Parser: Schema', () => {
  it('parses empty schema', () => {
    const input = `
$schema:
`
    const ast = parse(input)
    expect(ast.schema).toEqual({ fields: [] })
  })

  it('parses primitive field', () => {
    const input = `
$schema:
  title: string
`
    const ast = parse(input)
    expect(ast.schema.fields[0]).toMatchObject({
      name: 'title',
      type: { kind: 'primitive', type: 'string' },
      constraints: []
    })
  })

  it('parses number field', () => {
    const input = `
$schema:
  aufwand: number
`
    const ast = parse(input)
    expect(ast.schema.fields[0].type).toMatchObject({
      kind: 'primitive',
      type: 'number'
    })
  })

  it('parses boolean field', () => {
    const input = `
$schema:
  done: boolean
`
    const ast = parse(input)
    expect(ast.schema.fields[0].type).toMatchObject({
      kind: 'primitive',
      type: 'boolean'
    })
  })

  it('parses N:1 relation', () => {
    const input = `
$schema:
  assignee: $users
`
    const ast = parse(input)
    expect(ast.schema.fields[0]).toMatchObject({
      name: 'assignee',
      type: { kind: 'relation', target: '$users', isArray: false }
    })
  })

  it('parses N:N relation', () => {
    const input = `
$schema:
  members: $users[]
`
    const ast = parse(input)
    expect(ast.schema.fields[0]).toMatchObject({
      name: 'members',
      type: { kind: 'relation', target: '$users', isArray: true }
    })
  })

  it('parses required constraint', () => {
    const input = `
$schema:
  title: string, required
`
    const ast = parse(input)
    expect(ast.schema.fields[0].constraints).toContainEqual({ kind: 'required' })
  })

  it('parses max constraint', () => {
    const input = `
$schema:
  members: $users[], max 10
`
    const ast = parse(input)
    expect(ast.schema.fields[0].constraints).toContainEqual({ kind: 'max', value: 10 })
  })

  it('parses onDelete cascade', () => {
    const input = `
$schema:
  project: $projects, onDelete cascade
`
    const ast = parse(input)
    expect(ast.schema.fields[0].constraints).toContainEqual({
      kind: 'onDelete',
      action: 'cascade'
    })
  })

  it('parses onDelete nullify', () => {
    const input = `
$schema:
  assignee: $users, onDelete nullify
`
    const ast = parse(input)
    expect(ast.schema.fields[0].constraints).toContainEqual({
      kind: 'onDelete',
      action: 'nullify'
    })
  })

  it('parses onDelete restrict', () => {
    const input = `
$schema:
  owner: $users, onDelete restrict
`
    const ast = parse(input)
    expect(ast.schema.fields[0].constraints).toContainEqual({
      kind: 'onDelete',
      action: 'restrict'
    })
  })

  it('parses multiple constraints', () => {
    const input = `
$schema:
  title: string, required
  assignee: $users, required, onDelete nullify
  members: $users[], max 5
`
    const ast = parse(input)
    expect(ast.schema.fields).toHaveLength(3)
    expect(ast.schema.fields[1].constraints).toHaveLength(2)
  })

  it('parses full schema with data entries', () => {
    const input = `
$schema:
  title: string, required
  assignee: $users

task1:
  title: "Design Review"
  assignee: $users.toni
`
    const ast = parse(input)
    expect(ast.schema.fields).toHaveLength(2)
    expect(ast.entries).toHaveLength(1)
    expect(ast.entries[0].name).toBe('task1')
  })
})
```

### Unit Tests: Schema Registry

**Datei:** `tests/runtime/schema-registry.test.ts`

```typescript
describe('SchemaRegistry', () => {
  let registry: SchemaRegistry

  beforeEach(() => {
    registry = new SchemaRegistry()
  })

  it('registers and retrieves schema', () => {
    const schema = {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [] }
      ]
    }
    registry.register('tasks', schema)
    expect(registry.get('tasks')).toEqual(schema)
  })

  it('returns undefined for unknown collection', () => {
    expect(registry.get('unknown')).toBeUndefined()
  })

  it('getFieldType returns correct type', () => {
    registry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [] },
        { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [] }
      ]
    })

    expect(registry.getFieldType('tasks', 'title')).toMatchObject({ kind: 'primitive', type: 'string' })
    expect(registry.getFieldType('tasks', 'assignee')).toMatchObject({ kind: 'relation', target: '$users' })
  })

  it('getRelationTarget returns target collection', () => {
    registry.register('tasks', {
      fields: [
        { name: 'assignee', type: { kind: 'relation', target: '$users', isArray: false }, constraints: [] }
      ]
    })

    expect(registry.getRelationTarget('tasks', 'assignee')).toBe('$users')
    expect(registry.getRelationTarget('tasks', 'title')).toBeUndefined()
  })

  it('isRequired checks constraint', () => {
    registry.register('tasks', {
      fields: [
        { name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }] },
        { name: 'description', type: { kind: 'primitive', type: 'string' }, constraints: [] }
      ]
    })

    expect(registry.isRequired('tasks', 'title')).toBe(true)
    expect(registry.isRequired('tasks', 'description')).toBe(false)
  })
})
```

---

## Phase 2: Collection Runtime

### Unit Tests: Collection

**Datei:** `tests/runtime/collection.test.ts`

```typescript
describe('Collection', () => {
  let collection: Collection<{ id: string; title: string }>

  beforeEach(() => {
    collection = new Collection([
      { id: '1', title: 'Task 1' },
      { id: '2', title: 'Task 2' }
    ])
  })

  describe('current', () => {
    it('starts as null', () => {
      expect(collection.current).toBeNull()
    })

    it('can be set', () => {
      collection.current = collection.items[0]
      expect(collection.current).toEqual({ id: '1', title: 'Task 1' })
    })

    it('notifies subscribers on change', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.current = collection.items[0]

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('does not notify if same value', () => {
      collection.current = collection.items[0]

      const callback = vi.fn()
      collection.subscribe(callback)

      collection.current = collection.items[0]

      expect(callback).not.toHaveBeenCalled()
    })

    it('unsubscribe stops notifications', () => {
      const callback = vi.fn()
      const unsubscribe = collection.subscribe(callback)

      unsubscribe()
      collection.current = collection.items[0]

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('CRUD', () => {
    it('add creates new item', () => {
      const newItem = collection.add({ title: 'Task 3' })

      expect(collection.items).toHaveLength(3)
      expect(newItem.title).toBe('Task 3')
      expect(newItem.id).toBeDefined()
    })

    it('add notifies subscribers', () => {
      const callback = vi.fn()
      collection.subscribe(callback)

      collection.add({ title: 'Task 3' })

      expect(callback).toHaveBeenCalled()
    })

    it('remove deletes item', () => {
      const item = collection.items[0]
      collection.remove(item)

      expect(collection.items).toHaveLength(1)
      expect(collection.items).not.toContain(item)
    })

    it('remove clears current if removed', () => {
      collection.current = collection.items[0]
      collection.remove(collection.items[0])

      expect(collection.current).toBeNull()
    })

    it('update modifies item', () => {
      const item = collection.items[0]
      collection.update(item, { title: 'Updated' })

      expect(item.title).toBe('Updated')
    })
  })
})
```

### Integration Tests: Table setzt current

**Datei:** `tests/integration/table-current.test.ts`

```typescript
describe('Table → current Integration', () => {
  it('clicking table row sets collection.current', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Task 1"

task2:
  title: "Task 2"

Table $tasks
`
    const { container, runtime } = await render(code)

    // Initial: kein current
    expect(runtime.collections.tasks.current).toBeNull()

    // Klick auf erste Zeile
    const rows = container.querySelectorAll('tr[data-row]')
    rows[0].click()

    expect(runtime.collections.tasks.current.title).toBe('Task 1')

    // Klick auf zweite Zeile
    rows[1].click()

    expect(runtime.collections.tasks.current.title).toBe('Task 2')
  })

  it('current change updates dependent UI', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Task 1"

task2:
  title: "Task 2"

Frame hor
  Table $tasks, w 200
  Text $tasks.current.title
`
    const { container, runtime } = await render(code)

    // Initial: leer (kein current)
    const text = container.querySelector('[data-element="Text"]')
    expect(text.textContent).toBe('')

    // Klick auf Zeile
    const rows = container.querySelectorAll('tr[data-row]')
    rows[0].click()

    // Text aktualisiert sich
    expect(text.textContent).toBe('Task 1')
  })
})
```

---

## Phase 3: CRUD-Funktionen

### Unit Tests: create()

**Datei:** `tests/runtime/crud-create.test.ts`

```typescript
describe('create()', () => {
  let runtime: Runtime

  beforeEach(() => {
    runtime = createRuntime({
      tasks: {
        schema: { fields: [{ name: 'title', type: { kind: 'primitive', type: 'string' } }] },
        items: []
      }
    })
  })

  it('creates empty entry', () => {
    runtime.execute('create', { collection: '$tasks' })

    expect(runtime.collections.tasks.items).toHaveLength(1)
    expect(runtime.collections.tasks.current).toBe(runtime.collections.tasks.items[0])
  })

  it('creates entry with initial values', () => {
    runtime.execute('create', {
      collection: '$tasks',
      initialValues: { title: 'New Task' }
    })

    expect(runtime.collections.tasks.current.title).toBe('New Task')
  })

  it('creates entry with relation', () => {
    runtime.collections.users = new Collection([{ id: 'u1', name: 'Toni' }])
    runtime.collections.users.current = runtime.collections.users.items[0]

    runtime.execute('create', {
      collection: '$tasks',
      initialValues: { assignee: '$users.current' }
    })

    expect(runtime.collections.tasks.current.assignee).toBe(runtime.collections.users.current)
  })
})
```

### Unit Tests: save()

**Datei:** `tests/runtime/crud-save.test.ts`

```typescript
describe('save()', () => {
  it('saves pending changes', () => {
    const runtime = createRuntime({
      tasks: {
        items: [{ id: '1', title: 'Original' }]
      }
    })

    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    runtime.forms.tasks.pendingChanges = { title: 'Changed' }

    runtime.execute('save', { form: 'tasks' })

    expect(runtime.collections.tasks.items[0].title).toBe('Changed')
    expect(runtime.forms.tasks.pendingChanges).toEqual({})
  })

  it('validates required fields', () => {
    const runtime = createRuntime({
      tasks: {
        schema: {
          fields: [{ name: 'title', type: { kind: 'primitive', type: 'string' }, constraints: [{ kind: 'required' }] }]
        },
        items: [{ id: '1', title: '' }]
      }
    })

    runtime.collections.tasks.current = runtime.collections.tasks.items[0]

    runtime.execute('save', { form: 'tasks' })

    expect(runtime.forms.tasks.errors).toContainEqual({
      field: 'title',
      message: 'Pflichtfeld'
    })
  })
})
```

### Unit Tests: delete()

**Datei:** `tests/runtime/crud-delete.test.ts`

```typescript
describe('delete()', () => {
  it('removes entry', () => {
    const runtime = createRuntime({
      tasks: {
        items: [{ id: '1', title: 'Task 1' }, { id: '2', title: 'Task 2' }]
      }
    })

    const toDelete = runtime.collections.tasks.items[0]
    runtime.execute('delete', { entry: toDelete })

    expect(runtime.collections.tasks.items).toHaveLength(1)
    expect(runtime.collections.tasks.items[0].id).toBe('2')
  })

  it('clears current if deleted', () => {
    const runtime = createRuntime({
      tasks: {
        items: [{ id: '1', title: 'Task 1' }]
      }
    })

    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    runtime.execute('delete', { entry: runtime.collections.tasks.current })

    expect(runtime.collections.tasks.current).toBeNull()
  })

  it('cascade deletes referencing entries', () => {
    const runtime = createRuntime({
      projects: {
        items: [{ id: 'p1', name: 'Project' }]
      },
      tasks: {
        schema: {
          fields: [{
            name: 'project',
            type: { kind: 'relation', target: '$projects', isArray: false },
            constraints: [{ kind: 'onDelete', action: 'cascade' }]
          }]
        },
        items: [
          { id: 't1', title: 'Task 1', project: { __ref: 'p1' } },
          { id: 't2', title: 'Task 2', project: { __ref: 'p1' } }
        ]
      }
    })

    runtime.execute('delete', { entry: runtime.collections.projects.items[0] })

    expect(runtime.collections.tasks.items).toHaveLength(0)
  })

  it('nullify sets reference to null', () => {
    const runtime = createRuntime({
      users: {
        items: [{ id: 'u1', name: 'Toni' }]
      },
      tasks: {
        schema: {
          fields: [{
            name: 'assignee',
            type: { kind: 'relation', target: '$users', isArray: false },
            constraints: [{ kind: 'onDelete', action: 'nullify' }]
          }]
        },
        items: [{ id: 't1', title: 'Task', assignee: { __ref: 'u1' } }]
      }
    })

    runtime.execute('delete', { entry: runtime.collections.users.items[0] })

    expect(runtime.collections.tasks.items[0].assignee).toBeNull()
  })

  it('restrict prevents delete if referenced', () => {
    const runtime = createRuntime({
      users: {
        items: [{ id: 'u1', name: 'Toni' }]
      },
      tasks: {
        schema: {
          fields: [{
            name: 'assignee',
            type: { kind: 'relation', target: '$users', isArray: false },
            constraints: [{ kind: 'onDelete', action: 'restrict' }]
          }]
        },
        items: [{ id: 't1', title: 'Task', assignee: { __ref: 'u1' } }]
      }
    })

    expect(() => {
      runtime.execute('delete', { entry: runtime.collections.users.items[0] })
    }).toThrow('Cannot delete: referenced by tasks')
  })
})
```

### Unit Tests: revert()

**Datei:** `tests/runtime/crud-revert.test.ts`

```typescript
describe('revert()', () => {
  it('discards pending changes', () => {
    const runtime = createRuntime({
      tasks: {
        items: [{ id: '1', title: 'Original' }]
      }
    })

    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    runtime.forms.tasks.pendingChanges = { title: 'Changed' }

    runtime.execute('revert', { form: 'tasks' })

    expect(runtime.forms.tasks.pendingChanges).toEqual({})
    expect(runtime.collections.tasks.items[0].title).toBe('Original')
  })

  it('clears errors', () => {
    const runtime = createRuntime({ tasks: { items: [] } })
    runtime.forms.tasks.errors = [{ field: 'title', message: 'Error' }]

    runtime.execute('revert', { form: 'tasks' })

    expect(runtime.forms.tasks.errors).toEqual([])
  })
})
```

---

## Phase 4: Form/Field

### Integration Tests: Form Rendering

**Datei:** `tests/integration/form-rendering.test.ts`

```typescript
describe('Form Rendering', () => {
  it('Form binds to collection.current', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Task 1"

Form $tasks
  Field title
`
    const { container, runtime } = await render(code)

    // Ohne current: Form leer/disabled
    const input = container.querySelector('input')
    expect(input.value).toBe('')

    // Mit current: Form zeigt Wert
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    expect(input.value).toBe('Task 1')
  })

  it('Field string renders Input', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Test"

Form $tasks
  Field title
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const input = container.querySelector('input[type="text"]')
    expect(input).toBeTruthy()
    expect(input.value).toBe('Test')
  })

  it('Field number renders NumberInput', async () => {
    const code = `
$schema:
  aufwand: number

task1:
  aufwand: 8

Form $tasks
  Field aufwand
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const input = container.querySelector('input[type="number"]')
    expect(input).toBeTruthy()
    expect(input.value).toBe('8')
  })

  it('Field boolean renders Switch', async () => {
    const code = `
$schema:
  done: boolean

task1:
  done: false

Form $tasks
  Field done
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const switchEl = container.querySelector('[data-component="Switch"]')
    expect(switchEl).toBeTruthy()
  })

  it('Field multiline renders Textarea', async () => {
    const code = `
$schema:
  description: string

task1:
  description: "Long text"

Form $tasks
  Field description, multiline
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const textarea = container.querySelector('textarea')
    expect(textarea).toBeTruthy()
    expect(textarea.value).toBe('Long text')
  })

  it('Field with label shows label', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Test"

Form $tasks
  Field title, label "Titel"
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const label = container.querySelector('label')
    expect(label.textContent).toBe('Titel')
  })

  it('Two-way binding updates data', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Original"

Form $tasks
  Field title
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const input = container.querySelector('input')
    input.value = 'Changed'
    input.dispatchEvent(new Event('input'))
    await nextTick()

    expect(runtime.forms.tasks.pendingChanges.title).toBe('Changed')
  })
})
```

---

## Phase 5: Relation-Lookups

### Integration Tests: N:1 Select

**Datei:** `tests/integration/relation-select.test.ts`

```typescript
describe('Relation Select (N:1)', () => {
  const code = `
// Users
$users.schema:
  name: string

toni:
  name: "Toni"

anna:
  name: "Anna"

// Tasks
$tasks.schema:
  title: string
  assignee: $users

task1:
  title: "Task 1"
  assignee: $users.toni

Form $tasks
  Field assignee
`

  it('renders Select for relation field', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const select = container.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('Select contains all options from target collection', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const options = container.querySelectorAll('option')
    expect(options).toHaveLength(2)
    expect(options[0].textContent).toBe('Toni')
    expect(options[1].textContent).toBe('Anna')
  })

  it('Select shows current value as selected', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const select = container.querySelector('select')
    expect(select.value).toBe('toni')
  })

  it('changing Select updates relation', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const select = container.querySelector('select')
    select.value = 'anna'
    select.dispatchEvent(new Event('change'))
    await nextTick()

    expect(runtime.forms.tasks.pendingChanges.assignee.__ref).toBe('anna')
  })

  it('display option changes shown text', async () => {
    const codeWithDisplay = code.replace(
      'Field assignee',
      'Field assignee, display user.name + " (User)"'
    )
    const { container, runtime } = await render(codeWithDisplay)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const options = container.querySelectorAll('option')
    expect(options[0].textContent).toBe('Toni (User)')
  })

  it('filter option limits choices', async () => {
    const codeWithFilter = `
$users.schema:
  name: string
  active: boolean

toni:
  name: "Toni"
  active: true

anna:
  name: "Anna"
  active: false

$tasks.schema:
  assignee: $users

task1:
  assignee: $users.toni

Form $tasks
  Field assignee, filter user.active == true
`
    const { container, runtime } = await render(codeWithFilter)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const options = container.querySelectorAll('option')
    expect(options).toHaveLength(1)
    expect(options[0].textContent).toBe('Toni')
  })

  it('allowClear adds empty option', async () => {
    const codeWithClear = code.replace(
      'Field assignee',
      'Field assignee, allowClear'
    )
    const { container, runtime } = await render(codeWithClear)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const options = container.querySelectorAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].value).toBe('')
  })
})
```

### Integration Tests: N:N TagInput

**Datei:** `tests/integration/relation-taginput.test.ts`

```typescript
describe('Relation TagInput (N:N)', () => {
  const code = `
$users.schema:
  name: string

toni:
  name: "Toni"

anna:
  name: "Anna"

tom:
  name: "Tom"

$tasks.schema:
  title: string
  watchers: $users[]

task1:
  title: "Task 1"
  watchers: $users.toni, $users.anna

Form $tasks
  Field watchers
`

  it('renders TagInput for array relation', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const tagInput = container.querySelector('[data-component="TagInput"]')
    expect(tagInput).toBeTruthy()
  })

  it('shows current relations as tags', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const tags = container.querySelectorAll('.tag')
    expect(tags).toHaveLength(2)
    expect(tags[0].textContent).toContain('Toni')
    expect(tags[1].textContent).toContain('Anna')
  })

  it('clicking X removes tag', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const removeBtn = container.querySelector('.tag button')
    removeBtn.click()
    await nextTick()

    expect(runtime.forms.tasks.pendingChanges.watchers).toHaveLength(1)
  })

  it('Add button opens picker with available options', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    const addBtn = container.querySelector('[data-action="add"]')
    addBtn.click()
    await nextTick()

    const picker = container.querySelector('[data-component="RelationPicker"]')
    expect(picker).toBeTruthy()

    // Nur Tom sollte verfügbar sein (Toni und Anna sind schon drin)
    const pickerOptions = picker.querySelectorAll('[data-option]')
    expect(pickerOptions).toHaveLength(1)
    expect(pickerOptions[0].textContent).toBe('Tom')
  })

  it('selecting from picker adds relation', async () => {
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    // Öffne Picker
    container.querySelector('[data-action="add"]').click()
    await nextTick()

    // Wähle Tom
    container.querySelector('[data-option]').click()
    await nextTick()

    expect(runtime.forms.tasks.pendingChanges.watchers).toHaveLength(3)
  })

  it('max limits number of selections', async () => {
    const codeWithMax = code.replace(
      'Field watchers',
      'Field watchers, max 2'
    )
    const { container, runtime } = await render(codeWithMax)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    // Bei max 2 und 2 bereits ausgewählt: kein Add-Button
    const addBtn = container.querySelector('[data-action="add"]')
    expect(addBtn).toBeNull()
  })
})
```

---

## Phase 6: Table Integration

### Integration Tests: Inline Edit

**Datei:** `tests/integration/table-inline-edit.test.ts`

```typescript
describe('Table Inline Edit', () => {
  it('editable column renders input', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Task 1"

Table $tasks
  Column title, editable
`
    const { container } = await render(code)

    const cell = container.querySelector('td[data-field="title"]')
    const input = cell.querySelector('input')
    expect(input).toBeTruthy()
    expect(input.value).toBe('Task 1')
  })

  it('editable boolean column renders checkbox', async () => {
    const code = `
$schema:
  done: boolean

task1:
  done: false

Table $tasks
  Column done, editable
`
    const { container } = await render(code)

    const checkbox = container.querySelector('input[type="checkbox"]')
    expect(checkbox).toBeTruthy()
    expect(checkbox.checked).toBe(false)
  })

  it('editing inline updates data', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Original"

Table $tasks
  Column title, editable
`
    const { container, runtime } = await render(code)

    const input = container.querySelector('input')
    input.value = 'Changed'
    input.dispatchEvent(new Event('blur'))
    await nextTick()

    expect(runtime.collections.tasks.items[0].title).toBe('Changed')
  })

  it('editable relation column renders inline select', async () => {
    const code = `
$users.schema:
  name: string

toni:
  name: "Toni"

$tasks.schema:
  assignee: $users

task1:
  assignee: $users.toni

Table $tasks
  Column assignee, editable
`
    const { container } = await render(code)

    const select = container.querySelector('select')
    expect(select).toBeTruthy()
  })

  it('RowActions renders action buttons', async () => {
    const code = `
$schema:
  title: string

task1:
  title: "Task 1"

Table $tasks
  Column title

  RowActions:
    Button icon "trash", delete(row)
`
    const { container, runtime } = await render(code)

    const deleteBtn = container.querySelector('[data-action="delete"]')
    expect(deleteBtn).toBeTruthy()

    deleteBtn.click()
    await nextTick()

    expect(runtime.collections.tasks.items).toHaveLength(0)
  })
})
```

---

## Phase 7: Validierung

### Integration Tests: Validation

**Datei:** `tests/integration/form-validation.test.ts`

```typescript
describe('Form Validation', () => {
  it('required field shows error when empty', async () => {
    const code = `
$schema:
  title: string, required

task1:
  title: ""

Form $tasks
  Field title

  Actions:
    Button "Save", save()
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    container.querySelector('button').click()
    await nextTick()

    const error = container.querySelector('.field-error')
    expect(error).toBeTruthy()
    expect(error.textContent).toBe('Pflichtfeld')
  })

  it('max constraint shows error when exceeded', async () => {
    const code = `
$users.schema:
  name: string

u1:
  name: "U1"
u2:
  name: "U2"
u3:
  name: "U3"

$tasks.schema:
  watchers: $users[], max 2

task1:
  watchers: $users.u1, $users.u2, $users.u3

Form $tasks
  Field watchers

  Actions:
    Button "Save", save()
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    container.querySelector('button').click()
    await nextTick()

    const error = container.querySelector('.field-error')
    expect(error.textContent).toContain('Maximal 2')
  })

  it('valid form saves successfully', async () => {
    const code = `
$schema:
  title: string, required

task1:
  title: "Valid"

Form $tasks
  Field title

  Actions:
    Button "Save", save()
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    runtime.forms.tasks.pendingChanges = { title: 'Updated' }
    await nextTick()

    container.querySelector('button').click()
    await nextTick()

    expect(runtime.collections.tasks.items[0].title).toBe('Updated')
    expect(container.querySelector('.field-error')).toBeNull()
  })

  it('revert clears errors', async () => {
    const code = `
$schema:
  title: string, required

task1:
  title: ""

Form $tasks
  Field title

  Actions:
    Button "Save", save()
    Button "Revert", revert()
`
    const { container, runtime } = await render(code)
    runtime.collections.tasks.current = runtime.collections.tasks.items[0]
    await nextTick()

    // Trigger error
    container.querySelectorAll('button')[0].click()
    await nextTick()
    expect(container.querySelector('.field-error')).toBeTruthy()

    // Revert
    container.querySelectorAll('button')[1].click()
    await nextTick()
    expect(container.querySelector('.field-error')).toBeNull()
  })
})
```

---

## E2E Tests

### Kompletter Workflow

**Datei:** `tests/e2e/crud-workflow.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('CRUD Workflow', () => {
  test('complete task management flow', async ({ page }) => {
    await page.goto('/crud-demo')

    // 1. Initial: Keine Tasks
    await expect(page.locator('table tbody tr')).toHaveCount(0)

    // 2. Create Task
    await page.click('button:has-text("Neuer Task")')
    await page.fill('input[data-field="title"]', 'Test Task')
    await page.selectOption('select[data-field="assignee"]', 'toni')
    await page.click('button:has-text("Speichern")')

    // 3. Task erscheint in Liste
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    await expect(page.locator('td[data-field="title"]')).toHaveText('Test Task')

    // 4. Select Task
    await page.click('table tbody tr')
    await expect(page.locator('input[data-field="title"]')).toHaveValue('Test Task')

    // 5. Update Task
    await page.fill('input[data-field="title"]', 'Updated Task')
    await page.click('button:has-text("Speichern")')
    await expect(page.locator('td[data-field="title"]')).toHaveText('Updated Task')

    // 6. Delete Task
    await page.click('button:has-text("Löschen")')
    await page.click('button:has-text("Bestätigen")')
    await expect(page.locator('table tbody tr')).toHaveCount(0)
  })

  test('relation management', async ({ page }) => {
    await page.goto('/crud-demo')

    // Create task with relation
    await page.click('button:has-text("Neuer Task")')
    await page.fill('input[data-field="title"]', 'Task with Team')

    // Add watchers (N:N)
    await page.click('[data-field="watchers"] [data-action="add"]')
    await page.click('[data-option="toni"]')
    await page.click('[data-field="watchers"] [data-action="add"]')
    await page.click('[data-option="anna"]')

    await expect(page.locator('[data-field="watchers"] .tag')).toHaveCount(2)

    // Remove watcher
    await page.click('[data-field="watchers"] .tag:first-child button')
    await expect(page.locator('[data-field="watchers"] .tag')).toHaveCount(1)

    // Save
    await page.click('button:has-text("Speichern")')

    // Verify
    await page.click('table tbody tr')
    await expect(page.locator('[data-field="watchers"] .tag')).toHaveCount(1)
  })

  test('validation prevents invalid save', async ({ page }) => {
    await page.goto('/crud-demo')

    // Create without required field
    await page.click('button:has-text("Neuer Task")')
    await page.click('button:has-text("Speichern")')

    // Error shown
    await expect(page.locator('.field-error')).toBeVisible()
    await expect(page.locator('.field-error')).toHaveText('Pflichtfeld')

    // Task not created
    await expect(page.locator('table tbody tr')).toHaveCount(0)

    // Fix and save
    await page.fill('input[data-field="title"]', 'Valid Task')
    await page.click('button:has-text("Speichern")')

    // Error gone, task created
    await expect(page.locator('.field-error')).not.toBeVisible()
    await expect(page.locator('table tbody tr')).toHaveCount(1)
  })

  test('cascade delete', async ({ page }) => {
    await page.goto('/crud-demo')

    // Create project with tasks
    // ... setup

    // Delete project
    await page.click('[data-collection="projects"] tr:first-child')
    await page.click('button:has-text("Projekt löschen")')
    await page.click('button:has-text("Bestätigen")')

    // Tasks also deleted
    await expect(page.locator('[data-collection="tasks"] tr')).toHaveCount(0)
  })
})
```

---

## Test-Matrix

| Phase | Unit | Integration | E2E |
|-------|------|-------------|-----|
| 1. Schema | ✓ Lexer, Parser, Registry | - | - |
| 2. Collection | ✓ Collection class | ✓ Table→current | - |
| 3. CRUD | ✓ create, save, delete, revert | - | - |
| 4. Form | - | ✓ Form/Field rendering | - |
| 5. Lookups | - | ✓ Select, TagInput | - |
| 6. Table | - | ✓ Inline Edit | - |
| 7. Validation | - | ✓ Error display | - |
| **Workflow** | - | - | ✓ Complete flows |

---

## Ausführung

```bash
# Alle Tests
npm test

# Nur Schema-Tests
npm test -- tests/compiler/parser-schema.test.ts

# Nur Integration
npm test -- tests/integration/

# E2E
npm run test:e2e
```
