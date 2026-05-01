/**
 * Prompt-Building-Utilities — geteilt zwischen Edit-Flow-Prompts und
 * (während der Phase-3-Migration) den existierenden Draft-Prompts.
 *
 * `formatProjectFileSection` wurde aus `studio/agent/draft-prompts.ts`
 * extrahiert. In Phase 3 wird `draft-prompts.ts` gelöscht — diese Datei
 * bleibt als kanonische Quelle.
 *
 * Siehe: docs/concepts/llm-edit-flow-plan.md (T2.1, § 3.1)
 */

/**
 * Rendert einen Abschnitt für ein Bündel Mirror-Files (Tokens, Components,
 * o.ä.) als Markdown-Block für Prompt-Injection.
 *
 * - Leeres / undefiniertes File-Bundle → leerer String (keine Heading).
 * - Files mit nur Whitespace-Inhalt werden gefiltert.
 * - Output-Form (per File): `### <name>\n```mirror\n<content>\n````
 *   Mehrere Files werden mit Leerzeile getrennt.
 */
export function formatProjectFileSection(
  heading: string,
  files: Record<string, string> | undefined
): string {
  if (!files) return ''
  const entries = Object.entries(files).filter(([, content]) => content.trim())
  if (entries.length === 0) return ''

  const blocks = entries
    .map(([name, content]) => `### ${name}\n\`\`\`mirror\n${content}\n\`\`\``)
    .join('\n\n')

  return `\n## ${heading}\n${blocks}\n`
}
