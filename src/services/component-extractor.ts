/**
 * @module services/component-extractor
 * @description Extracts reusable components from Mirror UI definitions
 *
 * Two-phase approach:
 * 1. Deterministic: Parse structure, find patterns, calculate extraction scores
 * 2. LLM: Decide which elements to extract, suggest names
 */

// =============================================================================
// Types
// =============================================================================

export interface ElementNode {
  name: string
  depth: number
  line: number
  indent: number
  properties: string[]
  children: ElementNode[]
  parent?: ElementNode
  rawLines: string[]  // Original lines for this element
}

export interface ExtractionCandidate {
  element: ElementNode
  score: number
  reasons: string[]
  structureHash: string
  occurrences: number
  suggestedName?: string
}

export interface StructurePattern {
  hash: string
  elements: ElementNode[]
  childStructure: string  // Simplified child signature
}

export interface AnalysisResult {
  tree: ElementNode[]
  candidates: ExtractionCandidate[]
  patterns: StructurePattern[]
  skeletonElements: string[]  // Elements that should stay as skeleton
}

export interface ExtractionResult {
  componentDefinitions: string
  refactoredLayout: string
  extractedComponents: string[]
}

// =============================================================================
// Phase 1: Parsing
// =============================================================================

/**
 * Parse Mirror code into element tree
 */
export function parseToTree(code: string): ElementNode[] {
  const lines = code.split('\n')
  const root: ElementNode[] = []
  const stack: { node: ElementNode; indent: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('//')) continue

    // Skip token definitions and data
    if (trimmed.startsWith('$')) continue
    if (trimmed.startsWith('each ') || trimmed.startsWith('if ')) continue

    // Calculate indent
    const indent = line.search(/\S/)
    if (indent === -1) continue

    // Check if it's an element (starts with capital letter or is a known element)
    const elementMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*|[a-z]+)(?:\s*:|[\s,]|$)/)
    if (!elementMatch) continue

    const name = elementMatch[1]
    const isDefinition = trimmed.includes(':')

    // Extract properties (everything after the name)
    const propsStart = trimmed.indexOf(name) + name.length
    const propsString = trimmed.slice(propsStart).replace(/^[:\s,]+/, '').trim()
    const properties = propsString ? [propsString] : []

    const node: ElementNode = {
      name,
      depth: 0,
      line: i + 1,
      indent,
      properties,
      children: [],
      rawLines: [line],
    }

    // Find parent based on indent
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length === 0) {
      // Root level
      node.depth = 0
      root.push(node)
    } else {
      // Child of current stack top
      const parent = stack[stack.length - 1].node
      node.depth = parent.depth + 1
      node.parent = parent
      parent.children.push(node)
    }

    stack.push({ node, indent })
  }

  // Collect raw lines for each element (including children's lines)
  collectRawLines(root, code.split('\n'))

  return root
}

function collectRawLines(nodes: ElementNode[], allLines: string[]): void {
  for (const node of nodes) {
    if (node.children.length > 0) {
      collectRawLines(node.children, allLines)

      // Find the range of lines this element spans
      const startLine = node.line - 1
      const lastChild = getLastDescendant(node)
      const endLine = lastChild.line - 1

      node.rawLines = allLines.slice(startLine, endLine + 1)
    }
  }
}

function getLastDescendant(node: ElementNode): ElementNode {
  if (node.children.length === 0) return node
  return getLastDescendant(node.children[node.children.length - 1])
}

// =============================================================================
// Phase 1: Pattern Detection
// =============================================================================

/**
 * Create a structural hash for an element (ignoring specific content)
 */
function createStructureHash(node: ElementNode): string {
  const childHashes = node.children.map(c => createStructureHash(c)).sort()
  return `${node.name}[${childHashes.join(',')}]`
}

/**
 * Create a simplified child signature
 */
function getChildSignature(node: ElementNode): string {
  return node.children.map(c => c.name).join(',')
}

/**
 * Find repeated structural patterns
 */
