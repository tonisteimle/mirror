# Layout Test-Lücken

Systematische Analyse der fehlenden Layout-Tests.

> **Status:** Tests wurden implementiert ✅
>
> Vorher: 174 Tests
> Nachher: 201 Tests (+27)

---

## Behobene Lücken ✅

### 1. Default-Richtung (column) jetzt verifiziert

```typescript
'Frame gap 12': {
  'display': 'flex',
  'flex-direction': 'column',  // ← NEU
  'gap': '12px',
}
```

### 2. VER-Kombinationen (parallel zu HOR)

| Code | Status |
|------|--------|
| `Frame ver, gap 12` | ✅ |
| `Frame ver, gap 12, pad 16` | ✅ |
| `Frame ver, center` | ✅ |
| `Frame ver, center, gap 12` | ✅ |
| `Frame ver, spread, gap 12` | ✅ |
| `Frame ver, wrap` | ✅ |

### 3. Default + Alignment + Gap

| Code | Status |
|------|--------|
| `Frame center, gap 12` | ✅ (mit flex-direction: column) |
| `Frame spread, gap 12` | ✅ |
| `Frame wrap, gap 12` | ✅ |
| `Frame hor, wrap, gap 12` | ✅ |

### 4. Scroll & Overflow

| Code | Status |
|------|--------|
| `Frame scroll` | ✅ |
| `Frame scroll-hor` | ✅ |
| `Frame scroll-both` | ✅ |
| `Frame scroll, h 200` | ✅ |
| `Frame hor, scroll-hor` | ✅ |
| `Frame ver, scroll, gap 12` | ✅ |
| `Frame clip` | ✅ |
| `Frame clip, rad 12` | ✅ |

### 5. Position

| Code | Status |
|------|--------|
| `Frame absolute` | ✅ |
| `Frame relative` | ✅ |
| `Frame fixed` | ✅ |
| `Frame absolute, x 10, y 20` | ✅ |
| `Frame absolute, w full` | ✅ |
| `Frame fixed, w full, h 60` | ✅ |
| `Frame z 10` | ✅ |
| `Frame absolute, z 100` | ✅ |

### 6. Sizing (min/max)

| Code | Status |
|------|--------|
| `Frame minw 100` | ✅ |
| `Frame maxw 500` | ✅ |
| `Frame minh 50` | ✅ |
| `Frame maxh 300` | ✅ |
| `Frame minw 100, maxw 500` | ✅ |
| `Frame hor, maxw 800, gap 16` | ✅ |
| `Frame ver, minh 400, scroll` | ✅ |

### 7. Visibility

| Code | Status |
|------|--------|
| `Frame hidden` | ✅ |
| `Frame opacity 0.5` | ✅ |
| `Frame opacity 0` | ✅ |

---

## Verbleibende Lücken (optional)

Diese wurden nicht implementiert, da sie weniger kritisch sind:

### Positionen + Kontext

| Code | Status |
|------|--------|
| `Frame hor, tl` | ❌ |
| `Frame ver, br` | ❌ |
| `Frame tl, gap 12` | ❌ |

### Aspect Ratio

| Code | Status |
|------|--------|
| `Frame aspect square` | ❌ |
| `Frame aspect video` | ❌ |

### Stacked Kombinationen

| Code | Status |
|------|--------|
| `Frame stacked, center` | ❌ |
| `Frame stacked, tl` | ❌ |

---

## Zusammenfassung

| Kategorie | Vorher | Nachher |
|-----------|--------|---------|
| ver-Kombinationen | 4 | 10 ✅ |
| Default + flex-direction | 0 | 8 ✅ |
| scroll | 0 | 9 ✅ |
| position | 0 | 8 ✅ |
| min/max sizing | 0 | 7 ✅ |
| visibility | 0 | 3 ✅ |
| **Total** | **174** | **201** |
