# Mirror

## Komponenten

### Alle Elemente sind Komponenten

Gute Designer denken in Komponenten. Ein Button ist eine Komponente. Eine Card ist eine Komponente. Eine Navigation ist eine Komponente aus kleineren Komponenten.

In Mirror wird aus jedem Element automatisch eine Komponente. Du definierst einmal, wie dein Button aussieht. Dann verwendest du ihn überall.

Button #333, pad 8 16, rad 8, "Weiter", #fff
Button "Speichern"
Button "Abbrechen"
Button "Löschen"

### Implizite versus Explizite Definition

Das obige Beispiel zeigt schön, wie man während dem Gestalten von User Interfaces, quasi direkt Komponenten definieren und anzeigen lassen kann. Später will man vielleicht die Definition von Komponenten und die Verwendung von Komponenten trennen. Die einzige Änderung, die dann notwendig ist, ist ein Doppelpunkt.

Button: #333, pad 8 16, rad 8, "Weiter", #fff

Button "Weiter"
Button "Speichern"
Button "Abbrechen"
Button "Löschen"

Der Doppelpunkt macht also den Unterschied: Mit Doppelpunkt ist es eine Definition. Ohne Doppelpunkt wird es gerendert. Die Komponente selber kann dann - wenn man will - in ein gesondertes File verschoben werden.

### Hierarchischer Aufbau

UIs sind hierarchisch. Eine Card enthält einen Titel und Text. Ein Header enthält ein Logo und eine Navigation.

In Mirror drückst du diese Hierarchie durch Einrückung aus. Nehmen wir an, die Buttons sind in einem Footer:

Footer pad 16, hor, gap fill
	Save-Area hor
 	  Button "Speichern"
 	  Button "Abbrechen"
  Navigation-Area hor
  	Button "Zurück"
    Button "Weiter"
  
Hier wird also ein Footer gebaut mit je zwei Buttons links und rechts. Der Footer ist nun eine Komponente, die so wiederverwendet werden kann.

### Komponenten in Komponenten

Aber obiges Beispiel würde auch funktionieren wenn wir folgendes Beispiel haben. Wir haben drei Komponenten:

Footer: pad 16, hor, gap fill
Save-Area: hor
Navigation-Area: hor

Nun kombinieren wir beliebig:

Footer
	Save-Area hor
 	  Button "Speichern"
 	  Button "Abbrechen"
  Navigation-Area hor
  	Button "Zurück"
    Button "Weiter"

Der unterschied in diesem Beispiel ist, dass wir hier auch ganz andere Komponenten in den Footer schreiben könnten, weil nicht der ganze Footer mit allen Kindern als eigene Komponente definiert wurde. Die Komponenten unterstützen hier also automatisch Slots und würde die Wiederverwendung von Footer für eine ganz andere Kombination erlauben:

Footer
  Button "Speichern"
 	Button "Abbrechen"

Beides wäre gültig.

### Individuelle Instanzen

Manchmal will man zwar eine Komponente verwenden, sie aber genau hier etwas anpassen.

Button "Weiter"

Der Weiter-Button ist eigentlich schon so eine Anpassung und zwar wird hier das Label mit einem anderen Text überschrieben. Genauso wäre es möglich zu schreiben

Button #456 "Weiter"

Wenn wir bei komplexeren Komponenten Subkomponenten ändern können, müssen wir ihnen einen Namen geben. Sonst weiss das System ja nicht, was wir ändern wollen. Im obigen Beispiel könnten wir beispielsweise schreiben:

Footer: pad 16, hor, gap fill
	Save-Area hor
 	  Save Button "Speichern"
 	  Cancel Button "Abbrechen"
  Navigation-Area hor
  	Back Button "Zurück"
    Forward Button "Weiter"

Dann können wir ganz einfach schreiben:

Footer Save #234

Wenn die Namen eindeutig sind, müssen wir nicht mal die Struktur abbilden.

### Vererben

Manchmal ist es aber besser Komponenten generell abzuleiten, da man sie wiederverwenden will.

...

### States

Bei Komponenten können States definiert werden ... hier werden states erklärt...

Dann noch weitergehend:

stell dir mal ein panel
  vor, das geöffnet und zu sein kann. die titelzeile wird in beiden fällen
  angezeigt, aber der content wird halt geschlossen oder geöffnet. das kann
  man mit unserem ansatz definieren?
                                                                                
