# Pure UI Components Backend Support Matrix

> Belegt durch `tests/differential/pure-ui-components.test.ts`.

| Sub-feature          | DOM | React | Framework | Bemerkung                         |
| -------------------- | --- | ----- | --------- | --------------------------------- |
| PUC1 Checkbox        | ✅  | ✅    | ✅        | text label, `checked`, `disabled` |
| PUC2 Switch          | ✅  | ✅    | ✅        | text label, `checked`             |
| PUC3 Slider          | ✅  | ✅    | ✅        | value/min/max/step Attribute      |
| PUC4 RadioGroup/Item | ✅  | ✅    | ✅        | initial `value` setzt Auswahl     |
| PUC5 Dialog          | ✅  | ✅    | ✅        | Trigger, Backdrop, Content Slots  |
| PUC6 Tooltip         | ✅  | ✅    | ✅        | Trigger, Content Slots            |
| PUC7 Tabs            | ✅  | ✅    | ✅        | Tab tabs + Content                |
| PUC8 Select          | ✅  | ✅    | ✅        | Trigger, Content, Item            |

## Keyword-Properties → data-attributes

| Property           | Surface                  | Bemerkung                       |
| ------------------ | ------------------------ | ------------------------------- |
| `positioning "X"`  | `data-positioning="X"`   | Tooltip / Popover (Bug #32 ✅)  |
| `defaultValue "X"` | `data-default-value="X"` | Tabs / RangeSlider (Bug #33 ✅) |
