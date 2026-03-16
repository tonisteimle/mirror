# Import - Technische Lösung

## Übersicht

Imports werden als Pre-Processing-Schritt vor dem Parsing aufgelöst. Der Code wird rekursiv zusammengeführt.

## Architektur

```
Source Code
     ↓
resolveImports(code, readFile)  ← NEU: Pre-Processor
     ↓
Combined Code
     ↓
parse() → AST → IR → DOM
```

## Implementierung

### Pre-Processor: resolveImports

```typescript
// In src/preprocessor.ts (neu)

export type ReadFileFn = (path: string) => string | null

export function resolveImports(
  code: string,
  readFile: ReadFileFn,
  resolved: Set<string> = new Set()
): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const importMatch = line.match(/^\s*import\s+(.+)$/)

    if (importMatch) {
      // Parse import names (comma-separated)
      const names = importMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const name of names) {
        const filename = name.endsWith('.mirror') ? name : `${name}.mirror`

        // Prevent circular imports
        if (resolved.has(filename)) continue
        resolved.add(filename)

        // Load file
        const content = readFile(filename)
        if (content) {
          // Recursively resolve imports in loaded file
          const resolvedContent = resolveImports(content, readFile, resolved)
          result.push(resolvedContent)
        }
      }
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}
```

### Integration in compile()

```typescript
// In src/index.ts

export function compile(
  code: string,
  options?: { readFile?: ReadFileFn }
): string {
  // Resolve imports first
  const resolvedCode = options?.readFile
    ? resolveImports(code, options.readFile)
    : code

  const ast = parse(resolvedCode)
  const ir = toIR(ast)
  return generateDOM(ir)
}
```

### Playground Integration

```javascript
// In playground.html

function compileCode() {
  const code = files[currentFile]

  // readFile callback für Playground
  const readFile = (path) => files[path] || null

  const output = Mirror.compile(code, { readFile })
  // ...
}
```

### Node.js Integration

```typescript
import * as fs from 'fs'
import * as path from 'path'

const basePath = './src'

const readFile = (filePath: string) => {
  const fullPath = path.join(basePath, filePath)
  try {
    return fs.readFileSync(fullPath, 'utf-8')
  } catch {
    return null
  }
}

const output = compile(code, { readFile })
```

## Parser-Änderungen

Der Parser muss `import` nicht mehr selbst verarbeiten - das macht der Pre-Processor. Die bestehende `parseImport()` Methode kann entfernt oder als Fallback behalten werden.

## Indentation Handling

Wenn ein Import eingerückt ist, muss der importierte Inhalt entsprechend eingerückt werden:

```mirror
Nav
  import nav-items    // nav-items.mirror Inhalt wird eingerückt
```

```typescript
// In resolveImports
const indent = line.match(/^(\s*)/)[1]
const indentedContent = content
  .split('\n')
  .map(l => indent + l)
  .join('\n')
result.push(indentedContent)
```

## Fehlerbehandlung

```typescript
if (!content) {
  console.warn(`Import not found: ${filename}`)
  // Oder: Fehler im AST speichern für Playground-Anzeige
}
```

## Testplan

1. Einzelner Import: `import header`
2. Multiple Imports: `import data, tokens`
3. Pfad-Imports: `import components/button`
4. Eingerückte Imports: Import als Child
5. Zirkuläre Imports: a → b → a
6. Nicht gefundene Dateien: Warnung
