# ANCBuddy: Search-Console- und SEO-Plan

Stand: 22. Juli 2026

Status: Minimalumfang umgesetzt; weitergehende Maßnahmen zurückgestellt

## Entscheidung

Die vorhandene sichtbare Startseitenbotschaft reicht aus:

> Bose QC Ultra control, right from your Mac.

ANCBuddy wird sachlich als macOS-App positioniert, mit der kompatible Bose QC Ultra
Headphones und Earbuds vom Mac aus gesteuert werden können. Formulierungen wie
„Apple-friendly“ werden vermieden, damit keine Verbindung oder Empfehlung durch
Apple suggeriert wird.

## Begründung aus der Search Console

- 44 Impressionen und ein Klick sind noch keine belastbare Basis für umfangreiche
  Content- oder Snippet-Experimente.
- Die durchschnittliche Position von 7,4 zeigt erste Sichtbarkeit, aber noch zu
  wenig Volumen für größere Umbauten.
- Die relevanten Guide-Seiten liegen jeweils unter 100 Impressionen.
- Sitemap, HTTPS, strukturierte Daten und technische Erreichbarkeit funktionieren.
- Die laufende Indexierungsvalidierung soll nicht durch URL-, Canonical- oder
  Redirect-Änderungen gestört werden.

## Umgesetzte Änderung

In `site-src/index.html` wird ausschließlich die Homepage-Meta-Description auf
136 Zeichen gekürzt:

> Control compatible Bose QC Ultra headphones and earbuds from your Mac. Switch
> Quiet, Aware, and Immersion modes with ANCBuddy for macOS.

Unverändert bleiben sichtbare Homepage-Texte, Guides, URLs, Canonicals,
strukturierte Daten, App-Version und `CHANGELOG.md`.

## Prüfung

Aus `site-src/`:

```bash
npm run lint
npm run build
```

Der generierte Homepage-Quelltext muss genau eine Meta-Description mit dem oben
festgelegten Text enthalten. Der Build muss weiterhin 15 SEO-Seiten erzeugen und
beide vorhandenen Validatoren erfolgreich abschließen.

## Monitoring

- Die Search-Console-Validierung bis ungefähr 5. August 2026 beobachten.
- Keine täglichen Snippet-Anpassungen oder wiederholten Indexierungsanfragen.
- Weitere Snippet- oder Content-Änderungen erst ab mindestens 100 Impressionen
  pro betroffener Seite bewerten.
- Eine deutsche Landingpage erst bei einem stabilen deutschsprachigen Query-Cluster
  oder mindestens 200–300 deutschen Impressionen in 28 Tagen prüfen.
