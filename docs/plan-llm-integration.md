# Plan: LLM Integration

## Status

### Erledigt ✅
- LLM Prompt Templates (Mirror DSL Syntax)
- System Prompts (Compact + Full)
- Example Prompts mit erwarteten Outputs
- Studio Integration (llm-integration.ts)
- Autocomplete System
- DOM Backend für generierte UIs

### In Arbeit 🔄
- Validation für LLM-generierten Code
- Round-Trip Tests (Mirror → Compile → Run)

### Offen
- Web-Playground für LLM-Tests
- API Endpoints für externe LLM-Integration

---

## Phase 1: LLM Playground

**Ziel:** Web-Interface zum Testen von LLM-generiertem Mirror Code

### 1.1 Einfacher Playground

```
┌─────────────────────────────────────────────────────────┐
│  Mirror Code Input                │  Live Preview       │
│  ─────────────────                │                     │
│  Card: pad 16, bg #1a1a23         │  ┌─────────────┐    │
│      Text "Hello"                 │  │   Hello     │    │
│                                   │  └─────────────┘    │
│                                   │                     │
│  [Compile] [Copy JS]              │                     │
└─────────────────────────────────────────────────────────┘
```

**Status:** Studio Editor existiert bereits mit Live-Preview

**Dateien:**
- `studio/index.html` - Vorhandener Editor

### 1.2 Features
- ✅ Code-Editor (CodeMirror)
- ✅ Live Preview (DOM Backend)
- ✅ Error Handling mit Fehlermeldungen
- ✅ Autocomplete für Properties/Tokens
- 🔄 Beispiel-Buttons für Quick-Load

---

## Phase 2: Validation & Error Handling

### 2.1 Parser Validation ✅

Der Parser validiert bereits:
- Gültige Syntax
- Bekannte Properties
- Korrekte Struktur

```javascript
import { parse } from 'mirror-lang'

try {
  const ast = parse(code)
  // Valid code
} catch (error) {
  // Error with line/column info
}
```

### 2.2 Friendly Error Messages ✅

Parser gibt bereits detaillierte Fehlermeldungen:
- Zeilennummer und Spalte
- Erwartete vs. gefundene Tokens
- Kontext für den Fehler

---

## Phase 3: Round-Trip Verification

### 3.1 Compile & Run Tests

```
Mirror DSL Code
    ↓ parse()
AST
    ↓ generateDOM()
JavaScript
    ↓ execute
✓ Rendered UI
```

**Status:** E2E Tests decken dies bereits ab (1000+ Tests)

### 3.2 Test Cases ✅

| Scenario | Status |
|----------|--------|
| Simple Components | ✅ Tested |
| Nested Children | ✅ Tested |
| States (hover, etc.) | ✅ Tested |
| Events (onclick, etc.) | ✅ Tested |
| Each Loops | ✅ Tested |
| Conditionals | ✅ Tested |
| Keyboard Events | ✅ Tested |

---

## Phase 4: API für LLM-Integration

### 4.1 NPM Package Export ✅

```javascript
import { compile, parse, generateDOM } from 'mirror-lang'

// LLM generates Mirror code
const mirrorCode = llmResponse

// Compile to JavaScript
const jsCode = compile(mirrorCode)

// Or step by step
const ast = parse(mirrorCode)
const domCode = generateDOM(ast)
```

### 4.2 REST API (Optional - nicht implementiert)

```
POST /api/compile
Body: { code: "Card: pad 16..." }
Response: { js: "...", html: "..." }
```

---

## Implementierungs-Reihenfolge

| # | Task | Status |
|---|------|--------|
| 1 | LLM Prompt Templates | ✅ Erledigt |
| 2 | Studio mit Live-Preview | ✅ Erledigt |
| 3 | Autocomplete | ✅ Erledigt |
| 4 | Parser Validation | ✅ Erledigt |
| 5 | E2E Tests | ✅ Erledigt |
| 6 | NPM Package Export | ✅ Erledigt |
| 7 | Beispiel-Library | 🔄 Teilweise |
| 8 | REST API | ⏳ Optional |

---

## Nächste Schritte

1. **Beispiel-Library erweitern** - Mehr Komponenten-Beispiele für LLM-Training
2. **Prompt-Testing** - Systematisches Testen mit verschiedenen LLMs
3. **Fine-Tuning Daten** - Sammlung von Mirror-Code Beispielen

---

*Stand: März 2026*
