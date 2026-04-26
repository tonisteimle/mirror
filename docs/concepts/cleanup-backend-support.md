# Cleanup Sprint 6 Backend Support Matrix

> Belegt durch `tests/differential/cleanup.test.ts`.

## Animations

| Sub-feature       | DOM | React | Framework | Bemerkung        |
| ----------------- | --- | ----- | --------- | ---------------- |
| CL1 anim spin     | ✅  | ✅    | ✅        | rotate 360° loop |
| CL1 anim bounce   | ✅  | ✅    | ✅        |                  |
| CL1 anim pulse    | ✅  | ✅    | ✅        | Live-Indicator   |
| CL1 anim shake    | ✅  | ✅    | ✅        | Error-Feedback   |
| CL1 anim fade-in  | ✅  | ✅    | ✅        |                  |
| CL1 anim scale-in | ✅  | ✅    | ✅        |                  |

## Canvas

| Sub-feature             | DOM | React | Framework | Bemerkung                       |
| ----------------------- | --- | ----- | --------- | ------------------------------- |
| CL2 canvas mobile       | ✅  | ✅    | ✅        | 375 × 812                       |
| CL2 canvas tablet       | ✅  | ✅    | ✅        | 768 × 1024                      |
| CL2 canvas desktop      | ✅  | ✅    | ✅        | 1440 × 900                      |
| CL2 canvas custom props | ✅  | ✅    | ✅        | bg, col, font, fs vererben sich |

## DatePicker (Zag)

| Sub-feature       | DOM | React | Framework | Bemerkung             |
| ----------------- | --- | ----- | --------- | --------------------- |
| CL4 basic         | ✅  | ✅    | ✅        | placeholder, calendar |
| CL4 selectionMode | ✅  | ✅    | ✅        | single/multiple/range |
| CL4 startOfWeek   | ✅  | ✅    | ✅        | 0=Sun, 1=Mon          |
| CL4 min/max       | ✅  | ✅    | ✅        | Date-Range-Constraint |

## Bekannte Einschränkungen

| Bug | Sub-Feature  | Problem                                               |
| --- | ------------ | ----------------------------------------------------- |
| #34 | Custom Icons | `$icons:` emittiert `_runtime.registerIcon(...)` VOR  |
|     |              | dem `const _runtime = {}` — TDZ-Fehler bei standalone |
|     |              | Ausführung. Ordering-Bug in `dom.ts` `generate()`     |
|     |              | (`emitCustomIcons` müsste nach `emitRuntime` laufen). |
