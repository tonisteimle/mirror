# Kritische Analyse: Mirror DSL

> Stand: April 2026
>
> Bewertung der Erfolgsfaktoren für eine AI-unterstützte Design-DSL.

---

## Erfolgsfaktoren für eine AI-unterstützte Design-DSL

### 1. Lesbarkeit & Verständlichkeit

**Ziel:** Designer ohne Programmierkenntnisse verstehen den Code.

| Kriterium            | Bewertung    | Begründung                                                      |
| -------------------- | ------------ | --------------------------------------------------------------- |
| Kurze Syntax         | ✅ Erfüllt   | `bg #2271C1, pad 12, rad 6` ist prägnant                        |
| Keine Boilerplate    | ✅ Erfüllt   | Kein Import, kein Setup, keine `{}`                             |
| Intuitive Namen      | ✅ Erfüllt   | Volle Wörter (`color`, `radius`) UND Abkürzungen (`col`, `rad`) |
| Konsistente Patterns | ✅ Erfüllt   | `property value` durchgehend                                    |
| Fehlerverständlich   | ⚠️ Teilweise | Error-Codes (E105, W110) nicht selbsterklärend                  |
| Visuelle Hierarchie  | ✅ Erfüllt   | Einrückung zeigt Struktur sofort                                |

**Stärke:** Die Syntax ist tatsächlich lesbar. `Button "Speichern", background blue, color white` liest sich wie natürliche Sprache. Wer Effizienz will, nutzt die Kurzformen: `bg`, `col`, `pad`. Die Einrückung macht die Hierarchie visuell sofort erkennbar – wie bei Python.

**Schwäche:** Error-Codes wie `E105` oder `W110` sind nicht selbsterklärend. Hier wäre eine lesbare Fehlermeldung besser.

---

### 2. AI-Generierbarkeit

**Ziel:** LLMs können zuverlässig korrekten Mirror-Code generieren.

| Kriterium            | Bewertung  | Begründung                                              |
| -------------------- | ---------- | ------------------------------------------------------- |
| Eindeutige Grammatik | ✅ Erfüllt | Schema-basiert, klar definiert                          |
| Wenig Ambiguität     | ✅ Erfüllt | Property-Namen sind eindeutig                           |
| Einrückungssyntax    | ✅ Erfüllt | LLMs sind auf Python trainiert, Einrückung funktioniert |
| Token-effizient      | ✅ Erfüllt | Kompakte Syntax spart Tokens                            |
| Fehlertoleranz       | ✅ Erfüllt | Parser crasht nie (454 Fuzz-Tests)                      |

**Stärke:** Das Schema in `dsl.ts` ist eine Single Source of Truth. AI kann daraus lernen. Die Einrückungssyntax ist LLMs vertraut (Python-Training).

**Schwäche:** Keine wesentlichen – die Syntax ist AI-freundlich.

---

### 3. Expressivität

**Ziel:** Echte UI-Patterns lassen sich ausdrücken.

| Kriterium       | Bewertung    | Begründung                             |
| --------------- | ------------ | -------------------------------------- |
| Layout-System   | ✅ Erfüllt   | Flexbox, Grid, Stacked                 |
| Interaktionen   | ✅ Erfüllt   | States, toggle(), exclusive()          |
| Komponenten     | ✅ Erfüllt   | Definition/Instanz-Pattern             |
| Zag-Integration | ✅ Erfüllt   | Dialog, Tabs, Select, etc.             |
| Datenanbindung  | ⚠️ Teilweise | `each`, `if` vorhanden, aber limitiert |
| Animationen     | ✅ Erfüllt   | 20+ Presets, Transitions               |

**Stärke:** Das Interaktionsmodell (`interaction-model.md`) ist durchdacht. State Machines ohne Boilerplate.

**Schwäche:** Komplexe Logik (Validierung, API-Calls) fehlt. Mirror ist für Prototypen, nicht Production.

---

### 4. Tooling & DX

**Ziel:** Mirror Studio bietet produktive Entwicklungsumgebung.

