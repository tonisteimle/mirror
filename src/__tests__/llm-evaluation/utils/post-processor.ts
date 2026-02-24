/**
 * LLM Output Post-Processor
 *
 * Automatically corrects common LLM mistakes to improve quality.
 * Applied after LLM response, before validation.
 *
 * NOTE: This module now delegates to the consolidated self-healing system.
 * Most fixes have been migrated to /src/lib/self-healing/fixes/*.ts
 *
 * Remaining features specific to this module:
 * - JS Builder syntax conversion
 * - Fuzzy component matching
 * - Indentation normalization
 */

import { applyAllFixes } from '../../../lib/self-healing/fix-pipeline'

/**
 * Component name typo corrections
 */
const COMPONENT_TYPOS: Record<string, string> = {
  'Buttn': 'Button',
  'buttn': 'Button',
  'Buton': 'Button',
  'buton': 'Button',
  'Buttton': 'Button',
  'Crad': 'Card',
  'Cardd': 'Card',
  'Inputt': 'Input',
  'Inpuut': 'Input',
  'Imput': 'Input',
  'Toogle': 'Toggle',
  'Togle': 'Toggle',
  'Textt': 'Text',
  'Iccon': 'Icon',
  'Iocn': 'Icon',
  'Roow': 'Row',
  'Rwo': 'Row',
  'Columnn': 'Column',
  'Colum': 'Column',
  'Boxx': 'Box',
  'Boz': 'Box',
  'Lable': 'Label',
  'Labeel': 'Label',
  'Navv': 'Nav',
  'Alrt': 'Alert',
  'Badgee': 'Badge',
  'Modall': 'Modal',
  'Dropdownn': 'Dropdown',
  // HTML → Mirror
  'Div': 'Box',
  'div': 'Box',
  'Span': 'Text',
  'span': 'Text',
  'Img': 'Image',
  'img': 'Image',
  'P': 'Text',
  'p': 'Text',
  'H1': 'Title',
  'h1': 'Title',
  'H2': 'Title',
  'h2': 'Title',
  'H3': 'Title',
  'h3': 'Title',
  'A': 'Link',
  'a': 'Link',
  // Lowercase → Capitalized
  'button': 'Button',
  'card': 'Card',
  'input': 'Input',
  'toggle': 'Toggle',
  'text': 'Text',
  'icon': 'Icon',
  'row': 'Row',
  'column': 'Column',
  'box': 'Box',
  'label': 'Label',
  'nav': 'Nav',
  'alert': 'Alert',
  'badge': 'Badge',
  'modal': 'Modal',
  'dropdown': 'Dropdown',
  'image': 'Image',
  'link': 'Link',
  'title': 'Title',
  'header': 'Header',
  'footer': 'Footer',
  'sidebar': 'Sidebar',
}

/**
 * Property name typo corrections
 */
const PROPERTY_TYPOS: Record<string, string> = {
  // Background typos
  'backgrund': 'bg',
  'backgorund': 'bg',
  'backgroundd': 'bg',
  'backgroud': 'bg',
  'backgound': 'bg',
  'bakground': 'bg',
  'bgcolor': 'bg',
  'bg-color': 'bg',
  'hintergrund': 'bg', // German

  // Padding typos
  'paddng': 'pad',
  'paddin': 'pad',
  'paddingg': 'pad',
  'padd': 'pad',
  'paddign': 'pad',
  'pading': 'pad',
  'abstand': 'pad', // German

  // Color typos
  'colr': 'col',
  'colour': 'col',
  'colorr': 'col',
  'colro': 'col',
  'farbe': 'col', // German
  'textfarbe': 'col', // German

  // Radius typos
  'raduis': 'rad',
  'radious': 'rad',
  'radiuss': 'rad',
  'raidus': 'rad',
  'radis': 'rad',
  'rundung': 'rad', // German
  'ecken': 'rad', // German

  // Border typos
  'boader': 'bor',
  'bordr': 'bor',
  'boreder': 'bor',
  'boarder': 'bor',
  'rahmen': 'bor', // German

  // Size typos
  'heigth': 'height',
  'heiht': 'height',
  'heihgt': 'height',
  'höhe': 'height', // German
  'widht': 'width',
  'witdh': 'width',
  'widh': 'width',
  'breite': 'width', // German

  // Font typos
  'fontt': 'font',
  'font-sizee': 'fs',
  'fontsize': 'fs',
  'schrift': 'font', // German
  'schriftgröße': 'fs', // German

  // Weight typos
  'weigth': 'weight',
  'wieght': 'weight',
  'weightt': 'weight',

  // Other typos
  'opactiy': 'opacity',
  'opacitiy': 'opacity',
  'marginn': 'margin',
  'marign': 'margin',
  'gapp': 'gap',
  'gaap': 'gap',
  'lücke': 'gap', // German
  'schatten': 'shadow', // German
  'sichtbar': 'visible', // German
  'versteckt': 'hidden', // German

  // Icon typos
  'icn': 'icon',
  'iconn': 'icon',
  'ikon': 'icon',
}

/**
 * Color name to hex mapping
 */
