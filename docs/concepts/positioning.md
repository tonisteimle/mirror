# Konzept: Positioning — Wer ist Mirror's Customer?

> Status: **ENTSCHIEDEN 2026-05-10** — Mirror ist eine lokale Tauri-
> Anwendung für Designer mit wenig Code-Skills, die Claude Code lokal
> abonniert haben und git lokal nutzen. Tutorial wird stark ausgebaut
> (Owner-Workstream, Engineering schafft die Voraussetzungen).
> Multi-File wird zukünftig als Pricing-Differentiator zwischen
> gratis/bezahlt verwendet.
>
> Die Drei-Produkt-Analyse unten bleibt als historische Begründung
> stehen. Engineering-Investment-Reihenfolge folgt jetzt aus diesem
> Decision-Log.

## Decision-Log (2026-05-10)

| Frage                       | Antwort                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Primary Customer**        | Designer mit wenig Code-Skills, **mit lokal installiertem git + aktivem Claude-Code-Abo**.                    |
| **Distribution**            | Eigene lokale Anwendung (Tauri). Kein Hosting, kein Cloud-Backend.                                            |
| **AI-Workflow**             | Mirror shellt lokal zu `claude` (via `TauriAgent.runAgent`). User bezahlt sein Abo selbst, wir hosten nichts. |
| **File-Storage**            | Files-on-Disk in Git-Repo (Tauri); localStorage nur für Browser-Demo-Pfad.                                    |
| **Tutorial**                | Unglaublich ausgebaut (Owner-Workstream). Engineering schafft Voraussetzungen, produziert keine Videos.       |
| **Multi-File**              | Zukünftig Pricing-Differentiator. Code bleibt vollständig; Entitlement-Gating wenn Pricing-Modell steht.      |
| **AI-DSL/Spec-Bundle (A)**  | Engine, nicht eigenes Produkt. Wird in Studio integriert, kein eigenes CLI-Marketing.                         |
| **Production-Compiler (C)** | Substrate. Backend-Quality + Differential-Tests bleiben, aber kein eigener Pitch.                             |

**Wichtige Klarstellung zum Customer-Profile:** „Designer mit wenig
Code-Skills" heisst nicht „Anfänger der Terminal scheut". Der Customer
hat git installiert und Claude-Code abonniert — beides setzt
technisches Mindest-Comfort voraus. Die „wenig Code-Skills" beziehen
sich auf das **Schreiben von React/CSS/Framework-Code**, nicht auf
Tool-Setup. Das schärft die UX-Prioritäten: keine pseudo-anfänger-
Wizards, sondern direkte Manipulation + AI-Assist über lokales
Tooling.

## Architektur-Konsequenzen aus dem Local-Tool-Modell

Das Local-Tool-Modell (Tauri + lokales git + lokales claude) löst
mehrere zuvor offene Architektur-Fragen automatisch:

- **Kein WASM-Claude / kein Hosted-Backend** — `claude` ist auf dem
  Rechner des Users, Mirror shellt direkt dort hin.
- **Kein eigener Auth-Stack** — User authentifiziert sich gegen
  Anthropic via seines Claude-Code-Abos, Mirror muss keine User-
  Datenbank pflegen.
- **Kein eigenes File-Storage-Backend** — Files leben in einem
  Git-Repo des Users, Mirror ist Editor + Renderer dazu.
- **Spec-Bundle bleibt dasselbe Format** — die `--run`-Variante des
  CLI wird in Studio über Tauri-Process-Spawn als „Generate React/
  Vue/Svelte"-Button verfügbar gemacht (`TauriAgent.runAgent` ist
  schon da, fehlt nur die Studio-Toolbar-Integration).
- **AI-Bridge-Server-Idee entfällt** — war für Browser-Pfad gedacht,
  Tauri löst denselben Use-Case ohne Server.

## Engineering-Investment-Reihenfolge (post-decision)

