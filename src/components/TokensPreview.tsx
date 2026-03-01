/**
 * TokensPreview - Visual preview of design tokens
 *
 * Displays tokens grouped by sections defined in code with `--- Name ---` syntax.
 * Shows color swatches for color tokens.
 */

import { useMemo } from 'react'
import type { TokenValue } from '../parser/types'

interface TokensPreviewProps {
  tokens: Map<string, TokenValue>
  tokensCode?: string
}

interface Section {
  name: string
  lineStart: number
  lineEnd: number
}

type TokenType = 'color' | 'spacing' | 'font' | 'other'

interface TokenEntry {
  name: string
  value: string
  resolvedValue: string
  tokenType: TokenType
  lineNumber: number
}

/**
 * Extract sections from tokens code.
 * Sections are defined with `--- Name ---` syntax.
 */
function extractSections(code: string): Section[] {
  const sections: Section[] = []
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const match = line.match(/^---\s*(.+?)\s*---$/)
    if (match) {
      // Close previous section
      if (sections.length > 0) {
        sections[sections.length - 1].lineEnd = i - 1
      }
      sections.push({
        name: match[1],
        lineStart: i + 1,
        lineEnd: lines.length - 1, // Will be updated when next section starts
      })
    }
  }

  return sections
}

/**
 * Parse tokens from code and assign line numbers.
 */
function parseTokensWithLines(code: string): Map<string, { value: string; line: number }> {
  const tokens = new Map<string, { value: string; line: number }>()
  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    // Match token definition: $name: value or $name.property: value
    const match = line.match(/^\$([^:\s]+):\s*(.+)$/)
    if (match) {
      tokens.set(match[1], { value: match[2].trim(), line: i })
    }
  }

  return tokens
}

/**
 * Group tokens by section based on line numbers.
 */
function groupTokensBySection(
  sections: Section[],
  tokenLines: Map<string, { value: string; line: number }>,
  tokens: Map<string, TokenValue>
): Map<string, TokenEntry[]> {
  const grouped = new Map<string, TokenEntry[]>()

  // Initialize sections
  for (const section of sections) {
    grouped.set(section.name, [])
  }

  // Also create an "Unsorted" section for tokens before any section
  const unsortedTokens: TokenEntry[] = []

  // Sort tokens into sections
  for (const [name, info] of tokenLines) {
    const resolvedValue = resolveTokenValue(info.value, tokens)
    const tokenType = getTokenType(name, info.value, resolvedValue)

    const entry: TokenEntry = {
      name: `$${name}`,
      value: info.value,
      resolvedValue,
      tokenType,
      lineNumber: info.line,
    }

    // Find which section this token belongs to
    let foundSection = false
    for (const section of sections) {
      if (info.line >= section.lineStart && info.line <= section.lineEnd) {
        grouped.get(section.name)!.push(entry)
        foundSection = true
        break
      }
    }

    if (!foundSection) {
      unsortedTokens.push(entry)
    }
  }

  // Add unsorted tokens at the beginning if any exist
  if (unsortedTokens.length > 0 && sections.length > 0) {
    // Prepend to first section or create "Allgemein" section
    const firstSection = sections[0]
    const existing = grouped.get(firstSection.name) || []
    grouped.set(firstSection.name, [...unsortedTokens, ...existing])
  } else if (unsortedTokens.length > 0) {
    grouped.set('Tokens', unsortedTokens)
  }

  return grouped
}

function resolveTokenValue(value: string, tokens: Map<string, TokenValue>, visited = new Set<string>()): string {
  // If it's a token reference, resolve it
  if (value.startsWith('$')) {
    const tokenName = value.slice(1)
    if (visited.has(tokenName)) return value // Circular reference
    visited.add(tokenName)

    const resolved = tokens.get(tokenName)
    if (resolved !== undefined) {
      const resolvedStr = typeof resolved === 'object' ? JSON.stringify(resolved) : String(resolved)
      return resolveTokenValue(resolvedStr, tokens, visited)
    }
  }
  return value
}