const COLOR_NAMES: Record<string, string> = {
  // Basic colors
  'red': '#EF4444',
  'green': '#22C55E',
  'blue': '#3B82F6',
  'yellow': '#EAB308',
  'orange': '#F97316',
  'purple': '#A855F7',
  'pink': '#EC4899',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'black': '#000000',
  'white': '#FFFFFF',

  // Tailwind-style colors
  'slate': '#64748B',
  'zinc': '#71717A',
  'neutral': '#737373',
  'stone': '#78716C',
  'amber': '#F59E0B',
  'lime': '#84CC16',
  'emerald': '#10B981',
  'teal': '#14B8A6',
  'cyan': '#06B6D4',
  'sky': '#0EA5E9',
  'indigo': '#6366F1',
  'violet': '#8B5CF6',
  'fuchsia': '#D946EF',
  'rose': '#F43F5E',

  // German colors
  'rot': '#EF4444',
  'grün': '#22C55E',
  'blau': '#3B82F6',
  'gelb': '#EAB308',
  'schwarz': '#000000',
  'weiß': '#FFFFFF',
  'weiss': '#FFFFFF',
  'grau': '#6B7280',
  'lila': '#A855F7',
  'rosa': '#EC4899',
}

/**
 * Tailwind color palette (500 variants)
 */
const TAILWIND_COLORS: Record<string, string> = {
  'slate-50': '#F8FAFC', 'slate-100': '#F1F5F9', 'slate-200': '#E2E8F0', 'slate-300': '#CBD5E1',
  'slate-400': '#94A3B8', 'slate-500': '#64748B', 'slate-600': '#475569', 'slate-700': '#334155',
  'slate-800': '#1E293B', 'slate-900': '#0F172A', 'slate-950': '#020617',

  'gray-50': '#F9FAFB', 'gray-100': '#F3F4F6', 'gray-200': '#E5E7EB', 'gray-300': '#D1D5DB',
  'gray-400': '#9CA3AF', 'gray-500': '#6B7280', 'gray-600': '#4B5563', 'gray-700': '#374151',
  'gray-800': '#1F2937', 'gray-900': '#111827', 'gray-950': '#030712',

  'red-50': '#FEF2F2', 'red-100': '#FEE2E2', 'red-200': '#FECACA', 'red-300': '#FCA5A5',
  'red-400': '#F87171', 'red-500': '#EF4444', 'red-600': '#DC2626', 'red-700': '#B91C1C',
  'red-800': '#991B1B', 'red-900': '#7F1D1D', 'red-950': '#450A0A',

  'orange-50': '#FFF7ED', 'orange-100': '#FFEDD5', 'orange-200': '#FED7AA', 'orange-300': '#FDBA74',
  'orange-400': '#FB923C', 'orange-500': '#F97316', 'orange-600': '#EA580C', 'orange-700': '#C2410C',
  'orange-800': '#9A3412', 'orange-900': '#7C2D12', 'orange-950': '#431407',

  'yellow-50': '#FEFCE8', 'yellow-100': '#FEF9C3', 'yellow-200': '#FEF08A', 'yellow-300': '#FDE047',
  'yellow-400': '#FACC15', 'yellow-500': '#EAB308', 'yellow-600': '#CA8A04', 'yellow-700': '#A16207',
  'yellow-800': '#854D0E', 'yellow-900': '#713F12', 'yellow-950': '#422006',

  'green-50': '#F0FDF4', 'green-100': '#DCFCE7', 'green-200': '#BBF7D0', 'green-300': '#86EFAC',
  'green-400': '#4ADE80', 'green-500': '#22C55E', 'green-600': '#16A34A', 'green-700': '#15803D',
  'green-800': '#166534', 'green-900': '#14532D', 'green-950': '#052E16',

  'blue-50': '#EFF6FF', 'blue-100': '#DBEAFE', 'blue-200': '#BFDBFE', 'blue-300': '#93C5FD',
  'blue-400': '#60A5FA', 'blue-500': '#3B82F6', 'blue-600': '#2563EB', 'blue-700': '#1D4ED8',
  'blue-800': '#1E40AF', 'blue-900': '#1E3A8A', 'blue-950': '#172554',

  'indigo-50': '#EEF2FF', 'indigo-100': '#E0E7FF', 'indigo-200': '#C7D2FE', 'indigo-300': '#A5B4FC',
  'indigo-400': '#818CF8', 'indigo-500': '#6366F1', 'indigo-600': '#4F46E5', 'indigo-700': '#4338CA',
  'indigo-800': '#3730A3', 'indigo-900': '#312E81', 'indigo-950': '#1E1B4B',

  'purple-50': '#FAF5FF', 'purple-100': '#F3E8FF', 'purple-200': '#E9D5FF', 'purple-300': '#D8B4FE',
  'purple-400': '#C084FC', 'purple-500': '#A855F7', 'purple-600': '#9333EA', 'purple-700': '#7E22CE',
  'purple-800': '#6B21A8', 'purple-900': '#581C87', 'purple-950': '#3B0764',

  'pink-50': '#FDF2F8', 'pink-100': '#FCE7F3', 'pink-200': '#FBCFE8', 'pink-300': '#F9A8D4',
  'pink-400': '#F472B6', 'pink-500': '#EC4899', 'pink-600': '#DB2777', 'pink-700': '#BE185D',
  'pink-800': '#9D174D', 'pink-900': '#831843', 'pink-950': '#500724',
}

