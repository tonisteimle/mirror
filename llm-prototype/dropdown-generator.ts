/**
 * Dropdown Generator Prototype
 *
 * Demonstriert den Ansatz: Komplexe Komponente in spezialisierte
 * Prompts zerlegen, die jeweils nur einen Aspekt der Mirror-Syntax kennen.
 */

// Die spezialisierten Prompts - jeder kennt nur einen Teil der Syntax
const PROMPTS = {
  structure: `Du generierst NUR die Komponenten-Hierarchie in Mirror-Syntax.
Keine Properties, keine Styles, keine Events.
Nur Komponenten-Namen und Verschachtelung mit Einrückung.

Regeln:
- Komponenten-Definitionen enden mit :
- Kinder werden eingerückt (2 Spaces)
- Keine Properties (kein pad, bg, col, etc.)

Beispiel:
Card:
  Header:
  Content:`,

  layout: `Du generierst NUR Layout-Properties für Mirror-Komponenten.
Erlaubte Properties: hor, ver, gap, center, spread, wrap, left, right, top, bottom

Regeln:
- Eine Zeile pro Komponente
- Format: KomponentenName: layout-props
- Keine Farben, keine Abstände (padding), keine Events

Beispiel:
Header: hor, spread
Content: ver, gap 8`,

  styling: `Du generierst NUR visuelle Properties für Mirror-Komponenten.
Erlaubte Properties: bg, col, pad, rad, bor, font-size, shadow, opacity

Regeln:
- Eine Zeile pro Komponente
- Format: KomponentenName: style-props
- Verwende Hex-Farben oder Token ($name)
- Keine Layout-Props (kein hor, ver, gap)
- Keine Events

Beispiel:
Header: bg #1A1A23, pad 12, bor b 1 #333
Content: pad 16`,

  states: `Du generierst NUR State-Definitionen für Mirror-Komponenten.
Erlaubte States: hover, focus, active, disabled, highlighted, selected, expanded, collapsed, hidden

Regeln:
- Inline-Syntax: state statename prop value
- Oder Block-Syntax mit Einrückung
- Nur State-relevante Properties ändern

Beispiel:
Button:
  state hover bg #444
  state disabled opacity 0.5`,

  events: `Du generierst NUR Event-Handler für Mirror-Komponenten.
Erlaubte Events: onclick, onhover, onkeydown, onclick-outside
Erlaubte Actions: toggle, show, hide, select, highlight, close, open

Regeln:
- Format: eventname action target
- Keyboard-Events: onkeydown KEY: action
- Für Keyboard-Navigation: keys-Block verwenden

Beispiel:
Button:
  onclick toggle Menu
Menu:
  keys
    escape close
    arrow-down highlight next`
}

// Typen
interface PromptResult {
  phase: 'structure' | 'layout' | 'styling' | 'states' | 'events'
  output: string
}

interface GeneratorConfig {
  llmCall: (systemPrompt: string, userPrompt: string) => Promise<string>
}

/**
 * Generiert ein Dropdown mit spezialisierten Prompts
 */
async function generateDropdown(
  description: string,
  config: GeneratorConfig
): Promise<string> {
  const results: PromptResult[] = []

  // Phase 1: Structure
  const structureOutput = await config.llmCall(
    PROMPTS.structure,
    `Erstelle die Komponenten-Hierarchie für: ${description}

Benötigte Elemente: Dropdown-Container, Trigger (mit Label und Icon), Menu, Items`
  )
  results.push({ phase: 'structure', output: structureOutput })

  // Extrahiere Komponenten-Namen für folgende Prompts
  const components = extractComponentNames(structureOutput)

  // Phase 2-5: Parallel möglich
  const [layoutOutput, stylingOutput, statesOutput, eventsOutput] = await Promise.all([
    config.llmCall(
      PROMPTS.layout,
      `Komponenten: ${components.join(', ')}
Beschreibung: Trigger ist horizontal mit Icon rechts. Menu ist vertikal. Items sind horizontal.`
    ),
    config.llmCall(
      PROMPTS.styling,
      `Komponenten: ${components.join(', ')}
Design: Dunkles Theme (#1A1A23 Hintergrund). Trigger mit Border. Menu mit Shadow. Items mit Padding.`
    ),
    config.llmCall(
      PROMPTS.states,
      `Komponenten: ${components.join(', ')}
Verhalten: Menu ist initial versteckt. Items haben hover und können highlighted/selected sein.`
    ),
    config.llmCall(
      PROMPTS.events,
      `Komponenten: ${components.join(', ')}
Interaktion: Trigger togglet Menu. Item-Klick wählt aus und schließt. Escape schließt. Pfeiltasten navigieren.`
    )
  ])

  results.push({ phase: 'layout', output: layoutOutput })
  results.push({ phase: 'styling', output: stylingOutput })
  results.push({ phase: 'states', output: statesOutput })
  results.push({ phase: 'events', output: eventsOutput })

  // Merge all outputs
  return mergeOutputs(results)
}

