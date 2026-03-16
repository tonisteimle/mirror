# Editor-Preview-Sync Feature

## Problem

Aktuell fehlt die bidirektionale Synchronisierung zwischen Code-Editor und Preview/Property-Panel:

1. **Editor → Preview**: Wenn der Cursor im Editor auf Zeile X steht, wird das entsprechende Element in der Preview NICHT selektiert
2. **Preview → Editor**: Wenn ein Element in der Preview geklickt wird, springt der Editor NICHT zur entsprechenden Zeile

## Anforderungen

### Funktional

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| F1 | Cursor im Editor → Element in Preview highlighten | Must |
| F2 | Cursor im Editor → Property Panel zeigt Properties | Must |
| F3 | Klick in Preview → Editor scrollt zur Zeile | Must |
| F4 | Klick in Preview → Zeile im Editor highlighten | Should |
| F5 | Breadcrumb-Klick → Editor springt zur Zeile | Should |

### Nicht-Funktional (Performance)

| ID | Anforderung | Priorität |
|----|-------------|-----------|
| P1 | **Keine Keystroke-Latenz**: Editor-Input darf nicht verzögert werden | Must |
| P2 | **Debounced Sync**: Sync nur nach Cursor-Ruhe (150-200ms) | Must |
| P3 | **Keine Sync während Tippen**: Nur bei Cursor-Bewegung ohne Text-Änderung | Must |
| P4 | **Lazy Lookup**: SourceMap-Lookup nur wenn nötig | Should |
| P5 | **Throttled Preview-Highlight**: Max 1 Update pro 50ms | Should |

## Bestehendes System

### Vorhandene Komponenten

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Code Editor   │     │ SelectionManager │     │     Preview     │
│   (CodeMirror)  │     │                  │     │                 │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │                       │ subscribe()            │
         │                       ├────────────────────────┤
         │                       │                        │
         │              ┌────────┴─────────┐              │
         │              │  PropertyPanel   │              │
         │              │ PreviewInteract. │              │
         │              └──────────────────┘              │
         │                                                │
         │              ┌──────────────────┐              │
         └──────────────┤    SourceMap     ├──────────────┘
                        │ nodeId ↔ line    │
                        └──────────────────┘
```

### Was existiert

- `SelectionManager`: Event-Hub für Selection (funktioniert)
- `SourceMap`: Mapping nodeId → position.line (funktioniert)
- `PropertyPanel.subscribe()`: Reagiert auf Selection (funktioniert)
- `PreviewInteraction`: Click → select (funktioniert)

### Was FEHLT

1. **SourceMap.getNodeAtLine(line)**: Reverse-Lookup Zeile → Node
2. **Editor Cursor Listener**: Reagiert auf Cursor-Bewegung
3. **Editor Line Highlight**: Springt zur Zeile bei Preview-Klick
