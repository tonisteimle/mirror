"""
Mirror LLM Generator - Prototype V3

Direkter Ansatz mit:
- Gute Beispiele → LLM → Mirror Code
- Validierung + Retry bei Fehlern
- Feedback-Loop für Korrekturen
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
    session: aiohttp.ClientSession,
    temperature: float = 0.2
) -> str:
    """Ruft LLM über OpenRouter auf."""
    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mirror-dsl.dev",
        "X-Title": "Mirror Generator V3"
    }

    payload = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": temperature,
        "max_tokens": 3000
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


def clean_code(response: str) -> str:
    """Extrahiert Mirror Code aus der Antwort."""
    # Entferne Markdown Code-Blöcke
    code = re.sub(r'```\w*\n?', '', response).strip()

    # Entferne eventuelle Erklärungen vor/nach dem Code
    lines = code.split('\n')

    # Finde Start (// Component Definitions oder erste Definition)
    start_idx = 0
    for i, line in enumerate(lines):
        if line.strip().startswith('//') or (': ' in line and line[0].isupper()):
            start_idx = i
            break

    return '\n'.join(lines[start_idx:])


# =============================================================================
# COMPONENT LIBRARY
# =============================================================================

COMPONENTS = {
    "Sidebar": {
        "definition": """Sidebar: ver, width 240, height full, bg #18181B, pad 12
  Logo: pad 12 16, font-size 16, weight bold, col #F4F4F5
  NavSection: ver, gap 4
    NavItem: hor, gap 8, pad 8 16, rad 6, col #E4E4E7
      state hover bg #333
      state active bg #2563EB, col white
      NavIcon:
      NavLabel:""",
        "slots": ["Logo", "NavItem"],
        "example": """Sidebar
  Logo "My App"
  - NavItem
    NavIcon "home"
    NavLabel "Dashboard"
  - NavItem
    NavIcon "settings"
    NavLabel "Settings\""""
    },

    "Header": {
        "definition": """Header: hor, spread, ver-center, pad 12 16, bg #18181B, bor b 1 #333
  Title: col #F4F4F5, font-size 16, weight bold
  Subtitle: col #A1A1AA, font-size 12
  Actions: hor, gap 8""",
        "slots": ["Title", "Subtitle", "Actions"],
        "example": """Header
  Title "Dashboard"
  Subtitle "Welcome back\""""
    },

    "StatsCard": {
        "definition": """StatsCard: ver, gap 4, bg #1A1A23, pad 16, rad 8
  Label: col #A1A1AA, font-size 12, uppercase
  Value: col #F4F4F5, font-size 24, weight bold
  Trend: col #22C55E, font-size 12""",
        "slots": ["Label", "Value", "Trend"],
        "example": """StatsCard
  Label "Total Users"
  Value "12,345"
  Trend "+12%\""""
    },

    "Card": {
        "definition": """Card: ver, bg #1A1A23, rad 8, bor 1 #333
  CardHeader: hor, spread, ver-center, pad 12 16, bor b 1 #333
    CardTitle: col #F4F4F5, font-size 14, weight 600
    CardActions: hor, gap 8
  CardContent: pad 16""",
        "slots": ["CardTitle", "CardActions", "CardContent"],
        "example": """Card
  CardTitle "Recent Activity"
  CardContent
    Text "No recent activity\""""
    },

    "Button": {
        "definition": """Button: hor, gap 8, ver-center, bg #2563EB, col white, pad 8 16, rad 6
  state hover bg #1D4ED8
  state disabled opacity 0.5
  Icon:
  Label:""",
        "slots": ["Icon", "Label"],
        "example": """Button
  Icon "plus"
  Label "Add New\""""
    },

    "Input": {
        "definition": """Input: ver, gap 4
  InputLabel: col #A1A1AA, font-size 12
  InputField: bg #27272A, bor 1 #333, rad 6, pad 10 12, col #F4F4F5
    state focus bor 1 #2563EB
  InputHint: col #71717A, font-size 11""",
        "slots": ["InputLabel", "InputField"],
        "example": """Input
  InputLabel "Email"
  InputField "Enter your email\""""
    },

    "Checkbox": {
        "definition": """Checkbox: hor, gap 8, ver-center, cursor pointer
  CheckBox: size 16, bg #27272A, bor 1 #333, rad 4
    state checked bg #2563EB, bor 0
  CheckLabel: col #E4E4E7, font-size 14""",
        "slots": ["CheckLabel"],
        "example": """Checkbox
  CheckLabel "Remember me\""""
    },

    "DataTable": {
        "definition": """DataTable: ver, bg #1A1A23, rad 8, bor 1 #333
  TableHeader: hor, bg #18181B, pad 12 16
    HeaderCell: col #A1A1AA, font-size 12, weight 600, width 150
  TableBody: ver
    TableRow: hor, pad 12 16, bor t 1 #333
      state hover bg #27272A
      Cell: col #E4E4E7, font-size 14, width 150""",
        "slots": ["HeaderCell", "TableRow", "Cell"],
        "example": """DataTable
  TableHeader
    - HeaderCell "Name"
    - HeaderCell "Email"
    - HeaderCell "Status"
  TableBody
    - TableRow
      - Cell "John Doe"
      - Cell "john@example.com"
      - Cell "Active"
    - TableRow
      - Cell "Jane Smith"
      - Cell "jane@example.com"
      - Cell "Pending\""""
    },

    "Modal": {
        "definition": """Modal: stacked, hidden
  Overlay: bg rgba(0,0,0,0.5), width full, height full
    onclick close
  Dialog: ver, bg #1A1A23, rad 12, width 480, pad 24, gap 16
    ModalHeader: hor, spread, ver-center
      ModalTitle: col #F4F4F5, font-size 18, weight 600
      CloseButton: cursor pointer, col #A1A1AA
        state hover col #F4F4F5
    ModalContent: ver, gap 16
    ModalFooter: hor, gap 8, right""",
        "slots": ["ModalTitle", "ModalContent", "ModalFooter"],
        "example": """Modal
  ModalTitle "Confirm Action"
  ModalContent
    Text "Are you sure?"
  ModalFooter
    Button
      Label "Cancel"
    Button
      Label "Confirm\""""
    },

    "Tabs": {
        "definition": """Tabs: ver, gap 0
  TabList: hor, gap 0, bor b 1 #333
    Tab: pad 12 16, col #A1A1AA, cursor pointer
      state hover col #F4F4F5
      state active col #F4F4F5, bor b 2 #2563EB
  TabPanels: pad 16
    TabPanel: hidden
      state active visible""",
        "slots": ["Tab", "TabPanel"],
        "example": """Tabs
  TabList
    - Tab "Overview"
    - Tab "Details"
    - Tab "Settings"
  TabPanels
    - TabPanel
      Text "Overview content"
    - TabPanel
      Text "Details content\""""
    },

    "Badge": {
        "definition": """Badge: pad 2 8, rad 10, font-size 11, weight 600
  state success bg #22C55E, col white
  state warning bg #F59E0B, col white
  state error bg #EF4444, col white
  state info bg #3B82F6, col white""",
        "slots": [],
        "example": """Badge "Active"
  state success"""
    },

    "Avatar": {
        "definition": """Avatar: size 40, rad 20, bg #27272A, overflow hidden
  AvatarImage: width full, height full
  AvatarFallback: col #A1A1AA, font-size 14, weight 600""",
        "slots": ["AvatarImage", "AvatarFallback"],
        "example": """Avatar
  AvatarFallback "JD\""""
    },

    "Link": {
        "definition": """Link: col #3B82F6, cursor pointer
  state hover col #2563EB, underline""",
        "slots": [],
        "example": """Link "Forgot Password?\""""
    },
}


