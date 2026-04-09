# Bind Feature Debug - Stand 2026-04-09

## Problem
Die `bind` Funktion in Kombination mit `exclusive()` funktioniert nicht im Tutorial-Playground. Bei Klick auf eine Option wird:
1. Der State nicht gewechselt (Option wird nicht blau)
2. Die gebundene Variable `$city` bleibt "undefined"

## Tutorial-Beispiel (06-states.html)
```mirror
Option: pad 10, rad 6, bg #333, col #888, cursor pointer, exclusive()
  hover:
    bg #444
  on:
    bg #2563eb
    col white

Frame gap 8, bind city
  Text "Ausgewählt: $city", col #888, fs 12
  Option "Berlin"
  Option "Hamburg"
  Option "München"
```

## Untersuchungsergebnisse

### 1. State Machines werden korrekt erstellt
Browser-Evaluation zeigt, dass Option-Elemente `_stateMachine` haben:
```json
{
  "initial": "default",
  "current": "default",
  "states": {
    "hover": {"styles": {"background": "#444"}},
    "on": {"styles": {"background": "#2563eb", "color": "white"}},
    "default": {"styles": {}}
  },
  "transitions": []  // <-- PROBLEM: Leer!
}
```

### 2. Keine Click-Handler werden generiert
- `hasOnclick: false` für alle Option-Elemente
- Kompilierter Code enthält KEINE `.addEventListener("click"` Aufrufe
- Der `_runtime.exclusiveTransition()` existiert, wird aber nie aufgerufen

### 3. Root Cause identifiziert
In `dom.ts:emitStateMachineListeners()` (Zeile 8104-8165):
- Click-Handler werden aus `sm.transitions` generiert
- Aber `transitions: []` ist leer!

Die Funktion `exclusive()` sollte ein Transition-Objekt erstellen:
```typescript
{
  trigger: 'onclick',
  to: 'on',  // oder der erste Custom-State
  modifier: 'exclusive'
}
```

### 4. Wo das Problem liegt
In der IR-Transformation (`compiler/ir/index.ts`):
- `BUILTIN_STATE_FUNCTIONS` enthält `exclusive` (Zeile 114)
- `buildStateMachine()` wird aufgerufen wenn `hasStateMachineEvents` true ist
- ABER: Die Transitions werden nicht aus den Events extrahiert

**Vermutung:** Die IR-Transformation erstellt States, aber fügt keine Transitions hinzu wenn `exclusive()` als Property verwendet wird (ohne explizites `onclick:`).

## Nächste Schritte

1. **IR-Transformation untersuchen:**
   - Wie werden `exclusive()` und `toggle()` als Properties (nicht als onclick:) behandelt?
   - Suchen nach: Wo werden Transitions zur State Machine hinzugefügt?

2. **Vergleich mit funktionierenden Beispielen:**
   - Der "Klick mich" Button mit `toggle()` funktioniert auch nicht!
   - Alle States-Beispiele im Tutorial scheinen broken zu sein
   - Dies deutet auf ein grundlegendes Problem hin

3. **Zu prüfende Dateien:**
   - `compiler/ir/index.ts` - Zeile ~3373 `buildStateMachine()`
   - Suchen nach: Wie `action.isBuiltinStateFunction` in Transitions umgewandelt wird

## Relevante Code-Stellen

| Datei | Zeilen | Beschreibung |
|-------|--------|--------------|
| `compiler/ir/index.ts` | 114 | `BUILTIN_STATE_FUNCTIONS` Definition |
| `compiler/ir/index.ts` | 3373-3402 | `buildStateMachine()` Funktion |
| `compiler/ir/types.ts` | 167-177 | `IRStateTransition` Interface |
| `compiler/backends/dom.ts` | 8104-8165 | `emitStateMachineListeners()` |
| `compiler/backends/dom.ts` | 7981-8099 | `emitStateMachine()` |

## Beobachtung
Das Tab-Beispiel mit `exclusive()` hat das gleiche Problem - auch dort sind keine Click-Handler aktiv. Das bedeutet: Das Problem ist nicht spezifisch für `bind`, sondern grundlegend für `toggle()` und `exclusive()` als Properties.

## Technische Details

### Erwartete Transition für `exclusive()`
```typescript
{
  trigger: 'onclick',
  to: 'on',  // erster Custom-State
  modifier: 'exclusive'
}
```

### Erwarteter generierter Code
```javascript
element.addEventListener('click', (e) => {
  const sm = element._stateMachine
  const current = sm.current
  _runtime.exclusiveTransition(element, 'on')
})
```

### Tatsächlich generierter Code
Kein addEventListener für click - die State Machine existiert aber hat keine Trigger.
