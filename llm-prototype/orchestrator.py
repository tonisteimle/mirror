"""
Mirror Orchestrator - Multi-Layer Architecture

Layer 1: High-Level Orchestrator
Layer 2: Component Registry
Layer 3a: Builder (6-Phase Pipeline)
Layer 3b: Applier (Instantiation)
"""

import asyncio
import aiohttp
import json
import os
import re
from dataclasses import dataclass, field
from typing import Optional

# Import existing builder from css-generator
from css_generator import (
    LLMConfig,
    call_llm,
    generate_component,
    merge_mirror,
    TOKENS
)


# =============================================================================
# COMPONENT REGISTRY
# =============================================================================

@dataclass
class ComponentDefinition:
    """Eine Komponenten-Definition aus der Registry."""
    name: str
    mirror_code: str
    description: str
    slots: list[str] = field(default_factory=list)  # Verfügbare Slots/Kinder
    props: list[str] = field(default_factory=list)  # Wichtige Properties
    usage_example: str = ""


class ComponentRegistry:
    """Katalog existierender Komponenten."""

    def __init__(self):
        self.components: dict[str, ComponentDefinition] = {}
        self._load_default_components()

    def _load_default_components(self):
        """Lädt vordefinierte Komponenten."""

        # StatsCard
        self.register(ComponentDefinition(
            name="StatsCard",
            description="Zeigt eine einzelne Statistik mit Titel, Wert und optionalem Trend",
            slots=["Title", "Value", "Trend", "Icon"],
            props=["bg", "pad", "rad"],
            mirror_code="""StatsCard: ver, gap 4, bg $elevated.bg, pad $lg.pad, rad $lg.rad
  Title: col $muted.col, font-size $sm.font-size, uppercase
  Value: col $heading.col, font-size 24, weight bold
  Trend: hor, gap 4, ver-center
    TrendIcon: col $success.col
    TrendValue: col $success.col, font-size $sm.font-size
  Icon: col $muted.col""",
            usage_example="""StatsCard
  Title "Total Users"
  Value "12,345"
  Trend
    TrendIcon "trending-up"
    TrendValue "+12%"
  Icon "users" """
        ))

        # Sidebar
        self.register(ComponentDefinition(
            name="Sidebar",
            description="Vertikale Navigation mit Logo und Nav-Items",
            slots=["Logo", "NavSection", "NavItem"],
            props=["width", "bg"],
            mirror_code="""Sidebar: ver, width 240, height full, bg $surface.bg, pad $md.pad
  Logo: pad $md.pad $lg.pad
    LogoIcon:
    LogoText: font-size $lg.font-size, weight bold, col $heading.col
  NavSection: ver, gap $xs.gap
    SectionTitle: col $muted.col, font-size $sm.font-size, pad $sm.pad $lg.pad, uppercase
  NavItem: hor, gap $sm.gap, ver-center, pad $sm.pad $lg.pad, rad $md.rad, col $default.col
    state hover bg $hover.bg
    state active bg $primary.bg, col white
    NavIcon:
    NavLabel: """,
            usage_example="""Sidebar
  Logo
    LogoIcon "command"
    LogoText "Acme Inc"
  NavSection
    SectionTitle "Main"
    - NavItem NavIcon "home"; NavLabel "Dashboard"
    - NavItem NavIcon "users"; NavLabel "Users"
    - NavItem NavIcon "settings"; NavLabel "Settings" """
        ))

        # Header
        self.register(ComponentDefinition(
            name="Header",
            description="Horizontaler Header mit Titel und Actions",
            slots=["Title", "Subtitle", "Actions"],
            props=["bg", "pad"],
            mirror_code="""Header: hor, spread, ver-center, pad $md.pad $lg.pad, bg $surface.bg, bor b 1 $default.bor
  HeaderLeft: ver, gap $xs.gap
    Title: col $heading.col, font-size $lg.font-size, weight bold
    Subtitle: col $muted.col, font-size $sm.font-size
  Actions: hor, gap $sm.gap""",
            usage_example="""Header
  Title "Dashboard"
  Subtitle "Welcome back, John"
  Actions
    Button "Export"
    Button "Settings" """
        ))

        # DataTable
        self.register(ComponentDefinition(
            name="DataTable",
            description="Tabelle mit Header und Zeilen",
            slots=["TableHeader", "Column", "Row", "Cell"],
            props=["bg", "rad"],
            mirror_code="""DataTable: ver, bg $elevated.bg, rad $lg.rad, bor 1 $default.bor
  TableHeader: hor, bg $surface.bg, pad $sm.pad $lg.pad
    Column: col $muted.col, font-size $sm.font-size, weight 600
  TableBody: ver
    Row: hor, pad $sm.pad $lg.pad, bor b 1 $default.bor
      state hover bg $hover.bg
      Cell: col $default.col, font-size $default.font-size""",
            usage_example="""DataTable
  TableHeader
    Column "Name"
    Column "Email"
    Column "Status"
  TableBody data $users
    Row
      Cell $item.name
      Cell $item.email
      Cell $item.status """
        ))

        # Button (einfach)
        self.register(ComponentDefinition(
            name="Button",
            description="Klickbarer Button",
            slots=["Icon", "Label"],
            props=["bg", "col", "pad", "rad"],
            mirror_code="""Button: hor, gap $sm.gap, ver-center, bg $primary.bg, col white, pad $sm.pad $lg.pad, rad $md.rad
  state hover bg $primary.hover.bg
  state disabled opacity 0.5
  Icon:
  Label: """,
            usage_example="""Button
  Icon "plus"
  Label "Add New" """
        ))

        # Card (Container)
        self.register(ComponentDefinition(
            name="Card",
            description="Container mit optionalem Header",
            slots=["CardHeader", "CardTitle", "CardContent"],
            props=["bg", "pad", "rad"],
            mirror_code="""Card: ver, bg $elevated.bg, rad $lg.rad, bor 1 $default.bor
  CardHeader: hor, spread, ver-center, pad $md.pad $lg.pad, bor b 1 $default.bor
    CardTitle: col $heading.col, font-size $default.font-size, weight 600
    CardActions: hor, gap $sm.gap
  CardContent: pad $lg.pad""",
            usage_example="""Card
  CardHeader
    CardTitle "Recent Activity"
  CardContent
    // Content here """
        ))

    def register(self, component: ComponentDefinition):
        """Registriert eine neue Komponente."""
        self.components[component.name] = component

    def find(self, name: str) -> Optional[ComponentDefinition]:
        """Findet eine Komponente nach Name."""
        return self.components.get(name)

    def search(self, query: str) -> list[ComponentDefinition]:
        """Sucht Komponenten nach Beschreibung/Name."""
        query_lower = query.lower()
        results = []
        for comp in self.components.values():
            if (query_lower in comp.name.lower() or
                query_lower in comp.description.lower()):
                results.append(comp)
        return results

    def list_all(self) -> list[str]:
        """Listet alle verfügbaren Komponenten."""
        return list(self.components.keys())

    def get_catalog_for_prompt(self) -> str:
        """Generiert einen Katalog-String für LLM-Prompts."""
        lines = ["VERFÜGBARE KOMPONENTEN:"]
        for name, comp in self.components.items():
            slots_str = ", ".join(comp.slots) if comp.slots else "keine"
            lines.append(f"\n{name}:")
            lines.append(f"  Beschreibung: {comp.description}")
            lines.append(f"  Slots: {slots_str}")
        return "\n".join(lines)


