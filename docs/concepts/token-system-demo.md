# Token System Demo

Zeigt Mirror's Token-File-Konzept: zentrale Design-Tokens definieren, im
Layout referenzieren, an einer Stelle ändern → wirkt überall.

Skript: `tools/test-runner/demo/scripts/token-system.ts`
Spec: dieses Dokument · Infrastruktur: `demo-infrastructure.md`

## Auftrag

Mirror's Tokens sind das zentrale Design-System-Pattern: ein `.tok`-File hält
Werte (Farben, Spacing, Radii), Layouts referenzieren sie via `$name`. Eine
Token-Änderung propagiert zu allen Referenzen — der gesamte UI-Look wird an
einer einzigen Stelle gepflegt.

## Was die Demo demonstriert

1. **Tokens-File erstellen**: `tokens.tok` als separates File im Projekt.
2. **Tokens definieren**: Color- und Spacing-Tokens.
3. **Tokens referenzieren**: Im Layout `bg $primary` statt `bg #2271C1`.
4. **Cross-File-Compile**: Studio compiliert alle Files zusammen, das Layout
   sieht den Token sofort.
5. **Token-Wert ändern**: Im `tokens.tok` einen Wert ändern, alle Referenzen
   im Layout updaten.

## Ablauf

| #   | Schritt                             | Action                            | Was es zeigt           |
| --- | ----------------------------------- | --------------------------------- | ---------------------- |
| 1   | Reset auf leeren Canvas             | `resetCanvas()` Fragment          | Setup                  |
| 2   | `tokens.tok` erstellen              | `createFile`                      | Neues File im Projekt  |
| 3   | In `tokens.tok` switchen            | `switchFile`                      | File-Tree-UI           |
| 4   | Verifizieren: Tokens definiert      | `expectCode`                      | File-Inhalt korrekt    |
| 5   | Zurück zu `index.mir`               | `switchFile`                      | Cross-File-Workflow    |
| 6   | Card-Frame droppen                  | `dropFromPalette`                 | Hierarchie             |
| 7   | Card selektieren                    | `selectInPreview`                 | Property-Panel         |
| 8   | bg via Token referenzieren          | `setProperty bg=$primary`         | Token-Referenz         |
| 9   | Verifizieren: `bg $primary` im Code | `expectCode`                      | Code zeigt Reference   |
| 10  | Padding via Token                   | `setProperty pad=$lg`             | Spacing-Token          |
| 11  | Token-Wert in `tokens.tok` ändern   | `switchFile` + `setCode` Fragment | Single Source of Truth |
| 12  | Layout zeigt neuen Wert             | `expectDom`                       | Live-Propagation       |

## Token-File

```mirror
// tokens.tok
primary.bg: #2271C1
muted.bg: #71717a
lg.pad: 24
md.pad: 16
sm.rad: 4
md.rad: 8
```

## Validierungsstrategie

- **`expectCode`** auf `index.mir` und `tokens.tok` separat (multi-file).
- **`expectDom`** verifiziert dass Token-Referenz tatsächlich zum erwarteten
  Computed-Style führt (`$primary` → `bg #2271C1` → computed `#2271C1`).
- Token-Wert-Änderung: `expectDom` vor und nach der Änderung zeigt unterschied­
  liche `background`-Werte trotz unverändertem Layout-Code.
