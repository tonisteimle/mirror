# Events Backend Support Matrix

> Belegt durch `tests/differential/events.test.ts`.

| Sub-feature                      | DOM | React | Framework | Bemerkung                        |
| -------------------------------- | --- | ----- | --------- | -------------------------------- |
| EV1 onclick                      | ✅  | ⚠️    | ⚠️        | DOM: addEventListener('click')   |
| EV2 onhover (mouseenter)         | ✅  | ⚠️    | ⚠️        |                                  |
| EV3 onfocus / onblur             | ✅  | ⚠️    | ⚠️        |                                  |
| EV4 oninput / onchange           | ✅  | ⚠️    | ⚠️        |                                  |
| EV5 onkeydown(enter)             | ✅  | ⚠️    | ⚠️        | mit key-filter                   |
| EV6 onkeydown(arrow-up/down/...) | ✅  | ⚠️    | ⚠️        |                                  |
| EV7 onclick-outside              | ✅  | ❌    | ❌        | DOM-only outside-click-handler   |
| EV8 onviewenter / onviewexit     | ✅  | ❌    | ❌        | DOM-only IntersectionObserver    |
| EV9 multi-action                 | ✅  | ⚠️    | ⚠️        | mehrere Actions in einem Handler |
| EV10 onkeydown(escape)           | ✅  | ⚠️    | ⚠️        |                                  |

Legende: ✅ voll · ⚠️ kompiliert ohne Runtime · ❌ nicht unterstützt.
