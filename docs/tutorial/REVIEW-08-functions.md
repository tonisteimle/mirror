# Review: Kapitel 08 Functions

## Status
Datum: 2026-04-09
Aktualisiert: 2026-04-09

## Inhalt des Kapitels
- Syntax: Funktionen als Properties
- Eingebaute Funktionen: `toggle()`, `exclusive()`, `show()`, `hide()`
- Input Control: `focus()`, `clear()`, `setError()`, `clearError()`
- Zähler: `increment()`, `decrement()`, `set()`, `reset()`
- Feedback: `toast()`
- Scroll: `scrollTo()`, `scrollToTop()`, `scrollToBottom()`
- Clipboard: `copy()`
- Navigation: `navigate()`, `back()`, `forward()`, `openUrl()`
- Funktionen kombinieren
- Eigene Funktionen mit `.state`, `.visible`, `.value`, `.content`

## Erledigte Korrekturen

### 1. Script-Pfad ✅
Korrigiert zu `../../studio/dist/browser/index.global.js`

### 2. shake() und pulse() entfernt ✅
Diese Funktionen wurden entfernt. Animationen sind jetzt rein deklarativ über `anim shake` / `anim pulse` auf States (siehe Kapitel 07 Animationen).

### 3. Input Control Funktionen hinzugefügt ✅
Neue Funktionen für Formular-Handling:
- `focus(Element)` – Fokus setzen
- `blur(Element)` – Fokus entfernen
- `clear(Element)` – Eingabe löschen
- `selectText(Element)` – Text markieren
- `setError(Element, "msg")` – Fehler-State + Nachricht
- `clearError(Element)` – Fehler-State entfernen

### 4. navigate() dokumentiert ✅
In der Funktions-Übersicht aufgenommen.

---

## Funktionen-Übersicht (Aktuell)

### Bereits implementiert (Runtime)

#### State & Sichtbarkeit
- `toggle()` – State wechseln
- `exclusive()` – Nur einer aktiv
- `show(Element)` – Element zeigen
- `hide(Element)` – Element verstecken
- `navigate(View)` – Views wechseln

#### Feedback
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `toast("Text")` | `toast("Gespeichert!", "success")` | Toast-Benachrichtigung mit Type (info/success/error/warning) und Position |

#### Input Control (NEU 2026-04-09)
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `focus(Element)` | `focus(EmailInput)` | Fokus auf Element setzen |
| `blur(Element)` | `blur(EmailInput)` | Fokus entfernen |
| `clear(Element)` | `clear(SearchInput)` | Eingabewert löschen |
| `selectText(Element)` | `selectText(CodeInput)` | Text im Feld markieren |
| `setError(Element, "msg")` | `setError(EmailInput, "Ungültig")` | Fehler-State + Nachricht setzen |
| `clearError(Element)` | `clearError(EmailInput)` | Fehler-State entfernen |

#### Formular
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `copy("Text")` | `copy("Code hier")` | In Zwischenablage kopieren |
| `reset(token)` | `reset(counter)` | Token auf Initialwert zurücksetzen |

#### Scroll
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `scrollTo(Element)` | `scrollTo(Section)` | Zu Element scrollen |
| `scrollToTop()` | `scrollToTop()` | Zum Seitenanfang |
| `scrollToBottom()` | `scrollToBottom()` | Zum Seitenende |

#### Zähler & Werte
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `increment(token)` | `increment(count)` | Token +1 |
| `decrement(token)` | `decrement(count)` | Token -1 |
| `set(token, value)` | `set(count, 5)` | Token auf Wert setzen |
| `get(token)` | `get(count)` | Token-Wert lesen |

#### Timer
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `delay(ms, fn)` | `delay(500, doSomething)` | Verzögert ausführen |
| `debounce(ms, fn)` | `debounce(300, search)` | Entprellen |

#### Browser-Navigation
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `back()` | `back()` | Browser zurück |
| `forward()` | `forward()` | Browser vorwärts |
| `openUrl("...")` | `openUrl("https://example.com")` | URL öffnen (neuer Tab) |

---

### Noch nicht implementiert (Backlog)

| Funktion | Beispiel | Nutzen |
|----------|----------|--------|
| `confetti()` | Konfetti-Animation | Erfolgs-Moment |
| `add(list, item)` | Item hinzufügen | Tags, Todo-Liste |
| `remove(list, item)` | Item entfernen | Löschen |
