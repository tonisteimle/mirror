# Motion One Integration für Mirror

**Status:** Phase 6 abgeschlossen ✅
**Datum:** 2026-04-09

## Fortschritt

| Phase | Status | Beschreibung |
|-------|--------|--------------|
| Phase 1 | ✅ Done | Runtime mit Motion One (`motionAnimate`, `setupInViewAnimation`, `setupScrollAnimation`, `setupStaggerAnimation`) |
| Phase 2 | ✅ Done | DSL Schema & IR Types (`in-view`, `scroll-y`, `spring`, `stagger`, `threshold`) |
| Phase 3 | ✅ Done | Parser-Logik für neue Properties (PROPERTY_STARTERS update) |
| Phase 4 | ✅ Done | IR Transformation (AST → IR) - `extractInView`, `extractScrollLinked`, `extractSpring`, `extractStagger` |
| Phase 5 | ✅ Done | Code Generator (IR → JavaScript) - Motion One calls in DOM backend |
| Phase 6 | ✅ Done | Runtime-String Sync - fallback to IntersectionObserver when Motion One not available |
| Phase 7 | 🔜 Next | Tutorial & Tests - 23 tests passing |

## Motivation

Mirror braucht leistungsfähige Scroll-Animationen und bessere Animation-Performance. Motion One ist die ideale Library:

