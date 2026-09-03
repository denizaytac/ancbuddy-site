# ANCBuddy Intent Quality Framework

Stand: 3. September 2026

## Zweck

Dieses Framework bewertet die **kontrollierbare Intent Readiness** der ANCBuddy-Website: Wie gut die vorhandenen Seiten reale Nutzeraufgaben beantworten, das aktuelle Produkt korrekt abbilden, sich voneinander abgrenzen und Nutzer zu einer passenden nächsten Handlung führen.

Es bewertet nicht rückwirkend Rankings oder Umsatz. Search-Console-Impressionen, Rankings, Klicks, Trials und Käufe bleiben eine separate Outcome-Ebene, weil sie erst nach Crawling und ausreichend Daten belastbar werden.

## Score

Jede Kategorie wird von 0 bis 10 bewertet. Der Gesamtscore ist der gewichtete Mittelwert.

| Kategorie | Gewicht | Leitfrage |
| --- | ---: | --- |
| Primärer Intent und Seitenrolle | 20 % | Besitzt jede wichtige URL genau eine klar erkennbare Hauptaufgabe? |
| Task Completion und inhaltliche Tiefe | 20 % | Kann ein Nutzer sein Problem auf der Seite vollständig lösen oder sicher entscheiden? |
| Produktwahrheit und Grenzen | 15 % | Sind Fähigkeiten, Geräte, Versionen und Nicht-Fähigkeiten korrekt und konsistent? |
| Belege, Originalität und Vertrauen | 15 % | Gibt es eigene Produktbelege, nachvollziehbare Quellen und keine als Social Proof verkleidete Eigenwerbung? |
| Informationsarchitektur und Cannibalization Control | 10 % | Besitzt jeder Intent-Cluster eine verantwortliche URL, ohne unnötige Synonymseiten? |
| SEO-/GEO-Antwortfähigkeit | 10 % | Sind direkte Antworten, klare Überschriften, Tabellen, Definitionen und verlinkbare Aussagen vorhanden? |
| Technische Discoverability und Qualitätsgates | 5 % | Sind Titles, H1, Canonicals, Sitemap, strukturierte Daten, Links und Builds abgesichert? |
| Conversion- und Messbereitschaft | 5 % | Führt jede Seitensorte zur passenden nächsten Handlung und kann der Weg gemessen werden? |

### Bewertungsskala

- **0–3:** fehlt oder ist irreführend
- **4–5:** teilweise vorhanden, aber für Nutzer oder Suchsysteme unzuverlässig
- **6–7:** solide, mit klaren Lücken
- **8:** stark und veröffentlichungsreif
- **9:** sehr stark, differenziert und durch Qualitätsgates abgesichert
- **10:** außergewöhnlich; nur mit belastbaren Originaldaten, Belegen und Outcome-Nachweisen

Ein 10er-Score ist nicht das normale Ziel. Für ANCBuddy gilt **9,0/10** als Stop-Schwelle.

## Harte Gates

Der Builder-Evaluator-Loop darf nur stoppen, wenn alle Bedingungen erfüllt sind:

1. Gesamtscore mindestens 9,0.
2. Keine Kategorie liegt unter 8,0.
3. `npm run lint` und `npm run build` bestehen.
4. Der Intent-Validator besteht.
5. Keine nicht unterstützte Funktion wird beworben.
6. Titles und H1 sind eindeutig; interne Links zeigen auf existierende Ziele.
7. Änderungen erzeugen keine neue Seite nur für ein Synonym, solange kein eigener Job-to-be-done oder belastbarer Query-Cluster existiert.

## Rollen im Loop

### Evaluator

Der Evaluator:

- friert das Bewertungsraster vor Änderungen ein;
- bewertet jede Kategorie mit konkreten Repository- oder Seitenbelegen;
- gibt maximal drei priorisierte Ursachen für den aktuellen Score zurück;
- vergibt keine Punkte für längeren Text allein;
- vergibt keine Punkte für Claims ohne Produktbeleg;
- hält Rankings und andere externe Outcomes getrennt vom Readiness Score.

