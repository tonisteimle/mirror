/**
 * ComponentIconMatcher - Automatically finds appropriate icons for components
 *
 * Uses multiple strategies:
 * 1. Direct name matching against Lucide icon names
 * 2. Keyword extraction from CamelCase names
 * 3. Synonym mapping for common UI terms
 * 4. Primitive-based fallbacks
 * 5. Final fallback: rectangle/square
 */

/**
 * Common UI terms mapped to Lucide icon names
 * Organized by category for maintainability
 */
const KEYWORD_TO_ICON: Record<string, string> = {
  // ============================================
  // Navigation & Menu
  // ============================================
  nav: 'menu',
  navbar: 'menu',
  navigation: 'menu',
  menu: 'menu',
  menuitem: 'menu',
  sidebar: 'panel-left',
  drawer: 'panel-left',
  tab: 'folder',
  tabs: 'folders',
  breadcrumb: 'chevrons-right',
  breadcrumbs: 'chevrons-right',
  pagination: 'more-horizontal',
  stepper: 'git-commit-horizontal',
  steps: 'git-commit-horizontal',
  wizard: 'wand-2',

  // ============================================
  // Buttons & Actions
  // ============================================
  button: 'mouse-pointer-click',
  btn: 'mouse-pointer-click',
  cta: 'mouse-pointer-click',
  submit: 'send',
  cancel: 'x',
  close: 'x',
  delete: 'trash-2',
  remove: 'trash-2',
  trash: 'trash-2',
  edit: 'pencil',
  update: 'pencil',
  modify: 'pencil',
  add: 'plus',
  create: 'plus',
  new: 'plus',
  save: 'save',
  download: 'download',
  upload: 'upload',
  share: 'share-2',
  copy: 'copy',
  duplicate: 'copy',
  paste: 'clipboard',
  cut: 'scissors',
  undo: 'undo-2',
  redo: 'redo-2',
  refresh: 'refresh-cw',
  reload: 'refresh-cw',
  sync: 'refresh-cw',
  reset: 'rotate-ccw',
  clear: 'eraser',
  expand: 'maximize-2',
  collapse: 'minimize-2',
  fullscreen: 'maximize',
  minimize: 'minimize',
  maximize: 'maximize',
  zoom: 'zoom-in',
  zoomin: 'zoom-in',
  zoomout: 'zoom-out',
  print: 'printer',
  export: 'external-link',
  import: 'import',
  send: 'send',
  reply: 'reply',
  forward: 'forward',
  back: 'arrow-left',
  next: 'arrow-right',
  previous: 'arrow-left',
  prev: 'arrow-left',
  play: 'play',
  pause: 'pause',
  stop: 'square',
  record: 'circle',
  skip: 'skip-forward',
  rewind: 'rewind',
  fastforward: 'fast-forward',
  shuffle: 'shuffle',
  repeat: 'repeat',
  loop: 'repeat',
  mute: 'volume-x',
  unmute: 'volume-2',
  volume: 'volume-2',
  fullscreenenter: 'maximize',
  fullscreenexit: 'minimize',

  // ============================================
  // Forms & Inputs
  // ============================================
  input: 'text-cursor-input',
  textinput: 'text-cursor-input',
  textfield: 'text-cursor-input',
  field: 'text-cursor-input',
  textarea: 'align-left',
  select: 'chevron-down',
  dropdown: 'chevron-down',
  combobox: 'chevron-down',
  autocomplete: 'search',
  typeahead: 'search',
  checkbox: 'check-square',
  check: 'check',
  checkmark: 'check',
  radio: 'circle-dot',
  radiobutton: 'circle-dot',
  toggle: 'toggle-left',
  switch: 'toggle-left',
  slider: 'sliders-horizontal',
  range: 'sliders-horizontal',
  datepicker: 'calendar',
  date: 'calendar',
  calendar: 'calendar',
  timepicker: 'clock',
  time: 'clock',
  datetime: 'calendar-clock',
  colorpicker: 'palette',
  color: 'palette',
  filepicker: 'file',
  fileupload: 'upload',
  fileinput: 'file-input',
  form: 'clipboard-list',
  formfield: 'text-cursor-input',
  label: 'tag',
  placeholder: 'type',
  hint: 'help-circle',
  helper: 'help-circle',
  error: 'alert-circle',
  warning: 'alert-triangle',
  success: 'check-circle',
  validation: 'shield-check',
  required: 'asterisk',
  optional: 'minus',
  password: 'lock',
  secret: 'lock',
  hidden: 'eye-off',
  visible: 'eye',
  show: 'eye',
  hide: 'eye-off',
  reveal: 'eye',

  // ============================================
  // Layout & Containers
  // ============================================
  container: 'square',
  wrapper: 'square',
  box: 'square',
  frame: 'square',
  panel: 'panel-top',
  section: 'layout',
  area: 'square',
  region: 'square',
  zone: 'square',
  card: 'square',
  tile: 'square',
  grid: 'grid-3x3',
  row: 'grip-horizontal',
  column: 'grip-vertical',
  col: 'grip-vertical',
  flex: 'move',
  stack: 'layers',
  group: 'group',
  cluster: 'group',
  list: 'list',
  listitem: 'minus',
  item: 'minus',
  divider: 'minus',
  separator: 'minus',
  spacer: 'space',
  gap: 'space',
  margin: 'square-dashed',
  padding: 'square-dashed',
  border: 'square',
  outline: 'square-dashed',

  // ============================================
  // Media & Images
  // ============================================
  image: 'image',
  img: 'image',
  photo: 'image',
  picture: 'image',
  thumbnail: 'image',
  thumb: 'image',
  gallery: 'images',
  carousel: 'gallery-horizontal',
  slideshow: 'presentation',
  slider2: 'gallery-horizontal',
  video: 'video',
  videoplayer: 'play-circle',
  audio: 'volume-2',
  audioplayer: 'music',
  music: 'music',
  player: 'play-circle',
  media: 'play-circle',
  icon: 'star',
  icons: 'star',
  emoji: 'smile',
  avatar: 'user',
  profile: 'user',
  profilepic: 'user',
  userpic: 'user',
  logo: 'hexagon',
  brand: 'hexagon',
  banner: 'rectangle-horizontal',
  hero: 'rectangle-horizontal',
  cover: 'image',
  background: 'image',
  backdrop: 'image',
  poster: 'image',
  figure: 'image',
  illustration: 'image',
  graphic: 'image',
  chart: 'bar-chart-2',
  graph: 'line-chart',
  diagram: 'git-branch',
  map: 'map',
  location: 'map-pin',

  // ============================================
  // Text & Typography
  // ============================================
  text: 'type',
  typography: 'type',
  font: 'type',
  title: 'heading',
  heading: 'heading',
  headline: 'heading',
  h1: 'heading-1',
  h2: 'heading-2',
  h3: 'heading-3',
  h4: 'heading-4',
  h5: 'heading-5',
  h6: 'heading-6',
  subtitle: 'text',
  subheading: 'text',
  paragraph: 'pilcrow',
  body: 'align-left',
  content: 'file-text',
  description: 'align-left',
  summary: 'align-left',
  excerpt: 'align-left',
  caption: 'subtitles',
  quote: 'quote',
  blockquote: 'quote',
  citation: 'quote',
  code: 'code',
  codeblock: 'code',
  pre: 'code',
  monospace: 'code',
  inline: 'type',
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strikethrough: 'strikethrough',
  highlight: 'highlighter',
  mark: 'highlighter',
  link: 'link',
  hyperlink: 'link',
  anchor: 'anchor',
  url: 'link',
  href: 'link',

  // ============================================
  // Data Display
  // ============================================
  table: 'table',
  datatable: 'table',
  datagrid: 'table',
  spreadsheet: 'table',
  tree: 'git-branch',
  treeview: 'git-branch',
  hierarchy: 'git-branch',
  timeline: 'git-commit-horizontal',
  feed: 'rss',
  activity: 'activity',
  log: 'scroll-text',
  history: 'history',
  stats: 'bar-chart',
  statistics: 'bar-chart',
  metrics: 'trending-up',
  analytics: 'pie-chart',
  dashboard: 'layout-dashboard',
  widget: 'layout-grid',
  counter: 'hash',
  number: 'hash',
  percentage: 'percent',
  progress: 'loader',
  progressbar: 'loader',
  loading: 'loader',
  spinner: 'loader',
  skeleton: 'square-dashed',
  placeholder2: 'square-dashed',
  empty: 'inbox',
  nodata: 'inbox',
  notfound: 'search-x',

  // ============================================
  // Feedback & Notifications
  // ============================================
  alert: 'alert-triangle',
  notification: 'bell',
  notif: 'bell',
  toast: 'message-square',
  snackbar: 'message-square',
  message: 'message-circle',
  chat: 'message-circle',
  comment: 'message-square',
  feedback: 'message-square',
  review: 'star',
  rating: 'star',
  stars: 'star',
  badge: 'badge',
  tag2: 'tag',
  chip: 'tag',
  pill: 'tag',
  status: 'circle',
  indicator: 'circle',
  dot: 'circle',
  pulse: 'activity',
  live: 'radio',
  online: 'wifi',
  offline: 'wifi-off',
  connected: 'plug',
  disconnected: 'plug-zap',

  // ============================================
  // Overlays & Modals
  // ============================================
  modal: 'square',
  dialog: 'message-square',
  popup: 'external-link',
  popover: 'message-square',
  tooltip: 'message-circle',
  overlay: 'layers',
  backdrop2: 'square',
  sheet: 'panel-bottom',
  bottomsheet: 'panel-bottom',
  actionsheet: 'panel-bottom',
  lightbox: 'image',
  preview: 'eye',
  zoom2: 'zoom-in',
  fullscreen2: 'maximize',

  // ============================================
  // User & Account
  // ============================================
  user: 'user',
  users: 'users',
  person: 'user',
  people: 'users',
  account: 'user',
  member: 'user',
  team: 'users',
  group2: 'users',
  organization: 'building',
  company: 'building',
  contact: 'contact',
  contacts: 'contact',
  addressbook: 'book-user',
  friend: 'user-plus',
  follower: 'user-plus',
  following: 'user-check',
  admin: 'shield',
  moderator: 'shield',
  role: 'key',
  permission: 'key',
  access: 'key',
  auth: 'lock',
  authentication: 'lock',
  login: 'log-in',
  signin: 'log-in',
  logout: 'log-out',
  signout: 'log-out',
  register: 'user-plus',
  signup: 'user-plus',

  // ============================================
  // Search & Filter
  // ============================================
  search: 'search',
  searchbar: 'search',
  searchbox: 'search',
  searchfield: 'search',
  find: 'search',
  lookup: 'search',
  query: 'search',
  filter: 'filter',
  filters: 'sliders-horizontal',
  sort: 'arrow-up-down',
  sorting: 'arrow-up-down',
  order: 'arrow-up-down',
  orderby: 'arrow-up-down',
  asc: 'arrow-up',
  desc: 'arrow-down',
  ascending: 'arrow-up',
  descending: 'arrow-down',

  // ============================================
  // Settings & Configuration
  // ============================================
  settings: 'settings',
  setting: 'settings',
  config: 'settings',
  configuration: 'settings',
  preferences: 'sliders-horizontal',
  options: 'settings',
  customize: 'palette',
  personalize: 'palette',
  theme: 'palette',
  appearance: 'palette',
  display: 'monitor',
  language: 'globe',
  locale: 'globe',
  region2: 'globe',
  timezone: 'clock',
  privacy: 'shield',
  security: 'shield',
  notifications2: 'bell',
  sound: 'volume-2',
  vibration: 'vibrate',
  accessibility: 'accessibility',
  a11y: 'accessibility',

  // ============================================
  // Files & Documents
  // ============================================
  file: 'file',
  files: 'files',
  document: 'file-text',
  documents: 'files',
  doc: 'file-text',
  pdf: 'file-text',
  word: 'file-text',
  excel: 'file-spreadsheet',
  powerpoint: 'presentation',
  folder: 'folder',
  folders: 'folders',
  directory: 'folder',
  archive: 'archive',
  zip: 'archive',
  attachment: 'paperclip',
  attach: 'paperclip',
  clip: 'paperclip',

  // ============================================
  // Communication
  // ============================================
  email: 'mail',
  mail: 'mail',
  inbox: 'inbox',
  outbox: 'send',
  draft: 'file-edit',
  compose: 'edit',
  phone: 'phone',
  call: 'phone',
  telephone: 'phone',
  mobile: 'smartphone',
  sms: 'message-square',
  messenger: 'message-circle',
  whatsapp: 'message-circle',
  telegram: 'send',
  slack: 'hash',
  discord: 'message-circle',
  video2: 'video',
  videocall: 'video',
  conference: 'users',
  meeting: 'users',
  webinar: 'presentation',
  broadcast: 'radio',
  stream: 'radio',
  live2: 'radio',

  // ============================================
  // Social & Sharing
  // ============================================
  social: 'share-2',
  like: 'heart',
  love: 'heart',
  favorite: 'heart',
  bookmark: 'bookmark',
  save2: 'bookmark',
  pin: 'pin',
  follow: 'user-plus',
  unfollow: 'user-minus',
  subscribe: 'bell-plus',
  unsubscribe: 'bell-minus',
  share2: 'share-2',
  retweet: 'repeat',
  repost: 'repeat',
  mention: 'at-sign',
  hashtag: 'hash',

  // ============================================
  // E-commerce
  // ============================================
  cart: 'shopping-cart',
  shoppingcart: 'shopping-cart',
  basket: 'shopping-basket',
  bag: 'shopping-bag',
  checkout: 'credit-card',
  payment: 'credit-card',
  pay: 'credit-card',
  creditcard: 'credit-card',
  wallet: 'wallet',
  money: 'banknote',
  cash: 'banknote',
  currency: 'dollar-sign',
  price: 'tag',
  discount: 'percent',
  coupon: 'ticket',
  voucher: 'ticket',
  gift: 'gift',
  wishlist: 'heart',
  order2: 'package',
  orders: 'package',
  shipping: 'truck',
  delivery: 'truck',
  tracking: 'map-pin',
  return: 'undo-2',
  refund: 'rotate-ccw',
  invoice: 'receipt',
  receipt: 'receipt',
  product: 'box',
  products: 'boxes',
  inventory: 'warehouse',
  stock: 'warehouse',
  store: 'store',
  shop: 'store',
  marketplace: 'store',

  // ============================================
  // Status & State
  // ============================================
  active: 'check-circle',
  inactive: 'x-circle',
  enabled: 'check',
  disabled2: 'x',
  on: 'toggle-right',
  off: 'toggle-left',
  open: 'door-open',
  closed: 'door-closed',
  locked: 'lock',
  unlocked: 'unlock',
  public: 'globe',
  private: 'lock',
  draft2: 'file-edit',
  published: 'globe',
  archived: 'archive',
  deleted: 'trash',
  pending: 'clock',
  approved: 'check-circle',
  rejected: 'x-circle',
  completed: 'check-circle',
  failed: 'x-circle',
  inprogress: 'loader',
  paused: 'pause-circle',
  scheduled: 'calendar',
  expired: 'calendar-x',

  // ============================================
  // Misc UI Elements
  // ============================================
  header: 'panel-top',
  footer: 'panel-bottom',
  main: 'layout',
  aside: 'panel-right',
  toolbar: 'wrench',
  actionbar: 'more-horizontal',
  statusbar: 'info',
  titlebar: 'minus',
  scrollbar: 'grip-vertical',
  handle: 'grip-vertical',
  grip: 'grip-vertical',
  resizer: 'move',
  splitter: 'split',
  accordion: 'chevrons-up-down',
  collapsible: 'chevron-down',
  expandable: 'chevron-down',
  details: 'info',
  info: 'info',
  about: 'info',
  help: 'help-circle',
  faq: 'help-circle',
  support: 'life-buoy',
  docs: 'book-open',
  documentation: 'book-open',
  guide: 'book-open',
  tutorial: 'graduation-cap',
  tour: 'compass',
  onboarding: 'rocket',
  welcome: 'hand',
  intro: 'play-circle',
  getting: 'rocket',
  started: 'rocket',
}