# =============================================================================
# VALIDATOR
# =============================================================================

class MirrorValidator:
    """Validiert Mirror Code auf syntaktische Korrektheit."""

    def __init__(self):
        self.errors = []

    def validate(self, code: str) -> tuple[bool, list[str]]:
        """Validiert den Code und gibt (is_valid, errors) zurück."""
        self.errors = []
        lines = code.split('\n')

        has_definitions = False
        has_page = False
        indent_stack = [0]

        for i, line in enumerate(lines, 1):
            if not line.strip():
                continue

            # Check for sections
            if '// Component Definitions' in line:
                has_definitions = True
                continue
            if '// Page' in line:
                has_page = True
                continue

            # Check indentation
            indent = len(line) - len(line.lstrip())
            content = line.strip()

            # Indentation should be multiple of 2
            if indent % 2 != 0:
                self.errors.append(f"Zeile {i}: Ungerade Einrückung ({indent} Spaces)")

            # Check for common syntax errors
            if content.startswith('- '):
                # List item - OK
                pass
            elif ':' in content and not content.startswith('state ') and not content.startswith('//'):
                # Definition - check format
                parts = content.split(':', 1)
                name = parts[0].strip()
                if not name[0].isupper():
                    self.errors.append(f"Zeile {i}: Komponenten-Name muss mit Großbuchstabe beginnen: {name}")
            elif content[0].isupper():
                # Instance or slot fill - OK
                pass
            elif content.startswith('state '):
                # State definition - OK
                pass
            elif content.startswith('on'):
                # Event handler - OK
                pass
            else:
                # Unknown
                if not content.startswith('//'):
                    self.errors.append(f"Zeile {i}: Unbekannte Syntax: {content[:50]}")

        # Check required sections
        if not has_definitions:
            self.errors.append("Fehlende Sektion: // Component Definitions")
        if not has_page:
            self.errors.append("Fehlende Sektion: // Page")

        return len(self.errors) == 0, self.errors


