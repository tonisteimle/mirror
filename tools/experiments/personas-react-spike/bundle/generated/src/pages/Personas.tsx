import Topbar from '../components/Topbar'
import Logo from '../components/Logo'
import Hero from '../components/Hero'
import Eyebrow from '../components/Eyebrow'
import HeroVessel from '../components/HeroVessel'
import H1 from '../components/H1'
import HeroSub from '../components/HeroSub'
import MetaList from '../components/MetaList'
import MetaPair from '../components/MetaPair'
import MetaLabel from '../components/MetaLabel'
import MetaValue from '../components/MetaValue'
import Domain from '../components/Domain'
import HeroBar from '../components/HeroBar'
import Section from '../components/Section'
import SectionWide from '../components/SectionWide'
import Container from '../components/Container'
import H2 from '../components/H2'
import H3 from '../components/H3'
import H4 from '../components/H4'
import TocList from '../components/TocList'
import TocRow from '../components/TocRow'
import TocNum from '../components/TocNum'
import TocName from '../components/TocName'
import TocTag from '../components/TocTag'
import TwoColumn from '../components/TwoColumn'
import ProseColumn from '../components/ProseColumn'
import ProseBody from '../components/ProseBody'
import PersonaBlock from '../components/PersonaBlock'
import PersonaHeaderBand from '../components/PersonaHeaderBand'
import PersonaHeaderRow from '../components/PersonaHeaderRow'
import PersonaNumeral from '../components/PersonaNumeral'
import PersonaTitleStack from '../components/PersonaTitleStack'
import PersonaName from '../components/PersonaName'
import PersonaSteckbrief from '../components/PersonaSteckbrief'
import PersonaBody from '../components/PersonaBody'
import WarumBlock from '../components/WarumBlock'
import DimGrid from '../components/DimGrid'
import DimGridTwo from '../components/DimGridTwo'
import Dim from '../components/Dim'
import BodyTxt from '../components/BodyTxt'
import BodyTxtMuted from '../components/BodyTxtMuted'
import SoftBox from '../components/SoftBox'
import InnereStimmeRow from '../components/InnereStimmeRow'
import InnereStimmeMeta from '../components/InnereStimmeMeta'
import InnereStimmeQuotes from '../components/InnereStimmeQuotes'
import ImplikationenBlock from '../components/ImplikationenBlock'
import OffeneList from '../components/OffeneList'
import FooterFrame from '../components/FooterFrame'
import FooterGrid from '../components/FooterGrid'
import FooterColMain from '../components/FooterColMain'
import FooterColMeta from '../components/FooterColMeta'
import FooterHeading from '../components/FooterHeading'
import FooterText from '../components/FooterText'
import FooterStatusList from '../components/FooterStatusList'
import FooterBaseRow from '../components/FooterBaseRow'
import FooterBase from '../components/FooterBase'
import LogoLight from '../components/LogoLight'
import { inlineMd } from '../lib/inline-md'

// Helper: render text with inline markdown safely.
function md(text: string) {
  return <span dangerouslySetInnerHTML={{ __html: inlineMd(text) }} />
}

