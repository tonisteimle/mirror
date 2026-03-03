"""
Mirror Component Generator Prototype

Generiert Mirror-Code durch spezialisierte Prompts,
die jeweils nur einen Aspekt der Syntax kennen.
"""

import asyncio
import aiohttp
import os
import json
from dataclasses import dataclass
from typing import Optional

# =============================================================================
# PROMPTS - Jeder Prompt ist spezialisiert auf einen Aspekt der Mirror-Syntax
# =============================================================================

STRUCTURE_PROMPT = """Du bist ein Experte für Komponenten-Hierarchien.
Deine EINZIGE Aufgabe: Erstelle die Verschachtelungsstruktur von UI-Komponenten.

REGELN:
1. Komponenten-Definitionen enden mit Doppelpunkt (:)
2. Kinder werden mit 2 Spaces eingerückt
3. KEINE Properties wie pad, bg, col, gap - NUR Struktur
4. KEINE Events wie onclick - NUR Struktur
5. Verwende EXAKT die vorgegebenen Komponenten-Namen

SYNTAX:
```
ParentComponent:
  ChildComponent:
    GrandChild:
  AnotherChild:
```

BEISPIEL für eine Card:
```
Card:
  Header:
    Title:
    CloseButton:
  Content:
  Footer:
```

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""

LAYOUT_PROMPT = """Du bist ein Experte für Layout in Mirror.
Deine EINZIGE Aufgabe: Definiere die Anordnung von Komponenten.

ERLAUBTE PROPERTIES (NUR diese verwenden):
- hor          → Horizontale Anordnung (Kinder nebeneinander)
- ver          → Vertikale Anordnung (Kinder untereinander) - ist Default
- gap N        → Abstand zwischen Kindern in Pixel (z.B. gap 8)
- center       → Zentriert auf beiden Achsen
- spread       → Kinder mit Space-between verteilen
- wrap         → Erlaubt Umbruch bei Platzmangel
- left/right   → Horizontal ausrichten
- top/bottom   → Vertikal ausrichten

SYNTAX:
```
ComponentName: layout-properties
```

BEISPIEL:
```
Header: hor, spread
NavItems: hor, gap 8
Sidebar: ver, gap 16, top
```

REGELN:
1. Eine Zeile pro Komponente
2. NUR Layout-Properties, KEINE Farben/Abstände/Events
3. Verwende EXAKT die vorgegebenen Komponenten-Namen
4. Nicht jede Komponente braucht Layout (nur wenn nötig)

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""

STYLING_PROMPT = """Du bist ein Experte für visuelles Styling in Mirror.
Deine EINZIGE Aufgabe: Definiere Farben, Abstände und visuelle Eigenschaften.

ERLAUBTE PROPERTIES (NUR diese verwenden):
- bg #HEX      → Hintergrundfarbe (z.B. bg #1A1A23)
- col #HEX     → Textfarbe (z.B. col #E4E4E7)
- pad N        → Padding in Pixel (z.B. pad 12)
- pad N M      → Padding vertikal horizontal (z.B. pad 8 16)
- rad N        → Border-Radius in Pixel (z.B. rad 6)
- bor N #HEX   → Border mit Breite und Farbe (z.B. bor 1 #333)
- shadow sm/md/lg → Schatten
- font-size N  → Schriftgröße in Pixel
- opacity N    → Transparenz 0-1

DUNKLES THEME FARBEN:
- Hintergründe: #09090B (dunkelst), #18181B, #1A1A23, #27272A
- Borders: #333, #3F3F46
- Text primär: #E4E4E7, #F4F4F5
- Text sekundär: #A1A1AA, #71717A
- Akzent: #3B82F6 (Blau), #2563EB (Blau hover)

SYNTAX:
```
ComponentName: style-properties
```

BEISPIEL:
```
Card: bg #1A1A23, rad 8, bor 1 #333
Title: col #F4F4F5, font-size 14
Button: bg #3B82F6, col white, pad 8 16, rad 6
```

REGELN:
1. Eine Zeile pro Komponente
2. NUR Style-Properties, KEINE Layout (hor/ver/gap) oder Events
3. Verwende EXAKT die vorgegebenen Komponenten-Namen

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""

STATES_PROMPT = """Du bist ein Experte für Zustände (States) in Mirror.
Deine EINZIGE Aufgabe: Definiere wie Komponenten in verschiedenen Zuständen aussehen.

