/**
 * Color Systems Data
 *
 * Multiple color palettes for the color picker:
 * - Tailwind CSS
 * - Radix Colors
 * - Material Design (future)
 * - Open Color (future)
 */

export interface ColorScale {
  name: string
  shades: string[]  // Array of hex values, lightest to darkest
}

export interface ColorSystem {
  id: string
  name: string
  scales: ColorScale[]
}

// ============================================
// Radix Colors
// ============================================

export const RADIX_COLORS: ColorSystem = {
  id: 'radix',
  name: 'Radix',
  scales: [
    {
      name: 'gray',
      shades: ['#fcfcfc', '#f9f9f9', '#f0f0f0', '#e8e8e8', '#e0e0e0', '#d9d9d9', '#cecece', '#bbbbbb', '#8d8d8d', '#838383', '#646464', '#202020'],
    },
    {
      name: 'slate',
      shades: ['#fcfcfd', '#f9f9fb', '#f0f0f3', '#e8e8ec', '#e0e1e6', '#d9d9e0', '#cdced6', '#b9bbc6', '#8b8d98', '#80838d', '#60646c', '#1c2024'],
    },
    {
      name: 'red',
      shades: ['#fffcfc', '#fff7f7', '#feebec', '#ffdbdc', '#ffcdce', '#fdbdbe', '#f4a9aa', '#eb8e90', '#e5484d', '#dc3e42', '#ce2c31', '#641723'],
    },
    {
      name: 'pink',
      shades: ['#fffcfe', '#fef7fb', '#fee9f5', '#fbdcef', '#f6cee7', '#efbfdd', '#e7acd0', '#dd93c2', '#d6409f', '#cf3897', '#c2298a', '#651249'],
    },
    {
      name: 'violet',
      shades: ['#fdfcfe', '#faf8ff', '#f4f0fe', '#ebe4ff', '#e1d9ff', '#d4cafe', '#c2b5f5', '#aa99ec', '#6e56cf', '#654dc4', '#6550b9', '#2f265f'],
    },
    {
      name: 'indigo',
      shades: ['#fdfdfe', '#f7f9ff', '#edf2fe', '#e1e9ff', '#d2deff', '#c1d0ff', '#abbdf9', '#8da4ef', '#3e63dd', '#3358d4', '#3a5bc7', '#1f2d5c'],
    },
    {
      name: 'blue',
      shades: ['#fbfdff', '#f4faff', '#e6f4fe', '#d5efff', '#c2e5ff', '#acd8fc', '#8ec8f6', '#5eb1ef', '#0090ff', '#0588f0', '#0d74ce', '#113264'],
    },
    {
      name: 'cyan',
      shades: ['#fafdfe', '#f2fafb', '#def7f9', '#caf1f6', '#b5e9f0', '#9ddde7', '#7dcedc', '#3db9cf', '#00a2c7', '#0797b9', '#107d98', '#0d3c48'],
    },
    {
      name: 'teal',
      shades: ['#fafefd', '#f3fbf9', '#e0f8f3', '#ccf3ea', '#b8eae0', '#a1ded2', '#83cdc1', '#53b9ab', '#12a594', '#0d9b8a', '#008573', '#0d3d38'],
    },
    {
      name: 'green',
      shades: ['#fbfefc', '#f4fbf6', '#e6f6eb', '#d6f1df', '#c4e8d1', '#adddc0', '#8eceaa', '#5bb98b', '#30a46c', '#2b9a66', '#218358', '#193b2d'],
    },
    {
      name: 'yellow',
      shades: ['#fdfdf9', '#fefce9', '#fffab8', '#fff394', '#ffe770', '#f3d768', '#e4c767', '#d5ae39', '#ffe629', '#ffdc00', '#9e6c00', '#473b1f'],
    },
    {
      name: 'amber',
      shades: ['#fefdfb', '#fefbe9', '#fff7c2', '#ffee9c', '#fbe577', '#f3d673', '#e9c162', '#e2a336', '#ffc53d', '#ffba18', '#ab6400', '#4f3422'],
    },
    {
      name: 'orange',
      shades: ['#fefcfb', '#fff7ed', '#ffefd6', '#ffdfb5', '#ffd19a', '#ffc182', '#f5ae73', '#ec9455', '#f76b15', '#ef5f00', '#cc4e00', '#582d1d'],
    },
  ],
}

