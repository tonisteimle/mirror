"""
Mirror LLM Generator - Prototype

Validiert den Ansatz:
- Dispatcher klassifiziert Requests
- Builder baut EINE Komponente (CSS/JS → Mirror)
- Applier instanziiert EINE Komponente
- Rekursive Verarbeitung für komplexe UIs
"""

import asyncio
import aiohttp
import json
import os
import re
from dataclasses import dataclass, field
from typing import Optional, Any
from enum import Enum


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
        "X-Title": "Mirror Generator Prototype"
    }

    payload = {
        "model": config.model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 1500
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
# DISPATCHER
# =============================================================================

class RequestType(Enum):
    BUILD_COMPONENT = "build_component"      # Neue Komponente bauen
    COMPOSITE_UI = "composite_ui"            # Komplexe UI aus mehreren Komponenten
    MODIFY_COMPONENT = "modify_component"    # Existierende Komponente ändern


DISPATCHER_PROMPT = """Du klassifizierst UI-Anfragen.

TYPEN:

1. BUILD_COMPONENT - Eine einzelne, neue Komponente bauen
   Beispiele:
   - "Erstelle einen Dropdown"
   - "Baue einen Button mit Loading-State"
   - "Ich brauche eine Tabs-Komponente"

2. COMPOSITE_UI - Komplexe UI aus mehreren Komponenten
   Beispiele:
   - "Dashboard mit Sidebar und Stats"
   - "Login-Seite mit Form und Social-Buttons"
   - "Settings-Page mit Navigation und Panels"

3. MODIFY_COMPONENT - Existierende Komponente ändern
   Beispiele:
   - "Füge hover-state zum Button hinzu"
   - "Ändere die Farbe des Headers"
   - "Mach den Dropdown größer"

OUTPUT FORMAT (JSON):
{
  "type": "BUILD_COMPONENT | COMPOSITE_UI | MODIFY_COMPONENT",
  "confidence": 0.0-1.0,
  "extracted": {
    "component_name": "Name falls erkennbar",
    "description": "Was genau gebaut/geändert werden soll",
    "features": ["feature1", "feature2"]
  }
}

Antworte NUR mit JSON."""


async def dispatch(config: LLMConfig, request: str, session: aiohttp.ClientSession) -> dict:
    """Klassifiziert einen Request."""
    response = await call_llm(config, DISPATCHER_PROMPT, request, session)
    return json.loads(clean_response(response))


# =============================================================================
# DESIGN TOKENS
# =============================================================================

TOKENS = {
    # Backgrounds
    "$app.bg": "#09090B",
    "$surface.bg": "#18181B",
    "$elevated.bg": "#1A1A23",
    "$overlay.bg": "#27272A",
    "$hover.bg": "#333333",
    "$selected.bg": "#2563EB",
    "$primary.bg": "#3B82F6",

    # Text/Foreground
    "$default.col": "#E4E4E7",
    "$muted.col": "#A1A1AA",
    "$subtle.col": "#71717A",
    "$heading.col": "#F4F4F5",
    "$primary.col": "#3B82F6",

    # Borders
    "$default.bor": "#333333",
    "$subtle.bor": "#3F3F46",

    # Spacing
    "$xs.pad": "4",
    "$sm.pad": "8",
    "$md.pad": "12",
    "$lg.pad": "16",

    "$xs.gap": "4",
    "$sm.gap": "8",
    "$md.gap": "12",
    "$lg.gap": "16",

    # Radius
    "$sm.rad": "4",
    "$md.rad": "6",
    "$lg.rad": "8",

    # Typography
    "$sm.font-size": "12",
    "$default.font-size": "14",
    "$lg.font-size": "16",
}

# Invertiertes Mapping: Wert → Liste von Tokens
VALUE_TO_TOKENS: dict[str, list[str]] = {}
for token, value in TOKENS.items():
    normalized = value.upper() if value.startswith("#") else value
    if normalized not in VALUE_TO_TOKENS:
        VALUE_TO_TOKENS[normalized] = []
    VALUE_TO_TOKENS[normalized].append(token)


def get_token_candidates(value: str, property_type: str) -> list[dict]:
    """
    Deterministisch: Findet Token-Kandidaten für einen Wert.

    Args:
        value: Der CSS-Wert (z.B. "#333333", "8")
        property_type: Der Property-Typ (z.B. "bg", "col", "pad", "bor", "rad", "gap")

    Returns:
        Liste von {token, reason} - gefiltert nach passendem Property-Typ
    """
    # Normalisiere Hex-Werte
    normalized = value.upper() if value.startswith("#") else value.replace("px", "")

    # Finde alle Tokens mit diesem Wert
    all_tokens = VALUE_TO_TOKENS.get(normalized, [])

    # Filtere nach Property-Typ
    candidates = []
    for token in all_tokens:
        # Extrahiere Token-Property aus Namen (z.B. "$hover.bg" → "bg")
        token_parts = token.split(".")
        if len(token_parts) >= 2:
            token_prop = token_parts[-1]

            # Match Property-Typen
            if property_type == "bg" and token_prop == "bg":
                candidates.append({
                    "token": token,
                    "reason": f"Background token mit Wert {value}"
                })
            elif property_type == "col" and token_prop == "col":
                candidates.append({
                    "token": token,
                    "reason": f"Color token mit Wert {value}"
                })
            elif property_type == "bor" and token_prop == "bor":
                candidates.append({
                    "token": token,
                    "reason": f"Border token mit Wert {value}"
                })
            elif property_type == "pad" and token_prop == "pad":
                candidates.append({
                    "token": token,
                    "reason": f"Padding token mit Wert {value}"
                })
            elif property_type == "gap" and token_prop == "gap":
                candidates.append({
                    "token": token,
                    "reason": f"Gap token mit Wert {value}"
                })
            elif property_type == "rad" and token_prop == "rad":
                candidates.append({
                    "token": token,
                    "reason": f"Radius token mit Wert {value}"
                })
            elif property_type == "font-size" and token_prop == "font-size":
                candidates.append({
                    "token": token,
                    "reason": f"Font-size token mit Wert {value}"
                })

    return candidates


def format_candidates_for_llm(candidates_by_prop: dict[str, list[dict]]) -> str:
    """
    Formatiert Token-Kandidaten für LLM-Prompt.

    Das LLM entscheidet dann basierend auf Kontext welcher Token passt.
    """
    if not candidates_by_prop:
        return "(keine Token-Kandidaten)"

    lines = []
    for prop_key, candidates in candidates_by_prop.items():
        if candidates:
            prop, value = prop_key.split(":", 1)
            options = ", ".join([c["token"] for c in candidates])
            lines.append(f"- {prop} {value} → Kandidaten: [{options}]")

    return "\n".join(lines) if lines else "(keine Token-Kandidaten)"


# =============================================================================
# REGISTRY
# =============================================================================

@dataclass
class ComponentDefinition:
    """Eine Komponenten-Definition."""
    name: str
    mirror_code: str
    description: str
    slots: list[str] = field(default_factory=list)
    props: list[str] = field(default_factory=list)


class Registry:
    """Komponenten-Katalog."""

    def __init__(self):
        self.components: dict[str, ComponentDefinition] = {}
        self._load_defaults()

    def _load_defaults(self):
        """Lädt vordefinierte Komponenten."""

        self.add(ComponentDefinition(
            name="StatsCard",
            description="Statistik-Karte mit Titel, Wert und Trend",
            slots=["Title", "Value", "Trend"],
            mirror_code="""StatsCard: ver, gap 4, bg #1A1A23, pad 16, rad 8
  Title: col #A1A1AA, font-size 12, uppercase
  Value: col #F4F4F5, font-size 24, weight bold
  Trend: hor, gap 4, col #22C55E, font-size 12"""
        ))

        self.add(ComponentDefinition(
            name="Sidebar",
            description="Vertikale Navigation mit Logo und Items",
            slots=["Logo", "NavItem"],
            mirror_code="""Sidebar: ver, width 240, height full, bg #18181B, pad 12
  Logo: pad 12 16, font-size 16, weight bold, col #F4F4F5
  NavSection: ver, gap 4
    NavItem: hor, gap 8, pad 8 16, rad 6, col #E4E4E7
      state hover bg #333
      state active bg #2563EB, col white
      NavIcon:
      NavLabel:"""
        ))

        self.add(ComponentDefinition(
            name="Header",
            description="Horizontaler Header mit Titel und Actions",
            slots=["Title", "Subtitle", "Actions"],
            mirror_code="""Header: hor, spread, ver-center, pad 12 16, bg #18181B, bor b 1 #333
  HeaderLeft: ver, gap 2
    Title: col #F4F4F5, font-size 16, weight bold
    Subtitle: col #A1A1AA, font-size 12
  Actions: hor, gap 8"""
        ))

        self.add(ComponentDefinition(
            name="Button",
            description="Klickbarer Button",
            slots=["Icon", "Label"],
            mirror_code="""Button: hor, gap 8, ver-center, bg #2563EB, col white, pad 8 16, rad 6
  state hover bg #1D4ED8
  state disabled opacity 0.5
  Icon:
  Label:"""
        ))

        self.add(ComponentDefinition(
            name="Card",
            description="Container mit Header und Content",
            slots=["CardTitle", "CardContent"],
            mirror_code="""Card: ver, bg #1A1A23, rad 8, bor 1 #333
  CardHeader: hor, spread, ver-center, pad 12 16, bor b 1 #333
    CardTitle: col #F4F4F5, font-size 14, weight 600
  CardContent: pad 16"""
        ))

        self.add(ComponentDefinition(
            name="DataTable",
            description="Tabelle mit Header und Rows",
            slots=["Column", "Row", "Cell"],
            mirror_code="""DataTable: ver, bg #1A1A23, rad 8, bor 1 #333
  TableHeader: hor, bg #18181B, pad 8 16
    Column: col #A1A1AA, font-size 12, weight 600
  TableBody: ver
    Row: hor, pad 8 16, bor b 1 #333
      state hover bg #333
      Cell: col #E4E4E7, font-size 14"""
        ))

    def add(self, component: ComponentDefinition):
        self.components[component.name] = component

    def get(self, name: str) -> Optional[ComponentDefinition]:
        return self.components.get(name)

    def exists(self, name: str) -> bool:
        return name in self.components

    def list_all(self) -> list[str]:
        return list(self.components.keys())

    def get_catalog(self) -> str:
        """Für LLM-Prompts."""
        lines = []
        for name, comp in self.components.items():
            slots = ", ".join(comp.slots) if comp.slots else "keine"
            lines.append(f"- {name}: {comp.description} (Slots: {slots})")
        return "\n".join(lines)


# =============================================================================
# BUILDER - Baut EINE neue Komponente
# =============================================================================

BUILDER_STRUCTURE_PROMPT = """Erstelle HTML-Struktur für eine UI-Komponente.
NUR verschachtelte divs mit class-Namen. KEIN Style, KEIN JS.

Beispiel:
```html
<div class="Dropdown">
  <div class="Trigger">
    <div class="Label"></div>
    <div class="Icon"></div>
  </div>
  <div class="Menu">
    <div class="Item"></div>
  </div>
</div>
```

Antworte NUR mit HTML."""


BUILDER_STYLING_PROMPT = """Schreibe CSS für visuelles Styling.
NUR diese Properties: background, color, padding, border-radius, border, box-shadow, font-size, opacity.

Dunkles Theme:
- Hintergründe: #09090B, #18181B, #1A1A23, #27272A
- Borders: #333333, #3F3F46
- Text: #E4E4E7, #F4F4F5, #A1A1AA
- Akzent: #2563EB, #3B82F6

Antworte NUR mit CSS."""


BUILDER_STATES_PROMPT = """Schreibe CSS für States (hover, selected, etc).
NUR: :hover, :focus, .selected, .highlighted, .hidden
Properties: background, color, border-color, opacity, display.

Antworte NUR mit CSS."""


BUILDER_EVENTS_PROMPT = """Schreibe Event-Config als JavaScript-Objekt.

Format:
```javascript
const events = {
  Trigger: {
    click: ['Menu.classList.toggle("hidden")']
  },
  Item: {
    click: ['this.classList.add("selected")'],
    mouseenter: ['this.classList.add("highlighted")']
  }
};
```

Antworte NUR mit JS."""


TOKEN_SELECTION_PROMPT = """Du wählst Design-Tokens für Mirror-Komponenten aus.

Für jeden Wert wurden passende Token-KANDIDATEN gefunden. Du entscheidest basierend auf dem KONTEXT welcher am besten passt.

KONTEXT-REGELN:
- Hover-States → $hover.bg (nicht $surface.bg)
- Selected-States → $selected.bg
- Popup/Dropdown/Modal-Hintergründe → $elevated.bg
- Haupt-Container → $surface.bg
- Text in Containern → $default.col
- Gedämpfter/sekundärer Text → $muted.col
- Überschriften → $heading.col
- Standard-Borders → $default.bor

OUTPUT FORMAT (JSON):
{
  "selections": [
    {"property": "bg", "value": "#333333", "context": "hover state", "token": "$hover.bg"},
    {"property": "bg", "value": "#1A1A23", "context": "dropdown menu", "token": "$elevated.bg"}
  ]
}

Wenn kein Kandidat passt, diesen Eintrag weglassen.

Antworte NUR mit JSON."""


class Builder:
    """Baut EINE neue Komponente."""

    def __init__(self, config: LLMConfig):
        self.config = config

    async def build(
        self,
        name: str,
        spec: str,
        design: str = "Dunkles Theme"
    ) -> ComponentDefinition:
        """Baut eine Komponente via CSS/JS → Mirror."""

        user_base = f"KOMPONENTE: {name}\nSPEC: {spec}\nDESIGN: {design}"

        async with aiohttp.ClientSession() as session:
            # Phase 1-4: Parallel generieren (LLM)
            tasks = {
                "structure": call_llm(self.config, BUILDER_STRUCTURE_PROMPT,
                                      f"{user_base}\n\nErstelle HTML-Struktur.", session),
                "styling": call_llm(self.config, BUILDER_STYLING_PROMPT,
                                    f"{user_base}\n\nSchreibe Styling-CSS.", session),
                "states": call_llm(self.config, BUILDER_STATES_PROMPT,
                                   f"{user_base}\n\nSchreibe States-CSS.", session),
                "events": call_llm(self.config, BUILDER_EVENTS_PROMPT,
                                   f"{user_base}\n\nSchreibe Events-Config.", session),
            }

            results = {}
            for phase, task in tasks.items():
                try:
                    results[phase] = clean_response(await task)
                except Exception as e:
                    results[phase] = f"// ERROR: {e}"

            # Phase 5: Translate to Mirror (DETERMINISTISCH)
            mirror_parts = []
            collected_values = []  # Sammle alle Werte für Token-Kandidaten

            if "structure" in results:
                mirror_parts.append(self._html_to_mirror(results["structure"]))

            if "styling" in results:
                styling_result = self._css_to_mirror(results["styling"])
                mirror_parts.append(styling_result)
                collected_values.extend(self._collect_values(styling_result, "base"))

            if "states" in results:
                states_result = self._css_to_mirror(results["states"], is_states=True)
                mirror_parts.append(states_result)
                collected_values.extend(self._collect_values(states_result, "state"))

            if "events" in results:
                mirror_parts.append(self._js_to_mirror(results["events"]))

            # Phase 6: Token-Kandidaten finden (DETERMINISTISCH)
            candidates_by_prop = {}
            for val_info in collected_values:
                prop_type = val_info["prop"]
                value = val_info["value"]
                context = val_info["context"]

                candidates = get_token_candidates(value, prop_type)
                if candidates:
                    key = f"{prop_type}:{value}"
                    if key not in candidates_by_prop:
                        candidates_by_prop[key] = {
                            "candidates": candidates,
                            "context": context,
                            "value": value,
                            "prop": prop_type
                        }

            # Phase 7: LLM wählt Tokens aus (nur wenn Kandidaten vorhanden)
            token_selections = {}
            if candidates_by_prop:
                candidates_text = self._format_candidates(candidates_by_prop, name, spec)

                try:
                    token_response = await call_llm(
                        self.config,
                        TOKEN_SELECTION_PROMPT,
                        candidates_text,
                        session
                    )
                    token_data = json.loads(clean_response(token_response))

                    for sel in token_data.get("selections", []):
                        key = f"{sel['property']}:{sel['value']}"
                        token_selections[key] = sel["token"]

                except Exception as e:
                    print(f"    Token selection error: {e}")

        # Merge und Token-Ersetzung
        mirror_code = self._merge_mirror(mirror_parts, name)

        # Wende Token-Selections an (DETERMINISTISCH)
        mirror_code = self._apply_tokens(mirror_code, token_selections)

        # Extract slots from structure
        slots = self._extract_slots(results.get("structure", ""))

        return ComponentDefinition(
            name=name,
            mirror_code=mirror_code,
            description=spec,
            slots=slots
        )

    def _collect_values(self, result: dict, context: str) -> list[dict]:
        """Sammelt alle Property-Werte aus einem Parse-Ergebnis."""
        values = []

        for comp, data in result.get("components", {}).items():
            # Base props
            for prop_str in data.get("props", []):
                parsed = self._parse_prop_value(prop_str)
                if parsed:
                    parsed["context"] = f"{context} - {comp}"
                    values.append(parsed)

            # State props
            for state, state_props in data.get("states", {}).items():
                for prop_str in state_props:
                    parsed = self._parse_prop_value(prop_str)
                    if parsed:
                        parsed["context"] = f"state {state} - {comp}"
                        values.append(parsed)

        return values

    def _parse_prop_value(self, prop_str: str) -> Optional[dict]:
        """Parsed eine Mirror-Property in {prop, value}."""
        parts = prop_str.split(None, 1)
        if len(parts) == 2:
            prop, value = parts
            if prop in ["bg", "col", "boc", "pad", "gap", "rad", "font-size", "bor"]:
                # Bei bor: "1 #333" → nur Farbe extrahieren
                if prop == "bor":
                    bor_parts = value.split()
                    if len(bor_parts) >= 2:
                        return {"prop": "bor", "value": bor_parts[-1]}
                return {"prop": prop, "value": value}
        return None

    def _format_candidates(self, candidates_by_prop: dict, comp_name: str, spec: str) -> str:
        """Formatiert Kandidaten für LLM-Prompt."""
        lines = [
            f"KOMPONENTE: {comp_name}",
            f"BESCHREIBUNG: {spec}",
            "",
            "WERTE MIT TOKEN-KANDIDATEN:"
        ]

        for key, data in candidates_by_prop.items():
            prop = data["prop"]
            value = data["value"]
            context = data["context"]
            options = ", ".join([c["token"] for c in data["candidates"]])
            lines.append(f"- {prop} {value} (Kontext: {context})")
            lines.append(f"  Kandidaten: [{options}]")

        lines.append("")
        lines.append("Wähle für jeden Wert den passenden Token basierend auf Kontext.")

        return "\n".join(lines)

    def _apply_tokens(self, mirror_code: str, selections: dict[str, str]) -> str:
        """Wendet Token-Selections auf Mirror-Code an (DETERMINISTISCH)."""
        result = mirror_code

        for key, token in selections.items():
            _, value = key.split(":", 1)
            # Ersetze Wert durch Token (mit Wortgrenzen)
            # Escape special regex chars in value
            escaped_value = re.escape(value)
            result = re.sub(
                rf'(\s){escaped_value}(\s|,|$)',
                rf'\1{token}\2',
                result,
                flags=re.IGNORECASE
            )

        return result

    def _html_to_mirror(self, html: str) -> dict:
        """HTML → Mirror Struktur."""
        components = {}
        lines = []
        indent = 0

        tags = re.findall(r'<(/?)div\s*(?:class="(\w+)")?\s*/?>', html)
        for closing, class_name in tags:
            if closing:
                indent -= 1
            elif class_name:
                prefix = '  ' * indent
                lines.append(f"{prefix}{class_name}:")
                components[class_name] = {"indent": indent, "children": []}
                indent += 1

        return {"type": "structure", "components": components, "code": "\n".join(lines)}

    def _css_to_mirror(self, css: str, is_states: bool = False) -> dict:
        """CSS → Mirror Properties."""
        components = {}

        rules = re.findall(r'\.([A-Za-z]+)([:\.\w-]*)\s*\{([^}]+)\}', css, re.MULTILINE)

        for comp, modifier, properties in rules:
            if comp not in components:
                components[comp] = {"props": [], "states": {}}

            props = []
            for prop, value in re.findall(r'([\w-]+)\s*:\s*([^;]+);?', properties):
                mirror_prop = self._translate_prop(prop.strip(), value.strip())
                if mirror_prop:
                    props.append(mirror_prop)

            if modifier:
                state = modifier.lstrip(':.')
                if state in ['hover', 'focus', 'active', 'disabled', 'selected', 'highlighted']:
                    components[comp]["states"][state] = props
                elif state == 'hidden' and 'hidden' in props:
                    components[comp]["props"].append("hidden")
            elif not is_states:
                components[comp]["props"].extend(props)

        return {"type": "styling" if not is_states else "states", "components": components}

    def _js_to_mirror(self, js: str) -> dict:
        """JS Events → Mirror."""
        components = {}

        # Parse component blocks
        js_clean = js.strip()
        if 'const events' in js_clean:
            start = js_clean.find('{')
            end = js_clean.rfind('}')
            if start != -1 and end != -1:
                js_clean = js_clean[start+1:end]

        # Find components
        for match in re.finditer(r'(\w+):\s*\{', js_clean):
            comp = match.group(1)
            components[comp] = {"events": []}

            # Find this component's content
            brace_start = match.end() - 1
            brace_count = 1
            pos = brace_start + 1
            while pos < len(js_clean) and brace_count > 0:
                if js_clean[pos] == '{':
                    brace_count += 1
                elif js_clean[pos] == '}':
                    brace_count -= 1
                pos += 1
            content = js_clean[brace_start+1:pos-1]

            # Parse events
            if 'click:' in content:
                actions = self._parse_js_actions(content, 'click')
                if actions:
                    components[comp]["events"].append(f"onclick {actions}")

            if 'clickOutside:' in content:
                actions = self._parse_js_actions(content, 'clickOutside')
                if actions:
                    components[comp]["events"].append(f"onclick-outside {actions}")

            if 'mouseenter:' in content:
                actions = self._parse_js_actions(content, 'mouseenter')
                if actions:
                    components[comp]["events"].append(f"onhover {actions}")

            # Keyboard events
            if 'keydown:' in content:
                key_events = []
                for key in ['Escape', 'ArrowDown', 'ArrowUp', 'Enter']:
                    key_match = re.search(rf'{key}:\s*\[([^\]]+)\]', content)
                    if key_match:
                        actions = self._parse_js_action_list(key_match.group(1))
                        if actions:
                            mirror_key = key.lower().replace('arrow', 'arrow-')
                            key_events.append(f"    {mirror_key} {actions}")
                if key_events:
                    components[comp]["events"].append("  keys")
                    components[comp]["events"].extend(key_events)

        return {"type": "events", "components": components}

    def _parse_js_actions(self, content: str, event: str) -> str:
        match = re.search(rf'{event}:\s*\[([^\]]+)\]', content)
        if match:
            return self._parse_js_action_list(match.group(1))
        return ""

    def _parse_js_action_list(self, actions_str: str) -> str:
        actions = []
        if 'toggle("hidden")' in actions_str:
            match = re.search(r'(\w+)\.classList\.toggle', actions_str)
            if match:
                actions.append(f"toggle {match.group(1)}")
        if 'add("hidden")' in actions_str:
            match = re.search(r'(\w+)\.classList\.add\(["\']hidden', actions_str)
            if match:
                target = match.group(1)
                actions.append("close" if target == "this" else f"hide {target}")
        if 'add("selected")' in actions_str:
            actions.append("select")
        if 'add("highlighted")' in actions_str:
            actions.append("highlight")
        if 'highlightNext()' in actions_str:
            actions.append("highlight next")
        if 'highlightPrev()' in actions_str:
            actions.append("highlight prev")
        if 'selectHighlighted()' in actions_str:
            actions.append("select highlighted")
        return ", ".join(actions)

    def _translate_prop(self, prop: str, value: str) -> Optional[str]:
        """CSS Property → Mirror Property."""
        if prop == 'display' and value == 'none':
            return 'hidden'
        if prop == 'flex-direction':
            return 'hor' if value == 'row' else 'ver'
        if prop == 'gap':
            return f"gap {value.replace('px', '')}"
        if prop == 'justify-content':
            if value == 'space-between': return 'spread'
            if value == 'center': return 'hor-center'
        if prop == 'align-items':
            if value == 'center': return 'ver-center'
        if prop in ['background', 'background-color']:
            return f"bg {value}"
        if prop == 'color':
            return f"col {value}"
        if prop == 'padding':
            return f"pad {value.replace('px', '')}"
        if prop == 'border-radius':
            return f"rad {value.replace('px', '')}"
        if prop == 'border':
            match = re.match(r'(\d+)px\s+solid\s+(#\w+)', value)
            if match:
                return f"bor {match.group(1)} {match.group(2)}"
        if prop == 'font-size':
            return f"font-size {value.replace('px', '')}"
        if prop == 'opacity':
            return f"opacity {value}"
        if prop == 'box-shadow':
            if '4px' in value: return 'shadow sm'
            if '8px' in value: return 'shadow md'
            return 'shadow lg'
        return None

    def _merge_mirror(self, parts: list[dict], root_name: str) -> str:
        """Merged alle Teile zu finalem Mirror-Code."""
        components = {}

        for part in parts:
            if not isinstance(part, dict):
                continue

            for comp, data in part.get("components", {}).items():
                if comp not in components:
                    components[comp] = {"props": [], "states": {}, "events": [], "children": []}

                if "props" in data:
                    components[comp]["props"].extend(data["props"])
                if "states" in data:
                    for state, props in data["states"].items():
                        if state not in components[comp]["states"]:
                            components[comp]["states"][state] = []
                        components[comp]["states"][state].extend(props)
                if "events" in data:
                    components[comp]["events"].extend(data["events"])

        # Generate output
        lines = []
        for comp, data in components.items():
            props = list(dict.fromkeys(data["props"]))  # Dedupe
            states = data["states"]
            events = data["events"]

            if states or events:
                if props:
                    lines.append(f"{comp}: {', '.join(props)}")
                else:
                    lines.append(f"{comp}:")
                for state, state_props in states.items():
                    unique_props = list(dict.fromkeys(state_props))
                    lines.append(f"  state {state} {', '.join(unique_props)}")
                for event in events:
                    lines.append(f"  {event}")
            elif props:
                lines.append(f"{comp}: {', '.join(props)}")

        return "\n".join(lines)

    def _extract_slots(self, html: str) -> list[str]:
        """Extrahiert Slot-Namen aus HTML."""
        slots = []
        for match in re.finditer(r'class="(\w+)"', html):
            name = match.group(1)
            if name[0].isupper():
                slots.append(name)
        return slots[1:] if slots else []  # Skip root


# =============================================================================
# APPLIER - Instanziiert EINE Komponente (DETERMINISTISCH)
# =============================================================================

class Applier:
    """Instanziiert EINE Komponente. Komplett deterministisch - kein LLM."""

    def __init__(self, config: LLMConfig = None):
        # Config nicht mehr benötigt, aber für API-Kompatibilität behalten
        self.config = config

    def apply(
        self,
        definition: ComponentDefinition,
        slots: dict[str, str],
        children_code: list[str] = None
    ) -> str:
        """
        Instanziiert eine Komponente mit Slot-Werten.

        Komplett deterministisch:
        - Komponenten-Name
        - Slots mit Werten füllen
        - Kinder einrücken und anfügen
        """
        lines = [definition.name]

        # Slots füllen
        for slot_name, slot_value in slots.items():
            formatted = self._format_slot_value(slot_name, slot_value)
            if formatted:
                lines.extend(formatted)

        # Kinder anfügen (bereits instanziiert, nur einrücken)
        if children_code:
            for child in children_code:
                for line in child.split("\n"):
                    if line.strip():  # Leere Zeilen ignorieren
                        lines.append(f"  {line}")

        return "\n".join(lines)

    def _format_slot_value(self, slot_name: str, value: any) -> list[str]:
        """Formatiert einen Slot-Wert zu Mirror-Syntax."""

        # String → einfache Zuweisung
        if isinstance(value, str):
            return [f"  {slot_name} \"{value}\""]

        # Liste → mehrere Instanzen mit - Prefix
        if isinstance(value, list):
            lines = []
            for item in value:
                if isinstance(item, dict):
                    # Liste von Objekten → Instanzen mit Slot-Overrides
                    # z.B. [{"Name": "John", "Email": "john@x.com"}]
                    # → - Row Name "John"; Email "john@x.com"
                    overrides = "; ".join([f'{k} "{v}"' for k, v in item.items()])
                    lines.append(f"  - {slot_name} {overrides}")
                else:
                    # Einfache Liste → mehrere Items
                    lines.append(f"  - {slot_name} \"{item}\"")
            return lines

        # Dict → verschachtelte Slots (sollte selten vorkommen)
        if isinstance(value, dict):
            lines = [f"  {slot_name}"]
            for k, v in value.items():
                if isinstance(v, str):
                    lines.append(f"    {k} \"{v}\"")
                else:
                    lines.append(f"    {k} {v}")
            return lines

        # Fallback
        return [f"  {slot_name} {value}"]

    # Async-Wrapper für Kompatibilität mit bestehendem Code
    async def apply_async(
        self,
        definition: ComponentDefinition,
        slots: dict[str, str],
        children_code: list[str] = None
    ) -> str:
        """Async-Wrapper für apply (für Kompatibilität)."""
        return self.apply(definition, slots, children_code)


# =============================================================================
# PROCESSOR - Rekursive Verarbeitung
# =============================================================================

@dataclass
class UINode:
    """Ein Knoten in der UI-Hierarchie."""
    component: str
    exists: bool = True
    spec: str = ""
    layout: str = ""  # Für Layout-Container: "ver", "hor", "grid 3", etc.
    slots: dict = field(default_factory=dict)
    children: list = field(default_factory=list)
    instances: int = 1


class Processor:
    """Rekursive UI-Verarbeitung."""

    def __init__(self, config: LLMConfig, registry: Registry):
        self.config = config
        self.registry = registry
        self.builder = Builder(config)
        self.applier = Applier(config)
        self.built_definitions = []  # Neue Definitionen sammeln

    async def process(self, node: UINode, content: dict = None) -> str:
        """Verarbeitet einen UI-Knoten rekursiv."""
        content = content or {}

        # Bestimme Status
        is_layout_container = bool(node.layout) and not node.exists
        status = "layout" if is_layout_container else ("exists" if node.exists or self.registry.exists(node.component) else "NEW")
        print(f"  Processing: {node.component} ({status})")

        # 1. Komponente holen/bauen
        if self.registry.exists(node.component):
            definition = self.registry.get(node.component)
        elif is_layout_container:
            # Layout-Container: Direkt generieren, kein Builder nötig
            layout_props = node.layout if node.layout else "ver"
            definition = ComponentDefinition(
                name=node.component,
                mirror_code=f"{node.component}: {layout_props}",
                description=f"Layout container ({layout_props})",
                slots=[]
            )
            self.registry.add(definition)
            self.built_definitions.append(definition)
            print(f"    Created layout: {node.component}: {layout_props}")
        else:
            print(f"    Building {node.component}...")
            definition = await self.builder.build(
                node.component,
                node.spec or f"Eine {node.component} Komponente"
            )
            self.registry.add(definition)
            self.built_definitions.append(definition)

        # 2. Kinder rekursiv verarbeiten
        children_code = []
        for child in node.children:
            child_result = await self.process(child, content)
            children_code.append(child_result)

        # 3. Slots aus Content extrahieren
        slots = node.slots.copy()
        if node.component in content:
            slots.update(content[node.component])

        # 4. Instanz(en) erstellen (deterministisch, kein await)
        if node.instances > 1:
            # Mehrere Instanzen (z.B. 3 StatsCards)
            instances = []
            instance_data = content.get(f"{node.component}_instances", [])
            for i in range(node.instances):
                instance_slots = instance_data[i] if i < len(instance_data) else slots
                instance = self.applier.apply(definition, instance_slots, None)
                instances.append(instance)
            return "\n".join(instances)
        else:
            return self.applier.apply(definition, slots, children_code)


# =============================================================================
# ORCHESTRATOR
# =============================================================================

ORCHESTRATOR_PROMPT = """Du analysierst UI-Anfragen und erstellst eine Komponenten-Hierarchie.

VERFÜGBARE KOMPONENTEN UND IHRE SLOTS:
- Sidebar: Logo, NavItem (NavItem hat: NavIcon, NavLabel)
- Header: Title, Subtitle, Actions
- StatsCard: Title, Value, Trend
- Card: CardTitle, CardContent
- DataTable: Column, Row (Row hat: Cell)
- Button: Icon, Label

LAYOUT-CONTAINER (werden automatisch erstellt):
Wenn du Container für Layout brauchst (z.B. "MainContent", "StatsGrid"),
markiere sie mit exists: false und layout: "ver" oder "hor" oder "grid N".

OUTPUT FORMAT (JSON):
{
  "analysis": "Kurze Analyse der UI-Struktur",
  "hierarchy": {
    "component": "PageName",
    "layout": "hor",
    "children": [
      {
        "component": "Sidebar",
        "exists": true,
        "slots": {"Logo": "Acme Inc"},
        "children": [
          {
            "component": "NavItem",
            "exists": true,
            "instances": 3
          }
        ]
      },
      {
        "component": "MainArea",
        "layout": "ver",
        "children": [
          {"component": "Header", "exists": true},
          {
            "component": "StatsRow",
            "layout": "hor, gap 16",
            "children": [
              {"component": "StatsCard", "exists": true, "instances": 3}
            ]
          }
        ]
      }
    ]
  },
  "content": {
    "Header": {"Title": "Dashboard", "Subtitle": "Welcome back"},
    "NavItem_instances": [
      {"NavIcon": "home", "NavLabel": "Dashboard"},
      {"NavIcon": "users", "NavLabel": "Users"},
      {"NavIcon": "settings", "NavLabel": "Settings"}
    ],
    "StatsCard_instances": [
      {"Title": "Users", "Value": "12,345", "Trend": "+12%"},
      {"Title": "Revenue", "Value": "$45,678", "Trend": "+8%"},
      {"Title": "Orders", "Value": "234", "Trend": "-3%"}
    ]
  }
}

WICHTIGE REGELN:
1. exists: true NUR wenn Komponente in der Liste oben steht
2. layout: Für Container die NICHT existieren - wird zu "Component: layout" (z.B. "MainArea: ver")
3. instances: Anzahl gleicher Komponenten
4. content: EXAKTE Slot-Namen verwenden!
   - NavItem braucht: NavIcon, NavLabel (NICHT "label" oder "icon"!)
   - Header braucht: Title, Subtitle
   - StatsCard braucht: Title, Value, Trend
5. Verschachtelte Komponenten: NavItem ist KIND von Sidebar, nicht separat

Antworte NUR mit validem JSON."""


class Orchestrator:
    """Koordiniert den gesamten Flow."""

    def __init__(self, config: LLMConfig, registry: Registry):
        self.config = config
        self.registry = registry
        self.processor = Processor(config, registry)

    async def generate(self, request: str, content_hint: str = "") -> dict:
        """Generiert UI aus Request."""

        print("=" * 60)
        print("MIRROR GENERATOR")
        print("=" * 60)

        async with aiohttp.ClientSession() as session:
            # 1. Dispatch
            print("\n[1/3] Klassifiziere Request...")
            dispatch_result = await dispatch(self.config, request, session)
            print(f"  Type: {dispatch_result['type']}")
            print(f"  Confidence: {dispatch_result['confidence']}")

            # 2. Für COMPOSITE_UI: Hierarchie analysieren
            if dispatch_result["type"] == "COMPOSITE_UI":
                print("\n[2/3] Analysiere UI-Hierarchie...")

                catalog = self.registry.get_catalog()
                user_prompt = f"""ANFRAGE: {request}

VERFÜGBARE KOMPONENTEN:
{catalog}

ZUSÄTZLICHE INFOS:
{content_hint}

Analysiere und erstelle Hierarchie."""

                response = await call_llm(
                    self.config,
                    ORCHESTRATOR_PROMPT,
                    user_prompt,
                    session
                )
                plan = json.loads(clean_response(response))

                print(f"  Analyse: {plan.get('analysis', '-')}")

                # 3. Rekursiv verarbeiten
                print("\n[3/3] Verarbeite Hierarchie...")

                hierarchy = self._dict_to_node(plan["hierarchy"])
                content = plan.get("content", {})

                instance_code = await self.processor.process(hierarchy, content)

                # Kombiniere Output - OHNE Duplikate

                # Namen der neu gebauten Komponenten
                built_names = {d.name for d in self.processor.built_definitions}

                # Existierende Definitionen (die NICHT neu gebaut wurden)
                existing_defs = []
                seen_codes = set()
                for comp_name in self._collect_components(plan["hierarchy"]):
                    # Skip wenn neu gebaut
                    if comp_name in built_names:
                        continue
                    # Skip wenn nicht in Registry (sollte nicht passieren)
                    if not self.registry.exists(comp_name):
                        continue
                    comp = self.registry.get(comp_name)
                    # Skip Duplikate
                    if comp.mirror_code in seen_codes:
                        continue
                    seen_codes.add(comp.mirror_code)
                    existing_defs.append(comp.mirror_code)

                # Neu gebaute Definitionen (bereinigt)
                built_defs = []
                for d in self.processor.built_definitions:
                    cleaned = self._clean_definition(d.mirror_code, d.name)
                    # Skip leere oder triviale Definitionen (nur "Name: ver" etc.)
                    if not cleaned:
                        continue
                    if re.match(rf'^{d.name}:\s*(ver|hor|grid\s*\d*)?\s*$', cleaned.strip()):
                        continue
                    if cleaned not in seen_codes:
                        seen_codes.add(cleaned)
                        built_defs.append(cleaned)

                # Kombiniere: Erst existierende, dann neue
                all_definitions = "\n\n".join(existing_defs + built_defs)

                # Post-Processing: Bekannte Fehler korrigieren
                instance_code = self._post_process(instance_code)

                final_code = f"""// Component Definitions
{all_definitions}

// Page
{instance_code}"""

                return {
                    "type": dispatch_result["type"],
                    "plan": plan,
                    "definitions": all_definitions,
                    "instances": instance_code,
                    "final_code": final_code
                }

            # Für BUILD_COMPONENT
            elif dispatch_result["type"] == "BUILD_COMPONENT":
                print("\n[2/3] Baue Komponente...")

                extracted = dispatch_result.get("extracted", {})
                name = extracted.get("component_name", "Component")
                desc = extracted.get("description", request)

                definition = await self.processor.builder.build(name, desc)
                self.registry.add(definition)

                return {
                    "type": dispatch_result["type"],
                    "definition": definition,
                    "final_code": definition.mirror_code
                }

            # Für MODIFY_COMPONENT
            else:
                return {
                    "type": dispatch_result["type"],
                    "message": "MODIFY_COMPONENT nicht implementiert in Prototype"
                }

    def _dict_to_node(self, d: dict) -> UINode:
        """Konvertiert Dict zu UINode."""
        children = [self._dict_to_node(c) for c in d.get("children", [])]
        return UINode(
            component=d["component"],
            exists=d.get("exists", True),
            spec=d.get("spec", ""),
            layout=d.get("layout", ""),
            slots=d.get("slots", {}),
            children=children,
            instances=d.get("instances", 1)
        )

    def _collect_components(self, d: dict) -> list[str]:
        """Sammelt alle Komponenten-Namen."""
        names = [d["component"]]
        for child in d.get("children", []):
            names.extend(self._collect_components(child))
        return names

    def _post_process(self, code: str) -> str:
        """
        Korrigiert bekannte LLM-Fehler im generierten Code.
        """
        lines = code.split('\n')
        result = []

        # Slot-Name Korrekturen (case-insensitive matching)
        slot_corrections = {
            # NavItem Slots
            'label': 'NavLabel',
            'icon': 'NavIcon',
            'navicon': 'NavIcon',
            'navlabel': 'NavLabel',
            # Header Slots
            'title': 'Title',
            'subtitle': 'Subtitle',
            # StatsCard Slots
            'value': 'Value',
            'trend': 'Trend',
            # Card Slots
            'cardtitle': 'CardTitle',
            'cardcontent': 'CardContent',
            # Button Slots
            'buttonlabel': 'Label',
            'buttonicon': 'Icon',
        }

        # Patterns die übersprungen werden sollen
        skip_patterns = [
            r'\s+active\s+(True|False)',      # active True/False
            r'\s+type\s+"',                    # type "..."
            r'\s+href\s+"',                    # href "..."
            r'\s+\w+\s+""$',                   # Leere Zuweisungen
            r'_instances\s',                   # *_instances (LLM-Fehler)
            r"Cell_instances",                 # Cell_instances
            r"Row_instances",                  # Row_instances
            r"Column_instances",               # Column_instances
            r"\['.+'\]",                       # Python-Listen ['...']
        ]

        for line in lines:
            corrected = line

            # Skip Zeilen mit bekannten Fehlern
            should_skip = False
            for pattern in skip_patterns:
                if re.search(pattern, corrected):
                    should_skip = True
                    break
            if should_skip:
                continue

            # Korrigiere Slot-Namen am Zeilenanfang (mit Einrückung)
            for wrong, correct in slot_corrections.items():
                # Match: "  label " oder "  label\n" (am Anfang nach Einrückung)
                pattern = rf'^(\s+){wrong}\s'
                if re.match(pattern, corrected, re.IGNORECASE):
                    corrected = re.sub(pattern, rf'\1{correct} ', corrected, flags=re.IGNORECASE)

            result.append(corrected)

        return '\n'.join(result)

    def _clean_definition(self, code: str, expected_name: str) -> str:
        """
        Bereinigt eine Komponenten-Definition:
        - Entfernt Zeilen mit lowercase Komponentennamen (Artefakte vom LLM)
        - Entfernt leere state-Zeilen
        - Behält nur die Haupt-Komponente (expected_name)
        """
        lines = code.split('\n')
        cleaned_lines = []
        current_component = None
        current_indent = 0
        in_expected_component = False

        for line in lines:
            stripped = line.strip()

            # Leere Zeilen nur behalten wenn wir in der erwarteten Komponente sind
            if not stripped:
                if in_expected_component and cleaned_lines and cleaned_lines[-1].strip():
                    cleaned_lines.append("")
                continue

            # Berechne Einrückung
            indent = len(line) - len(line.lstrip())

            # Prüfe ob es eine Komponenten-Definition ist (Name:)
            if ':' in stripped and not stripped.startswith('state ') and not stripped.startswith('on'):
                name_part = stripped.split(':')[0].strip()

                # Skip lowercase Komponentennamen (LLM-Artefakte wie "button:", "modal:")
                if name_part and name_part[0].islower():
                    current_component = None
                    in_expected_component = False
                    continue

                # Ist es die erwartete Haupt-Komponente? (auf Root-Level oder bekannt)
                if indent == 0:
                    if name_part == expected_name:
                        in_expected_component = True
                        current_component = name_part
                        current_indent = indent
                    else:
                        # Andere Root-Level Komponente → Skip
                        in_expected_component = False
                        current_component = name_part
                        continue

            # Skip wenn nicht in der erwarteten Komponente
            if not in_expected_component:
                continue

            # Skip leere state-Zeilen wie "state focus" (ohne Properties)
            if stripped.startswith('state ') and stripped.count(' ') == 1:
                continue

            cleaned_lines.append(line)

        # Entferne trailing leere Zeilen
        while cleaned_lines and not cleaned_lines[-1].strip():
            cleaned_lines.pop()

        # Wenn nichts übrig: Leerer String (wird gefiltert)
        if not cleaned_lines:
            return ""

        return '\n'.join(cleaned_lines)


# =============================================================================
# TEST CASES - ERWEITERT
# =============================================================================

# Dispatcher Tests - verschiedene Formulierungen und Edge Cases
TEST_DISPATCHER_REQUESTS = [
    # BUILD_COMPONENT - Eindeutig
    ("Erstelle einen Dropdown", "BUILD_COMPONENT"),
    ("Baue einen Button mit Loading-State", "BUILD_COMPONENT"),
    ("Ich brauche eine Tabs-Komponente", "BUILD_COMPONENT"),
    ("Mach mir ein Accordion", "BUILD_COMPONENT"),
    ("Carousel/Slider Komponente", "BUILD_COMPONENT"),
    ("Tooltip das bei hover erscheint", "BUILD_COMPONENT"),
    ("Breadcrumb Navigation", "BUILD_COMPONENT"),
    ("Avatar mit Status-Indikator", "BUILD_COMPONENT"),
    ("Progress Bar", "BUILD_COMPONENT"),
    ("Toggle Switch", "BUILD_COMPONENT"),

    # BUILD_COMPONENT - Grenzfälle
    ("Eine einfache Card", "BUILD_COMPONENT"),
    ("Notification Badge", "BUILD_COMPONENT"),
    ("Search Input mit Icon", "BUILD_COMPONENT"),

    # COMPOSITE_UI - Eindeutig
    ("Dashboard mit Sidebar und Stats", "COMPOSITE_UI"),
    ("Login-Seite mit Form und Social-Buttons", "COMPOSITE_UI"),
    ("Baue ein Dashboard mit Navigation, Header und 3 Statistik-Karten", "COMPOSITE_UI"),
    ("Settings Page mit Tabs und Formularen", "COMPOSITE_UI"),
    ("E-Commerce Produktseite mit Bildern, Beschreibung und Kaufen-Button", "COMPOSITE_UI"),
    ("Blog Layout mit Sidebar und Artikel-Liste", "COMPOSITE_UI"),
    ("Profil-Seite mit Avatar, Stats und Activity Feed", "COMPOSITE_UI"),
    ("Admin Panel mit Table und Filters", "COMPOSITE_UI"),

    # COMPOSITE_UI - Grenzfälle
    ("Komplettes Formular mit mehreren Feldern und Validierung", "COMPOSITE_UI"),
    ("Navigation mit Suche und User-Menu", "COMPOSITE_UI"),
    ("Landing Page Hero Section", "COMPOSITE_UI"),

    # MODIFY_COMPONENT - Eindeutig
    ("Füge hover-state zum Button hinzu", "MODIFY_COMPONENT"),
    ("Ändere die Farbe des Headers", "MODIFY_COMPONENT"),
    ("Mach den Dropdown größer", "MODIFY_COMPONENT"),
    ("Füge Animation zum Modal hinzu", "MODIFY_COMPONENT"),
    ("Ändere den Border-Radius der Card", "MODIFY_COMPONENT"),
    ("Mach den Text im Button bold", "MODIFY_COMPONENT"),
    ("Füge disabled state hinzu", "MODIFY_COMPONENT"),
    ("Erhöhe das Padding", "MODIFY_COMPONENT"),

    # MODIFY_COMPONENT - Grenzfälle
    ("Der Button soll blau sein", "MODIFY_COMPONENT"),
    ("Mehr Abstand zwischen den Items", "MODIFY_COMPONENT"),
    ("Icon soll links statt rechts sein", "MODIFY_COMPONENT"),
]

# Builder Tests - verschiedene Komponenten-Typen
TEST_BUILDER_COMPONENTS = [
    # Einfache Komponenten
    ("Button", "Button mit Icon und Label. Hover und Disabled State."),
    ("Badge", "Kleines Label für Status/Count. Verschiedene Farben (success, warning, error)."),
    ("Avatar", "Rundes Bild mit optionalem Status-Punkt (online/offline)."),
    ("Toggle", "Switch zum An/Ausschalten. Mit Animation."),

    # Mittlere Komplexität
    ("Dropdown", "Dropdown mit Trigger, Menu und Items. Keyboard-Navigation (Pfeiltasten, Enter, Escape)."),
    ("Tooltip", "Erscheint bei Hover über Trigger. Pfeil zeigt zum Trigger. Verschiedene Positionen."),
    ("Accordion", "Ausklappbare Sektionen. Nur eine offen oder mehrere. Mit Icon-Rotation."),
    ("Tabs", "Tab-Navigation mit TabList und TabPanels. Aktiver Tab hervorgehoben."),

    # Komplexe Komponenten
    ("Modal", "Dialog mit Overlay, Header, Content und Footer. Close-Button und Escape. Animation."),
    ("Toast", "Notification die erscheint und verschwindet. Verschiedene Typen (success, error, info)."),
    ("Combobox", "Input mit Dropdown-Suggestions. Filtering während Tippen. Keyboard-Navigation."),
    ("DatePicker", "Kalender-Popup zum Datum auswählen. Navigation zwischen Monaten."),
]

# Applier Tests - verschiedene Slot-Kombinationen
TEST_APPLIER_CASES = [
    # Einfache Slots
    {
        "component": "StatsCard",
        "slots": {"Title": "Total Users", "Value": "12,345", "Trend": "+12%"},
        "children": None,
        "description": "Alle Slots gefüllt"
    },
    {
        "component": "Button",
        "slots": {"Label": "Click Me"},
        "children": None,
        "description": "Nur Label, kein Icon"
    },
    {
        "component": "Button",
        "slots": {"Icon": "plus", "Label": "Add New"},
        "children": None,
        "description": "Icon und Label"
    },

    # Mit Kindern
    {
        "component": "Card",
        "slots": {"CardTitle": "Recent Activity"},
        "children": ["StatsCard\n  Title \"Users\"\n  Value \"123\""],
        "description": "Card mit StatsCard Kind"
    },
    {
        "component": "Header",
        "slots": {"Title": "Dashboard", "Subtitle": "Welcome back"},
        "children": ["Button\n  Label \"Export\"", "Button\n  Label \"Settings\""],
        "description": "Header mit zwei Button-Kindern"
    },

    # Leere/Partielle Slots
    {
        "component": "StatsCard",
        "slots": {"Title": "Revenue", "Value": "$0"},
        "children": None,
        "description": "Ohne Trend"
    },
    {
        "component": "Header",
        "slots": {"Title": "Simple Header"},
        "children": None,
        "description": "Nur Title, kein Subtitle"
    },

    # Verschachtelte Kinder
    {
        "component": "Card",
        "slots": {"CardTitle": "Nested Test"},
        "children": [
            "Header\n  Title \"Inner Header\"",
            "DataTable\n  Column \"Name\"\n  Column \"Value\""
        ],
        "description": "Mehrere verschiedene Kinder"
    },
]

# Full Flow Tests - verschiedene UI-Szenarien
TEST_FULL_FLOW_SCENARIOS = [
    {
        "name": "Admin Dashboard",
        "request": """
        Baue ein Admin Dashboard mit:
        - Sidebar links mit Logo und Navigation (Dashboard, Users, Products, Orders, Settings)
        - Header oben mit Titel und User-Avatar
        - 4 Statistik-Karten (Users, Revenue, Orders, Conversion Rate)
        - Eine Tabelle mit den letzten Bestellungen
        """,
        "content": """
        Logo: "Acme Admin"
        Stats:
        - Users: 12,345 (+12%)
        - Revenue: $45,678 (+8%)
        - Orders: 1,234 (+5%)
        - Conversion: 3.2% (-0.5%)

        Recent Orders:
        - John Doe, $123.45, Completed
        - Jane Smith, $67.89, Pending
        - Bob Wilson, $234.56, Shipped
        """
    },
    {
        "name": "Settings Page",
        "request": """
        Settings Seite mit:
        - Header mit "Settings" Titel
        - Sidebar/Navigation mit Kategorien (Profile, Security, Notifications, Billing)
        - Hauptbereich mit Formular-Feldern
        - Save und Cancel Buttons unten
        """,
        "content": """
        Categories: Profile, Security, Notifications, Billing
        Current: Profile
        Fields: Name, Email, Bio
        """
    },
    {
        "name": "E-Commerce Product",
        "request": """
        Produktseite für E-Commerce:
        - Header mit Logo und Warenkorb-Icon
        - Produktbild links
        - Rechts: Titel, Preis, Beschreibung, Größen-Auswahl, "Add to Cart" Button
        - Unten: Ähnliche Produkte (3 Cards)
        """,
        "content": """
        Product: "Premium T-Shirt"
        Price: $29.99
        Description: "Comfortable cotton t-shirt"
        Sizes: S, M, L, XL
        Similar: Product 1, Product 2, Product 3
        """
    },
    {
        "name": "Simple Login",
        "request": """
        Login-Seite:
        - Zentrierte Card
        - Logo oben
        - Email und Password Inputs
        - "Remember me" Checkbox
        - Login Button
        - "Forgot Password?" Link
        """,
        "content": """
        Logo: "MyApp"
        """
    },
]


async def test_dispatcher(config: LLMConfig):
    """Testet Dispatcher-Genauigkeit mit erweiterten Cases."""
    print("\n" + "=" * 60)
    print("TEST: DISPATCHER (ERWEITERT)")
    print("=" * 60)

    correct = 0
    total = len(TEST_DISPATCHER_REQUESTS)
    failures = []

    async with aiohttp.ClientSession() as session:
        for request, expected in TEST_DISPATCHER_REQUESTS:
            result = await dispatch(config, request, session)
            actual = result["type"]
            is_correct = actual == expected

            status = "OK" if is_correct else "FAIL"
            print(f"[{status}] \"{request[:50]}{'...' if len(request) > 50 else ''}\"")

            if is_correct:
                correct += 1
            else:
                failures.append({
                    "request": request,
                    "expected": expected,
                    "got": actual,
                    "confidence": result["confidence"]
                })

    accuracy = correct / total * 100
    print(f"\n{'=' * 60}")
    print(f"DISPATCHER ACCURACY: {correct}/{total} ({accuracy:.1f}%)")

    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for f in failures:
            print(f"  - \"{f['request']}\"")
            print(f"    Expected: {f['expected']}, Got: {f['got']} ({f['confidence']})")

    print("=" * 60)
    return accuracy >= 85  # 85% ist gut für erweiterte Tests


async def test_builder(config: LLMConfig):
    """Testet Builder mit verschiedenen Komponenten-Typen."""
    print("\n" + "=" * 60)
    print("TEST: BUILDER (ERWEITERT)")
    print("=" * 60)

    builder = Builder(config)
    results = []

    for name, spec in TEST_BUILDER_COMPONENTS:
        print(f"\nBuilding: {name}...")
        print(f"  Spec: {spec[:60]}...")
        try:
            definition = await builder.build(name, spec)

            # Validierung
            has_code = len(definition.mirror_code) > 20
            has_structure = ":" in definition.mirror_code
            uses_tokens = "$" in definition.mirror_code

            print(f"  ✓ Slots: {definition.slots[:5]}{'...' if len(definition.slots) > 5 else ''}")
            print(f"  ✓ Code length: {len(definition.mirror_code)} chars")
            print(f"  ✓ Has structure: {has_structure}")
            print(f"  ✓ Uses tokens: {uses_tokens}")

            results.append({
                "name": name,
                "success": True,
                "definition": definition,
                "has_structure": has_structure,
                "uses_tokens": uses_tokens
            })
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })

    success = sum(1 for r in results if r["success"])
    with_tokens = sum(1 for r in results if r.get("uses_tokens", False))

    print(f"\n{'=' * 60}")
    print(f"BUILDER SUCCESS: {success}/{len(TEST_BUILDER_COMPONENTS)}")
    print(f"WITH TOKENS: {with_tokens}/{len(TEST_BUILDER_COMPONENTS)}")
    print("=" * 60)

    return results


