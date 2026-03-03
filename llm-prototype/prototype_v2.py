"""
Mirror LLM Generator - Prototype V2

Neuer Ansatz:
- Rekursiv: Ebene für Ebene, nicht alles auf einmal
- Direkt Mirror Code: Kein JSON-Zwischenschritt
- Einzelaufgaben: Jeder LLM-Call macht EINE Sache
"""

import asyncio
import aiohttp
import json
import os
import re
from dataclasses import dataclass, field
from typing import Optional


# =============================================================================
# CONFIG
# =============================================================================

@dataclass
class LLMConfig:
    api_key: str
    model: str = "anthropic/claude-haiku-4.5"
    base_url: str = "https://openrouter.ai/api/v1"


async def call_llm(
    config: LLMConfig,
    system_prompt: str,
    user_prompt: str,
    session: aiohttp.ClientSession
) -> str:
    """Ruft LLM über OpenRouter auf."""
    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mirror-dsl.dev",
        "X-Title": "Mirror Generator V2"
    }

    payload = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 2000
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


def clean_response(response: str) -> str:
    """Entfernt Markdown Code-Blöcke."""
    return re.sub(r'```\w*\n?', '', response).strip()


# =============================================================================
# COMPONENT LIBRARY - Bekannte Komponenten mit Mirror Code
# =============================================================================

COMPONENTS = {
    "Sidebar": """Sidebar: ver, width 240, height full, bg #18181B, pad 12
  Logo: pad 12 16, font-size 16, weight bold, col #F4F4F5
  NavSection: ver, gap 4
    NavItem: hor, gap 8, pad 8 16, rad 6, col #E4E4E7
      state hover bg #333
      state active bg #2563EB, col white
      NavIcon:
      NavLabel:""",

    "Header": """Header: hor, spread, ver-center, pad 12 16, bg #18181B, bor b 1 #333
  Title: col #F4F4F5, font-size 16, weight bold
  Subtitle: col #A1A1AA, font-size 12
  Actions: hor, gap 8""",

    "StatsCard": """StatsCard: ver, gap 4, bg #1A1A23, pad 16, rad 8
  Label: col #A1A1AA, font-size 12, uppercase
  Value: col #F4F4F5, font-size 24, weight bold
  Trend: hor, gap 4, font-size 12""",

    "Card": """Card: ver, bg #1A1A23, rad 8, bor 1 #333
  CardHeader: hor, spread, ver-center, pad 12 16, bor b 1 #333
    CardTitle: col #F4F4F5, font-size 14, weight 600
  CardContent: pad 16""",

    "Button": """Button: hor, gap 8, ver-center, bg #2563EB, col white, pad 8 16, rad 6
  state hover bg #1D4ED8
  state disabled opacity 0.5
  Icon:
  Label:""",

    "DataTable": """DataTable: ver, bg #1A1A23, rad 8, bor 1 #333
  TableHeader: hor, bg #18181B, pad 8 16
  TableBody: ver
    TableRow: hor, pad 8 16, bor b 1 #333
      state hover bg #333""",

    "Input": """Input: hor, bg #27272A, bor 1 #333, rad 6, pad 8 12
  state focus bor 1 #2563EB
  Placeholder: col #71717A""",

    "Checkbox": """Checkbox: hor, gap 8, ver-center
  Box: size 16, bg #27272A, bor 1 #333, rad 4
    state checked bg #2563EB
  CheckLabel: col #E4E4E7, font-size 14""",
}


# =============================================================================
# SCHRITT 1: Struktur analysieren
# =============================================================================

STRUCTURE_PROMPT = """Du analysierst UI-Anfragen und identifizierst die Hauptbereiche.

Antworte NUR mit einer JSON-Liste der Top-Level Bereiche.
Jeder Bereich hat: name, type (layout|component), beschreibung

BEKANNTE KOMPONENTEN: Sidebar, Header, StatsCard, Card, Button, DataTable, Input, Checkbox

Beispiel:
Input: "Dashboard mit Sidebar und Stats"
Output: [
  {"name": "Sidebar", "type": "component", "beschreibung": "Navigation links"},
  {"name": "MainContent", "type": "layout", "beschreibung": "Hauptbereich mit Stats"}
]

Antworte NUR mit dem JSON Array."""


async def analyze_structure(
    config: LLMConfig,
    request: str,
    session: aiohttp.ClientSession
) -> list[dict]:
    """Schritt 1: Identifiziere Top-Level Struktur."""
    response = await call_llm(
        config,
        STRUCTURE_PROMPT,
        f"Anfrage: {request}",
        session
    )
    return json.loads(clean_response(response))


