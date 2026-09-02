# UTM-Konvention und QA

## Produktionskonvention

| Feld | Fester Wert / Format | Beispiel |
| --- | --- | --- |
| `utm_source` | Plattform, lowercase | `reddit` |
| `utm_medium` | Verteilungsart | `community` |
| `utm_campaign` | Experiment-ID | `qc_ultra_mac_reddit_14d_2026w35` |
| `utm_content` | `ziel_format_nn`, lowercase snake_case | `r_bose_tool_reply_01` |

Keine personenbezogenen Werte, Reddit-Nutzernamen oder freien Notizen in UTMs.
Die Kampagnen-ID bleibt alle 14 Tage unverändert. Nur `utm_content` unterscheidet
Platzierungen.

## Vorbereitete Links

- Aktueller r/bose-Reply-Kandidat:
  `https://ancbuddy.com/?utm_source=reddit&utm_medium=community&utm_campaign=qc_ultra_mac_reddit_14d_2026w35&utm_content=r_bose_tool_reply_01`
- Mac-App-Reply-Kandidat:
  `https://ancbuddy.com/?utm_source=reddit&utm_medium=community&utm_campaign=qc_ultra_mac_reddit_14d_2026w35&utm_content=r_bose_mac_app_reply_02`
- Eventueller eigenständiger Helpful Post:
  `https://ancbuddy.com/?utm_source=reddit&utm_medium=community&utm_campaign=qc_ultra_mac_reddit_14d_2026w35&utm_content=r_bose_helpful_post_03`

## Interne QA

QA nutzt immer alle drei Marker:

```text
utm_source=qa
utm_medium=internal_test
utm_campaign=qa_lemon_e2e_20260825
utm_content=lemon_test_order_01
ancbuddy_internal=1
```

Startlink:

```text
https://ancbuddy.com/?utm_source=qa&utm_medium=internal_test&utm_campaign=qa_lemon_e2e_20260825&utm_content=lemon_test_order_01&ancbuddy_internal=1
```

## Link-QA vor jeder Veröffentlichung

1. Link in einem frischen privaten Fenster öffnen; bei Produktionslinks **keinen**
   internen Marker verwenden.
2. URL und Landingpage laden; genau einen `page_view` mit HTTP 201 erwarten.
3. Prüfen: neue UUID-förmige Visitor-/Session-ID, `attribution_version=2`,
   `is_internal` korrekt, First-/Last-Touch und alle vier UTM-Felder vollständig.
4. Trial öffnen und Checkout-Link anklicken; Eventfolge und identische IDs prüfen.
5. Checkout-URL muss `checkout[custom][...]` für Visitor, Session, v2,
   First-/Last-Touch, Campaign und optional Trial-ID enthalten.
6. Den Link erst danach ins Freigabeprotokoll übernehmen. URL-Shortener werden
   nicht verwendet, damit Ziel und UTM sichtbar bleiben.