# =============================================================================
# ORCHESTRATOR PROMPTS
# =============================================================================

ORCHESTRATOR_PROMPT = """Du bist ein UI-Architekt. Deine Aufgabe ist es, eine User-Anfrage zu analysieren und eine UI-Hierarchie zu erstellen.

Du erhältst:
1. Eine User-Anfrage (was soll gebaut werden)
2. Einen Katalog verfügbarer Komponenten

Deine Aufgabe:
1. Analysiere, welche UI-Elemente benötigt werden
2. Prüfe, welche existierenden Komponenten passen
3. Identifiziere, welche Komponenten NEU gebaut werden müssen
4. Erstelle eine UI-Hierarchie

OUTPUT FORMAT (JSON):
{
  "analysis": "Kurze Analyse der Anfrage",
  "hierarchy": {
    "root": "DashboardLayout",
    "children": [
      {"component": "Sidebar", "exists": true},
      {"component": "MainContent", "exists": false, "children": [
        {"component": "Header", "exists": true},
        {"component": "StatsRow", "exists": false, "children": [
          {"component": "StatsCard", "exists": true, "instances": 3}
        ]},
        {"component": "RecentOrders", "exists": false}
      ]}
    ]
  },
  "to_build": [
    {
      "name": "RecentOrders",
      "description": "Tabelle mit den letzten Bestellungen",
      "spec": "Komponenten: RecentOrders (Container), OrderRow (einzelne Zeile mit Status-Badge)"
    }
  ],
  "to_reuse": ["Sidebar", "Header", "StatsCard"]
}

REGELN:
1. Verwende existierende Komponenten wo möglich
2. Baue nur, was wirklich fehlt
3. Beschreibe neue Komponenten klar genug für den Builder
4. Die Hierarchie sollte das finale Layout widerspiegeln

Antworte NUR mit dem JSON, keine Erklärungen."""


