# Thema 14: Input Mask & Two-way Binding

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 35 Verhaltens-Tests + 2 `it.todo` für echte Tutorial-Bugs.

## Scope

- **Input-Primitive:** `placeholder`, `type` (text/email/password/number), `disabled`
- **Textarea:** `placeholder`, `value`, `h`
- **Checkbox / Switch:** Label, `checked`, `disabled`
- **Select / Item:** `placeholder`, `Item "Label"`, `Item "Label", value "key"`
- **Two-Way Binding:** `Input bind X`, `Select bind X`, `RadioGroup bind X`, `Slider bind X`
- **Slider:** `value`, `min`, `max`, `step`, `bind`
- **RadioGroup / RadioItem:** `value`, `bind`, RadioItem-Werte
- **Login-Formular** (Praxis-Pattern, mehrere bind + type)
- **Input Mask:** Pattern-Zeichen (`#`, `A`, `*`), Mask + Bind, `formatWithMask` /
  `getRawValue` Runtime-Helpers

## Tutorial-Aspekt-Coverage

**Tutorial:** `docs/tutorial/11-eingabe.html`

| Aspekt                                              | Test                                         |
| --------------------------------------------------- | -------------------------------------------- |
| `Input placeholder "..."`                           | `tutorial-11-eingabe-aspects` Input          |
| `Input type "email"`                                | Input                                        |
| `Input type "password"`                             | Input                                        |
| `Input type "number"`                               | Input                                        |
| `Input disabled`                                    | Input                                        |
| `Textarea placeholder` + `h 80`                     | Textarea                                     |
| `Textarea value "..."`                              | Textarea                                     |
| `Checkbox "Label"`                                  | Checkbox & Switch                            |
| `Checkbox checked` (Initial-State)                  | Checkbox & Switch                            |
| `Switch "Label"`                                    | Checkbox & Switch                            |
| `Switch disabled`                                   | Checkbox & Switch                            |
| `Select placeholder` + `Item "Label"`               | Select                                       |
| `Item "Label", value "key"`                         | Select                                       |
| `Input bind X`                                      | Two-Way Binding                              |
| `Input bind X` Initial-Value                        | Two-Way Binding                              |
| `Input bind X` schreibt zurück (Live-Update)        | Two-Way Binding                              |
| `Select bind X`                                     | Two-Way Binding                              |
| `Slider value 50`                                   | Slider                                       |
| `Slider bind volume`                                | Slider                                       |
| `Slider min/max/step`                               | **`it.todo`** — Tutorial-Limitation          |
| `RadioGroup` mit RadioItems                         | RadioGroup                                   |
| `RadioGroup value "..."` Initial                    | RadioGroup                                   |
| `RadioItem "Label", value "..."`                    | RadioGroup                                   |
| `RadioGroup bind X`                                 | RadioGroup                                   |
| Login-Formular (mehrere bind + type)                | Login-Formular (Variant ohne Name-Kollision) |
| Login-Formular as-is (`email: ""` + `type "email"`) | **`it.todo`** — Tutorial-Limitation          |
| `Input mask "###.####.####.##"`                     | Input Mask                                   |
| `mask "(###) ###-####"`                             | Input Mask                                   |
| `mask "####-##-##"`                                 | Input Mask                                   |
| Mask + Bind (rohe Werte)                            | Input Mask                                   |
| `#` (Ziffer) Pattern-Zeichen                        | Input Mask (`formatWithMask`)                |
| `A` (Buchstabe) Pattern-Zeichen                     | Input Mask (`formatWithMask`)                |
| `*` (Alphanumerisch) Pattern-Zeichen                | Input Mask (`formatWithMask`)                |
| Literale werden eingefügt                           | Input Mask (`formatWithMask`)                |
| `getRawValue` strippt Formatierung                  | Input Mask                                   |

**Tutorial-Coverage:** 33/33 Aspekte adressiert (31 working + 2 todos).

## Tutorial-Limitations (entdeckt 2026-04-25)

- ~~**Variable-Name-Kollision mit String-Literal**~~ — **gefixt 2026-04-25.**
  `resolveValue()` bekommt jetzt einen `skipStringTokens`-Flag, der für
  HTML-Attribute (`type`, `placeholder`, `href`, `src`, `name`) gesetzt
  wird. So bleibt `type "email"` literal "email" auch wenn eine Variable
  `email` existiert. Test in `tutorial-11-eingabe-aspects.test.ts`.
- ~~**Slider min/max/step werden verschluckt**~~ — **gefixt 2026-04-25.**
  Schema-Definitionen für `min`, `max`, `step` (Kategorie `input`) ergänzt
  und in `extractHTMLProperties` als HTML-Attribute durchgereicht.
  `Slider value 50, min 0, max 100, step 5` emittiert jetzt alle vier
  Attribute. Test in `tutorial-11-eingabe-aspects.test.ts`.

## Status

- [x] Schritt 1-3: Tutorial-Audit + Aspekt-Tabelle
- [x] Schritt 4: 35 Verhaltens-Tests + 2 todos
- [x] Schritt 5: Coverage abgedeckt
- [x] Schritt 6: 2 echte Tutorial-Bugs als `it.todo` markiert
