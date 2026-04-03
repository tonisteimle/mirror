# Domain Model Stress Testing

## Übersicht

Die Stress-Tests in `tests/integration/domain-model-stress.test.ts` testen das Domain Model aggressiv mit Edge Cases, Grenzfällen, fehlerhaften Eingaben und Feature-Kombinationen.

## Gefundene Bugs (3)

### 1. String Escaping Bug (KRITISCH)
**Datei:** `compiler/backends/dom.ts`
**Problem:** Strings mit einfachen Anführungszeichen werden nicht escaped
**Beispiel:**
```mirror
$text: "Hello <script>alert('xss')</script>"
```
**Generierter Code:**
```javascript
_runtime.registerToken('$text', 'Hello <script>alert('xss')</script>')
                                                    ^ SyntaxError
```
**Fix:** Escape `'` zu `\'` bei String-Serialisierung

### 2. Loop Variable in Expression Bug
**Datei:** `compiler/backends/dom.ts`
**Problem:** Loop-Variable in Text-Expression wird falsch transformiert
**Beispiel:**
```mirror
each team in $teams
  Text team.name + " (" + team.members.length + ")"
```
**Generierter Code:**
```javascript
node.textContent = team.name + " (" + __loopVar:team.members.length + ")"
                                                ^ Unexpected token ':'
```
**Fix:** Loop-Variable-Replacement muss korrekt behandelt werden

### 3. Nested Property in Aggregation
**Datei:** `compiler/backends/dom.ts`
**Problem:** Verschachtelte Pfade in Aggregations-Argumenten funktionieren nicht
**Beispiel:**
```mirror
Text $items.sum(data.stats.value)
```
**Erwartet:** Sum über verschachtelte Properties
**Aktuell:** undefined

**Fix:** `$agg.sum()` muss Pfade wie `data.stats.value` traversieren können

---

## Testabdeckung

### Phase 1: References (13 Tests)

| Test | Beschreibung |
|------|--------------|
| Non-existent entry | Referenz auf fehlenden Eintrag |
| Deeply nested (5 levels) | Tiefe Referenz-Ketten |
| Self-referencing | Eintrag referenziert sich selbst |
| Circular references | Zwei Einträge referenzieren sich gegenseitig |
| Empty reference | Leere Referenzwerte |
| Numbers in names | Zahlen in Entry-Namen |
| Many references (10+) | Viele Referenzen in einem Eintrag |
| Large reference array (20) | Array mit 20 Referenzen |
| Duplicates in array | Duplikate in Referenz-Arrays |

### Phase 2: Inline Queries (13 Tests)

| Test | Beschreibung |
|------|--------------|
| Deeply nested property | `item.user.profile.settings.active` |
| String comparison | `where status == "pending"` |
| Numeric operators | `where value >= 5` |
| Not equals | `where type != "hidden"` |
| Empty result | Where-Klausel ohne Treffer |
| Empty source | Query auf leerem Array |
| Descending strings | `by name desc` |
| Explicit ascending | `by priority asc` |
| Missing field | Sort auf nicht-existierendem Feld |
| Null/undefined values | Sort mit null/undefined |
| Combined where+by | Filter + Sort zusammen |
| Filter to empty | Where filtert alles, dann by |

### Phase 3: Aggregations (17 Tests)

| Test | Beschreibung |
|------|--------------|
| Undefined collection | `$nonexistent.count` |
| Mixed types in sum | Zahlen + Strings |
| Null/undefined in sum | Null-Werte überspringen |
| Avg single item | Durchschnitt mit einem Element |
| Avg empty array | Leeres Array → 0 (nicht NaN) |
| Min/max negative | Negative Zahlen |
| First/last single | Array mit einem Element |
| First/last empty | Leeres Array |
| Chained access | `$users.first.address.city` |
| Large array (1000) | Performance-Test |
| Multiple aggregations | Mehrere in einer Expression |
| Different collections | Aggregationen auf verschiedenen Collections |

### Phase 4: Collection Methods (4 Tests)

| Test | Beschreibung |
|------|--------------|
| No parameters | `function items.GetAll()` |
| Many parameters (6) | Viele Parameter |
| Multiple methods | 3 Methoden in einer Datei |
| Multiline body | Mehrzeiliger Funktionskörper |

### Phase 5: Query Files (5 Tests)

| Test | Beschreibung |
|------|--------------|
| Many fields (10+) | Query mit 10 Feldern |
| Deeply nested source | `$root.level1.level2.items` |
| Computed expressions | Ternary, Vergleiche |
| Multiple queries | 3 Queries mit where/by |
| Optional chaining | Serialisierung mit `?.` |

### Phase 6: Two-Way Binding (7 Tests)

| Test | Beschreibung |
|------|--------------|
| Rapid updates | 10 schnelle Änderungen |
| Multiple bound inputs | 2 Inputs gleichzeitig ändern |
| Deep path (4 levels) | `$data.user.profile.settings.theme` |
| Multiple nested paths | Verschiedene verschachtelte Pfade |
| Empty initial value | Leerer Startwert |
| Unicode | `"Hello 世界 🌍"` |

### Combined Features (3 Tests)

| Test | Beschreibung |
|------|--------------|
| Aggregation + where | Count + gefilterte each |
| Data file + query | Referenzen + Query zusammen |
| Binding + aggregation | Input + count in einer View |

### Error Handling (4 Tests)

| Test | Beschreibung |
|------|--------------|
| Malformed paths | `$`, `$.invalid` |
| Name conflicts | Entry mit Aggregations-Namen |
| Long token names | 100 Zeichen |
| Special characters | Escape-Sequenzen |

---

## Empfehlungen

### Sofort beheben (Kritisch)
1. **String Escaping** - Sicherheitslücke und Runtime-Fehler

### Demnächst beheben
2. **Loop Variable Bug** - Verhindert komplexe Expressions in each
3. **Nested Aggregation Paths** - Einschränkung bei verschachtelten Daten

### Design-Entscheidungen
- Entry-Namen sollten keine Aggregations-Methoden-Namen verwenden (`count`, `sum`, `avg`, `min`, `max`, `first`, `last`)
- Dokumentieren: Data-Files mit Named Entries sind Objects, nicht Arrays

---

## Ausführung

```bash
# Alle Stress-Tests
npm test -- tests/integration/domain-model-stress.test.ts

# Mit Verbose Output
npm test -- tests/integration/domain-model-stress.test.ts --reporter=verbose

# Zusammen mit normalen Tests
npm test -- tests/integration/domain-model
```