async def test_applier(config: LLMConfig):
    """Testet Applier mit verschiedenen Szenarien (deterministisch)."""
    print("\n" + "=" * 60)
    print("TEST: APPLIER (DETERMINISTISCH)")
    print("=" * 60)

    registry = Registry()
    applier = Applier()

    results = []

    for case in TEST_APPLIER_CASES:
        comp_name = case["component"]
        slots = case["slots"]
        children = case["children"]
        desc = case["description"]

        print(f"\n{desc}...")
        print(f"  Component: {comp_name}")
        print(f"  Slots: {slots}")

        definition = registry.get(comp_name)
        if not definition:
            print(f"  ✗ Component not in registry!")
            results.append({"case": desc, "success": False, "error": "Not in registry"})
            continue

        try:
            instance = applier.apply(definition, slots, children)

            # Validierung
            has_component_name = comp_name in instance
            has_slots = all(f'"{v}"' in instance for v in slots.values() if isinstance(v, str))
            proper_indent = "\n  " in instance or len(slots) == 0

            print(f"  ✓ Output:\n{instance}")
            print(f"  ✓ Has component name: {has_component_name}")
            print(f"  ✓ Has all slot values: {has_slots}")

            results.append({
                "case": desc,
                "success": True,
                "instance": instance,
                "valid": has_component_name and has_slots
            })
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            results.append({"case": desc, "success": False, "error": str(e)})

    success = sum(1 for r in results if r["success"])
    valid = sum(1 for r in results if r.get("valid", False))

    print(f"\n{'=' * 60}")
    print(f"APPLIER SUCCESS: {success}/{len(TEST_APPLIER_CASES)}")
    print(f"VALID OUTPUT: {valid}/{len(TEST_APPLIER_CASES)}")
    print("=" * 60)

    return results