/**
 * CSS property to Mirror shorthand mapping
 */
const CSS_TO_MIRROR: Record<string, string> = {
  'background-color': 'bg',
  'background': 'bg',
  'color': 'col',
  'text-color': 'col',
  'padding': 'pad',
  'padding-left': 'pad left',
  'padding-right': 'pad right',
  'padding-top': 'pad top',
  'padding-bottom': 'pad bottom',
  'margin': 'margin',
  'border-radius': 'rad',
  'border': 'bor',
  'border-width': 'bor',
  'border-color': 'boc',
  'font-size': 'fs',
  'font-weight': 'weight',
  'font-family': 'font',
  'line-height': 'line',
  'text-align': 'align',
  'opacity': 'opacity',
  'box-shadow': 'shadow',
  'gap': 'gap',
  'row-gap': 'gap',
  'column-gap': 'gap',
  'flex-direction': '',  // handled separately
  'display': '',  // handled separately
  'align-items': '',  // handled separately
  'justify-content': '',  // handled separately
}

/**
 * Common LLM mistake patterns and their corrections
 */
const CORRECTIONS: Array<{
  pattern: RegExp
  replacement: string
  description: string
}> = [
  // CSS-like property names → Mirror shortcuts
  { pattern: /\bbackground\s*:\s*/gi, replacement: 'bg ', description: 'background: → bg' },
  { pattern: /\bbackground\s+/gi, replacement: 'bg ', description: 'background → bg' },
  { pattern: /\bcolor\s*:\s*/gi, replacement: 'col ', description: 'color: → col' },
  { pattern: /\bcolor\s+(?=#)/gi, replacement: 'col ', description: 'color → col (hex)' },
  { pattern: /\bcolor\s+(white|black|transparent|inherit)/gi, replacement: 'col $1', description: 'color → col (keyword)' },
  { pattern: /\bcolor\s+(\$\w+)/gi, replacement: 'col $1', description: 'color → col (token)' },
  { pattern: /\bpadding\s*:\s*/gi, replacement: 'pad ', description: 'padding: → pad' },
  { pattern: /\bpadding\s+(\d)/gi, replacement: 'pad $1', description: 'padding → pad' },
  { pattern: /\bradius\s*:\s*/gi, replacement: 'rad ', description: 'radius: → rad' },
  { pattern: /\bradius\s+(\d)/gi, replacement: 'rad $1', description: 'radius → rad' },
  { pattern: /\bfont-size\s*:\s*/gi, replacement: 'fs ', description: 'font-size: → fs' },
  { pattern: /\bfont-size\s+(\d)/gi, replacement: 'fs $1', description: 'font-size → fs' },
  { pattern: /\bborder-radius\s*:\s*/gi, replacement: 'rad ', description: 'border-radius: → rad' },
  { pattern: /\bborder-color\s*:\s*/gi, replacement: 'boc ', description: 'border-color: → boc' },

  // Remove px suffixes
  { pattern: /(\d+)px\b/gi, replacement: '$1', description: 'Remove px suffix' },

  // Fix colons after properties
  { pattern: /\b(bg|col|pad|rad|fs|gap|bor|boc)\s*:\s*/gi, replacement: '$1 ', description: 'Remove colon after property' },

  // CSS justify/align → center
  { pattern: /\balign\s+center\s*,?\s*justify\s+center/gi, replacement: 'center', description: 'align center, justify center → center' },
  { pattern: /\bjustify\s+center\s*,?\s*align\s+center/gi, replacement: 'center', description: 'justify center, align center → center' },
  { pattern: /\balign-items\s*:\s*center/gi, replacement: 'center', description: 'align-items: center → center' },
  { pattern: /\bjustify-content\s*:\s*center/gi, replacement: 'center', description: 'justify-content: center → center' },

  // CSS display → Mirror layout
  { pattern: /\bdisplay\s*:\s*flex/gi, replacement: '', description: 'Remove display: flex' },
  { pattern: /\bflex-direction\s*:\s*row/gi, replacement: 'hor', description: 'flex-direction: row → hor' },
  { pattern: /\bflex-direction\s*:\s*column/gi, replacement: 'ver', description: 'flex-direction: column → ver' },

  // Width/height special values
  { pattern: /\bwidth\s*:\s*100%/gi, replacement: 'width full', description: 'width: 100% → width full' },
  { pattern: /\bwidth\s+100%/gi, replacement: 'width full', description: 'width 100% → width full' },
  { pattern: /\bheight\s*:\s*100%/gi, replacement: 'height full', description: 'height: 100% → height full' },

  // Remove invalid/unsupported properties that cause validation warnings
  { pattern: /,?\s*\bshake\b/gi, replacement: '', description: 'Remove unsupported shake animation' },
  { pattern: /,?\s*\bfixed\b/gi, replacement: '', description: 'Remove unsupported fixed position' },

  // Fix Icon syntax: Icon name X → Icon "X" (various formats)
  { pattern: /\bIcon\s+name\s*=\s*"([^"]+)"/gi, replacement: 'Icon "$1"', description: 'Icon name="X" → Icon "X"' },
  { pattern: /\bIcon\s+name\s*=\s*'([^']+)'/gi, replacement: 'Icon "$1"', description: "Icon name='X' → Icon \"X\"" },
  { pattern: /\bIcon\s+name\s+(mdi-[\w-]+)/gi, replacement: 'Icon "$1"', description: 'Icon name X → Icon "X"' },
  { pattern: /\bIcon\s+name\s+([\w-]+)/gi, replacement: 'Icon "$1"', description: 'Icon name X → Icon "X"' },

  // Fix flex shorthand → width full (CSS flex: 1 means grow)
  { pattern: /\bflex\s+1\b/gi, replacement: 'width full', description: 'flex 1 → width full' },
  { pattern: /\bflex\s*:\s*1\b/gi, replacement: 'width full', description: 'flex: 1 → width full' },

  // Clean up multiple commas/spaces (preserve newlines AND leading whitespace!)
  { pattern: /,\s*,/g, replacement: ',', description: 'Remove double commas' },
  // Only normalize spaces that are NOT leading whitespace (use lookbehind for non-start)
  { pattern: /(\S) {2,}/g, replacement: '$1 ', description: 'Normalize horizontal spaces' },
]