⏺ Ja, das geht elegant mit States:
                                                                                
  Panel:
    ver bg #FFF rad 8 shadow md
                                                                                
    Header hor pad 16 pointer
      Title "Panel Titel"
      Icon icon /chevron-down
      onclick toggle Panel
                                                                                
    Content ver pad 16 gap 8
      Text "Hier ist der Inhalt..."
      Text "Noch mehr Inhalt."
                                                                                
    state closed
      Content hidden
      Icon icon /chevron-right
                                                                                
    state open
      Content visible
      Icon icon /chevron-down
                                                                                
  Verwendung:
                                                                                
  Page:
    ver gap 16 pad 32
                                                                                
    Panel open
    Panel closed
    Panel closed Title "Einstellungen"
                                                                                
  ---
  Oder mit Default-State (geschlossen):
                                                                                
  Panel:
    ver bg #FFF rad 8 shadow md
                                                                                
    Header hor pad 16 pointer
      Title "Panel Titel"
      Icon icon /chevron-right
      onclick toggle Panel
                                                                                
    Content ver pad 16 gap 8 hidden
      Text "Inhalt..."
                                                                                
    state open
      Content visible
      Icon icon /chevron-down
                                                                                
  Hier ist Content hidden der Default. Nur state open zeigt den Content.
                                                                                
  ---
  Accordion (nur eins offen):
                                                                                
  Accordion:
    ver gap 2
                                                                                
    Panel Title "Allgemein"
    Panel Title "Erweitert"
    Panel Title "Sicherheit"
                                                                                
  // Toggle schliesst andere automatisch (Gruppe)
                                                                                
  ---
  Das Prinzip:
  - Elemente haben Default-Styles (hidden oder visible)
  - States überschreiben diese (Content visible / Content hidden)
  - toggle wechselt zwischen States
  - Instanzen können Initial-State setzen (Panel open)




### Kombination von States und Vererbung

Beispiel

// Base Button mit allen Elementen und States
  Button:
    hor gap 8 pad 12 24 rad 8 bg #3B82F6 col #FFF
    IconLeft icon /check hidden
    Label "Button"
    IconRight icon /chevron-right hidden
                                                                                
    state hover
      bg #2563EB
                                                                                
    state disabled
      bg #94A3B8 col #64748B opa 0.6
                                                                                
  // Primary Button - erbt alles, zeigt linkes Icon
  PrimaryBtn from Button:
    IconLeft visible
    Label "Weiter"
                                                                                
  // Secondary Button - andere Farben
  SecondaryBtn from Button:
    bg #E2E8F0 col #1E293B
                                                                                
    state hover
      bg #CBD5E1
                                                                                
  // Ghost Button - transparent
  GhostBtn from Button:
    bg transparent col #3B82F6 bor 1 boc #3B82F6
                                                                                
    state hover
      bg #3B82F610
                                                                                
  // Icon-Only Button
  IconBtn from Button:
    pad 12 rad 100
    IconLeft visible icon /plus
    Label hidden
                                                                                
  // Verwendung auf der Page
  Page:
    ver gap 16 pad 32
                                                                                
    PrimaryBtn
    SecondaryBtn Label "Abbrechen"
    GhostBtn Label "Mehr erfahren" IconRight visible
    IconBtn
    PrimaryBtn disabled
                                                                                
  Das Konzept erklären:
                                                                                
  1. Base Button hat ALLE Elemente (IconLeft, Label, IconRight) - manche hidden
  2. Base Button hat ALLE States (hover, disabled)
  3. Varianten erben via from und:
    - Überschreiben Styles (bg, col, etc.)
    - Zeigen versteckte Elemente (IconLeft visible)
    - Überschreiben State-Designs (state hover mit anderen Farben)
  4. Instanzen können:
    - Properties überschreiben (Label "Abbrechen")
    - Elemente ein-/ausblenden (IconRight visible)
    - States aktivieren (disabled)
                                       

Tokens

Ein User Interface lebt von Konsistenz. Dieselbe Primärfarbe überall. Dieselben Abstände. Dieselben Radien.

In Mirror speicherst du diese Werte in Tokens. Ein Token beginnt mit $.

$primary: #3B82F6

Dann kannst du sc

// Tokens definieren
$primary-col: #3B82F6
$default-rad: 8
$default-pad: 16

// Tokens verwenden
Button $primary-col, $default-rad, $default-pad, "Speichern"
Link $primary-col, "Mehr erfahren"
Das Suffix im Namen (-col, -rad, -pad) sagt Mirror, welche Eigenschaft gemeint ist. Ändere $primary-col einmal – und alles was diese Farbe verwendet, ändert sich mit.


