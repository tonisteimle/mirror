# `studio/test-api/` — Browser-Test-Suite

Dieses Verzeichnis enthält **Test-Infrastruktur**, kein Studio-Produktcode:
die Browser-Test-Suite (~225 Tests, eigener Stack), Schritt-Runner,
Assertions, Inspektion, Fixtures.

## Verbindung ins Studio

- `studio/bootstrap.ts` ruft `initStudioTestAPI()` aus dieser Suite zur
  Laufzeit auf, damit `__mirrorTest` und `__mirrorTestSuites` in der
  DevTools-Konsole verfügbar sind.
- Geladen wird der Code via CDP-Test-Runner in `tools/test-runner/`.
- Nicht in das Production-Bundle gebündelt — `npm run build:studio`
  packt die Suite zwar mit ein (für `npm run studio`), aber sie ist
  ohne CDP-Trigger inert.

## Warum hier und nicht in `tests/`?

Die Suite läuft im Browser-Kontext, importiert direkt aus dem Studio
(z. B. `../core`, `../visual/snapping-service`) und hängt an Module-
Globals des laufenden Studios. Ein Verschieben nach `tests/browser/`
würde 790 relative Importpfade länger machen, ohne Funktionsgewinn —
siehe `docs/studio-audit-plan.md` Abschnitt „Phase G".

## Vitest-Tests vs. Browser-Tests

| Stack         | Wo                 | Wann                                    |
| ------------- | ------------------ | --------------------------------------- |
| Vitest (Unit) | `tests/studio/*`   | Pre-Commit, CI, schnell                 |
| Browser-Suite | hier (`test-api/`) | `npm run test:browser:progress` via CDP |

Beide Stacks bestehen nebeneinander. Unit-Tests deckt pure Logik,
Browser-Suite deckt End-to-End-Verhalten und Studio-DOM-Interaktion.

## Volle Test-Doku

`docs/TEST-FRAMEWORK.md`.
