# Tabs

Tabbed navigation component with keyboard support and animated indicator.

## Status

| Aspekt | Status |
|--------|--------|
| Schema | ✅ `src/schema/zag-primitives.ts` |
| Metadata | ✅ `src/schema/zag-prop-metadata.ts` |
| IR | ✅ `src/ir/index.ts` |
| Codegen | ✅ `src/backends/dom.ts` |
| Runtime | ✅ `src/runtime/dom-runtime-string.ts` |
| Tests | ✅ `test/components/tabs.html` |

---

## Syntax

```mirror
Tabs defaultValue "home"
  Tab "Home" value "home"
    Text "Welcome to the home page"
    Button "Get Started"
  Tab "Settings" value "settings"
    Text "Settings content here"
```

## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | string | - | Controlled active tab |
| `defaultValue` | string | first tab | Initial active tab |
| `orientation` | `horizontal` \| `vertical` | `horizontal` | Tab bar direction |
| `activationMode` | `automatic` \| `manual` | `automatic` | When to activate tabs |
| `loopFocus` | boolean | `true` | Loop keyboard navigation |
| `deselectable` | boolean | `false` | Allow deselecting active tab |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| `onchange` | `{ value, previousValue }` | Tab changed |

---

## Examples

### Basic Tabs

```mirror
Tabs defaultValue "home"
  Tab "Home" value "home"
    Text "Welcome to the home page"
  Tab "Profile" value "profile"
    Text "Your profile settings"
  Tab "Settings" value "settings"
    Text "Application settings"
```

### Vertical Orientation

```mirror
Tabs orientation "vertical", defaultValue "home"
  Tab "Home" value "home"
    Text "Home content"
  Tab "Profile" value "profile"
    Text "Profile content"
  Tab "Settings" value "settings"
    Text "Settings content"
```

### Manual Activation

Mit `activationMode "manual"` wechselt der Tab erst bei Enter/Space, nicht bei Arrow-Keys.

```mirror
Tabs activationMode "manual", defaultValue "home"
  Tab "Home" value "home"
    Text "Use Arrow keys to navigate, Enter to select"
  Tab "About" value "about"
    Text "About page content"
  Tab "Contact" value "contact"
    Text "Contact information"
```

### Deselectable

Erlaubt das Abwählen des aktiven Tabs durch erneutes Klicken.

```mirror
Tabs deselectable, defaultValue "first"
  Tab "First" value "first"
    Text "Click again to deselect"
  Tab "Second" value "second"
    Text "Second content"
```

### Rich Content

```mirror
Tabs defaultValue "overview"
  Tab "Overview" value "overview"
    Box ver, gap 12
      Text "Dashboard Overview" weight bold, fs 16
      Text "Welcome to your dashboard" col #888
      Box hor, gap 8
        Button "Get Started"
        Button "Learn More" bg transparent, bor 1 #333
  Tab "Analytics" value "analytics"
    Box ver, gap 8
      Text "Analytics" weight bold
      Text "Charts and data visualizations"
  Tab "Reports" value "reports"
    Text "Reports content"
```

---

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowRight` | Next tab (horizontal) |
| `ArrowLeft` | Previous tab (horizontal) |
| `ArrowDown` | Next tab (vertical) |
| `ArrowUp` | Previous tab (vertical) |
| `Home` | First tab |
| `End` | Last tab |
| `Enter` / `Space` | Select tab (manual mode) |

---

## Accessibility

- List: `role="tablist"`, `aria-orientation`
- Trigger: `role="tab"`, `aria-selected`, `aria-controls`
- Content: `role="tabpanel"`, `aria-labelledby`, `tabindex="0"`

---

## Slots

| Slot | Element | Description |
|------|---------|-------------|
| `List` | `div` | Container for tab triggers |
| `Trigger` | `button` | Tab button (per item) |
| `Content` | `div` | Tab panel (per item) |
| `Indicator` | `div` | Animated active indicator |

---

## Implementation Notes

### Pattern: content-items

Tabs verwendet das `content-items` Pattern:
- Jedes `Tab` hat einen **Trigger** (Button) und **Content** (Panel)
- Triggers werden in `List` gesammelt
- Contents werden nach `List` gerendert
- Nur aktives Content-Panel ist sichtbar

### Generated Structure

```html
<div data-zag-component="tabs">
  <div data-slot="List" role="tablist">
    <button data-slot="Trigger" data-value="home" role="tab">Home</button>
    <button data-slot="Trigger" data-value="settings" role="tab">Settings</button>
    <div data-slot="Indicator"></div>
  </div>
  <div data-slot="Content" data-value="home" role="tabpanel">...</div>
  <div data-slot="Content" data-value="settings" role="tabpanel">...</div>
</div>
```

---

## Related

- [Accordion](./accordion.md) - Ähnliches Pattern, vertikal
- [Steps](./steps.md) - Wizard/Stepper Navigation
