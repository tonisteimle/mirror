/**
 * Naming Detector
 *
 * Detects naming conventions used in Mirror DSL code.
 * Part of the Analysis Foundation (Increment 4).
 */

/**
 * Detected naming conventions
 */
export interface NamingConventions {
  componentStyle: 'PascalCase' | 'camelCase' | 'mixed'
  componentPrefixes: string[]      // e.g., ["App", "UI", "Dashboard"]
  componentSuffixes: string[]      // e.g., ["Panel", "Card", "Button"]
  tokenPrefixes: string[]          // e.g., ["$app-", "$theme-"]
  tokenStyle: 'kebab-case' | 'camelCase' | 'snake_case' | 'mixed'
  examples: {
    components: string[]
    tokens: string[]
  }
}

// Regex patterns
const TOKEN_NAME_REGEX = /^\$[\w-]+$/
const COMPONENT_NAME_REGEX = /^[A-Z][A-Za-z0-9]*$/
const KEBAB_CASE_REGEX = /^[a-z]+(-[a-z0-9]+)+$/
const CAMEL_CASE_REGEX = /^[a-z][a-zA-Z0-9]*$/
const SNAKE_CASE_REGEX = /^[a-z]+(_[a-z0-9]+)+$/
const PASCAL_CASE_REGEX = /^[A-Z][a-zA-Z0-9]*$/

/**
 * Extracts common prefixes from a list of names
 */
function extractPrefixes(names: string[], minCount: number = 2): string[] {
  if (names.length < minCount) return []

  const prefixes = new Map<string, number>()

  for (const name of names) {
    // Try different prefix lengths (2-5 chars for components, longer for tokens)
    const maxLen = name.startsWith('$') ? 10 : 5
    for (let len = 2; len <= Math.min(maxLen, name.length - 1); len++) {
      const prefix = name.slice(0, len)
      // For tokens, include the dash
      if (name.startsWith('$') && !prefix.includes('-')) continue
      // For components, only full words (must end at word boundary)
      if (!name.startsWith('$')) {
        // Check if prefix ends at a word boundary (next char is uppercase or end)
        if (name.length > len && !/^[A-Z]/.test(name[len])) continue
        if (!/^[A-Z][a-z]*$/.test(prefix)) continue
      }

      prefixes.set(prefix, (prefixes.get(prefix) || 0) + 1)
    }
  }

  // Filter by minimum count and sort by frequency, then by length (prefer longer)
  return [...prefixes.entries()]
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => {
      // First by count
      if (b[1] !== a[1]) return b[1] - a[1]
      // Then prefer longer prefixes
      return b[0].length - a[0].length
    })
    .map(([prefix]) => prefix)
    .slice(0, 5) // Top 5 prefixes
}

/**
 * Extracts common suffixes from a list of component names
 */
function extractSuffixes(names: string[], minCount: number = 2): string[] {
  if (names.length < minCount) return []

  const suffixes = new Map<string, number>()

  for (const name of names) {
    // Try to extract suffix (common UI patterns)
    const suffixMatch = name.match(/(Panel|Card|Button|Icon|Text|Box|Group|List|Item|Container|Wrapper|Section|Header|Footer|Nav|Menu|Modal|Dialog|Form|Input|Label|Badge|Tag|Tab|Row|Col|Grid|Stack|View|Page|Screen|Layout)$/)
    if (suffixMatch) {
      const suffix = suffixMatch[1]
      suffixes.set(suffix, (suffixes.get(suffix) || 0) + 1)
    }
  }

  return [...suffixes.entries()]
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([suffix]) => suffix)
}

/**
 * Detects the case style of a token name (without $)
 */
function detectTokenStyle(name: string): 'kebab-case' | 'camelCase' | 'snake_case' | 'unknown' {
  const withoutPrefix = name.replace(/^\$/, '')

  // Check multi-word patterns first
  if (KEBAB_CASE_REGEX.test(withoutPrefix)) return 'kebab-case'
  if (SNAKE_CASE_REGEX.test(withoutPrefix)) return 'snake_case'
  if (/^[a-z]+[A-Z]/.test(withoutPrefix)) return 'camelCase'

  // Single word - compatible with any style
  if (/^[a-z][a-z0-9]*$/.test(withoutPrefix)) return 'kebab-case' // Single words are kebab-compatible

  return 'unknown'
}