1. **Tauri-Commit-Wiring** (`tauri-strategy.md` Option A umsetzen)
   — entblockt Distribution. Vier Stub-Functions in
   `studio/storage/project-actions.ts` werden echte Native-Dialog-
   Flows.
2. **Studio-Toolbar-Integration für Spec-Bundle-Export via TauriAgent**
   — Designer klickt „Als React exportieren", Studio shellt zu
   lokalem `claude` mit dem Spec-Bundle als Input. Engine + UX in
   einem.
3. **Demo-Runner-Action-Voraussetzungen** für Tutorial-Vollausbau
   (extractComponent/extractToken/batchReplace, generic picker
   handler, selector versioning).
4. **Studio-Performance-Charakterisierung bei grossen Projekten**
   — wird mit echten Designer-Workflows kritisch.
5. **Code-Signing + Auto-Update-Pipeline** (Owner-Workstream:
   Apple-Cert, Windows-EV-Cert, Update-Server-Hosting für Tauri-
   Updater).

Items mit niedrigerer Priorität nach Decision (waren vorher unklar):

- **WASM-Claude / hosted backend** — entfällt komplett.
- **Browser-only Export-Pfad** — entfällt komplett.
- **AI-Bridge-Server** — entfällt komplett (ggf. archivieren).
- **DSL-Versionierungs-Strict-Policy:** balanciert (Designer toleriert
  kleine Bumps wenn Studio-Migration auto-greift) — nicht strict.
- **Production-Compiler-Editor-Plugins (VSCode etc.):** kein
  Investment.
- **NPM-Marketing als „Production-Compiler":** kein Investment.

---

## Symptom: drei parallele Produkte im selben Repo

Aus dem Code lese ich heute drei unterschiedliche Produkt-Hypothesen,
die simultan gebaut werden:

### Hypothese A — DSL für AI-Code-Generierung

**Zielgruppe:** Frontend-Entwickler. AI generiert Mirror, Mirror →
Spec-Bundle → Claude-Agent → produktionsreifer Framework-Code.

**Code-Indikatoren:**

- `tools/export.ts` (Spec-Bundle CLI mit `--target react|vue|svelte|vanilla`)
- `tools/export/templates/instructions-*.md` (Pipeline-Briefings für den Agent)
- `tools/verify.ts` (Pixel-Diff Verify-Loop)
- `tools/experiments/personas-react-spike/` (validierter Spike)
- `compiler/cli.ts`, `compiler/build-cli.ts`, `compiler/validator/cli.ts`
- 4 Backend-Targets mit Cross-Backend-Differential-Tests
- `--run` Flag der `claude` als CLI startet

**Was diese Hypothese braucht:** stabile DSL (Versions-Contract,
gerade als `DSL_VERSION` eingeführt). Robuste Validator-Errors für
agent-friendly debugging. Backend-Output-Qualität die ohne manuelle
Korrektur deploybar ist. Spec-Bundle-Format-Stabilität.

### Hypothese B — Visual-Studio für Designer

**Zielgruppe:** Designer ohne Framework-Wissen. Studio ist ein
First-Class Tool zum visuellen Bauen + AI-Assist + Direkt-Manipulation.

**Code-Indikatoren:**

- `studio/` mit ~25 Subsystemen, 200+ Test-Files
- `studio/pickers/` (Color, Token, Icon, Animation, Action)
- `studio/visual/` (Drag/Resize/Snap/Smart-Guides/Layout-Inference,
  ~3700 LOC)
- `studio/agent/` (LLM-Edit-Flow + Quality-Checks)
- `studio/file-palette/` (Cmd+P, gerade gebaut)
- Tutorial-Konzept-Dokument plant 35–45 Loop-Videos für vollständige
  Studio-Coverage
- `docs/tutorial/` mit 10 Loop-Videos heute
- Tauri-Desktop-Bridge (siehe `tauri-strategy.md`)

