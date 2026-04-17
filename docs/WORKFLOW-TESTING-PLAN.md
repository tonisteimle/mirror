# Workflow Testing Plan

Dieses Dokument beschreibt die End-to-End Workflow-Tests für Mirror Studio.

## Übersicht

Die Workflow-Tests decken drei Hauptszenarien ab:

| Szenario                       | Beschreibung                                | Tests     |
| ------------------------------ | ------------------------------------------- | --------- |
| **1. Projekt mit Code**        | Manueller Coding-Workflow                   | ~12 Tests |
| **2. Projekt mit Drag & Drop** | Visueller Building-Workflow                 | ~12 Tests |
| **3. Applikation**             | Multi-Screen Apps mit Daten & Interaktionen | ~12 Tests |

---

## 1. Projekt mit Code

### Ziel

Testen des manuellen Coding-Workflows: Dateien anlegen, Tokens definieren, Komponenten erstellen, komplexe Layouts bauen.

### Testfälle

#### 1.1 File Management

| Test                  | Status | Beschreibung              |
| --------------------- | ------ | ------------------------- |
| Create token file     | ⬜     | Neue `.tok` Datei anlegen |
| Create component file | ⬜     | Neue `.com` Datei anlegen |
| Delete default files  | ⬜     | Standard-Dateien löschen  |
| Create layout file    | ⬜     | Neue `.mir` Datei anlegen |

#### 1.2 Token Definition & Usage

| Test                    | Status | Beschreibung                           |
| ----------------------- | ------ | -------------------------------------- |
| Define color tokens     | ⬜     | `primary.bg: #2271C1` definieren       |
| Define spacing tokens   | ⬜     | `space.pad: 16` definieren             |
| Token in Property Panel | ⬜     | Token wird im Property Panel angezeigt |
| Token in Color Picker   | ⬜     | Token erscheint im Color Picker        |
| Token in Autocomplete   | ⬜     | `$token` wird vorgeschlagen            |

#### 1.3 Component Definition & Usage

| Test                      | Status | Beschreibung                        |
| ------------------------- | ------ | ----------------------------------- |
| Define component          | ⬜     | `Btn: pad 12 24, rad 6, bg #2271C1` |
| Use component             | ⬜     | `Btn "Click"` verwenden             |
| Component with slots      | ⬜     | `Card:` mit `Title:`, `Desc:`       |
| Component inheritance     | ⬜     | `PrimaryBtn as Button:`             |
| Component in Autocomplete | ⬜     | Komponente wird vorgeschlagen       |

#### 1.4 Icon Picker

| Test             | Status | Beschreibung                     |
| ---------------- | ------ | -------------------------------- |
| Open Icon Picker | ⬜     | Picker öffnet sich               |
| Search icons     | ⬜     | Icons filtern                    |
| Select icon      | ⬜     | Icon wird eingefügt              |
| Icon in code     | ⬜     | `Icon "check"` erscheint im Code |

#### 1.5 Complex Layout

| Test                      | Status | Beschreibung                  |
| ------------------------- | ------ | ----------------------------- |
| Build dashboard layout    | ⬜     | Tokens + Components + Layout  |
| Preview renders correctly | ⬜     | Layout wird korrekt angezeigt |
| Bidirectional sync        | ⬜     | Code ↔ Preview synchronisiert |

---

## 2. Projekt mit Drag & Drop

### Ziel

Testen des visuellen Building-Workflows: UI per Drag & Drop zusammenbauen, über Property Panel stylen.

### Testfälle

#### 2.1 Basic UI Building

| Test         | Status | Beschreibung                       |
| ------------ | ------ | ---------------------------------- |
| Build header | ⬜     | Icon + Text + Spacer + Button      |
| Build card   | ⬜     | Frame + Image + Text + Button      |
| Build form   | ⬜     | Labels + Input + Textarea + Button |
| Build list   | ⬜     | Multiple Frames mit Content        |

#### 2.2 Property Panel Styling