/**
 * Detects naming conventions from Mirror DSL code
 */
export function detectNamingConventions(code: string): NamingConventions {
  const lines = code.split('\n')
  const componentNames: string[] = []
  const tokenNames: string[] = []

  // Patterns
  const tokenDefRegex = /^\s*(\$[\w-]+)\s*:/
  const componentDefRegex = /^\s*([A-Z][A-Za-z0-9]*)\s*:/
  const componentInstRegex = /^\s*(-\s+)?([A-Z][A-Za-z0-9]*)(\s+named\s+\w+)?\s*\{/

  for (const line of lines) {
    // Extract token names
    const tokenMatch = line.match(tokenDefRegex)
    if (tokenMatch && !tokenNames.includes(tokenMatch[1])) {
      tokenNames.push(tokenMatch[1])
    }

    // Extract component definition names
    const compDefMatch = line.match(componentDefRegex)
    if (compDefMatch && !componentNames.includes(compDefMatch[1])) {
      componentNames.push(compDefMatch[1])
    }

    // Extract component instance names (if not already a definition)
    const compInstMatch = line.match(componentInstRegex)
    if (compInstMatch && !componentNames.includes(compInstMatch[2])) {
      componentNames.push(compInstMatch[2])
    }
  }

  // Analyze component naming style
  let componentStyle: NamingConventions['componentStyle'] = 'PascalCase'
  const pascalCount = componentNames.filter(n => PASCAL_CASE_REGEX.test(n)).length
  const camelCount = componentNames.filter(n => /^[a-z][a-zA-Z0-9]*$/.test(n)).length
  if (camelCount > pascalCount) {
    componentStyle = 'camelCase'
  } else if (camelCount > 0 && pascalCount > 0) {
    componentStyle = 'mixed'
  }

  // Analyze token naming style
  const tokenStyles = tokenNames.map(n => detectTokenStyle(n))
  const kebabCount = tokenStyles.filter(s => s === 'kebab-case').length
  const snakeCount = tokenStyles.filter(s => s === 'snake_case').length
  const camelTokenCount = tokenStyles.filter(s => s === 'camelCase').length

  let tokenStyle: NamingConventions['tokenStyle'] = 'kebab-case'
  if (snakeCount > kebabCount && snakeCount > camelTokenCount) {
    tokenStyle = 'snake_case'
  } else if (camelTokenCount > kebabCount && camelTokenCount > snakeCount) {
    tokenStyle = 'camelCase'
  } else if (kebabCount > 0 && (snakeCount > 0 || camelTokenCount > 0)) {
    tokenStyle = 'mixed'
  }

  // Extract prefixes
  const componentPrefixes = extractPrefixes(componentNames)
  const tokenPrefixes = extractPrefixes(tokenNames)
  const componentSuffixes = extractSuffixes(componentNames)

  return {
    componentStyle,
    componentPrefixes,
    componentSuffixes,
    tokenPrefixes,
    tokenStyle,
    examples: {
      components: componentNames.slice(0, 10),
      tokens: tokenNames.slice(0, 10)
    }
  }
}

/**
 * Suggests a name following the detected conventions
 */
export function suggestName(
  type: 'component' | 'token',
  baseName: string,
  conventions: NamingConventions
): string {
  if (type === 'component') {
    // Apply prefix if conventions have one
    let name = baseName

    // Ensure PascalCase
    if (conventions.componentStyle === 'PascalCase') {
      name = name.charAt(0).toUpperCase() + name.slice(1)
    }

    // Add prefix if conventions use it and name doesn't have it
    if (conventions.componentPrefixes.length > 0) {
      const prefix = conventions.componentPrefixes[0]
      if (!name.startsWith(prefix)) {
        name = prefix + name
      }
    }

    return name
  } else {
    // Token
    let name = baseName

    // Ensure token prefix
    if (!name.startsWith('$')) {
      name = '$' + name
    }

    // Add token prefix if conventions have one
    if (conventions.tokenPrefixes.length > 0) {
      const prefix = conventions.tokenPrefixes[0]
      const nameWithoutDollar = name.slice(1)
      if (!name.startsWith(prefix)) {
        // Extract the base name without any existing prefix
        name = prefix + nameWithoutDollar.replace(/^[a-z]+-/, '')
      }
    }

    // Convert to kebab-case if that's the style
    if (conventions.tokenStyle === 'kebab-case') {
      const withoutDollar = name.slice(1)
      // Convert camelCase or PascalCase to kebab-case
      const kebab = withoutDollar
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase()
      name = '$' + kebab
    } else if (conventions.tokenStyle === 'snake_case') {
      const withoutDollar = name.slice(1)
      const snake = withoutDollar
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/-/g, '_')
        .toLowerCase()
      name = '$' + snake
    }

    return name
  }
}