# =============================================================================
# GENERATOR
# =============================================================================

SYSTEM_PROMPT = """Du bist ein Mirror DSL Code Generator.

MIRROR SYNTAX:
- Komponenten-Definition: "Name: properties" (mit Doppelpunkt)
- Instanz: "Name" (ohne Doppelpunkt)
- Slot füllen: 'SlotName "content"'
- Listen: "- Name" für mehrere gleiche Elemente
- Verschachtelt durch 2-Space Einrückung
- States: "state name properties"

STRUKTUR:
```
// Component Definitions
ComponentName: properties
  ChildSlot: properties
  state hover properties

// Page
RootComponent
  Child
    SlotName "content"
```

WICHTIGE REGELN:
1. Jede Komponente die du verwendest MUSS definiert sein
2. Verwende "- " Prefix für Listen (mehrere NavItems, TableRows, etc.)
3. Fülle Slots mit dem angegebenen Content
4. Layout-Container definieren: "ContainerName: ver" oder "ContainerName: hor" oder "ContainerName: grid N"
5. Halte Definitionen und Page-Sektion getrennt

VERFÜGBARE KOMPONENTEN:
{components}

Generiere IMMER vollständigen, validen Mirror Code mit beiden Sektionen."""


FIX_PROMPT = """Der generierte Mirror Code hat Fehler. Korrigiere sie.

ORIGINAL CODE:
{code}

FEHLER:
{errors}

Korrigiere den Code und gib den vollständigen, korrigierten Mirror Code aus.
Behalte die Struktur bei, behebe nur die genannten Fehler."""