// ============================================
// Tailwind CSS Colors (from existing TailwindColorPalette)
// ============================================

export const TAILWIND_COLORS: ColorSystem = {
  id: 'tailwind',
  name: 'Tailwind',
  scales: [
    {
      name: 'slate',
      shades: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
    },
    {
      name: 'gray',
      shades: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
    },
    {
      name: 'zinc',
      shades: ['#fafafa', '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b', '#09090b'],
    },
    {
      name: 'neutral',
      shades: ['#fafafa', '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0a0a0a'],
    },
    {
      name: 'stone',
      shades: ['#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', '#78716c', '#57534e', '#44403c', '#292524', '#1c1917', '#0c0a09'],
    },
    {
      name: 'red',
      shades: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
    },
    {
      name: 'orange',
      shades: ['#fff7ed', '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412', '#7c2d12', '#431407'],
    },
    {
      name: 'amber',
      shades: ['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'],
    },
    {
      name: 'yellow',
      shades: ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12', '#422006'],
    },
    {
      name: 'lime',
      shades: ['#f7fee7', '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'],
    },
    {
      name: 'green',
      shades: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
    },
    {
      name: 'emerald',
      shades: ['#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'],
    },
    {
      name: 'teal',
      shades: ['#f0fdfa', '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59', '#134e4a', '#042f2e'],
    },
    {
      name: 'cyan',
      shades: ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344'],
    },
    {
      name: 'sky',
      shades: ['#f0f9ff', '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985', '#0c4a6e', '#082f49'],
    },
    {
      name: 'blue',
      shades: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
    },
    {
      name: 'indigo',
      shades: ['#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#1e1b4b'],
    },
    {
      name: 'violet',
      shades: ['#f5f3ff', '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#2e1065'],
    },
    {
      name: 'purple',
      shades: ['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#581c87', '#3b0764'],
    },
    {
      name: 'fuchsia',
      shades: ['#fdf4ff', '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f', '#701a75', '#4a044e'],
    },
    {
      name: 'pink',
      shades: ['#fdf2f8', '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'],
    },
    {
      name: 'rose',
      shades: ['#fff1f2', '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239', '#881337', '#4c0519'],
    },
  ],
}

// ============================================
// Material Design Colors
// ============================================

