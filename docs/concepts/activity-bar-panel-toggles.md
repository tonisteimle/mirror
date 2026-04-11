# Activity Bar Panel Toggles

## Konzept

Die Activity Bar wird zum zentralen Ort für Panel-Visibility. Jedes Icon togglet ein Panel ein/aus.

## Panels

| Icon | Panel | Beschreibung |
|------|-------|--------------|
| Folder | Files | Datei-Explorer |
| Package | Components | Komponenten-Palette (mit Filter All/User) |
| Code | Editor | Code-Editor |
| Eye | Preview | Live-Preview |
| Sliders | Properties | Property Panel |

## Verhalten

- **Klick auf Icon** = Panel ein-/ausblenden
- **Visueller State**: Aktiv (Panel sichtbar) vs. Inaktiv (Panel versteckt)
- **Mindestens ein Panel** sollte immer sichtbar sein (Editor oder Preview)

## Änderungen

### Activity Bar (activity-bar.ts)

- Erweitern um Toggle-Modus (statt Radio-Button-Verhalten)
- Neue Icons: Code, Preview, Properties
- Visueller State für "inaktiv/versteckt"

### Explorer Panel

- Wird zu reinem "Files Panel"
- Activity Bar Items für Files/Components/UserComponents entfernen
- Stattdessen: Jedes ist eigenständiges Panel

### Components Panel

- Eigenständiges Panel (nicht mehr Teil von Explorer)
- Interner Toggle/Filter: "All" vs "My Components"
- Über Activity Bar ein-/ausblendbar

### State Integration

- `actions.togglePanelVisibility(panel)` nutzen
- `state.panelVisibility` für Persistenz
- Event `panel:visibility-changed` für Updates

## Layout

```
┌──────┬─────────────────────────────────────────────────┐
│ [F]  │  Files    │  Editor      │  Preview  │  Props  │
│ [C]  │  Panel    │  Panel       │  Panel    │  Panel  │
│ [<>] │           │              │           │         │
│ [👁] │           │              │           │         │
│ [☰]  │           │              │           │         │
└──────┴─────────────────────────────────────────────────┘
```

Activity Bar bleibt immer sichtbar, damit versteckte Panels wieder eingeblendet werden können.
