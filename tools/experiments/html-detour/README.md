# Experiment: HTML-Umweg vs. Direkter Mirror-Pfad

**Hypothese:** LLMs generieren _kreativere_ und _besser aussehende_ UIs in HTML+Tailwind als in Mirror-DSL — weil HTML im Trainingscorpus massiv überrepräsentiert ist.

**Folgefrage:** Wenn das stimmt, könnte ein zweistufiger Pfad (Brief → HTML → Mirror) bessere Mirror-Outputs liefern als direkte Generierung (Brief → Mirror).

## Setup

```
Brief
  ├─ Pfad A (direkt):  Brief ──────────────► Mirror
  └─ Pfad B (Umweg):   Brief ──► HTML ────► Mirror
```

- **3 Briefs** verschiedener UI-Typen (Pricing, Mobile-Login, Activity-Feed)
- **2 Samples pro Pfad pro Brief** (für Diversitätssignal)
- **= 12 finale Mirror-Outputs** + 6 HTML-Zwischenstufen
- **Identische DSL-Referenz** für Pfad A und Pfad B Schritt 2 (sonst Prompt-Bias)
- **Isolierte Agents** pro Generierung (keine Cross-Kontamination)

## Verzeichnisstruktur

```
html-detour/
├── briefs.md                          # Die 3 Briefs
├── mirror-dsl-reference.md            # Geteilte DSL-Referenz (Pfad A + B-Schritt-2)
├── prompts/
│   ├── path-a-direct-mirror.md        # Pfad A System-Prompt
│   ├── path-b-step1-html.md           # Pfad B Schritt 1 (HTML)
│   └── path-b-step2-translate.md      # Pfad B Schritt 2 (HTML → Mirror)
├── outputs/
│   ├── brief-1/
│   │   ├── path-a-sample-1.mir
│   │   ├── path-a-sample-2.mir
│   │   ├── path-b-html-sample-1.html
│   │   ├── path-b-html-sample-2.html
│   │   ├── path-b-mirror-sample-1.mir
│   │   └── path-b-mirror-sample-2.mir
│   ├── brief-2/  (gleiche Struktur)
│   └── brief-3/  (gleiche Struktur)
└── analysis/
    └── report.md                      # Auswertung
```

## Metriken

**Automatisch (objektiv):**

- Compile-Rate (kompiliert ohne Fehler?)
- LOC pro Output
- Token-Nutzungsrate (`$tokenname`-References pro Output)
- Component-Definitionen + Wiederverwendung
- Property-Repetition-Density (Indikator für Idiomatik)

**Subjektiv (durch Code-Inspektion):**

- Brief-Treue (matcht das UI den Auftrag?)
- Visuelle Polish (aus Code lesbar)
- Idiomatik (nutzt Mirror's Vokabular oder ist es decompilierter HTML-Soup?)
- Within-Path-Diversität (variieren die 2 Samples derselben Bedingung?)

## Was wir _nicht_ messen (für jetzt)

- Pixel-Diff Rendering — würde echtes Rendering benötigen, später
- Editability — würde Designer-Studie benötigen, später
- Statistische Signifikanz — N=2 pro Zelle, das ist ein **Pilot**