| Test             | Status | Beschreibung                    |
| ---------------- | ------ | ------------------------------- |
| Set background   | ⬜     | `bg` über Property Panel        |
| Set padding      | ⬜     | `pad` über Property Panel       |
| Set radius       | ⬜     | `rad` über Property Panel       |
| Set gap          | ⬜     | `gap` über Property Panel       |
| Set color        | ⬜     | `col` über Property Panel       |
| Use Color Picker | ⬜     | Farbe via Picker wählen         |
| Use Token Button | ⬜     | Token via Button-Click anwenden |

#### 2.3 Zag Components

| Test          | Status | Beschreibung              |
| ------------- | ------ | ------------------------- |
| Drop Checkbox | ⬜     | Checkbox per D&D einfügen |
| Drop Switch   | ⬜     | Switch per D&D einfügen   |
| Drop Slider   | ⬜     | Slider per D&D einfügen   |
| Drop Select   | ⬜     | Select per D&D einfügen   |

#### 2.4 Complete Workflow

| Test                  | Status | Beschreibung                       |
| --------------------- | ------ | ---------------------------------- |
| Build and style card  | ⬜     | Frame erstellen + stylen + Content |
| Build settings panel  | ⬜     | Switches + Checkboxes + Button     |
| Preview updates       | ⬜     | Preview aktualisiert nach Drop     |
| Code reflects changes | ⬜     | Code zeigt alle Änderungen         |

---

## 3. Applikation

### Ziel

Testen von komplexeren Anwendungen: Multi-Screen, Navigation, Daten, Interaktionen.

### Testfälle

#### 3.1 Multi-Screen Navigation

| Test                 | Status | Beschreibung              |
| -------------------- | ------ | ------------------------- |
| View navigation      | ⬜     | `navigate(ViewName)`      |
| Tab-based navigation | ⬜     | `Tabs` mit mehreren `Tab` |
| Back navigation      | ⬜     | `back()` Funktion         |

#### 3.2 Data Binding

| Test            | Status | Beschreibung                   |
| --------------- | ------ | ------------------------------ |
| Object data     | ⬜     | `user: name: "John"`           |
| Collection data | ⬜     | `users: u1: ...`               |
| Data reference  | ⬜     | `$user.name`                   |
| Each iteration  | ⬜     | `each item in $list`           |
| Aggregation     | ⬜     | `$users.count`, `$users.first` |

#### 3.3 Table with Data

| Test              | Status | Beschreibung                 |
| ----------------- | ------ | ---------------------------- |
| Static table      | ⬜     | `Table` mit `Header` + `Row` |
| Data-driven table | ⬜     | `Table $data`                |
| Table filter      | ⬜     | `where row.status != "done"` |
| Table sort        | ⬜     | `by priority`                |

#### 3.4 Interactive States

| Test                | Status | Beschreibung                 |
| ------------------- | ------ | ---------------------------- |
| Toggle state        | ⬜     | `toggle()`                   |
| Exclusive state     | ⬜     | `exclusive()`                |
| Cross-element state | ⬜     | `Button.open:`               |
| Counter             | ⬜     | `increment()`, `decrement()` |

#### 3.5 Form Interactions

| Test            | Status | Beschreibung                 |
| --------------- | ------ | ---------------------------- |
| Input binding   | ⬜     | `bind variableName`          |
| Focus control   | ⬜     | `focus(InputName)`           |
| Form validation | ⬜     | `setError()`, `clearError()` |
| Form submission | ⬜     | `submit()`                   |

#### 3.6 Conditional Rendering

| Test               | Status | Beschreibung          |
| ------------------ | ------ | --------------------- |
| If condition       | ⬜     | `if isLoggedIn`       |
| If/else            | ⬜     | `if ... else ...`     |
| Inline conditional | ⬜     | `done ? "Yes" : "No"` |

#### 3.7 Dialogs & Overlays

| Test    | Status | Beschreibung                      |
| ------- | ------ | --------------------------------- |
| Dialog  | ⬜     | `Dialog` mit `Trigger`, `Content` |
| Tooltip | ⬜     | `Tooltip` auf Element             |
| Toast   | ⬜     | `toast("Message")`                |

