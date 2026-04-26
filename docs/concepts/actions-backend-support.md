# Actions Backend Support Matrix

> Belegt durch `tests/differential/actions.test.ts`.

| Sub-feature                            | DOM | React | Framework | Bemerkung                         |
| -------------------------------------- | --- | ----- | --------- | --------------------------------- |
| A1 increment / decrement / set / reset | ✅  | ⚠️    | ⚠️        | DOM: setState mutation            |
| A2 show/hide via toggle + if-block     | ✅  | ⚠️    | ⚠️        | DOM hat Re-Render-Hook            |
| A3 toast (info/success/error)          | ✅  | ⚠️    | ⚠️        | DOM emittiert toast-DOM-Element   |
| A4 focus / clear (Input control)       | ✅  | ⚠️    | ⚠️        | DOM: native focus/clear via name  |
| A5 add / remove (Collection)           | ✅  | ⚠️    | ⚠️        | DOM: state mutation triggers each |
| A6 scrollTo* / scrollBy*               | ✅  | ❌    | ❌        | DOM-only Window-Scroll-API        |
| A7 navigate / back / forward           | ✅  | ⚠️    | ⚠️        | history.pushState                 |
| A8 copy (Clipboard)                    | ✅  | ⚠️    | ⚠️        | navigator.clipboard.writeText     |
| A9 setError / clearError               | ✅  | ❌    | ❌        | DOM-only Field-Error-System       |
| A10 multi-action chain                 | ✅  | ⚠️    | ⚠️        | mehrere Actions per Comma         |

Legende: ✅ voll · ⚠️ kompiliert ohne Runtime · ❌ nicht unterstützt.
