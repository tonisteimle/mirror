# Multi-File Backend Support Matrix

> Belegt durch `tests/differential/multi-file.test.ts`.

Multi-File-Support liegt **vor** dem Backend: Der Pre-Processor
(`compiler/preprocessor.ts`) konkateniert Dateien in der kanonischen
Reihenfolge `data/` → `tokens/` → `components/` → `layouts/` und übergibt
die kombinierte Quelle an den Parser. Der gewählte Backend bekommt
denselben AST wie eine Single-File-Kompilation. **Multi-File ist deshalb
backend-agnostisch** — was sich pro Backend unterscheidet, ist nur das
Per-Feature-Support der konkret verwendeten Konstrukte (Tokens,
Components).

| Sub-feature                          | DOM | React | Framework | Bemerkung                              |
| ------------------------------------ | --- | ----- | --------- | -------------------------------------- |
| MF1 directory load order             | ✅  | ✅    | ✅        | data → tokens → components → layouts   |
| MF2 cross-file token references      | ✅  | ✅    | ✅        | Tokens in `tokens/`, Verbrauch global  |
| MF3 cross-file component definitions | ✅  | ✅    | ✅        | Components in `components/`, global    |
| MF4 multi-file pro Verzeichnis       | ✅  | ✅    | ✅        | Alphabetische Reihenfolge              |
| MF5 `use`-Statement                  | ✅  | ✅    | ✅        | Rein deklarativ / kosmetisch           |
| MF6 leere Verzeichnisse              | ✅  | ✅    | ✅        | Werden übersprungen                    |
| MF7 nur `layouts/` vorhanden         | ✅  | ✅    | ✅        | Andere Dirs sind optional              |
| MF8 component → token chain          | ✅  | ✅    | ✅        | Komponente in components/ nutzt $token |