# =============================================================================
# SCHRITT 2: Bereich expandieren (rekursiv)
# =============================================================================

EXPAND_PROMPT = """Du expandierst einen UI-Bereich in seine Kinder.

BEKANNTE KOMPONENTEN UND IHRE SLOTS:
- Sidebar: Logo, NavItem (mit NavIcon, NavLabel)
- Header: Title, Subtitle, Actions
- StatsCard: Label, Value, Trend
- Card: CardTitle, CardContent
- Button: Icon, Label
- DataTable: TableHeader, TableBody, TableRow
- Input: Placeholder
- Checkbox: CheckLabel

Antworte mit JSON:
{
  "kinder": [
    {"name": "...", "type": "component|layout|slot", "content": "...", "count": 1}
  ],
  "fertig": true/false  // true wenn Blatt-Ebene erreicht
}

WICHTIG:
- "slot" = Slot einer bekannten Komponente (z.B. NavIcon, Label, Title)
- "component" = Bekannte Komponente aus der Liste
- "layout" = Container für Layout (ver, hor, grid)
- "content" = Der Inhalt/Text für Slots
- "count" = Anzahl Instanzen (z.B. 5 NavItems)"""


async def expand_area(
    config: LLMConfig,
    area: dict,
    context: str,
    session: aiohttp.ClientSession
) -> dict:
    """Expandiert einen Bereich in seine Kinder."""
    response = await call_llm(
        config,
        EXPAND_PROMPT,
        f"Bereich: {area['name']} ({area.get('beschreibung', '')})\nKontext: {context}",
        session
    )
    return json.loads(clean_response(response))


# =============================================================================
# SCHRITT 3: Mirror Code generieren (für einen Bereich)
# =============================================================================

GENERATE_PROMPT = """Du generierst Mirror DSL Code für einen UI-Bereich.

MIRROR SYNTAX:
- Komponenten-Definition: "Name: properties"
- Instanz: "Name" oder 'Name "content"'
- Verschachtelt durch Einrückung (2 Spaces)
- Listen mit "- " Prefix
- Slots: "SlotName" oder 'SlotName "content"'

BEISPIEL - Sidebar mit Navigation:
```
Sidebar
  Logo "Acme Inc"
  - NavItem
    NavIcon "home"
    NavLabel "Dashboard"
  - NavItem
    NavIcon "users"
    NavLabel "Users"
```

BEISPIEL - Stats Grid:
```
StatsGrid
  - StatsCard
    Label "Users"
    Value "12,345"
    Trend "+12%"
  - StatsCard
    Label "Revenue"
    Value "$45,678"
```

Generiere NUR den Mirror Code für die Instanzen, KEINE Definitionen."""


async def generate_mirror_code(
    config: LLMConfig,
    area: dict,
    children: list[dict],
    context: str,
    session: aiohttp.ClientSession
) -> str:
    """Generiert Mirror Code für einen Bereich."""

    children_desc = "\n".join([
        f"- {c['name']}: {c.get('content', '')} (count: {c.get('count', 1)})"
        for c in children
    ])

    response = await call_llm(
        config,
        GENERATE_PROMPT,
        f"""Bereich: {area['name']}
Kinder:
{children_desc}

Kontext: {context}

Generiere den Mirror Code:""",
        session
    )
    return clean_response(response)


# =============================================================================
# REKURSIVER GENERATOR
# =============================================================================

