# Realistische AI-Testfälle

Teste wie gut Claude mit dem System Prompt echte UI-Anfragen umsetzt.

---

## Test 1: Sidebar-Navigation

**Prompt:**
> Baue mir eine Seiten-Navigation bestehend aus Gruppen und Navigationseinträgen mit Icons und Text als Liste zu der Gruppe

**Erwartung:**
- Verschachtelte Struktur (Gruppen → Einträge)
- Icons mit korrekter Syntax (`Icon "name", ic, is`)
- Hover-States für Interaktivität
- Saubere Hierarchie durch Einrückung

---

## Test 2: Login-Formular

**Prompt:**
> Erstelle ein dunkles Login-Formular mit E-Mail und Passwort Feldern, einem "Anmelden" Button und einem "Passwort vergessen?" Link

**Erwartung:**
- Labels für die Felder
- Input mit type email/password
- Button mit Styling
- Link-Element für "Passwort vergessen"
- Dunkles Theme (bg #1a1a1a o.ä.)

---

## Test 3: Interaktive Card-Liste

**Prompt:**
> Erstelle drei Projekt-Cards die man anklicken kann. Die angeklickte Card soll hervorgehoben sein, die anderen nicht. Jede Card hat einen Titel, Beschreibung und ein Status-Badge.

**Erwartung:**
- Card-Komponente mit Slots oder Struktur
- `onclick: exclusive()` für Einzelauswahl
- `active:` oder `selected:` State mit anderem Styling
- Badge-Element für Status