/**
 * Extrahiert Komponenten-Namen aus Structure-Output
 */
function extractComponentNames(structureOutput: string): string[] {
  const names: string[] = []
  const lines = structureOutput.split('\n')

  for (const line of lines) {
    const match = line.match(/^\s*(\w+):?\s*$/)
    if (match) {
      names.push(match[1])
    }
  }

  return names
}

/**
 * Merged alle Prompt-Outputs zu validem Mirror-Code
 */
function mergeOutputs(results: PromptResult[]): string {
  const sections: string[] = []

  for (const result of results) {
    sections.push(`// ${result.phase.toUpperCase()}`)
    sections.push(result.output.trim())
    sections.push('')
  }

  return sections.join('\n')
}

// ============================================================
// DEMO: Simulierter LLM-Call mit hardcoded Outputs
// ============================================================

const SIMULATED_OUTPUTS: Record<string, string> = {
  structure: `Dropdown:
  Trigger:
    Label:
    ChevronIcon:
  Menu:
    Item:`,

  layout: `Trigger: hor, center, spread
Menu: ver
Item: hor, center`,

  styling: `Trigger: bg #1A1A23, bor 1 #333, rad 6, pad 8 12
Menu: bg #1A1A23, bor 1 #333, rad 6, shadow md
Item: pad 8 12, col #E4E4E7
Label: col #E4E4E7, font-size 13
ChevronIcon: col #71717A`,

  states: `Menu: hidden

Item:
  state hover bg #333
  state highlighted bg #333
  state selected bg #2563EB, col white`,

  events: `Trigger:
  onclick toggle Menu

Menu:
  onclick-outside close
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

Item:
  onclick select
  onhover highlight`
}

// Simulierter LLM-Call für Demo
function simulatedLLMCall(systemPrompt: string, userPrompt: string): Promise<string> {
  // Erkennt welcher Prompt-Typ angefragt wird
  if (systemPrompt.includes('Komponenten-Hierarchie')) {
    return Promise.resolve(SIMULATED_OUTPUTS.structure)
  }
  if (systemPrompt.includes('Layout-Properties')) {
    return Promise.resolve(SIMULATED_OUTPUTS.layout)
  }
  if (systemPrompt.includes('visuelle Properties')) {
    return Promise.resolve(SIMULATED_OUTPUTS.styling)
  }
  if (systemPrompt.includes('State-Definitionen')) {
    return Promise.resolve(SIMULATED_OUTPUTS.states)
  }
  if (systemPrompt.includes('Event-Handler')) {
    return Promise.resolve(SIMULATED_OUTPUTS.events)
  }
  return Promise.resolve('')
}

// Demo ausführen
async function demo() {
  console.log('=== Dropdown Generator Demo ===\n')

  const result = await generateDropdown(
    'Ein Dropdown mit dunklem Theme für eine Formular-Auswahl',
    { llmCall: simulatedLLMCall }
  )

  console.log('Generated Mirror Code:\n')
  console.log(result)
}

demo()

export { generateDropdown, PROMPTS, extractComponentNames, mergeOutputs }