async def test_full_flow(config: LLMConfig):
    """Testet vollständigen Flow mit verschiedenen Szenarien."""
    print("\n" + "=" * 60)
    print("TEST: FULL FLOW")
    print("=" * 60)

    # Default: Erstes Szenario
    scenario = TEST_FULL_FLOW_SCENARIOS[0]

    print(f"\nScenario: {scenario['name']}")
    print(f"Request: {scenario['request'][:100]}...")

    registry = Registry()
    orchestrator = Orchestrator(config, registry)

    result = await orchestrator.generate(scenario["request"], scenario["content"])

    print("\n" + "=" * 60)
    print("FINAL OUTPUT:")
    print("=" * 60)
    print(result.get("final_code", "No output"))

    # Save to file
    output_path = os.path.join(os.path.dirname(__file__), "generated-test.mirror")
    with open(output_path, "w") as f:
        f.write(result.get("final_code", ""))
    print(f"\nSaved to: {output_path}")

    return result


async def test_full_flow_all(config: LLMConfig):
    """Testet alle Full Flow Szenarien."""
    print("\n" + "=" * 60)
    print("TEST: ALL FULL FLOW SCENARIOS")
    print("=" * 60)

    results = []

    for i, scenario in enumerate(TEST_FULL_FLOW_SCENARIOS):
        print(f"\n{'='*60}")
        print(f"SCENARIO {i+1}/{len(TEST_FULL_FLOW_SCENARIOS)}: {scenario['name']}")
        print("="*60)

        registry = Registry()
        orchestrator = Orchestrator(config, registry)

        try:
            result = await orchestrator.generate(scenario["request"], scenario["content"])

            final_code = result.get("final_code", "")

            # Validierung
            has_definitions = "// Component Definitions" in final_code
            has_page = "// Page" in final_code
            has_content = len(final_code) > 100

            print(f"\n✓ Generated {len(final_code)} chars")
            print(f"✓ Has definitions: {has_definitions}")
            print(f"✓ Has page: {has_page}")

            # Save individual file
            safe_name = scenario["name"].lower().replace(" ", "-")
            output_path = os.path.join(os.path.dirname(__file__), f"generated-{safe_name}.mirror")
            with open(output_path, "w") as f:
                f.write(final_code)
            print(f"✓ Saved to: {output_path}")

            results.append({
                "name": scenario["name"],
                "success": True,
                "code_length": len(final_code),
                "has_definitions": has_definitions,
                "has_page": has_page
            })
        except Exception as e:
            print(f"\n✗ ERROR: {e}")
            results.append({
                "name": scenario["name"],
                "success": False,
                "error": str(e)
            })

    success = sum(1 for r in results if r["success"])
    print(f"\n{'=' * 60}")
    print(f"FULL FLOW SUCCESS: {success}/{len(TEST_FULL_FLOW_SCENARIOS)}")
    for r in results:
        status = "✓" if r["success"] else "✗"
        print(f"  {status} {r['name']}")
    print("=" * 60)

    return results