**Was diese Hypothese braucht:** Tutorial-Vollausbau. Native-Desktop-
App (Browser-Tab fühlt sich nicht wie Tool an). Onboarding-Flow für
Designer ohne Code-Erfahrung. Stabile Studio-UI über Versionen
(Tutorial-Selektor-Drift-Risiko). Performance bei grossen Projekten.

### Hypothese C — Production-Compiler für Frontend-Teams

**Zielgruppe:** Bestehende React/Vue/Svelte-Teams, die Mirror als
Generierungs-Schicht zwischen Designer-Output und Production-Code
einsetzen.

**Code-Indikatoren:**

- 4 Backends mit ~100% Pin-Coverage via Differential-Tests
- `mirror-build` CLI für eine-Datei-zum-Hochladen
- `mirror-validate` für CI-Integration (`--json`, `--strict`,
  `--max-warnings`)
- 7349 Compiler-Tests
- Performance-Baseline (gerade gelegt) für Regression-Detection
- Build-Artifacts unter `dist/browser/` als IIFE für `<script>`-Embed

**Was diese Hypothese braucht:** Maturity-Signale (Versions-
Stabilität, Migration-Guides, deprecation-policy). NPM-Package-
Hygiene. Doc-Site mit API-Reference. CI-Beispiele für GitHub
Actions etc. Ökosystem (Editor-Plugins für VSCode, Linter-Configs).

## Wo die Spannung weh tut

Die drei Hypothesen sind nicht inkompatibel — Mirror **kann** technisch
alle drei sein. Aber sie haben unterschiedliche **Investment-
Prioritäten** und unterschiedliche **Erfolgs-Metriken**, was
heute zu konkreten Mismatches führt:

### Mismatch 1: Spec-Bundle setzt Entwickler voraus, ist aber für Designer architektiert

`tools/export.ts --run` startet `claude` als CLI. Designer haben weder
`claude` installiert noch ein Terminal offen. Studio hat einen
Export-Toolbar-Button, der den Bundle-Build im Browser triggert
(via AI-Bridge-Server) — aber das setzt einen lokal laufenden Node-
Server voraus, was wieder Entwickler-Setup ist. **Die Designer-
Brücke fehlt.**

Wenn Mirror primär für (B) Designer wäre, müsste der Export-Flow
Browser-only laufen (z.B. WASM-Claude oder Cloud-API mit eigener
Authentication). Wenn primär für (A) Entwickler, wäre Studio ein
Power-User-Tool, kein Onboarding-Surface.

### Mismatch 2: Tauri-Half-Build (siehe `tauri-strategy.md`)

Wenn (B) primary: Native-App muss fertig (Option A in tauri-strategy).
Wenn (A) oder (C) primary: Tauri kann archiviert werden.
Heute: in der Mitte → tote Menu-Actions.

### Mismatch 3: DSL-Stabilität vs. Feature-Geschwindigkeit

Hypothese (A) **braucht** stabile DSL (Versions-Contract — gerade
eingeführt) damit AI-Trainings-Wissensstand nicht verfällt.

Hypothese (B) **braucht** schnelle DSL-Evolution damit Designer-
Bedürfnisse (z.B. neue Layout-Primitives) zeitnah landen.

Hypothese (C) **braucht** versionierte Migrations-Pfade damit
Production-Teams nicht bei jedem Bump brechen.

Heute: 50+ slice-NN-Refactor-Dokumente in `docs/refactoring/` zeigen
aktive DSL-Evolution. Versions-Contract gerade neu. Migrations-Pfade
existieren nicht. Alle drei Anforderungen sind unterversorgt.

### Mismatch 4: Tutorial-Strategie ist hypothese-unsicher

Tutorial-Konzept-Doku plant 35–45 Loop-Videos für (B). Aber:

- Wenn (A) primary: Tutorials gehören eher in `docs/agent-prompts/`
  (was AI lernen muss) als in Loop-Videos (was Designer sehen).
- Wenn (C) primary: Tutorials sollten Build-Pipelines, CI-
  Integration, NPM-Konsumtion erklären — nicht Drag-Resize.
