# Zag Props Tracking

Dieses Dokument trackt welche Zag-Props wir in Mirror implementiert haben vs. was Zag bietet.

**Legende:**
- ✅ = Implementiert
- ❌ = Fehlt
- ➖ = Nicht relevant für Mirror (z.B. getRootNode, Shadow DOM)

---

## Common Props (bei fast allen Komponenten)

| Prop | Beschreibung | Status | Priorität |
|------|--------------|--------|-----------|
| `disabled` | Deaktiviert Komponente | ✅ | - |
| `id` | Unique ID | ✅ | - |
| `dir` | RTL/LTR Support | ❌ | Medium |
| `ids` | Custom Element IDs | ❌ | Low |
| `getRootNode` | Shadow DOM Support | ➖ | - |
| `translations` | i18n Strings | ❌ | Low |

---

## Select

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `multiple` | boolean | ✅ | - |
| `placeholder` | string | ✅ | - |
| `loopFocus` | boolean | ✅ | - |
| `deselectable` | boolean | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `closeOnSelect` | boolean | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |
| `highlightedValue` | string | ❌ | Medium |
| `defaultHighlightedValue` | string | ❌ | Medium |
| `composite` | boolean | ❌ | Low |
| `form` | string | ❌ | Low |
| `autoComplete` | string | ❌ | Low |
| `scrollToIndexFn` | function | ❌ | Low |
| `onHighlightChange` | callback | ❌ | Medium |
| `onSelect` | callback | ❌ | Medium |
| `onPointerDownOutside` | callback | ❌ | Low |
| `onFocusOutside` | callback | ❌ | Low |
| `onInteractOutside` | callback | ❌ | Low |

**Coverage: 15/28 (54%)**

---

## Combobox

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `placeholder` | string | ✅ | - |
| `loopFocus` | boolean | ✅ | - |
| `allowCustomValue` | boolean | ✅ | - |
| `autoFocus` | boolean | ✅ | - |
| `openOnChange` | boolean | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `open` | boolean | ❌ | High |
| `defaultOpen` | boolean | ❌ | High |
| `positioning` | PositioningOptions | ❌ | High |
| `inputValue` | string | ❌ | Medium |
| `defaultInputValue` | string | ❌ | Medium |
| `inputBehavior` | enum | ❌ | Medium |
| `selectionBehavior` | enum | ❌ | Medium |
| `highlightedValue` | string | ❌ | Medium |
| `openOnClick` | boolean | ❌ | Medium |
| `openOnKeyPress` | boolean | ❌ | Low |
| `closeOnSelect` | boolean | ❌ | Medium |
| `multiple` | boolean | ❌ | Medium |
| `alwaysSubmitOnEnter` | boolean | ❌ | Low |
| `composite` | boolean | ❌ | Low |
| `disableLayer` | boolean | ❌ | Low |
| `navigate` | callback | ❌ | Low |
| `form` | string | ❌ | Low |

**Coverage: 12/29 (41%)**

---

## Menu

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `loopFocus` | boolean | ✅ | - |
| `closeOnSelect` | boolean | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |
| `typeahead` | boolean | ❌ | High |
| `highlightedValue` | string | ❌ | Medium |
| `defaultHighlightedValue` | string | ❌ | Medium |
| `open` | boolean | ❌ | Medium |
| `defaultOpen` | boolean | ❌ | Medium |
| `anchorPoint` | Point | ❌ | Low |
| `composite` | boolean | ❌ | Low |
| `navigate` | callback | ❌ | Low |
| `aria-label` | string | ❌ | Medium |
| `onHighlightChange` | callback | ❌ | Medium |
| `onSelect` | callback | ❌ | Medium |

**Coverage: 3/15 (20%)**

---

