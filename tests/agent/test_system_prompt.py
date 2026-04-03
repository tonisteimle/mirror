#!/usr/bin/env python3
"""
Test System Prompt mit Claude Code CLI

Testet ob Claude mit dem Mirror DSL System Prompt korrekte Ausgaben generiert.
Generiert eine HTML-Seite mit interaktiven Playgrounds zur visuellen Prüfung.
"""

import subprocess
import sys
import json
import html
import re
from pathlib import Path
from datetime import datetime

# Pfade
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_DIR = PROJECT_ROOT / "docs" / "tests"
OUTPUT_HTML = OUTPUT_DIR / "ai-tests.html"
RESULTS_JSON = SCRIPT_DIR / "test-results.json"

# System Prompt (aus studio/agent/prompts/system.ts)
SYSTEM_PROMPT = """# Mirror DSL

Du schreibst UI-Code in Mirror DSL. Diese Referenz ist die einzige Wahrheit.

## Grundsyntax

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

- Element-Name, optionaler Text in `"..."`, Properties mit Komma getrennt
- Zahlen sind Pixel, keine Einheiten (NICHT `100px`, sondern `100`)
- Farben als `#hex` oder Farbname (`white`, `red`)

## Hierarchie durch Einrückung

Kinder werden mit **2 Leerzeichen** eingerückt:

```mirror
Frame bg #1a1a1a, pad 20, rad 12, gap 16
  Text "Titel", col white, fs 18, weight bold
  Text "Beschreibung", col #888, fs 14
  Frame hor, gap 8
    Button "Abbrechen", pad 10 20, rad 6, bg #333, col white
    Button "OK", pad 10 20, rad 6, bg #2563eb, col white
```

## Primitives

| Primitive | Beschreibung |
|-----------|--------------|
| `Frame` | Container (NICHT Box oder Div!) |
| `Text` | Textinhalt |
| `Button` | Klickbarer Button |
| `Input` | Einzeiliges Eingabefeld |
| `Icon` | Icon (Lucide) |

## Layout-Properties

- `hor` = horizontal, `ver` = vertikal (Standard)
- `gap` = Abstand zwischen Kindern
- `center` = Kinder zentrieren
- `spread` = Kinder an Rändern verteilen

## Styling-Properties

- `bg` = Hintergrundfarbe
- `col` = Textfarbe
- `pad` = Innenabstand
- `rad` = Eckenradius
- `fs` = Schriftgröße

## Icons

```mirror
Icon "check", ic #10b981, is 24
```
- `ic` = icon color (Farbe)
- `is` = icon size (Größe)

## Komponenten-Definition

**Mit `:` definierst du, ohne `:` verwendest du.**

```mirror
// Definition
PrimaryBtn: = Button bg #2563eb, col white, pad 12 24, rad 6

// Verwendung (OHNE :)
PrimaryBtn "Speichern"
```

## Komponente mit Slots

```mirror
// Definition
Card: bg #1a1a1a, rad 12, pad 16, gap 12
  Header: fs 18, weight bold, col white
  Body: col #888, fs 14

// Verwendung (Slots OHNE :)
Card
  Header "Titel"
  Body "Text"
```

## Tokens

**Definition MIT Suffix, Verwendung OHNE Suffix.**

```mirror
$primary.bg: #2563eb
$card.bg: #1a1a1a

// Verwendung
Button bg $primary
Frame bg $card
```

## States

```mirror
Btn: pad 12 24, bg #333, col white, cursor pointer
  hover:
    bg #444
  on:
    bg #2563eb
  onclick: toggle()

Btn "Normal"
Btn "Aktiv", on
```

## HÄUFIGE FEHLER

- FALSCH: `Text "Hello" col white` → RICHTIG: `Text "Hello", col white` (Komma!)
- FALSCH: `Frame w 100px` → RICHTIG: `Frame w 100` (keine Einheiten!)
- FALSCH: `Box pad 16` → RICHTIG: `Frame pad 16` (Frame, nicht Box!)
- FALSCH: `$primary: #hex` → RICHTIG: `$primary.bg: #hex` (Suffix bei Definition!)
- FALSCH: `bg $primary.bg` → RICHTIG: `bg $primary` (kein Suffix bei Verwendung!)
- FALSCH: `onclick: toggle` → RICHTIG: `onclick: toggle()` (Klammern!)
- FALSCH: `Icon check` → RICHTIG: `Icon "check"` (Anführungszeichen!)
- FALSCH: `NavItem: = Button` mit `Icon: is 18` → = Primitive und Slots mischen geht NICHT!
  Entweder `= Primitive` mit normalen Kindern, oder Slots ohne `=`.

## Response

Gib NUR Mirror-Code zurück, keine Erklärungen."""