export function findPatterns(tree: ElementNode[]): StructurePattern[] {
  const hashMap = new Map<string, ElementNode[]>()

  function traverse(nodes: ElementNode[]) {
    for (const node of nodes) {
      // Only consider elements with children (composite elements)
      if (node.children.length > 0) {
        const hash = createStructureHash(node)
        const existing = hashMap.get(hash) || []
        existing.push(node)
        hashMap.set(hash, existing)
      }
      traverse(node.children)
    }
  }

  traverse(tree)

  // Convert to patterns (only those with 2+ occurrences)
  const patterns: StructurePattern[] = []
  Array.from(hashMap.entries()).forEach(([hash, elements]) => {
    if (elements.length >= 2) {
      patterns.push({
        hash,
        elements,
        childStructure: getChildSignature(elements[0]),
      })
    }
  })

  return patterns.sort((a, b) => b.elements.length - a.elements.length)
}

// =============================================================================
// Phase 1: Scoring
// =============================================================================

const SKELETON_NAMES = new Set([
  'Page', 'App', 'Layout', 'Container', 'Wrapper',
  'Header', 'Footer', 'Sidebar', 'Main', 'Content',
  'Body', 'Section', 'Area', 'Region', 'Zone',
  'Left', 'Right', 'Top', 'Bottom', 'Center',
])

const PRIMITIVE_NAMES = new Set([
  'Icon', 'Text', 'Label', 'Image', 'Input', 'Button',
  'Link', 'Divider', 'Spacer', 'Badge', 'Avatar',
])

/**
 * Calculate extraction score for an element
 */
function calculateScore(node: ElementNode, patterns: StructurePattern[]): ExtractionCandidate {
  let score = 0
  const reasons: string[] = []

  // Find if this element is part of a pattern
  const nodeHash = createStructureHash(node)
  const pattern = patterns.find(p => p.hash === nodeHash)
  const occurrences = pattern?.elements.length || 1

  // 1. Repetition bonus (strong signal)
  if (occurrences >= 2) {
    score += 30 * Math.min(occurrences, 5)
    reasons.push(`Wiederholt ${occurrences}x`)
  }

  // 2. Has meaningful children (composite element)
  if (node.children.length >= 2) {
    score += 20
    reasons.push(`${node.children.length} Kinder`)
  } else if (node.children.length === 1) {
    score += 5
  }

  // 3. Depth bonus (middle depth is best)
  if (node.depth === 1 || node.depth === 2) {
    score += 15
    reasons.push(`Tiefe ${node.depth}`)
  } else if (node.depth === 3) {
    score += 10
  } else if (node.depth === 0) {
    score -= 20  // Root level penalty
  } else if (node.depth > 4) {
    score -= 10  // Too deep penalty
  }

  // 4. Skeleton penalty
  if (SKELETON_NAMES.has(node.name)) {
    score -= 40
    reasons.push('Skelett-Element')
  }

  // 5. Primitive penalty
  if (PRIMITIVE_NAMES.has(node.name)) {
    score -= 30
    reasons.push('Primitiv')
  }

  // 6. Has own properties (some styling)
  if (node.properties.length > 0 && node.properties[0].length > 0) {
    score += 10
    reasons.push('Hat Properties')
  }

  // 7. Semantic name bonus (looks like a component name)
  if (node.name.length > 3 && !SKELETON_NAMES.has(node.name) && !PRIMITIVE_NAMES.has(node.name)) {
    if (/^[A-Z][a-z]+[A-Z]?[a-z]*$/.test(node.name)) {
      score += 10
      reasons.push('Semantischer Name')
    }
  }

  return {
    element: node,
    score,
    reasons,
    structureHash: nodeHash,
    occurrences,
  }
}

/**
 * Analyze code and find extraction candidates
 */
export function analyzeForExtraction(code: string): AnalysisResult {
  const tree = parseToTree(code)
  const patterns = findPatterns(tree)

  const candidates: ExtractionCandidate[] = []
  const skeletonElements: string[] = []

  function traverse(nodes: ElementNode[]) {
    for (const node of nodes) {
      const candidate = calculateScore(node, patterns)

      if (candidate.score > 20) {
        candidates.push(candidate)
      }

      if (SKELETON_NAMES.has(node.name) || node.depth === 0) {
        skeletonElements.push(node.name)
      }

      traverse(node.children)
    }
  }

  traverse(tree)

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)

  return {
    tree,
    candidates: candidates.slice(0, 15),  // Top 15 candidates
    patterns,
    skeletonElements: Array.from(new Set(skeletonElements)),
  }
}

