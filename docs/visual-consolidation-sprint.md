# Visual-Subsystem Consolidation Sprint Playbook

Ausführungsanleitung für Q2–Q4 der Visual-Konsolidierung. Q1 (margin-handles/
löschen, −546 LOC) wurde am 2026-05-08 in `bfa93bd3` ausgeführt; siehe
`docs/visual-consolidation-audit.md` (oder den Commit-Body) für die
ursprüngliche Audit-Begründung.

> **Pre-Condition**: Eine **ungestörte Session** ohne parallele Edits in
> `studio/visual/`. Vor Start prüfen:
>
> ```bash
> git log --since="2 hours ago" --oneline -- studio/visual/ tests/studio/visual/
> ```
>
> Wenn dort frische Commits einer anderen Session liegen, **STOPP** — sonst
> Race-Conditions wie in `35159f75` (lint-staged-Backup-Mix). Das ganze
> Sprint-Window soll dir allein gehören.

---

## Q2 — Unify Snap Engines

**Ziel**: Drei parallele Snap-Implementierungen → ein einheitliches Modul.
**Gewinn**: ~500 LOC entfernt + ein konsistenter Snap-API für alle Caller.
**Aufwand**: ~6 Stunden konzentrierte Arbeit.

### Quellen heute

| Datei                                     | LOC | Was                                                                                    |
| ----------------------------------------- | --- | -------------------------------------------------------------------------------------- |
| `studio/visual/snapping-service.ts`       | 298 | `snapToToken(value, propType)` — Token-basiertes Snap (z.B. `pad 4` snapt zu `$s.pad`) |
| `studio/visual/models/snap.ts`            | 380 | `calculateSnap(rect, siblings, container, config)` — generisches Edge/Center/Grid-Snap |
| `studio/visual/grid-overlay/grid-snap.ts` | 114 | `pointerToCell(cursor, geom)` — CSS-Grid-Zelle für Pointer-Position                    |

Alle drei kennen das Wort "snap", machen aber semantisch verschiedene Dinge:
_Token-Snap_ (Raster aus dem Token-System), _Geometric-Snap_ (Edge-Alignment),
_Grid-Cell-Snap_ (CSS-Grid-Cell-Indexing).

### Ziel-Datei: `studio/visual/snap/unified-snap.ts`

```ts
export class SnapEngine {
  /** Token-Snap: numeric value → nearest spacing token, with grid fallback. */
  snapSpacing(value: number, suffix: 'pad' | 'mar' | 'gap'): SpacingSnapResult { … }

  /** Geometric-Snap: align rect to siblings/container edges. */
  snapAlignment(rect: Rect, siblings: Rect[], container: Rect, threshold: number): AlignmentSnapResult { … }

  /** Grid-Cell-Snap: viewport pointer → 1-indexed cell coords. */
  snapToGridCell(pointer: Point, geometry: GridGeometry): GridCell { … }
}
```

Drei klare Methoden, klare Inputs/Outputs, kein Überschneidungs-Wirrwarr.

### Schritte

1. **Baseline pinnen** (5 min)

   ```bash
   npx vitest run tests/studio/visual --reporter=verbose > /tmp/visual-baseline.txt
   git rev-parse HEAD > /tmp/visual-baseline-sha.txt
   ```

2. **`snap/unified-snap.ts` neu anlegen** (90 min)
   - Klasse `SnapEngine` mit den drei Methoden oben.
   - Implementierung: Code aus den drei Quellen _kopieren_, nicht referenzieren — wir wollen sie löschen.
   - Inputs/Outputs explizit typen (eigene `SpacingSnapResult` etc.).
   - Sub-tests für `unified-snap.test.ts` direkt mitschreiben (Inputs aus den 3 alten Test-Files spiegeln).

3. **Caller migrieren** (90 min)
   - `margin-manager.ts`, `padding-manager.ts`, `gap-manager.ts` — ersetze `getSnappingService().snapToToken(…)` mit `snapEngine.snapSpacing(…)`.
   - `draw-manager.ts`, `snap-integration.ts` — ersetze `GuideCalculator.calculate(…)` mit `snapEngine.snapAlignment(…)`.
   - `grid-resize.ts` (oder wo immer `pointerToCell` aufgerufen wird) — ersetze mit `snapEngine.snapToGridCell(…)`.
   - **Kein Caller darf direkt aus `snapping-service.ts` / `models/snap.ts` / `grid-snap.ts` importieren** nach diesem Schritt.

