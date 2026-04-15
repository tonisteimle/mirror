/**
 * Structural Validator for Mirror DSL
 *
 * Validates and auto-corrects common structural errors in Mirror code.
 * This runs AFTER LLM generation to catch and fix mistakes.
 */

// ============================================
// TYPES
// ============================================

export interface ValidationError {
  line: number
  type:
    | 'self-closing-with-children'
    | 'empty-text-element'
    | 'root-absolute'
    | 'duplicate-property'
    | 'empty-container'
    | 'invalid-center-on-text'
    | 'select-without-options'
    | 'option-outside-select'
  message: string
  fix?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  fixedCode?: string
}

// ============================================
// ELEMENT CLASSIFICATION
// ============================================

/** Elements that CANNOT have children (self-closing) */
const SELF_CLOSING_ELEMENTS = new Set([
  'Input',
  'Textarea',
  'Image',
  'Img',
  'Icon',
  'Checkbox',
  'Radio',
  'Divider',
  'Spacer',
])

/** Elements that REQUIRE text content */
const TEXT_REQUIRED_ELEMENTS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'Label',
  'Text',
  'Link',
  'Option',
])

/** Elements that are containers (can have children) */
const CONTAINER_ELEMENTS = new Set([
  'Box',
  'Frame',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
  'Button',
  'App',
  'Select',
])

/** Layout properties that only apply to containers */
const CONTAINER_ONLY_PROPS = new Set([
  'center',
  'spread',
  'hor',
  'ver',
  'gap',
  'wrap',
  'grid',
  'stacked',
])

// ============================================
// PARSER HELPERS
// ============================================

interface ParsedLine {
  lineNum: number
  indent: number
  element: string | null
  text: string | null
  properties: string[]
  raw: string
}

function parseLine(line: string, lineNum: number): ParsedLine {
  const raw = line
  const indent = line.search(/\S/)
  if (indent === -1) {
    return { lineNum, indent: 0, element: null, text: null, properties: [], raw }
  }

  const trimmed = line.trim()

  // Skip comments
  if (trimmed.startsWith('//')) {
    return { lineNum, indent, element: null, text: null, properties: [], raw }
  }

  // Skip token definitions (legacy with $ or new syntax name.suffix:)
  if (trimmed.startsWith('$') || /^[a-z][a-zA-Z0-9_-]*\.[a-z]+\s*:/.test(trimmed)) {
    return { lineNum, indent, element: null, text: null, properties: [], raw }
  }

  // Extract element name (starts with uppercase or is a known element)
  const elementMatch = trimmed.match(/^([A-Z][a-zA-Z0-9]*)/)
  if (!elementMatch) {
    return { lineNum, indent, element: null, text: null, properties: [], raw }
  }

  const element = elementMatch[1]
  const rest = trimmed.slice(element.length).trim()

  // Extract quoted text content
  const textMatch = rest.match(/"([^"]*)"/)
  const text = textMatch ? textMatch[1] : null

  // Extract properties (simplified)
  const propsStr = rest.replace(/"[^"]*"/g, '').trim()
  const properties = propsStr.split(/[,\s]+/).filter(p => p && !p.startsWith('//'))

  return { lineNum, indent, element, text, properties, raw }
}

function parseCode(code: string): ParsedLine[] {
  return code.split('\n').map((line, i) => parseLine(line, i + 1))
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

function findChildren(lines: ParsedLine[], parentIndex: number): ParsedLine[] {
  const parent = lines[parentIndex]
  const children: ParsedLine[] = []

  for (let i = parentIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.element === null) continue
    if (line.indent <= parent.indent) break
    if (line.indent === parent.indent + 2) {
      children.push(line)
    }
  }

  return children
}

function validateSelfClosingElements(lines: ParsedLine[]): ValidationError[] {
  return lines
    .map((line, i) => ({ line, children: findChildren(lines, i) }))
    .filter(
      ({ line, children }) =>
        line.element && SELF_CLOSING_ELEMENTS.has(line.element) && children.length > 0
    )
    .map(({ line, children }) => ({
      line: line.lineNum,
      type: 'self-closing-with-children' as const,
      message: `${line.element} cannot have children. Found ${children.length} indented element(s) below.`,
      fix: `Move children outside or remove them. ${line.element} is a self-closing element.`,
    }))
}