// =============================================================================
// Phase 2: LLM Integration
// =============================================================================

export interface LLMExtractionInput {
  candidates: Array<{
    name: string
    depth: number
    childNames: string[]
    properties: string
    score: number
    reasons: string[]
    occurrences: number
    preview: string  // First few lines
  }>
  skeletonElements: string[]
  totalElements: number
}

/**
 * Prepare data for LLM
 */
export function prepareForLLM(analysis: AnalysisResult): LLMExtractionInput {
  const candidates = analysis.candidates.map(c => ({
    name: c.element.name,
    depth: c.element.depth,
    childNames: c.element.children.map(ch => ch.name),
    properties: c.element.properties.join(', '),
    score: c.score,
    reasons: c.reasons,
    occurrences: c.occurrences,
    preview: c.element.rawLines.slice(0, 5).join('\n'),
  }))

  // Count total elements
  let totalElements = 0
  function count(nodes: ElementNode[]) {
    totalElements += nodes.length
    nodes.forEach(n => count(n.children))
  }
  count(analysis.tree)

  return {
    candidates,
    skeletonElements: analysis.skeletonElements,
    totalElements,
  }
}

// =============================================================================
// LLM Prompt
// =============================================================================

export const COMPONENT_EXTRACTOR_PROMPT = `Du bist ein UI-Komponenten-Extraktor für Mirror DSL.

## Aufgabe
Entscheide welche Elemente als wiederverwendbare Komponenten extrahiert werden sollen.

## Wichtige Regeln

### EXTRAHIEREN (zu Components Tab):
- Elemente die 2+ mal vorkommen (Wiederverwendung)
- Semantische Einheiten mit 2+ Kindern (Card, NavItem, ListItem)
- Mittlere Tiefe (1-3), nicht root, nicht zu tief
- Elemente mit eigenem Styling + Struktur

### NICHT EXTRAHIEREN (bleiben im Layout):
- Page-Level Container (Header, Sidebar, Content, Footer)
- Reine Layout-Wrapper (nur horizontal/vertical)
- Einzelne Primitive (Icon, Text, Button alleine)
- Root-Elemente (Tiefe 0)
- Einmalige Strukturen ohne Wiederverwendungspotential

### BALANCE
- Die Seite soll nach Extraktion noch "lesbar" sein
- User soll Skelett sehen: Header, Content, Sidebar etc.
- Komponenten-Instanzen ersetzen die Details
- Nicht zu viel extrahieren (max 5-7 Komponenten)
- Nicht zu wenig (mindestens wiederholte Elemente)

## Output Format (JSON)
\`\`\`json
{
  "extract": [
    {
      "originalName": "NavItem",
      "componentName": "NavItem",
      "reason": "Wiederholt 4x, semantische Einheit"
    }
  ],
  "keep": ["Header", "Sidebar", "Content"],
  "reasoning": "Kurze Begründung der Entscheidung"
}
\`\`\`

## Regeln
1. "extract" enthält NUR Elemente die wirklich extrahiert werden
2. "componentName" kann vom Original abweichen (besserer Name)
3. "keep" listet wichtige Skelett-Elemente
4. Maximal 7 Komponenten extrahieren
5. Bei Unsicherheit: NICHT extrahieren (konservativ)
`

// =============================================================================
// Code Generation
// =============================================================================

/**
 * Extract element code as component definition
 */
function elementToDefinition(node: ElementNode, componentName: string): string {
  const lines = node.rawLines
  if (lines.length === 0) return ''

  // Get the first line and adjust it to be a definition
  const firstLine = lines[0]
  const indent = firstLine.search(/\S/)
  const baseIndent = ' '.repeat(indent)

  // Create definition with proper indentation
  const defLines = lines.map((line, i) => {
    // Remove original indentation and add 2-space indent for children
    const lineIndent = line.search(/\S/)
    if (lineIndent === -1) return ''

    const relativeIndent = lineIndent - indent
    if (i === 0) {
      // First line: ComponentName:
      const props = node.properties.join(', ')
      return `${componentName}:${props ? ' ' + props : ''}`
    } else {
      // Child lines: adjust indent
      return '  ' + ' '.repeat(Math.max(0, relativeIndent - 2)) + line.trim()
    }
  })

  return defLines.filter(l => l).join('\n')
}