## Dialog

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `modal` | boolean | ✅ | - |
| `closeOnEscape` | boolean | ✅ | - |
| `closeOnInteractOutside` | boolean | ✅ | - |
| `preventScroll` | boolean | ✅ | - |
| `trapFocus` | boolean | ✅ | - |
| `restoreFocus` | boolean | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `role` | enum | ✅ | - |
| `initialFocusEl` | function | ❌ | Medium |
| `finalFocusEl` | function | ❌ | Medium |
| `aria-label` | string | ❌ | Medium |
| `onEscapeKeyDown` | callback | ❌ | Low |
| `onRequestDismiss` | callback | ❌ | Low |
| `persistentElements` | array | ❌ | Low |

**Coverage: 9/15 (60%)**

---

## Tooltip

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `openDelay` | number | ✅ | - |
| `closeDelay` | number | ✅ | - |
| `closeOnClick` | boolean | ✅ | - |
| `closeOnScroll` | boolean | ✅ | - |
| `interactive` | boolean | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `placement` | enum | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |
| `closeOnPointerDown` | boolean | ❌ | Medium |
| `closeOnEscape` | boolean | ❌ | Medium |
| `aria-label` | string | ❌ | Medium |

**Coverage: 9/13 (69%)**

---

## Popover

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `modal` | boolean | ✅ | - |
| `closeOnEscape` | boolean | ✅ | - |
| `closeOnInteractOutside` | boolean | ✅ | - |
| `autoFocus` | boolean | ✅ | - |
| `trapFocus` | boolean | ✅ | - |
| `restoreFocus` | boolean | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `placement` | enum | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |
| `portalled` | boolean | ❌ | Medium |
| `initialFocusEl` | function | ❌ | Medium |
| `onEscapeKeyDown` | callback | ❌ | Low |
| `onRequestDismiss` | callback | ❌ | Low |
| `persistentElements` | array | ❌ | Low |

**Coverage: 9/15 (60%)**

---

## Tabs

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `value` | string | ✅ | - |
| `defaultValue` | string | ✅ | - |
| `orientation` | enum | ✅ | - |
| `activationMode` | enum | ✅ | - |
| `loopFocus` | boolean | ✅ | - |
| `deselectable` | boolean | ✅ | - |
| `composite` | boolean | ❌ | Low |
| `navigate` | callback | ❌ | Low |
| `onFocusChange` | callback | ❌ | Medium |

**Coverage: 6/9 (67%)**

---

## Accordion

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `multiple` | boolean | ✅ | - |
| `collapsible` | boolean | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `disabled` | boolean | ✅ | - |
| `orientation` | enum | ✅ | - |
| `onFocusChange` | callback | ❌ | Medium |

**Coverage: 6/7 (86%)**

---

## Slider

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `min` | number | ✅ | - |
| `max` | number | ✅ | - |
| `step` | number | ✅ | - |
| `value` | number[] | ✅ | - |
| `defaultValue` | number[] | ✅ | - |
| `orientation` | enum | ✅ | - |
| `origin` | enum | ✅ | - |
| `minStepsBetweenThumbs` | number | ✅ | - |
| `thumbAlignment` | enum | ❌ | Low |
| `thumbSize` | object | ❌ | Low |
| `thumbCollisionBehavior` | enum | ❌ | Low |
| `aria-label` | string[] | ❌ | Medium |
| `aria-labelledby` | string[] | ❌ | Low |
| `form` | string | ❌ | Low |
| `getAriaValueText` | function | ❌ | Low |
| `onValueChangeEnd` | callback | ❌ | Medium |
| `onFocusChange` | callback | ❌ | Low |

**Coverage: 12/21 (57%)**

---

## Checkbox

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `checked` | CheckedState | ✅ | - |
| `defaultChecked` | CheckedState | ✅ | - |
| `value` | string | ✅ | - |
| `indeterminate` | boolean | ✅ | - |
| `form` | string | ❌ | Low |

**Coverage: 9/10 (90%)**

---

## Switch

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `checked` | boolean | ✅ | - |
| `defaultChecked` | boolean | ✅ | - |
| `value` | string/number | ❌ | Low |
| `label` | string | ❌ | Medium |
| `form` | string | ❌ | Low |