| Aspekt | Motion One |
|--------|------------|
| **Größe** | ~3kb (mini) / 18kb (hybrid) |
| **Framework** | Vanilla JS (passt zu Mirror's DOM-Output) |
| **Scroll** | Eingebaut, hardware-accelerated |
| **Springs** | Physics-basiert, natürlich |
| **API** | Deklarativ, clean |
| **Lizenz** | MIT (Open Source) |
| **Autor** | Matt Perry (Framer Motion) |

---

## Aktuelle Implementierung

### Dateien

| Datei | Beschreibung |
|-------|--------------|
| `compiler/runtime/dom-runtime.ts` | Runtime mit `ANIMATION_PRESETS`, `playStateAnimation()` |
| `compiler/runtime/dom-runtime-string.ts` | String-Version für Inline-Bundles |
| `compiler/backends/dom.ts` | Code-Generator IR → JavaScript |
| `compiler/schema/dsl.ts` | DSL Schema mit `animation` Property |
| `compiler/ir/types.ts` | IR-Typen inkl. `IRAnimation` |

### Aktuelle Animation-Presets (dom-runtime.ts:2196)

```typescript
const ANIMATION_PRESETS: Record<string, { keyframes: Keyframe[]; easing?: string }> = {
  'fade-in': { keyframes: [{ opacity: 0 }, { opacity: 1 }], easing: 'ease-out' },
  'fade-out': { keyframes: [{ opacity: 1 }, { opacity: 0 }], easing: 'ease-out' },
  'slide-in': { keyframes: [{ transform: 'translateY(-10px)', opacity: 0 }, ...], ... },
  'slide-out': { ... },
  'scale-in': { ... },
  'scale-out': { ... },
  'bounce': { ... },
  'pulse': { ... },
  'shake': { ... },
  'spin': { ... },
}
```

### Aktuelle Syntax

```mirror
// Transitions auf States
hover 0.2s:
  bg #2563eb

// Animation Presets
Frame anim bounce

// Enter/Exit
Btn.open:
  visible
  enter: fade-in
  exit: fade-out
```

---

## Neue Features

| Feature | Aktuell | Mit Motion One |
|---------|---------|----------------|
| CSS Transitions | `hover 0.2s:` | ✓ beibehalten |
| Easing | `ease-out` | + `spring` |
| Presets | `anim bounce` | ✓ via Motion One |
| Enter/Exit | `enter: fade-in` | ✓ beibehalten |
| **Scroll Reveal** | ❌ | `in-view` |
| **Scroll-linked** | ❌ | `scroll-y` |
| **Stagger** | ❌ | `stagger` |
| **Spring Physics** | ❌ | `spring` |

---

## Detaillierter Implementierungsplan

### Phase 1: Motion One Dependency & Runtime-Basis ✅ DONE

**Ziel:** Motion One einbinden, neue Animation-Funktionen bereitstellen

#### 1.1 Package installieren ✅

```bash
npm install motion  # v12.38.0 installiert
```

#### Implementierte Funktionen in `dom-runtime.ts`:

| Funktion | Beschreibung |
|----------|--------------|
| `motionAnimate(el, preset, config)` | Animation mit Motion One abspielen |
| `setupInViewAnimation(el, preset, config)` | Scroll-Reveal wenn Element sichtbar |
| `setupScrollAnimation(el, prop, from, to, config)` | Scroll-linked Animation (Parallax) |
| `setupStaggerAnimation(container, selector, preset, config)` | Stagger für Listen |
| `cleanupScrollAnimation(el)` | Cleanup für Scroll-Animation |
| `cleanupInViewAnimation(el)` | Cleanup für In-View-Animation |
| `getSpringPreset(name)` | Spring-Preset abrufen |
| `getMotionPreset(name)` | Motion-Preset abrufen |

#### Spring Presets:

| Name | Stiffness | Damping |
|------|-----------|---------|
| `default` | 100 | 15 |
| `gentle` | 50 | 20 |
| `bouncy` | 200 | 10 |
| `stiff` | 400 | 30 |
| `slow` | 60 | 25 |

#### Motion Presets (erweitert):

- `fade-in`, `fade-out`
- `slide-up`, `slide-down`, `slide-left`, `slide-right`
- `scale-in`, `scale-out`
- `bounce`, `pulse`, `shake`, `spin`
- **NEU:** `reveal-up`, `reveal-scale`, `reveal-fade`

#### 1.2 Runtime erweitern

**Datei:** `compiler/runtime/dom-runtime.ts`

```typescript
// Neue Imports (für TypeScript/Build)
import { animate, inView, scroll, stagger } from 'motion'

// Neuer Type
export interface MotionConfig {
  duration?: number
  delay?: number
  easing?: string | 'spring'
  spring?: {
    stiffness?: number
    damping?: number
    mass?: number
    bounce?: number
  }
}

// Bestehende ANIMATION_PRESETS durch Motion ersetzen
export function playMotionAnimation(
  el: HTMLElement,
  preset: string,
  config?: MotionConfig
): Promise<void> {
  const presets: Record<string, any> = {
    'fade-in': { opacity: [0, 1] },
    'fade-out': { opacity: [1, 0] },
    'slide-in': { opacity: [0, 1], y: [20, 0] },
    'slide-out': { opacity: [1, 0], y: [0, 20] },
    'scale-in': { opacity: [0, 1], scale: [0.9, 1] },
    'scale-out': { opacity: [1, 0], scale: [1, 0.9] },
    'bounce': { scale: [1, 1.1, 0.95, 1] },
    'pulse': { scale: [1, 1.05, 1], opacity: [1, 0.8, 1] },
    'shake': { x: [0, -5, 5, -5, 5, 0] },
    'spin': { rotate: [0, 360] },
  }

  const keyframes = presets[preset]
  if (!keyframes) return Promise.resolve()

  const options: any = {
    duration: config?.duration ?? 0.3,
    delay: config?.delay ?? 0,
  }

  if (config?.easing === 'spring' || config?.spring) {
    options.type = 'spring'
    if (config?.spring) {
      Object.assign(options, config.spring)
    }
  } else {
    options.ease = config?.easing ?? 'ease-out'
  }

  return animate(el, keyframes, options).then(() => {})
}

// Scroll Reveal
export function setupInView(
  selector: string,
  animation: string | object,
  config?: MotionConfig & { threshold?: number; staggerDelay?: number }
): () => void {
  return inView(selector, (el) => {
    const keyframes = typeof animation === 'string'
      ? getPresetKeyframes(animation)
      : animation

    const options: any = {
      duration: config?.duration ?? 0.5,
      delay: config?.staggerDelay
        ? stagger(config.staggerDelay)
        : (config?.delay ?? 0),
      ease: config?.easing ?? 'ease-out',
    }

    animate(el, keyframes, options)
  }, { amount: config?.threshold ?? 0.2 })
}

// Scroll-linked Animation
export function setupScrollAnimation(
  selector: string,
  property: string,
  from: number | string,
  to: number | string,
  axis: 'x' | 'y' = 'y'
): () => void {
  const el = document.querySelector(selector)
  if (!el) return () => {}

  return scroll(
    animate(el, { [property]: [from, to] }),
    { axis }
  )
}
```

#### 1.3 Runtime-String generieren

**Datei:** `compiler/runtime/dom-runtime-string.ts`

Das ist eine String-Version der Runtime für Inline-Bundles. Hier muss Motion One als externes Bundle oder inline eingebettet werden.

**Option A:** Motion als externes Script (empfohlen für Produktion)
```typescript
// Am Anfang des generierten Codes
const MOTION_IMPORT = `import { animate, inView, scroll, stagger } from 'https://esm.sh/motion@11';`
```

**Option B:** Motion inline bundlen (für Standalone)
- Erhöht Bundle-Size um ~18kb
- Kein externes CDN nötig

#### 1.4 Bestehende Animation migrieren

`playStateAnimation()` intern auf `playMotionAnimation()` umstellen:

```typescript
export function playStateAnimation(
  el: MirrorElement,
  anim: StateAnimation,
  styles?: Record<string, string>
): Promise<void> {
  if (anim.preset) {
    return playMotionAnimation(el, anim.preset, {
      duration: anim.duration,
      delay: anim.delay,
      easing: anim.easing,
    }).then(() => {
      if (styles) Object.assign(el.style, styles)
    })
  }
  // ... rest bleibt für CSS transitions
}
```

---

### Phase 2: Parser für neue Syntax

**Ziel:** `in-view`, `scroll-y`, `spring`, `stagger` parsen

#### 2.1 DSL Schema erweitern

**Datei:** `compiler/schema/dsl.ts`

```typescript
// Nach animation Property (~Zeile 2087)

'in-view': {
  name: 'in-view',
  aliases: ['inview'],
  category: 'animation',
  description: 'Trigger animation when element scrolls into view',

  standalone: {
    description: 'Default fade-in + slide-up animation',
    css: [],
  },

  keywords: {
    'fade-in': { description: 'Fade in when visible', css: [] },
    'fade-out': { description: 'Fade out when leaving', css: [] },
    'slide-up': { description: 'Slide up when visible', css: [] },
    'slide-down': { description: 'Slide down when visible', css: [] },
    'scale-in': { description: 'Scale in when visible', css: [] },
  },
},

'scroll-y': {
  name: 'scroll-y',
  aliases: ['scroll-ver'],
  category: 'animation',
  description: 'Link property to vertical scroll progress',

  // scroll-y <property> <from> <to>
  // Beispiel: scroll-y y 0 -100
  custom: true,
},

'scroll-x': {
  name: 'scroll-x',
  aliases: ['scroll-hor'],
  category: 'animation',
  description: 'Link property to horizontal scroll progress',
  custom: true,
},

'stagger': {
  name: 'stagger',
  aliases: [],
  category: 'animation',
  description: 'Delay for staggered animations in lists',

  numeric: {
    description: 'Delay between items in seconds',
    unit: 's',
    css: [],
    example: 'Card stagger 0.1',
  },
},

// Easing erweitern
// In der bestehenden easing-Sektion:
'spring': {
  name: 'spring',
  aliases: [],
  category: 'animation',
  description: 'Spring physics easing',

  standalone: {
    description: 'Default spring animation',
    css: [],
  },

  keywords: {
    'snappy': { description: 'Snappy spring (stiff)', css: [] },
    'gentle': { description: 'Gentle spring (soft)', css: [] },
    'bouncy': { description: 'Bouncy spring', css: [] },
  },

  // spring bounce 0.3
  // spring stiffness 300 damping 20
  custom: true,
},

'threshold': {
  name: 'threshold',
  aliases: [],
  category: 'animation',
  description: 'Visibility threshold for in-view animations',

  numeric: {
    description: 'Visibility ratio 0-1',
    unit: '',
    css: [],
    example: 'Card in-view fade-in, threshold 0.5',
  },
},
```

#### 2.2 Parser erweitern

**Datei:** `compiler/parser/parser.ts`

In der Property-Parsing-Logik:

```typescript
// Neue Property-Typen erkennen
function parseInViewProperty(tokens: Token[]): InViewConfig {
  // in-view
  // in-view fade-in
  // in-view fade-in slide-up
  // in-view fade-in, threshold 0.5, stagger 0.1s

  const config: InViewConfig = {
    animations: [],
    threshold: 0.2,
    stagger: undefined,
  }

  // Parse animations (fade-in, slide-up, etc.)
  while (isAnimationKeyword(peek())) {
    config.animations.push(consume().value)
  }

  // Default wenn keine angegeben
  if (config.animations.length === 0) {
    config.animations = ['fade-in', 'slide-up']
  }

  return config
}

function parseScrollProperty(tokens: Token[]): ScrollConfig {
  // scroll-y y 0 -100
  // scroll-y opacity 1 0
  // scroll-y width 0% 100%

  return {
    axis: tokens[0].value.includes('x') ? 'x' : 'y',
    property: tokens[1].value,
    from: tokens[2].value,
    to: tokens[3].value,
  }
}
```

#### 2.3 IR Types erweitern

**Datei:** `compiler/ir/types.ts`

```typescript
// Neue IR-Typen
export interface IRInView {
  type: 'inView'
  animations: string[]
  threshold?: number
  stagger?: number
  duration?: number
  easing?: string
}

export interface IRScrollLinked {
  type: 'scrollLinked'
  axis: 'x' | 'y'
  property: string
  from: string | number
  to: string | number
}

// IRNode erweitern
export interface IRNode {
  // ... bestehende Props
  inView?: IRInView
  scrollLinked?: IRScrollLinked
}

// IRAnimation erweitern
export interface IRAnimation {
  preset?: string
  duration?: number
  delay?: number
  easing?: string
  spring?: {
    bounce?: number
    stiffness?: number
    damping?: number
    mass?: number
  }
}
```

---

### Phase 3: IR Transformation

**Ziel:** AST → IR mit neuen Animation-Properties

**Datei:** `compiler/ir/index.ts`

```typescript
function processNode(node: ASTNode): IRNode {
  const irNode: IRNode = {
    // ... bestehende Transformation
  }

  // In-View Animation
  if (node.properties.inView) {
    irNode.inView = {
      type: 'inView',
      animations: node.properties.inView.animations || ['fade-in', 'slide-up'],
      threshold: node.properties.inView.threshold,
      stagger: node.properties.inView.stagger,
      duration: node.properties.inView.duration,
      easing: node.properties.inView.easing,
    }
  }

  // Scroll-linked Animation
  if (node.properties.scrollY || node.properties.scrollX) {
    const scroll = node.properties.scrollY || node.properties.scrollX
    irNode.scrollLinked = {
      type: 'scrollLinked',
      axis: node.properties.scrollY ? 'y' : 'x',
      property: scroll.property,
      from: scroll.from,
      to: scroll.to,
    }
  }

  return irNode
}
```

---

### Phase 4: Code Generator

**Ziel:** IR → JavaScript mit Motion One Calls

**Datei:** `compiler/backends/dom.ts`

```typescript
class DOMGenerator {
  private motionImports: Set<string> = new Set()
  private inViewSetups: string[] = []
  private scrollSetups: string[] = []

  generate(): string {
    // ... bestehende Generierung

    // Am Ende: Motion Setups
    if (this.inViewSetups.length > 0 || this.scrollSetups.length > 0) {
      this.emitMotionSetup()
    }

    return this.lines.join('\n')
  }

  private emitNode(node: IRNode): void {
    // ... bestehende Node-Generierung

    // In-View registrieren
    if (node.inView) {
      this.motionImports.add('inView')
      this.motionImports.add('animate')
      if (node.inView.stagger) {
        this.motionImports.add('stagger')
      }

      const selector = `[data-mirror-id="${node.nodeId}"]`
      const animations = this.buildInViewKeyframes(node.inView)
      const options = this.buildInViewOptions(node.inView)

      this.inViewSetups.push(
        `_runtime.setupInView('${selector}', ${animations}, ${options})`
      )
    }

    // Scroll-linked registrieren
    if (node.scrollLinked) {
      this.motionImports.add('scroll')
      this.motionImports.add('animate')

      const selector = `[data-mirror-id="${node.nodeId}"]`
      const { property, from, to, axis } = node.scrollLinked

      this.scrollSetups.push(
        `_runtime.setupScrollAnimation('${selector}', '${property}', ${from}, ${to}, '${axis}')`
      )
    }
  }

  private buildInViewKeyframes(inView: IRInView): string {
    const keyframes: Record<string, any> = {}

    for (const anim of inView.animations) {
      switch (anim) {
        case 'fade-in':
          keyframes.opacity = [0, 1]
          break
        case 'slide-up':
          keyframes.y = [20, 0]
          break
        case 'slide-down':
          keyframes.y = [-20, 0]
          break
        case 'scale-in':
          keyframes.scale = [0.9, 1]
          break
      }
    }

    return JSON.stringify(keyframes)
  }

  private buildInViewOptions(inView: IRInView): string {
    const opts: any = {}

    if (inView.duration) opts.duration = inView.duration
    if (inView.threshold) opts.threshold = inView.threshold
    if (inView.stagger) opts.staggerDelay = inView.stagger
    if (inView.easing) opts.easing = inView.easing

    return JSON.stringify(opts)
  }

  private emitMotionSetup(): void {
    this.emit('')
    this.emit('// Motion One Animations')
    this.emit('document.addEventListener("DOMContentLoaded", () => {')
    this.indent++

    for (const setup of this.inViewSetups) {
      this.emit(setup)
    }

    for (const setup of this.scrollSetups) {
      this.emit(setup)
    }

    this.indent--
    this.emit('})')
  }
}
```

---

### Phase 5: Runtime-String aktualisieren

**Datei:** `compiler/runtime/dom-runtime-string.ts`

Die String-Version muss synchron gehalten werden. Entweder:

1. **Manuell** - Änderungen in dom-runtime.ts → dom-runtime-string.ts kopieren
2. **Build-Script** - Automatisch aus dom-runtime.ts generieren

```typescript
// Am Anfang des DOM_RUNTIME_CODE Strings
export const DOM_RUNTIME_CODE = `
// Motion One (inlined or external)
const { animate, inView, scroll, stagger } = window.Motion || {};

// ... restliche Runtime
`
```

---

### Phase 6: Tutorial & Tests

#### 6.1 Tutorial erweitern

**Datei:** `docs/tutorial/07-animationen.html`

Neue Sections hinzufügen:
- Scroll Reveal (`in-view`)
- Spring Physics (`spring`)
- Scroll-linked Animationen (`scroll-y`)
- Stagger für Listen

#### 6.2 Tests schreiben

**Datei:** `tests/compiler/motion-integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../compiler'

describe('Motion One Integration', () => {
  describe('in-view', () => {
    it('parses in-view with default animation', () => {
      const code = `Card in-view`
      const ast = parse(code)
      // ... assertions
    })

    it('generates inView setup code', () => {
      const code = `Card in-view fade-in`
      const js = generateDOM(parse(code))
      expect(js).toContain('setupInView')
    })
  })

  describe('scroll-y', () => {
    it('parses scroll-linked animation', () => {
      const code = `Image scroll-y y 0 -100`
      const ast = parse(code)
      // ... assertions
    })
  })

  describe('spring', () => {
    it('parses spring easing', () => {
      const code = `Modal enter spring bounce 0.3`
      // ... assertions
    })
  })
})
```

---

## Zusammenfassung: Dateien & Änderungen

| Phase | Datei | Änderung |
|-------|-------|----------|
| 1.1 | `package.json` | + `"motion": "^11.0.0"` |
| 1.2 | `compiler/runtime/dom-runtime.ts` | + Motion-Funktionen |
| 1.3 | `compiler/runtime/dom-runtime-string.ts` | + Motion inline/import |
| 2.1 | `compiler/schema/dsl.ts` | + `in-view`, `scroll-y`, `spring`, `stagger` |
| 2.2 | `compiler/parser/parser.ts` | + Parsing-Logik |
| 2.3 | `compiler/ir/types.ts` | + `IRInView`, `IRScrollLinked` |
| 3 | `compiler/ir/index.ts` | + IR-Transformation |
| 4 | `compiler/backends/dom.ts` | + Code-Generierung |
| 5 | `compiler/runtime/dom-runtime-string.ts` | Sync mit dom-runtime.ts |
| 6.1 | `docs/tutorial/07-animationen.html` | + Neue Beispiele |
| 6.2 | `tests/compiler/motion-integration.test.ts` | + Tests |

---

## Syntax-Übersicht (Final)

```mirror
// === SCROLL REVEAL ===
Card in-view                           // Default: fade-in + slide-up
Card in-view fade-in                   // Nur fade
Card in-view fade-in slide-up          // Kombiniert
Card in-view fade-in, threshold 0.5    // Bei 50% sichtbar
Card in-view fade-in, stagger 0.1s     // In Listen

// === SPRING PHYSICS ===
Modal enter spring                     // Default spring
Modal enter spring bounce 0.3          // Mit bounce
Modal enter spring snappy              // Preset: stiff
Button hover spring:                   // Spring-Transition
  scale 1.05

// === SCROLL-LINKED ===
Image scroll-y y 0 -100                // Parallax
ProgressBar scroll-y w 0% 100%         // Progress
Header scroll-y opacity 1 0.8          // Fade on scroll

// === STAGGER ===
each item in $items
  Card in-view, stagger 0.1s
```

---

## Referenzen

- [Motion One Docs](https://motion.dev/docs)
- [animate()](https://motion.dev/docs/animate)
- [scroll()](https://motion.dev/docs/scroll)
- [inView()](https://motion.dev/docs/inview)
- [Spring Docs](https://motion.dev/docs/spring)
