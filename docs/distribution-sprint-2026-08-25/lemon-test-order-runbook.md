# Lemon Testorder — freigabepflichtiges Runbook

Status: technisch vorbereitet, **nicht ausgeführt**. Testmodus, Produkt-/Webhook-
Konfiguration und Karteneingabe werden erst nach konkreter Live-Freigabe geändert.

## Vorbereitung ohne Dashboard-Änderung

1. Frisches Browserprofil öffnen.
2. Internen QA-Link öffnen:
   `https://ancbuddy.com/?utm_source=qa&utm_medium=internal_test&utm_campaign=qa_lemon_e2e_20260825&utm_content=lemon_test_order_01&ancbuddy_internal=1`
3. In Supabase prüfen: Pageview HTTP 201; `is_internal=true`; identische Visitor-/
   Session-ID; v2; vollständiger First-/Last-Touch.
4. Optional für Trial-Verknüpfung: in demselben Browser den Trial öffnen und mit
   einer klaren QA-Adresse absenden. Sonst ist `trial_signup_id=null` erwartbar.

## Freigabepunkt A — Lemon-Testmodus konfigurieren

Nach Freigabe im Lemon-Dashboard:

1. Store öffnen und oben rechts auf **Test mode** wechseln; sichtbaren Testmodus-
   Banner kontrollieren.
2. Unter **Settings → Webhooks** ausschließlich den Test-Webhook prüfen/anlegen:
   Ziel `https://wryaxqkfpphtzbskfjgi.supabase.co/functions/v1/lemon-order-webhook`;
   Secret muss dem Supabase-Secret entsprechen; mindestens `order_created` und
   `order_refunded` wählen. Live-Webhook nicht verändern.
3. Im Testmodus das Testprodukt/-variant öffnen und **Share** bzw. die Test-Checkout-
   URL kopieren. Diese URL hier einfügen lassen; daraus wird mit den im Browser
   erzeugten `checkout[custom][...]`-Feldern der endgültige QA-Checkout gebaut.
4. Vor Karteneingabe URL prüfen: Test-Checkout, Kampagne
   `qa_lemon_e2e_20260825`, `is_internal=true`, v2, Visitor-/Session-/Touch-Felder,
   optional Trial-ID.

## Freigabepunkt B — Testzahlung auslösen

Nur im sichtbaren Lemon-Testmodus und nie mit einer echten Karte:

- Kartennummer: `4242 4242 4242 4242`
- Ablaufdatum: beliebiges zukünftiges Datum
- CVC: beliebige gültige drei Ziffern
- Name/Adresse: eindeutig als `ANCBuddy QA TEST` markieren
- E-Mail: bei optionalem Trial-Schritt exakt dieselbe QA-Adresse verwenden; der
  Webhook verknüpft `trial_signup_id` datensparsam über diese normalisierte Adresse.

## Erwarteter Datenbankbeleg

`lemon_orders` muss genau eine klar markierte QA-Zeile enthalten:

- `test_mode=true` und `is_internal=true`
- `attribution_version=2`
- identische `session_id` und `visitor_id`
- `first_*` und `last_*` vollständig
- `utm_source=qa`, `utm_medium=internal_test`
- `utm_campaign=qa_lemon_e2e_20260825`
- `utm_content=lemon_test_order_01`
- `trial_signup_id` gesetzt, falls der optionale Trial-Schritt genutzt wurde

Anschließend wird bewiesen, dass `growth_funnel_daily_v`,
`distribution_sprint_daily_v`, Commerce-Views und Growth-Agent diese Zeile nicht
als Umsatz oder Sprintverkauf zählen. Die Testorder bleibt als Audit-Beleg markiert;
sie wird nicht in eine Live-Order umgedeutet.

Offizielle Lemon-Dokumentation:

- https://docs.lemonsqueezy.com/help/getting-started/test-mode
- https://docs.lemonsqueezy.com/help/webhooks/webhook-requests
- https://docs.lemonsqueezy.com/help/checkout/passing-custom-data
