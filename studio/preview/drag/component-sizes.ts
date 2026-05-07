/**
 * Default visual sizes for palette components when dropped into absolute /
 * stacked containers. The dropped element gets these dimensions in CSS
 * pixels until the user resizes it.
 *
 * Canvas moves use the element's measured size and never consult this map.
 */
export const DEFAULT_COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  Button: { width: 100, height: 40 },
  Text: { width: 80, height: 24 },
  Icon: { width: 24, height: 24 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 100 },
  Frame: { width: 200, height: 100 },
  Image: { width: 100, height: 100 },
  Checkbox: { width: 120, height: 24 },
  Switch: { width: 50, height: 24 },
  Slider: { width: 200, height: 24 },
  Divider: { width: 100, height: 2 },
  Spacer: { width: 50, height: 20 },
}

/** Fallback size when the component name is unknown. */
export const FALLBACK_COMPONENT_SIZE = { width: 100, height: 40 }