### Builder

Der Builder:

- bearbeitet zuerst die größten gewichteten Lücken;
- bevorzugt bessere bestehende Seiten gegenüber neuen Synonymseiten;
- hält Produktgrenzen explizit fest;
- verwendet offizielle Bose- oder Apple-Quellen für externe Produktfakten;
- verwendet reale ANCBuddy-Screenshots, Changelog, Facts und Release-Daten für eigene Produktclaims;
- führt alle Tests aus und gibt verbleibende Risiken zurück.

### Schleife

1. Evaluator vergibt Score und maximal drei priorisierte Defizite.
2. Builder setzt die kleinste zusammenhängende Änderung um, die diese Defizite behebt.
3. Lint, Build, Link-, SEO- und Intent-Gates laufen.
4. Evaluator bewertet den aktuellen Stand erneut mit demselben Raster.
5. Unter 9,0: nächste Runde mit den größten verbliebenen Abzügen.
6. Ab 9,0 und bei bestandenen Gates: Stop. Externe Outcome-Messung beginnt separat.

Maximal fünf Builder-Runden pro Benchmark. Wird 9,0 nur durch Ranking-, Nutzer- oder Umsatzdaten verhindert, stoppt der Implementierungsloop und dokumentiert diese Datenabhängigkeit, statt Inhalte künstlich aufzublähen.

## Feste Seitenzuständigkeit

| URL | Primäre Aufgabe |
| --- | --- |
| `/` | Produkt verstehen und Trial oder Kauf beginnen |
| `/bose-qc-ultra-mac-app.html` | Entscheiden, ob ANCBuddy die richtige Mac-App ist |
| `/control-bose-qc-ultra-from-mac.html` | Den vollständigen täglichen Mac-Workflow lernen |
| `/bose-music-app-for-mac-alternative.html` | macOS, ANCBuddy und Bose-App ehrlich vergleichen |
| `/switch-bose-qc-ultra-audio-sources-mac.html` | Quellen, Pairing, Multipoint und Mac-Audio-Recovery verstehen |
| `/bose-qc-ultra-immersive-audio-mac.html` | Still, Motion und Cinema-Fähigkeiten unterscheiden |
| `/ai-auto-eq-bose-qc-ultra.html` | Bose-QC-Ultra-EQ auf dem Mac und AI Auto-EQ verstehen |
| `/troubleshooting.html` | Verbindungs-, Source- und Audio-Probleme diagnostizieren |
| Geräte-Seiten | Modellbezogene Unterstützung und Grenzen klären |
| `/download.html` | Installieren, testen oder kaufen |
| `/guides.html` | Nach Nutzeraufgabe zur zuständigen Seite navigieren |

## Benchmark und durchgeführter Loop

### Ausgangslage: 7,3/10

| Kategorie | Score |
| --- | ---: |
| Primärer Intent und Seitenrolle | 6,2 |
| Task Completion und Tiefe | 7,0 |
| Produktwahrheit und Grenzen | 8,6 |
| Belege, Originalität und Vertrauen | 6,8 |
| Architektur und Cannibalization Control | 7,2 |
| SEO-/GEO-Antwortfähigkeit | 8,0 |
| Technische Discoverability | 9,2 |
| Conversion- und Messbereitschaft | 6,5 |
| **Gewichteter Gesamtscore** | **7,3** |

Hauptursachen:

1. Die Mac-App-Seite verhielt sich wie ein zweiter Bedienungs-Guide statt wie eine Kauf- und Eignungsentscheidung.
2. Troubleshooting deckte neue Source-, Pairing-, Multipoint- und Mac-Audio-Zustände kaum ab.
3. Cinema Mode, modellbezogene Unterschiede und Belegqualität waren nicht ausreichend abgegrenzt.

### Builder-Runde 1: 8,6/10

Umgesetzt:

- Mac-App-Seite als Entscheidungsseite mit Fit/No-Fit, Preis, Trial und klarer Produktgrenze neu aufgebaut.
- Troubleshooting nach sichtbaren Symptomen und getrennten Audio-, Control- und Source-Zuständen erweitert.
- Still, Motion und Cinema sauber getrennt; veraltete 2.1.0-Aussage entfernt.
- AI Auto-EQ an den externen Intent „Bose QC Ultra EQ on Mac“ angebunden.
- Guides-Hub nach Nutzeraufgaben statt nach einer flachen Artikelliste organisiert.
- Gen-2-Headphones- und Earbuds-Seiten um modellbezogene Grenzen erweitert.

Verbliebene Abzüge:

1. Produktgrenzen waren noch nicht als zentrale maschinenprüfbare Fakten abgesichert.
2. Die Homepage stellte eine eigene Produktbeschreibung neben echte Testerzitate.
3. Der Build prüfte zwar allgemeine SEO-Qualität, aber nicht die vereinbarte Intent-Zuständigkeit.

### Builder-Runde 2: 9,2/10

| Kategorie | Score |
| --- | ---: |
| Primärer Intent und Seitenrolle | 9,4 |
| Task Completion und Tiefe | 9,2 |
| Produktwahrheit und Grenzen | 9,6 |
| Belege, Originalität und Vertrauen | 8,8 |
| Architektur und Cannibalization Control | 9,2 |
| SEO-/GEO-Antwortfähigkeit | 9,2 |
| Technische Discoverability | 9,4 |
| Conversion- und Messbereitschaft | 8,0 |
| **Gewichteter Gesamtscore** | **9,2** |

Zusätzlich umgesetzt:

- Cinema Mode, Multipoint-Toggle und granulare Earbud-/Case-Batteriewerte als explizite `false`-Capabilities in den Produktfakten hinterlegt.
- Selbstreferenzielles „Testimonial“ durch überprüfbare Release-, Signierungs- und Trial-Fakten ersetzt.
- `validate-intent-quality.mjs` prüft die festen Seitenrollen, erforderliche Problemtiefe, aktuelle Version und wichtige Nicht-Claims.
- Der Intent-Test ist Bestandteil des normalen Builds.
- Ein eigener GitHub-Actions-Workflow validiert Agent-Branches und Pull Requests.

Der Readiness-Loop stoppt bei **9,2/10**. Rankings, Search-Console-Query-Cluster, Trials und Käufe werden nach Veröffentlichung als separate Outcome-Ebene beobachtet und dürfen den Implementierungsscore nicht rückwirkend künstlich erhöhen.

## Wiederverwendbarer Agentenauftrag

```text
Arbeite im Repository denizaytac/ancbuddy-site auf einer eigenen Branch.

Verwende docs/INTENT_QUALITY_FRAMEWORK.md als unveränderliches Bewertungsraster. Trenne die Rollen Evaluator und Builder:

1. Der Evaluator bewertet den aktuellen kontrollierbaren Intent Readiness Score von 0 bis 10, zeigt die gewichteten Kategorien und nennt höchstens drei priorisierte Ursachen für Abzüge.
2. Der Builder verbessert bestehende Seiten gezielt gegen diese Ursachen. Er erstellt keine zusätzliche Synonymseite ohne eigenen Job-to-be-done oder belastbaren Query-Cluster. Produktclaims müssen durch product-facts.json, reale ANCBuddy-Belege oder offizielle Primärquellen gedeckt sein.
3. Führe npm run lint und npm run build aus. Behebe jeden Fehler.
4. Der Evaluator bewertet erneut mit exakt demselben Raster. Unter 9,0 folgt eine weitere Builder-Runde.
5. Stoppe erst bei mindestens 9,0, keiner Kategorie unter 8,0 und bestandenen harten Gates. Halte externe Outcome-Daten wie Rankings und Käufe getrennt fest.
6. Erstelle einen Pull Request mit Ausgangsscore, Iterationen, Endscore, geänderten Dateien, Tests und verbleibenden datenabhängigen Risiken.
```
