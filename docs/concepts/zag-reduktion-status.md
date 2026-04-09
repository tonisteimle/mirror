# Zag-Komponenten Reduktion - Status

**Datum:** 2026-04-09
**Branch:** cleanup/project-cleanup
**Status:** ✅ Abgeschlossen

## Ziel

Reduktion der Zag-Komponenten auf das **Tutorial Set** (10 Komponenten):

### Tutorial Set (behalten)
| Kategorie | Komponenten |
|-----------|-------------|
| **Forms (6)** | Checkbox, Switch, RadioGroup, Slider, Select, DatePicker |
| **Navigation (2)** | Tabs, SideNav |
| **Overlays (2)** | Dialog, Tooltip |

### Entfernt (~33 Komponenten)
- **Menus:** Menu, ContextMenu, NestedMenu, NavigationMenu
- **Forms:** NumberInput, PinInput, TagsInput, RatingGroup, SegmentedControl, ToggleGroup, RangeSlider, AngleSlider, Editable, PasswordInput
- **Selection:** Combobox, Listbox
- **Navigation:** Accordion, Collapsible, Steps, Pagination, TreeView
- **Overlays:** Popover, HoverCard, Toast, FloatingPanel, Tour
- **Media:** Avatar, FileUpload, ImageCropper, Carousel, SignaturePad
- **Feedback:** Progress, CircularProgress, Marquee
- **Utility:** Clipboard, QRCode, ScrollArea, Splitter, Timer, Presence

## Erledigte Arbeiten

### 1. Schema reduziert
- `compiler/schema/zag-primitives.ts`: 1,377 → 457 Zeilen

### 2. Test-Dateien aktualisiert

**Gelöscht:**
- `tests/compiler/zag-media-020.test.ts`
- `tests/compiler/zag-menus-016.test.ts`

**Aktualisiert:**
- `tests/compiler/zag-forms-017.test.ts` - Nur Checkbox, Switch, RadioGroup, Slider
- `tests/compiler/zag-navigation-019.test.ts` - Nur Tabs, SideNav
- `tests/compiler/zag-overlays-018.test.ts` - Nur Dialog, Tooltip
- `tests/compiler/zag-selection-015.test.ts` - Nur Select
- `tests/compiler/tutorial/tutorial-09-navigation.test.ts` - Accordion/Collapsible entfernt
- `tests/compiler/tutorial/tutorial-10-overlays-behavior.test.ts` - Popover/HoverCard entfernt
- `tests/compiler/tutorial/tutorial-12-forms-behavior.test.ts` - NumberInput entfernt
- `tests/integration/tutorial-09-navigation.test.ts` - Accordion/Collapsible entfernt
- `tests/studio/panel-behavior-presets.test.ts` - Auf Tutorial Set angepasst

### 3. Layout-Presets
- `studio/panels/components/layout-presets.ts` - Tooltip hinzugefügt

### 4. Zag-Emitters aufgeräumt ✅
- `compiler/backends/dom/zag-emitters.ts`: 979 → 351 Zeilen
- Entfernt: Progress, Avatar, CircularProgress, FileUpload, Carousel, Steps, Pagination
- Behalten: Switch, Checkbox

### 5. Package.json aufgeräumt ✅
- 31 @zag-js/* Packages entfernt
- 12 @zag-js/* Packages behalten:
  - checkbox, core, date-picker, dialog, dom-query
  - radio-group, select, slider, switch, tabs, tooltip, vanilla

## Test-Ergebnisse

### Zag-spezifische Tests: ✅ ALLE BESTANDEN
```
Test Files  8 passed (8)
Tests       95 passed (95)
```

### Nicht Zag-bezogene Fehler (separate Aufgabe)
- Property Panel Tests
- State Machine Tests
- Selection Focus Tests

## Geänderte Dateien

```
modified:   compiler/backends/dom/zag-emitters.ts
modified:   compiler/schema/zag-primitives.ts
modified:   package.json
modified:   studio/panels/components/layout-presets.ts
modified:   tests/compiler/zag-*.test.ts
deleted:    tests/compiler/zag-media-020.test.ts
deleted:    tests/compiler/zag-menus-016.test.ts
modified:   tests/compiler/tutorial/*.test.ts
modified:   tests/integration/tutorial-09-navigation.test.ts
modified:   tests/studio/panel-behavior-presets.test.ts
```

## Nächste Schritte

1. ✅ Zag-Reduktion abgeschlossen
2. `npm install` ausführen um node_modules zu aktualisieren
3. Optional: Commit erstellen
4. Separate Aufgabe: Andere Test-Fehler beheben