#### 3.8 Complete Application

| Test          | Status | Beschreibung              |
| ------------- | ------ | ------------------------- |
| Dashboard app | ⬜     | Sidebar + Stats + Table   |
| Form app      | ⬜     | Multi-step Form           |
| Settings app  | ⬜     | Switches + Sliders + Save |

---

## Test-Implementierung

### Datei-Struktur

```
studio/test-api/suites/
├── workflow-tests.ts          # Workflow-Tests
│   ├── projectWithCodeTests   # Szenario 1
│   ├── projectWithDragDropTests # Szenario 2
│   └── applicationTests       # Szenario 3
```

### Ausführung

```bash
# Alle Workflow-Tests
npx tsx tools/drag-test-runner.ts --category=workflow

# Nur Drag & Drop Workflow
npx tsx tools/drag-test-runner.ts --filter="Drag & Drop"

# Nur Application Tests
npx tsx tools/drag-test-runner.ts --filter="Application"
```

### Test-API Erweiterungen

Für die Workflow-Tests werden folgende API-Erweiterungen benötigt:

#### File Manager API

```typescript
api.fileManager.createFile(name: string, content: string)
api.fileManager.deleteFile(name: string)
api.fileManager.getFiles(): File[]
api.fileManager.selectFile(name: string)
```

#### Property Panel API

```typescript
api.propertyPanel.setProperty(name: string, value: string)
api.propertyPanel.getProperty(name: string): string
api.propertyPanel.clickTokenButton(tokenName: string)
api.propertyPanel.openColorPicker()
api.propertyPanel.selectColor(color: string)
```

#### Icon Picker API

```typescript
api.iconPicker.open()
api.iconPicker.search(query: string)
api.iconPicker.select(iconName: string)
api.iconPicker.close()
```

#### Autocomplete API

```typescript
api.autocomplete.getSuggestions(prefix: string): Suggestion[]
api.autocomplete.hasSuggestion(text: string): boolean
api.autocomplete.select(text: string)
```

---

## Priorisierung

### Phase 1: Grundlagen (Sofort)

- [ ] File Management Tests
- [ ] Token Definition Tests
- [ ] Component Definition Tests
- [ ] Basic Drag & Drop Building

### Phase 2: Property Panel (Kurzfristig)

- [ ] Property Panel Styling
- [ ] Color Picker Integration
- [ ] Token Button Integration
- [ ] Icon Picker Integration

### Phase 3: Application (Mittelfristig)

- [ ] Data Binding Tests
- [ ] Navigation Tests
- [ ] Table Tests
- [ ] Interactive State Tests

### Phase 4: Komplexe Szenarien (Langfristig)

- [ ] Complete Dashboard Application
- [ ] Multi-Screen Application
- [ ] Form with Validation
- [ ] Real-world Workflows

---

## Metriken

| Metrik                 | Ziel          | Aktuell |
| ---------------------- | ------------- | ------- |
| Workflow Test Coverage | 100%          | 0%      |
| File Management        | 4 Tests       | 0       |
| Token/Component        | 10 Tests      | 0       |
| Drag & Drop Workflow   | 12 Tests      | 0       |
| Application Tests      | 12 Tests      | 0       |
| **Gesamt**             | **~40 Tests** | **0**   |

---

## Nächste Schritte

1. **API-Erweiterungen implementieren**
   - `api.fileManager` für File-Operationen
   - `api.propertyPanel.setProperty` erweitern
   - `api.iconPicker` implementieren

2. **Tests registrieren**
   - `workflow-tests.ts` in `suites/index.ts` einbinden
   - Kategorie `workflow` im Test-Runner hinzufügen

3. **Tests ausführen & debuggen**
   - Initiale Test-Durchläufe
   - Fehlschläge analysieren und fixen

4. **Kontinuierliche Erweiterung**
   - Weitere Edge Cases hinzufügen
   - Regressionen abdecken
