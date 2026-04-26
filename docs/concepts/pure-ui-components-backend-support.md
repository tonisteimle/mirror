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

## Bekannte Einschränkungen

| Bug | Sub-Feature                    | Problem                                                 |
| --- | ------------------------------ | ------------------------------------------------------- |
| #32 | `Tooltip positioning "bottom"` | Keyword wird geparst, aber nicht als Attribut emittiert |
| #33 | `Tabs defaultValue "home"`     | Keyword wird geparst, aber nicht als Attribut emittiert |