4. **Tests laufen lassen** (10 min)

   ```bash
   npx vitest run tests/studio/visual
   ```

   Erwartung: alle bisher grünen Tests bleiben grün. Wenn nicht: Diff gegen Baseline `/tmp/visual-baseline.txt` lesen, wo zur Hölle es jetzt anders rechnet.

5. **Alte Files löschen** (10 min)

   ```bash
   rm studio/visual/snapping-service.ts
   rm studio/visual/models/snap.ts
   rm studio/visual/grid-overlay/grid-snap.ts
   # Ggf. zugehörige Test-Files löschen oder auf unified-snap re-pointen
   ```

6. **Build + Tests** (5 min)

   ```bash
   npm run build:studio
   npx vitest run tests/studio/visual
   ```

7. **Commit** (5 min)
   ```
   refactor(visual): unify three snap engines into SnapEngine (-500 LOC)
   ```

### Rollback

```bash
git reset --hard $(cat /tmp/visual-baseline-sha.txt)
```

---

## Q3 — Base Handle-Manager Class

**Ziel**: Vier fast-identische Drag-Manager (`margin/padding/gap/resize`) →
ein gemeinsamer Base-Class + vier dünne Subklassen.
**Gewinn**: ~250 LOC entfernt + DRY-Drag-Lifecycle.
**Aufwand**: ~8 Stunden.

> **Höchste Risikostufe** in diesem Sprint. Vier Manager × ~1000 LOC =
> ~4000 LOC interaktiver Drag-Code. Tests müssen _nach jedem Subklassen-Move_
> grün sein — nicht nur am Ende.

### Quellen heute (alle in `studio/visual/`)

| Datei                | LOC  | Spezifika                                             |
| -------------------- | ---- | ----------------------------------------------------- |
| `resize-manager.ts`  | 1201 | 8 Edge/Corner-Handles, Multi-Select, Grid-Cell-Resize |
| `padding-manager.ts` | 964  | 4 Inset-Handles                                       |
| `margin-manager.ts`  | 917  | 4 Outset-Handles                                      |
| `gap-manager.ts`     | 849  | N Inter-Child-Handles                                 |

Geteiltes Skelett (zeile-für-zeile dupliziert):

- `private handles: HTMLElement[] = []`
- `private activeDrag: …State \| null = null`
- `show(nodeId)` → fetch layout → `createHandles()`
- `createHandle()` → DOM-Factory (wrapper + line + grip)
- `mousedown/mousemove/mouseup` Drag-Loop
- `dispose()`

Geteiltes Verhalten: ~250 LOC pro Manager × 4 = ~1000 LOC Boilerplate.

### Ziel-Datei: `studio/visual/handles/base-handle-manager.ts`

```ts
export abstract class BaseHandleManager<TLayout, TDragState> {
  protected handles: HTMLElement[] = []
  protected activeDrag: TDragState | null = null
  protected overlayManager: OverlayManager
  protected snap: SnapEngine          // aus Q2

  // Abstract — von Subklasse zu liefern:
  protected abstract createHandle(layout: TLayout, side: HandleSide): HTMLElement
  protected abstract onDragMove(delta: Vec2, snap: SnapResult): void
  protected abstract emitChange(): void

  // Konkret — geteilt:
  show(nodeId: string): void { … }       // gleicher Workflow für alle 4
  hide(): void { … }
  dispose(): void { … }
  protected dragStart(e: MouseEvent, side: HandleSide): void { … }
  protected dragMove(e: MouseEvent): void { … }
  protected dragEnd(e: MouseEvent): void { … }
  protected createHandleDom(opts: HandleDomOptions): HTMLElement { … }
}
```

### Schritte

1. **Baseline + diff-Schutz** (5 min)

   ```bash
   git rev-parse HEAD > /tmp/q3-baseline.txt
   npx vitest run tests/studio/visual > /tmp/q3-baseline.txt
   ```

