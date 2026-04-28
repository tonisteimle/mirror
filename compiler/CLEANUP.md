# Compiler Cleanup-Plan

**Methodik:** inkrementell, leaves first, mehrere Pässe OK. Kein großer Wurf — jedes Stück mit klarer Definition-of-Done. Boy-Scout-Rule ab Tag 1.

**Ziel:** Der Compiler ist so sauber, dass ein neuer Mitleser in einem Tag versteht, was wo passiert.

---

## Definition of Done (gilt für jedes Stück)

Ein refaktoriertes Stück ist fertig, wenn:

- [ ] Tests grün und decken die wichtigen Pfade
- [ ] Schnittstelle nach außen so klein wie möglich (deep, nicht shallow)
- [ ] Du kannst das Modul einem Kollegen in 5 Minuten erklären
- [ ] Keine offensichtliche Doppelung mit anderen Stücken
- [ ] Keine offenen `// TODO`s — entweder gefixt oder bewusst dokumentiert

Sobald erfüllt → weiter. **Polieren ist im nächsten Pass erlaubt**, jetzt nicht.

## Continuous (jeden Commit, ab heute)

- **Boy-Scout-Rule:** Jede Datei, die du anfasst, lässt du sauberer zurück. Toten Import raus, besseren Namen, "Warum"-Kommentar wo nötig.
- **NOTES.md pflegen:** Wenn du beim Vorbeigehen siehst, dass etwas außerhalb des aktuellen Scope unschön ist → kurz in `compiler/NOTES.md` notieren. Nicht direkt fixen, sonst verzettelst du dich.

---

## Phase 0 — Inventur (1–2 Stunden)

**Aufgabe:** Klarheit schaffen, was im Compiler aktiv ist und was tot. **Kein Code geändert**, nur Lesen und Notieren.

- [ ] Alle iCloud-Doubletten (`* 2.ts`, `* 2.md`) im `compiler/` listen
- [ ] `compiler/studio/code-modifier.ts` vs `code-modifier-v2.ts` vs `robust-modifier.ts`: was wird wo importiert? (`grep -r "from.*code-modifier" .`)
- [ ] Drei Token-Parser-Varianten im Parser (`parseTokenWithSuffix*`, `parseLegacyTokenDefinition`): welche werden tatsächlich aufgerufen?
- [ ] Alle 19 Files in `compiler/studio/` mit einer Zeile beschreiben: was macht das Modul, wer ruft es

**Output:** `compiler/INVENTORY.md` — Liste mit Status pro Datei (`aktiv` / `tot` / `unklar`)

**Definition of Done:** Inventur deckt alle Files in `compiler/` ab, jeder Eintrag hat einen Status.

---

## Phase 1 — Mechanische Putze (halber Tag)

**Voraussetzung:** Phase 0 abgeschlossen.

- [ ] Alle bestätigt toten iCloud-Doubletten löschen (Commit pro Sub-Verzeichnis)
- [ ] Tests laufen lassen → alles grün?
- [ ] Bestätigt veraltete Files löschen (z.B. `code-modifier-v2.ts` wenn klar nicht mehr benutzt)
- [ ] `git status` sollte für die "X 2.ts"-Doubletten am Ende sauber sein

**Definition of Done:** keine `* 2.ts`-Files mehr im `compiler/`, alle Tests grün, Inventur entsprechend aktualisiert.

---

## Phase 2 — Validator-Tests schließen (1–2 Tage)

**Warum jetzt:** Validator hat aktuell keine Unit-Tests in `tests/compiler/`. Ohne Tests kein sicheres Refactoring später. Außerdem ist es ein perfekt isoliertes Leaf — gute Übungsfläche.

- [ ] `compiler/validator/` Schnittstelle verstehen — was sind die Public-Funktionen?
- [ ] Test-File pro Public-Funktion anlegen
- [ ] Realistische Eingaben (echte Mirror-Snippets), klare Asserts
- [ ] Ziel: ≥ 80% Coverage für die Validator-Module

**Definition of Done:** `tests/compiler/validator/` existiert mit Tests pro Public-Funktion, alle grün, Coverage ≥ 80% für `compiler/validator/`.

---

## Phase 3 — `compiler/studio/` aufräumen (3–5 Tage, in Stücken)

