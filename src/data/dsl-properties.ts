/**
 * DSL property definitions for the PropertyPicker.
 * Contains all available properties with search keywords in German and English.
 *
 * Keywords are organized by:
 * - German terms (primary)
 * - English terms
 * - CSS property names (for developers)
 * - Tailwind-like shortcuts
 * - Common typos
 * - Conceptual/intent-based terms
 */

// Value picker types that should open after property selection
export type ValuePickerType =
  | 'color'
  | 'spacing'
  | 'font'
  | 'icon'
  | 'shadow'
  | 'weight'
  | 'value'
  | 'none'

export interface Property {
  name: string
  syntax: string
  description: string
  category: string
  keywords: string[] // German + English + synonyms for search
  valuePicker?: ValuePickerType // Which picker opens after selection
  valuePickerProperty?: string // Property name for value picker context
}

// ============================================
// Shared keyword sets for reuse
// ============================================

// Color names that should trigger color properties
const COLOR_NAMES_DE = [
  'rot', 'blau', 'grün', 'gelb', 'orange', 'lila', 'violett', 'pink', 'rosa',
  'schwarz', 'weiss', 'grau', 'braun', 'türkis', 'cyan', 'magenta', 'beige',
  'gold', 'silber', 'navy', 'olive', 'bordeaux', 'weinrot', 'hellblau',
  'dunkelblau', 'hellgrün', 'dunkelgrün', 'hellgrau', 'dunkelgrau',
]

const COLOR_NAMES_EN = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'violet', 'pink',
  'black', 'white', 'gray', 'grey', 'brown', 'teal', 'cyan', 'magenta',
  'gold', 'silver', 'navy', 'olive', 'maroon', 'aqua', 'coral', 'crimson',
  'indigo', 'lime', 'salmon', 'tan', 'khaki', 'lavender', 'mint',
]