async def test_token_candidates():
    """Testet Token-Kandidaten-Filterung (deterministisch, kein LLM)."""
    print("\n" + "=" * 60)
    print("TEST: TOKEN CANDIDATES (DETERMINISTISCH)")
    print("=" * 60)

    test_cases = [
        # (value, property_type, expected_candidates)
        ("#333333", "bg", ["$hover.bg"]),
        ("#333333", "bor", ["$default.bor"]),
        ("#18181B", "bg", ["$surface.bg"]),
        ("#1A1A23", "bg", ["$elevated.bg"]),
        ("#E4E4E7", "col", ["$default.col"]),
        ("#A1A1AA", "col", ["$muted.col"]),
        ("#2563EB", "bg", ["$selected.bg"]),
        ("8", "pad", ["$sm.pad"]),
        ("8", "gap", ["$sm.gap"]),
        ("6", "rad", ["$md.rad"]),
        ("14", "font-size", ["$default.font-size"]),
        # Keine Kandidaten
        ("#FF0000", "bg", []),
        ("100", "pad", []),
    ]

    correct = 0
    for value, prop, expected in test_cases:
        candidates = get_token_candidates(value, prop)
        found_tokens = [c["token"] for c in candidates]

        is_correct = set(found_tokens) == set(expected)
        status = "✓" if is_correct else "✗"

        print(f"{status} {prop} {value} → {found_tokens} (expected: {expected})")

        if is_correct:
            correct += 1

    print(f"\n{'=' * 60}")
    print(f"TOKEN CANDIDATES: {correct}/{len(test_cases)}")
    print("=" * 60)

    return correct == len(test_cases)