APPLIER_PROMPT = """Du bist ein UI-Instantiator. Deine Aufgabe ist es, Komponenten-Definitionen zu konkreten Instanzen zu machen.

Du erhältst:
1. Komponenten-Definitionen (Mirror-Code)
2. Eine UI-Hierarchie (was wo platziert werden soll)
3. Optionale Daten/Inhalte

Deine Aufgabe:
Erstelle den finalen Mirror-Code, der die Komponenten VERWENDET (nicht definiert).

MIRROR INSTANZ-SYNTAX:
- Definition (Template): `Component: properties`
- Instanz (Verwendung): `Component` (ohne Doppelpunkt)
- Mit Inhalt: `Component "text"`
- Mit Slots: `Component` gefolgt von eingerückten Slot-Werten
- Liste: `- Component` (erstellt neue Instanz)
- Child-Override: `Component ChildName "content"; ChildName2 "content"`

BEISPIELE:

Definition:
```
StatsCard:
  Title:
  Value:
```

Instanz:
```
StatsCard
  Title "Total Users"
  Value "12,345"
```

Oder kompakt mit Child-Override:
```
StatsCard Title "Total Users"; Value "12,345"
```

Listen:
```
NavSection
  - NavItem NavIcon "home"; NavLabel "Dashboard"
  - NavItem NavIcon "users"; NavLabel "Users"
```

Daten-Binding:
```
TableBody data $orders
  Row
    Cell $item.name
    Cell $item.amount
```

OUTPUT FORMAT:
Gib nur den Mirror-Code aus, der die Instanzen erstellt.
Die Komponenten-Definitionen kommen NICHT in den Output (die sind schon definiert).

Antworte NUR mit dem Mirror-Code, keine Erklärungen."""


# =============================================================================
# ORCHESTRATOR
# =============================================================================

class Orchestrator:
    """High-Level Orchestrator für komplexe UI-Generierung."""

    def __init__(self, config: LLMConfig, registry: ComponentRegistry):
        self.config = config
        self.registry = registry

    async def analyze_request(self, user_request: str) -> dict:
        """Analysiert User-Request und erstellt Hierarchie-Plan."""

        catalog = self.registry.get_catalog_for_prompt()

        user_prompt = f"""USER ANFRAGE:
{user_request}

{catalog}

Analysiere die Anfrage und erstelle den UI-Plan."""

        async with aiohttp.ClientSession() as session:
            response = await call_llm(
                self.config,
                ORCHESTRATOR_PROMPT,
                user_prompt,
                session
            )

        # Parse JSON
        response = re.sub(r'```\w*\n?', '', response).strip()
        return json.loads(response)

    async def build_missing_components(
        self,
        to_build: list[dict],
        design_spec: str
    ) -> dict[str, str]:
        """Baut fehlende Komponenten mit dem 6-Phase Builder."""

        built = {}

        for comp_spec in to_build:
            name = comp_spec["name"]
            spec = comp_spec.get("spec", comp_spec.get("description", ""))

            print(f"\n  Building: {name}...")

            # Nutze existierenden Builder
            results = await generate_component(
                self.config,
                spec,
                design_spec
            )

            # Merge zu Mirror
            mappings = results.get("token_mapping", {}).get("parsed", {}).get("mappings", [])
            mirror_code = merge_mirror(results, mappings)

            # Extrahiere nur die Komponenten-Definition (ohne Tokens)
            lines = mirror_code.split('\n')
            component_lines = []
            in_tokens = False
            for line in lines:
                if line.startswith('// Design Tokens'):
                    in_tokens = True
                elif line.startswith('// Components'):
                    in_tokens = False
                elif not in_tokens:
                    component_lines.append(line)

            built[name] = '\n'.join(component_lines).strip()

            # Registriere in Registry
            self.registry.register(ComponentDefinition(
                name=name,
                description=comp_spec.get("description", ""),
                mirror_code=built[name],
                slots=[],
                props=[]
            ))

        return built

    async def apply_components(
        self,
        hierarchy: dict,
        content_spec: str = ""
    ) -> str:
        """Erstellt Instanzen aus Hierarchie."""

        # Sammle alle Komponenten-Definitionen
        definitions = []

        def collect_components(node):
            if isinstance(node, dict):
                comp_name = node.get("component")
                if comp_name:
                    comp_def = self.registry.find(comp_name)
                    if comp_def:
                        definitions.append({
                            "name": comp_name,
                            "definition": comp_def.mirror_code,
                            "usage": comp_def.usage_example
                        })
                for child in node.get("children", []):
                    collect_components(child)

        collect_components(hierarchy)

        # Dedupliziere
        seen = set()
        unique_defs = []
        for d in definitions:
            if d["name"] not in seen:
                seen.add(d["name"])
                unique_defs.append(d)

        # Erstelle Prompt
        defs_text = "\n\n".join([
            f"=== {d['name']} ===\n{d['definition']}\n\nBeispiel-Verwendung:\n{d['usage']}"
            for d in unique_defs
        ])

        user_prompt = f"""KOMPONENTEN-DEFINITIONEN:
{defs_text}

UI-HIERARCHIE (JSON):
{json.dumps(hierarchy, indent=2)}

ZUSÄTZLICHE INHALTE/DATEN:
{content_spec if content_spec else "(keine)"}

Erstelle den Mirror-Code für die Instanzen."""

        async with aiohttp.ClientSession() as session:
            response = await call_llm(
                self.config,
                APPLIER_PROMPT,
                user_prompt,
                session
            )

        # Bereinige
        response = re.sub(r'```\w*\n?', '', response).strip()
        return response

    async def generate_ui(
        self,
        user_request: str,
        design_spec: str = "",
        content_spec: str = ""
    ) -> dict:
        """Vollständiger Generation-Flow."""

        print("=" * 60)
        print("MIRROR ORCHESTRATOR")
        print("=" * 60)

        # Step 1: Analysiere
        print("\n[1/4] Analysiere Anfrage...")
        plan = await self.analyze_request(user_request)

        print(f"\n  Analyse: {plan.get('analysis', '-')}")
        print(f"  Zu verwenden: {plan.get('to_reuse', [])}")
        print(f"  Zu bauen: {[c['name'] for c in plan.get('to_build', [])]}")

        # Step 2: Baue fehlende
        to_build = plan.get("to_build", [])
        built_components = {}

        if to_build:
            print(f"\n[2/4] Baue {len(to_build)} neue Komponenten...")
            built_components = await self.build_missing_components(
                to_build,
                design_spec or "Dunkles Theme mit #18181B Hintergrund, #E4E4E7 Text, #2563EB Akzent"
            )
        else:
            print("\n[2/4] Keine neuen Komponenten nötig.")

        # Step 3: Sammle Definitionen
        print("\n[3/4] Sammle Komponenten-Definitionen...")
        all_definitions = []

        # Existierende
        for comp_name in plan.get("to_reuse", []):
            comp = self.registry.find(comp_name)
            if comp:
                all_definitions.append(comp.mirror_code)

        # Neu gebaute
        for mirror_code in built_components.values():
            all_definitions.append(mirror_code)

        # Step 4: Applier
        print("\n[4/4] Erstelle Instanzen...")
        hierarchy = plan.get("hierarchy", {})
        instances = await self.apply_components(hierarchy, content_spec)

        # Kombiniere alles
        print("\n" + "=" * 60)
        print("ERGEBNIS")
        print("=" * 60)

        # Token-Definitionen
        token_lines = ["// Design Tokens"]
        used_tokens = set()
        for code in all_definitions + [instances]:
            used_tokens.update(re.findall(r'\$[\w.-]+', code))

        for token in sorted(used_tokens):
            if token in TOKENS:
                token_lines.append(f"{token}: {TOKENS[token]}")

        # Zusammenbauen
        final_output = "\n".join(token_lines)
        final_output += "\n\n// Component Definitions\n"
        final_output += "\n\n".join(all_definitions)
        final_output += "\n\n// Usage\n"
        final_output += instances

        return {
            "plan": plan,
            "built_components": built_components,
            "instances": instances,
            "final_mirror": final_output
        }


