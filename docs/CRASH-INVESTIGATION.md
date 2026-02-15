# Browser Crash Investigation: "margin" Typing Crash

## Problem
Browser crashes completely when typing "margin" and then rapidly deleting it with backspace.

## Status: ✅ GELÖST

---

## Root Cause

**Endlosschleife im Parser** durch fehlenden `ctx.advance()` für `UNKNOWN_PROPERTY` Tokens.

### Technische Details

In `src/parser/component-parser/inline-properties.ts` (Zeile ~80-100):

```typescript
// VORHER (BUGGY):
if (token.type === 'COMPONENT_NAME' || token.type === 'UNKNOWN_PROPERTY') {
  // ... state matching ...
  if (token.type === 'COMPONENT_NAME') {
    parseInlineChildSlot(ctx, componentName)  // advances token
  }
  continue  // UNKNOWN_PROPERTY: kein advance → Endlosschleife!
}

// NACHHER (FIX):
if (token.type === 'COMPONENT_NAME' || token.type === 'UNKNOWN_PROPERTY') {
  // ... state matching ...
  if (token.type === 'COMPONENT_NAME') {
    parseInlineChildSlot(ctx, componentName)
  } else {
    ctx.advance()  // FIX: UNKNOWN_PROPERTY muss auch advanced werden!
  }
  continue
}
```

### Warum "margin"?

Beim Tippen von "margin" erkennt der Lexer es als `UNKNOWN_PROPERTY` (weil es während des Tippens noch kein vollständiges Property ist). Der Parser:
1. Erkennt `UNKNOWN_PROPERTY`
2. Springt in den Handler
3. Ruft NICHT `ctx.advance()` auf (nur für `COMPONENT_NAME`)
4. `continue` → Loop wiederholt mit demselben Token
5. → **Endlosschleife**

### Warum crasht der Browser?

- JavaScript läuft im Main Thread
- Endlosschleife blockiert Main Thread komplett
- Browser kann keine Events verarbeiten
- Tab/Browser wird "unresponsive" oder crasht

---

## Lösung

**Eine Zeile hinzugefügt:** `ctx.advance()` für den `else`-Fall (UNKNOWN_PROPERTY).

Datei: `src/parser/component-parser/inline-properties.ts`

---

## Investigation Summary

| Komponente | Status |
|------------|--------|
| editor-extensions.ts | OK |
| useEditorTriggers.ts | OK |
| normalizer.ts | OK |
| parseComponent | → weiter eingegrenzt |
| parseInlineProperties | → weiter eingegrenzt |
| COMPONENT_NAME/UNKNOWN_PROPERTY Handler | **ROOT CAUSE** |

---

## Datum
2024-02-15