# Test-Prompts
TEST_PROMPTS = [
    {
        "id": "sidebar-nav",
        "name": "Sidebar-Navigation",
        "prompt": "Baue mir eine Seiten-Navigation bestehend aus Gruppen und Navigationseinträgen mit Icons und Text als Liste"
    },
    {
        "id": "login-form",
        "name": "Login-Formular",
        "prompt": "Erstelle ein dunkles Login-Formular mit E-Mail und Passwort Feldern, einem Anmelden Button und einem Passwort vergessen Link"
    },
    {
        "id": "interactive-cards",
        "name": "Interaktive Cards",
        "prompt": "Erstelle drei Projekt-Cards die man anklicken kann. Die angeklickte Card soll hervorgehoben sein (exclusive). Jede Card hat Titel und Beschreibung."
    },
    {
        "id": "dashboard-stats",
        "name": "Dashboard Stats",
        "prompt": "Erstelle eine Zeile mit 4 Statistik-Cards für ein Dashboard. Jede Card hat ein Icon, einen Wert und ein Label."
    },
    {
        "id": "user-profile",
        "name": "User Profile Card",
        "prompt": "Erstelle eine User-Profile-Card mit Avatar, Name, Rolle, Bio und Social-Links als Icons"
    }
]


def run_claude(prompt: str) -> str:
    """Ruft Claude Code CLI auf mit System Prompt und User Prompt."""
    full_prompt = f"{SYSTEM_PROMPT}\n\n---\n\nUser-Anfrage: {prompt}"

    try:
        result = subprocess.run(
            ["claude", "--print", "-p", full_prompt],
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        return "// TIMEOUT: Claude hat nicht rechtzeitig geantwortet"
    except FileNotFoundError:
        return "// ERROR: Claude CLI nicht gefunden"


def extract_mirror_code(output: str) -> str:
    """Extrahiert Mirror-Code aus der Claude-Antwort."""
    # Versuche Code aus ```mirror Block zu extrahieren
    match = re.search(r'```mirror\n(.*?)```', output, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Versuche Code aus ``` Block zu extrahieren
    match = re.search(r'```\n(.*?)```', output, re.DOTALL)
    if match:
        return match.group(1).strip()

    # Sonst nimm alles was wie Mirror aussieht
    lines = output.strip().split('\n')
    code_lines = []
    in_code = False

    for line in lines:
        # Start wenn Zeile mit Element beginnt
        if re.match(r'^[A-Z][a-zA-Z]*[\s:]', line) or re.match(r'^\$', line) or re.match(r'^//', line):
            in_code = True
        if in_code:
            code_lines.append(line)

    return '\n'.join(code_lines).strip() if code_lines else output.strip()


def check_output(output: str) -> dict:
    """Prüft die Ausgabe auf häufige Fehler."""
    errors = []
    warnings = []

    # Kritische Fehler
    # Nur echte Box-Elemente finden, nicht Slot-Namen wie "IconBox"
    if re.search(r'^Box\s', output, re.MULTILINE) or re.search(r'^\s+Box\s', output, re.MULTILINE):
        errors.append("Verwendet 'Box' statt 'Frame'")

    if re.search(r'\d+px', output) or re.search(r'\d+em\b', output):
        errors.append("Verwendet Einheiten (px/em)")

    if "onclick: toggle\n" in output or "onclick: toggle " in output:
        if "onclick: toggle()" not in output:
            errors.append("toggle ohne Klammern")

    if "onclick: exclusive\n" in output or "onclick: exclusive " in output:
        if "onclick: exclusive()" not in output:
            errors.append("exclusive ohne Klammern")

    # Antipattern: = Primitive mit Slots mischen
    # Finde Komponenten mit = Primitive und prüfe ob Kinder Slots definieren
    system_states = {'hover', 'focus', 'active', 'disabled', 'on', 'open', 'closed',
                     'loading', 'error', 'selected', 'checked', 'expanded', 'collapsed'}

    lines = output.split('\n')
    in_primitive_component = False
    primitive_indent = 0

    for i, line in enumerate(lines):
        # Finde Komponenten-Definition mit = Primitive
        match = re.match(r'^(\w+):\s*=\s*(Button|Frame|Text|Input|Icon)', line)
        if match:
            in_primitive_component = True
            primitive_indent = 0
            continue

        if in_primitive_component:
            # Berechne aktuelle Einrückung
            stripped = line.lstrip()
            if not stripped or stripped.startswith('//'):
                continue

            current_indent = len(line) - len(stripped)

            # Wenn wir zurück auf gleiche oder niedrigere Ebene kommen, Ende
            if current_indent <= primitive_indent and stripped and not stripped.startswith('//'):
                # Prüfe ob neue Komponenten-Definition
                if re.match(r'^\w+:', stripped):
                    in_primitive_component = False
                    # Check if this is a new = Primitive
                    match = re.match(r'^(\w+):\s*=\s*(Button|Frame|Text|Input|Icon)', line)
                    if match:
                        in_primitive_component = True
                        primitive_indent = 0
                    continue

            # Prüfe auf Slot-Definition (Name: properties) die KEIN State ist
            slot_match = re.match(r'^(\s*)([A-Z]\w*):\s*(.*)$', line)
            if slot_match:
                slot_name = slot_match.group(2).lower()
                # Wenn es kein System-State ist und mit Großbuchstabe beginnt = Slot!
                if slot_name not in system_states:
                    errors.append(f"Antipattern: '= Primitive' mit Slot '{slot_match.group(2)}:' gemischt")
                    in_primitive_component = False
                    break

    # Warnungen
    if "Icon " in output and re.search(r'Icon\s+[a-z]', output):
        warnings.append("Icon möglicherweise ohne Anführungszeichen")

    return {
        "errors": errors,
        "warnings": warnings,
        "passed": len(errors) == 0
    }


def run_tests(test_ids: list = None) -> list:
    """Führt Tests aus und gibt Ergebnisse zurück."""
    results = []

    tests = TEST_PROMPTS
    if test_ids:
        tests = [t for t in TEST_PROMPTS if t['id'] in test_ids]

    for test in tests:
        print(f"Running: {test['name']}...")

        raw_output = run_claude(test['prompt'])
        code = extract_mirror_code(raw_output)
        check = check_output(code)

        result = {
            "id": test['id'],
            "name": test['name'],
            "prompt": test['prompt'],
            "code": code,
            "raw_output": raw_output,
            "errors": check['errors'],
            "warnings": check['warnings'],
            "passed": check['passed'],
            "timestamp": datetime.now().isoformat()
        }
        results.append(result)

        status = "✅" if check['passed'] else "❌"
        print(f"  {status} {test['name']}")

    return results


def generate_html(results: list) -> str:
    """Generiert HTML-Seite mit Playgrounds."""

    passed = sum(1 for r in results if r['passed'])
    total = len(results)

    test_sections = ""
    for r in results:
        status_class = "passed" if r['passed'] else "failed"
        status_icon = "✅" if r['passed'] else "❌"

        errors_html = ""
        if r['errors']:
            errors_html = f"""
        <div class="errors">
          <strong>Fehler:</strong>
          <ul>{''.join(f'<li>{html.escape(e)}</li>' for e in r['errors'])}</ul>
        </div>"""

        warnings_html = ""
        if r['warnings']:
            warnings_html = f"""
        <div class="warnings">
          <strong>Warnungen:</strong>
          <ul>{''.join(f'<li>{html.escape(w)}</li>' for w in r['warnings'])}</ul>
        </div>"""

        escaped_code = html.escape(r['code'])

        test_sections += f"""
    <section class="test-case {status_class}">
      <h2>{status_icon} {html.escape(r['name'])}</h2>

      <div class="prompt">
        <strong>Prompt:</strong>
        <p>{html.escape(r['prompt'])}</p>
      </div>

      {errors_html}
      {warnings_html}

      <div class="playground" data-playground>
        <div class="playground-code">
          <textarea>{escaped_code}</textarea>
        </div>
        <div class="playground-preview"></div>
      </div>
    </section>
"""

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mirror AI Tests</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/mirror-defaults.css">
  <link rel="stylesheet" href="../tutorial/tutorial.css">
  <style>
    .test-case {{
      margin: 2rem 0;
      padding: 1.5rem;
      border-radius: 12px;
      background: #1a1a1a;
    }}
    .test-case.passed {{
      border-left: 4px solid #10b981;
    }}
    .test-case.failed {{
      border-left: 4px solid #ef4444;
    }}
    .prompt {{
      background: #111;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }}
    .prompt p {{
      margin: 0.5rem 0 0 0;
      color: #888;
      font-style: italic;
    }}
    .errors, .warnings {{
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin: 1rem 0;
    }}
    .errors {{
      background: #ef444422;
      border: 1px solid #ef4444;
    }}
    .warnings {{
      background: #f59e0b22;
      border: 1px solid #f59e0b;
    }}
    .errors ul, .warnings ul {{
      margin: 0.5rem 0 0 1.5rem;
      padding: 0;
    }}
    .summary-box {{
      background: #1a1a1a;
      padding: 1.5rem;
      border-radius: 12px;
      margin: 2rem 0;
      text-align: center;
    }}
    .summary-box .score {{
      font-size: 3rem;
      font-weight: bold;
      color: {('#10b981' if passed == total else '#f59e0b' if passed > 0 else '#ef4444')};
    }}
    .timestamp {{
      color: #666;
      font-size: 0.875rem;
      text-align: center;
      margin-top: 2rem;
    }}
  </style>
</head>
<body>

  <main class="page">

    <header>
      <h1>AI System Prompt Tests</h1>
      <p class="subtitle">Visuelle Prüfung der Claude-generierten Mirror-Ausgaben</p>
    </header>

    <div class="summary-box">
      <div class="score">{passed}/{total}</div>
      <p>Tests bestanden</p>
    </div>

    {test_sections}

    <p class="timestamp">Generiert: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

    <nav>
      <a class="index" href="../tutorial/index.html">← Zurück zum Tutorial</a>
    </nav>

  </main>

  <script src="../../dist/browser/index.global.js"></script>
  <script src="../tutorial/tutorial.js"></script>
</body>
</html>
"""


def main():
    print("=" * 60)
    print("Mirror AI System Prompt Test")
    print("=" * 60)

    # Parse Argumente
    test_ids = None
    generate_only = False

    for arg in sys.argv[1:]:
        if arg == "--generate":
            generate_only = True
        elif arg == "--all":
            test_ids = None
        else:
            test_ids = arg.split(",")

    # Lade vorherige Ergebnisse oder führe Tests aus
    if generate_only and RESULTS_JSON.exists():
        print("Loading previous results...")
        with open(RESULTS_JSON, 'r') as f:
            results = json.load(f)
    else:
        results = run_tests(test_ids)

        # Speichere Ergebnisse
        with open(RESULTS_JSON, 'w') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to: {RESULTS_JSON}")

    # Generiere HTML
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    html_content = generate_html(results)

    with open(OUTPUT_HTML, 'w') as f:
        f.write(html_content)

    print(f"HTML generated: {OUTPUT_HTML}")

    # Zusammenfassung
    passed = sum(1 for r in results if r['passed'])
    print(f"\n{'=' * 60}")
    print(f"Bestanden: {passed}/{len(results)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