/**
 * Fix component name typos
 * Returns modified code and list of corrections made
 */
function fixComponentTypos(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  for (const [typo, correct] of Object.entries(COMPONENT_TYPOS)) {
    // Match component name at start of line (with optional leading whitespace) or after certain characters
    const pattern = new RegExp(`(^|\\n|\\s|-)${typo}(?=\\s|$|:)`, 'g')
    const before = result
    result = result.replace(pattern, `$1${correct}`)
    if (result !== before) {
      corrections.push(`${typo} → ${correct}`)
    }
  }

  return { code: result, corrections }
}

/**
 * Fix property name typos
 */
function fixPropertyTypos(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  for (const [typo, correct] of Object.entries(PROPERTY_TYPOS)) {
    // Match property name followed by space and value
    const pattern = new RegExp(`\\b${typo}\\s+`, 'gi')
    const before = result
    result = result.replace(pattern, `${correct} `)
    if (result !== before) {
      corrections.push(`${typo} → ${correct}`)
    }
  }

  return { code: result, corrections }
}

/**
 * Fix structural issues (braces, semicolons, HTML tags)
 */
function fixStructuralIssues(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Remove curly braces around property blocks
  // e.g., Button { bg #333 } → Button bg #333
  const bracesBefore = result
  result = result.replace(/\s*\{([^{}]*)\}\s*/g, ' $1 ')
  if (result !== bracesBefore) {
    corrections.push('Remove curly braces')
  }

  // Remove semicolons
  const semisBefore = result
  result = result.replace(/;/g, ',').replace(/,\s*$/gm, '')
  if (result !== semisBefore) {
    corrections.push('Replace semicolons with commas')
  }

  // Convert HTML tags to Mirror components
  // <div>content</div> → Box "content"
  const htmlTagBefore = result
  result = result.replace(/<div[^>]*>([^<]*)<\/div>/gi, 'Box "$1"')
  result = result.replace(/<span[^>]*>([^<]*)<\/span>/gi, 'Text "$1"')
  result = result.replace(/<p[^>]*>([^<]*)<\/p>/gi, 'Text "$1"')
  result = result.replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, 'Title "$1"')
  result = result.replace(/<a[^>]*>([^<]*)<\/a>/gi, 'Link "$1"')
  result = result.replace(/<img[^>]*>/gi, 'Image')
  result = result.replace(/<button[^>]*>([^<]*)<\/button>/gi, 'Button "$1"')
  result = result.replace(/<input[^>]*>/gi, 'Input')
  if (result !== htmlTagBefore) {
    corrections.push('Convert HTML tags to Mirror')
  }

  // Remove any remaining HTML-like angle brackets
  const anglesBefore = result
  result = result.replace(/<\/?[a-z][^>]*>/gi, '')
  if (result !== anglesBefore) {
    corrections.push('Remove HTML tags')
  }

  return { code: result, corrections }
}

/**
 * Fix value issues (missing #, rgb→hex, rem→number)
 */
