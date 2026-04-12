# TaskFlow - Mirror App Beispiel

Eine vollständige Task-Management Anwendung in Mirror DSL.

## Struktur

```
task-app/
├── app.mirror          # All-in-One Version (komplett in einer Datei)
├── main.mirror         # Modulare Version (Entry Point)
├── tokens.mirror       # Design Tokens (Farben, Abstände, Radien)
├── components.mirror   # Wiederverwendbare Komponenten
├── data.mirror         # App-Daten (Tasks, Projects, Team)
└── screens/
    ├── dashboard.mirror   # Dashboard mit Statistiken
    ├── tasks.mirror       # Task-Liste mit Filter
    ├── projects.mirror    # Projekt-Übersicht
    ├── team.mirror        # Team-Mitglieder
    └── settings.mirror    # Einstellungen
```

## Features

### Design System
- **Tokens**: Semantische Farben (`$primary`, `$danger`), Abstände (`$space`), Radien (`$radius`)
- **Komponenten**: Buttons, Cards, Badges, Inputs, Navigation
- **Konsistenz**: Alle UI-Elemente nutzen die definierten Tokens

### Interaktive Elemente
- **Navigation**: SideNav mit `navigate()` zwischen Screens
- **Toggle States**: Tasks können als erledigt markiert werden
- **Exclusive Selection**: Filter-Tabs, Theme-Auswahl, Akzentfarben
- **Hover Effects**: Animierte Übergänge (0.15s)
- **Dialogs**: Task-Erstellung mit Modal
- **Form Controls**: Input, Select, Switch, Checkbox

### Daten
- Statistiken mit Trends
- Task-Liste mit Prioritäten und Status
- Projekt-Übersicht mit Fortschritt
- Team-Mitglieder mit Online-Status
- Aktivitäts-Feed

## Verwendung

### All-in-One Version
```bash
# Öffne app.mirror im Studio
```

### Modulare Version
```bash
# Öffne main.mirror im Studio
# Die anderen Dateien werden via `use` und `show` geladen
```

## DSL Konzepte demonstriert

| Konzept | Beispiel |
|---------|----------|
| **Tokens** | `primary.bg: #6366f1`, `bg $primary` |
| **Komponenten** | `Btn: pad 10 20, rad $radius` |
| **Vererbung** | `PrimaryBtn as Btn: bg $primary` |
| **Kind-Komponenten** | `Card: ... Title: col white` |
| **States** | `hover:`, `active:`, `on:` |
| **Funktionen** | `toggle()`, `exclusive()`, `navigate()` |
| **Daten** | `tasks: task1: title: "..."` |
| **Iteration** | `each task in $tasks` |
| **Conditionals** | `if $task.done`, `$task.priority == "high" ? #ef4444 : #10b981` |
| **Imports** | `use tokens`, `use components` |
| **Screen Loading** | `show DashboardScreen from screens/dashboard` |

## Screens

### Dashboard
- Statistik-Karten mit Icons und Trends
- Aktuelle Tasks mit Prioritäts-Badges
- Aktivitäts-Feed
- Schnellaktionen

### Tasks
- Filter-Tabs (Alle, Offen, Erledigt, Hohe Priorität)
- Task-Liste mit Checkbox, Priorität, Projekt, Deadline
- Expandable Task Items
- Task-Erstellung Dialog

### Projects
- Projekt-Karten mit Fortschrittsbalken
- Status-Filter (Aktiv, Abgeschlossen, Geplant)
- Team-Avatars pro Projekt
- Statistik-Übersicht

### Team
- Team-Mitglieder Karten
- Online-Status Anzeige
- Abteilungs-Filter
- Aktivitäts-Feed

### Settings
- Benachrichtigungs-Einstellungen (Switches)
- Theme-Auswahl (Dark/Light/System)
- Akzentfarben-Auswahl
- Profil-Bearbeitung
- Passwort-Änderung
- Gefahrenzone (Konto löschen)