export const MATERIAL_COLORS: ColorSystem = {
  id: 'material',
  name: 'Material',
  scales: [
    {
      name: 'gray',
      shades: ['#FAFAFA', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161', '#424242', '#212121'],
    },
    {
      name: 'red',
      shades: ['#FFEBEE', '#FFCDD2', '#EF9A9A', '#E57373', '#EF5350', '#F44336', '#E53935', '#D32F2F', '#C62828', '#B71C1C'],
    },
    {
      name: 'pink',
      shades: ['#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292', '#EC407A', '#E91E63', '#D81B60', '#C2185B', '#AD1457', '#880E4F'],
    },
    {
      name: 'purple',
      shades: ['#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8', '#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2', '#6A1B9A', '#4A148C'],
    },
    {
      name: 'indigo',
      shades: ['#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB', '#5C6BC0', '#3F51B5', '#3949AB', '#303F9F', '#283593', '#1A237E'],
    },
    {
      name: 'blue',
      shades: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5', '#2196F3', '#1E88E5', '#1976D2', '#1565C0', '#0D47A1'],
    },
    {
      name: 'cyan',
      shades: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA', '#00BCD4', '#00ACC1', '#0097A7', '#00838F', '#006064'],
    },
    {
      name: 'teal',
      shades: ['#E0F2F1', '#B2DFDB', '#80CBC4', '#4DB6AC', '#26A69A', '#009688', '#00897B', '#00796B', '#00695C', '#004D40'],
    },
    {
      name: 'green',
      shades: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20'],
    },
    {
      name: 'lime',
      shades: ['#F9FBE7', '#F0F4C3', '#E6EE9C', '#DCE775', '#D4E157', '#CDDC39', '#C0CA33', '#AFB42B', '#9E9D24', '#827717'],
    },
    {
      name: 'yellow',
      shades: ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFF176', '#FFEE58', '#FFEB3B', '#FDD835', '#FBC02D', '#F9A825', '#F57F17'],
    },
    {
      name: 'amber',
      shades: ['#FFF8E1', '#FFECB3', '#FFE082', '#FFD54F', '#FFCA28', '#FFC107', '#FFB300', '#FFA000', '#FF8F00', '#FF6F00'],
    },
    {
      name: 'orange',
      shades: ['#FFF3E0', '#FFE0B2', '#FFCC80', '#FFB74D', '#FFA726', '#FF9800', '#FB8C00', '#F57C00', '#EF6C00', '#E65100'],
    },
    {
      name: 'brown',
      shades: ['#EFEBE9', '#D7CCC8', '#BCAAA4', '#A1887F', '#8D6E63', '#795548', '#6D4C41', '#5D4037', '#4E342E', '#3E2723'],
    },
  ],
}

// ============================================
// Open Color
// ============================================

export const OPEN_COLORS: ColorSystem = {
  id: 'open',
  name: 'Open',
  scales: [
    {
      name: 'gray',
      shades: ['#f8f9fa', '#f1f3f5', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#868e96', '#495057', '#343a40', '#212529'],
    },
    {
      name: 'red',
      shades: ['#fff5f5', '#ffe3e3', '#ffc9c9', '#ffa8a8', '#ff8787', '#ff6b6b', '#fa5252', '#f03e3e', '#e03131', '#c92a2a'],
    },
    {
      name: 'pink',
      shades: ['#fff0f6', '#ffdeeb', '#fcc2d7', '#faa2c1', '#f783ac', '#f06595', '#e64980', '#d6336c', '#c2255c', '#a61e4d'],
    },
    {
      name: 'grape',
      shades: ['#f8f0fc', '#f3d9fa', '#eebefa', '#e599f7', '#da77f2', '#cc5de8', '#be4bdb', '#ae3ec9', '#9c36b5', '#862e9c'],
    },
    {
      name: 'violet',
      shades: ['#f3f0ff', '#e5dbff', '#d0bfff', '#b197fc', '#9775fa', '#845ef7', '#7950f2', '#7048e8', '#6741d9', '#5f3dc4'],
    },
    {
      name: 'indigo',
      shades: ['#edf2ff', '#dbe4ff', '#bac8ff', '#91a7ff', '#748ffc', '#5c7cfa', '#4c6ef5', '#4263eb', '#3b5bdb', '#364fc7'],
    },
    {
      name: 'blue',
      shades: ['#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6', '#1971c2', '#1864ab'],
    },
    {
      name: 'cyan',
      shades: ['#e3fafc', '#c5f6fa', '#99e9f2', '#66d9e8', '#3bc9db', '#22b8cf', '#15aabf', '#1098ad', '#0c8599', '#0b7285'],
    },
    {
      name: 'teal',
      shades: ['#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9', '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b'],
    },
    {
      name: 'green',
      shades: ['#ebfbee', '#d3f9d8', '#b2f2bb', '#8ce99a', '#69db7c', '#51cf66', '#40c057', '#37b24d', '#2f9e44', '#2b8a3e'],
    },
    {
      name: 'lime',
      shades: ['#f4fce3', '#e9fac8', '#d8f5a2', '#c0eb75', '#a9e34b', '#94d82d', '#82c91e', '#74b816', '#66a80f', '#5c940d'],
    },
    {
      name: 'yellow',
      shades: ['#fff9db', '#fff3bf', '#ffec99', '#ffe066', '#ffd43b', '#fcc419', '#fab005', '#f59f00', '#f08c00', '#e67700'],
    },
    {
      name: 'orange',
      shades: ['#fff4e6', '#ffe8cc', '#ffd8a8', '#ffc078', '#ffa94d', '#ff922b', '#fd7e14', '#f76707', '#e8590c', '#d9480f'],
    },
  ],
}

// ============================================
// All available color systems
// ============================================

export const COLOR_SYSTEMS: ColorSystem[] = [
  TAILWIND_COLORS,
  RADIX_COLORS,
  MATERIAL_COLORS,
  OPEN_COLORS,
]

export function getColorSystem(id: string): ColorSystem | undefined {
  return COLOR_SYSTEMS.find(s => s.id === id)
}