function validateTextElements(lines: ParsedLine[]): ValidationError[] {
  return lines
    .filter(l => l.element && TEXT_REQUIRED_ELEMENTS.has(l.element) && (!l.text || !l.text.trim()))
    .map(l => ({
      line: l.lineNum,
      type: 'empty-text-element' as const,
      message: `${l.element} requires text content. Use: ${l.element} "Your text here"`,
      fix: `Add text content: ${l.element} "Text"`,
    }))
}

function validateRootElement(lines: ParsedLine[]): ValidationError[] {
  const root = lines.find(l => l.element !== null && l.indent === 0)
  if (!root || (!root.properties.includes('abs') && !root.properties.includes('absolute')))
    return []
  return [
    {
      line: root.lineNum,
      type: 'root-absolute',
      message: `Root element should not be absolute positioned.`,
      fix: `Remove 'abs' or 'absolute' from root element.`,
    },
  ]
}

function validateDuplicateProperties(lines: ParsedLine[]): ValidationError[] {
  const errors: ValidationError[] = []

  // Property name mapping (normalize aliases)
  const propAliases: Record<string, string> = {
    w: 'width',
    width: 'width',
    h: 'height',
    height: 'height',
    p: 'padding',
    pad: 'padding',
    padding: 'padding',
    m: 'margin',
    mar: 'margin',
    margin: 'margin',
    bg: 'background',
    background: 'background',
    col: 'color',
    c: 'color',
    color: 'color',
    rad: 'radius',
    radius: 'radius',
    bor: 'border',
    border: 'border',
    boc: 'border-color',
    'border-color': 'border-color',
    fs: 'font-size',
    'font-size': 'font-size',
    g: 'gap',
    gap: 'gap',
    hor: 'horizontal',
    horizontal: 'horizontal',
    ver: 'vertical',
    vertical: 'vertical',
  }

  for (const line of lines) {
    if (!line.element) continue

    const seenProps = new Map<string, string>()

    for (const prop of line.properties) {
      // Skip values (not property names)
      if (prop.startsWith('#') || prop.startsWith('$') || /^\d/.test(prop)) continue

      // Skip known value keywords (not properties)
      const valueKeywords = new Set([
        'full',
        'hug',
        'auto', // sizing
        'true',
        'false', // booleans
        'top',
        'bottom',
        'left',
        'right', // positions (as values)
        'sm',
        'md',
        'lg',
        'xl', // sizes
        'sans',
        'serif',
        'mono', // fonts
        'thin',
        'light',
        'normal',
        'medium',
        'semibold',
        'bold',
        'black', // weights
        'pointer',
        'grab',
        'move',
        'text',
        'wait',
        'not-allowed', // cursors
        'justify',
        'square',
        'video', // misc values
        'email',
        'password',
        'text',
        'number',
        'tel',
        'url',
        'search', // input types
      ])
      if (valueKeywords.has(prop)) continue

      const normalizedProp = propAliases[prop] || prop

      if (seenProps.has(normalizedProp)) {
        errors.push({
          line: line.lineNum,
          type: 'duplicate-property',
          message: `Duplicate property: '${prop}' (same as '${seenProps.get(normalizedProp)}')`,
          fix: `Remove duplicate property, keep only one.`,
        })
      } else {
        seenProps.set(normalizedProp, prop)
      }
    }
  }

  return errors
}

const TEXT_ELEMENTS = new Set(['Text', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'Label', 'Link'])

function hasStandaloneCenter(line: ParsedLine): boolean {
  return (
    (line.properties.includes('center') || line.properties.includes('cen')) &&
    !line.raw.includes('text-align center') &&
    !line.raw.includes('text-align cen')
  )
}

