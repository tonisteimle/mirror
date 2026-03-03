"""
Mirror Generator via CSS

LLM schreibt CSS (was es perfekt kann),
dann übersetzen wir deterministisch nach Mirror.
"""

import asyncio
import aiohttp
import json
import os
import re
from dataclasses import dataclass

# =============================================================================
# DESIGN TOKENS
# =============================================================================

# Beispielhafte Tokens - in der Praxis würden diese aus einer Datei geladen
TOKENS = {
    # Backgrounds
    "$app.bg": "#09090B",
    "$surface.bg": "#18181B",
    "$elevated.bg": "#1A1A23",
    "$overlay.bg": "#27272A",

    # Text/Foreground
    "$default.col": "#E4E4E7",
    "$muted.col": "#A1A1AA",
    "$subtle.col": "#71717A",
    "$heading.col": "#F4F4F5",

    # Borders
    "$default.bor": "#333333",
    "$subtle.bor": "#3F3F46",

    # Primary (Accent)
    "$primary.bg": "#3B82F6",
    "$primary.hover.bg": "#2563EB",
    "$primary.col": "#3B82F6",

    # States
    "$hover.bg": "#333333",
    "$selected.bg": "#2563EB",
    "$highlighted.bg": "#333333",

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

# Invertiertes Mapping: Wert -> Token (für Übersetzung)
def build_value_to_token_map() -> dict[str, dict[str, str]]:
    """Baut ein Mapping von CSS-Werten zu Tokens, gruppiert nach Property-Typ."""
    mapping = {
        "bg": {},      # background
        "col": {},     # color
        "bor": {},     # border-color
        "pad": {},     # padding
        "gap": {},     # gap
        "rad": {},     # border-radius
        "font-size": {},
    }

    for token, value in TOKENS.items():
        # Extrahiere Property-Typ aus Token-Namen
        if ".bg" in token:
            mapping["bg"][value.upper()] = token
        elif ".col" in token:
            mapping["col"][value.upper()] = token
        elif ".bor" in token:
            mapping["bor"][value.upper()] = token
        elif ".pad" in token:
            mapping["pad"][value] = token
        elif ".gap" in token:
            mapping["gap"][value] = token
        elif ".rad" in token:
            mapping["rad"][value] = token
        elif ".font-size" in token:
            mapping["font-size"][value] = token

    return mapping

VALUE_TO_TOKEN = build_value_to_token_map()


def generate_token_definitions() -> str:
    """Generiert Mirror-Token-Definitionen."""
    lines = ["// Design Tokens"]
    for token, value in TOKENS.items():
        lines.append(f"{token}: {value}")
    return "\n".join(lines)


# =============================================================================
# PROMPTS - LLM schreibt eingeschränktes CSS
# =============================================================================

STRUCTURE_PROMPT = """Du erstellst eine HTML-Struktur für UI-Komponenten.
Verwende NUR einfache verschachtelte divs mit class-Namen.

REGELN:
1. Jedes Element ist ein div mit class="ComponentName"
2. Verwende EXAKT die vorgegebenen Komponenten-Namen
3. KEIN Style, KEIN JavaScript - NUR Struktur
4. Schließe alle Tags korrekt

BEISPIEL:
```html
<div class="Card">
  <div class="Header">
    <div class="Title"></div>
    <div class="CloseButton"></div>
  </div>
  <div class="Content"></div>
</div>
```

Antworte NUR mit dem HTML, keine Erklärungen."""


LAYOUT_PROMPT = """Du schreibst CSS für Layout.
Du darfst NUR diese Properties verwenden - KEINE anderen:

ERLAUBTE PROPERTIES:
- display: flex
- flex-direction: row | column
- gap: Npx
- justify-content: flex-start | center | flex-end | space-between
- align-items: flex-start | center | flex-end | stretch

FORMAT:
```css
.ComponentName {
  property: value;
}
```

BEISPIEL:
```css
.Header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.Sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
```

REGELN:
1. Eine Regel pro Komponente
2. NUR die erlaubten Properties
3. Verwende EXAKT die vorgegebenen Komponenten-Namen
4. Komponenten ohne spezielles Layout können weggelassen werden

Antworte NUR mit dem CSS, keine Erklärungen."""


STYLING_PROMPT = """Du schreibst CSS für visuelles Styling.
Du darfst NUR diese Properties verwenden - KEINE anderen:

ERLAUBTE PROPERTIES:
- background: #HEX (z.B. #1A1A23)
- color: #HEX (z.B. #E4E4E7)
- padding: Npx | Npx Mpx (z.B. 8px oder 8px 16px)
- border-radius: Npx
- border: Npx solid #HEX (z.B. 1px solid #333)
- box-shadow: 0 Npx Npx rgba(0,0,0,0.N)
- font-size: Npx
- opacity: 0.N

DUNKLES THEME FARBEN:
- Hintergründe: #09090B, #18181B, #1A1A23, #27272A
- Borders: #333333, #3F3F46
- Text primär: #E4E4E7, #F4F4F5
- Text sekundär: #A1A1AA, #71717A
- Akzent: #3B82F6, #2563EB

FORMAT:
```css
.ComponentName {
  property: value;
}
```

REGELN:
1. NUR die erlaubten Properties - keine anderen!
2. Keine Layout-Properties (display, flex, gap)
3. Verwende EXAKT die vorgegebenen Komponenten-Namen

Antworte NUR mit dem CSS, keine Erklärungen."""


STATES_PROMPT = """Du schreibst CSS für Hover- und andere Zustände.
Du darfst NUR diese Pseudo-Klassen und Properties verwenden:

ERLAUBTE PSEUDO-KLASSEN:
- :hover
- :focus
- :active
- :disabled
- .highlighted (als Klasse)
- .selected (als Klasse)
- .hidden (als Klasse)

ERLAUBTE PROPERTIES IN STATES:
- background: #HEX
- color: #HEX
- border-color: #HEX
- opacity: 0.N
- display: none (nur für .hidden)

FARBEN:
- Hover: #333333
- Selected/Akzent: #2563EB
- Text auf Akzent: #FFFFFF

FORMAT:
```css
.ComponentName:hover {
  background: #333333;
}

.ComponentName.selected {
  background: #2563EB;
  color: #FFFFFF;
}

.ComponentName.hidden {
  display: none;
}
```

REGELN:
1. NUR die erlaubten Pseudo-Klassen und Properties
2. Verwende EXAKT die vorgegebenen Komponenten-Namen
3. Popups/Menus brauchen typischerweise .hidden als Initialzustand
4. KEINE Base-Properties ohne Pseudo-Klasse/Klasse

Antworte NUR mit dem CSS, keine Erklärungen."""


TOKEN_MAPPING_PROMPT = """Du bist ein Design-System-Experte.
Deine Aufgabe: Analysiere die verwendeten CSS-Werte und entscheide, welche durch Design-Tokens ersetzt werden sollen.

VERFÜGBARE TOKENS:

Backgrounds (für background-Werte):
  $app.bg         = #09090B   (Haupt-App-Hintergrund, dunkelste Ebene)
  $surface.bg     = #18181B   (Standard-Oberflächen wie Cards, Panels)
  $elevated.bg    = #1A1A23   (Erhöhte Elemente wie Dropdowns, Modals)
  $overlay.bg     = #27272A   (Overlays, Tooltips)
  $hover.bg       = #333333   (Hover-Zustand)
  $selected.bg    = #2563EB   (Ausgewählte Elemente)
  $primary.bg     = #3B82F6   (Primär-Buttons)

Text/Foreground (für color-Werte):
  $default.col    = #E4E4E7   (Standard-Text)
  $muted.col      = #A1A1AA   (Sekundärer/gedämpfter Text)
  $subtle.col     = #71717A   (Dezenter Text, Placeholder)
  $heading.col    = #F4F4F5   (Überschriften, hervorgehobener Text)
  $primary.col    = #3B82F6   (Primär-Akzent als Textfarbe)

Borders (für border-color-Werte):
  $default.bor    = #333333   (Standard-Rahmen)
  $subtle.bor     = #3F3F46   (Dezenter Rahmen)

Spacing (für padding/gap-Werte):
  $xs.pad = 4     $sm.pad = 8     $md.pad = 12    $lg.pad = 16
  $xs.gap = 4     $sm.gap = 8     $md.gap = 12    $lg.gap = 16

Radius (für border-radius-Werte):
  $sm.rad = 4     $md.rad = 6     $lg.rad = 8

Typography (für font-size-Werte):
  $sm.font-size = 12    $default.font-size = 14    $lg.font-size = 16

DEINE AUFGABE:
Für jeden CSS-Wert, entscheide ob ein Token SEMANTISCH passt.
Beispiel: background: #1A1A23 bei einem Dropdown-Menu -> $elevated.bg (weil Dropdown ein erhöhtes Element ist)

OUTPUT FORMAT (JSON):
{
  "mappings": [
    {"original": "#1A1A23", "token": "$elevated.bg", "reason": "Dropdown menu ist ein erhöhtes Element"},
    {"original": "#E4E4E7", "token": "$default.col", "reason": "Standard-Textfarbe"},
    {"original": "8", "token": "$sm.pad", "reason": "Kleines Padding"},
    {"original": "#333333", "token": "$hover.bg", "context": "hover", "reason": "Hover-Hintergrund"}
  ]
}

REGELN:
1. Nur Tokens vorschlagen wenn sie SEMANTISCH passen
2. Bei Hover-States -> $hover.bg, bei Selected -> $selected.bg
3. Wenn kein Token semantisch passt, NICHT mappen (weglassen)
4. "context" angeben wenn der Kontext wichtig ist (z.B. "hover", "selected")

Antworte NUR mit dem JSON, keine Erklärungen."""


EVENTS_PROMPT = """Du schreibst JavaScript Event-Handler.
Du darfst NUR diese Events und Aktionen verwenden:

ERLAUBTE EVENTS:
- click
- mouseenter (für hover)
- keydown (mit event.key)

ERLAUBTE AKTIONEN:
- element.classList.toggle('hidden')
- element.classList.add('selected', 'highlighted')
- element.classList.remove('selected', 'highlighted')

FORMAT - Verwende ein einfaches Config-Objekt:
```javascript
const events = {
  Trigger: {
    click: ['Menu.classList.toggle("hidden")']
  },
  Menu: {
    clickOutside: ['Menu.classList.add("hidden")'],
    keydown: {
      Escape: ['Menu.classList.add("hidden")'],
      ArrowDown: ['highlightNext()'],
      ArrowUp: ['highlightPrev()'],
      Enter: ['selectHighlighted()', 'Menu.classList.add("hidden")']
    }
  },
  Item: {
    click: ['this.classList.add("selected")', 'Menu.classList.add("hidden")'],
    mouseenter: ['this.classList.add("highlighted")']
  }
};
```

REGELN:
1. NUR die erlaubten Events und Aktionen
2. Verwende EXAKT die vorgegebenen Komponenten-Namen
3. Referenziere Elemente mit ihrem Komponenten-Namen

Antworte NUR mit dem JavaScript, keine Erklärungen."""


# =============================================================================
# CSS zu Mirror Übersetzer
# =============================================================================

def css_to_mirror(css: str, phase: str = "styling") -> str:
    """Übersetzt CSS zu Mirror-Syntax.

    Args:
        css: Der CSS-String
        phase: Die aktuelle Phase ('styling' oder 'states')
              Bei 'states' werden Base-Properties ohne Modifier ignoriert.
    """

    # Sammle alle Properties pro Komponente
    components: dict[str, dict] = {}  # {name: {base: [], states: {statename: []}}}

    # Parse CSS Regeln
    rules = re.findall(r'\.([A-Za-z]+)([:\.\w-]*)\s*\{([^}]+)\}', css, re.MULTILINE)

    for component, modifier, properties in rules:
        if component not in components:
            components[component] = {"base": [], "states": {}}

        mirror_props = []

        # Parse properties
        props = re.findall(r'([\w-]+)\s*:\s*([^;]+);?', properties)

        for prop, value in props:
            value = value.strip()
            mirror_prop = translate_property(prop, value)
            if mirror_prop:
                mirror_props.append(mirror_prop)

        if mirror_props:
            if modifier:
                modifier = modifier.lstrip(':.')
                # Special case: .hidden mit display:none -> nur "hidden" als base property
                if modifier == 'hidden' and mirror_props == ['hidden']:
                    components[component]["base"].append("hidden")
                elif modifier in ['hover', 'selected', 'highlighted', 'focus', 'active', 'disabled']:
                    if modifier not in components[component]["states"]:
                        components[component]["states"][modifier] = []
                    components[component]["states"][modifier].extend(mirror_props)
            else:
                # Bei 'states' Phase ignorieren wir Base-Properties ohne Modifier
                # (die kommen ja schon von der 'styling' Phase)
                if phase != 'states':
                    components[component]["base"].extend(mirror_props)

    # Generiere Output - dedupliziert
    lines = []
    for component, data in components.items():
        has_content = data["base"] or data["states"]
        if not has_content:
            continue

        # Dedupliziere base properties
        base_props = list(dict.fromkeys(data["base"]))  # Erhält Reihenfolge, entfernt Duplikate

        if data["states"]:
            # Block-Syntax wenn States vorhanden
            lines.append(f"{component}:")
            if base_props:
                lines.append(f"  {', '.join(base_props)}")
            for state, state_props in data["states"].items():
                unique_props = list(dict.fromkeys(state_props))
                lines.append(f"  state {state} {', '.join(unique_props)}")
        elif base_props:
            lines.append(f"{component}: {', '.join(base_props)}")

    return '\n'.join(lines)


def normalize_hex(hex_color: str) -> str:
    """Normalisiert Hex-Farben zu 6-stelligem Format (#ABC -> #AABBCC)."""
    hex_color = hex_color.strip().upper()
    if hex_color.startswith('#') and len(hex_color) == 4:
        # #ABC -> #AABBCC
        return f"#{hex_color[1]*2}{hex_color[2]*2}{hex_color[3]*2}"
    return hex_color


def css_var_to_token(value: str) -> str | None:
    """Konvertiert var(--token-name) zu $token.name."""
    match = re.match(r'var\(--([a-z-]+)\)', value.strip())
    if match:
        # --elevated-bg -> $elevated.bg
        token_name = match.group(1)
        # Konvertiere Bindestriche zu Punkten, aber behalte letzte Komponente
        parts = token_name.rsplit('-', 1)
        if len(parts) == 2:
            return f"${parts[0]}.{parts[1]}"
        return f"${token_name}"
    return None


def translate_property(prop: str, value: str) -> str:
    """Übersetzt einzelne CSS-Property zu Mirror, mit Token-Ersetzung."""

    # Check für CSS custom property (var(--token))
    token = css_var_to_token(value)

    # Layout
    if prop == 'display' and value == 'none':
        return 'hidden'
    if prop == 'flex-direction':
        return 'hor' if value == 'row' else 'ver'
    if prop == 'gap':
        gap_val = parse_px(value)
        token = VALUE_TO_TOKEN["gap"].get(gap_val)
        return f"gap {token}" if token else f"gap {gap_val}"
    if prop == 'justify-content':
        if value == 'space-between':
            return 'spread'
        if value == 'center':
            return 'hor-center'
        if value == 'flex-end':
            return 'right'
    if prop == 'align-items':
        if value == 'center':
            return 'ver-center'
        if value == 'flex-start':
            return 'top'
        if value == 'flex-end':
            return 'bottom'

    # Styling - prüfe zuerst auf CSS var(), dann Fallback auf Hex-Lookup
    if prop == 'background' or prop == 'background-color':
        if token:
            return f"bg {token}"
        normalized = normalize_hex(value)
        fallback = VALUE_TO_TOKEN["bg"].get(normalized)
        return f"bg {fallback}" if fallback else f"bg {value}"
    if prop == 'color':
        if token:
            return f"col {token}"
        # "white" -> #FFFFFF für Token-Lookup
        if value.lower() == 'white':
            value = '#FFFFFF'
        normalized = normalize_hex(value)
        fallback = VALUE_TO_TOKEN["col"].get(normalized)
        return f"col {fallback}" if fallback else f"col {value}"
    if prop == 'padding':
        if token:
            return f"pad {token}"
        parts = value.replace('px', '').split()
        if len(parts) == 1:
            t = css_var_to_token(parts[0]) or VALUE_TO_TOKEN["pad"].get(parts[0]) or parts[0]
            return f"pad {t}"
        elif len(parts) == 2:
            t1 = css_var_to_token(parts[0]) or VALUE_TO_TOKEN["pad"].get(parts[0]) or parts[0]
            t2 = css_var_to_token(parts[1]) or VALUE_TO_TOKEN["pad"].get(parts[1]) or parts[1]
            return f"pad {t1} {t2}"
        elif len(parts) == 4:
            return f"pad {parts[0]} {parts[1]} {parts[2]} {parts[3]}"
    if prop == 'border-radius':
        if token:
            return f"rad {token}"
        rad_val = parse_px(value)
        fallback = VALUE_TO_TOKEN["rad"].get(rad_val)
        return f"rad {fallback}" if fallback else f"rad {rad_val}"
    if prop == 'border':
        # Parse "1px solid var(--token)" oder "1px solid #333"
        var_match = re.match(r'(\d+)px\s+solid\s+(var\(--[a-z-]+\))', value)
        if var_match:
            border_token = css_var_to_token(var_match.group(2))
            return f"bor {var_match.group(1)} {border_token}"
        hex_match = re.match(r'(\d+)px\s+solid\s+(#\w+)', value)
        if hex_match:
            color = normalize_hex(hex_match.group(2))
            fallback = VALUE_TO_TOKEN["bor"].get(color)
            color_val = fallback if fallback else hex_match.group(2)
            return f"bor {hex_match.group(1)} {color_val}"
    if prop == 'border-color':
        if token:
            return f"boc {token}"
        normalized = normalize_hex(value)
        fallback = VALUE_TO_TOKEN["bor"].get(normalized)
        return f"boc {fallback}" if fallback else f"boc {value}"
    if prop == 'box-shadow':
        # Vereinfacht: sm/md/lg basierend auf blur
        if '4px' in value or '2px' in value:
            return 'shadow sm'
        elif '8px' in value or '6px' in value:
            return 'shadow md'
        else:
            return 'shadow lg'
    if prop == 'font-size':
        if token:
            return f"font-size {token}"
        fs_val = parse_px(value)
        fallback = VALUE_TO_TOKEN["font-size"].get(fs_val)
        return f"font-size {fallback}" if fallback else f"font-size {fs_val}"
    if prop == 'opacity':
        return f"opacity {value}"

    return None


def parse_px(value: str) -> str:
    """Entfernt px von Werten."""
    return value.replace('px', '').strip()


def html_to_mirror(html: str) -> str:
    """Übersetzt HTML-Struktur zu Mirror."""

    lines = []
    indent = 0

    # Finde alle öffnenden und schließenden Tags
    tags = re.findall(r'<(/?)div\s*(?:class="(\w+)")?\s*/?>', html)

    for closing, class_name in tags:
        if closing:
            indent -= 1
        else:
            prefix = '  ' * indent
            lines.append(f"{prefix}{class_name}:")
            indent += 1

    return '\n'.join(lines)


def js_to_mirror(js: str) -> str:
    """Übersetzt JavaScript Events zu Mirror."""

    lines = []

    # Besserer Parser: Finde top-level Komponenten im events-Objekt
    # Entferne das äußere "const events = {" und "}"
    js_clean = js.strip()
    if 'const events' in js_clean:
        # Extrahiere Inhalt zwischen äußeren {}
        start = js_clean.find('{')
        end = js_clean.rfind('}')
        if start != -1 and end != -1:
            js_clean = js_clean[start+1:end]

    # Parse Komponenten-Blöcke mit Klammer-Balancing
    components = parse_js_components(js_clean)

    for component, content in components.items():
        component_lines = [f"{component}:"]

        # Click events
        click_match = re.search(r'click:\s*\[([^\]]+)\]', content)
        if click_match:
            actions = parse_js_actions(click_match.group(1))
            if actions:
                component_lines.append(f"  onclick {actions}")

        # Click outside
        outside_match = re.search(r'clickOutside:\s*\[([^\]]+)\]', content)
        if outside_match:
            actions = parse_js_actions(outside_match.group(1))
            if actions:
                component_lines.append(f"  onclick-outside {actions}")

        # Mouseenter (hover)
        hover_match = re.search(r'mouseenter:\s*\[([^\]]+)\]', content)
        if hover_match:
            actions = parse_js_actions(hover_match.group(1))
            if actions:
                component_lines.append(f"  onhover {actions}")

        # Keydown events - suche den keydown Block mit Klammer-Balancing
        keydown_start = content.find('keydown:')
        if keydown_start != -1:
            # Finde die öffnende Klammer
            brace_start = content.find('{', keydown_start)
            if brace_start != -1:
                # Finde die schließende Klammer mit Balancing
                brace_count = 1
                pos = brace_start + 1
                while pos < len(content) and brace_count > 0:
                    if content[pos] == '{':
                        brace_count += 1
                    elif content[pos] == '}':
                        brace_count -= 1
                    pos += 1
                key_content = content[brace_start+1:pos-1]

                component_lines.append("  keys")
                for key in ['Escape', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab']:
                    key_match = re.search(rf'{key}:\s*\[([^\]]+)\]', key_content)
                    if key_match:
                        actions = parse_js_actions(key_match.group(1))
                        if actions:
                            mirror_key = key.lower().replace('arrow', 'arrow-')
                            component_lines.append(f"    {mirror_key} {actions}")

        if len(component_lines) > 1:
            lines.extend(component_lines)
            lines.append("")

    return '\n'.join(lines)


def parse_js_components(js: str) -> dict[str, str]:
    """Parsed Top-Level Komponenten aus JS-Objekt mit Klammer-Balancing."""

    components = {}
    pos = 0

    while pos < len(js):
        # Suche nach Komponenten-Name: {
        match = re.search(r'(\w+):\s*\{', js[pos:])
        if not match:
            break

        component_name = match.group(1)
        brace_start = pos + match.end() - 1  # Position der öffnenden Klammer

        # Finde schließende Klammer mit Balancing
        brace_count = 1
        current = brace_start + 1
        while current < len(js) and brace_count > 0:
            if js[current] == '{':
                brace_count += 1
            elif js[current] == '}':
                brace_count -= 1
            current += 1

        # Extrahiere Inhalt
        content = js[brace_start+1:current-1]
        components[component_name] = content

        pos = current

    return components


def parse_js_actions(actions_str: str) -> str:
    """Übersetzt JS-Aktionen zu Mirror-Actions."""

    mirror_actions = []

    # classList.toggle("hidden") -> toggle ComponentName
    for match in re.finditer(r'(\w+)\.classList\.toggle\(["\']hidden["\']\)', actions_str):
        mirror_actions.append(f"toggle {match.group(1)}")

    # classList.add("hidden") -> hide ComponentName
    for match in re.finditer(r'(\w+)\.classList\.add\(["\']hidden["\']\)', actions_str):
        target = match.group(1)
        if target == 'this':
            mirror_actions.append("close")
        else:
            mirror_actions.append(f"hide {target}")

    # classList.add("selected") -> select
    if 'classList.add("selected")' in actions_str or "classList.add('selected')" in actions_str:
        mirror_actions.append("select")

    # classList.add("highlighted") -> highlight
    if 'classList.add("highlighted")' in actions_str or "classList.add('highlighted')" in actions_str:
        mirror_actions.append("highlight")

    # highlightNext/Prev
    if 'highlightNext()' in actions_str:
        mirror_actions.append("highlight next")
    if 'highlightPrev()' in actions_str:
        mirror_actions.append("highlight prev")

    # selectHighlighted
    if 'selectHighlighted()' in actions_str:
        mirror_actions.append("select highlighted")

    return ', '.join(mirror_actions)


# =============================================================================
# API Client (gleich wie vorher)
# =============================================================================

@dataclass
class LLMConfig:
    api_key: str
    model: str = "anthropic/claude-3.5-haiku"
    base_url: str = "https://openrouter.ai/api/v1"


async def call_llm(
    config: LLMConfig,
    system_prompt: str,
    user_prompt: str,
    session: aiohttp.ClientSession
) -> str:
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


# =============================================================================
# Generator
# =============================================================================

def build_user_prompt(component_spec: str, design_spec: str) -> dict[str, str]:
    base = f"""KOMPONENTEN:
{component_spec}

DESIGN:
{design_spec}
"""
    return {
        "structure": f"{base}\nErstelle die HTML-Struktur.",
        "layout": f"{base}\nSchreibe das Layout-CSS.",
        "styling": f"{base}\nSchreibe das Styling-CSS.",
        "states": f"{base}\nSchreibe das CSS für Zustände (hover, selected, etc.).",
        "events": f"{base}\nSchreibe die JavaScript Event-Handler."
    }


async def generate_component(
    config: LLMConfig,
    component_spec: str,
    design_spec: str
) -> dict[str, dict[str, str]]:
    """Generiert CSS/JS und übersetzt zu Mirror."""

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
        # Phase 1-5: Parallel generieren
        tasks = {
            phase: call_llm(config, system_prompt, user_prompts[phase], session)
            for phase, system_prompt in prompts.items()
        }

        for phase, task in tasks.items():
            try:
                raw = await task
                # Entferne Markdown Code-Blöcke
                raw = re.sub(r'```\w*\n?', '', raw).strip()
                results[phase] = {"raw": raw}
            except Exception as e:
                results[phase] = {"raw": f"ERROR: {e}"}

        # Übersetze zu Mirror (ohne Tokens)
        if "structure" in results:
            results["structure"]["mirror"] = html_to_mirror(results["structure"]["raw"])
        if "layout" in results:
            results["layout"]["mirror"] = css_to_mirror(results["layout"]["raw"], phase="layout")
        if "styling" in results:
            results["styling"]["mirror"] = css_to_mirror(results["styling"]["raw"], phase="styling")
        if "states" in results:
            results["states"]["mirror"] = css_to_mirror(results["states"]["raw"], phase="states")
        if "events" in results:
            results["events"]["mirror"] = js_to_mirror(results["events"]["raw"])

        # Phase 6: Token-Mapping
        # Sammle alle CSS-Werte für das Mapping
        all_css = "\n\n".join([
            f"=== STYLING ===\n{results.get('styling', {}).get('raw', '')}",
            f"=== STATES ===\n{results.get('states', {}).get('raw', '')}"
        ])

        token_user_prompt = f"""Analysiere dieses CSS und erstelle das Token-Mapping:

KOMPONENTEN-KONTEXT:
{component_spec}

CSS ZU ANALYSIEREN:
{all_css}

Erstelle das JSON-Mapping."""

        try:
            token_response = await call_llm(config, TOKEN_MAPPING_PROMPT, token_user_prompt, session)
            # Parse JSON
            token_response = re.sub(r'```\w*\n?', '', token_response).strip()
            results["token_mapping"] = {"raw": token_response}

            # Versuche JSON zu parsen
            mapping_data = json.loads(token_response)
            results["token_mapping"]["parsed"] = mapping_data
        except Exception as e:
            results["token_mapping"] = {"raw": f"ERROR: {e}", "parsed": {"mappings": []}}

    return results


def apply_token_mappings(mirror_code: str, mappings: list[dict]) -> str:
    """Wendet Token-Mappings auf Mirror-Code an."""

    result = mirror_code

    # Sortiere: Kontext-spezifische zuerst, dann allgemeine
    # Und längere Werte zuerst (um partielle Ersetzungen zu vermeiden)
    context_mappings = [m for m in mappings if m.get("context")]
    general_mappings = [m for m in mappings if not m.get("context")]

    # Sortiere nach Länge des Originals (längste zuerst)
    general_mappings.sort(key=lambda m: len(m.get("original", "")), reverse=True)

    # Erst kontext-spezifische Mappings
    for mapping in context_mappings:
        original = mapping.get("original", "")
        token = mapping.get("token", "")
        context = mapping.get("context", "")

        if not original or not token:
            continue

        # Normalisiere Hex zu langem Format
        if original.startswith("#") and len(original) == 4:
            original_long = f"#{original[1]*2}{original[2]*2}{original[3]*2}"
        else:
            original_long = original

        if context == "hover":
            # Nur in state hover Zeilen ersetzen
            result = re.sub(
                rf'(state hover[^\n]*\s){re.escape(original_long)}(\s|,|$)',
                rf'\1{token}\2',
                result,
                flags=re.IGNORECASE
            )
            # Auch kurze Variante
            if original.startswith("#") and len(original) == 7:
                short = f"#{original[1]}{original[3]}{original[5]}"
                result = re.sub(
                    rf'(state hover[^\n]*\s){re.escape(short)}(\s|,|$)',
                    rf'\1{token}\2',
                    result,
                    flags=re.IGNORECASE
                )
        elif context == "selected":
            result = re.sub(
                rf'(state selected[^\n]*\s){re.escape(original_long)}(\s|,|$)',
                rf'\1{token}\2',
                result,
                flags=re.IGNORECASE
            )

    # Dann allgemeine Mappings (längste zuerst)
    for mapping in general_mappings:
        original = mapping.get("original", "")
        token = mapping.get("token", "")

        if not original or not token:
            continue

        if original.startswith("#"):
            # Hex-Farben: normalisiere zu langem Format
            if len(original) == 4:
                original_long = f"#{original[1]*2}{original[2]*2}{original[3]*2}"
            else:
                original_long = original

            # Ersetze nur vollständige Werte (mit Wortgrenzen)
            # Ersetze langes Format
            result = re.sub(
                rf'(\s){re.escape(original_long)}(\s|,|$)',
                rf'\1{token}\2',
                result,
                flags=re.IGNORECASE
            )
            # Ersetze kurzes Format wenn original lang war
            if len(original) == 7:
                short = f"#{original[1]}{original[3]}{original[5]}"
                result = re.sub(
                    rf'(\s){re.escape(short)}(\s|,|$)',
                    rf'\1{token}\2',
                    result,
                    flags=re.IGNORECASE
                )
        elif original.endswith("px"):
            # Pixel-Werte: entferne px und ersetze Zahl
            num = original.replace("px", "")
            result = re.sub(rf'\b{re.escape(num)}\b', token, result)
        else:
            # Andere Werte: nur als eigenständiges Wort
            result = re.sub(rf'\b{re.escape(original)}\b', token, result)

    return result


def merge_mirror(results: dict[str, dict[str, str]], token_mappings: list[dict] = None) -> str:
    """Fügt alle Mirror-Outputs intelligent zusammen.

    Kombiniert gleiche Komponenten aus verschiedenen Phasen.
    Dedupliziert Properties und States.
    """

    # Sammle alle Komponenten-Definitionen
    # Format: {name: {props: {prop_name: value}, states: {state_name: {prop_name: value}}, events: [], children: []}}
    components: dict[str, dict] = {}

    order = ["structure", "layout", "styling", "states", "events"]

    for phase in order:
        if phase not in results or "mirror" not in results[phase]:
            continue

        mirror = results[phase]["mirror"].strip()
        if not mirror:
            continue

        lines = mirror.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            if not stripped or stripped.startswith('//'):
                i += 1
                continue

            # Komponenten-Definition oder -Zuweisung
            if ':' in stripped:
                # "Component:" oder "Component: props"
                if stripped.endswith(':'):
                    # Block-Start
                    comp_name = stripped[:-1].strip()
                    if comp_name not in components:
                        components[comp_name] = {
                            "props": {},
                            "states": {},
                            "events": [],
                            "children": [],
                            "is_definition": False
                        }

                    # Lies eingerückte Zeilen
                    i += 1
                    while i < len(lines) and (lines[i].startswith('  ') or lines[i].strip() == ''):
                        child_line = lines[i].strip()
                        if child_line:
                            if child_line.startswith('state '):
                                # Parse state: "state hover bg #333, col white"
                                state_match = re.match(r'state\s+(\w+)\s+(.+)', child_line)
                                if state_match:
                                    state_name = state_match.group(1)
                                    state_props = state_match.group(2)
                                    if state_name not in components[comp_name]["states"]:
                                        components[comp_name]["states"][state_name] = {}
                                    # Parse und merge properties
                                    for prop_str in split_props(state_props):
                                        prop_name, prop_val = parse_prop(prop_str)
                                        if prop_name:
                                            components[comp_name]["states"][state_name][prop_name] = prop_val
                            elif child_line.startswith('on') or child_line.startswith('keys'):
                                # Events - keine Deduplizierung, aber check auf Duplikate
                                event_line = '  ' + child_line
                                if event_line not in components[comp_name]["events"]:
                                    components[comp_name]["events"].append(event_line)
                                # Lies auch folgende eingerückte Zeilen für keys-Block
                                if child_line == 'keys':
                                    i += 1
                                    while i < len(lines) and lines[i].startswith('    '):
                                        key_line = lines[i]
                                        if key_line not in components[comp_name]["events"]:
                                            components[comp_name]["events"].append(key_line)
                                        i += 1
                                    continue
                            elif child_line.endswith(':'):
                                # Kind-Komponente in Structure
                                child_name = child_line[:-1].strip()
                                # Füge Kind nur einmal hinzu
                                if child_name not in components[comp_name]["children"]:
                                    components[comp_name]["children"].append(child_name)
                                components[comp_name]["is_definition"] = True
                                if child_name not in components:
                                    components[child_name] = {
                                        "props": {},
                                        "states": {},
                                        "events": [],
                                        "children": [],
                                        "is_definition": False
                                    }
                            else:
                                # Base properties - parse und merge
                                for prop_str in split_props(child_line):
                                    prop_name, prop_val = parse_prop(prop_str)
                                    if prop_name:
                                        components[comp_name]["props"][prop_name] = prop_val
                        i += 1
                else:
                    # "Component: props" - Inline
                    parts = stripped.split(':', 1)
                    comp_name = parts[0].strip()
                    props_str = parts[1].strip()
                    if comp_name not in components:
                        components[comp_name] = {
                            "props": {},
                            "states": {},
                            "events": [],
                            "children": [],
                            "is_definition": False
                        }
                    if props_str:
                        for prop_str in split_props(props_str):
                            prop_name, prop_val = parse_prop(prop_str)
                            if prop_name:
                                components[comp_name]["props"][prop_name] = prop_val
                    i += 1
            else:
                i += 1

    # Generiere finalen Output
    output_lines = []

    def render_component(name: str, indent: int = 0) -> list[str]:
        data = components.get(name, {})
        prefix = '  ' * indent
        lines = []

        props = data.get("props", {})
        states = data.get("states", {})
        events = data.get("events", [])
        children = data.get("children", [])

        # Formatiere props als String
        props_str = format_props(props)

        has_block_content = states or events or children

        if has_block_content:
            # Block-Syntax
            if props_str:
                lines.append(f"{prefix}{name}: {props_str}")
            else:
                lines.append(f"{prefix}{name}:")

            # States
            for state_name, state_props in states.items():
                state_props_str = format_props(state_props)
                if state_props_str:
                    lines.append(f"{prefix}  state {state_name} {state_props_str}")

            # Events
            for event_line in events:
                lines.append(f"{prefix}{event_line}")

            # Children
            for child in children:
                lines.extend(render_component(child, indent + 1))
        elif props_str:
            lines.append(f"{prefix}{name}: {props_str}")

        return lines

    # Finde Root-Komponenten
    all_children = set()
    for data in components.values():
        all_children.update(data.get("children", []))

    roots = [name for name, data in components.items()
             if data.get("is_definition") and name not in all_children]

    # Render Definitionen
    for root in roots:
        output_lines.extend(render_component(root))
        output_lines.append("")

    # Render übrige Komponenten
    rendered = set(roots) | all_children
    for name, data in components.items():
        if name not in rendered:
            output_lines.extend(render_component(name))

    # Zusammenfügen
    full_output = '\n'.join(output_lines)

    # Token-Mappings anwenden (falls vorhanden)
    if token_mappings:
        full_output = apply_token_mappings(full_output, token_mappings)

    # Finde verwendete Tokens und füge Definitionen hinzu
    used_tokens = set(re.findall(r'\$[\w.-]+', full_output))

    if used_tokens:
        token_lines = ["// Design Tokens"]
        for token in sorted(used_tokens):
            if token in TOKENS:
                token_lines.append(f"{token}: {TOKENS[token]}")
        token_lines.append("")
        token_lines.append("// Components")
        return '\n'.join(token_lines) + '\n' + full_output

    return full_output


def split_props(props_str: str) -> list[str]:
    """Splittet Property-String an Kommas, aber respektiert Werte mit Spaces."""
    props = []
    current = ""

    for part in props_str.split(','):
        part = part.strip()
        if not part:
            continue
        current = (current + ", " + part).strip(", ") if current else part
        # Check ob das eine vollständige Property ist
        # Eine Property ist vollständig wenn sie mit einem bekannten Keyword beginnt
        # und einen Wert hat (oder ein einzelnes Keyword wie 'hidden', 'hor', 'ver' ist)
        words = current.split()
        if len(words) >= 1:
            keyword = words[0]
            # Single-word properties
            if keyword in ['hor', 'ver', 'center', 'spread', 'wrap', 'hidden', 'visible',
                          'left', 'right', 'top', 'bottom', 'hor-center', 'ver-center']:
                props.append(current)
                current = ""
            # Properties mit Werten
            elif len(words) >= 2 and keyword in ['bg', 'col', 'boc', 'pad', 'gap', 'rad',
                                                   'bor', 'shadow', 'font-size', 'opacity',
                                                   'width', 'height', 'min-width', 'max-width']:
                props.append(current)
                current = ""

    if current:
        props.append(current)

    return props


def parse_prop(prop_str: str) -> tuple[str, str]:
    """Parsed eine Property in (name, value). Name ist das erste Wort."""
    prop_str = prop_str.strip()
    if not prop_str:
        return (None, None)

    words = prop_str.split(None, 1)
    if len(words) == 1:
        # Single-word property wie 'hor', 'hidden'
        return (words[0], "")
    else:
        return (words[0], words[1])


def format_props(props: dict) -> str:
    """Formatiert Properties-Dict als Mirror-String."""
    parts = []
    for name, value in props.items():
        if value:
            parts.append(f"{name} {value}")
        else:
            parts.append(name)
    return ', '.join(parts)


# =============================================================================
# Main
# =============================================================================

async def main():
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

    component_spec = """- Dropdown (äußerer Container)
- Trigger (klickbarer Button)
- Label (Text im Trigger)
- ChevronIcon (Pfeil-Icon)
- Menu (Popup mit Optionen)
- Item (einzelne Option)"""

    design_spec = """Dunkles Theme:
- Hintergründe: #1A1A23
- Borders: #333
- Text: #E4E4E7
- Akzent/Selection: #2563EB
- Abgerundete Ecken (6px)
- Shadow auf Menu"""

    print("Generiere Dropdown via CSS/JS...\n")
    print("=" * 60)

    results = await generate_component(config, component_spec, design_spec)

    # Zeige Raw + Übersetzung
    for phase in ["structure", "layout", "styling", "states", "events"]:
        print(f"\n### {phase.upper()} ###")
        print(f"\n--- RAW ({['HTML', 'CSS', 'CSS', 'CSS', 'JS'][['structure', 'layout', 'styling', 'states', 'events'].index(phase)]}) ---")
        print(results[phase]["raw"])
        print(f"\n--- MIRROR ---")
        print(results[phase].get("mirror", "(keine Übersetzung)"))

    # Zeige Token-Mapping
    print("\n" + "=" * 60)
    print("\n### TOKEN MAPPING (Phase 6) ###\n")
    token_mapping = results.get("token_mapping", {})
    print("--- RAW ---")
    print(token_mapping.get("raw", "keine Antwort"))

    mappings = token_mapping.get("parsed", {}).get("mappings", [])
    if mappings:
        print("\n--- PARSED MAPPINGS ---")
        for m in mappings:
            context = f" (context: {m.get('context')})" if m.get('context') else ""
            print(f"  {m.get('original')} -> {m.get('token')}{context}")
            print(f"    Reason: {m.get('reason', '-')}")

    print("\n" + "=" * 60)
    print("\n### FINAL MERGED MIRROR ###\n")

    merged = merge_mirror(results, mappings)
    print(merged)

    output_path = os.path.join(os.path.dirname(__file__), "generated-dropdown-css.mirror")
    with open(output_path, "w") as f:
        f.write(merged)

    print(f"\nGespeichert in: {output_path}")


if __name__ == "__main__":
    asyncio.run(main())