. Einfache Tokens
                                                                                
  Tokens sind benannte Werte, die mit $ beginnen:
                                                                                
  $primary: #3B82F6
  $spacing: 16
  $radius: 8
                                                                                
  Button bg $primary pad $spacing rad $radius
                                                                                
  2. Tokens in Tokens
                                                                                
  Tokens können andere Tokens referenzieren:
                                                                                
  $primary: #3B82F6
  $primary-dark: #1E40AF
  $button-bg: $primary
  $button-hover: $primary-dark
                                                                                
  Button bg $button-bg
    state hover
      bg $button-hover
                                                                                
  3. Typ-Suffixe
                                                                                
  Tokens mit bestimmten Endungen haben einen impliziten Typ:
  ┌────────────────┬──────────────┬─────────────────────────────┐
  │     Suffix     │     Typ      │          Beispiel           │
  ├────────────────┼──────────────┼─────────────────────────────┤
  │ -col, -color   │ Farbe        │ $primary-col, $text-color   │
  ├────────────────┼──────────────┼─────────────────────────────┤
  │ -bg            │ Hintergrund  │ $card-bg, $surface-bg       │
  ├────────────────┼──────────────┼─────────────────────────────┤
  │ -size          │ Schriftgröße │ $heading-size, $body-size   │
  ├────────────────┼──────────────┼─────────────────────────────┤
  │ -pad, -spacing │ Abstand      │ $card-pad, $section-spacing │
  ├────────────────┼──────────────┼─────────────────────────────┤
  │ -rad, -radius  │ Rundung      │ $button-rad, $card-radius   │
  └────────────────┴──────────────┴─────────────────────────────┘
  4. Anwendung ohne Property-Indikator
                                                                                
  Mit Typ-Suffix braucht man keine Property mehr:
                                                                                
  // Traditionell - mit Property
  $primary: #3B82F6
  Button bg $primary col #FFF pad 16
                                                                                
  // Mit Typ-Suffix - Property entfällt
  $button-bg: #3B82F6
  $button-col: #FFF
  $button-pad: 16
                                                                                
  Button $button-bg $button-col $button-pad
                                                                                
  Komplettes Design-System:
                                                                                
  // Farben
  $primary-bg: #3B82F6
  $primary-col: #FFF
  $secondary-bg: #E2E8F0
  $secondary-col: #1E293B
                                                                                
  // Abstände
  $sm-pad: 8
  $md-pad: 16
  $lg-pad: 24
                                                                                
  // Rundungen
  $sm-rad: 4
  $md-rad: 8
  $lg-rad: 16
                                                                                
  // Anwendung - keine Properties nötig
  PrimaryBtn:
    $primary-bg $primary-col $md-pad $md-rad
                                                                                
  SecondaryBtn:
    $secondary-bg $secondary-col $md-pad $md-rad
                                                                                
  Card:
    $surface-bg $lg-pad $lg-rad
                                                                                
  5. Semantische Token-Hierarchie
                                                                                
  // Basis-Farben
  $blue-500: #3B82F6
  $blue-600: #2563EB
  $slate-100: #F1F5F9
                                                                                
  // Semantische Tokens (referenzieren Basis)
  $primary-bg: $blue-500
  $primary-hover-bg: $blue-600
  $surface-bg: $slate-100
                                                                                
  // Komponenten-Tokens (referenzieren semantische)
  $button-bg: $primary-bg
  $button-hover-bg: $primary-hover-bg
  $card-bg: $surface-bg
                                                                                
  // Verwendung
  Button $button-bg
    state hover
      $button-hover-bg
                                                                                
  Zusammenfassung
  ┌──────────────────┬────────────────────────────────────────────┐
  │      Aspekt      │                  Vorteil                   │
  ├──────────────────┼────────────────────────────────────────────┤
  │ Normale Tokens   │ Wiederverwendbare Werte                    │
  ├──────────────────┼────────────────────────────────────────────┤
  │ Tokens in Tokens │ Hierarchie, einfache Änderungen            │
  ├──────────────────┼────────────────────────────────────────────┤
  │ Typ-Suffixe      │ Selbstdokumentierend, keine Property nötig │
  ├──────────────────┼────────────────────────────────────────────┤
  │ Ohne Property    │ Kürzerer, sauberer Code                    │
  └──────────────────┴────────────────────────────────────────────┘
  Faustregel: Wenn der Token-Name den Typ verrät (-bg, -col, -pad), kann die
  Property weggelassen werden.


Beispiel

Lass uns nun ein etwas umfassenderes Beispiel durchspielen. Lass uns vorstellen, wir wollten einen Screen mit einem kleinen Dashboard bauen. Auf dem Dashboard sollen Kennzahlen stehen. Der Screen besteht aus einem Header, den Kennzahlen und einem Footer.

Es ist nicht notwendig, zu beginn die Komponenten zu detaillieren. Es genügt mit einer Komponentenhierarchie zu starten. Zudem definieren wir direkt Unterelemente wie Kennzahl oder Label.

Dashboard
	Header
	Content
		Tile
			Kennzahl "2.7 Mio"
			Label "Umsatz Schweiz"
		Tile
			Kennzahl "16"
			Label "Anzahl Mitarbeiter"
		Tile
			Kennzahl "40"
			Label "Anzahl Kunden"
	Footer

Im Hintergrund geschieht nun folgendes. Bei der ersten Angabe des Tiles wird eine Komponente erstellt. Bei der zweiten wird die Komponente bereits verwendet und  einige Kinder bereits angepasst.