// One persona's section — body content shape mirrors `app.mir` literally.
function PersonaSection({
  id,
  number,
  title,
  steckbrief,
  warumTitle,
  warumBody,
  situation,
  ziel,
}: {
  id: string
  number: string
  title: string
  steckbrief: string
  warumTitle: string
  warumBody: string
  situation: string
  ziel: string
}) {
  return (
    <PersonaBlock id={id}>
      <PersonaHeaderBand>
        <Container>
          <PersonaHeaderRow>
            <PersonaNumeral text={number} />
            <PersonaTitleStack>
              <PersonaName text={title} />
            </PersonaTitleStack>
          </PersonaHeaderRow>
        </Container>
        <Container>
          <PersonaSteckbrief text={steckbrief} />
        </Container>
      </PersonaHeaderBand>
      <Container>
        <PersonaBody>
          <WarumBlock>
            <H3 text={warumTitle} />
            <BodyTxt text={warumBody} />
          </WarumBlock>
          <DimGrid>
            <Dim>
              <H4 text="Situation" />
              <BodyTxt text={situation} />
            </Dim>
            <Dim>
              <H4 text="Ziel" />
              <BodyTxt text={ziel} />
            </Dim>
            <Dim>
              <H4 text="Herausforderung" />
              <BodyTxtMuted text="(siehe Detailbericht)" />
            </Dim>
            <Dim>
              <H4 text="Needs" />
              <BodyTxtMuted text="(siehe Detailbericht)" />
            </Dim>
          </DimGrid>
          <SoftBox>
            <Container>
              <InnereStimmeRow>
                <InnereStimmeMeta>
                  <H3 text="Innere Stimme — *was wirklich im Kopf sitzt*" />
                  <BodyTxt text="O-Ton-Fragen, die diese Persona sich selbst stellt." />
                </InnereStimmeMeta>
                <InnereStimmeQuotes>
                  <BodyTxtMuted text="(O-Ton-Fragen — siehe Detailbericht)" />
                </InnereStimmeQuotes>
              </InnereStimmeRow>
            </Container>
          </SoftBox>
          <ImplikationenBlock>
            <H3 text="**Implikationen für FHNW-Kommunikation**" />
            <DimGridTwo>
              <Dim>
                <H4 text="Webseite" />
                <BodyTxtMuted text="(persona-spezifisch — siehe Detailbericht)" />
              </Dim>
              <Dim>
                <H4 text="Infoveranstaltung" />
                <BodyTxtMuted text="(persona-spezifisch — siehe Detailbericht)" />
              </Dim>
            </DimGridTwo>
          </ImplikationenBlock>
        </PersonaBody>
      </Container>
    </PersonaBlock>
  )
}

