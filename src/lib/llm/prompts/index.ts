/**
 * Prompt Versioning System
 *
 * Manages versioned prompts for LLM interactions.
 * Provides history tracking and rollback capabilities.
 */

// =============================================================================
// Types
// =============================================================================

export interface PromptDefinition {
  /** Semantic version (e.g., "2.1.0") */
  version: string
  /** The prompt content */
  content: string
  /** Description of what this prompt does */
  description?: string
  /** When the prompt was last updated */
  updatedAt?: string
  /** Changelog entries */
  changelog?: string[]
}

export interface PromptRegistry {
  [key: string]: PromptDefinition
}

// =============================================================================
// Version Utilities
// =============================================================================

/**
 * Parse a semantic version string into components.
 */
export function parseVersion(version: string): {
  major: number
  minor: number
  patch: number
} {
  const parts = version.split('.').map(Number)
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  }
}

/**
 * Compare two semantic versions.
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a)
  const vB = parseVersion(b)

  if (vA.major !== vB.major) return vA.major - vB.major
  if (vA.minor !== vB.minor) return vA.minor - vB.minor
  return vA.patch - vB.patch
}

// =============================================================================
// Prompt Definitions
// =============================================================================

/**
 * All registered prompts with their versions.
 */
export const PROMPTS: PromptRegistry = {
  /**
   * JS Builder Prompt
   * Used to generate JavaScript that gets transformed to Mirror DSL.
   */
  JS_BUILDER: {
    version: '2.1.0',
    description: 'Generates JavaScript component structures for Mirror DSL transformation',
    updatedAt: '2026-02-18',
    changelog: [
      '2.1.0: Added between property documentation',
      '2.0.0: Complete rewrite for block syntax',
      '1.0.0: Initial version',
    ],
    content: `// JS Builder prompt is loaded dynamically from src/converter/llm-js-prompt.ts
// This is a placeholder - use getJsBuilderPrompt() for the actual content`,
  },

  /**
   * Create Prompt
   * Used for generating new components from scratch.
   */
  CREATE: {
    version: '1.3.0',
    description: 'Creates new Mirror components from user descriptions',
    updatedAt: '2026-02-18',
    changelog: [
      '1.3.0: Added events block documentation',
      '1.2.0: Improved token handling',
      '1.1.0: Added named instances',
      '1.0.0: Initial version',
    ],
    content: `Du erstellst Mirror DSL Komponenten basierend auf Benutzerbeschreibungen.

## Regeln
1. Generiere NUR Mirror Code, keine Erklärungen
2. Verwende existierende Tokens statt Hex-Werte
3. Füge hover-States für interaktive Elemente hinzu
4. Verwende "named" für Event-Targeting
5. Dunkles Farbschema als Default

## Format
- Colon = Definition (nicht rendern): Button: padding 12
- Ohne Colon = Instanz (rendern): Button "Click"
- as = Definition UND Rendern: Email as Input pad 12, "placeholder"
- Unbekannte Namen werden als Box interpretiert: Card bg #333 (= Card as Box)
- 2-Space Indent = Kind-Element
- Text am Ende der Zeile`,
  },

  /**
   * Modify Prompt
   * Used for modifying existing code.
   */
  MODIFY: {
    version: '1.2.0',
    description: 'Modifies existing Mirror code based on user instructions',
    updatedAt: '2026-02-18',
    changelog: [
      '1.2.0: Better change detection',
      '1.1.0: Preserve formatting improvements',
      '1.0.0: Initial version',
    ],
    content: `Du modifizierst existierenden Mirror DSL Code basierend auf Benutzeranweisungen.

## Regeln
1. Ändere NUR was explizit angefragt wird
2. Behalte existierende Struktur und Formatierung
3. Behalte alle Tokens und Definitionen
4. Gib den VOLLSTÄNDIGEN Code zurück

## Format
Der Benutzer gibt dir:
- Den existierenden Code
- Die gewünschten Änderungen

Gib den modifizierten Code zurück, keine Erklärungen.`,
  },

  /**
   * Translation Prompt
   * Used for natural language to DSL translation.
   */
  TRANSLATION: {
    version: '1.1.0',
    description: 'Translates natural language descriptions to Mirror DSL',
    updatedAt: '2026-02-18',
    changelog: [
      '1.1.0: Better context handling',
      '1.0.0: Initial version',
    ],
    content: `Du übersetzt natürliche Sprache in Mirror DSL Syntax.

## Regeln
1. Eine Zeile Input = Eine Zeile Output
2. Behalte die Einrückung bei
3. Verwende existierende Tokens
4. Keine Erklärungen, nur Code`,
  },

  /**
   * Correction Prompt
   * Used when self-healing needs to fix errors.
   */
  CORRECTION: {
    version: '1.0.0',
    description: 'Corrects errors in Mirror DSL code',
    updatedAt: '2026-02-18',
    changelog: [
      '1.0.0: Initial version',
    ],
    content: `Du korrigierst Fehler in Mirror DSL Code.

## Regeln
1. Behebe NUR die gemeldeten Fehler
2. Ändere nichts anderes
3. Gib den korrigierten Code zurück
4. Keine Erklärungen

## Häufige Fehler
- Token ohne $ Prefix
- CSS-Syntax statt Mirror-Syntax
- Text auf separater Zeile statt inline`,
  },
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get a prompt by name and optionally by version.
 *
 * @param name - The prompt name (e.g., 'CREATE', 'MODIFY')
 * @param version - Optional specific version to retrieve
 * @returns The prompt definition or undefined if not found
 *
 * @example
 * ```typescript
 * const createPrompt = getPrompt('CREATE')
 * console.log(createPrompt.content)
 * ```
 */
export function getPrompt(name: string, version?: string): PromptDefinition | undefined {
  const prompt = PROMPTS[name]
  if (!prompt) return undefined

  // If no version specified, return latest
  if (!version) return prompt

  // If version matches, return it
  if (prompt.version === version) return prompt

  // Version mismatch - for now just log a warning and return latest
  console.warn(`Prompt ${name} version ${version} not found, using ${prompt.version}`)
  return prompt
}

/**
 * Get the content of a prompt by name.
 */
export function getPromptContent(name: string): string {
  return PROMPTS[name]?.content ?? ''
}

/**
 * Get the version of a prompt.
 */
export function getPromptVersion(name: string): string {
  return PROMPTS[name]?.version ?? '0.0.0'
}

/**
 * List all available prompts.
 */
export function listPrompts(): Array<{
  name: string
  version: string
  description?: string
}> {
  return Object.entries(PROMPTS).map(([name, def]) => ({
    name,
    version: def.version,
    description: def.description,
  }))
}

/**
 * Get changelog for a prompt.
 */
export function getPromptChangelog(name: string): string[] {
  return PROMPTS[name]?.changelog ?? []
}

// =============================================================================
// Dynamic Prompt Loading
// =============================================================================

/**
 * Get the JS Builder prompt (loaded dynamically).
 */
export async function getJsBuilderPrompt(): Promise<string> {
  const { JS_BUILDER_PROMPT } = await import('../../../converter/llm-js-prompt')
  return JS_BUILDER_PROMPT
}

/**
 * Get the Intent CREATE prompt.
 */
export async function getIntentCreatePrompt(): Promise<string> {
  const { CREATE_SYSTEM_PROMPT } = await import('../../../intent/prompts')
  return CREATE_SYSTEM_PROMPT
}

/**
 * Get the Intent MODIFY prompt.
 */
export async function getIntentModifyPrompt(): Promise<string> {
  const { MODIFY_SYSTEM_PROMPT } = await import('../../../intent/prompts')
  return MODIFY_SYSTEM_PROMPT
}