function fixValueIssues(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Add missing # to hex colors
  // bg 3B82F6 → bg #3B82F6 (but not for numbers like pad 16)
  const hexBefore = result
  result = result.replace(/\b(bg|col|boc|color|background)\s+([0-9A-Fa-f]{6})(?!\w)/g, '$1 #$2')
  result = result.replace(/\b(bg|col|boc|color|background)\s+([0-9A-Fa-f]{3})(?!\w)/g, '$1 #$2')
  if (result !== hexBefore) {
    corrections.push('Add # to hex colors')
  }

  // Convert rgb() to hex
  const rgbBefore = result
  result = result.replace(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/gi, (match, r, g, b) => {
    const hex = '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
    return hex
  })
  if (result !== rgbBefore) {
    corrections.push('Convert rgb() to hex')
  }

  // Convert rgba() to hex (ignore alpha)
  const rgbaBefore = result
  result = result.replace(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)/gi, (match, r, g, b) => {
    const hex = '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
    return hex
  })
  if (result !== rgbaBefore) {
    corrections.push('Convert rgba() to hex')
  }

  // Convert hsl() to hex (approximate)
  const hslBefore = result
  result = result.replace(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/gi, (match, h, s, l) => {
    // Simple HSL to RGB conversion
    const hue = parseInt(h) / 360
    const sat = parseInt(s) / 100
    const lig = parseInt(l) / 100
    const c = (1 - Math.abs(2 * lig - 1)) * sat
    const x = c * (1 - Math.abs((hue * 6) % 2 - 1))
    const m = lig - c / 2
    let r = 0, g = 0, b = 0
    if (hue < 1/6) { r = c; g = x; b = 0 }
    else if (hue < 2/6) { r = x; g = c; b = 0 }
    else if (hue < 3/6) { r = 0; g = c; b = x }
    else if (hue < 4/6) { r = 0; g = x; b = c }
    else if (hue < 5/6) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }
    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  })
  if (result !== hslBefore) {
    corrections.push('Convert hsl() to hex')
  }

  // Remove rem suffix (convert to approximate px)
  const remBefore = result
  result = result.replace(/(\d+(?:\.\d+)?)rem\b/g, (match, num) => {
    return String(Math.round(parseFloat(num) * 16))
  })
  if (result !== remBefore) {
    corrections.push('Convert rem to number')
  }

  // Remove em suffix (convert to approximate px)
  const emBefore = result
  result = result.replace(/(\d+(?:\.\d+)?)em\b/g, (match, num) => {
    return String(Math.round(parseFloat(num) * 16))
  })
  if (result !== emBefore) {
    corrections.push('Convert em to number')
  }

  // Remove pt suffix (convert to px)
  const ptBefore = result
  result = result.replace(/(\d+(?:\.\d+)?)pt\b/g, (match, num) => {
    return String(Math.round(parseFloat(num) * 1.333))
  })
  if (result !== ptBefore) {
    corrections.push('Convert pt to number')
  }

  // Fix width/height percentages → full
  const percentBefore = result
  result = result.replace(/\b(width|height)\s+100\s*%/gi, '$1 full')
  if (result !== percentBefore) {
    corrections.push('Convert 100% to full')
  }

  // Convert viewport units to full
  const vwBefore = result
  result = result.replace(/\b(width)\s+100vw\b/gi, '$1 full')
  result = result.replace(/\b(height)\s+100vh\b/gi, '$1 full')
  if (result !== vwBefore) {
    corrections.push('Convert viewport units to full')
  }

  return { code: result, corrections }
}

/**
 * Fix CSS property syntax to Mirror
 */
function fixCSSProperties(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Convert CSS properties to Mirror shortcuts
  for (const [cssName, mirrorName] of Object.entries(CSS_TO_MIRROR)) {
    if (!mirrorName) continue // Skip empty mappings (handled elsewhere)

    // Match: property-name: value or property-name value
    const colonPattern = new RegExp(`\\b${cssName.replace('-', '[-]?')}\\s*:\\s*`, 'gi')
    const before = result
    result = result.replace(colonPattern, `${mirrorName} `)
    if (result !== before) {
      corrections.push(`${cssName}: → ${mirrorName}`)
    }
  }

  return { code: result, corrections }
}

/**
 * Fix missing commas between properties
 */
function fixMissingCommas(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Fix: property value property value → property value, property value
  // Match property-value pairs and ensure commas between them
  const before = result

  // Pattern: (property value) followed by (property) without comma
  // e.g., "bg #333 pad 16" → "bg #333, pad 16"
  const propertyNames = 'bg|col|pad|rad|fs|is|gap|bor|boc|width|height|weight|font|line|align|opacity|shadow|center|hor|ver|left|right|top|bottom|hidden|visible|disabled'
  const pattern = new RegExp(`(${propertyNames})\\s+([^,\\n]+?)\\s+(${propertyNames})\\b`, 'gi')

  // Apply multiple times to catch chains
  for (let i = 0; i < 5; i++) {
    const prevResult = result
    result = result.replace(pattern, '$1 $2, $3')
    if (result === prevResult) break
  }

  if (result !== before) {
    corrections.push('Add missing commas')
  }

  return { code: result, corrections }
}

/**
 * Convert color names to hex values
 */
