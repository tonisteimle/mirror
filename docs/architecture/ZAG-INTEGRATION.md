# Zag Integration

Mirror nutzt [Zag](https://zagjs.com/) als Behavior-Engine für komplexe UI-Komponenten.

## Konzept

```
┌─────────────────────────────────────────────────────────────┐
│                     Mirror DSL                              │
│                                                             │
│   "WAS will ich?" - Struktur + Styling                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Zag Machines                            │
│                                                             │
│   "WIE funktioniert es?" - Behavior + Accessibility         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Verantwortlichkeiten

| Mirror | Zag |
|--------|-----|
| Struktur (Slots) | State Management |
| Styling (CSS) | Keyboard Navigation |
| Komposition | Focus Management |
| Design Tokens | ARIA Attributes |
| Custom Content | Event Handling |

## Warum Zag?

1. **Framework-agnostic** - Pure JavaScript State Machines
2. **Production-ready** - Battle-tested, accessible
3. **35+ Komponenten** - Select, DatePicker, Dialog, etc.
4. **Headless** - Kein eigenes Styling, passt zu Mirror

## Architektur

### Preview (Studio)

```
Mirror Source → Parser → AST → Zag Compiler → Live DOM + Zag Runtime
```

Der Preview nutzt Zag direkt für sofortiges Feedback.

### Export (Production)

```
Mirror Source → Parser → AST → Target Compiler → Output

Targets:
├── Vanilla JS + Zag
├── React + Zag
├── React + Radix (später)
└── Native DOM (ohne Dependencies)
```

## Komponenten-Mapping

| Mirror Primitive | Zag Machine |
|------------------|-------------|
| `Select` | `@zag-js/select` |
| `Select searchable` | `@zag-js/combobox` |
| `DatePicker` | `@zag-js/date-picker` |
| `Dialog` | `@zag-js/dialog` |
| `Menu` | `@zag-js/menu` |
| `Tabs` | `@zag-js/tabs` |
| `Accordion` | `@zag-js/accordion` |
| `Tooltip` | `@zag-js/tooltip` |
| `Slider` | `@zag-js/slider` |
| `NumberInput` | `@zag-js/number-input` |

## Slot-zu-API Mapping

Am Beispiel Select:

| Mirror Slot | Zag API |
|-------------|---------|
| `Trigger:` | `getTriggerProps()` |
| `Content:` | `getContentProps()` |
| `Item:` | `getItemProps({ item })` |
| `ItemIndicator:` | `getItemIndicatorProps({ item })` |
| `Group:` | `getItemGroupProps()` |
| `GroupLabel:` | `getItemGroupLabelProps()` |

## State-Mapping

Mirror States werden zu Zag Data-Attributes:

| Mirror | Zag/DOM |
|--------|---------|
| `hover:` | `[data-highlighted]` |
| `highlighted:` | `[data-highlighted]` |
| `selected:` | `[data-state="checked"]` |
| `disabled:` | `[data-disabled]` |
| `open:` | `[data-state="open"]` |

## Vorteile

1. **Weniger Code** - Behavior kommt von Zag
2. **Bessere Accessibility** - Zag ist WCAG-compliant
3. **Konsistenz** - Gleiche Patterns überall
4. **Wartbarkeit** - Zag-Community pflegt die Logik
5. **Flexibilität** - Export zu verschiedenen Targets

## Referenzen

- [Zag Documentation](https://zagjs.com/)
- [Zag GitHub](https://github.com/chakra-ui/zag)
- [Select Feature](../../features/select/requirements.md)