/**
 * Direct Lucide icon names that should be matched exactly
 * This is a subset of common ones - the full list has 1000+ icons
 */
const LUCIDE_ICONS = new Set([
  'activity', 'airplay', 'alert-circle', 'alert-triangle', 'align-center',
  'align-justify', 'align-left', 'align-right', 'anchor', 'aperture',
  'archive', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up',
  'at-sign', 'award', 'bar-chart', 'bar-chart-2', 'battery', 'bell',
  'bluetooth', 'bold', 'book', 'book-open', 'bookmark', 'box', 'briefcase',
  'calendar', 'camera', 'cast', 'check', 'check-circle', 'check-square',
  'chevron-down', 'chevron-left', 'chevron-right', 'chevron-up', 'chrome',
  'circle', 'clipboard', 'clock', 'cloud', 'code', 'codepen', 'coffee',
  'columns', 'command', 'compass', 'copy', 'corner-down-left', 'cpu',
  'credit-card', 'crop', 'crosshair', 'database', 'delete', 'disc',
  'dollar-sign', 'download', 'droplet', 'edit', 'edit-2', 'edit-3',
  'external-link', 'eye', 'eye-off', 'facebook', 'fast-forward', 'feather',
  'figma', 'file', 'file-minus', 'file-plus', 'file-text', 'film', 'filter',
  'flag', 'folder', 'folder-minus', 'folder-plus', 'framer', 'frown',
  'gift', 'git-branch', 'git-commit', 'git-merge', 'git-pull-request',
  'github', 'gitlab', 'globe', 'grid', 'hard-drive', 'hash', 'headphones',
  'heart', 'help-circle', 'hexagon', 'home', 'image', 'inbox', 'info',
  'instagram', 'italic', 'key', 'layers', 'layout', 'life-buoy', 'link',
  'link-2', 'linkedin', 'list', 'loader', 'lock', 'log-in', 'log-out',
  'mail', 'map', 'map-pin', 'maximize', 'maximize-2', 'meh', 'menu',
  'message-circle', 'message-square', 'mic', 'mic-off', 'minimize',
  'minimize-2', 'minus', 'minus-circle', 'minus-square', 'monitor', 'moon',
  'more-horizontal', 'more-vertical', 'mouse-pointer', 'move', 'music',
  'navigation', 'navigation-2', 'octagon', 'package', 'paperclip', 'pause',
  'pause-circle', 'pen-tool', 'percent', 'phone', 'phone-call',
  'phone-forwarded', 'phone-incoming', 'phone-missed', 'phone-off',
  'phone-outgoing', 'pie-chart', 'play', 'play-circle', 'plus',
  'plus-circle', 'plus-square', 'pocket', 'power', 'printer', 'radio',
  'refresh-ccw', 'refresh-cw', 'repeat', 'rewind', 'rotate-ccw', 'rotate-cw',
  'rss', 'save', 'scissors', 'search', 'send', 'server', 'settings',
  'share', 'share-2', 'shield', 'shield-off', 'shopping-bag', 'shopping-cart',
  'shuffle', 'sidebar', 'skip-back', 'skip-forward', 'slack', 'slash',
  'sliders', 'smartphone', 'smile', 'speaker', 'square', 'star', 'stop-circle',
  'sun', 'sunrise', 'sunset', 'tablet', 'tag', 'target', 'terminal',
  'thermometer', 'thumbs-down', 'thumbs-up', 'toggle-left', 'toggle-right',
  'tool', 'trash', 'trash-2', 'trello', 'trending-down', 'trending-up',
  'triangle', 'truck', 'tv', 'twitch', 'twitter', 'type', 'umbrella',
  'underline', 'unlock', 'upload', 'upload-cloud', 'user', 'user-check',
  'user-minus', 'user-plus', 'user-x', 'users', 'video', 'video-off',
  'voicemail', 'volume', 'volume-1', 'volume-2', 'volume-x', 'watch', 'wifi',
  'wifi-off', 'wind', 'x', 'x-circle', 'x-octagon', 'x-square', 'youtube',
  'zap', 'zap-off', 'zoom-in', 'zoom-out',
])

