/**
 * Expert System for Schema-Based Generation
 *
 * Experts handle specific UI patterns with:
 * 1. Pattern detection (does this prompt match?)
 * 2. Schema generation (LLM outputs validated JSON)
 * 3. Deterministic building (schema → Mirror code)
 *
 * Benefits:
 * - LLM only needs to fill in options, not generate syntax
 * - Zod validates LLM output → guaranteed valid
 * - Deterministic builder → no syntax errors
 * - Consistent output quality
 */

import { getApiKey } from '../../../lib/ai';
import { API } from '../../../constants';
import {
  buildSidebarNavigation,
  validateSidebarNavigation,
} from '../builders/sidebar-navigation';
import {
  SidebarNavigationInputSchema,
  type SidebarNavigationInput,
} from '../schemas/sidebar-navigation';

// =============================================================================
// Types
// =============================================================================

export type ExpertType = 'sidebar-navigation' | 'form' | 'tabs' | 'none';

export interface ExpertDetectionResult {
  expert: ExpertType;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ExpertResult {
  code: string;
  isValid: boolean;
  expert: ExpertType;
  schemaUsed: unknown;
  error?: string;
  timeMs: number;
}

// =============================================================================
// Expert Detection
// =============================================================================

const DETECTION_PATTERNS: Record<ExpertType, RegExp[]> = {
  'sidebar-navigation': [
    /\b(sidebar|seitenleiste|navigation|nav|menü|menu)\b/i,
    /\b(nav.*(item|punkt|eintrag))/i,
    /\b(sidebar.*nav|nav.*sidebar)/i,
    /\b(icon.*label|label.*icon).*(navigation|nav|menü)/i,
  ],
  'form': [
    /\b(formular|form|eingabe|input)\b/i,
    /\b(submit|absenden|speichern)\b/i,
  ],
  'tabs': [
    /\b(tabs?|reiter|tabbed)\b/i,
    /\b(tab.*(navigation|wechsel|switch))/i,
  ],
  'none': [],
};

/**
 * Detect which expert (if any) should handle this prompt.
 * Uses simple pattern matching for speed (no LLM call needed).
 */
export function detectExpert(prompt: string): ExpertDetectionResult {
  const lower = prompt.toLowerCase();

  // Check sidebar-navigation patterns
  const sidebarMatches = DETECTION_PATTERNS['sidebar-navigation'].filter(
    (pattern) => pattern.test(lower)
  );

  if (sidebarMatches.length >= 1) {
    // Additional checks for higher confidence
    const hasItems = /\b(items?|einträge?|punkte?|links?)\b/i.test(lower);
    const hasIcons = /\b(icons?|symbole?)\b/i.test(lower);
    const hasMultiple = /\b(\d+|mehrere|verschiedene|folgende)\b/i.test(lower);

    const confidence =
      sidebarMatches.length >= 2 || (hasItems && hasIcons)
        ? 'high'
        : hasMultiple
          ? 'medium'
          : 'low';

    return {
      expert: 'sidebar-navigation',
      confidence,
      reasoning: `Matched patterns: ${sidebarMatches.length}, items: ${hasItems}, icons: ${hasIcons}`,
    };
  }

  // TODO: Add form and tabs detection when experts are ready

  return {
    expert: 'none',
    confidence: 'high',
    reasoning: 'No expert pattern matched',
  };
}

// =============================================================================
// Schema Generation Prompts
// =============================================================================

const SIDEBAR_NAVIGATION_PROMPT = `Du generierst JSON für eine Sidebar-Navigation.

## SCHEMA

Das JSON muss diesem Schema entsprechen:

\`\`\`typescript
{
  // Wie wird die Nav angezeigt?
  visibility?: "permanent" | "collapsible" | "drawer"
  // permanent = immer sichtbar (default)
  // collapsible = ein/ausklappbar (rail mode)
  // drawer = mobile overlay

  // Wie sind die Items organisiert?
  // Wird automatisch erkannt basierend auf items/groups/tree

  // OPTION 1: Flache Liste
  items?: Array<{
    icon: string      // Lucide icon name (home, settings, users, etc.)
    label: string     // Display text
    active?: boolean  // Currently selected
    badge?: number | string  // Optional counter/status
  }>

  // OPTION 2: Gruppierte Sektionen
  groups?: Array<{
    label: string     // Section header
    items: Array<{ icon, label, active?, badge? }>
  }>

  // OPTION 3: Hierarchische Struktur
  tree?: Array<{
    icon: string
    label: string
    expanded?: boolean
    active?: boolean
    children?: Array<TreeItem>  // Recursive
  }>

  // Styling (alle optional, haben gute Defaults)
  container?: {
    width?: number        // Default: 240
    railWidth?: number    // Default: 64 (for collapsible)
    background?: "app" | "surface" | "elevated"
    padding?: "xs" | "sm" | "md" | "lg"
    gap?: "xs" | "sm" | "md"
  }

  itemStyle?: {
    display?: "icon-text" | "icon-only" | "text-only"
    paddingVertical?: "xs" | "sm" | "md"
    paddingHorizontal?: "sm" | "md" | "lg"
    radius?: "none" | "sm" | "md" | "lg"
  }

  iconStyle?: {
    size?: number  // Default: 20
    color?: "default" | "muted"
  }
}
\`\`\`

## ICON-NAMEN (Lucide)

Häufig verwendet:
- Navigation: home, settings, user, users, search, bell, mail, inbox
- Aktionen: plus, edit, trash, download, upload, share, copy
- Media: image, video, music, file, folder, archive
- Status: check, x, alert-circle, info, help-circle
- Arrows: arrow-left, arrow-right, chevron-down, chevron-right
- Charts: bar-chart, pie-chart, trending-up, activity

## BEISPIELE

"Navigation für eine Projektmanagement-App":
\`\`\`json
{
  "items": [
    { "icon": "layout-dashboard", "label": "Dashboard", "active": true },
    { "icon": "folder", "label": "Projekte" },
    { "icon": "check-square", "label": "Aufgaben" },
    { "icon": "users", "label": "Team" },
    { "icon": "settings", "label": "Einstellungen" }
  ]
}
\`\`\`

"Admin-Navigation mit Sektionen":
\`\`\`json
{
  "groups": [
    {
      "label": "Übersicht",
      "items": [
        { "icon": "home", "label": "Dashboard", "active": true },
        { "icon": "bar-chart", "label": "Analytics" }
      ]
    },
    {
      "label": "Verwaltung",
      "items": [
        { "icon": "users", "label": "Benutzer" },
        { "icon": "shield", "label": "Rollen" }
      ]
    }
  ]
}
\`\`\`

"E-Mail Navigation mit Badges":
\`\`\`json
{
  "items": [
    { "icon": "inbox", "label": "Posteingang", "active": true, "badge": 12 },
    { "icon": "send", "label": "Gesendet" },
    { "icon": "file", "label": "Entwürfe", "badge": 3 },
    { "icon": "trash", "label": "Papierkorb" }
  ]
}
\`\`\`

"Datei-Explorer":
\`\`\`json
{
  "tree": [
    {
      "icon": "folder",
      "label": "src",
      "expanded": true,
      "children": [
        { "icon": "file", "label": "index.ts", "active": true },
        {
          "icon": "folder",
          "label": "components",
          "children": [
            { "icon": "file", "label": "Button.tsx" }
          ]
        }
      ]
    }
  ]
}
\`\`\`

## REGELN

1. Antworte NUR mit JSON, kein Markdown
2. Wähle passende Icons (Lucide Namen)
3. Setze active: true für das aktive Item
4. Nutze badges nur wenn Zähler sinnvoll
5. Gruppiere nur bei >8 Items oder logischen Kategorien
6. Tree nur bei echter Hierarchie (Dateien, verschachtelte Menüs)`;

// =============================================================================
// Expert Pipeline
// =============================================================================

/**
 * Run the expert pipeline for a detected expert.
 *
 * 1. Generate schema JSON using LLM
 * 2. Validate with Zod
 * 3. Build Mirror code deterministically
 */
export async function runExpertPipeline(
  expert: ExpertType,
  prompt: string,
  _context?: unknown
): Promise<ExpertResult> {
  const startTime = performance.now();

  if (expert === 'sidebar-navigation') {
    return runSidebarNavigationExpert(prompt, startTime);
  }

  // Fallback for unimplemented experts
  return {
    code: '',
    isValid: false,
    expert,
    schemaUsed: null,
    error: `Expert '${expert}' not yet implemented`,
    timeMs: performance.now() - startTime,
  };
}

/**
 * Sidebar Navigation Expert
 */
async function runSidebarNavigationExpert(
  prompt: string,
  startTime: number
): Promise<ExpertResult> {
  try {
    // Step 1: Generate schema JSON from LLM
    const schemaJson = await generateSchemaJson(
      SIDEBAR_NAVIGATION_PROMPT,
      prompt
    );

    // Step 2: Parse and validate with Zod
    let parsed: SidebarNavigationInput;
    try {
      parsed = SidebarNavigationInputSchema.parse(schemaJson);
    } catch (zodError) {
      // Try to fix common issues and retry
      const fixed = attemptSchemaFix(schemaJson);
      if (fixed) {
        parsed = SidebarNavigationInputSchema.parse(fixed);
      } else {
        throw zodError;
      }
    }

    // Step 3: Build Mirror code deterministically
    const code = buildSidebarNavigation(parsed);

    // Step 4: Validate the result
    const validation = validateSidebarNavigation(parsed);

    return {
      code,
      isValid: validation.success,
      expert: 'sidebar-navigation',
      schemaUsed: parsed,
      timeMs: performance.now() - startTime,
    };
  } catch (error) {
    return {
      code: '',
      isValid: false,
      expert: 'sidebar-navigation',
      schemaUsed: null,
      error: error instanceof Error ? error.message : String(error),
      timeMs: performance.now() - startTime,
    };
  }
}

// =============================================================================
// LLM Schema Generation
// =============================================================================

/**
 * Generate schema JSON from LLM.
 */
async function generateSchemaJson(
  systemPrompt: string,
  userPrompt: string
): Promise<unknown> {
  const response = await fetch(API.ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
      'HTTP-Referer':
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
      'X-Title': 'Mirror - Expert',
    },
    body: JSON.stringify({
      model: API.MODEL_FAST,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';

  // Clean up markdown code blocks
  content = content
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Parse JSON
  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Could not parse JSON from LLM response');
  }
}

/**
 * Attempt to fix common schema issues.
 */
function attemptSchemaFix(json: unknown): unknown | null {
  if (!json || typeof json !== 'object') return null;

  const obj = json as Record<string, unknown>;

  // Fix: items array at wrong level
  if (Array.isArray(obj)) {
    return { items: obj };
  }

  // Fix: missing icon in items
  if (Array.isArray(obj.items)) {
    obj.items = (obj.items as Array<Record<string, unknown>>).map((item) => {
      if (!item.icon) {
        item.icon = 'circle'; // Default icon
      }
      return item;
    });
  }

  return obj;
}

// =============================================================================
// Convenience Export
// =============================================================================

/**
 * Check if a prompt should use an expert and run it if so.
 * Returns null if no expert matches.
 */
export async function tryExpertPipeline(
  prompt: string,
  options?: {
    minConfidence?: 'high' | 'medium' | 'low';
    debug?: boolean;
  }
): Promise<ExpertResult | null> {
  const detection = detectExpert(prompt);

  if (options?.debug) {
    console.debug('[Expert] Detection:', detection);
  }

  if (detection.expert === 'none') {
    return null;
  }

  // Check confidence threshold
  const confidenceOrder = ['low', 'medium', 'high'];
  const minConfidence = options?.minConfidence ?? 'medium';
  const detectedIndex = confidenceOrder.indexOf(detection.confidence);
  const minIndex = confidenceOrder.indexOf(minConfidence);

  if (detectedIndex < minIndex) {
    if (options?.debug) {
      console.debug(
        `[Expert] Confidence ${detection.confidence} below threshold ${minConfidence}`
      );
    }
    return null;
  }

  return runExpertPipeline(detection.expert, prompt);
}