// All DSL properties with their categories and comprehensive search keywords
export const properties: Property[] = [
  // ============================================
  // Layout
  // ============================================
  {
    name: 'hor',
    syntax: 'hor',
    description: 'Horizontal layout',
    category: 'Layout',
    keywords: [
      // German
      'horizontal', 'nebeneinander', 'zeile', 'reihe', 'waagerecht', 'seitlich',
      'x-achse', 'links nach rechts', 'seite an seite', 'horizontal anordnen',
      'horizontal layout', 'in einer reihe', 'querformat',
      // English
      'row', 'inline', 'side by side', 'left to right', 'horizontal',
      // CSS/Technical
      'flex-row', 'flexrow', 'display flex', 'flex direction row', 'flex-direction row',
      'display: flex', 'flexbox row',
      // Tailwind
      'flex-row',
      // Typos
      'horizontl', 'horizntal', 'horiontal', 'hroizontal', 'horz', 'horiz',
      'nebeneinader', 'nebeneienander',
    ],
  },
  {
    name: 'ver',
    syntax: 'ver',
    description: 'Vertical layout',
    category: 'Layout',
    keywords: [
      // German
      'vertikal', 'untereinander', 'spalte', 'stapel', 'senkrecht', 'y-achse',
      'übereinander', 'von oben nach unten', 'vertikal anordnen', 'hochformat',
      'vertikal layout', 'gestapelt',
      // English
      'vertical', 'column', 'stack', 'stacked', 'top to bottom', 'col',
      // CSS/Technical
      'flex-column', 'flexcol', 'flex direction column', 'flex-direction column',
      'display: flex', 'flexbox column',
      // Tailwind
      'flex-col',
      // Typos
      'vertiakl', 'vertkal', 'verticl', 'vrtical', 'vert', 'untereinader',
      'untereienander', 'colum', 'collumn',
    ],
  },
  {
    name: 'gap',
    syntax: 'gap ',
    description: 'Gap between children',
    category: 'Layout',
    keywords: [
      // German
      'abstand', 'zwischenraum', 'lücke', 'freiraum', 'leerraum', 'spalt',
      'abstand zwischen', 'kindabstand', 'elementabstand', 'innenabstand kinder',
      'platz zwischen', 'raum zwischen',
      // English
      'spacing', 'gutter', 'space', 'space between', 'child spacing',
      'element spacing', 'inner spacing',
      // CSS/Technical
      'flex gap', 'grid gap', 'gap', 'row-gap', 'column-gap',
      // Tailwind
      'gap-', 'space-x', 'space-y',
      // Typos
      'abstnd', 'abstend', 'absatnd', 'gpa', 'gaap',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'gap',
  },
  {
    name: 'wrap',
    syntax: 'wrap',
    description: 'Wrap children',
    category: 'Layout',
    keywords: [
      // German
      'umbruch', 'umbrechen', 'mehrzeilig', 'zeilenumbruch', 'neue zeile',
      'automatischer umbruch', 'fliessend', 'überlauf umbrechen',
      // English
      'wrap', 'multiline', 'line break', 'flow', 'wrapping',
      // CSS/Technical
      'flex-wrap', 'flexwrap', 'flex-wrap: wrap',
      // Tailwind
      'flex-wrap',
      // Typos
      'wrappen', 'wraping', 'warp', 'umrbuch',
    ],
  },
  {
    name: 'grow',
    syntax: 'grow',
    description: 'Flex grow',
    category: 'Layout',
    keywords: [
      // German
      'wachsen', 'ausdehnen', 'füllen', 'dehnen', 'vergrössern', 'expandieren',
      'platz ausfüllen', 'verfügbaren platz nutzen', 'strecken', 'erweitern',
      'flexibel wachsen', 'restplatz',
      // English
      'expand', 'fill', 'stretch', 'grow', 'take space', 'fill space',
      'flexible', 'expand to fill',
      // CSS/Technical
      'flex-grow', 'flexgrow', 'flex-grow: 1', 'flex: 1',
      // Tailwind
      'flex-1', 'flex-grow', 'grow',
      // Typos
      'grwo', 'groow', 'gro', 'wachsne',
    ],
  },
  {
    name: 'shrink',
    syntax: 'shrink 0',
    description: 'Flex shrink',
    category: 'Layout',
    keywords: [
      // German
      'schrumpfen', 'verkleinern', 'nicht schrumpfen', 'nicht kleiner',
      'grösse behalten', 'fixe grösse', 'nicht zusammendrücken',
      // English
      'shrink', 'no shrink', 'fixed size', 'dont shrink', 'keep size',
      // CSS/Technical
      'flex-shrink', 'flex-shrink: 0', 'shrink 0',
      // Tailwind
      'flex-shrink-0', 'shrink-0',
      // Typos
      'shrnk', 'schrumpf', 'shrik', 'schrumpfne',
    ],
  },

  // ============================================
  // Alignment
  // ============================================
  {
    name: 'hor-l',
    syntax: 'hor-l',
    description: 'Align left',
    category: 'Alignment',
    keywords: [
      // German
      'links', 'linksbündig', 'linksausrichtung', 'nach links', 'am linken rand',
      'links ausrichten', 'text links', 'linke seite',
      // English
      'left', 'align left', 'left align', 'start', 'left side',
      // CSS/Technical
      'justify-start', 'align-left', 'flex-start', 'justify-content: start',
      'text-align: left',
      // Tailwind
      'justify-start', 'text-left', 'items-start',
      // Typos
      'lnks', 'linsk', 'likns', 'lefft', 'linksbüdnig',
    ],
  },
  {
    name: 'hor-cen',
    syntax: 'hor-cen',
    description: 'Center horizontally',
    category: 'Alignment',
    keywords: [
      // German
      'zentrieren', 'mitte', 'mittig', 'zentriert', 'zentrum', 'horizontal zentrieren',
      'in der mitte', 'mittelachse', 'text zentrieren', 'zentral',
      // English
      'center', 'centered', 'middle', 'centre', 'horizontal center',
      // CSS/Technical
      'justify-center', 'text-align: center', 'margin: auto', 'align-center',
      // Tailwind
      'justify-center', 'text-center', 'mx-auto',
      // Typos
      'centern', 'zentrierung', 'zentrier', 'cetner', 'cneter', 'zentrirt',
      'zenrtiert', 'mitig', 'ceter',
    ],
  },
  {
    name: 'hor-r',
    syntax: 'hor-r',
    description: 'Align right',
    category: 'Alignment',
    keywords: [
      // German
      'rechts', 'rechtsbündig', 'rechtsausrichtung', 'nach rechts', 'am rechten rand',
      'rechts ausrichten', 'text rechts', 'rechte seite',
      // English
      'right', 'align right', 'right align', 'end', 'right side',
      // CSS/Technical
      'justify-end', 'align-right', 'flex-end', 'justify-content: end',
      'text-align: right',
      // Tailwind
      'justify-end', 'text-right', 'items-end',
      // Typos
      'rchts', 'rechst', 'rects', 'righht', 'rechtsbüdnig',
    ],
  },
  {
    name: 'hor-between',
    syntax: 'hor-between',
    description: 'Space between horizontal',
    category: 'Alignment',
    keywords: [
      // German
      'verteilen', 'gleichmässig', 'gleichverteilt', 'auseinander', 'verteilt',
      'platz zwischen', 'gleichmässig verteilen', 'abstand gleichmässig',
      // English
      'space between', 'spread', 'distributed', 'justify', 'even spacing',
      'distribute evenly',
      // CSS/Technical
      'justify-between', 'space-between', 'justify-content: space-between',
      // Tailwind
      'justify-between',
      // Typos
      'between', 'betwen', 'beteween', 'gleichmäsig',
    ],
  },
  {
    name: 'ver-t',
    syntax: 'ver-t',
    description: 'Align top',
    category: 'Alignment',
    keywords: [
      // German
      'oben', 'obenbündig', 'nach oben', 'oberseite', 'oberkante', 'oben ausrichten',
      'am oberen rand', 'top',
      // English
      'top', 'align top', 'top align', 'start', 'upper',
      // CSS/Technical
      'align-top', 'align-start', 'align-items: start', 'vertical-align: top',
      // Tailwind
      'items-start',
      // Typos
      'tp', 'tpo', 'topp', 'obn', 'obne',
    ],
  },
  {
    name: 'ver-cen',
    syntax: 'ver-cen',
    description: 'Center vertically',
    category: 'Alignment',
    keywords: [
      // German
      'vertikal zentrieren', 'mitte', 'mittig', 'zentriert vertikal', 'vmittig',
      'vertikal mittig', 'senkrecht zentrieren',
      // English
      'center', 'middle', 'vertical center', 'vertically centered',
      // CSS/Technical
      'align-center', 'align-items: center', 'vertical-align: middle',
      // Tailwind
      'items-center',
      // Typos
      'cetner', 'mitit', 'zentrirt',
    ],
  },
  {
    name: 'ver-b',
    syntax: 'ver-b',
    description: 'Align bottom',
    category: 'Alignment',
    keywords: [
      // German
      'unten', 'untenbündig', 'nach unten', 'unterseite', 'unterkante',
      'unten ausrichten', 'am unteren rand', 'bottom',
      // English
      'bottom', 'align bottom', 'bottom align', 'end', 'lower',
      // CSS/Technical
      'align-bottom', 'align-end', 'align-items: end', 'vertical-align: bottom',
      // Tailwind
      'items-end',
      // Typos
      'btm', 'botom', 'bottm', 'untn', 'unte',
    ],
  },
  {
    name: 'ver-between',
    syntax: 'ver-between',
    description: 'Space between vertical',
    category: 'Alignment',
    keywords: [
      // German
      'verteilen', 'gleichmässig', 'vertikal verteilen', 'platz vertikal',
      // English
      'space between', 'vertical space', 'stretch vertical', 'distribute',
      // CSS/Technical
      'align-between', 'align-content: space-between',
      // Tailwind
      'content-between',
      // Typos
      'betwen', 'beteween',
    ],
  },

  // ============================================
  // Spacing
  // ============================================
  {
    name: 'pad',
    syntax: 'pad ',
    description: 'Padding all sides',
    category: 'Spacing',
    keywords: [
      // German
      'padding', 'innenabstand', 'polster', 'abstand innen', 'innen', 'innenraum',
      'polsterung', 'innenrand', 'innerer abstand', 'innenbereich',
      'platz innen', 'raum innen',
      // English
      'padding', 'inner space', 'internal spacing', 'inner margin', 'cushion',
      // CSS/Technical
      'padding', 'padding:', 'p-',
      // Tailwind
      'p-', 'padding',
      // Typos
      'pading', 'paddng', 'paddin', 'padd', 'innenastand',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad l',
    syntax: 'pad l ',
    description: 'Padding left',
    category: 'Spacing',
    keywords: [
      // German
      'padding links', 'innenabstand links', 'links innen', 'polster links',
      'linker innenabstand',
      // English
      'padding left', 'left padding', 'left inner',
      // CSS/Technical
      'padding-left', 'pl',
      // Tailwind
      'pl-',
      // Typos
      'padd links',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad r',
    syntax: 'pad r ',
    description: 'Padding right',
    category: 'Spacing',
    keywords: [
      // German
      'padding rechts', 'innenabstand rechts', 'rechts innen', 'polster rechts',
      'rechter innenabstand',
      // English
      'padding right', 'right padding', 'right inner',
      // CSS/Technical
      'padding-right', 'pr',
      // Tailwind
      'pr-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad u',
    syntax: 'pad u ',
    description: 'Padding top',
    category: 'Spacing',
    keywords: [
      // German
      'padding oben', 'innenabstand oben', 'oben innen', 'polster oben',
      'oberer innenabstand',
      // English
      'padding top', 'top padding', 'top inner',
      // CSS/Technical
      'padding-top', 'pt',
      // Tailwind
      'pt-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad d',
    syntax: 'pad d ',
    description: 'Padding bottom',
    category: 'Spacing',
    keywords: [
      // German
      'padding unten', 'innenabstand unten', 'unten innen', 'polster unten',
      'unterer innenabstand',
      // English
      'padding bottom', 'bottom padding', 'bottom inner',
      // CSS/Technical
      'padding-bottom', 'pb',
      // Tailwind
      'pb-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad l-r',
    syntax: 'pad l-r ',
    description: 'Padding left & right',
    category: 'Spacing',
    keywords: [
      // German
      'padding horizontal', 'seitlich', 'links rechts', 'seitenabstand',
      'horizontaler innenabstand', 'seiten padding',
      // English
      'padding horizontal', 'horizontal padding', 'side padding', 'left right padding',
      // CSS/Technical
      'padding-x', 'px',
      // Tailwind
      'px-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'pad u-d',
    syntax: 'pad u-d ',
    description: 'Padding top & bottom',
    category: 'Spacing',
    keywords: [
      // German
      'padding vertikal', 'oben unten', 'vertikaler innenabstand',
      // English
      'padding vertical', 'vertical padding', 'top bottom padding',
      // CSS/Technical
      'padding-y', 'py',
      // Tailwind
      'py-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'pad',
  },
  {
    name: 'mar',
    syntax: 'mar ',
    description: 'Margin all sides',
    category: 'Spacing',
    keywords: [
      // German
      'margin', 'aussenabstand', 'rand', 'abstand aussen', 'aussen', 'aussenraum',
      'aussenrand', 'abstand', 'äusserer abstand', 'aussenbereich',
      'platz aussen', 'raum aussen', 'freiraum aussen',
      // English
      'margin', 'outer space', 'external spacing', 'outer margin', 'spacing',
      // CSS/Technical
      'margin', 'margin:', 'm-',
      // Tailwind
      'm-', 'margin',
      // Typos
      'margn', 'marign', 'mrgn', 'magin', 'aussenastand',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'mar',
  },
  {
    name: 'mar l',
    syntax: 'mar l ',
    description: 'Margin left',
    category: 'Spacing',
    keywords: [
      // German
      'margin links', 'aussenabstand links', 'links aussen', 'linker aussenabstand',
      // English
      'margin left', 'left margin', 'left outer',
      // CSS/Technical
      'margin-left', 'ml',
      // Tailwind
      'ml-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'mar',
  },
  {
    name: 'mar r',
    syntax: 'mar r ',
    description: 'Margin right',
    category: 'Spacing',
    keywords: [
      // German
      'margin rechts', 'aussenabstand rechts', 'rechts aussen', 'rechter aussenabstand',
      // English
      'margin right', 'right margin', 'right outer',
      // CSS/Technical
      'margin-right', 'mr',
      // Tailwind
      'mr-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'mar',
  },
  {
    name: 'mar u',
    syntax: 'mar u ',
    description: 'Margin top',
    category: 'Spacing',
    keywords: [
      // German
      'margin oben', 'aussenabstand oben', 'oben aussen', 'oberer aussenabstand',
      // English
      'margin top', 'top margin', 'top outer',
      // CSS/Technical
      'margin-top', 'mt',
      // Tailwind
      'mt-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'mar',
  },
  {
    name: 'mar d',
    syntax: 'mar d ',
    description: 'Margin bottom',
    category: 'Spacing',
    keywords: [
      // German
      'margin unten', 'aussenabstand unten', 'unten aussen', 'unterer aussenabstand',
      // English
      'margin bottom', 'bottom margin', 'bottom outer',
      // CSS/Technical
      'margin-bottom', 'mb',
      // Tailwind
      'mb-',
    ],
    valuePicker: 'spacing',
    valuePickerProperty: 'mar',
  },

  // ============================================
  // Size
  // ============================================
  {
    name: 'w',
    syntax: 'w ',
    description: 'Width in pixels',
    category: 'Size',
    keywords: [
      // German
      'breite', 'breit', 'weite', 'horizontale grösse', 'pixel breite',
      'wie breit', 'element breite',
      // English
      'width', 'horizontal size', 'wide', 'pixel width',
      // CSS/Technical
      'width', 'width:', 'w-',
      // Tailwind
      'w-',
      // Typos
      'wdth', 'widt', 'widht', 'briete', 'breiet',
    ],
  },
  {
    name: 'h',
    syntax: 'h ',
    description: 'Height in pixels',
    category: 'Size',
    keywords: [
      // German
      'höhe', 'hoch', 'vertikale grösse', 'pixel höhe', 'wie hoch', 'element höhe',
      // English
      'height', 'vertical size', 'tall', 'pixel height',
      // CSS/Technical
      'height', 'height:', 'h-',
      // Tailwind
      'h-',
      // Typos
      'hght', 'heigt', 'heigh', 'hoehe', 'höeh',
    ],
  },
  {
    name: 'min-w',
    syntax: 'min-w ',
    description: 'Minimum width',
    category: 'Size',
    keywords: [
      // German
      'mindestbreite', 'min breite', 'minimale breite', 'kleinste breite',
      'mindestens breit', 'nicht schmaler als',
      // English
      'minimum width', 'min width', 'minimal width', 'at least wide',
      // CSS/Technical
      'min-width', 'minw', 'min-width:',
      // Tailwind
      'min-w-',
    ],
  },
  {
    name: 'max-w',
    syntax: 'max-w ',
    description: 'Maximum width',
    category: 'Size',
    keywords: [
      // German
      'maximalbreite', 'max breite', 'maximale breite', 'grösste breite',
      'höchstens breit', 'nicht breiter als',
      // English
      'maximum width', 'max width', 'maximal width', 'at most wide',
      // CSS/Technical
      'max-width', 'maxw', 'max-width:',
      // Tailwind
      'max-w-',
    ],
  },
  {
    name: 'min-h',
    syntax: 'min-h ',
    description: 'Minimum height',
    category: 'Size',
    keywords: [
      // German
      'mindesthöhe', 'min höhe', 'minimale höhe', 'kleinste höhe',
      'mindestens hoch', 'nicht niedriger als',
      // English
      'minimum height', 'min height', 'minimal height', 'at least tall',
      // CSS/Technical
      'min-height', 'minh', 'min-height:',
      // Tailwind
      'min-h-',
    ],
  },
  {
    name: 'max-h',
    syntax: 'max-h ',
    description: 'Maximum height',
    category: 'Size',
    keywords: [
      // German
      'maximalhöhe', 'max höhe', 'maximale höhe', 'grösste höhe',
      'höchstens hoch', 'nicht höher als',
      // English
      'maximum height', 'max height', 'maximal height', 'at most tall',
      // CSS/Technical
      'max-height', 'maxh', 'max-height:',
      // Tailwind
      'max-h-',
    ],
  },
  {
    name: 'full',
    syntax: 'full',
    description: '100% width & height',
    category: 'Size',
    keywords: [
      // German
      'voll', 'vollständig', 'ausfüllen', 'ganzer platz', 'ganze grösse',
      'komplett', 'vollflächig', 'maximieren', 'gesamte fläche',
      'alles ausfüllen', 'volle grösse', 'bildschirmfüllend',
      // English
      'full', 'full size', 'fill', 'stretch', 'fill parent', 'entire',
      'fullscreen', 'complete', '100 percent',
      // CSS/Technical
      '100%', 'width: 100%', 'height: 100%',
      // Tailwind
      'w-full', 'h-full',
      // Typos
      'ful', 'fulll', 'volll',
    ],
  },

  // ============================================
  // Colors
  // ============================================
  {
    name: 'col',
    syntax: 'col ',
    description: 'Text color',
    category: 'Colors',
    keywords: [
      // German
      'farbe', 'textfarbe', 'schriftfarbe', 'vordergrund', 'text einfärben',
      'schrift einfärben', 'buchstabenfarbe', 'zeichenfarbe',
      // English
      'color', 'colour', 'text color', 'font color', 'foreground',
      'text colour', 'letter color',
      // CSS/Technical
      'color', 'color:', 'fontcolor', 'text-color', 'textColor', 'fc',
      // Tailwind
      'text-',
      // Color names (intent-based)
      ...COLOR_NAMES_DE,
      ...COLOR_NAMES_EN,
      // Typos
      'farb', 'colr', 'clor', 'textfabe', 'schriftfabe',
    ],
    valuePicker: 'color',
  },
  {
    name: 'bg',
    syntax: 'bg ',
    description: 'Background color',
    category: 'Colors',
    keywords: [
      // German
      'hintergrund', 'hintergrundfarbe', 'fläche', 'flächenfarbe', 'füllfarbe',
      'hintergrundfläche', 'box farbe', 'element farbe', 'füllung',
      // English
      'background', 'background color', 'fill', 'fill color', 'backdrop',
      'surface', 'surface color',
      // CSS/Technical
      'bgcolor', 'background-color', 'bgColor', 'backgroundColor', 'bg',
      'background:', 'hg',
      // Tailwind
      'bg-',
      // Color names (intent-based)
      ...COLOR_NAMES_DE.map(c => `${c} hintergrund`),
      ...COLOR_NAMES_EN.map(c => `${c} background`),
      // Also plain color names for "make it red" → bg
      ...COLOR_NAMES_DE,
      ...COLOR_NAMES_EN,
      // Typos
      'backgroud', 'backgrund', 'hintergrud', 'hintregrund', 'bakground',
    ],
    valuePicker: 'color',
  },
  {
    name: 'boc',
    syntax: 'boc ',
    description: 'Border color',
    category: 'Colors',
    keywords: [
      // German
      'rahmenfarbe', 'randfarbe', 'linienfarbe', 'umrandungsfarbe',
      'border farbe', 'strichfarbe',
      // English
      'border color', 'border colour', 'stroke', 'stroke color', 'outline color',
      'frame color',
      // CSS/Technical
      'border-color', 'borderColor', 'bc', 'strokecolor',
      // Tailwind
      'border-',
      // Typos
      'bordrecolor', 'bodercolor', 'rahmenfabe',
    ],
    valuePicker: 'color',
  },

  // ============================================
  // Border
  // ============================================
  {
    name: 'bor',
    syntax: 'bor ',
    description: 'Border width',
    category: 'Border',
    keywords: [
      // German
      'rahmen', 'rand', 'linie', 'umrandung', 'strich', 'rahmenbreite',
      'randbreite', 'liniendicke', 'umrisslinie', 'kontur', 'aussenlinie',
      'rahmen dicke',
      // English
      'border', 'border width', 'outline', 'stroke', 'stroke width', 'frame',
      'line', 'edge',
      // CSS/Technical
      'border-width', 'borderWidth', 'border:', 'stroke-width',
      // Tailwind
      'border-', 'border',
      // Typos
      'borer', 'bordr', 'boader', 'rahme', 'ramen', 'boarder',
    ],
  },
  {
    name: 'bor l',
    syntax: 'bor l ',
    description: 'Border left',
    category: 'Border',
    keywords: [
      // German
      'rahmen links', 'linie links', 'linker rahmen', 'linker rand',
      // English
      'border left', 'left border', 'left line', 'left edge',
      // CSS/Technical
      'border-left', 'bl',
      // Tailwind
      'border-l-',
    ],
  },
  {
    name: 'bor r',
    syntax: 'bor r ',
    description: 'Border right',
    category: 'Border',
    keywords: [
      // German
      'rahmen rechts', 'linie rechts', 'rechter rahmen', 'rechter rand',
      // English
      'border right', 'right border', 'right line', 'right edge',
      // CSS/Technical
      'border-right', 'br',
      // Tailwind
      'border-r-',
    ],
  },
  {
    name: 'bor u',
    syntax: 'bor u ',
    description: 'Border top',
    category: 'Border',
    keywords: [
      // German
      'rahmen oben', 'linie oben', 'oberer rahmen', 'oberer rand',
      // English
      'border top', 'top border', 'top line', 'top edge',
      // CSS/Technical
      'border-top', 'bt',
      // Tailwind
      'border-t-',
    ],
  },
  {
    name: 'bor d',
    syntax: 'bor d ',
    description: 'Border bottom',
    category: 'Border',
    keywords: [
      // German
      'rahmen unten', 'linie unten', 'unterer rahmen', 'unterer rand',
      'trennlinie', 'separator',
      // English
      'border bottom', 'bottom border', 'bottom line', 'bottom edge',
      'divider', 'separator',
      // CSS/Technical
      'border-bottom', 'bb',
      // Tailwind
      'border-b-',
    ],
  },
  {
    name: 'rad',
    syntax: 'rad ',
    description: 'Border radius',
    category: 'Border',
    keywords: [
      // German
      'radius', 'ecken', 'abrunden', 'rund', 'abgerundet', 'eckenradius',
      'rundung', 'runde ecken', 'abgerundete ecken', 'kurve', 'bogen',
      'weiche ecken', 'pill', 'kreisförmig', 'oval',
      // English
      'radius', 'rounded', 'corner', 'corners', 'round corners', 'curve',
      'circular', 'pill shape', 'soft corners',
      // CSS/Technical
      'border-radius', 'borderRadius', 'border-radius:',
      // Tailwind
      'rounded', 'rounded-',
      // Typos
      'raduis', 'raius', 'radis', 'eckne', 'runnd', 'abgerundtet',
    ],
    valuePicker: 'value',
    valuePickerProperty: 'rad',
  },

  // ============================================
  // Typography
  // ============================================
  {
    name: 'size',
    syntax: 'size ',
    description: 'Font size',
    category: 'Typography',
    keywords: [
      // German
      'schriftgrösse', 'textgrösse', 'grösse', 'schrift grösse', 'text grösse',
      'buchstabengrösse', 'zeichengrösse', 'wie gross', 'font grösse',
      'grösser', 'kleiner', 'gross', 'klein',
      // English
      'font size', 'text size', 'size', 'letter size', 'character size',
      'bigger', 'smaller', 'large', 'small',
      // CSS/Technical
      'font-size', 'fontSize', 'fs', 'fontsize', 'font-size:',
      // Tailwind
      'text-', 'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl',
      // Typos
      'schriftgroesse', 'schriftoesse', 'schriftgrsse', 'fontsize', 'fonstize',
    ],
    valuePicker: 'value',
    valuePickerProperty: 'size',
  },
  {
    name: 'weight',
    syntax: 'weight ',
    description: 'Font weight',
    category: 'Typography',
    keywords: [
      // German
      'schriftstärke', 'fett', 'dick', 'gewicht', 'stärke', 'schriftgewicht',
      'dünn', 'leicht', 'normal', 'halbfett', 'extrafett', 'bold',
      'textdicke', 'buchstabendicke',
      // English
      'font weight', 'bold', 'weight', 'thickness', 'thin', 'light', 'regular',
      'medium', 'semibold', 'heavy', 'black', 'extra bold', 'boldness',
      // CSS/Technical
      'font-weight', 'fontWeight', 'fw', 'font-weight:',
      // Tailwind
      'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold',
      'font-bold', 'font-extrabold', 'font-black',
      // Typos
      'schriftstaerke', 'ftet', 'bolld', 'bld', 'feett',
    ],
    valuePicker: 'weight',
  },
  {
    name: 'font',
    syntax: 'font ',
    description: 'Font family',
    category: 'Typography',
    keywords: [
      // German
      'schriftart', 'schrift', 'schrifttyp', 'typografie', 'schriftfamilie',
      'welche schrift', 'andere schrift',
      // English
      'font', 'font family', 'typeface', 'typography', 'font face',
      // CSS/Technical
      'font-family', 'fontFamily', 'ff', 'font-family:',
      // Popular fonts
      'arial', 'inter', 'roboto', 'helvetica', 'georgia', 'times',
      'sans-serif', 'serif', 'mono', 'monospace', 'verdana', 'tahoma',
      'open sans', 'lato', 'poppins', 'montserrat', 'playfair',
      // Tailwind
      'font-sans', 'font-serif', 'font-mono',
      // Typos
      'schritfart', 'schrfitart', 'fontt',
    ],
    valuePicker: 'font',
  },
  {
    name: 'line',
    syntax: 'line ',
    description: 'Line height',
    category: 'Typography',
    keywords: [
      // German
      'zeilenhöhe', 'zeilenabstand', 'textabstand', 'zeilenhoehe',
      'abstand zwischen zeilen', 'durchschuss',
      // English
      'line height', 'line spacing', 'leading', 'text spacing',
      'space between lines',
      // CSS/Technical
      'line-height', 'lineHeight', 'lh', 'line-height:',
      // Tailwind
      'leading-',
      // Typos
      'zielenhoehe', 'linheight',
    ],
    valuePicker: 'value',
    valuePickerProperty: 'line',
  },
  {
    name: 'uppercase',
    syntax: 'uppercase',
    description: 'Uppercase text',
    category: 'Typography',
    keywords: [
      // German
      'grossbuchstaben', 'versalien', 'gross schreiben', 'kapitälchen',
      'alles gross', 'nur grossbuchstaben', 'majuskeln',
      // English
      'uppercase', 'caps', 'capital', 'capitals', 'all caps', 'upper case',
      'capital letters', 'block letters',
      // CSS/Technical
      'text-transform', 'text-transform: uppercase',
      // Tailwind
      'uppercase',
      // Typos
      'upppercase', 'upercase', 'grossbuchstabne',
    ],
  },
  {
    name: 'truncate',
    syntax: 'truncate',
    description: 'Truncate with ...',
    category: 'Typography',
    keywords: [
      // German
      'abschneiden', 'kürzen', 'überlauf', 'abkürzen', 'drei punkte',
      'text abschneiden', 'trunkieren', 'auslassungspunkte', 'ellipse',
      'text kürzen', 'nicht umbrechen',
      // English
      'truncate', 'ellipsis', 'dots', 'cut off', 'overflow ellipsis',
      'shorten', 'clip text', 'no wrap', 'single line',
      // CSS/Technical
      'text-overflow', 'text-overflow: ellipsis', '...', 'overflow hidden',
      // Tailwind
      'truncate', 'text-ellipsis',
      // Typos
      'trunkate', 'truncat', 'ellipses', 'elipsis',
    ],
  },

  // ============================================
  // Image
  // ============================================
  {
    name: 'src',
    syntax: 'src "',
    description: 'Image source URL',
    category: 'Image',
    keywords: [
      // German
      'bild', 'quelle', 'bildquelle', 'bildurl', 'foto', 'grafik',
      'bild url', 'bild pfad', 'bildpfad', 'bilddatei',
      // English
      'image', 'source', 'url', 'picture', 'photo', 'img', 'graphic',
      'image source', 'image url', 'image path',
      // CSS/Technical
      'src', 'source',
      // Typos
      'imge', 'soruce', 'souce', 'billd', 'iamge',
    ],
  },
  {
    name: 'alt',
    syntax: 'alt "',
    description: 'Alt text',
    category: 'Image',
    keywords: [
      // German
      'alternativtext', 'beschreibung', 'bildtext', 'bildbeschreibung',
      'barrierefreiheit', 'screenreader', 'bild beschreibung',
      // English
      'alt', 'alt text', 'alternative text', 'description', 'accessibility',
      'a11y', 'image description', 'screen reader',
      // CSS/Technical
      'alttext', 'alt=',
      // Typos
      'altext', 'atl',
    ],
  },
  {
    name: 'fit',
    syntax: 'fit ',
    description: 'Object fit',
    category: 'Image',
    keywords: [
      // German
      'einpassen', 'skalieren', 'anpassen', 'bildpassung', 'proportionen',
      'bild anpassen', 'bild skalieren', 'bild einpassen',
      // English
      'fit', 'object fit', 'cover', 'contain', 'scale', 'resize', 'stretch',
      'aspect ratio', 'image fit',
      // CSS/Technical
      'object-fit', 'objectFit', 'fill', 'object-fit:',
      // Tailwind
      'object-cover', 'object-contain', 'object-fill',
      // Typos
      'fti', 'fitt',
    ],
    valuePicker: 'value',
    valuePickerProperty: 'fit',
  },

  // ============================================
  // Overflow / Scroll
  // ============================================
  {
    name: 'scroll',
    syntax: 'scroll',
    description: 'Scroll vertical (default)',
    category: 'Overflow',
    keywords: [
      // German
      'scrollen', 'scrollbar', 'überlauf', 'scrollbalken', 'rollen',
      'scrollbereich', 'scrollfähig', 'bildlauf',
      // English
      'scroll', 'scrollable', 'scrolling', 'overflow scroll', 'scrollbar',
      // CSS/Technical
      'overflow: scroll', 'overflow-y: scroll',
      // Tailwind
      'overflow-scroll', 'overflow-y-scroll',
      // Typos
      'scrol', 'scrollen', 'srcoll',
    ],
  },
  {
    name: 'scroll-ver',
    syntax: 'scroll-ver',
    description: 'Scroll vertical (explicit)',
    category: 'Overflow',
    keywords: [
      // German
      'vertikal scrollen', 'runterscrollen', 'hoch runter scrollen',
      'vertikaler scrollbalken',
      // English
      'scroll vertical', 'vertical scroll', 'y scroll', 'vertical scrollbar',
      // CSS/Technical
      'scroll-y', 'overflow-y', 'overflow-y: scroll',
      // Tailwind
      'overflow-y-scroll',
    ],
  },
  {
    name: 'scroll-hor',
    syntax: 'scroll-hor',
    description: 'Scroll horizontal',
    category: 'Overflow',
    keywords: [
      // German
      'horizontal scrollen', 'seitlich scrollen', 'links rechts scrollen',
      'horizontaler scrollbalken', 'karussell',
      // English
      'scroll horizontal', 'horizontal scroll', 'x scroll', 'horizontal scrollbar',
      'carousel', 'slider',
      // CSS/Technical
      'scroll-x', 'overflow-x', 'overflow-x: scroll',
      // Tailwind
      'overflow-x-scroll',
    ],
  },
  {
    name: 'scroll-both',
    syntax: 'scroll-both',
    description: 'Scroll both directions',
    category: 'Overflow',
    keywords: [
      // German
      'beide richtungen', 'in alle richtungen', 'xy scrollen',
      // English
      'scroll both', 'both directions', 'xy scroll', 'pan', 'map', 'canvas',
      // CSS/Technical
      'overflow: auto', 'overflow: scroll',
      // Tailwind
      'overflow-scroll',
    ],
  },
  {
    name: 'snap',
    syntax: 'snap',
    description: 'Scroll snap (items snap into view)',
    category: 'Overflow',
    keywords: [
      // German
      'einrasten', 'snap', 'karussell', 'slider', 'seitenweise',
      'magnetisch', 'einschnappen',
      // English
      'snap', 'scroll snap', 'carousel', 'slider', 'paging', 'magnetic',
      'snap to', 'lock to',
      // CSS/Technical
      'scroll-snap', 'scroll-snap-type',
      // Tailwind
      'snap-', 'snap-x', 'snap-y', 'snap-start', 'snap-center',
    ],
  },
  {
    name: 'clip',
    syntax: 'clip',
    description: 'Clip overflow',
    category: 'Overflow',
    keywords: [
      // German
      'abschneiden', 'verstecken', 'kein überlauf', 'clippen', 'ausblenden',
      'überlauf verstecken', 'überlauf abschneiden',
      // English
      'clip', 'hidden', 'hide overflow', 'cut off', 'no overflow',
      // CSS/Technical
      'overflow: hidden', 'overflow: clip', 'overflow hidden',
      // Tailwind
      'overflow-hidden', 'overflow-clip',
      // Typos
      'clipp', 'hiden',
    ],
  },

  // ============================================
  // Hover
  // ============================================
  {
    name: 'hover-col',
    syntax: 'hover-col ',
    description: 'Text color on hover',
    category: 'Hover',
    keywords: [
      // German
      'hover textfarbe', 'mauszeiger textfarbe', 'hover schriftfarbe',
      'textfarbe bei hover', 'farbe beim überfahren', 'mouseover textfarbe',
      // English
      'hover text color', 'hover color', 'text on hover', 'mouseover text',
      'rollover text', 'text color on hover',
      // CSS/Technical
      ':hover color', 'hover:color', 'hoverCol', 'hovercol',
      // Tailwind
      'hover:text-',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-bg',
    syntax: 'hover-bg ',
    description: 'Background color on hover',
    category: 'Hover',
    keywords: [
      // German
      'hover hintergrund', 'mauszeiger hintergrund', 'hover hintergrundfarbe',
      'hintergrund bei hover', 'hintergrund beim überfahren', 'mouseover hintergrund',
      // English
      'hover background', 'hover bg', 'background on hover', 'mouse over background',
      'rollover background', 'hover fill',
      // CSS/Technical
      ':hover background', 'hover:bg', 'hoverBg', 'hoverbg', 'hover-background',
      // Tailwind
      'hover:bg-',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-boc',
    syntax: 'hover-boc ',
    description: 'Border color on hover',
    category: 'Hover',
    keywords: [
      // German
      'hover rahmenfarbe', 'mauszeiger rahmen', 'hover randfarbe',
      'rahmenfarbe bei hover', 'border beim überfahren',
      // English
      'hover border color', 'border on hover', 'hover border', 'hover stroke',
      // CSS/Technical
      ':hover border', 'hover:border-color', 'hoverBoc', 'hoverboc',
      // Tailwind
      'hover:border-',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-bor',
    syntax: 'hover-bor ',
    description: 'Border width on hover',
    category: 'Hover',
    keywords: [
      // German
      'hover rahmen', 'mauszeiger rahmenbreite', 'hover randbreite',
      'rahmenbreite bei hover',
      // English
      'hover border width', 'border width on hover', 'hover outline',
      // CSS/Technical
      ':hover border-width', 'hoverBor', 'hoverbor',
      // Tailwind
      'hover:border-',
    ],
  },

  // ============================================
  // Icon
  // ============================================
  {
    name: 'icon',
    syntax: 'icon "',
    description: 'Lucide icon',
    category: 'Icon',
    keywords: [
      // German
      'symbol', 'zeichen', 'piktogramm', 'bildchen', 'grafik', 'ikon',
      'icon einfügen', 'symbol einfügen',
      // English
      'icon', 'symbol', 'glyph', 'pictogram',
      // Technical
      'lucide', 'svg', 'iconify',
      // Common icon searches
      'pfeil', 'arrow', 'check', 'haken', 'kreuz', 'x', 'plus', 'minus',
      'herz', 'heart', 'stern', 'star', 'suche', 'search', 'lupe',
      'einstellungen', 'settings', 'zahnrad', 'cog', 'gear',
      'benutzer', 'user', 'person', 'menu', 'hamburger',
      // Typos
      'icn', 'ikone', 'symbole',
    ],
    valuePicker: 'icon',
  },

  // ============================================
  // Effects
  // ============================================
  {
    name: 'shadow',
    syntax: 'shadow ',
    description: 'Box shadow',
    category: 'Effects',
    keywords: [
      // German
      'schatten', 'schlagschatten', 'tiefe', 'elevation', 'schatierung',
      'box schatten', '3d effekt', 'erhebung',
      // English
      'shadow', 'drop shadow', 'box shadow', 'depth', 'elevation',
      '3d', 'raised', 'lifted',
      // CSS/Technical
      'box-shadow', 'boxShadow', 'dropshadow', 'box-shadow:',
      // Tailwind
      'shadow-', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl',
      // Typos
      'shaddow', 'scahtten', 'shadwo', 'scahtten',
    ],
    valuePicker: 'shadow',
  },
  {
    name: 'opacity',
    syntax: 'opacity ',
    description: 'Opacity (0-1)',
    category: 'Effects',
    keywords: [
      // German
      'transparenz', 'durchsichtigkeit', 'durchscheinend', 'sichtbarkeit',
      'opazität', 'alpha', 'halbtransparent', 'unsichtbar', 'verblassen',
      // English
      'opacity', 'transparent', 'transparency', 'alpha', 'fade', 'see through',
      'visibility', 'translucent', 'semi transparent',
      // CSS/Technical
      'opacity', 'opacity:', 'alpha',
      // Tailwind
      'opacity-',
      // Typos
      'opacitiy', 'opactiy', 'tranparenz', 'transparrent',
    ],
    valuePicker: 'value',
    valuePickerProperty: 'opacity',
  },
]

// Category display order
export const categoryOrder = [
  'Layout',
  'Alignment',
  'Spacing',
  'Size',
  'Colors',
  'Border',
  'Typography',
  'Image',
  'Overflow',
  'Hover',
  'Icon',
  'Effects',
] as const

export type PropertyCategory = (typeof categoryOrder)[number]