function fixColorNames(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Convert Tailwind colors (e.g., blue-500 → #3B82F6)
  const tailwindBefore = result
  for (const [name, hex] of Object.entries(TAILWIND_COLORS)) {
    const pattern = new RegExp(`\\b(bg|col|boc)\\s+${name}\\b`, 'gi')
    result = result.replace(pattern, `$1 ${hex}`)
  }
  if (result !== tailwindBefore) {
    corrections.push('Convert Tailwind colors to hex')
  }

  // Convert basic color names (e.g., red → #EF4444)
  const colorBefore = result
  for (const [name, hex] of Object.entries(COLOR_NAMES)) {
    // Only convert when used with color properties, not as component names or text
    const pattern = new RegExp(`\\b(bg|col|boc)\\s+${name}\\b`, 'gi')
    result = result.replace(pattern, `$1 ${hex}`)
  }
  if (result !== colorBefore) {
    corrections.push('Convert color names to hex')
  }

  return { code: result, corrections }
}

/**
 * Remove duplicate properties (keep last occurrence)
 */
function removeDuplicateProperties(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Process each line separately
  const lines = result.split('\n')
  const processedLines = lines.map(line => {
    // Find all property assignments on this line
    const propertyPattern = /\b(bg|col|pad|rad|fs|is|gap|bor|boc|width|height|weight|opacity)\s+[^,\n]+/gi
    const matches = line.match(propertyPattern)

    if (matches && matches.length > 1) {
      // Check for duplicates
      const seen = new Map<string, string>()
      for (const match of matches) {
        const propName = match.split(/\s+/)[0].toLowerCase()
        seen.set(propName, match)
      }

      // If we found duplicates, rebuild the line keeping only last
      if (seen.size < matches.length) {
        // Remove all occurrences and add back the last one for each property
        let newLine = line
        for (const [prop, lastMatch] of seen) {
          // Remove all occurrences of this property
          const removePattern = new RegExp(`\\b${prop}\\s+[^,\\n]+,?\\s*`, 'gi')
          const allMatches = [...line.matchAll(removePattern)]
          if (allMatches.length > 1) {
            corrections.push(`Remove duplicate ${prop}`)
          }
        }
        return newLine
      }
    }

    return line
  })

  result = processedLines.join('\n')
  return { code: result, corrections }
}

/**
 * Fix property order (strings should be last)
 */
function fixPropertyOrder(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Process each line
  const lines = result.split('\n')
  const processedLines = lines.map(line => {
    // Check if line has properties and a string that's not at the end
    const stringMatch = line.match(/"[^"]*"/)
    if (!stringMatch) return line

    const stringContent = stringMatch[0]
    const stringIndex = line.indexOf(stringContent)
    const afterString = line.slice(stringIndex + stringContent.length).trim()

    // If there's content after the string (that's not just a comma or closing), it's wrong order
    if (afterString && afterString !== ',' && !afterString.startsWith('\n')) {
      // Only fix if there are actual properties after
      if (/\b(bg|col|pad|rad|fs|width|height)\s+/.test(afterString)) {
        // Move string to end
        const beforeString = line.slice(0, stringIndex).replace(/,\s*$/, '')
        const propsAfter = afterString.replace(/^,\s*/, '').replace(/,\s*$/, '')

        if (propsAfter) {
          corrections.push('Move string to end of line')
          return `${beforeString}, ${propsAfter}, ${stringContent}`
        }
      }
    }

    return line
  })

  result = processedLines.join('\n')
  return { code: result, corrections }
}

/**
 * Fuzzy match for unknown components using Levenshtein distance
 */
function fuzzyMatchComponent(name: string): string | null {
  const knownComponents = [
    'Button', 'Card', 'Input', 'Toggle', 'Text', 'Icon', 'Row', 'Column',
    'Box', 'Label', 'Nav', 'Alert', 'Badge', 'Modal', 'Dropdown', 'Image',
    'Link', 'Title', 'Header', 'Footer', 'Sidebar', 'Menu', 'List', 'Item',
    'Checkbox', 'Radio', 'Select', 'Textarea', 'Divider', 'Avatar', 'Tooltip'
  ]

  // Simple Levenshtein distance
  function levenshtein(a: string, b: string): number {
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    return matrix[b.length][a.length]
  }

  const nameLower = name.toLowerCase()
  let bestMatch: string | null = null
  let bestDistance = Infinity

  for (const component of knownComponents) {
    const distance = levenshtein(nameLower, component.toLowerCase())
    // Only accept if distance is small relative to word length (max 2 edits for short words)
    const maxDistance = Math.min(2, Math.floor(name.length / 2))
    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance
      bestMatch = component
    }
  }

  return bestMatch
}

/**
 * Apply fuzzy matching for unknown components
 */
function fixUnknownComponents(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Find potential component names (capitalized words at line start)
  const lines = result.split('\n')
  const processedLines = lines.map(line => {
    const match = line.match(/^(\s*)([A-Z][a-z]+)\b/)
    if (!match) return line

    const [, indent, componentName] = match

    // Skip if it's a known component or in our typo list
    if (COMPONENT_TYPOS[componentName]) return line

    // Try fuzzy matching
    const fuzzyMatch = fuzzyMatchComponent(componentName)
    if (fuzzyMatch && fuzzyMatch !== componentName) {
      corrections.push(`Fuzzy: ${componentName} → ${fuzzyMatch}`)
      return line.replace(componentName, fuzzyMatch)
    }

    return line
  })

  result = processedLines.join('\n')
  return { code: result, corrections }
}

/**
 * Fix quote issues
 */