# =============================================================================
# MAIN
# =============================================================================

async def main():
    # Lade API Key
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    api_key = None

    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("VITE_OPENROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break

    if not api_key or api_key == "your-api-key-here":
        print("ERROR: Kein API Key in .env.local")
        return

    config = LLMConfig(api_key=api_key)
    registry = ComponentRegistry()
    orchestrator = Orchestrator(config, registry)

    # Test-Anfrage
    user_request = """
    Baue ein Dashboard mit:
    - Einer Sidebar links mit Navigation (Home, Users, Orders, Settings)
    - Einem Header mit Titel "Admin Dashboard"
    - 3 Statistik-Karten (Total Users, Revenue, Active Orders)
    - Einer Tabelle mit den letzten Bestellungen (Name, Amount, Status, Date)
    """

    content_spec = """
    Statistiken:
    - Total Users: 12,345 (+12% Trend)
    - Revenue: $45,678 (+8% Trend)
    - Active Orders: 234 (-3% Trend)

    Navigation Items: Home, Users, Orders, Settings

    Beispiel-Bestellungen:
    - John Doe, $123.45, Completed, 2024-01-15
    - Jane Smith, $67.89, Pending, 2024-01-14
    """

    result = await orchestrator.generate_ui(
        user_request,
        design_spec="Dunkles Theme: #18181B Hintergründe, #333 Borders, #E4E4E7 Text, #2563EB Akzent",
        content_spec=content_spec
    )

    print("\n" + result["final_mirror"])

    # Speichern
    output_path = os.path.join(os.path.dirname(__file__), "generated-dashboard.mirror")
    with open(output_path, "w") as f:
        f.write(result["final_mirror"])

    print(f"\nGespeichert in: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
