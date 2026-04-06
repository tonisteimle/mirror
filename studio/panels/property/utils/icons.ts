/**
 * Property Panel Icons
 *
 * SVG icons for compact property labels.
 * Each icon is a 14x14 viewBox SVG string.
 */

export const PROP_ICONS = {
  // Size icons
  width: `<svg viewBox="0 0 14 14"><path d="M1 7h12M3 5l-2 2 2 2M11 5l2 2-2 2"/></svg>`,
  height: `<svg viewBox="0 0 14 14"><path d="M7 1v12M5 3l2-2 2 2M5 11l2 2 2-2"/></svg>`,

  // Padding/Margin direction icons
  paddingH: `<svg viewBox="0 0 14 14"><path d="M2 3v8M12 3v8M4 7h6"/></svg>`,
  paddingV: `<svg viewBox="0 0 14 14"><path d="M3 2h8M3 12h8M7 4v6"/></svg>`,
  paddingTop: `<svg viewBox="0 0 14 14"><path d="M3 2h8M7 4v6"/></svg>`,
  paddingRight: `<svg viewBox="0 0 14 14"><path d="M12 3v8M6 7h4"/></svg>`,
  paddingBottom: `<svg viewBox="0 0 14 14"><path d="M3 12h8M7 4v6"/></svg>`,
  paddingLeft: `<svg viewBox="0 0 14 14"><path d="M2 3v8M4 7h4"/></svg>`,

  // Margin icons (same as padding but with different styling context)
  marginH: `<svg viewBox="0 0 14 14"><path d="M1 3v8M13 3v8M3 7h8"/></svg>`,
  marginV: `<svg viewBox="0 0 14 14"><path d="M3 1h8M3 13h8M7 3v8"/></svg>`,
  marginTop: `<svg viewBox="0 0 14 14"><path d="M3 1h8M7 3v6"/></svg>`,
  marginRight: `<svg viewBox="0 0 14 14"><path d="M13 3v8M6 7h5"/></svg>`,
  marginBottom: `<svg viewBox="0 0 14 14"><path d="M3 13h8M7 5v6"/></svg>`,
  marginLeft: `<svg viewBox="0 0 14 14"><path d="M1 3v8M3 7h5"/></svg>`,

  // Radius icon
  radius: `<svg viewBox="0 0 14 14"><path d="M2 10V6a4 4 0 014-4h4"/></svg>`,

  // Min/Max icons
  minWidth: `<svg viewBox="0 0 14 14"><path d="M4 7h6M2 5v4M4 5l-2 2 2 2"/></svg>`,
  maxWidth: `<svg viewBox="0 0 14 14"><path d="M4 7h6M12 5v4M10 5l2 2-2 2"/></svg>`,
  minHeight: `<svg viewBox="0 0 14 14"><path d="M7 4v6M5 2h4M5 4l2-2 2 2"/></svg>`,
  maxHeight: `<svg viewBox="0 0 14 14"><path d="M7 4v6M5 12h4M5 10l2 2 2-2"/></svg>`,

  // Position icons
  posX: `<svg viewBox="0 0 14 14"><path d="M2 7h10M4 5l-2 2 2 2"/></svg>`,
  posY: `<svg viewBox="0 0 14 14"><path d="M7 2v10M5 4l2-2 2 2"/></svg>`,

  // Gap icon
  gap: `<svg viewBox="0 0 14 14"><path d="M3 3h3v3H3zM8 8h3v3H8z"/><path d="M6 6l2 2" stroke-dasharray="1 1"/></svg>`,
}

/**
 * Get an icon wrapped in a span with title
 */
export function iconLabel(iconKey: keyof typeof PROP_ICONS, title: string): string {
  return `<span class="pp-cell-label" title="${title}">${PROP_ICONS[iconKey]}</span>`
}