class RecursiveGenerator:
    """Generiert Mirror Code rekursiv, Ebene für Ebene."""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.used_components = set()  # Welche Komponenten wurden verwendet?
        self.depth = 0
        self.max_depth = 4  # Sicherheit gegen Endlos-Rekursion

    async def generate(self, request: str, content_hints: str = "") -> str:
        """Haupteinstiegspunkt."""

        async with aiohttp.ClientSession() as session:
            print("=" * 60)
            print("RECURSIVE MIRROR GENERATOR V2")
            print("=" * 60)

            # Schritt 1: Top-Level Struktur
            print("\n[1] Analysiere Struktur...")
            structure = await analyze_structure(self.config, request, session)
            print(f"    Bereiche: {[s['name'] for s in structure]}")

            # Schritt 2: Rekursiv expandieren und Code generieren
            print("\n[2] Generiere Code rekursiv...")

            instance_parts = []
            root_name = structure[0]['name'] if structure else "Page"

            # Wrapping container
            if len(structure) > 1:
                root_name = "Page"
                instance_parts.append(f"{root_name}")

            for area in structure:
                code = await self._process_area(area, request + "\n" + content_hints, session)
                if len(structure) > 1:
                    # Einrücken wenn mehrere Top-Level Bereiche
                    code = self._indent(code, 2)
                instance_parts.append(code)

            # Schritt 3: Definitionen sammeln
            print("\n[3] Sammle Definitionen...")
            definitions = self._collect_definitions()

            # Zusammenfügen
            final_code = f"""// Component Definitions
{definitions}

// Page
{chr(10).join(instance_parts)}"""

            return final_code

    async def _process_area(
        self,
        area: dict,
        context: str,
        session: aiohttp.ClientSession,
        indent: int = 0
    ) -> str:
        """Verarbeitet einen Bereich rekursiv."""

        prefix = "  " * indent
        self.depth += 1

        if self.depth > self.max_depth:
            self.depth -= 1
            return f"{prefix}{area['name']}"

        print(f"{'  ' * indent}  → {area['name']} ({area.get('type', 'unknown')})")

        # Bekannte Komponente?
        if area['name'] in COMPONENTS:
            self.used_components.add(area['name'])

        # Expandieren
        try:
            expanded = await expand_area(self.config, area, context, session)
        except Exception as e:
            print(f"{'  ' * indent}    Fehler beim Expandieren: {e}")
            self.depth -= 1
            return f"{prefix}{area['name']}"

        children = expanded.get('kinder', [])

        if not children or expanded.get('fertig', False):
            # Blatt erreicht
            self.depth -= 1
            content = area.get('content', '')
            if content:
                return f"{prefix}{area['name']} \"{content}\""
            return f"{prefix}{area['name']}"

        # Code für diesen Bereich generieren
        try:
            code = await generate_mirror_code(
                self.config,
                area,
                children,
                context,
                session
            )

            # Track verwendete Komponenten
            for child in children:
                if child['name'] in COMPONENTS:
                    self.used_components.add(child['name'])

            self.depth -= 1
            return code

        except Exception as e:
            print(f"{'  ' * indent}    Fehler beim Generieren: {e}")
            self.depth -= 1
            return f"{prefix}{area['name']}"

    def _indent(self, code: str, spaces: int) -> str:
        """Rückt Code ein."""
        prefix = " " * spaces
        return "\n".join(prefix + line if line.strip() else line
                        for line in code.split("\n"))

    def _collect_definitions(self) -> str:
        """Sammelt alle verwendeten Komponenten-Definitionen."""
        defs = []
        for comp in sorted(self.used_components):
            if comp in COMPONENTS:
                defs.append(COMPONENTS[comp])
        return "\n\n".join(defs)


# =============================================================================
# EINFACHERER ANSATZ: Direkt Mirror Code in einem Schritt
# =============================================================================

DIRECT_PROMPT = """Du generierst Mirror DSL Code.

MIRROR SYNTAX KURZREFERENZ:
- Definition: "Name: properties" (mit Doppelpunkt)
- Instanz: "Name" oder 'Name "content"' (ohne Doppelpunkt)
- Verschachtelt durch Einrückung (2 Spaces)
- Listen: "- Name" für mehrere Instanzen
- Slots füllen: 'SlotName "content"'

VERFÜGBARE KOMPONENTEN:
{components}

BEISPIEL OUTPUT:
```
// Component Definitions
Header: hor, spread, ver-center, pad 12 16, bg #18181B
  Title: col #F4F4F5, font-size 16, weight bold
  Subtitle: col #A1A1AA, font-size 12

StatsCard: ver, gap 4, bg #1A1A23, pad 16, rad 8
  Label: col #A1A1AA, font-size 12
  Value: col #F4F4F5, font-size 24, weight bold

// Page
Dashboard
  Header
    Title "Analytics"
    Subtitle "Last 30 days"
  StatsGrid
    - StatsCard
      Label "Users"
      Value "12,345"
    - StatsCard
      Label "Revenue"
      Value "$45,678"
```

REGELN:
1. Verwende die verfügbaren Komponenten-Definitionen
2. Füge nur neue Definitionen hinzu wenn nötig (z.B. Layout-Container)
3. Layout-Container: "Name: ver" oder "Name: hor" oder "Name: grid 3"
4. Fülle alle relevanten Slots mit dem gegebenen Content
5. Verwende "- " für Listen (mehrere NavItems, StatsCards, etc.)

Generiere NUR validen Mirror Code."""


