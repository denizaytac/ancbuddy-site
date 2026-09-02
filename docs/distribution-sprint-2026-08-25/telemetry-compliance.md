# Aktivierungs-/Nutzungstelemetrie — Compliance Gate

Status: **Proceed only with conditions; keine Erhebung implementiert oder aktiviert.**
Dies ist eine Produkt-/Compliance-Einschätzung, keine Rechtsberatung.

## Warum die Bremse richtig ist

Pseudonyme Installations- und Nutzungsdaten können weiterhin personenbezogene Daten
sein. Für optionale Produktanalyse müssen Zweck, Rechtsgrundlage, Information,
Widerruf, Löschung, Aufbewahrung und Auftragsverarbeitung vor dem Versand feststehen.
Ein Zugriff auf bzw. Speichern in der Endeinrichtung kann zusätzlich § 25 TDDDG
berühren; die konkrete Anwendung auf die native macOS-App sollte fachlich geprüft
werden. Consent ist deshalb die konservative vorgeschlagene Grundlage, nicht eine
stille Voreinstellung.

Primärquellen:

- DSGVO Art. 5–7: https://eur-lex.europa.eu/eli/reg/2016/679/art_6/oj
- EDPB Consent Guidelines 05/2020:
  https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en
- § 25 TDDDG: https://www.gesetze-im-internet.de/ttdsg/__25.html

## Zulässiger Minimalentwurf nach Go-Entscheidung

### Events

- `first_open`: einmalig nach ausdrücklich aktiviertem Analytics-Opt-in.
- `activation_completed`: einmalig nach erstem von Hardware bestätigten Moduswechsel.
- `usage_day`: höchstens einmal pro UTC-Tag.
- `mode_switch_used`: nur täglicher Zähler, kein Zeit-/Modus-Verlauf.
- `auto_eq_used`: nur täglicher Boolean/Zähler; keine Tracknamen, Artists oder EQ-
  Rohprofile.

### Niemals erfassen

Seriennummer, MAC-Adresse, BLE-Name/Gerätename, Bose-Peripheral-UUID, Musik-/
Trackdaten, genaue Hörhistorie, rohe EQ-Profile, IP im Anwendungsschema, E-Mail oder
unverschlüsselten License-/Trial-Key.

### Pseudonyme Verknüpfung und Deduplizierung

- Lokal zufällige Installations-ID; serverseitig HMAC mit separatem Secret.
- Trial-/Lizenz-Link nur als zweckgebundener HMAC, nie als Rohwert; getrennte Salts
  für Installation und Commerce.
- Client-Event-ID plus Unique Constraint; `first_open`/`activation_completed` genau
  einmal, `usage_day` und Feature-Zähler einmal je Installation/UTC-Tag.
- Keine geräteübergreifende Identitätszusammenführung ohne eigene Einwilligung.

### Consent und Betroffenenrechte

- Default off; separate, verständliche Opt-in-UI mit Consent-Version
  `analytics-2026-08-v1` und Zwecken vor dem ersten Event.
- Widerruf so leicht wie Zustimmung; Schalter stoppt sofort weitere Events.
- Datenschutzhinweis vor Erhebung: Controller/Kontakt, Zweck, Rechtsgrundlage,
  Datenfelder, Empfänger/Supabase, Speicherorte/Transfers, Aufbewahrung, Rechte.
- Löschweg: lokal erzeugtes einmaliges Lösch-Token oder Support-Flow, der keine
  License Keys per E-Mail verlangt; Server löscht Rohdaten und entkoppelt Aggregate.
- Vorgeschlagene, noch freizugebende Frist: Rohereignisse höchstens 90 Tage,
  vollständig entkoppelte Tagesaggregate höchstens 13 Monate.

## Offene Freigaben vor Implementierung

1. dokumentierte Rechtsgrundlage und TDDDG-Bewertung;
2. aktualisierte Privacy Notice und Verzeichnis der Verarbeitungstätigkeiten;
3. Supabase-DPA/Region/Transfer- und Aufbewahrungsprüfung;
4. finaler Consent-Text und Löschprozess;
5. eigener DMG-würdiger App-Release mit Versionsbump und beiden App-Changelogs.

Die Telemetrie blockiert den ersten Distributionstest nicht. Bis zum Go bleiben
Website-Funnel, Trial und Commerce die einzigen Sprintsignale.
