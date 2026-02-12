/**
 * DSL property definitions for the PropertyPicker.
 * Contains all available properties with search keywords in German and English.
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
      'horizontal', 'horiz', 'nebeneinander', 'zeile', 'row', 'inline', 'flex-row', 'flexrow',
      'reihe', 'waagerecht', 'seitlich', 'x-achse', 'display flex', 'flex direction row',
      'horizontl', 'horizntal', 'horiontal',
    ],
  },
  {
    name: 'ver',
    syntax: 'ver',
    description: 'Vertical layout',
    category: 'Layout',
    keywords: [
      'vertical', 'vert', 'vertikal', 'untereinander', 'spalte', 'column', 'stapel', 'stack',
      'col', 'senkrecht', 'y-achse', 'flex-column', 'flexcol', 'flex direction column',
      'vertiakl', 'vertkal', 'verticl',
    ],
  },
  {
    name: 'gap',
    syntax: 'gap ',
    description: 'Gap between children',
    category: 'Layout',
    keywords: [
      'abstand', 'zwischenraum', 'lücke', 'spacing', 'gutter', 'space', 'freiraum',
      'leerraum', 'flex gap', 'grid gap', 'margin between', 'abstnd', 'abstend',
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
      'umbruch', 'umbrechen', 'wrap', 'mehrzeilig', 'multiline', 'flex-wrap', 'flexwrap',
      'zeilenumbruch', 'wrappen', 'wraping', 'umbrechen', 'neue zeile',
    ],
  },
  {
    name: 'grow',
    syntax: 'grow',
    description: 'Flex grow',
    category: 'Layout',
    keywords: [
      'wachsen', 'ausdehnen', 'expand', 'fill', 'füllen', 'flex-grow', 'flexgrow',
      'stretch', 'dehnen', 'vergrössern', 'expandieren', 'grwo', 'groow',
    ],
  },
  {
    name: 'shrink',
    syntax: 'shrink 0',
    description: 'Flex shrink',
    category: 'Layout',
    keywords: [
      'schrumpfen', 'verkleinern', 'nicht schrumpfen', 'flex-shrink', 'shrink 0',
      'no shrink', 'fixed size', 'nicht kleiner', 'shrnk', 'schrumpf',
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
      'links', 'left', 'linksbündig', 'start', 'justify-start', 'align-left',
      'linksausrichtung', 'nach links', 'flex-start', 'lnks', 'linsk',
    ],
  },
  {
    name: 'hor-cen',
    syntax: 'hor-cen',
    description: 'Center horizontally',
    category: 'Alignment',
    keywords: [
      'zentrieren', 'mitte', 'center', 'mittig', 'horizontal zentrieren', 'justify-center',
      'centered', 'zentriert', 'zentrum', 'middle', 'centern', 'zentrierung',
      'zentrier', 'cetner', 'cneter',
    ],
  },
  {
    name: 'hor-r',
    syntax: 'hor-r',
    description: 'Align right',
    category: 'Alignment',
    keywords: [
      'rechts', 'right', 'rechtsbündig', 'end', 'justify-end', 'align-right',
      'rechtsausrichtung', 'nach rechts', 'flex-end', 'rchts', 'rechst',
    ],
  },
  {
    name: 'hor-between',
    syntax: 'hor-between',
    description: 'Space between horizontal',
    category: 'Alignment',
    keywords: [
      'verteilen', 'space between', 'gleichmässig', 'justify', 'space-between',
      'justify-between', 'auseinander', 'spread', 'distributed', 'gleichverteilt',
      'between', 'space between',
    ],
  },
  {
    name: 'ver-t',
    syntax: 'ver-t',
    description: 'Align top',
    category: 'Alignment',
    keywords: [
      'oben', 'top', 'obenbündig', 'start', 'align-top', 'align-start',
      'nach oben', 'oberseite', 'oberkante', 'tp', 'tpo',
    ],
  },
  {
    name: 'ver-cen',
    syntax: 'ver-cen',
    description: 'Center vertically',
    category: 'Alignment',
    keywords: [
      'vertikal zentrieren', 'mitte', 'center', 'mittig', 'align-center',
      'vertical center', 'middle', 'zentriert vertikal', 'vmittig',
    ],
  },
  {
    name: 'ver-b',
    syntax: 'ver-b',
    description: 'Align bottom',
    category: 'Alignment',
    keywords: [
      'unten', 'bottom', 'untenbündig', 'end', 'align-bottom', 'align-end',
      'nach unten', 'unterseite', 'unterkante', 'btm', 'botom',
    ],
  },
  {
    name: 'ver-between',
    syntax: 'ver-between',
    description: 'Space between vertical',
    category: 'Alignment',
    keywords: [
      'verteilen', 'space between', 'gleichmässig', 'align-between',
      'vertical space', 'vertikal verteilen', 'stretch vertical',
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
      'padding', 'innenabstand', 'polster', 'abstand innen', 'innen', 'innenraum',
      'internal spacing', 'inner space', 'pading', 'paddng', 'paddin',
      'p', 'innenrand', 'polsterung',
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
      'padding links', 'innenabstand links', 'left', 'padding-left', 'pl',
      'links innen', 'left padding', 'polster links',
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
      'padding rechts', 'innenabstand rechts', 'right', 'padding-right', 'pr',
      'rechts innen', 'right padding', 'polster rechts',
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
      'padding oben', 'innenabstand oben', 'top', 'padding-top', 'pt',
      'oben innen', 'top padding', 'polster oben',
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
      'padding unten', 'innenabstand unten', 'bottom', 'padding-bottom', 'pb',
      'unten innen', 'bottom padding', 'polster unten',
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
      'padding horizontal', 'seitlich', 'links rechts', 'px', 'padding-x',
      'horizontal padding', 'side padding', 'seitenabstand',
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
      'padding vertikal', 'oben unten', 'py', 'padding-y', 'vertical padding',
      'top bottom padding', 'vertikaler innenabstand',
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
      'margin', 'aussenabstand', 'rand', 'abstand aussen', 'aussen', 'aussenraum',
      'external spacing', 'outer space', 'margn', 'marign', 'mrgn',
      'm', 'aussenrand', 'abstand',
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
      'margin links', 'aussenabstand links', 'margin-left', 'ml',
      'links aussen', 'left margin',
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
      'margin rechts', 'aussenabstand rechts', 'margin-right', 'mr',
      'rechts aussen', 'right margin',
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
      'margin oben', 'aussenabstand oben', 'margin-top', 'mt',
      'oben aussen', 'top margin',
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
      'margin unten', 'aussenabstand unten', 'margin-bottom', 'mb',
      'unten aussen', 'bottom margin',
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
      'breite', 'width', 'breit', 'weite', 'horizontal size', 'w', 'wdth',
      'width px', 'pixel breite', 'grösse horizontal', 'widt', 'widht',
    ],
  },
  {
    name: 'h',
    syntax: 'h ',
    description: 'Height in pixels',
    category: 'Size',
    keywords: [
      'höhe', 'height', 'hoch', 'vertical size', 'h', 'hght', 'höhe px',
      'pixel höhe', 'grösse vertikal', 'heigt', 'heigh', 'hoehe',
    ],
  },
  {
    name: 'min-w',
    syntax: 'min-w ',
    description: 'Minimum width',
    category: 'Size',
    keywords: [
      'mindestbreite', 'minimum width', 'min breite', 'min-width', 'minw',
      'kleinste breite', 'minimal width', 'minimale breite',
    ],
  },
  {
    name: 'max-w',
    syntax: 'max-w ',
    description: 'Maximum width',
    category: 'Size',
    keywords: [
      'maximalbreite', 'maximum width', 'max breite', 'max-width', 'maxw',
      'grösste breite', 'maximal width', 'maximale breite',
    ],
  },
  {
    name: 'min-h',
    syntax: 'min-h ',
    description: 'Minimum height',
    category: 'Size',
    keywords: [
      'mindesthöhe', 'minimum height', 'min höhe', 'min-height', 'minh',
      'kleinste höhe', 'minimal height', 'minimale höhe',
    ],
  },
  {
    name: 'max-h',
    syntax: 'max-h ',
    description: 'Maximum height',
    category: 'Size',
    keywords: [
      'maximalhöhe', 'maximum height', 'max höhe', 'max-height', 'maxh',
      'grösste höhe', 'maximal height', 'maximale höhe',
    ],
  },
  {
    name: 'full',
    syntax: 'full',
    description: '100% width & height',
    category: 'Size',
    keywords: [
      'voll', 'vollständig', 'ausfüllen', 'ganzer platz', '100%', 'full size',
      'stretch', 'dehnen', 'maximieren', 'ganze grösse', 'fill parent',
      'komplett', 'vollflächig', 'fullscreen',
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
      'farbe', 'color', 'colour',
      'textfarbe', 'schriftfarbe', 'font color', 'fontcolor',
      'text-color', 'textColor', 'fc', 'foreground', 'vordergrund',
    ],
    valuePicker: 'color',
  },
  {
    name: 'bg',
    syntax: 'bg ',
    description: 'Background color',
    category: 'Colors',
    keywords: [
      'hintergrund', 'hintergrundfarbe', 'background', 'fläche', 'fill',
      'bgcolor', 'background-color', 'hg', 'bgColor', 'backgroundColor',
      'backgroud', 'backgrund', 'flächenfarbe', 'füllfarbe',
    ],
    valuePicker: 'color',
  },
  {
    name: 'boc',
    syntax: 'boc ',
    description: 'Border color',
    category: 'Colors',
    keywords: [
      'rahmenfarbe', 'randfarbe', 'border color', 'linienfarbe', 'border-color',
      'borderColor', 'bc', 'umrandungsfarbe', 'stroke', 'strokecolor',
      'bordrecolor', 'bodercolor',
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
      'rahmen', 'rand', 'border', 'linie', 'umrandung', 'strich', 'border-width',
      'borderWidth', 'rahmenbreite', 'randbreite', 'stroke-width', 'outline',
      'borer', 'bordr', 'boader',
    ],
  },
  {
    name: 'bor l',
    syntax: 'bor l ',
    description: 'Border left',
    category: 'Border',
    keywords: [
      'rahmen links', 'border left', 'linie links', 'border-left', 'bl',
      'linker rahmen', 'left border',
    ],
  },
  {
    name: 'bor r',
    syntax: 'bor r ',
    description: 'Border right',
    category: 'Border',
    keywords: [
      'rahmen rechts', 'border right', 'linie rechts', 'border-right', 'br',
      'rechter rahmen', 'right border',
    ],
  },
  {
    name: 'bor u',
    syntax: 'bor u ',
    description: 'Border top',
    category: 'Border',
    keywords: [
      'rahmen oben', 'border top', 'linie oben', 'border-top', 'bt',
      'oberer rahmen', 'top border',
    ],
  },
  {
    name: 'bor d',
    syntax: 'bor d ',
    description: 'Border bottom',
    category: 'Border',
    keywords: [
      'rahmen unten', 'border bottom', 'linie unten', 'border-bottom', 'bb',
      'unterer rahmen', 'bottom border',
    ],
  },
  {
    name: 'rad',
    syntax: 'rad ',
    description: 'Border radius',
    category: 'Border',
    keywords: [
      'radius', 'ecken', 'abrunden', 'rund', 'rounded', 'corner', 'abgerundet',
      'border-radius', 'borderRadius', 'eckenradius', 'rundung', 'corners',
      'round corners', 'runde ecken', 'pill', 'kreisförmig',
      'raduis', 'raius', 'radis',
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
      'schriftgrösse', 'textgrösse', 'font size', 'grösse', 'font-size', 'fontSize',
      'fs', 'text size', 'schriftgroesse', 'fontsize', 'text grösse',
      'schriftoesse', 'schriftgrsse',
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
      'schriftstärke', 'fett', 'bold', 'font weight', 'gewicht', 'dick',
      'font-weight', 'fontWeight', 'fw', 'stärke', 'thin', 'light', 'regular',
      'medium', 'semibold', 'heavy', 'black', 'dünn', 'normal',
      'schriftstaerke', 'schriftgewicht', 'boldness',
    ],
    valuePicker: 'weight',
  },
  {
    name: 'font',
    syntax: 'font ',
    description: 'Font family',
    category: 'Typography',
    keywords: [
      'schriftart', 'font', 'schrift', 'typeface', 'font family', 'font-family',
      'fontFamily', 'ff', 'typography', 'typografie', 'schrifttyp',
      'arial', 'inter', 'roboto', 'sans-serif', 'serif', 'mono', 'monospace',
    ],
    valuePicker: 'font',
  },
  {
    name: 'line',
    syntax: 'line ',
    description: 'Line height',
    category: 'Typography',
    keywords: [
      'zeilenhöhe', 'zeilenabstand', 'line height', 'leading', 'line-height',
      'lineHeight', 'lh', 'zeilenhoehe', 'textabstand', 'line spacing',
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
      'grossbuchstaben', 'uppercase', 'caps', 'versalien', 'capital', 'capitals',
      'text-transform', 'all caps', 'kapitälchen', 'gross schreiben',
      'upppercase', 'upercase',
    ],
  },
  {
    name: 'truncate',
    syntax: 'truncate',
    description: 'Truncate with ...',
    category: 'Typography',
    keywords: [
      'abschneiden', 'kürzen', 'ellipsis', '...', 'überlauf', 'truncate',
      'text-overflow', 'abkürzen', 'drei punkte', 'dots', 'overflow ellipsis',
      'text abschneiden', 'trunkieren',
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
      'bild', 'image', 'quelle', 'url', 'source', 'foto', 'picture', 'img',
      'bildquelle', 'image source', 'photo', 'grafik', 'bildurl',
      'imge', 'soruce',
    ],
  },
  {
    name: 'alt',
    syntax: 'alt "',
    description: 'Alt text',
    category: 'Image',
    keywords: [
      'alternativtext', 'alt text', 'beschreibung', 'bildtext', 'alt',
      'alternative text', 'accessibility', 'a11y', 'bildbeschreibung',
      'image description', 'alttext',
    ],
  },
  {
    name: 'fit',
    syntax: 'fit ',
    description: 'Object fit',
    category: 'Image',
    keywords: [
      'einpassen', 'skalieren', 'object fit', 'cover', 'contain', 'object-fit',
      'objectFit', 'bildpassung', 'anpassen', 'fill', 'scale', 'resize',
      'stretch', 'aspect ratio', 'proportionen',
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
      'scrollen', 'scrollbar', 'überlauf', 'scroll', 'overflow scroll',
      'scrollable', 'scrolling', 'rollen', 'scrollbalken', 'vertikal',
    ],
  },
  {
    name: 'scroll-ver',
    syntax: 'scroll-ver',
    description: 'Scroll vertical (explicit)',
    category: 'Overflow',
    keywords: [
      'vertikal scrollen', 'runterscrollen', 'scroll-y', 'overflow-y',
      'y scroll', 'vertical scrollbar', 'hoch runter scrollen',
    ],
  },
  {
    name: 'scroll-hor',
    syntax: 'scroll-hor',
    description: 'Scroll horizontal',
    category: 'Overflow',
    keywords: [
      'horizontal scrollen', 'seitlich scrollen', 'scroll-x', 'overflow-x',
      'x scroll', 'horizontal scrollbar', 'links rechts scrollen', 'carousel',
    ],
  },
  {
    name: 'scroll-both',
    syntax: 'scroll-both',
    description: 'Scroll both directions',
    category: 'Overflow',
    keywords: [
      'beide richtungen', 'scroll both', 'overflow auto', 'map', 'canvas',
    ],
  },
  {
    name: 'snap',
    syntax: 'snap',
    description: 'Scroll snap (items snap into view)',
    category: 'Overflow',
    keywords: [
      'einrasten', 'snap', 'carousel', 'slider', 'scroll-snap', 'paging',
    ],
  },
  {
    name: 'clip',
    syntax: 'clip',
    description: 'Clip overflow',
    category: 'Overflow',
    keywords: [
      'abschneiden', 'verstecken', 'hidden', 'overflow hidden', 'clip',
      'overflow clip', 'hide overflow', 'kein überlauf', 'clippen',
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
      'hover textfarbe', 'mauszeiger textfarbe', 'hover text color', ':hover color',
      'text on hover', 'mouseover text', 'hover schriftfarbe',
      'rollover text', 'hoverCol', 'hovercol',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-bg',
    syntax: 'hover-bg ',
    description: 'Background color on hover',
    category: 'Hover',
    keywords: [
      'hover hintergrund', 'mauszeiger hintergrund', 'hover background',
      ':hover bg', 'background on hover', 'mouse over background',
      'rollover', 'hover-background', 'hoverBg', 'hoverbg',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-boc',
    syntax: 'hover-boc ',
    description: 'Border color on hover',
    category: 'Hover',
    keywords: [
      'hover rahmenfarbe', 'mauszeiger rahmen', 'hover border color',
      ':hover border', 'border on hover', 'hoverBoc', 'hoverboc',
    ],
    valuePicker: 'color',
  },
  {
    name: 'hover-bor',
    syntax: 'hover-bor ',
    description: 'Border width on hover',
    category: 'Hover',
    keywords: [
      'hover rahmen', 'mauszeiger rahmenbreite', 'hover border width',
      ':hover border width', 'hoverBor', 'hoverbor',
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
      'symbol', 'icon', 'bild', 'zeichen', 'piktogramm', 'lucide', 'svg',
      'grafik', 'bildchen', 'emoji', 'glyph', 'iconify', 'ikon',
      'icn', 'ikon',
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
      'schatten', 'shadow', 'box-shadow', 'schlagschatten', 'boxShadow',
      'drop shadow', 'elevation', 'tiefe', '3d', 'depth', 'dropshadow',
      'schatierung', 'shaddow', 'scahtten',
    ],
    valuePicker: 'shadow',
  },
  {
    name: 'opacity',
    syntax: 'opacity ',
    description: 'Opacity (0-1)',
    category: 'Effects',
    keywords: [
      'transparenz', 'durchsichtigkeit', 'opacity', 'alpha', 'transparent',
      'durchscheinend', 'sichtbarkeit', 'visibility', 'fade', 'opazität',
      'opacitiy', 'opactiy',
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

export type PropertyCategory = typeof categoryOrder[number]