class MirrorGenerator:
    """Generiert Mirror Code mit Validierung und Retry."""

    def __init__(self, config: LLMConfig, max_retries: int = 2):
        self.config = config
        self.max_retries = max_retries
        self.validator = MirrorValidator()

    async def generate(self, request: str, content_hints: str = "") -> dict:
        """Generiert Mirror Code mit Validierung und Retry bei Fehlern."""

        async with aiohttp.ClientSession() as session:
            print("=" * 60)
            print("MIRROR GENERATOR V3")
            print("=" * 60)

            # Build component context
            components_str = self._build_components_context()

            system = SYSTEM_PROMPT.format(components=components_str)

            user_prompt = f"""ANFRAGE: {request}

{f"CONTENT DETAILS:{chr(10)}{content_hints}" if content_hints else ""}

Generiere den vollständigen Mirror Code:"""

            # Generate
            print("\n[1] Generiere Code...")
            code = await call_llm(self.config, system, user_prompt, session)
            code = clean_code(code)

            # Validate and retry if needed
            for attempt in range(self.max_retries + 1):
                is_valid, errors = self.validator.validate(code)

                if is_valid:
                    print(f"[2] Validierung: ✓ OK")
                    break

                if attempt < self.max_retries:
                    print(f"[2] Validierung: ✗ {len(errors)} Fehler")
                    for err in errors[:3]:  # Show first 3
                        print(f"    - {err}")

                    print(f"\n[{3+attempt}] Retry {attempt + 1}/{self.max_retries}...")

                    fix_prompt = FIX_PROMPT.format(
                        code=code,
                        errors="\n".join(errors)
                    )
                    code = await call_llm(self.config, system, fix_prompt, session)
                    code = clean_code(code)
                else:
                    print(f"[!] Validierung nach {self.max_retries} Retries fehlgeschlagen")
                    for err in errors:
                        print(f"    - {err}")

            # Analyze result
            stats = self._analyze_code(code)

            return {
                "code": code,
                "valid": is_valid,
                "errors": errors if not is_valid else [],
                "stats": stats
            }

    def _build_components_context(self) -> str:
        """Baut den Komponenten-Kontext für den Prompt."""
        parts = []
        for name, comp in COMPONENTS.items():
            parts.append(f"""
### {name}
Definition:
{comp['definition']}

Slots: {', '.join(comp['slots']) if comp['slots'] else 'keine'}

Beispiel:
{comp['example']}
""")
        return "\n".join(parts)

    def _analyze_code(self, code: str) -> dict:
        """Analysiert den generierten Code."""
        lines = code.split('\n')
        definitions = 0
        instances = 0
        list_items = 0

        for line in lines:
            content = line.strip()
            if not content or content.startswith('//'):
                continue
            if ':' in content and content[0].isupper():
                definitions += 1
            elif content.startswith('- '):
                list_items += 1
            elif content[0].isupper():
                instances += 1

        return {
            "lines": len(lines),
            "definitions": definitions,
            "instances": instances,
            "list_items": list_items
        }


# =============================================================================
# TEST
# =============================================================================

TEST_CASES = [
    {
        "name": "Admin Dashboard",
        "request": """Admin Dashboard mit:
- Sidebar links mit Logo "Acme" und 5 Navigation Items (Dashboard, Users, Products, Orders, Settings) mit passenden Icons
- Header mit Titel "Dashboard" und Subtitle "Welcome back, Admin"
- 4 Stats Cards in einem Grid: Users (12,345, +12%), Revenue ($45,678, +8%), Orders (1,234, +5%), Conversion (3.2%, -0.5%)
- Card mit Titel "Recent Orders" und einer DataTable mit Spalten: Order ID, Customer, Amount, Status (4 Beispiel-Zeilen)""",
    },
    {
        "name": "Login Page",
        "request": """Zentrierte Login-Seite mit:
- Card in der Mitte
- Logo/App-Name "MyApp" oben
- Email Input mit Label
- Password Input mit Label
- "Remember me" Checkbox
- Login Button (primary, volle Breite)
- "Forgot Password?" Link unten""",
    },
    {
        "name": "Settings Page",
        "request": """Settings-Seite mit:
- Header mit Titel "Settings" und Subtitle "Manage your preferences"
- Tabs Navigation: Profile, Security, Notifications, Billing
- Unter dem aktiven Tab (Profile):
  - Card mit Formular: Name Input, Email Input, Bio Input
  - Button-Gruppe: Save Button, Cancel Button""",
    },
    {
        "name": "E-Commerce Product",
        "request": """Produktseite mit:
- Header mit Logo "ShopName" und Warenkorb-Icon mit Badge "3"
- Zwei-Spalten Layout:
  - Links: Produktbild Platzhalter
  - Rechts: Titel "Premium Sneakers", Preis "$199.99", Beschreibung, Größen-Auswahl (S, M, L, XL als Buttons), "Add to Cart" Button
- Unten: "Similar Products" Sektion mit 3 Cards (Produkt 1, 2, 3)""",
    },
    {
        "name": "User Profile",
        "request": """Profil-Seite mit:
- Header mit Back-Button und "Profile" Titel
- Avatar groß zentriert mit Fallback "JD"
- Name "John Doe" und Email "john@example.com"
- Stats-Leiste: 3 StatsCards (Posts: 142, Followers: 1.2k, Following: 89)
- Card "Recent Activity" mit 3 Einträgen als Liste""",
    },
]