**Coverage: 7/10 (70%)**

---

## RadioGroup

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `value` | string | ✅ | - |
| `defaultValue` | string | ✅ | - |
| `orientation` | enum | ✅ | - |
| `form` | string | ❌ | Low |

**Coverage: 8/9 (89%)**

---

## NumberInput

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `min` | number | ✅ | - |
| `max` | number | ✅ | - |
| `step` | number | ✅ | - |
| `value` | string | ✅ | - |
| `defaultValue` | string | ✅ | - |
| `allowMouseWheel` | boolean | ✅ | - |
| `clampValueOnBlur` | boolean | ✅ | - |
| `pattern` | string | ❌ | Low |
| `allowOverflow` | boolean | ❌ | Medium |
| `focusInputOnChange` | boolean | ❌ | Low |
| `formatOptions` | Intl options | ❌ | Medium |
| `inputMode` | InputMode | ❌ | Low |
| `spinOnPress` | boolean | ❌ | Low |
| `locale` | string | ❌ | Low |
| `form` | string | ❌ | Low |
| `onValueInvalid` | callback | ❌ | Medium |
| `onFocusChange` | callback | ❌ | Low |
| `onValueCommit` | callback | ❌ | Low |

**Coverage: 12/23 (52%)**

---

## PinInput

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `placeholder` | string | ✅ | - |
| `mask` | boolean | ✅ | - |
| `otp` | boolean | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `type` | enum | ❌ | Medium |
| `count` | number | ❌ | High |
| `autoFocus` | boolean | ❌ | Medium |
| `blurOnComplete` | boolean | ❌ | Low |
| `selectOnFocus` | boolean | ❌ | Low |
| `pattern` | string | ❌ | Low |
| `form` | string | ❌ | Low |
| `onValueComplete` | callback | ❌ | Medium |
| `onValueInvalid` | callback | ❌ | Low |

**Coverage: 10/19 (53%)**

---

## TagsInput

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `addOnPaste` | boolean | ✅ | - |
| `allowDuplicates` | boolean | ✅ | - |
| `max` | number | ✅ | - |
| `placeholder` | string | ❌ | High |
| `editable` | boolean | ❌ | Medium |
| `blurBehavior` | enum | ❌ | Medium |
| `delimiter` | string/RegExp | ❌ | Medium |
| `maxLength` | number | ❌ | Low |
| `autoFocus` | boolean | ❌ | Low |
| `inputValue` | string | ❌ | Low |
| `allowOverflow` | boolean | ❌ | Low |
| `validate` | function | ❌ | Low |
| `form` | string | ❌ | Low |
| `onHighlightChange` | callback | ❌ | Low |
| `onValueInvalid` | callback | ❌ | Low |
| `onInputValueChange` | callback | ❌ | Low |

**Coverage: 10/23 (43%)**

---

## Editable

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `value` | string | ✅ | - |
| `defaultValue` | string | ✅ | - |
| `placeholder` | string | ✅ | - |
| `selectOnFocus` | boolean | ✅ | - |
| `submitMode` | enum | ✅ | - |
| `activationMode` | enum | ❌ | High |
| `autoResize` | boolean | ❌ | Medium |
| `maxLength` | number | ❌ | Low |
| `edit` | boolean | ❌ | Medium |
| `defaultEdit` | boolean | ❌ | Medium |
| `finalFocusEl` | function | ❌ | Low |
| `form` | string | ❌ | Low |
| `onEditChange` | callback | ❌ | Medium |
| `onValueRevert` | callback | ❌ | Low |
| `onValueCommit` | callback | ❌ | Low |

**Coverage: 10/20 (50%)**

---