| Kriterium                 | Bewertung      | Begründung                                     |
| ------------------------- | -------------- | ---------------------------------------------- |
| Live-Preview              | ✅ Erfüllt     | Sofortige Kompilierung                         |
| Autocomplete              | ✅ Erfüllt     | Schema-basierte Completions                    |
| Bidirektionales Editing   | ✅ Erfüllt     | SourceMap, Preview→Code                        |
| Error-Feedback            | ⚠️ Teilweise   | Errors vorhanden, Inline-Squiggles ausbaufähig |
| Drag & Drop               | ✅ Erfüllt     | 44 Tests, ausgereift                           |
| Property Panel            | ✅ Erfüllt     | Visuelle Bearbeitung                           |
| Einrückungs-Unterstützung | ⚠️ Ausbaufähig | Siehe Maßnahmen unten                          |

**Stärke:** Das bidirektionale Editing (Preview ↔ Code) ist ein Differenzierungsmerkmal. Mirror Studio IST die IDE für Designer – keine externe IDE nötig.

**Schwäche:** Einrückungs-Tooling kann verbessert werden (siehe Maßnahmen).

---

### 5. Stabilität & Zuverlässigkeit

**Ziel:** Compiler ist robust, keine Crashes.

| Kriterium         | Bewertung  | Begründung                          |
| ----------------- | ---------- | ----------------------------------- |
| Parser-Robustheit | ✅ Erfüllt | 454 Fuzz-Tests bestanden            |
| Error Recovery    | ✅ Erfüllt | Partial AST bei Fehlern             |
| Test-Abdeckung    | ✅ Erfüllt | 260+ Unit-Tests, 325+ Browser-Tests |
| Edge Cases        | ✅ Erfüllt | 73 systematische Edge-Case-Tests    |
| Validierung       | ✅ Erfüllt | 30+ Error-Codes definiert           |

**Stärke:** Die Stabilisierungsarbeit (`stabilisierung.md`) ist abgeschlossen. Der Compiler crasht nie.

**Schwäche:** Keine bekannt – dieser Bereich ist gut abgedeckt.

---

### 6. Ökosystem & Adoption

**Ziel:** Community, Dokumentation, Beispiele.

| Kriterium      | Bewertung    | Begründung                        |
| -------------- | ------------ | --------------------------------- |
| Tutorial       | ✅ Erfüllt   | 15 Kapitel mit Playgrounds        |
| Beispiele      | ⚠️ Teilweise | Hospital Dashboard, aber wenige   |
| NPM Package    | ✅ Erfüllt   | `packages/mirror-lang/`           |
| Community      | ❌ Fehlt     | Kein Discord, keine GitHub Issues |
| Blog/Marketing | ❌ Fehlt     | Keine öffentliche Präsenz         |

**Stärke:** Die Dokumentation ist umfassend (CLAUDE.md, Tutorial).

**Schwäche:** Mirror ist (noch) nicht öffentlich. Keine Community-Adoption.

---

## Einrückungsbasierte Syntax

### Designentscheidung

Mirror verwendet Einrückung (2 Spaces) zur Strukturierung – wie Python. Dies ist eine bewusste Entscheidung:

| Vorteil                      | Begründung                                         |
| ---------------------------- | -------------------------------------------------- |
| Visuelle = Logische Struktur | Designer SEHEN die Hierarchie sofort               |
| Keine Boilerplate            | Kein `{`, `}`, `;` – weniger visuelles Rauschen    |
| Python-Beweis                | Eine der erfolgreichsten Sprachen nutzt Einrückung |
| Weniger Syntaxfehler         | Vergessene `}` sind unmöglich                      |
| AI-freundlich                | LLMs sind auf Python trainiert                     |

### Trade-offs

| Herausforderung                    | Lösung im Tooling              |
| ---------------------------------- | ------------------------------ |
| Whitespace ist unsichtbar          | Indent Guides im Editor        |
| Copy/Paste kann Einrückung brechen | Smart Paste mit Auto-Korrektur |
| Externe Quellen (Chat, Web)        | Strukturelles Einfügen         |

### Konkrete Maßnahmen für Mirror Studio

**1. Indent Guides**
Vertikale Linien im Editor, die Einrückungsebenen sichtbar machen:

```
Frame gap 12
│ Text "Titel"
│ Frame hor
│ │ Button "A"
│ │ Button "B"
```

**2. Smart Paste**
Beim Einfügen von Code automatisch die Einrückung an den Cursor-Kontext anpassen. Option: "Als Kind des ausgewählten Elements einfügen."

**3. Semicolon-Syntax nutzen**
Für einfache Strukturen existiert bereits die Inline-Syntax:

```mirror
Frame hor; Icon "check"; Text "OK"
```

Keine Einrückung nötig, alles in einer Zeile.

**4. Strukturelles Drag & Drop**
Elemente aus der Palette ziehen fügt sie automatisch korrekt eingerückt ein. Kein manuelles Einrücken nötig.

**5. Effizientes Ein-/Ausrücken**
Keyboard-Shortcuts für schnelles Ändern der Einrückungsebene:

- `Tab` / `Shift+Tab` – Zeile(n) ein-/ausrücken
- `Cmd+]` / `Cmd+[` – Alternative Shortcuts
- Mehrere Zeilen markieren und gemeinsam verschieben

**6. Auto-Format bei Inkonsistenz**
Die bestehende W015-Warnung (inkonsistente Einrückung) kann mit Auto-Fix erweitert werden.

---

## Weitere Schwachstellen

### 1. Fehlende Produktions-Features (Mittel)

Mirror generiert Prototypen-Code. Für Production fehlt:

- TypeScript-Output
- Accessibility-Prüfung
- Responsive Breakpoints (derzeit nur Container Queries)
- API-Anbindung

### 2. Abkürzungen sind optional

~~`boc`, `fs`, `ver-center`, `rad` – nicht intuitiv für Designer.~~

**Korrektur:** Die ausgeschriebenen Wörter sind bereits erlaubt. `background`, `color`, `padding`, `radius`, `font-size` etc. funktionieren alle. Die Abkürzungen (`bg`, `col`, `pad`, `rad`, `fs`) sind nur Aliases für effizienteres Schreiben. Designer können die volle Form verwenden, wenn sie intuitiver ist.

---

## Empfehlungen

### Kurzfristig (< 1 Monat)

1. **Indent Guides im Editor** – Einrückungsebenen visuell sichtbar machen
2. **Smart Paste** – Einrückung automatisch korrigieren beim Einfügen
3. **Bessere Fehlermeldungen** – statt `E105` eine lesbare Erklärung
4. **Mehr Beispiele** – echte UI-Patterns (Dashboard, E-Commerce, Forms)

### Mittelfristig (1-3 Monate)

5. **AI-Optimierte Dokumentation** – Prompt-Templates für LLMs
6. **Export-Optionen** – Figma, React, Vue, HTML
7. **Accessibility Hints** – Warnung wenn `alt` bei Image fehlt

### Langfristig (3-6 Monate)

8. **Öffentlicher Launch** – GitHub, Discord, Marketing
9. **Image-to-Mirror** – wie in `image-to-mirror.md` geplant
10. **Kollaboration** – Multi-User Editing

---

## Fazit

**Mirror ist technisch ausgereift.** Der Compiler ist stabil (454 Fuzz-Tests), das Studio funktional, die Syntax lesbar. Die Kernvision "AI generiert, Designer verfeinert" ist erreichbar.

**Die Einrückungssyntax ist eine Stärke**, nicht eine Schwäche. Sie macht die Hierarchie visuell sofort erkennbar und eliminiert Boilerplate. Die verbleibenden Herausforderungen (Copy/Paste, unsichtbare Spaces) werden durch Tooling in Mirror Studio gelöst.

**Die kritischen Erfolgsfaktoren sind größtenteils erfüllt:**

| Faktor             | Bewertung |
| ------------------ | --------- |
| Lesbarkeit         | 9/10      |
| AI-Generierbarkeit | 9/10      |
| Expressivität      | 8/10      |
| Tooling            | 7/10      |
| Stabilität         | 9/10      |
| Ökosystem          | 4/10      |

**Größtes Risiko:** Mirror existiert nur intern. Ohne öffentliche Adoption, Community-Feedback und reale Nutzer bleibt unklar, ob die Syntax für Designer wirklich intuitiv ist.

**Nächste Priorität:** Indent Guides und Smart Paste in Mirror Studio implementieren.

---

## Changelog

| Datum      | Änderung                                                                                                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-21 | Initiale Analyse erstellt                                                                                                                                                                       |
| 2026-04-21 | Einrückungssyntax als Stärke neu bewertet, konkrete Tooling-Maßnahmen ergänzt, VSCode-Empfehlung entfernt (Mirror Studio ist die IDE), Abkürzungs-Kritik korrigiert (volle Wörter sind erlaubt) |