export default function Personas() {
  return (
    <div id="top" className="min-h-screen">
      {/* Topbar */}
      <Topbar>
        <Logo />
      </Topbar>

      {/* Hero */}
      <Hero>
        <Eyebrow text="Internes Arbeitsdokument" />
        <HeroVessel>
          <H1 text="Personas" />
          <HeroSub text="Studieninteressierte für den Bachelor Informatik — fünf Profile, die unterschiedliche Wege ins Studium abbilden." />
          <MetaList>
            <MetaPair>
              <MetaLabel text="Hochschule" />
              <MetaValue text="Hochschule für Informatik" />
            </MetaPair>
            <MetaPair>
              <MetaLabel text="Stand" />
              <MetaValue text="6. Mai 2026" />
            </MetaPair>
            <MetaPair>
              <MetaLabel text="Status" />
              <MetaValue text="Proto-Personas, hypothesenbasiert" />
            </MetaPair>
            <MetaPair>
              <MetaLabel text="Scope" />
              <MetaValue text="Studiengang Informatik" />
            </MetaPair>
          </MetaList>
          <Domain text="www.fhnw.ch / informatik" />
        </HeroVessel>
        <HeroBar />
      </Hero>

      {/* TOC */}
      <Section>
        <Container>
          <H2
            className="max-w-[760px] mb-12"
            text="Fünf Personas, die zusammen den Entscheidungsraum *aufspannen*."
          />
          <TocList>
            <TocRow href="#lukas">
              <TocNum text="01" />
              <TocName text="Lukas" />
              <TocTag text="der überzeugte Tüftler" />
            </TocRow>
            <TocRow href="#sara">
              <TocNum text="02" />
              <TocName text="Sara" />
              <TocTag text="die zweifelnde Quereinsteigerin" />
            </TocRow>
            <TocRow href="#marco">
              <TocNum text="03" />
              <TocName text="Marco" />
              <TocTag text="der pragmatische EFZ-Absolvent" />
            </TocRow>
            <TocRow href="#nadia">
              <TocNum text="04" />
              <TocName text="Nadia" />
              <TocTag text="die orientierungslose Maturandin" />
            </TocRow>
            <TocRow href="#tim">
              <TocNum text="05" />
              <TocName text="Tim" />
              <TocTag text="der Game-begeisterte Spezialist" />
            </TocRow>
          </TocList>
        </Container>
      </Section>

      {/* Übergreifende Beobachtungen */}
      <SectionWide>
        <Container>
          <TwoColumn>
            <ProseColumn>
              <H2 text="Übergreifende Beobachtungen" />
            </ProseColumn>
            <ProseBody>
              <ul className="dash-list">
                <li>
                  {md(
                    '**Universalfragen**, die durch fast alle Personas durchgehen, nur in unterschiedlicher Tonart:'
                  )}
                  <ul>
                    <li>«Schaffe ich das?»</li>
                    <li>«Passe ich da rein?»</li>
                    <li>«Was wenn ich mich falsch entscheide?»</li>
                    <li>«Was kommt danach?»</li>
                  </ul>
                </li>
                <li>
                  {md(
                    'Sehr viele Fragen haben **nichts mit Curriculum** zu tun. Eine Studiengangs-Webseite, die mit Modulübersicht startet, antwortet auf eine Frage, die niemand zuerst stellt.'
                  )}
                </li>
                <li>
                  Manche Fragen sind unangenehm für die Hochschule («Ist FH zweite Wahl?», «Werde
                  ich als Quereinsteigerin auffallen?», «Kann man von Games leben?»). Wer sie
                  ehrlich beantwortet statt umschifft, gewinnt Vertrauen.
                </li>
                <li>
                  {md(
                    '**Neu seit 2024 — die AI-Frage:** «Was bedeutet AI für meinen Beruf? Werde ich noch gebraucht, wenn AI in fünf Jahren das Routine-Coding übernimmt?» Diese Sorge zieht sich durch alle Personas — am schärfsten bei denen, die Karriere-ROI rechnen (Marco, Sara), am abstraktesten bei den noch Suchenden (Nadia), spezifisch beim Spezialisten (Tim mit AI-generierten Spielen). Eine Studieninfo, die diese Frage umschifft, wirkt 2026 weltfremd.'
                  )}
                </li>
              </ul>
            </ProseBody>
          </TwoColumn>
        </Container>
      </SectionWide>

      {/* Warum diese fünf Personas? */}
      <SectionWide>
        <Container>
          <TwoColumn>
            <ProseColumn>
              <H2 text="Warum diese fünf Personas?" />
            </ProseColumn>
            <ProseBody>
              <p>
                {md(
                  'Wir haben uns bewusst für fünf Personas entschieden — genug, um den Entscheidungsraum **breit aufzuspannen**, wenig genug, um sie im Alltag wirklich zu nutzen. Drei wären zu pauschal, sieben werden in der Praxis vergessen. Die Auswahl folgt einer Kontrast-Logik:'
                )}
              </p>
              <ul className="dash-list">
                <li>
                  {md(
                    '**Lukas und Nadia** stehen für die Gymi-Welt, an entgegengesetzten Enden: hochkompetent vs. orientierungslos.'
                  )}
                </li>
                <li>
                  {md(
                    '**Sara und Marco** stehen für die Berufslehre-Welt, ebenfalls kontrastiv: Quereinstieg ohne Tech-Hintergrund vs. logischer nächster Karriereschritt von einem EFZ aus der Branche.'
                  )}
                </li>
                <li>
                  {md(
                    '**Tim** vertritt eine eigene Logik: jemand, der nicht primär eine Hochschule, sondern eine **Studienrichtung** sucht — und FHNW nur erwägt, wenn die Studienrichtung wirklich trägt.'
                  )}
                </li>
              </ul>
              <p>
                {md(
                  'Zusammen decken sie vier Achsen ab: **Selbstvertrauen** (hoch/tief), **Klarheit der Wahl** (entschieden/suchend), **Treiber** (intrinsisch/extrinsisch), **Vorbildung** (Maturität/EFZ).'
                )}
              </p>
            </ProseBody>
          </TwoColumn>
        </Container>
      </SectionWide>

      {/* Persona 01 — Lukas */}
      <PersonaSection
        id="lukas"
        number="01"
        title="Lukas, *der überzeugte Tüftler*"
        steckbrief="18, Gymi (Schwerpunkt Physik & Anwendungen Mathematik), Notenschnitt 5.3. Programmiert seit der Sek, hat einen aktiven GitHub mit eigenen Projekten (Discord-Bots, kleine Web-Apps), liest in der Freizeit über Compiler und Systemprogrammierung. Vater Ingenieur, Mutter Lehrerin."
        warumTitle="Warum diese Persona?"
        warumBody="Lukas verkörpert das Segment der **hochkompetenten, schon technikaffinen Maturand:innen**, die FH und Universität ernsthaft gegeneinander abwägen. Lukas zwingt uns, eine unangenehme, aber zentrale Frage ernst zu nehmen: **«Ist FH zweite Wahl?»** Wer ihn nicht überzeugt, kommuniziert defensiv und verliert die selbstbewussten Profile an die ETH."
        situation="Steht vier Monate vor der Matura. Klassenlehrer empfehlen ihm «unbedingt ETH». Hat einen FHNW-Schnuppertag besucht und war positiv überrascht (mehr Praxis, weniger anonym als erwartet). Innerlich hin- und hergerissen — die Idee, «nur» an eine FH zu gehen, fühlt sich für ihn nach Statusverlust an, obwohl das fachliche Argument für die FHNW spricht."
        ziel="Ein Studium wählen, in dem er sich technisch wirklich weiterentwickeln kann. Langfristig sieht er sich entweder als Senior Engineer in einer technisch anspruchsvollen Firma oder in der Forschung."
      />

      {/* Persona 02 — Sara */}
      <PersonaSection
        id="sara"
        number="02"
        title="Sara, *die zweifelnde Quereinsteigerin*"
        steckbrief="22, vor vier Jahren KV-Lehre abgeschlossen (Versicherung), berufsbegleitend BM nachgeholt vor einem Jahr. Arbeitet 100 % als Sachbearbeiterin in einer Krankenversicherung. Hat im Job angefangen, mit Excel-VBA Auswertungen zu automatisieren — und gemerkt, dass ihr das mehr Spass macht, als sie erwartet hätte."
        warumTitle="Warum diese Persona?"
        warumBody="Sara vertritt **Quereinsteiger:innen aus nicht-technischen Lehrberufen** — ein Segment, das für die FH besonders relevant ist. Sie macht alle Fragen sichtbar, die mit **Selbstvertrauen, Zugehörigkeit und finanziellem Risiko** zusammenhängen — Themen, die in einer rein fachlichen Kommunikation systematisch unsichtbar bleiben."
        situation="Macht aktuell einen Online-Python-Kurs am Wochenende, kommt aber nur langsam voran. Eltern unterstützen die Idee Studium, fragen aber wiederholt: «Bist du dir sicher?» Sie hat noch nie eine Hochschule von innen gesehen."
        ziel="Den Sprung aus der Sachbearbeitung in eine Tech-nahe Rolle schaffen — ohne sich finanziell oder emotional zu überfordern."
      />

      {/* Persona 03 — Marco */}
      <PersonaSection
        id="marco"
        number="03"
        title="Marco, *der pragmatische EFZ-Absolvent*"
        steckbrief="23, Informatiker EFZ Plattformentwicklung, nachher zwei Jahre als Systemtechniker bei einem KMU in Olten. Berufsmaturität während der Lehre. Verdient aktuell ca. 78 000 CHF/Jahr, lebt mit Partnerin in einer 3.5-Zimmer-Wohnung. Rechnet jeden grösseren Schritt durch."
        warumTitle="Warum diese Persona?"
        warumBody="Marco verkörpert das **historische Kernsegment der Fachhochschule** — Berufsleute mit EFZ und Praxiserfahrung. Marco zwingt uns zu **harten Daten** statt Marketing-Floskeln, weil er jeden Schritt rechnet und mit Alternativen vergleicht."
        situation="Spürt, dass er an seiner aktuellen Stelle nicht mehr weiterkommt. Will mehr Architektur, mehr Verantwortung, weniger Routine-Tickets. Steht vor einer rein ökonomisch-strategischen Frage, mit emotionaler Komponente."
        ziel="Klarer Karrieresprung mit kalkulierbarem Risiko. Mittelfristig in eine Rolle mit Entscheidungsspielraum (Tech Lead, Architect, Engineering Manager)."
      />

      {/* Persona 04 — Nadia */}
      <PersonaSection
        id="nadia"
        number="04"
        title="Nadia, *die orientierungslose Maturandin*"
        steckbrief="18, Gymi (Schwerpunkt Wirtschaft & Recht), Notenschnitt 4.8. Hat Informatik-Anwendungen als Ergänzungsfach belegt — eher zufällig. Liest viel, interessiert sich für Politik und Klima. Keine Programmiererfahrung ausser etwas HTML in der Schule."
        warumTitle="Warum diese Persona?"
        warumBody="Nadia vertritt ein **Wachstumssegment**: Maturand:innen ohne Tech-Background. Dieses Segment ist entscheidend für den **Frauenanteil** und für das mittelfristige Wachstum. Sie zwingt uns, **Eltern und Klischee-Wirkungen** ernst zu nehmen."
        situation="Sechs Monate vor der Matura, weiss noch nicht, was sie studieren soll. Hat bei einer Berufsmesse am FHNW-Stand gestoppt, weil «Data Science» cool klang. Eltern wollen «etwas Solides»: Mutter würde Medizin bevorzugen, Vater BWL."
        ziel="Eine begründete Studienwahl treffen, die zu ihr passt. Ein Beruf, der sie auch in zehn Jahren noch interessiert und Wirkung hat."
      />

      {/* Persona 05 — Tim */}
      <PersonaSection
        id="tim"
        number="05"
        title="Tim, *der Game-begeisterte Spezialist*"
        steckbrief="17, Informatikmittelschule (IMS) in Bern, im letzten Lehrjahr. Macht in der Freizeit Unity-Tutorials, hat zwei kleine Prototypen gebaut, ist auf Discord in Game-Dev-Communities aktiv, war bereits an zwei Game Jams."
        warumTitle="Warum diese Persona?"
        warumBody="Tim steht für eine ganz andere Logik: Studieninteressierte, die nicht primär eine Hochschule, sondern **eine Studienrichtung** suchen. Er ist der härteste Test dafür, ob die Spezialisierungen **wirklich tragen oder nur Etikett** sind."
        situation="Weiss seit der 7. Klasse: Games. Hat Schweizer Studios recherchiert, weiss, dass die Branche klein ist. ZHdK Game Design ist auf dem Radar, FHNW Game Entwicklung daher ernsthafte Option — er fragt sich aber, wie ernst die Hochschule diese Studienrichtung wirklich meint."
        ziel="Eine echte Game-Engineer-Ausbildung mit substanzieller Industrie-Anbindung. Mittelfristig: Gameplay-Programmer oder Engine-Entwickler in einem ernsthaften Studio."
      />

      {/* Offene Punkte */}
      <SectionWide>
        <Container>
          <TwoColumn>
            <ProseColumn>
              <H2 text="Offene Punkte / nächste Schritte" />
            </ProseColumn>
            <OffeneList>
              <li>
                {md(
                  '**Eltern als Co-Persona** — vor allem für Lukas und Nadia entscheidungsrelevant. Soll separat ausgearbeitet werden.'
                )}
              </li>
              <li>
                {md(
                  '**Diversität explizit verankern** — Frauenanteil, Migrationsbiografie, Erstakademiker:in. Querschnitt durch alle Personas, nicht eigene Persona.'
                )}
              </li>
              <li>
                {md('**Data Science** — analoge Persona-Arbeit, sobald Informatik validiert ist.')}
              </li>
              <li>
                {md(
                  '**User Research** — diese Proto-Personas mit echten Studieninteressierten testen. Insbesondere prüfen: Stimmen die «inneren Stimmen»? Welche Fragen fehlen? Welche Personas existieren so gar nicht?'
                )}
              </li>
              <li>
                {md(
                  '**Inhaltliche Architektur** — pro Persona ableiten, was das für Webseite und Infoveranstaltung konkret heisst.'
                )}
              </li>
              <li>
                {md(
                  '**Persona-Lücken prüfen** — z. B. Studieninteressierte mit Migrationshintergrund, internationale Bewerber:innen, ältere Quereinsteiger:innen (30+).'
                )}
              </li>
            </OffeneList>
          </TwoColumn>
        </Container>
      </SectionWide>

      {/* Footer */}
      <FooterFrame>
        <Container>
          <LogoLight />
          <FooterGrid>
            <FooterColMain>
              <FooterHeading text="Über dieses Dokument" />
              <FooterText text="Internes Arbeitsdokument zur Persona-Arbeit für Studieninteressierte des Bachelor Informatik. Proto-Personas, hypothesenbasiert; bewusst dafür gemacht, durch User Research validiert oder verworfen zu werden." />
            </FooterColMain>
            <FooterColMeta>
              <FooterHeading text="Status" />
              <FooterStatusList>
                <li>
                  <FooterText text="Stand: 6. Mai 2026" />
                </li>
                <li>
                  <FooterText text="Version: v1" />
                </li>
                <li>
                  <FooterText text="Scope: Studiengang Informatik" />
                </li>
              </FooterStatusList>
            </FooterColMeta>
          </FooterGrid>
          <FooterBaseRow>
            <FooterBase text="© Fachhochschule Nordwestschweiz · Hochschule für Informatik" />
            <FooterBase text="Internes Arbeitsdokument · nicht zur externen Verbreitung" />
          </FooterBaseRow>
        </Container>
      </FooterFrame>
    </div>
  )
}