## RatingGroup

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `count` | number | ✅ | - |
| `value` | number | ✅ | - |
| `defaultValue` | number | ✅ | - |
| `allowHalf` | boolean | ✅ | - |
| `autoFocus` | boolean | ❌ | Low |
| `form` | string | ❌ | Low |
| `onHoverChange` | callback | ❌ | Low |

**Coverage: 9/12 (75%)**

---

## ToggleGroup

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `value` | string[] | ✅ | - |
| `defaultValue` | string[] | ✅ | - |
| `loopFocus` | boolean | ✅ | - |
| `orientation` | enum | ✅ | - |
| `multiple` | boolean | ✅ | - |
| `deselectable` | boolean | ❌ | Medium |
| `rovingFocus` | boolean | ❌ | Low |

**Coverage: 6/8 (75%)**

---

## DatePicker

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `readOnly` | boolean | ✅ | - |
| `invalid` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `name` | string | ✅ | - |
| `value` | DateValue[] | ✅ | - |
| `defaultValue` | DateValue[] | ✅ | - |
| `selectionMode` | enum | ✅ | - |
| `fixedWeeks` | boolean | ✅ | - |
| `closeOnSelect` | boolean | ✅ | - |
| `startOfWeek` | number | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |
| `locale` | string | ❌ | Medium |
| `timeZone` | string | ❌ | Medium |
| `min` | DateValue | ❌ | Medium |
| `max` | DateValue | ❌ | Medium |
| `numOfMonths` | number | ❌ | Low |
| `showWeekNumbers` | boolean | ❌ | Low |
| `outsideDaySelectable` | boolean | ❌ | Low |
| `focusedValue` | DateValue | ❌ | Low |
| `view` | DateView | ❌ | Low |
| `minView` | DateView | ❌ | Low |
| `maxView` | DateView | ❌ | Low |
| `inline` | boolean | ❌ | Low |
| `maxSelectedDates` | number | ❌ | Low |
| `format` | function | ❌ | Medium |
| `parse` | function | ❌ | Low |
| `isDateUnavailable` | function | ❌ | Low |
| `createCalendar` | function | ❌ | Low |
| `placeholder` | string | ❌ | Medium |
| `form` | string | ❌ | Low |

**Coverage: 11/31 (35%)**

---

## FileUpload

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `required` | boolean | ✅ | - |
| `maxFiles` | number | ✅ | - |
| `allowDrop` | boolean | ✅ | - |
| `directory` | boolean | ✅ | - |
| `multiple` | boolean | ✅ | - |
| `name` | string | ❌ | Medium |
| `accept` | object | ❌ | High |
| `maxFileSize` | number | ❌ | High |
| `minFileSize` | number | ❌ | Low |
| `invalid` | boolean | ❌ | Medium |
| `readOnly` | boolean | ❌ | Low |
| `preventDocumentDrop` | boolean | ❌ | Low |
| `validate` | function | ❌ | Low |
| `capture` | enum | ❌ | Low |
| `transformFiles` | function | ❌ | Low |
| `locale` | string | ❌ | Low |
| `onFileAccept` | callback | ❌ | Low |
| `onFileReject` | callback | ❌ | Medium |

**Coverage: 6/19 (32%)**

---

## Carousel

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `loop` | boolean | ✅ | - |
| `orientation` | enum | ✅ | - |
| `slidesPerView` | number | ✅ (als slidesPerPage) | - |
| `autoplay` | boolean/object | ✅ | - |
| `page` | number | ❌ | Medium |
| `defaultPage` | number | ❌ | Medium |
| `slidesPerMove` | number/auto | ❌ | Medium |
| `spacing` | string | ❌ | Medium |
| `padding` | string | ❌ | Low |
| `allowMouseDrag` | boolean | ❌ | Medium |
| `autoSize` | boolean | ❌ | Low |
| `inViewThreshold` | number | ❌ | Low |
| `snapType` | enum | ❌ | Low |
| `slideCount` | number | ❌ | Low |
| `onDragStatusChange` | callback | ❌ | Low |
| `onAutoplayStatusChange` | callback | ❌ | Low |