function isColorValue(value: string): boolean {
  // Check for hex colors
  if (/^#[0-9A-Fa-f]{3,8}$/.test(value)) return true
  // Check for rgb/rgba
  if (/^rgba?\(/.test(value)) return true
  // Check for hsl/hsla
  if (/^hsla?\(/.test(value)) return true
  // Check for named colors (common ones)
  if (/^(white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|transparent)$/i.test(value)) return true
  return false
}

function getTokenType(name: string, value: string, resolvedValue: string): TokenType {
  // Check if resolved value is a number (spacing)
  const numValue = Number(resolvedValue)
  const isNumeric = !isNaN(numValue) && resolvedValue.trim() !== ''

  // Check name patterns for spacing
  if (/\.(pad|gap|margin|spacing|rad|radius)$|(pad|gap|margin|spacing|radius)/i.test(name)) {
    return 'spacing'
  }
  // Check name patterns for font
  if (/\.font|font\.size|fontsize/i.test(name)) {
    return 'font'
  }
  // Check if it's a color
  if (isColorValue(resolvedValue)) {
    return 'color'
  }
  // If it's a plain number, treat as spacing
  if (isNumeric && numValue > 0 && numValue <= 100) {
    return 'spacing'
  }
  return 'other'
}

export function TokensPreview({ tokens, tokensCode = '' }: TokensPreviewProps) {
  const { sections, groupedTokens } = useMemo(() => {
    const sections = extractSections(tokensCode)
    const tokenLines = parseTokensWithLines(tokensCode)
    const groupedTokens = groupTokensBySection(sections, tokenLines, tokens)
    return { sections, groupedTokens }
  }, [tokens, tokensCode])

  // Get section names in order (or just "Tokens" if no sections)
  const sectionNames = sections.length > 0
    ? sections.map(s => s.name)
    : Array.from(groupedTokens.keys())

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#18181B',
      color: '#E4E4E7',
      overflow: 'auto',
    }}>
      {/* All sections displayed sequentially */}
      <div style={{ padding: '16px' }}>
        {sectionNames.map((sectionName, idx) => {
          const entries = groupedTokens.get(sectionName) || []
          if (entries.length === 0) return null

          return (
            <div key={sectionName} style={{ marginBottom: idx < sectionNames.length - 1 ? '32px' : 0 }}>
              {/* Section Title */}
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#FAFAFA',
              }}>
                {sectionName}
              </h2>

              {/* Token Table */}
              <table style={{
                width: 'auto',
                borderCollapse: 'collapse',
                fontSize: '12px',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272A' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#71717A', fontWeight: 500, width: '120px' }}>
                      Vorschau
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#71717A', fontWeight: 500, width: '160px' }}>
                      Wert
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#71717A', fontWeight: 500, width: '180px' }}>
                      Variable
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr
                      key={entry.name}
                      style={{
                        borderBottom: '1px solid #27272A',
                      }}
                    >
                      {/* Preview Cell - varies by token type */}
                      <td style={{ padding: '8px 12px' }}>
                        {entry.tokenType === 'color' ? (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: entry.resolvedValue,
                            borderRadius: '4px',
                            border: '1px solid #3F3F46',
                            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                          }} />
                        ) : entry.tokenType === 'spacing' ? (
                          <div style={{
                            width: `${Math.min(Number(entry.resolvedValue) || 8, 32)}px`,
                            height: `${Math.min(Number(entry.resolvedValue) || 8, 32)}px`,
                            backgroundColor: '#3B82F6',
                            borderRadius: '2px',
                          }} />
                        ) : entry.tokenType === 'font' ? (
                          <span style={{
                            fontSize: `${Math.min(Number(entry.resolvedValue) || 12, 24)}px`,
                            color: '#FAFAFA',
                            fontWeight: 400,
                            whiteSpace: 'nowrap',
                          }}>
                            Beispiel
                          </span>
                        ) : (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#27272A',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#52525B',
                          }}>
                            —
                          </div>
                        )}
                      </td>
                      {/* Value */}
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{
                          fontFamily: 'SF Mono, Menlo, Monaco, monospace',
                          fontSize: '11px',
                          color: entry.value.startsWith('$') ? '#3B82F6' : (entry.tokenType === 'color' ? '#4ADE80' : '#71717A'),
                          backgroundColor: '#27272A',
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}>
                          {entry.value.startsWith('$') ? entry.value : entry.resolvedValue}
                        </code>
                      </td>
                      {/* Variable Name */}
                      <td style={{ padding: '8px 12px' }}>
                        <code style={{
                          fontFamily: 'SF Mono, Menlo, Monaco, monospace',
                          fontSize: '11px',
                          color: '#3B82F6',
                        }}>
                          {entry.name}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}

        {/* Empty State */}
        {sectionNames.length === 0 && (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: '#52525B',
          }}>
            Keine Tokens definiert
          </div>
        )}
      </div>
    </div>
  )
}