**Strategie:** eine Datei nach der anderen, nicht alles auf einmal. Reihenfolge: Leaves zuerst.

Pro Datei:

- [ ] Tests prüfen — gibt's welche?
- [ ] Falls keine: erst Tests schreiben (oder explizit notieren "über Browser-Tests abgedeckt", wenn das stimmt)
- [ ] Modul lesen, Definition of Done prüfen
- [ ] Wo nicht erfüllt: gezielt fixen
- [ ] Commit pro Datei
- [ ] Inventory-Eintrag aktualisieren

**Reihenfolge-Vorschlag (nach Phase 0 verfeinerbar):**

1. Klar tote/redundante Files — schon in Phase 1 weg
2. Kleine Helpers (`coordinate-transformer.ts`, `spatial-cache.ts`) — Leaves
3. `line-property-parser.ts`
4. `code-modifier.ts` — zentral, größer, kommt zuletzt in dieser Phase

**Definition of Done für die Phase:** jede verbleibende Datei in `compiler/studio/` hat klaren Zweck, ist getestet (oder bewusst dokumentiert warum nicht), und der Inventory-Eintrag steht auf "sauber".

---

## Phase 4 — IR & Backend Polish (optional, kontinuierlich)

Diese Module sind schon gut. Polish nur wenn du beim Vorbeigehen merkst, dass was hakt.

- `compiler/ir/`: Funktionsnamen schärfen, "Was"-Kommentare durch "Warum" ersetzen
- `compiler/backends/`: bereits sehr modular — vermutlich reicht Boy-Scout-Rule

**Definition of Done:** keine — diese Phase ist Pflege, kein Pflicht-Schritt.

---

## Phase 5 — Parser zerlegen (Wochen, der große Brocken)

**Voraussetzung:** Phasen 0–3 abgeschlossen. Sonst refaktorierst du Abhängigkeiten zweimal.

**Strategie (grob — wird in Sub-Plan verfeinert wenn dran):**

1. Parser komplett lesen, kurze Architektur-Notiz schreiben (`compiler/parser/ARCHITECTURE.md`)
2. Test-Coverage für Parser maximieren **vor** Refactor
3. **Erste Extraktion:** `TokenParser` als eigenes Modul
4. **Zweite Extraktion:** `ZagParser` als eigenes Modul
5. **Dritte Extraktion:** Property-Parsing eigenständig, wenn nötig
6. Pro Extraktion: eigenes Sub-Refactoring mit eigener Definition of Done, eigenem Commit

**Definition of Done für Phase 5:** kein File in `compiler/parser/` länger als ~2000 LOC, jedes Sub-Modul isoliert testbar, klare Verantwortungstrennung.

---

## Was diesem Plan bewusst FEHLT

- **Keine Termine.** Dein Tempo.
- **Keine Stundenschätzungen.** Die sind eh falsch.
- **Keine Erfolgs-Metriken oder Dashboards.** Der Code spricht für sich.
- **Keine Architektur-Großentscheidungen vorab.** Die fallen, wenn die Aufräum-Pässe zeigen, wo's wirklich hakt.

## Wenn du irgendwann Studio (nicht Compiler) angehen willst

Gleiches Vorgehen, neuer Plan. Erst eines fertig, dann das nächste.

---

## Status

| Phase                   | Status            | Letzte Aktion                                                                                                 |
| ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 0 — Inventur            | ✅ fertig         | 2026-04-28 — `compiler/INVENTORY.md` angelegt                                                                 |
| 1 — Mechanische Putze   | ✅ fertig         | 2026-04-28 — 21 Files / 4 Verzeichnisse gelöscht, alle 10920 Tests grün                                       |
| 2 — Validator-Tests     | ✅ fertig         | 2026-04-28 — Coverage 67% → 77% Lines / 83% Funcs; validator/ in vitest.config; broken validate-script gefixt |
| 3 — `compiler/studio/`  | ⬜ offen          | inkl. Klärung selection-manager (verdächtig, aber Bundle-relevant)                                            |
| 4 — IR & Backend Polish | ⬜ kontinuierlich | —                                                                                                             |
| 5 — Parser zerlegen     | ⬜ offen          | —                                                                                                             |