function validateCenterOnText(lines: ParsedLine[]): ValidationError[] {
  return lines
    .filter(l => l.element && TEXT_ELEMENTS.has(l.element) && hasStandaloneCenter(l))
    .map(l => ({
      line: l.lineNum,
      type: 'invalid-center-on-text' as const,
      message: `'center' is a container layout property. For text alignment, use 'text-align center'.`,
      fix: `Replace 'center' with 'text-align center'`,
    }))
}

const MEANINGFUL_PROPS = new Set([
  'grow',
  'spacer',
  'bg',
  'opacity',
  'shadow',
  'bor',
  'w',
  'h',
  'full',
])

function hasMeaningfulProps(props: string[]): boolean {
  return props.some(p => p.startsWith('on') || MEANINGFUL_PROPS.has(p))
}

function isEmptyContainer(line: ParsedLine, children: ParsedLine[]): boolean {
  return children.length === 0 && !line.text && !hasMeaningfulProps(line.properties)
}

function validateEmptyContainers(lines: ParsedLine[]): ValidationError[] {
  return lines
    .map((line, i) => ({ line, children: findChildren(lines, i) }))
    .filter(
      ({ line, children }) =>
        line.element && CONTAINER_ELEMENTS.has(line.element) && isEmptyContainer(line, children)
    )
    .map(({ line }) => ({
      line: line.lineNum,
      type: 'empty-container' as const,
      message: `Empty container: ${line.element} has no children or content.`,
      fix: `Add content or remove this empty container.`,
    }))
}

function findParent(lines: ParsedLine[], index: number): ParsedLine | null {
  const line = lines[index]
  for (let j = index - 1; j >= 0; j--) {
    const parent = lines[j]
    if (parent.element && parent.indent === line.indent - 2) return parent
  }
  return null
}

function validateSelectHasOptions(lines: ParsedLine[]): ValidationError[] {
  return lines
    .map((line, i) => ({ line, children: findChildren(lines, i) }))
    .filter(
      ({ line, children }) =>
        line.element === 'Select' &&
        children.length > 0 &&
        !children.some(c => c.element === 'Option')
    )
    .map(({ line, children }) => ({
      line: line.lineNum,
      type: 'select-without-options' as const,
      message: `Select should contain Option elements, not ${children.map(c => c.element).join(', ')}.`,
      fix: `Use Option elements inside Select: Select\\n  Option "Choice 1"\\n  Option "Choice 2"`,
    }))
}

function validateOptionInSelect(lines: ParsedLine[]): ValidationError[] {
  return lines
    .map((line, i) => ({ line, parent: findParent(lines, i) }))
    .filter(({ line, parent }) => line.element === 'Option' && parent?.element !== 'Select')
    .map(({ line }) => ({
      line: line.lineNum,
      type: 'option-outside-select' as const,
      message: `Option must be inside a Select element.`,
      fix: `Wrap Option in Select: Select\\n  Option "Choice"`,
    }))
}

function validateSelectOption(lines: ParsedLine[]): ValidationError[] {
  return [...validateSelectHasOptions(lines), ...validateOptionInSelect(lines)]
}

// ============================================
// AUTO-FIX FUNCTIONS
// ============================================

function fixSelfClosingWithChildren(code: string, lines: ParsedLine[]): string {
  // This is complex - we need to reorganize the structure
  // For now, we'll add a comment marking the issue
  let result = code

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (!line.element || !SELF_CLOSING_ELEMENTS.has(line.element)) continue

    const children = findChildren(lines, i)
    if (children.length === 0) continue

    // Strategy: Wrap in a Box, move children to be siblings
    // Find the line in the code and wrap it
    const codeLines = result.split('\n')
    const indent = ' '.repeat(line.indent)

    // Insert wrapper Box before the self-closing element
    const wrapperLine = `${indent}Box ver gap 8`
    codeLines.splice(line.lineNum - 1, 0, wrapperLine)

    // Increase indent of the self-closing element
    codeLines[line.lineNum] = '  ' + codeLines[line.lineNum]

    result = codeLines.join('\n')
  }

  return result
}

