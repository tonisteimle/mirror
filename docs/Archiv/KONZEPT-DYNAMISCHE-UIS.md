# Konzept: Dynamische UIs in Mirror

## Ziel
Die Kapitel "Conditionals", "Data", "Events Block", "Behaviors" und "Slots" neu strukturieren mit:
- Klarer Progression (einfach → komplex)
- Narrativen Übergängen zwischen Kapiteln
- Problem-first Approach
- Durchgängigen Beispielen

## Struktur

### 1. Slots → Zu Components verschieben
Slots ist Komponenten-Komposition, kein "Programmier"-Thema.
Einfügen nach "Inheritance" im Components-Kapitel.

### 2. Neue Kapitelstruktur

```
TEIL: DYNAMISCHE UIs

┌─────────────────────────────────────────────────────────┐
│ VARIABLEN & ZUSTÄNDE                                    │
│ "Deine UI zeigt immer das Gleiche - jetzt wird sie     │
│  lebendig"                                              │
│                                                         │
│ - $variablen definieren                                 │
│ - Werte anzeigen und kombinieren                        │
│ - Werte ändern (assign)                                 │
│ - Toggle-Pattern                                        │
│                                                         │
│ Beispiel: Counter → Like-Button                         │
└─────────────────────────────────────────────────────────┘
          ↓ Übergang: "Du kannst Werte ändern.
            Aber was wenn du verschiedene Dinge
            zeigen willst?"
┌─────────────────────────────────────────────────────────┐
│ BEDINGTE ANZEIGE                                        │
│ "Zeige das Richtige zur richtigen Zeit"                │
│                                                         │
│ - if then else (Properties)                             │
│ - if/else Blöcke (Komponenten)                          │
│ - Vergleiche und Logik                                  │
│                                                         │
│ Beispiel: Login-Header → Theme-Switcher                 │
└─────────────────────────────────────────────────────────┘
          ↓ Übergang: "Du zeigst einzelne Elemente
            bedingt. Aber was bei 50 Tasks,
            100 Produkten?"
┌─────────────────────────────────────────────────────────┐
│ LISTEN & DATEN                                          │
│ "Generiere UI aus Daten"                               │
│                                                         │
│ - each Iterator                                         │
│ - Objekt-Properties ($item.title)                       │
│ - Verschachtelte Daten                                  │
│ - Eingaben binden ($event.value)                        │
│                                                         │
│ Beispiel: User-Liste → Filterbarer Task-Manager         │
└─────────────────────────────────────────────────────────┘
          ↓ Übergang: "Deine UI zeigt Daten.
            Jetzt braucht sie echte Interaktion -
            Keyboards, Dropdowns, komplexe Patterns."
┌─────────────────────────────────────────────────────────┐
│ INTERAKTIVE KOMPONENTEN                                 │
│ "Komplexe Interaktion, deklarativ beschrieben"         │
│                                                         │
│ - Behavior States (highlighted, selected)               │
│ - Keyboard Events                                       │
│ - Click-Outside                                         │
│ - Das Event-Action-Target Pattern                       │
│ - Events Block (Organisation)                           │
│ - Vollständiges Dropdown                                │
│                                                         │
│ Beispiel: Menu → Dropdown → Select                      │
└─────────────────────────────────────────────────────────┘
```

## Narrative Übergänge

Jedes Kapitel endet mit einem Ausblick auf das nächste Problem.
Jedes Kapitel beginnt mit der Lösung dieses Problems.

## Beispiel-Progression

| Kapitel | Einfach | Komplex |
|---------|---------|---------|
| Variablen | Counter | Like-Button mit Animation |
| Bedingungen | Login/Logout Text | Header mit Badge + Theme |
| Listen | String-Array | Task-Manager mit Filter |
| Interaktion | Hover-Menu | Production Dropdown |

## Umsetzung

1. Slots-Abschnitt aus aktuellem Kapitel extrahieren
2. In Components nach Inheritance einfügen
3. Alte Kapitel (Conditionals, Data, Events, Behaviors) löschen
4. Neue 4 Kapitel schreiben mit Übergängen
5. Testen dass alle Beispiele funktionieren