2. **Base Class anlegen** — leer, nur Signatur (30 min)
   - `studio/visual/handles/base-handle-manager.ts` mit der Struktur oben
   - Keine Implementierung außer `dispose()` (trivial). Subklassen übernehmen alles via `super`.

3. **PaddingManager als erste Subklasse migrieren** (90 min)
   - Wähle den kleinsten der vier (`padding-manager.ts`) als Pilot.
   - Refactor: `class PaddingManager extends BaseHandleManager` — alle geteilten Methoden in den `super` schieben.
   - **Tests laufen lassen nach jedem Move einer Methode in den Base-Class.**
   - Wenn alles grün → Pattern ist tragfähig, ab in die nächsten.

4. **MarginManager + GapManager migrieren** (je 60 min)
   - Gleiches Muster wie PaddingManager.
   - Tests jeweils danach laufen.

5. **ResizeManager migrieren** (90 min)
   - Komplexester der vier (Multi-Select, Grid-Cell-Resize). Hier ist die Versuchung am höchsten, _etwas mehr_ zu refactorn — **widerstehen**. Nur das geteilte Skelett ziehen, Resize-spezifische Logik in der Subklasse lassen.

6. **Boilerplate aus den vier Subklassen entfernen** (30 min)
   - Jetzt erst — wenn alle 4 erfolgreich extended haben — duplizierte Methoden in den Subklassen löschen.

7. **Build + Tests + Commit** (15 min)
   ```
   refactor(visual): extract BaseHandleManager template, dedup ~250 LOC
   ```

### Rollback

```bash
git reset --hard $(cat /tmp/q3-baseline.txt)
```

---

## Q4 — Grid-Cell Snap Consolidation

**Ziel**: `grid-overlay/grid-snap.ts` (114 LOC) als `snapToGridCell()`-Methode
in `SnapEngine` aus Q2 mergen.
**Gewinn**: ~100 LOC + grid-resize geht über die einheitliche Snap-API.
**Aufwand**: ~4 Stunden.

> **Voraussetzung**: Q2 ist fertig. Falls Q2 übersprungen wurde, Q4 entfällt.

### Schritte

1. `snapToGridCell(pointer, geometry)` ist seit Q2 schon Teil von SnapEngine.
   Falls Q2 sie nur als Stub eingebaut hat: jetzt vollständig implementieren
   (Code aus `grid-overlay/grid-snap.ts` reinkopieren).

2. `grid-resize.ts` migrieren — alle Aufrufe von `pointerToCell(…)` durch
   `snapEngine.snapToGridCell(…)` ersetzen.

3. `grid-overlay/grid-snap.ts` löschen.

4. Tests laufen, Build laufen, commiten:
   ```
   refactor(visual): merge grid-cell snap into unified SnapEngine (-100 LOC)
   ```

---

## Gesamt-Bilanz nach Sprint

| Phase                       | Status              | LOC-Δ      |
| --------------------------- | ------------------- | ---------- |
| Q1 — margin-handles/ delete | ✓ done (`bfa93bd3`) | −546       |
| Q2 — unify snap engines     | offen               | −500       |
| Q3 — base handle-manager    | offen               | −250       |
| Q4 — grid-cell snap merge   | offen               | −100       |
| **Total**                   |                     | **~−1400** |

Realistische Erwartung: **~1400 LOC entfernt** (nicht 5–10k wie initial geschätzt — die echte Duplikation ist kleiner als gedacht). Kein "halbes Repository wegputzen", aber ein klares Aufräumen einer historisch gewachsenen Schicht.

## Was nicht in den Sprint gehört

- **`smart-guides/guide-calculator.ts` löschen** — wird von DrawManager genutzt, hat eigene Domain (Alignment-Guides während Draw), sollte stehen bleiben.
- **`overlay-manager.ts` umbauen** — funktioniert, ist zentral, wird von allen Q3-Managern geteilt. Kein Refactor-Bedarf.
- **`coordinate.ts` ändern** — `snapToGrid()` dort ist trivial (4 Zeilen), löschen würde ggf. andere Caller brechen. Lass stehen.