ERLAUBTE STATES:
- hover        → Maus über Element
- focus        → Element hat Fokus
- active       → Element ist gedrückt
- disabled     → Element ist deaktiviert
- highlighted  → Element ist hervorgehoben (z.B. Keyboard-Navigation)
- selected     → Element ist ausgewählt
- hidden       → Element ist versteckt (für Popups/Menus)

SYNTAX (Inline für einfache States):
```
ComponentName: state statename property value
```

SYNTAX (Block für mehrere Properties):
```
ComponentName:
  state hover bg #333
  state selected bg #3B82F6, col white
```

SYNTAX (Initial versteckt):
```
Menu: hidden
```

BEISPIEL:
```
Menu: hidden

ListItem:
  state hover bg #333
  state highlighted bg #333, bor 1 #3B82F6
  state selected bg #2563EB, col white
```

REGELN:
1. NUR State-bezogene Definitionen
2. KEINE Events (onclick etc.)
3. KEINE Basis-Styles (die kommen vom Styling-Prompt)
4. Verwende EXAKT die vorgegebenen Komponenten-Namen
5. Popups/Menus/Dropdowns starten typischerweise als "hidden"

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""

EVENTS_PROMPT = """Du bist ein Experte für Interaktionen in Mirror.
Deine EINZIGE Aufgabe: Definiere Event-Handler und Aktionen.

ERLAUBTE EVENTS:
- onclick           → Klick auf Element
- onhover           → Maus über Element
- onclick-outside   → Klick außerhalb des Elements
- onkeydown KEY:    → Tastendruck (escape, enter, arrow-down, arrow-up)

ERLAUBTE ACTIONS:
- toggle Target     → Sichtbarkeit umschalten
- show Target       → Element anzeigen
- hide Target       → Element verstecken
- close             → Schließt sich selbst (für Popups)
- select            → Wählt sich selbst aus
- highlight next    → Hebt nächstes Element hervor
- highlight prev    → Hebt vorheriges Element hervor
- select highlighted → Wählt das hervorgehobene Element

SYNTAX (einfach):
```
ComponentName:
  onclick action Target
```

SYNTAX (Keyboard-Block für mehrere Tasten):
```
ComponentName:
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted
```

BEISPIEL für Dropdown:
```
Trigger:
  onclick toggle Menu

Menu:
  onclick-outside close
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

Item:
  onclick select, close Menu
  onhover highlight
```

REGELN:
1. NUR Events und Actions
2. KEINE Styles oder Layout
3. Verwende EXAKT die vorgegebenen Komponenten-Namen
4. "close" ohne Target schließt das Element selbst
5. Bei Items in Listen: onclick select (wählt sich selbst)

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""


# =============================================================================
# API Client
# =============================================================================

@dataclass
class LLMConfig:
    api_key: str
    model: str = "anthropic/claude-3.5-haiku"  # Schnell und günstig für Prototyping
    base_url: str = "https://openrouter.ai/api/v1"


async def call_llm(
    config: LLMConfig,
    system_prompt: str,
    user_prompt: str,
    session: aiohttp.ClientSession
) -> str:
    """Ruft das LLM über OpenRouter auf."""

    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mirror-dsl.dev",
        "X-Title": "Mirror Generator Prototype"
    }

    payload = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,  # Niedrig für konsistente Syntax
        "max_tokens": 1000
    }

    async with session.post(
        f"{config.base_url}/chat/completions",
        headers=headers,
        json=payload
    ) as response:
        if response.status != 200:
            error = await response.text()
            raise Exception(f"API Error {response.status}: {error}")

        data = await response.json()
        return data["choices"][0]["message"]["content"]


# =============================================================================
# Generator
# =============================================================================

def build_user_prompt(component_spec: str, design_spec: str) -> dict[str, str]:
    """Erstellt die User-Prompts für jede Phase."""

    base = f"""KOMPONENTEN:
{component_spec}