- Wenn (B) primary: Vollausbau ist richtig, plus Native-App-Onboarding.

Tutorial-Investitionen sind höchster Multiplikator: 5–7 Tage
Produktion, dann 6–12 Monate Wartung. Falsche Hypothese = vergeudete
Wochen.

### Mismatch 5: Multi-File-Project-Ambivalenz

7 von 8 Examples sind Single-File. Multi-File-Code ist substantiell
(`storage/`, `file-tree/`, `file-tabs/`, `file-types/`,
`file-palette/`). Tutorial-Coverage: ein Kapitel.

Wenn (B) primary: Multi-File ist Power-Mode für ernsthafte Projekte,
braucht eigenes Onboarding. Wenn (A) oder (C) primary: Multi-File
ist Pflicht (echte Projekte sind selten Single-File), braucht
First-Class-Status.

Heute: schwankt — die Examples sagen (A)/(C), die UI sagt (B).

## Drei Decisions-Vorlagen

### Vorlage I — „Mirror ist primär für Designer (B)"

Konsequenzen:

- **Tauri-Strategy:** Option A (Commit, native Desktop-App).
- **Tutorial-Vollausbau:** ja, MVP-First per `studio-tutorial.md`,
  3–5 echte Designer-User vor Vollausbau.
- **Spec-Bundle:** Studio-Toolbar-Button wird primary surface,
  CLI-Export bleibt für Power-User. Browser-only Export-Pfad muss
  funktionieren (WASM oder hosted backend).
- **DSL-Stabilität:** balanciert — Designer toleriert kleine
  Bumps wenn Studio die Migration auto-macht.
- **Multi-File:** Power-Mode mit dezidiertem Onboarding-Kapitel.
- **Marketing-Pitch:** „Figma für Code" o.ä.

### Vorlage II — „Mirror ist primär ein DSL für AI-Generierung (A)"

Konsequenzen:

- **Tauri-Strategy:** Option B (Archive). Studio bleibt aber
  Browser-Tool für sekundäre Designer-Nutzung.
- **Tutorial-Vollausbau:** dramatisch reduziert. Stattdessen
  Investitions-Schwerpunkt auf Spec-Bundle-Doku, Agent-Prompts,
  Pipeline-Templates für mehr Targets (Solid? Qwik?).
- **Spec-Bundle:** Hauptprodukt. Studio ist „Code-Reviewer für
  Mirror-AI-Output" (Hypothese b in `studio-tutorial.md` Sekundär-
  Audience).
- **DSL-Stabilität:** zwingend. `DSL_VERSION` Bumping-Policy strikt
  durchgesetzt. Migration-Guides für jedes MAJOR.
- **Multi-File:** Pflicht-Status, wird in Generierungs-Beispielen
  prominent.
- **Marketing-Pitch:** „die einzige DSL die AI versteht und
  Designer lesen können" (heutige README-Vision).

### Vorlage III — „Mirror ist Production-Compiler für Frontend-Teams (C)"

Konsequenzen:

- **Tauri-Strategy:** Option B (Archive).
- **Tutorial-Vollausbau:** umgewidmet zu Developer-Doku-Site,
  GitHub-Pages-Style, mit API-Reference + Integration-Guides.
- **Spec-Bundle:** ein nice-to-have-Helper, kein Hauptprodukt.
- **Studio:** Visual-Editor optional, primary interaction über
  Editor + Validate-CI.
- **DSL-Stabilität:** Pflicht, MIGRATION.md für jeden Bump,
  semantic-release-Style.
- **Editor-Plugins:** VSCode-Extension, JetBrains-Plugin.
- **NPM-Marketing:** Mirror als „productive Tailwind-alternative
  with structural CSS-in-DSL" o.ä.

## Empfehlung des Engineers

Aus der Code-Investitions-Heatmap der letzten Sessions lese ich
**Hypothese B (Designer-Tool) als de-facto Primary**, mit (A) als
strategischer Bet und (C) als Engineering-Substrat. Konkret:

- Studio-Investment ist 60% des Code-Volumens
- Tutorial-Konzept-Vollausbau ist explizit für Designer geschrieben
- Tauri existiert (für Designer-First Distribution)
- File-Palette, Pickers, Smart-Guides → Designer-Workflows

Aber: **Spec-Bundle ist die einzigartige Differentiator** (B-Hypothese
hat starke Konkurrenz: Figma, Webflow, Builder.io, Plasmic). Für
Mirror gegen die etablierten Designer-Tools zu konkurrieren ist ein
schwerer Kampf. Das Spec-Bundle-Pattern (Mirror als Designer-AI-
Lingua-Franca, von dort in beliebige Frameworks) ist eine Position,
die heute noch niemand besetzt.

**Mein Vorschlag wäre eine schwächere Form der Decision:**

Mirror ist primär (A) **DSL für AI-Code-Generierung** — der
Spec-Bundle-Pattern ist die strategische Wette. Studio ist das
**erste Tool das diese DSL editieren kann**, optimiert für den
Workflow „AI generiert, Designer/Developer tweaken". Production-
Compiler-Bedürfnisse (C) sind Beifang, weil ein guter Compiler
sowieso da sein muss.

Das bedeutet konkret:

- Tauri archivieren (B) ist OK
- Tutorial reduziert auf "wie tweake ich AI-generierten Mirror-Code"
- DSL-Stabilität-Policy strikt
- Studio-Investitionen prio nach „verbessert die Tweak-Experience"
- Spec-Bundle ist Hauptprodukt, Toolbar-Button + CLI gleichberechtigt

Aber das ist eine Owner-Entscheidung. Ich kann nur das Symptom
beschreiben, nicht die Wahl treffen.

## Decision-Trigger

Die Wahl blockt nichts akut, aber jede der folgenden Aktivitäten
würde davon profitieren, die Wahl im Hintergrund zu kennen:

1. **Tauri-Strategy-Entscheidung** (`tauri-strategy.md`)
2. **Tutorial-Vollausbau-Start** (5–7 Tage Investment, jede falsche
   Annahme = Re-Aufnahme)
3. **NPM-Package-Marketing** (README-Pitch, README-Tagline)
4. **AI-Bridge-Server** (Browser-Export-Pfad bauen oder nicht)
5. **VSCode-Extension** (für (C) wichtig, für (B) Power-User-only)

**Vorschlag:** Entscheidung bis 2026-06-15 (zeitgleich mit Tauri-
Strategy, dieselben Stakeholder). Ein einseitiges Memo das eine der
drei Vorlagen wählt + die fünf Decision-Trigger entsprechend
einordnet.

## Wichtige Dateien (Symptome im Code)

| Datei                                                   | Zeigt welche Hypothese               |
| ------------------------------------------------------- | ------------------------------------ |
| `tools/export.ts`                                       | A (Spec-Bundle für AI-Generierung)   |
| `tools/export/templates/`                               | A (Pipeline-Templates)               |
| `studio/agent/`                                         | B + A (LLM-Edit + Quality-Checks)    |
| `studio/visual/`                                        | B (Direct-Manipulation für Designer) |
| `studio/pickers/`                                       | B (Visual-Editor Surface)            |
| `studio/file-palette/`                                  | B (Tutorial-Vollausbau-Vorbereitung) |
| `compiler/backends/{dom,react,vue,framework,svelte}.ts` | C (Multi-Target-Compiler)            |
| `tests/differential/`                                   | C (Backend-Equivalence-Pinning)      |
| `docs/concepts/studio-tutorial.md`                      | B (Designer-First Tutorial-Plan)     |
| `docs/concepts/tauri-strategy.md`                       | B-Trigger (Native-App-Decision)      |
| `compiler/schema/dsl-version.ts`                        | A + C (Stability-Contract)           |

Die Tabelle zeigt das Problem klar: keine einzige Code-Investition
adressiert nur eine Hypothese. Das ist das Symptom des Mismatch.