/**
 * Primitive type to icon mapping
 */
const PRIMITIVE_ICONS: Record<string, string> = {
  button: 'mouse-pointer-click',
  input: 'text-cursor-input',
  textarea: 'align-left',
  text: 'type',
  frame: 'square',
  image: 'image',
  icon: 'star',
  link: 'link',
  select: 'chevron-down',
  checkbox: 'check-square',
  radio: 'circle-dot',
}

/**
 * Default fallback icon
 */
const FALLBACK_ICON = 'square'

/**
 * Extract keywords from a CamelCase or PascalCase name
 */
export function extractKeywords(name: string): string[] {
  // Split on uppercase letters, numbers, underscores, hyphens
  const parts = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // CamelCase → Camel Case
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')  // HTMLParser → HTML Parser
    .replace(/[-_]/g, ' ')  // kebab-case, snake_case
    .toLowerCase()
    .split(/\s+/)
    .filter(p => p.length > 0)

  return parts
}

/**
 * Find the best matching icon for a component name
 */
export function findIconForComponent(
  componentName: string,
  primitive?: string
): string {
  const nameLower = componentName.toLowerCase()

  // 1. Check if the name itself is a Lucide icon
  if (LUCIDE_ICONS.has(nameLower)) {
    return nameLower
  }

  // 2. Check direct keyword match
  if (KEYWORD_TO_ICON[nameLower]) {
    return KEYWORD_TO_ICON[nameLower]
  }

  // 3. Extract keywords and try each
  const keywords = extractKeywords(componentName)

  // Try exact matches first
  for (const keyword of keywords) {
    if (KEYWORD_TO_ICON[keyword]) {
      return KEYWORD_TO_ICON[keyword]
    }
    if (LUCIDE_ICONS.has(keyword)) {
      return keyword
    }
  }

  // Try partial matches (keyword is part of a known term)
  for (const keyword of keywords) {
    for (const [term, icon] of Object.entries(KEYWORD_TO_ICON)) {
      if (term.includes(keyword) || keyword.includes(term)) {
        return icon
      }
    }
  }

  // 4. Primitive-based fallback
  if (primitive && PRIMITIVE_ICONS[primitive]) {
    return PRIMITIVE_ICONS[primitive]
  }

  // 5. Final fallback
  return FALLBACK_ICON
}

