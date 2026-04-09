# Review: Kapitel 08 Functions

## Status
Datum: 2026-04-09

## Inhalt des Kapitels
- Syntax: Funktionen als Properties
- Eingebaute Funktionen: `toggle()`, `exclusive()`, `show()`, `hide()`
- Funktionen kombinieren
- Eigene Funktionen mit `.state`, `.visible`, `.value`, `.content`

## Probleme

### 1. Falscher Script-Pfad
**Zeile 324:**
```html
<script src="../../dist/browser/index.global.js"></script>
```
**Sollte sein:**
```html
<script src="../../studio/dist/browser/index.global.js"></script>
```

### 2. Keine interaktiven Beispiele für eigene Funktionen
Die Sektion "Eigene Funktionen: UI steuern" zeigt nur statische Code-Blöcke (`.code-block`), keine Playgrounds. Der Leser kann nicht ausprobieren:
- `function absenden()` mit Input-Wert lesen
- `MeinButton.state = 'active'` setzen
- `Ergebnis.content = "..."` ändern

**Frage:** Sind eigene Funktionen überhaupt implementiert? Falls ja, sollte mindestens ein interaktives Beispiel zeigen, dass es funktioniert.

### 3. Fehlende Funktion `navigate()`
In `12-navigation.html` wird `navigate(ViewName)` verwendet:
```
NavItem "Dashboard", icon "home", value "dashboard", navigate(DashboardView)
```
Diese Funktion fehlt in der Übersicht der eingebauten Funktionen in Kapitel 08.

### 4. Unklare Syntax für eigene Funktionen
Die gezeigte Syntax:
```
function absenden()
  wert = EmailInput.value
  Hinweis.content = "Gesendet: " + wert
```
Verwendet Einrückung statt Klammern. Ist das die tatsächliche Mirror-Syntax oder nur Pseudocode?

## Empfehlungen

1. Script-Pfad korrigieren
2. Mindestens ein interaktives Playground-Beispiel für eigene Funktionen hinzufügen
3. `navigate()` in die Funktions-Übersicht aufnehmen
4. Klären ob eigene Funktionen implementiert sind – falls nicht, Kapitel als "Coming Soon" markieren oder Inhalt anpassen

---

## Funktionen-Übersicht

### Bereits implementiert (Runtime)

#### State & Sichtbarkeit
- `toggle()` – State wechseln
- `exclusive()` – Nur einer aktiv
- `show(Element)` – Element zeigen
- `hide(Element)` – Element verstecken
- `navigate(View)` – Views wechseln

#### Feedback & Bestätigung (NEU implementiert 2026-04-09)
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `toast("Text")` | `toast("Gespeichert!", "success")` | Toast-Benachrichtigung mit Type (info/success/error/warning) und Position |
| `shake(Element)` | `shake(InputField)` | Schüttel-Animation für Fehler-Feedback |
| `pulse(Element)` | `pulse(SaveBtn)` | Puls-Animation für Aufmerksamkeit |

#### Formular
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `copy("Text")` | `copy("Code hier")` | In Zwischenablage kopieren |
| `reset(token)` | `reset(counter)` | Token auf Initialwert zurücksetzen |
| `focus(Element)` | `focus(NameInput)` | Fokus auf Element setzen |

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

#### Timer (NEU implementiert 2026-04-09)
| Funktion | Beispiel | Beschreibung |
|----------|----------|--------------|
| `delay(ms, fn)` | `delay(500, doSomething)` | Verzögert ausführen |
| `debounce(ms, fn)` | `debounce(300, search)` | Entprellen |

#### Browser-Navigation (NEU implementiert 2026-04-09)
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