DESIGN:
{design_spec}
"""

    return {
        "structure": f"{base}\nErstelle die Komponenten-Hierarchie.",
        "layout": f"{base}\nDefiniere das Layout für jede Komponente.",
        "styling": f"{base}\nDefiniere das visuelle Styling.",
        "states": f"{base}\nDefiniere die Zustände (States).",
        "events": f"{base}\nDefiniere die Interaktionen (Events)."
    }


async def generate_component(
    config: LLMConfig,
    component_spec: str,
    design_spec: str
) -> dict[str, str]:
    """Generiert alle 5 Aspekte parallel."""

    prompts = {
        "structure": STRUCTURE_PROMPT,
        "layout": LAYOUT_PROMPT,
        "styling": STYLING_PROMPT,
        "states": STATES_PROMPT,
        "events": EVENTS_PROMPT
    }

    user_prompts = build_user_prompt(component_spec, design_spec)
    results = {}

    async with aiohttp.ClientSession() as session:
        tasks = []
        for phase, system_prompt in prompts.items():
            task = call_llm(config, system_prompt, user_prompts[phase], session)
            tasks.append((phase, task))

        # Alle parallel ausführen
        for phase, task in tasks:
            try:
                results[phase] = await task
            except Exception as e:
                results[phase] = f"// ERROR: {e}"

    return results


def merge_results(results: dict[str, str]) -> str:
    """Fügt alle Ergebnisse zu validem Mirror-Code zusammen."""

    sections = []
    order = ["structure", "layout", "styling", "states", "events"]

    for phase in order:
        if phase in results:
            content = results[phase].strip()
            # Entferne eventuelle Markdown-Code-Blöcke
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

            sections.append(f"// {phase.upper()}")
            sections.append(content)
            sections.append("")

    return "\n".join(sections)


# =============================================================================
# Main
# =============================================================================

async def main():
    # API Key aus .env.local laden
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    api_key = None

    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("VITE_OPENROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break

    if not api_key or api_key == "your-api-key-here":
        print("ERROR: Kein API Key gefunden in .env.local")
        print("Setze VITE_OPENROUTER_API_KEY in .env.local")
        return

    config = LLMConfig(api_key=api_key)

    # Test: Dropdown generieren
    component_spec = """- Dropdown (äußerer Container)
- Trigger (klickbarer Button mit Label und Icon)
- Label (Text im Trigger)
- ChevronIcon (Pfeil-Icon im Trigger)
- Menu (Popup mit den Optionen)
- Item (einzelne Option im Menu)"""

    design_spec = """Dunkles Theme mit:
- Dunkle Hintergründe (#1A1A23)
- Subtile Borders (#333)
- Helle Texte (#E4E4E7)
- Blaue Akzentfarbe für Selection (#2563EB)
- Abgerundete Ecken
- Shadow auf dem Menu"""

    print("Generiere Dropdown mit 5 parallelen Prompts...\n")
    print("=" * 60)

    results = await generate_component(config, component_spec, design_spec)

    # Einzelne Ergebnisse anzeigen
    for phase, content in results.items():
        print(f"\n### {phase.upper()} ###")
        print(content)

    print("\n" + "=" * 60)
    print("\n### MERGED OUTPUT ###\n")

    merged = merge_results(results)
    print(merged)

    # In Datei speichern
    output_path = os.path.join(os.path.dirname(__file__), "generated-dropdown.mirror")
    with open(output_path, "w") as f:
        f.write(merged)

    print(f"\nGespeichert in: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