async def run_tests():
    """Führt alle Tests aus."""
    config = load_config()
    if not config:
        return

    results = []

    for test in TEST_CASES:
        print(f"\n{'='*60}")
        print(f"TEST: {test['name']}")
        print(f"{'='*60}")

        generator = MirrorGenerator(config)
        result = await generator.generate(test['request'])

        print(f"\n{'='*60}")
        print("RESULT:")
        print("="*60)
        print(result['code'])

        print(f"\nStats: {result['stats']}")
        print(f"Valid: {result['valid']}")

        # Save
        filename = f"v3-{test['name'].lower().replace(' ', '-')}.mirror"
        with open(filename, 'w') as f:
            f.write(result['code'])
        print(f"Saved to: {filename}")

        results.append({
            "name": test['name'],
            "valid": result['valid'],
            "stats": result['stats'],
            "errors": result.get('errors', [])
        })

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print("="*60)
    valid_count = sum(1 for r in results if r['valid'])
    print(f"Valid: {valid_count}/{len(results)}")
    for r in results:
        status = "✓" if r['valid'] else "✗"
        print(f"  {status} {r['name']}: {r['stats']['lines']} lines, {r['stats']['definitions']} defs")
        if not r['valid']:
            for err in r['errors'][:2]:
                print(f"      Error: {err}")


async def run_single(name: str):
    """Führt einen einzelnen Test aus."""
    config = load_config()
    if not config:
        return

    test = next((t for t in TEST_CASES if t['name'].lower() == name.lower()), None)
    if not test:
        print(f"Test '{name}' nicht gefunden.")
        print(f"Verfügbar: {[t['name'] for t in TEST_CASES]}")
        return

    print(f"\n{'='*60}")
    print(f"TEST: {test['name']}")
    print(f"{'='*60}")

    generator = MirrorGenerator(config)
    result = await generator.generate(test['request'])

    print(f"\n{'='*60}")
    print("RESULT:")
    print("="*60)
    print(result['code'])

    # Save
    filename = f"v3-{test['name'].lower().replace(' ', '-')}.mirror"
    with open(filename, 'w') as f:
        f.write(result['code'])
    print(f"\nSaved to: {filename}")


async def run_custom(request: str):
    """Führt einen Custom Request aus."""
    config = load_config()
    if not config:
        return

    print(f"\n{'='*60}")
    print("CUSTOM REQUEST")
    print(f"{'='*60}")
    print(request[:100] + "..." if len(request) > 100 else request)

    generator = MirrorGenerator(config)
    result = await generator.generate(request)

    print(f"\n{'='*60}")
    print("RESULT:")
    print("="*60)
    print(result['code'])

    # Save
    filename = "v3-custom.mirror"
    with open(filename, 'w') as f:
        f.write(result['code'])
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
        cmd = sys.argv[1]
        if cmd == "all":
            await run_tests()
        elif cmd == "custom" and len(sys.argv) > 2:
            await run_custom(" ".join(sys.argv[2:]))
        else:
            await run_single(cmd)
    else:
        await run_tests()


if __name__ == "__main__":
    asyncio.run(main())