/**
 * Replace element in layout with component instance
 */
function createInstance(node: ElementNode, componentName: string): string {
  // Simple instance without the children
  const props = node.properties.join(', ')
  return `${componentName}${props ? ' ' + props : ''}`
}

/**
 * Apply extraction decisions to code
 */
export function applyExtraction(
  code: string,
  analysis: AnalysisResult,
  decisions: Array<{ originalName: string; componentName: string }>
): ExtractionResult {
  const componentDefinitions: string[] = []
  const extractedComponents: string[] = []

  // Create a map of elements to extract
  const extractMap = new Map<string, string>()
  for (const d of decisions) {
    extractMap.set(d.originalName, d.componentName)
  }

  // Find elements to extract and create definitions
  const seenDefinitions = new Set<string>()

  function findAndExtract(nodes: ElementNode[]) {
    for (const node of nodes) {
      const componentName = extractMap.get(node.name)
      if (componentName && !seenDefinitions.has(componentName)) {
        // Create definition from first occurrence
        const def = elementToDefinition(node, componentName)
        if (def) {
          componentDefinitions.push(def)
          seenDefinitions.add(componentName)
          extractedComponents.push(componentName)
        }
      }
      findAndExtract(node.children)
    }
  }

  findAndExtract(analysis.tree)

  // Refactor layout: replace extracted elements with instances
  const lines = code.split('\n')
  const refactoredLines: string[] = []
  let skipUntilIndent = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    const indent = line.search(/\S/)

    // Check if we're skipping children of an extracted element
    if (skipUntilIndent >= 0) {
      if (indent === -1 || indent > skipUntilIndent) {
        continue  // Skip this line (child of extracted element)
      } else {
        skipUntilIndent = -1  // Done skipping
      }
    }

    // Check if this line is an extracted element
    const elementMatch = trimmed.match(/^([A-Z][A-Za-z0-9]*)/)
    if (elementMatch) {
      const elementName = elementMatch[1]
      const componentName = extractMap.get(elementName)

      if (componentName && !trimmed.endsWith(':')) {
        // This is an instance of an extracted component
        // Replace with simple instance and skip children
        const instanceIndent = ' '.repeat(indent >= 0 ? indent : 0)
        refactoredLines.push(`${instanceIndent}${componentName}`)
        skipUntilIndent = indent
        continue
      }
    }

    refactoredLines.push(line)
  }

  return {
    componentDefinitions: componentDefinitions.join('\n\n'),
    refactoredLayout: refactoredLines.join('\n'),
    extractedComponents,
  }
}

// =============================================================================
// Main Functions
// =============================================================================

export interface ComponentAnalysisResult {
  analysis: AnalysisResult
  llmInput: LLMExtractionInput
  prompt: string
}

/**
 * Phase 1: Analyze code for extraction candidates
 */
export function analyzeComponents(code: string): ComponentAnalysisResult {
  const analysis = analyzeForExtraction(code)
  const llmInput = prepareForLLM(analysis)

  const userPrompt = `Analysiere diese UI-Struktur und entscheide welche Elemente extrahiert werden sollen:

${JSON.stringify(llmInput, null, 2)}

Antworte NUR mit dem JSON-Objekt.`

  return {
    analysis,
    llmInput,
    prompt: userPrompt,
  }
}

/**
 * Phase 2: Apply LLM decisions
 */
export function applyComponentDecisions(
  code: string,
  analysis: AnalysisResult,
  llmResponse: {
    extract: Array<{ originalName: string; componentName: string }>
    keep: string[]
    reasoning: string
  }
): ExtractionResult {
  return applyExtraction(code, analysis, llmResponse.extract)
}

export default analyzeComponents
