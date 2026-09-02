# Phase 0 — Attribution-v2-Beleg

## 1. Live-Migration und Schreibpfad

- Beleg: Projekt `wryaxqkfpphtzbskfjgi`; Migration
  `20260825115923 reconcile_attribution_v2` ist in der Live-Historie vorhanden.
- Beobachtung nach Migration: `POST /rest/v1/site_events` für den ersten
  nicht internen v2-Besuch antwortete HTTP 201; der zugehörige CORS-Preflight
  antwortete HTTP 200.
- Ergebnis: Live-Schreibpfad funktioniert ohne 401/403/RLS-Fehler.
- Restlücke: nur durch laufende Beobachtung lässt sich die 24h-Stabilität belegen.

## 2. Erster echter, nicht interner v2-Besuch

- Zeitpunkt: `2026-08-25T15:11:03.352063Z` (`17:11:03` Europe/Berlin).
- Event: `page_view`, ID `0fb37c8c-c145-4993-bdf9-b8b5eae9f2b8`.
- Visitor-ID: `e8d4ab30-6355-4e3a-be90-01c6899ef9a5`.
- Session-ID: `c5a532d1-1a87-4fff-81ff-29b84c4df314`.
- Attribute: `is_internal=false`, `attribution_version=2`; First-/Last-Touch
  enthalten Landing-Pfad und Zeitstempel. Der Besuch war Direct Traffic ohne UTM.
- Kontrollabfrage: 1 nicht interne v2-Session seit dem Migrationszeitpunkt,
  0 unvollständige nicht interne v2-Events; interne Smoke-Daten bleiben getrennt.
- Ergebnis: erster beobachteter produktiver v2-Besuch nachgewiesen.
- Restlücke: Datenbank und API können nicht beweisen, welche natürliche Person
  hinter der pseudonymen Session stand; der Nachweis bezieht sich auf das korrekte
  nicht interne Produktionssignal.

## 3. 24-Stunden-Fehlerfenster

- Fenster: `2026-08-25T15:11:03Z` bis `2026-08-26T15:11:03Z`.
- Monitor: stündliche read-only Prüfung von `site_events`, `trial_signups` und
  API-Logs; Automation `ancbuddy-attribution-v2-24h`.
- Alarm: neue 4xx-Antwort, insbesondere 400/401/403/RLS, oder neue unvollständige
  nicht interne Attribution-v2-Zeile.
- Abschlussbeleg am `2026-08-26T07:30Z`: 14 nicht interne v2-Events, 0
  unvollständige Eventzeilen, 0 nicht interne Trial-Signups und keine beobachteten
  4xx in den stündlichen API-Log-Prüfungen.
- Ergebnis: **bestanden und von Deniz am 26.08.2026 um 09:30 Europe/Berlin
  abgeschlossen**. Deniz hat den verbleibenden Teil des ursprünglich bis 17:11
  laufenden Beobachtungsfensters ausdrücklich erlassen; der Stundenmonitor wurde
  danach beendet.
- Restlücke: beobachtet wurden rund 16 Stunden 19 Minuten statt der geplanten 24
  Stunden. Die API-Log-Abfrage liefert pro Lauf nur den jeweils aktuellen Ausschnitt;
  die stündlichen Snapshots reduzieren diese Lücke, sind aber kein Dauerbeweis.

## 4. Website → Lemon → Webhook → Order

- Beleg: Webhook v9 speichert `attributes.test_mode`; Insert-/Upsert-Semantik wurde
  transaktional mit `true → false` verifiziert und vollständig zurückgerollt.
- KPI-Gegenprobe: eine synthetische `test_mode=true`-Order und eine separate
  `is_internal=true`-Order ließen Commerce-, Growth- und Sprint-Orderzähler jeweils
  unverändert bei 17; auch diese Transaktion wurde zurückgerollt.
- Ergebnis: technischer Persistenzpfad ist vorbereitet.
- Restlücke: noch keine reale v2-Order seit dem Attribution-Fix und noch keine
  freigegebene Lemon-Testorder. Deshalb ist der vollständige externe Pfad erst nach
  dem Runbook-Test belegt.