function fixEmptyTextElements(code: string, lines: ParsedLine[]): string {
  const codeLines = code.split('\n')

  for (const line of lines) {
    if (!line.element || !TEXT_REQUIRED_ELEMENTS.has(line.element)) continue
    if (line.text && line.text.trim() !== '') continue

    // Add placeholder text
    const lineContent = codeLines[line.lineNum - 1]
    const elementEnd = lineContent.indexOf(line.element) + line.element.length
    const before = lineContent.slice(0, elementEnd)
    const after = lineContent.slice(elementEnd)

    // Insert "Placeholder" text
    codeLines[line.lineNum - 1] = `${before} "Placeholder"${after}`
  }

  return codeLines.join('\n')
}

function fixRootAbsolute(code: string, lines: ParsedLine[]): string {
  const codeLines = code.split('\n')
  const rootLine = lines.find(l => l.element !== null && l.indent === 0)

  if (rootLine) {
    let lineContent = codeLines[rootLine.lineNum - 1]
    lineContent = lineContent.replace(/\babs\b/, '').replace(/\babsolute\b/, '')
    lineContent = lineContent.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim()
    codeLines[rootLine.lineNum - 1] = lineContent
  }

  return codeLines.join('\n')
}

function fixCenterOnText(code: string, lines: ParsedLine[]): string {
  const codeLines = code.split('\n')
  const textLines = lines.filter(
    l => l.element && TEXT_ELEMENTS.has(l.element) && hasStandaloneCenter(l)
  )
  for (const line of textLines) {
    let content = codeLines[line.lineNum - 1]
    content = content.replace(/(?<!text-align\s)\bcen(ter)?\b/g, 'text-align center')
    codeLines[line.lineNum - 1] = content
  }
  return codeLines.join('\n')
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

/**
 * Validate Mirror code for structural errors
 */
export function validateStructure(code: string): ValidationResult {
  const lines = parseCode(code)

  const errors: ValidationError[] = [
    ...validateSelfClosingElements(lines),
    ...validateTextElements(lines),
    ...validateRootElement(lines),
    ...validateDuplicateProperties(lines),
    ...validateCenterOnText(lines),
    ...validateEmptyContainers(lines),
    ...validateSelectOption(lines),
  ]

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate and auto-fix Mirror code
 */
export function validateAndFix(code: string): ValidationResult {
  let fixedCode = code
  const lines = parseCode(code)

  // Collect all errors first
  const allErrors = [
    ...validateSelfClosingElements(lines),
    ...validateTextElements(lines),
    ...validateRootElement(lines),
    ...validateDuplicateProperties(lines),
    ...validateCenterOnText(lines),
    ...validateEmptyContainers(lines),
    ...validateSelectOption(lines),
  ]

  // Apply fixes in order (some are safer than others)

  // Fix root absolute (safe)
  if (allErrors.some(e => e.type === 'root-absolute')) {
    fixedCode = fixRootAbsolute(fixedCode, parseCode(fixedCode))
  }

  // Fix center on text (safe)
  if (allErrors.some(e => e.type === 'invalid-center-on-text')) {
    fixedCode = fixCenterOnText(fixedCode, parseCode(fixedCode))
  }

  // Fix empty text elements (safe)
  if (allErrors.some(e => e.type === 'empty-text-element')) {
    fixedCode = fixEmptyTextElements(fixedCode, parseCode(fixedCode))
  }

  // Note: self-closing-with-children and empty-container are complex
  // We report them but don't auto-fix as the intent is unclear

  // Re-validate after fixes
  const finalResult = validateStructure(fixedCode)

  return {
    valid: finalResult.valid,
    errors: finalResult.errors,
    fixedCode: fixedCode !== code ? fixedCode : undefined,
  }
}

/**
 * Format validation errors as a human-readable string
 */
export function formatErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return 'No structural errors found.'

  return errors
    .map(e => `Line ${e.line}: ${e.message}${e.fix ? `\n  → Fix: ${e.fix}` : ''}`)
    .join('\n\n')
}