/**
 * Checks if a name follows the detected conventions
 */
export function followsConventions(
  name: string,
  type: 'component' | 'token',
  conventions: NamingConventions
): boolean {
  if (type === 'component') {
    // Check style
    if (conventions.componentStyle === 'PascalCase' && !PASCAL_CASE_REGEX.test(name)) {
      return false
    }

    // Check prefix (if conventions have prefixes, name should use one)
    if (conventions.componentPrefixes.length > 0) {
      const hasPrefix = conventions.componentPrefixes.some(p => name.startsWith(p))
      if (!hasPrefix) return false
    }

    return true
  } else {
    // Token
    if (!name.startsWith('$')) return false

    const withoutDollar = name.slice(1)

    // Check style
    const style = detectTokenStyle(name)
    if (style !== conventions.tokenStyle && conventions.tokenStyle !== 'mixed') {
      return false
    }

    // Check prefix
    if (conventions.tokenPrefixes.length > 0) {
      const hasPrefix = conventions.tokenPrefixes.some(p => name.startsWith(p))
      if (!hasPrefix) return false
    }

    return true
  }
}

/**
 * Gets violations of naming conventions
 */
export function findNamingViolations(
  code: string,
  conventions: NamingConventions
): Array<{ name: string; type: 'component' | 'token'; issue: string }> {
  const violations: Array<{ name: string; type: 'component' | 'token'; issue: string }> = []
  const lines = code.split('\n')

  const tokenDefRegex = /^\s*(\$[\w-]+)\s*:/
  const componentDefRegex = /^\s*([A-Z][A-Za-z0-9]*)\s*:/

  for (const line of lines) {
    // Check token names
    const tokenMatch = line.match(tokenDefRegex)
    if (tokenMatch) {
      const name = tokenMatch[1]
      if (!followsConventions(name, 'token', conventions)) {
        const style = detectTokenStyle(name)
        if (style !== conventions.tokenStyle && conventions.tokenStyle !== 'mixed') {
          violations.push({
            name,
            type: 'token',
            issue: `Expected ${conventions.tokenStyle} but found ${style}`
          })
        }
        if (conventions.tokenPrefixes.length > 0 && !conventions.tokenPrefixes.some(p => name.startsWith(p))) {
          violations.push({
            name,
            type: 'token',
            issue: `Missing expected prefix (${conventions.tokenPrefixes[0]})`
          })
        }
      }
    }

    // Check component names
    const compMatch = line.match(componentDefRegex)
    if (compMatch) {
      const name = compMatch[1]
      if (!followsConventions(name, 'component', conventions)) {
        if (conventions.componentPrefixes.length > 0 && !conventions.componentPrefixes.some(p => name.startsWith(p))) {
          violations.push({
            name,
            type: 'component',
            issue: `Missing expected prefix (${conventions.componentPrefixes[0]})`
          })
        }
      }
    }
  }

  return violations
}
