# $-Variablen Architektur

## Konzept

`$name` greift auf Variablen zu - eine Syntax für drei Quellen:
1. **Tokens** (in Mirror definiert)
2. **YAML-Dateien** (automatisch geladen)
3. **JS-Variablen** (global)

## Runtime: `__mirrorData`

```javascript
window.__mirrorData = {
  // Tokens aus Mirror (vom Compiler extrahiert)
  userName: "Max",
  itemCount: 3,

  // YAML-Daten (vom Loader)
  users: [{ name: "Anna" }, { name: "Ben" }],
  products: [...],
}
```

## Compiler: $-Auflösung

### Für Content (Text, Labels)
```
Text $userName
↓
textContent = __mirrorData.userName ?? globalThis.userName ?? '$userName'
```

### Für CSS (bg, col, pad)
Weiterhin CSS-Variablen (keine Änderung):
```
bg $primary
↓
background: var(--primary-bg)
```

### Für Each-Loops
```
each user in $users
↓
for (const user of (__mirrorData.users ?? globalThis.users ?? []))
```

## Lookup-Reihenfolge

1. `__mirrorData.name` (Tokens + YAML)
2. `globalThis.name` (JS-Variablen)
3. Fallback: Fehlermeldung oder leerer String

## Helper-Funktion

```javascript
function $get(name) {
  return __mirrorData[name] ?? globalThis[name]
}
```

Generierter Code:
```javascript
node.textContent = $get('userName')
for (const user of ($get('users') ?? []))
```

## YAML-Loader

Der YAML-Loader ist in `compiler/runtime/dom-runtime.ts` implementiert.

### Verwendung

```javascript
import { loadYAMLFiles, loadMirrorData } from 'mirror/runtime'

// Einzelne Dateien laden
await loadYAMLFiles(['users.yaml', 'products.yaml'])

// Mit Manifest (data/manifest.json)
await loadMirrorData()
```

### Projekt-Struktur

```
project/
├── data/
│   ├── users.yaml       → $users
│   ├── products.yaml    → $products
│   └── manifest.json    → ["users.yaml", "products.yaml"]
└── app.mirror
```

### YAML-Format

```yaml
# data/users.yaml - Array-Format
- name: Anna
  role: Admin
- name: Ben
  role: User

# data/config.yaml - Objekt-Format
theme: dark
language: de
```

### Im Mirror-Code

```mirror
// YAML-Daten sind unter dem Dateinamen verfügbar
each user in $users
  Text user.name
```

## Implementierungs-Status

- [x] **Runtime**: `$get()` Helper + `__mirrorData` initialisieren
- [x] **Compiler**: Token-Werte in `__mirrorData` schreiben
- [x] **Compiler**: `$name` in Content zu `$get('name')` kompilieren
- [x] **Compiler**: `each in $data` zu `$get('data')` kompilieren
- [x] **Runtime**: YAML-Loader implementiert