**Coverage: 4/16 (25%)**

---

## Collapsible

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `collapsedHeight` | string/number | ❌ | Low |
| `collapsedWidth` | string/number | ❌ | Low |
| `onExitComplete` | callback | ❌ | Low |

**Coverage: 3/6 (50%)**

---

## HoverCard

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `disabled` | boolean | ✅ | - |
| `open` | boolean | ✅ | - |
| `defaultOpen` | boolean | ✅ | - |
| `openDelay` | number | ✅ | - |
| `closeDelay` | number | ✅ | - |
| `placement` | enum | ✅ | - |
| `positioning` | PositioningOptions | ❌ | High |

**Coverage: 6/7 (86%)**

---

## Toast

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `duration` | number | ✅ | - |
| `placement` | enum | ✅ | - |
| `overlap` | boolean | ❌ | Low |
| `gap` | number | ❌ | Low |
| `offsets` | string | ❌ | Low |
| `max` | number | ❌ | Medium |
| `pauseOnPageIdle` | boolean | ❌ | Low |
| `hotkey` | string[] | ❌ | Low |

**Coverage: 2/8 (25%)**

---

## Progress

| Zag Prop | Typ | Mirror | Priorität |
|----------|-----|--------|-----------|
| `value` | number | ✅ | - |
| `min` | number | ✅ | - |
| `max` | number | ✅ | - |
| `orientation` | enum | ❌ | Low |
| `translations` | object | ❌ | Low |

**Coverage: 3/5 (60%)**

---

## Gesamtübersicht

| Komponente | Coverage | Status |
|------------|----------|--------|
| Checkbox | 90% | 🟢 Gut |
| RadioGroup | 89% | 🟢 Gut |
| Accordion | 86% | 🟢 Gut |
| HoverCard | 86% | 🟢 Gut |
| ToggleGroup | 75% | 🟡 OK |
| RatingGroup | 75% | 🟡 OK |
| Switch | 70% | 🟡 OK |
| Tooltip | 69% | 🟡 OK |
| Tabs | 67% | 🟡 OK |
| Dialog | 60% | 🟡 OK |
| Popover | 60% | 🟡 OK |
| Progress | 60% | 🟡 OK |
| Slider | 57% | 🟡 OK |
| Select | 54% | 🟠 Mittel |
| PinInput | 53% | 🟠 Mittel |
| NumberInput | 52% | 🟠 Mittel |
| Editable | 50% | 🟠 Mittel |
| Collapsible | 50% | 🟠 Mittel |
| TagsInput | 43% | 🟠 Mittel |
| Combobox | 41% | 🔴 Niedrig |
| DatePicker | 35% | 🔴 Niedrig |
| FileUpload | 32% | 🔴 Niedrig |
| Carousel | 25% | 🔴 Niedrig |
| Toast | 25% | 🔴 Niedrig |
| Menu | 20% | 🔴 Niedrig |

---

## High Priority Props (sollten implementiert werden)

### 1. `positioning` (Overlays)
Betrifft: Select, Combobox, Menu, Tooltip, Popover, HoverCard, DatePicker

```typescript
positioning: {
  placement: 'bottom-start',
  offset: { mainAxis: 4 },
  flip: true,
  slide: true
}
```

### 2. `typeahead` (Listen)
Betrifft: Menu, Select, Combobox, Listbox

### 3. `count` (PinInput)
Anzahl der Input-Felder

### 4. `accept`, `maxFileSize` (FileUpload)
Dateityp-Filter und Größenlimit

### 5. `activationMode` (Editable)
Wie Editable aktiviert wird (click, dblclick, focus)

### 6. `placeholder` (TagsInput)
Platzhalter-Text

---

## Nächste Schritte

1. [ ] High Priority Props implementieren
2. [ ] Medium Priority Props implementieren
3. [ ] Tests für neue Props
4. [ ] Dokumentation aktualisieren