/**
 * Get SVG path data for common icons (for inline rendering without external dependencies)
 * These are Lucide icon paths
 */
export const ICON_PATHS: Record<string, string> = {
  'square': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>',
  'type': '<polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line>',
  'mouse-pointer-click': '<path d="m9 9 5 12 1.8-5.2L21 14Z"></path><path d="M7.2 2.2 8 5.1"></path><path d="m5.1 8-2.9-.8"></path><path d="M14 4.1 12 6"></path><path d="m6 12-1.9 2"></path>',
  'text-cursor-input': '<path d="M5 4h1a3 3 0 0 1 3 3 3 3 0 0 1 3-3h1"></path><path d="M13 20h-1a3 3 0 0 1-3-3 3 3 0 0 1-3 3H5"></path><path d="M5 16H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1"></path><path d="M13 8h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7"></path><path d="M9 7v10"></path>',
  'image': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  'link': '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>',
  'chevron-down': '<polyline points="6 9 12 15 18 9"></polyline>',
  'check-square': '<polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
  'circle-dot': '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="1"></circle>',
  'align-left': '<line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line>',
  'menu': '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>',
  'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  'search': '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>',
  'heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>',
  'mail': '<rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>',
  'shopping-cart': '<circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>',
  'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>',
  'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>',
  'folder': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>',
  'file': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline>',
  'trash-2': '<path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line>',
  'plus': '<line x1="12" x2="12" y1="5" y2="19"></line><line x1="5" x2="19" y1="12" y2="12"></line>',
  'x': '<line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>',
  'check': '<polyline points="20 6 9 17 4 12"></polyline>',
  'pencil': '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>',
  'eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
  'calendar': '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line>',
  'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>',
  'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
  'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" x2="12" y1="3" y2="15"></line>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M3 21v-5h5"></path>',
  'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
  'grid-3x3': '<rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M3 15h18"></path><path d="M9 3v18"></path><path d="M15 3v18"></path>',
  'list': '<line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line>',
  'layout-dashboard': '<rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>',
  'bar-chart-2': '<line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line>',
  'pie-chart': '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>',
  'activity': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>',
  'message-circle': '<path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"></path>',
  'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
  'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>',
  'info': '<circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="16" y2="12"></line><line x1="12" x2="12.01" y1="8" y2="8"></line>',
  'help-circle': '<circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" x2="12.01" y1="17" y2="17"></line>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" x2="12" y1="9" y2="13"></line><line x1="12" x2="12.01" y1="17" y2="17"></line>',
  'alert-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  'x-circle': '<circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line>',

  // Layout property icons
  'grip-horizontal': '<circle cx="12" cy="9" r="1"></circle><circle cx="19" cy="9" r="1"></circle><circle cx="5" cy="9" r="1"></circle><circle cx="12" cy="15" r="1"></circle><circle cx="19" cy="15" r="1"></circle><circle cx="5" cy="15" r="1"></circle>',
  'grip-vertical': '<circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
  'align-horizontal-space-between': '<rect width="6" height="14" x="3" y="5" rx="2"></rect><rect width="6" height="10" x="15" y="7" rx="2"></rect><path d="M3 2v20"></path><path d="M21 2v20"></path>',
  'wrap-text': '<line x1="3" x2="21" y1="6" y2="6"></line><path d="M3 12h15a3 3 0 1 1 0 6h-4"></path><polyline points="16 16 14 18 16 20"></polyline><line x1="3" x2="10" y1="18" y2="18"></line>',

  // Alignment property icons
  'align-center': '<line x1="21" x2="3" y1="6" y2="6"></line><line x1="17" x2="7" y1="12" y2="12"></line><line x1="19" x2="5" y1="18" y2="18"></line>',
  'align-right': '<line x1="21" x2="3" y1="6" y2="6"></line><line x1="21" x2="9" y1="12" y2="12"></line><line x1="21" x2="7" y1="18" y2="18"></line>',
  'align-start-vertical': '<rect width="4" height="6" x="6" y="5" rx="2"></rect><rect width="4" height="10" x="14" y="5" rx="2"></rect><path d="M2 2h20"></path>',
  'align-end-vertical': '<rect width="4" height="6" x="6" y="13" rx="2"></rect><rect width="4" height="10" x="14" y="9" rx="2"></rect><path d="M2 22h20"></path>',
  'align-center-horizontal': '<path d="M2 12h20"></path><rect width="6" height="8" x="9" y="3" rx="2"></rect><rect width="6" height="6" x="9" y="13" rx="2"></rect>',
  'align-center-vertical': '<path d="M12 2v20"></path><rect width="8" height="6" x="3" y="9" rx="2"></rect><rect width="6" height="6" x="13" y="9" rx="2"></rect>',
}

/**
 * Get the SVG path for an icon name
 */
export function getIconPath(iconName: string): string {
  return ICON_PATHS[iconName] || ICON_PATHS[FALLBACK_ICON]
}

/**
 * Generate a complete SVG element string for an icon
 */
export function generateIconSVG(
  iconName: string,
  size: number = 16,
  strokeWidth: number = 2
): string {
  const path = getIconPath(iconName)
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
}

/**
 * Batch process multiple component names
 */
export function findIconsForComponents(
  components: Array<{ name: string; primitive?: string }>
): Map<string, string> {
  const result = new Map<string, string>()

  for (const comp of components) {
    result.set(comp.name, findIconForComponent(comp.name, comp.primitive))
  }

  return result
}
