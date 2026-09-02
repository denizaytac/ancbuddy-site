# ANCBuddy Distribution Sprint — Execution Pack

Stand: 25.08.2026. Dieses Verzeichnis ist die operative Source of Truth für **ein**
14-Tage-Experiment: hilfreiche Community-/Reddit-Distribution an Mac-Nutzer mit
Bose QuietComfort Ultra. Es ersetzt nicht die langfristige GTM-Roadmap.

## Aktueller Status

- Phase 0 wurde am 26.08.2026 abgeschlossen; Beleg und verkürztes
  Beobachtungsfenster stehen in `phase-0-evidence.md`.
- Live-verifizierter Acht-Wochen-Stand am 26.08.2026: **0/10** zusätzliche,
  nicht erstattete reale Orders seit dem 25.08.2026; letzte reale Order davor am
  21.08.2026.
- Nächster kontrollierter Schritt: freigegebene Lemon-Testorder nach
  `lemon-test-order-runbook.md`. Site-Push, Lemon-Dashboard-Aktion und externe
  Posts sind weiterhin nicht freigegeben.

## Messbarer Vertrag

- Historische Basis vor dem Acht-Wochen-Ziel: 13 bezahlte Orders/Kunden, 0 Refunds.
- Bekannter Funnel davor: 20 externe Trial-Signups; 9 direkte und 4 trial-led
  bezahlte Orders. Diese Werte sind Baseline, nicht Sprintfortschritt.
- Acht-Wochen-Zähler: ab `2026-08-25T00:00:00Z`, Startwert 0/10 zusätzliche,
  nicht erstattete Lizenzen.
- 14-Tage-Sprint: beginnt mit der ersten ausdrücklich freigegebenen Veröffentlichung.
  Geplanter frühester Start ist der 27.08.2026 nach Abschluss der 24h-Attributionsprüfung.
- Mindestziel: 2 neue reale, nicht erstattete Käufe; Planwert: 3.
- Mindestens 1 Kauf muss über vollständige v2-Attribution belastbar dem Experiment
  zugeordnet sein.
- Traffic-Floor: 50 qualifizierte Sessions; Ziel: 100.
- Qualitätsziel: mindestens 90 % vollständige Attribution über relevante Sessions
  und Orders. Prozentwerte werden immer mit dem Nenner gezeigt; kleine Stichproben
  werden nicht als stabile Conversion-Baseline interpretiert.

Eine qualifizierte Session ist genau eine nicht interne v2-Session mit mindestens
einem `page_view` und `utm_source=reddit`, `utm_medium=community`,
`utm_campaign=qc_ultra_mac_reddit_14d_2026w35`. QA- und Testmodus-Daten zählen nie.

## Kontrollierte Variable

- Kanal: Reddit/Community.
- Zielgruppe: Mac-Nutzer mit Bose QC Ultra Headphones Gen 1/2 oder QC Ultra
  Earbuds 2nd Gen.
- Stabile Botschaft: Bose bietet keinen vollständigen macOS-Control-Flow;
  ANCBuddy bringt Quiet/Aware/Immersion und Status in die Menüleiste.
- Stabiler CTA: 14-Tage-Testversion ansehen.
- Variiert werden nur Zielort und Reichweite. Textkern, Produktseite, Preis und CTA
  bleiben bis zur Tag-7-Entscheidung stabil.

## Ablauf

| Zeitpunkt | Aktion | Freigabe |
| --- | --- | --- |
| Vorbereitung | Phase 0, Testorder, Baseline, UTM-QA | Lemon-Testaktion braucht Live-Freigabe |
| Tag 1 | Erster hilfreicher Beitrag/Reply | konkreter Text + Zielort freigeben |
| Tag 2–6 | höchstens zwei weitere passende Antworten; täglich messen | jede Veröffentlichung freigeben |
| Tag 7 | Zwischenentscheidung mit einer Variablenänderung | gemeinsam entscheiden |
| Tag 8–13 | gewählte Tag-7-Maßnahme ausführen; täglich messen | externe Aktion weiter freigabepflichtig |
| Tag 14 | Auswertung gegen Mindestziel, Planwert, Traffic und Attributionsqualität | keine |

## Tag-7-Regeln

1. Unter 25 qualifizierten Sessions: Distribution erhöhen, Botschaft und Seite
   unverändert lassen.
2. Ausreichend Traffic, aber kein Trial-Open/Checkout: zuerst Botschaft-/Landingpage-
   Passung diagnostizieren; genau eine davon für die zweite Hälfte auswählen.
3. Checkout-Aktivität, aber kein Kauf: Checkout-Friktion und Vertrauen prüfen;
   nicht gleichzeitig Copy, Preis und Seite ändern.
4. Reale Käufe oder klare Funnel-Bewegung: Variante beibehalten und Reichweite
   kontrolliert erhöhen.

## Dateien

- `phase-0-evidence.md`: Belege, Ergebnisse und Restlücken.
- `utm-and-qa.md`: verbindliche UTM-Namen und Link-QA.
- `lemon-test-order-runbook.md`: freigabepflichtiger Testorder-Ablauf.
- `reddit-assets.md`: drei nicht veröffentlichte Textentwürfe und Zielkandidaten.
- `daily-report.sql`: ausführbare Tages-/Touch-/Summary-Auswertung.
- `daily-log.csv`: tägliches Entscheidungslog.
- `posting-log.csv`: Freigabe- und Veröffentlichungsnachweis.
- `purchase-feedback-rollout.md`: sichere Lemon-Receipt-/Redirect-Vorbereitung.
- `telemetry-compliance.md`: rechtlich-technische Stop/Go-Grenze für App-Telemetrie.
- `follow-up-sprints.md`: konditionale nächste drei 14-Tage-Sprints.