# =============================================================================
# MAIN
# =============================================================================

async def main():
    # Load API Key
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    api_key = None

    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("VITE_OPENROUTER_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break

    if not api_key or api_key == "your-api-key-here":
        print("ERROR: No API key in .env.local")
        print("Set VITE_OPENROUTER_API_KEY=your-key")
        return

    config = LLMConfig(api_key=api_key)

    print("Mirror LLM Generator Prototype")
    print("=" * 60)

    # Run tests
    import sys
    if len(sys.argv) > 1:
        test = sys.argv[1]
        if test == "dispatcher":
            await test_dispatcher(config)
        elif test == "builder":
            await test_builder(config)
        elif test == "applier":
            await test_applier(config)
        elif test == "tokens":
            await test_token_candidates()
        elif test == "full":
            await test_full_flow(config)
        elif test == "full-all":
            await test_full_flow_all(config)
        elif test == "all":
            # Alle Tests nacheinander
            print("\n" + "=" * 60)
            print("RUNNING ALL TESTS")
            print("=" * 60)

            # 1. Token Candidates (deterministisch, schnell)
            await test_token_candidates()

            # 2. Applier (deterministisch, schnell)
            await test_applier(config)

            # 3. Dispatcher (LLM, 30+ requests)
            await test_dispatcher(config)

            # 4. Builder (LLM, 12 Komponenten)
            await test_builder(config)

            # 5. Full Flow (LLM, 1 Szenario)
            await test_full_flow(config)

            print("\n" + "=" * 60)
            print("ALL TESTS COMPLETED")
            print("=" * 60)
        else:
            print(f"Unknown test: {test}")
            print("Available: dispatcher, builder, applier, tokens, full, full-all, all")
    else:
        # Run full flow by default
        await test_full_flow(config)


if __name__ == "__main__":
    asyncio.run(main())