function fixQuoteIssues(code: string): { code: string; corrections: string[] } {
  const corrections: string[] = []
  let result = code

  // Convert single quotes to double quotes
  const singleQuoteBefore = result
  result = result.replace(/'([^']+)'/g, '"$1"')
  if (result !== singleQuoteBefore) {
    corrections.push('Convert single quotes to double quotes')
  }

  // Convert backticks to double quotes
  const backtickBefore = result
  result = result.replace(/`([^`]+)`/g, '"$1"')
  if (result !== backtickBefore) {
    corrections.push('Convert backticks to double quotes')
  }

  // Fix unquoted string values that should be quoted
  // e.g., Button Click me → Button "Click me"
  // This is tricky - only apply to known text content patterns
  const unquotedBefore = result
  // Match: Component followed by text that looks like content (not properties)
  result = result.replace(/^(\s*(?:Button|Text|Title|Label|Link)\s+)([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß\s!?.,]+)$/gm, (match, prefix, text) => {
    // Only if text doesn't look like properties
    if (!/\b(bg|col|pad|rad|fs|width|height|#)\b/.test(text)) {
      return `${prefix}"${text.trim()}"`
    }
    return match
  })
  if (result !== unquotedBefore) {
    corrections.push('Add missing quotes around text')
  }

  return { code: result, corrections }
}

/**
 * Convert JavaScript Builder syntax to Mirror DSL
 * e.g. Button({ bg: '#3B82F6', pad: 12 }, "Text") → Button bg #3B82F6, pad 12, "Text"
 */
function convertJsBuilderToMirror(code: string): { code: string; wasModified: boolean } {
  let wasModified = false
  let result = code

  // Step 1: Convert Component({ props }, [...children]) with children array
  // Match: Card({ pad: 16 }, [ ... ])
  const withChildrenPattern = /(\w+)\(\{\s*([^}]+)\s*\},\s*\[\s*([\s\S]*?)\s*\]\s*\)/g
  result = result.replace(withChildrenPattern, (match, component, propsStr, childrenStr) => {
    wasModified = true

    // Convert properties
    const props = convertPropsString(propsStr)

    // Process children (each on its own line after conversion)
    // Note: childrenStr might contain multiple Component(...) calls
    const processedChildren = childrenStr
      .split(/(?<=\))\s*,?\s*(?=\w+\()/)
      .map((child: string) => child.trim())
      .filter((child: string) => child)
      .map((child: string) => {
        const converted = convertSingleComponent(child)
        return '  ' + converted
      })
      .join('\n')

    return `${component} ${props}\n${processedChildren}`
  })

  // Step 2: Convert simple Component({ props }, "text") without children array
  const simplePattern = /(\w+)\(\{\s*([^}]+)\s*\}(?:,\s*"([^"]*)")?\)/g
  result = result.replace(simplePattern, (match, component, propsStr, text) => {
    wasModified = true

    const props = convertPropsString(propsStr)
    let mirrorLine = `${component} ${props}`
    if (text) {
      mirrorLine += `, "${text}"`
    }

    return mirrorLine
  })

  // Step 3: Remove remaining brackets and braces
  result = result.replace(/\[\s*\n?/g, '')
  result = result.replace(/\s*\]/g, '')
  result = result.replace(/\{\s*/g, '')
  result = result.replace(/\s*\}/g, '')

  return { code: result, wasModified }
}

/**
 * Convert a single Component({ ... }, "text") to Mirror syntax
 */
function convertSingleComponent(code: string): string {
  const match = code.match(/(\w+)\(\{\s*([^}]+)\s*\}(?:,\s*"([^"]*)")?\)/)
  if (!match) return code.trim()

  const [, component, propsStr, text] = match
  const props = convertPropsString(propsStr)

  let mirrorLine = `${component} ${props}`
  if (text) {
    mirrorLine += `, "${text}"`
  }

  return mirrorLine
}

/**
 * Convert JS-style property string to Mirror syntax
 * "bg: '#3B82F6', pad: 12" → "bg #3B82F6, pad 12"
 */
function convertPropsString(propsStr: string): string {
  return propsStr
    .split(',')
    .map((p: string) => p.trim())
    .filter((p: string) => p)
    .map((p: string) => {
      const colonIdx = p.indexOf(':')
      if (colonIdx === -1) return p

      const key = p.slice(0, colonIdx).trim()
      let val = p.slice(colonIdx + 1).trim()

      // Remove quotes from string values
      val = val.replace(/^['"]|['"]$/g, '')

      return `${key} ${val}`
    })
    .join(', ')
}

/**
 * Normalize indentation to consistent 2-space indentation
 */
function normalizeIndentation(code: string): { code: string; wasModified: boolean } {
  const lines = code.split('\n')
  let wasModified = false

  // First pass: detect the base indent unit (2-space, 4-space, or tabs)
  let minIndent = Infinity
  for (const line of lines) {
    const match = line.match(/^(\s+)/)
    if (match && match[1].length > 0) {
      // Only consider spaces (tabs handled separately)
      const spaces = match[1].replace(/\t/g, '').length
      if (spaces > 0 && spaces < minIndent) {
        minIndent = spaces
      }
    }
  }

  // If no indent found, default to 2
  const baseIndent = minIndent === Infinity ? 2 : Math.min(minIndent, 4)

  const normalizedLines = lines.map(line => {
    // Count leading whitespace
    const match = line.match(/^(\s*)(.*)$/)
    if (!match) return line

    const [, whitespace, content] = match
    if (!content.trim()) return '' // Empty line

    // Calculate indent level
    let indentLevel = 0

    // Count tabs as 1 level each
    const tabCount = (whitespace.match(/\t/g) || []).length
    indentLevel += tabCount

    // Count spaces - divide by detected base indent
    const spaceCount = whitespace.replace(/\t/g, '').length
    if (spaceCount > 0) {
      // Use detected base indent (2 or 4) to determine levels
      indentLevel += Math.round(spaceCount / baseIndent)
    }

    const newWhitespace = '  '.repeat(indentLevel)
    if (newWhitespace !== whitespace) {
      wasModified = true
    }

    return newWhitespace + content.trim()
  })

  return {
    code: normalizedLines.join('\n'),
    wasModified
  }
}

export interface PostProcessResult {
  original: string
  processed: string
  corrections: string[]
  wasModified: boolean
}

export interface PostProcessOptions {
  /** Pipeline type - affects processing rules */
  pipeline?: 'nl-translation' | 'generation' | 'syntax-correction' | 'js-builder'
}

/**
 * Apply post-processing corrections to LLM output
 *
 * This function now delegates most work to the consolidated self-healing system,
 * and only adds JS Builder conversion, fuzzy matching, and indentation normalization.
 */
export function postProcess(code: string, options: PostProcessOptions = {}): PostProcessResult {
  let processed = code
  const corrections: string[] = []

  // Step 0: Convert JS Builder syntax to Mirror DSL (for js-builder pipeline)
  if (options.pipeline === 'js-builder' || code.match(/^\w+\(\{[^}]+\}/m)) {
    const jsResult = convertJsBuilderToMirror(processed)
    if (jsResult.wasModified) {
      corrections.push('Convert JS Builder syntax to Mirror')
      processed = jsResult.code
    }
  }

  // Step 1: Apply consolidated self-healing fixes (CSS, typos, structural, value fixes)
  const beforeSelfHealing = processed
  processed = applyAllFixes(processed)
  if (processed !== beforeSelfHealing) {
    corrections.push('Applied self-healing fixes')
  }

  // Step 2: Apply fuzzy matching for unknown components (not in self-healing yet)
  const fuzzyResult = fixUnknownComponents(processed)
  if (fuzzyResult.corrections.length > 0) {
    corrections.push(...fuzzyResult.corrections)
    processed = fuzzyResult.code
  }

  // Step 3: Convert color names to hex (Tailwind colors not in self-healing)
  const colorResult = fixColorNames(processed)
  if (colorResult.corrections.length > 0) {
    corrections.push(...colorResult.corrections)
    processed = colorResult.code
  }

  // Step 4: Normalize indentation to 2-space
  const indentResult = normalizeIndentation(processed)
  if (indentResult.wasModified) {
    corrections.push('Normalize to 2-space indentation')
    processed = indentResult.code
  }

  // Step 5: Final cleanup - trim and remove excessive blank lines
  processed = processed
    .split('\n')
    .map(line => line.trimEnd())
    .filter((line, i, arr) => {
      if (line === '' && i > 0 && arr[i - 1] === '') return false
      return true
    })
    .join('\n')
    .trim()

  return {
    original: code,
    processed,
    corrections,
    wasModified: corrections.length > 0
  }
}

/**
 * Check if code needs post-processing
 */
export function needsPostProcessing(code: string): boolean {
  return CORRECTIONS.some(({ pattern }) => pattern.test(code))
}

/**
 * Aggressive post-processing for syntax-correction pipeline
 * Applies multiple rounds of corrections until output stabilizes
 */
export function postProcessWithHealing(
  code: string,
  validateFn: (code: string) => { valid: boolean; errors?: string[] },
  options: PostProcessOptions = {}
): PostProcessResult & { healingRounds: number } {
  let result = postProcess(code, options)
  let healingRounds = 0
  const maxRounds = 3

  // If already valid, return early
  const initialValidation = validateFn(result.processed)
  if (initialValidation.valid) {
    return { ...result, healingRounds: 0 }
  }

  // Try healing rounds
  while (healingRounds < maxRounds) {
    healingRounds++
    let healed = result.processed

    // Apply additional aggressive fixes based on validation errors
    const validation = validateFn(healed)
    if (validation.valid) {
      break
    }

    // Try to fix based on error patterns
    if (validation.errors) {
      for (const error of validation.errors) {
        // Unknown component → try to find closest match
        const unknownMatch = error.match(/Unknown component[:\s]+['"]?(\w+)['"]?/i)
        if (unknownMatch) {
          const unknown = unknownMatch[1]
          const correction = COMPONENT_TYPOS[unknown]
          if (correction) {
            healed = healed.replace(new RegExp(`\\b${unknown}\\b`, 'g'), correction)
            result.corrections.push(`Heal: ${unknown} → ${correction}`)
          }
        }

        // Unknown property → try to find closest match
        const propMatch = error.match(/Unknown property[:\s]+['"]?(\w+)['"]?/i)
        if (propMatch) {
          const unknown = propMatch[1]
          const correction = PROPERTY_TYPOS[unknown]
          if (correction) {
            healed = healed.replace(new RegExp(`\\b${unknown}\\b`, 'g'), correction)
            result.corrections.push(`Heal: ${unknown} → ${correction}`)
          }
        }
      }
    }

    // Re-run full post-processing on healed code
    const healedResult = postProcess(healed, options)
    result = {
      original: code,
      processed: healedResult.processed,
      corrections: [...result.corrections, ...healedResult.corrections],
      wasModified: true
    }

    // Check if now valid
    if (validateFn(result.processed).valid) {
      break
    }
  }

  return { ...result, healingRounds }
}