class DirectGenerator:
    """Generiert Mirror Code direkt in einem Schritt."""

    def __init__(self, config: LLMConfig):
        self.config = config

    async def generate(self, request: str, content_hints: str = "") -> str:
        """Generiert Mirror Code direkt."""

        async with aiohttp.ClientSession() as session:
            print("=" * 60)
            print("DIRECT MIRROR GENERATOR V2")
            print("=" * 60)

            # Komponenten-Definitionen als Kontext
            components_str = "\n\n".join([
                f"// {name}\n{code}"
                for name, code in COMPONENTS.items()
            ])

            prompt = DIRECT_PROMPT.format(components=components_str)

            user_prompt = f"""ANFRAGE: {request}

CONTENT:
{content_hints}

Generiere den vollständigen Mirror Code:"""

            print("\n[1] Generiere Mirror Code...")
            response = await call_llm(self.config, prompt, user_prompt, session)
            code = clean_response(response)

            print(f"\n[2] Generiert: {len(code)} Zeichen")

            return code


# =============================================================================
# TEST
# =============================================================================

TEST_REQUESTS = [
    {
        "name": "Admin Dashboard",
        "request": """Admin Dashboard mit:
- Sidebar links mit Logo "Acme" und 5 Navigation Items (Dashboard, Users, Products, Orders, Settings)
- Header mit Titel "Dashboard" und Subtitle "Welcome back"
- 4 Stats Cards: Users (12,345), Revenue ($45,678), Orders (1,234), Conversion (3.2%)
- Card mit Titel "Recent Orders" und einer Tabelle""",
        "content": ""
    },
    {
        "name": "Login Page",
        "request": """Einfache Login-Seite:
- Zentrierte Card
- Logo "MyApp" oben
- Email Input
- Password Input
- "Remember me" Checkbox
- Login Button
- "Forgot Password?" Link unten""",
        "content": ""
    },
    {
        "name": "Settings Page",
        "request": """Settings-Seite:
- Header mit Titel "Settings"
- Sidebar mit 4 Nav Items: Profile, Security, Notifications, Billing
- Card mit Formular (Name, Email Inputs)
- Save und Cancel Buttons""",
        "content": ""
    }
]


async def test_recursive():
    """Testet den rekursiven Generator."""
    config = load_config()
    if not config:
        return

    for test in TEST_REQUESTS[:1]:  # Nur erster Test
        print(f"\n{'='*60}")
        print(f"TEST: {test['name']}")
        print(f"{'='*60}")

        generator = RecursiveGenerator(config)
        result = await generator.generate(test['request'], test['content'])

        print(f"\n{'='*60}")
        print("RESULT:")
        print("="*60)
        print(result)

        # Speichern
        filename = f"v2-recursive-{test['name'].lower().replace(' ', '-')}.mirror"
        with open(filename, 'w') as f:
            f.write(result)
        print(f"\nSaved to: {filename}")


async def test_direct():
    """Testet den direkten Generator."""
    config = load_config()
    if not config:
        return

    for test in TEST_REQUESTS:
        print(f"\n{'='*60}")
        print(f"TEST: {test['name']}")
        print(f"{'='*60}")

        generator = DirectGenerator(config)
        result = await generator.generate(test['request'], test['content'])

        print(f"\n{'='*60}")
        print("RESULT:")
        print("="*60)
        print(result)

        # Speichern
        filename = f"v2-direct-{test['name'].lower().replace(' ', '-')}.mirror"
        with open(filename, 'w') as f:
            f.write(result)
        print(f"\nSaved to: {filename}")


def load_config() -> Optional[LLMConfig]:
    """Lädt API Key aus .env.local"""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    api_key = None

    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("VITE_OPENROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break

    if not api_key:
        print("ERROR: No API key in .env.local")
        return None

    return LLMConfig(api_key=api_key)


async def main():
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == "recursive":
            await test_recursive()
        elif sys.argv[1] == "direct":
            await test_direct()
        elif sys.argv[1] == "both":
            print("\n" + "="*60)
            print("TESTING RECURSIVE APPROACH")
            print("="*60)
            await test_recursive()

            print("\n" + "="*60)
            print("TESTING DIRECT APPROACH")
            print("="*60)
            await test_direct()
        else:
            print("Usage: python prototype_v2.py [recursive|direct|both]")
    else:
        # Default: Beide testen
        await test_direct()


if __name__ == "__main__":
    asyncio.run(main())
